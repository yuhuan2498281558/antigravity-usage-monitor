/**
 * @fileoverview 官方配额桶归一化、周期窗口识别与多模型池（Gemini / Argon / Claude & GPT）构建。
 *
 * 处理所有已知的 Antigravity 服务端配额形态：
 * - Google AI Ultra：Argon 与 Flash 共享同一个 Gemini Models 配额池；
 * - Google AI Pro（形态 1）：`RetrieveUserQuotaSummary` 返回独立的 `Gemini 4 Argon` 组；
 * - Google AI Pro（形态 2）：`Gemini Models` 组内嵌套独立的 `argon-weekly` 桶；
 * - Google AI Pro（形态 3）：`GetUserStatus` 的 `clientModelConfigs.quotaInfo` 为 Argon 报告了与标准 Gemini 不同的独立剩余比例；
 * - Proto3 零值省略兼容：当配额耗尽（`remainingFraction === 0`）导致字段被省略但存在有效 `resetTime` 时，正确识别为 0% 剩余（100% 已用）。
 */

import { parseIsoMs } from '../speed-metrics.mjs';
import {
  isArgonModelIdentifier,
  isCarbonModelIdentifier,
  resolveModelInfo,
} from './model-pricing.mjs';

/**
 * 将原始配额对象（来自 `RetrieveUserQuotaSummary` 桶或 `clientModelConfigs.quotaInfo`）归一化为百分比结构。
 *
 * @param {object} rawObj
 * @returns {{
 *   remainingFraction: number,
 *   remainingPct: number,
 *   remainingIntPct: number,
 *   usedPct: number,
 *   resetTime: string|null,
 *   description: string
 * } | null}
 */
export function normalizeQuotaFraction(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return null;
  let remFrac = null;
  if (rawObj.disabled === true) {
    remFrac = 0;
  } else if (
    rawObj.remainingFraction !== undefined &&
    rawObj.remainingFraction !== null &&
    Number.isFinite(Number(rawObj.remainingFraction))
  ) {
    remFrac = Math.max(0, Math.min(1, Number(rawObj.remainingFraction)));
  } else if (typeof rawObj.resetTime === 'string' && rawObj.resetTime.trim().length > 0) {
    // Proto3 在配额完全耗尽（0.0）时会省略默认数值字段，此时凭有效 resetTime 判定为剩余 0
    remFrac = 0;
  }
  if (remFrac === null) return null;
  const usedFrac = Math.max(0, Math.min(1, 1 - remFrac));
  return {
    remainingFraction: remFrac,
    remainingPct: +(remFrac * 100).toFixed(1),
    remainingIntPct: Math.floor(remFrac * 100 + 1e-6),
    usedPct: +(usedFrac * 100).toFixed(1),
    resetTime: rawObj.resetTime || null,
    description: rawObj.description || '',
  };
}

/**
 * 识别官方配额桶所属的时间窗口类型（`'5h'` 或 `'weekly'`）。
 *
 * @param {object} bucket
 * @param {number} [groupBucketCount=1] 所属分组内的桶总数
 * @param {number} [nowMs=Date.now()] 当前毫秒时间戳
 * @returns {'5h'|'weekly'}
 */
export function classifyOfficialBucketWindow(bucket, groupBucketCount = 1, nowMs = Date.now()) {
  const w = String(bucket?.window || '')
    .trim()
    .toLowerCase();
  const idAndName = `${bucket?.bucketId || ''} ${bucket?.displayName || ''}`.toLowerCase();
  if (
    w === '5h' ||
    /(?:^|[-_\s])5h(?:$|[-_\s])|five[-_\s]?hour/.test(w) ||
    /(?:^|[-_\s])5h(?:$|[-_\s])|five[-_\s]?hour/.test(idAndName)
  ) {
    return '5h';
  }
  if (w === 'weekly' || w === '7d' || /week/.test(w) || /week/.test(idAndName)) {
    return 'weekly';
  }
  const resetMs = parseIsoMs(bucket?.resetTime);
  if (resetMs > nowMs + 6 * 3600 * 1000 || groupBucketCount === 1) {
    return 'weekly';
  }
  return '5h';
}

/**
 * 根据分组名称、分组描述及桶 ID 识别配额池归属身份（`Gemini` / `Argon` / `Claude & GPT`）。
 *
 * @param {{ groupName?: string, groupDesc?: string, bucketId?: string, bucketName?: string }} params
 * @returns {{ poolKey: string, poolLabel: string, poolName: string }}
 */
export function classifyQuotaPoolIdentity({
  groupName = '',
  groupDesc = '',
  bucketId = '',
  bucketName = '',
}) {
  const bId = String(bucketId || '');
  const bName = String(bucketName || '');
  const gName = String(groupName || '');
  const gDesc = String(groupDesc || '');
  if (
    /carbon/i.test(bId) ||
    /carbon/i.test(bName) ||
    /carbon/i.test(gName) ||
    (/\bcarbon\b/i.test(gDesc) &&
      !/\bflash\b/i.test(gDesc) &&
      !/^gemini models$/i.test(gName.trim()))
  ) {
    return {
      poolKey: 'Carbon',
      poolLabel: 'Gemini 4 Carbon',
      poolName: 'Gemini 4 Carbon 模型池',
    };
  }
  if (
    /argon/i.test(bId) ||
    /argon/i.test(bName) ||
    /argon/i.test(gName) ||
    (/\bargon\b/i.test(gDesc) &&
      !/\bflash\b/i.test(gDesc) &&
      !/^gemini models$/i.test(gName.trim()))
  ) {
    return {
      poolKey: 'Argon',
      poolLabel: 'Gemini 4 Argon',
      poolName: 'Gemini 4 Argon 模型池',
    };
  }
  if (/gemini/i.test(`${bId} ${bName} ${gName} ${gDesc}`)) {
    return {
      poolKey: 'Gemini',
      poolLabel: 'Gemini',
      poolName: 'Gemini 模型池',
    };
  }
  if (/3p|claude|fable|gpt|sonnet|opus|haiku|third[-_\s]?party/i.test(`${bId} ${gName} ${gDesc}`)) {
    return {
      poolKey: 'Claude & GPT',
      poolLabel: 'Claude & GPT',
      poolName: 'Claude & GPT 模型池',
    };
  }
  const cleanLabel = (gName || bId || 'Other').trim();
  return {
    poolKey: cleanLabel,
    poolLabel: cleanLabel,
    poolName: `${cleanLabel} 模型池`,
  };
}

/**
 * 判断两个归一化配额快照是否代表同一个共享配额桶（剩余比例误差 <= 1.5% 且重置时间相差 <= 2 分钟）。
 *
 * @param {ReturnType<typeof normalizeQuotaFraction>} a
 * @param {ReturnType<typeof normalizeQuotaFraction>} b
 * @returns {boolean}
 */
export function quotaFractionsMatch(a, b) {
  if (!a || !b) return false;
  if (Math.abs(a.remainingFraction - b.remainingFraction) > 0.015) return false;
  if (a.resetTime && b.resetTime) {
    const diffMs = Math.abs(parseIsoMs(a.resetTime) - parseIsoMs(b.resetTime));
    if (diffMs > 120_000) return false;
  }
  return true;
}

/**
 * 综合 `RetrieveUserQuotaSummary` 与 `GetUserStatus.clientModelConfigs`，构建动态模型映射表、
 * 分模型配额列表及聚合配额池映射表 (`quotaPoolsMap`)。
 *
 * @param {object|null} officialQuota 来自 `RetrieveUserQuotaSummary` 的响应体
 * @param {object[]} clientConfigs 来自 `GetUserStatus` 的客户端模型配置数组
 * @returns {{
 *   dynamicModelMap: Map<string, object>,
 *   quotaPoolsMap: Map<string, object>,
 *   modelQuotas: object[]
 * }}
 */
export function buildOfficialQuotaPools(officialQuota, clientConfigs = []) {
  const dynamicModelMap = new Map();
  const nowForQuotaMs = Date.now();
  const poolBuilders = new Map();

  function ensurePoolBuilder({ poolKey, poolLabel, poolName }) {
    if (!poolBuilders.has(poolKey)) {
      poolBuilders.set(poolKey, {
        poolKey,
        poolLabel,
        poolName,
        bucket5h: null,
        bucketWeekly: null,
        fallback5h: null,
        models: [],
      });
    }
    return poolBuilders.get(poolKey);
  }

  const rawGroups = Array.isArray(officialQuota?.groups) ? [...officialQuota.groups] : [];
  if (
    Array.isArray(officialQuota?.buckets) &&
    officialQuota.buckets.length > 0 &&
    rawGroups.length === 0
  ) {
    rawGroups.push({ displayName: '', description: '', buckets: officialQuota.buckets });
  }

  for (const grp of rawGroups) {
    const grpBuckets = Array.isArray(grp?.buckets) ? grp.buckets : [];
    for (const b of grpBuckets) {
      const norm = normalizeQuotaFraction(b);
      if (!norm) continue;
      const ident = classifyQuotaPoolIdentity({
        groupName: grp?.displayName,
        groupDesc: grp?.description,
        bucketId: b?.bucketId,
        bucketName: b?.displayName,
      });
      const win = classifyOfficialBucketWindow(b, grpBuckets.length, nowForQuotaMs);
      const entry = {
        ...norm,
        bucketId: b?.bucketId || '',
        groupName: grp?.displayName || ident.poolLabel,
        window: win,
      };
      const builder = ensurePoolBuilder(ident);
      if (win === '5h' && !builder.bucket5h) {
        builder.bucket5h = entry;
      } else if (win === 'weekly' && !builder.bucketWeekly) {
        builder.bucketWeekly = entry;
      } else if (win !== '5h' && !builder.bucketWeekly) {
        builder.bucketWeekly = entry;
      }
    }
  }

  // 注册动态模型字典，并采样 Carbon / Argon 与标准 Gemini 的单模型 quotaInfo
  let sampleCarbonCfgQuota = null;
  let sampleArgonCfgQuota = null;
  let sampleStdGeminiCfgQuota = null;

  for (const cfg of clientConfigs) {
    const rawKey = cfg?.modelOrAlias?.model;
    if (rawKey) {
      dynamicModelMap.set(rawKey, {
        modelId: cfg.modelId || rawKey,
        label: cfg.label || cfg.modelId || rawKey,
        quotaInfo: cfg.quotaInfo || null,
      });
    }
    const info = resolveModelInfo(rawKey, dynamicModelMap);
    const cfgQuota = normalizeQuotaFraction(cfg?.quotaInfo);
    if (!cfgQuota || info.family !== 'Gemini') continue;
    if (isCarbonModelIdentifier(rawKey, cfg?.modelId, cfg?.label, info.modelId)) {
      if (!sampleCarbonCfgQuota) sampleCarbonCfgQuota = cfgQuota;
    } else if (isArgonModelIdentifier(rawKey, cfg?.modelId, cfg?.label, info.modelId)) {
      if (!sampleArgonCfgQuota) sampleArgonCfgQuota = cfgQuota;
    } else if (!sampleStdGeminiCfgQuota) {
      sampleStdGeminiCfgQuota = cfgQuota;
    }
  }

  // Pro 账号回退检测：若 RetrieveUserQuotaSummary 未单独列出 Argon / Carbon 分组，
  // 但 GetUserStatus 中 Argon / Carbon 模型的 quotaInfo 与标准 Gemini 明显分离，则合成独立周限池
  if (!poolBuilders.has('Argon') && sampleArgonCfgQuota) {
    const geminiBuilder = poolBuilders.get('Gemini');
    const hasGeminiBaseline = Boolean(
      sampleStdGeminiCfgQuota || geminiBuilder?.bucket5h || geminiBuilder?.bucketWeekly
    );
    const matchesSharedGemini =
      quotaFractionsMatch(sampleArgonCfgQuota, sampleStdGeminiCfgQuota) ||
      quotaFractionsMatch(sampleArgonCfgQuota, geminiBuilder?.bucket5h) ||
      quotaFractionsMatch(sampleArgonCfgQuota, geminiBuilder?.bucketWeekly);

    if (hasGeminiBaseline && !matchesSharedGemini) {
      const argonBuilder = ensurePoolBuilder({
        poolKey: 'Argon',
        poolLabel: 'Gemini 4 Argon',
        poolName: 'Gemini 4 Argon 模型池',
      });
      argonBuilder.bucketWeekly = {
        ...sampleArgonCfgQuota,
        bucketId: 'argon-weekly-inferred',
        groupName: 'Gemini 4 Argon',
        window: 'weekly',
      };
    }
  }

  if (!poolBuilders.has('Carbon') && sampleCarbonCfgQuota) {
    const geminiBuilder = poolBuilders.get('Gemini');
    const argonBuilder = poolBuilders.get('Argon');
    const hasBaseline = Boolean(
      sampleStdGeminiCfgQuota ||
        sampleArgonCfgQuota ||
        geminiBuilder?.bucket5h ||
        geminiBuilder?.bucketWeekly ||
        argonBuilder?.bucketWeekly
    );
    const matchesSharedPool =
      quotaFractionsMatch(sampleCarbonCfgQuota, sampleStdGeminiCfgQuota) ||
      quotaFractionsMatch(sampleCarbonCfgQuota, sampleArgonCfgQuota) ||
      quotaFractionsMatch(sampleCarbonCfgQuota, geminiBuilder?.bucket5h) ||
      quotaFractionsMatch(sampleCarbonCfgQuota, geminiBuilder?.bucketWeekly) ||
      quotaFractionsMatch(sampleCarbonCfgQuota, argonBuilder?.bucketWeekly);

    if (hasBaseline && !matchesSharedPool) {
      const carbonBuilder = ensurePoolBuilder({
        poolKey: 'Carbon',
        poolLabel: 'Gemini 4 Carbon',
        poolName: 'Gemini 4 Carbon 模型池',
      });
      carbonBuilder.bucketWeekly = {
        ...sampleCarbonCfgQuota,
        bucketId: 'carbon-weekly-inferred',
        groupName: 'Gemini 4 Carbon',
        window: 'weekly',
      };
    }
  }

  const hasDedicatedArgonPool = poolBuilders.has('Argon');
  const hasDedicatedCarbonPool = poolBuilders.has('Carbon');
  const modelQuotas = [];

  for (const cfg of clientConfigs) {
    const rawKey = cfg?.modelOrAlias?.model;
    const info = resolveModelInfo(rawKey, dynamicModelMap);
    const isCarbon = isCarbonModelIdentifier(rawKey, cfg?.modelId, cfg?.label, info.modelId);
    const isArgon = isArgonModelIdentifier(rawKey, cfg?.modelId, cfg?.label, info.modelId);
    const isGemini = info.family === 'Gemini';
    const targetIdent =
      isCarbon && hasDedicatedCarbonPool
        ? { poolKey: 'Carbon', poolLabel: 'Gemini 4 Carbon', poolName: 'Gemini 4 Carbon 模型池' }
        : isArgon && hasDedicatedArgonPool
          ? { poolKey: 'Argon', poolLabel: 'Gemini 4 Argon', poolName: 'Gemini 4 Argon 模型池' }
          : isGemini
            ? { poolKey: 'Gemini', poolLabel: 'Gemini', poolName: 'Gemini 模型池' }
            : { poolKey: 'Claude & GPT', poolLabel: 'Claude & GPT', poolName: 'Claude & GPT 模型池' };

    const builder = ensurePoolBuilder(targetIdent);
    if (cfg?.label && !builder.models.includes(cfg.label)) {
      builder.models.push(cfg.label);
    }

    const cfgQuota = normalizeQuotaFraction(cfg?.quotaInfo);
    if (!builder.bucket5h && !builder.bucketWeekly && !builder.fallback5h && cfgQuota) {
      if (targetIdent.poolKey === 'Argon' || targetIdent.poolKey === 'Carbon') {
        builder.bucketWeekly = cfgQuota;
      } else {
        builder.fallback5h = cfgQuota;
      }
    }

    const eff5h = builder.bucket5h || (!builder.bucketWeekly ? cfgQuota : null);
    const effWk = builder.bucketWeekly;
    const hasValid5h = Boolean(eff5h);
    modelQuotas.push({
      label: cfg.label,
      modelId: cfg.modelId,
      rawKey,
      family: targetIdent.poolKey,
      isAvailable: Boolean(eff5h || effWk || cfgQuota),
      remainingPct: hasValid5h ? eff5h.remainingPct : null,
      remainingIntPct: hasValid5h ? eff5h.remainingIntPct : null,
      usedPct: hasValid5h ? eff5h.usedPct : null,
      resetTime: hasValid5h ? eff5h.resetTime : null,
      weeklyRemainingPct: effWk?.remainingPct ?? null,
      weeklyRemainingIntPct: effWk?.remainingIntPct ?? null,
      weeklyUsedPct: effWk?.usedPct ?? null,
      weeklyResetTime: effWk?.resetTime || null,
    });
  }

  // 确保基础的 Gemini 与 Claude & GPT 模型池始终存在
  ensurePoolBuilder({ poolKey: 'Gemini', poolLabel: 'Gemini', poolName: 'Gemini 模型池' });
  ensurePoolBuilder({
    poolKey: 'Claude & GPT',
    poolLabel: 'Claude & GPT',
    poolName: 'Claude & GPT 模型池',
  });

  const quotaPoolsMap = new Map();
  for (const [poolKey, builder] of poolBuilders.entries()) {
    const b5h = builder.bucket5h || builder.fallback5h || null;
    const bWk = builder.bucketWeekly || null;
    quotaPoolsMap.set(poolKey, {
      poolKey,
      poolLabel: builder.poolLabel,
      poolName: builder.poolName,
      family: poolKey,
      isAvailable: Boolean(b5h || bWk),
      has5h: Boolean(b5h),
      hasWeekly: Boolean(bWk),
      remainingPct: b5h?.remainingPct ?? null,
      remainingIntPct: b5h?.remainingIntPct ?? null,
      usedPct: b5h?.usedPct ?? null,
      resetTime: b5h?.resetTime || null,
      weeklyRemainingPct: bWk?.remainingPct ?? null,
      weeklyRemainingIntPct: bWk?.remainingIntPct ?? null,
      weeklyUsedPct: bWk?.usedPct ?? null,
      weeklyResetTime: bWk?.resetTime || null,
      models: builder.models,
    });
  }

  return {
    dynamicModelMap,
    quotaPoolsMap,
    modelQuotas,
  };
}
