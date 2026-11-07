/**
 * @fileoverview 多时间窗口解析、用量桶累加、12 段趋势序列、月度序列与分模型/分来源聚合引擎。
 *
 * 负责将内存缓存 (`trajectoryCache`) 与外部深层统计缓存 (`loadExternalDeepStatsCache`)
 * 中的所有步骤按预设窗口（`all`, `5h`, `today`, `24h`, `week`, `7d`, `14d`, `30d`）与当前选定窗口
 * 进行一次遍历聚合，输出前端消费分析与模型明细所需的完整统计结构。
 */

import {
  accumulateSpeed,
  createSpeedAccumulator,
  finishSpeed,
} from '../speed-metrics.mjs';
import { roundMetric, trajectoryCache } from './config.mjs';
import { loadExternalDeepStatsCache } from './local-scanner.mjs';
import { computeStepCost, resolveModelInfo } from './model-pricing.mjs';

/**
 * 获取本地当日 00:00:00.000 的毫秒时间戳。
 *
 * @param {Date|number} [now=new Date()]
 * @returns {number}
 */
export function getStartOfLocalDayMs(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 获取本地下一个周一 00:00:00.000 的 ISO 时间字符串（用于自定义本机周限额重置倒计时）。
 *
 * @param {Date|number} [now=new Date()]
 * @returns {string}
 */
export function getNextMondayResetIso(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ...
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * 获取本地本周一 00:00:00.000 的毫秒时间戳。
 *
 * @param {Date|number} [now=new Date()]
 * @returns {number}
 */
export function getStartOfCurrentWeekMs(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 根据时间范围键名 (`rangeKey`) 与官方配额重置锚点 (`cycleAnchors`) 解析起止毫秒时间戳。
 *
 * @param {string} [rangeKey='all']
 * @param {number} [customStartMs=0]
 * @param {number} [customEndMs=0]
 * @param {number} [nowMs=Date.now()]
 * @param {{ fiveHourResetMs?: number, weeklyResetMs?: number }} [cycleAnchors={}]
 * @returns {{ key: string, label: string, startMs: number, endMs: number }}
 */
export function resolveTimeWindow(
  rangeKey = 'all',
  customStartMs = 0,
  customEndMs = 0,
  nowMs = Date.now(),
  cycleAnchors = {}
) {
  const now = new Date(nowMs);
  switch (rangeKey) {
    case '5h': {
      const reset5hMs = cycleAnchors.fiveHourResetMs || 0;
      const start5hMs =
        reset5hMs > nowMs ? reset5hMs - 5 * 3600 * 1000 : nowMs - 5 * 3600 * 1000;
      return {
        key: '5h',
        label: reset5hMs > nowMs ? '当前 5h 周期' : '近 5 小时',
        startMs: start5hMs,
        endMs: nowMs,
      };
    }
    case 'today':
      return { key: 'today', label: '今日', startMs: getStartOfLocalDayMs(now), endMs: nowMs };
    case '24h':
      return { key: '24h', label: '近 24 小时', startMs: nowMs - 24 * 3600 * 1000, endMs: nowMs };
    case 'week': {
      const resetWkMs = cycleAnchors.weeklyResetMs || 0;
      const startWkMs =
        resetWkMs > nowMs ? resetWkMs - 7 * 24 * 3600 * 1000 : getStartOfCurrentWeekMs(now);
      return {
        key: 'week',
        label: resetWkMs > nowMs ? '当前周限周期' : '本周',
        startMs: startWkMs,
        endMs: nowMs,
      };
    }
    case '7d':
      return { key: '7d', label: '近 7 天', startMs: nowMs - 7 * 24 * 3600 * 1000, endMs: nowMs };
    case '14d':
      return {
        key: '14d',
        label: '近 14 天',
        startMs: nowMs - 14 * 24 * 3600 * 1000,
        endMs: nowMs,
      };
    case '30d':
      return {
        key: '30d',
        label: '近 30 天',
        startMs: nowMs - 30 * 24 * 3600 * 1000,
        endMs: nowMs,
      };
    case 'custom': {
      const s = Number(customStartMs) > 0 ? Number(customStartMs) : 0;
      const e = Number(customEndMs) > 0 ? Number(customEndMs) : nowMs;
      return {
        key: 'custom',
        label: '自定义时段',
        startMs: Math.min(s, e),
        endMs: Math.max(s, e),
      };
    }
    case 'all':
    default:
      return { key: 'all', label: '全部时间', startMs: 0, endMs: Infinity };
  }
}

/**
 * 创建一个空的用量统计累加桶。
 */
export function createUsageBucket() {
  return {
    calls: 0,
    conversationsSet: new Set(),
    inputTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    responseTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    savedCostUsd: 0,
    geminiTokens: 0,
    geminiCostUsd: 0,
    geminiCalls: 0,
    claudeGptTokens: 0,
    claudeGptCostUsd: 0,
    claudeGptCalls: 0,
  };
}

/**
 * 将单个模型步骤的 Token 与成本累加至目标统计桶。
 *
 * @param {ReturnType<typeof createUsageBucket>} bucket
 * @param {object} st 步骤对象
 * @param {ReturnType<typeof resolveModelInfo>} mInfo 模型信息
 * @param {number|null} stepCost 单步美元成本（未知时为 `null`）
 * @param {string} cascadeId 会话标识
 */
export function accumulateStepIntoBucket(bucket, st, mInfo, stepCost, cascadeId) {
  const stepTotalTokens = st.inputTokens + st.cacheReadTokens + st.outputTokens;
  const savedCost = mInfo.pricing
    ? (st.cacheReadTokens / 1_000_000) * Math.max(0, mInfo.pricing.input - mInfo.pricing.cache)
    : 0;
  if (stepCost === null) bucket.unpricedCalls = (bucket.unpricedCalls || 0) + 1;
  const resolvedCost = stepCost ?? 0;
  bucket.calls += 1;
  if (cascadeId) bucket.conversationsSet.add(cascadeId);
  bucket.inputTokens += st.inputTokens;
  bucket.cacheReadTokens += st.cacheReadTokens;
  bucket.outputTokens += st.outputTokens;
  bucket.thinkingTokens += st.thinkingTokens || 0;
  bucket.responseTokens += st.responseTokens || 0;
  bucket.totalTokens += stepTotalTokens;
  bucket.costUsd += resolvedCost;
  bucket.savedCostUsd += savedCost;

  if (mInfo.family === 'Gemini') {
    bucket.geminiTokens += stepTotalTokens;
    bucket.geminiCostUsd += resolvedCost;
    bucket.geminiCalls += 1;
  } else if (mInfo.family === 'Claude' || mInfo.family === 'GPT') {
    bucket.claudeGptTokens += stepTotalTokens;
    bucket.claudeGptCostUsd += resolvedCost;
    bucket.claudeGptCalls += 1;
  }
}

/**
 * 将累加完成的用量桶定型为可序列化的前端统计结构（计算缓存命中率并舍入金额）。
 *
 * @param {ReturnType<typeof createUsageBucket>} bucket
 */
export function finalizeUsageBucket(bucket) {
  const promptTokens = bucket.inputTokens + bucket.cacheReadTokens;
  const cacheHitPct =
    promptTokens > 0 ? +((bucket.cacheReadTokens / promptTokens) * 100).toFixed(1) : 0;
  return {
    calls: bucket.calls,
    conversationsCount: bucket.conversationsSet.size,
    inputTokens: bucket.inputTokens,
    cacheReadTokens: bucket.cacheReadTokens,
    outputTokens: bucket.outputTokens,
    thinkingTokens: bucket.thinkingTokens,
    responseTokens: bucket.responseTokens,
    totalTokens: bucket.totalTokens,
    costUsd: +bucket.costUsd.toFixed(2),
    unpricedCalls: bucket.unpricedCalls || 0,
    savedCostUsd: +bucket.savedCostUsd.toFixed(2),
    cacheHitPct,
    geminiTokens: bucket.geminiTokens,
    geminiCostUsd: +bucket.geminiCostUsd.toFixed(2),
    geminiCalls: bucket.geminiCalls,
    claudeGptTokens: bucket.claudeGptTokens,
    claudeGptCostUsd: +bucket.claudeGptCostUsd.toFixed(2),
    claudeGptCalls: bucket.claudeGptCalls,
  };
}

/**
 * 将单步统计数据累加至按模型分组的映射表中（供单代理、主+子汇总与全局时间范围共用）。
 *
 * @param {Map<string, object>} perModelStats
 * @param {object} st
 * @param {object} mInfo
 * @param {number|null} stepCost
 */
function accumulateStepIntoModelMap(perModelStats, st, mInfo, stepCost) {
  const stepTotalTokens =
    (st.inputTokens || 0) + (st.cacheReadTokens || 0) + (st.outputTokens || 0);
  const unpriced = stepCost === null ? 1 : 0;
  const modelGroupKey = mInfo.baseLabel || mInfo.label;

  if (!perModelStats.has(modelGroupKey)) {
    perModelStats.set(modelGroupKey, {
      label: modelGroupKey,
      shortName: mInfo.shortName,
      fallbackModelId: mInfo.modelId && mInfo.modelId !== 'unknown' ? mInfo.modelId : '',
      upstreamModelCounts: new Map(),
      family: mInfo.family,
      calls: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      speedAccumulator: createSpeedAccumulator(),
    });
  }
  const agg = perModelStats.get(modelGroupKey);
  if (st.responseModel) {
    agg.upstreamModelCounts.set(
      st.responseModel,
      (agg.upstreamModelCounts.get(st.responseModel) || 0) + 1
    );
  }
  accumulateSpeed(agg.speedAccumulator, st);

  agg.calls += 1;
  agg.inputTokens += st.inputTokens || 0;
  agg.cacheReadTokens += st.cacheReadTokens || 0;
  agg.outputTokens += st.outputTokens || 0;
  agg.thinkingTokens += st.thinkingTokens || 0;
  agg.responseTokens += st.responseTokens || 0;
  agg.totalTokens += stepTotalTokens;
  agg.costUsd += stepCost ?? 0;
  agg.unpricedCalls = (agg.unpricedCalls || 0) + unpriced;
}

/**
 * 将按模型分组的统计映射表定型并排序为前端可渲染数组。
 *
 * @param {Map<string, object>} perModelStats
 * @returns {object[]}
 */
function finalizeModelBreakdownMap(perModelStats) {
  return Array.from(perModelStats.values())
    .sort((a, b) => b.calls - a.calls || String(a.label).localeCompare(String(b.label)))
    .map(({ speedAccumulator, upstreamModelCounts, fallbackModelId, ...m }) => {
      const sortedUpstream = Array.from((upstreamModelCounts || new Map()).entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
      const primaryUpstream =
        sortedUpstream.length > 0 ? sortedUpstream[0] : fallbackModelId || m.shortName || m.label;
      const finishedSpeed = finishSpeed(speedAccumulator);
      return {
        ...m,
        upstreamName: primaryUpstream,
        upstreamModels: sortedUpstream,
        costUsd: +m.costUsd.toFixed(3),
        avgTokPerSec: roundMetric(finishedSpeed.avgTokPerSec),
        speedSummary: finishedSpeed,
      };
    });
}

/**
 * 针对给定步骤数组构建按模型聚合的统计列表（供单代理、主+子汇总及全局时间范围复用）。
 *
 * @param {object[]} steps
 * @param {Map<string, object>} dynamicModelMap
 * @returns {object[]}
 */
export function buildScopedModelBreakdown(steps = [], dynamicModelMap) {
  const perModelStats = new Map();
  for (const st of steps) {
    const mInfo = resolveModelInfo(
      st.modelKey,
      dynamicModelMap,
      st.apiProvider,
      st.modelDisplayName,
      st.responseModel
    );
    const stepCost = computeStepCost(st, mInfo.pricing);
    accumulateStepIntoModelMap(perModelStats, st, mInfo, stepCost);
  }
  return finalizeModelBreakdownMap(perModelStats);
}

/**
 * 聚合所有预设时间窗口、当前选定窗口、12 段趋势图、年度月序列、来源占比与分模型统计。
 *
 * @param {{
 *   filterOpts?: { range?: string, startMs?: number, endMs?: number },
 *   cycleAnchors?: { fiveHourResetMs?: number, weeklyResetMs?: number },
 *   currentAccountName?: string,
 *   activeCascadeId?: string|null,
 *   activeFamilyCascadeIds?: Set<string>|null,
 *   dynamicModelMap: Map<string, object>
 * }} params
 */
export function aggregateMultiWindowUsage({
  filterOpts = {},
  cycleAnchors = {},
  currentAccountName = '',
  activeCascadeId = null,
  activeFamilyCascadeIds = null,
  dynamicModelMap,
}) {
  const rawFamilyIds =
    activeFamilyCascadeIds instanceof Set
      ? Array.from(activeFamilyCascadeIds)
      : activeCascadeId
        ? [activeCascadeId]
        : [];
  const familySet = new Set(rawFamilyIds.map((id) => String(id || '').toLowerCase()));
  const nowMs = Date.now();
  const selectedWindow = resolveTimeWindow(
    filterOpts.range || 'all',
    filterOpts.startMs,
    filterOpts.endMs,
    nowMs,
    cycleAnchors
  );

  const presetKeys = ['all', '5h', 'today', '24h', 'week', '7d', '14d', '30d'];
  const presetWindows = {};
  const accountBuckets = {};
  const sessionBuckets = {};

  for (const k of presetKeys) {
    presetWindows[k] = resolveTimeWindow(k, 0, 0, nowMs, cycleAnchors);
    accountBuckets[k] = createUsageBucket();
    sessionBuckets[k] = createUsageBucket();
  }
  const selectedAccountBucket = createUsageBucket();
  const selectedSessionBucket = createUsageBucket();
  const perModelStats = new Map();
  const selectedWindowSteps = [];
  let earliestSelectedStepMs = Infinity;

  const currentYear = new Date(nowMs).getFullYear();
  const monthlySeries = Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    label: `${idx + 1}月`,
    calls: 0,
    inputTokens: 0,
    cacheReadTokens: 0,
    responseTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    costUsd: 0,
  }));

  const SOURCE_LABELS = {
    standalone: 'Antigravity App',
    ide: 'Antigravity IDE',
    cli: 'Antigravity CLI',
  };
  const perSourceStats = new Map();
  const externalConvos = loadExternalDeepStatsCache();
  const allEntriesToAggregate = [];

  for (const [cascadeId, entry] of Object.entries(trajectoryCache)) {
    const cidLower = String(cascadeId || '').toLowerCase();
    if (
      entry?.accountName &&
      currentAccountName &&
      entry.accountName !== currentAccountName &&
      !familySet.has(cidLower)
    ) {
      continue;
    }
    const groupCascadeId = String(
      entry?.rootConversationId || entry?.parentConversationId || cascadeId
    ).toLowerCase();
    allEntriesToAggregate.push({
      cascadeId: groupCascadeId,
      appSource: entry?.appSource || 'standalone',
      steps: entry?.steps || [],
      isCurrentConv: familySet.has(cidLower),
    });
  }

  for (const ext of externalConvos.values()) {
    const extCidLower = String(ext.cascadeId || '').toLowerCase();
    const liveEntry = trajectoryCache[ext.cascadeId] || trajectoryCache[extCidLower];
    if (
      ext.appSource === 'standalone' &&
      liveEntry &&
      (liveEntry.steps?.length || 0) >= ext.steps.length
    ) {
      continue;
    }
    allEntriesToAggregate.push({
      cascadeId: `${ext.appSource}:${extCidLower}`,
      appSource: ext.appSource || 'ide',
      steps: ext.steps || [],
      isCurrentConv: familySet.has(extCidLower) && !liveEntry,
    });
  }

  for (const entry of allEntriesToAggregate) {
    const { cascadeId, isCurrentConv } = entry;
    const srcKey = entry.appSource || 'standalone';
    const srcName = SOURCE_LABELS[srcKey] || `Antigravity (${srcKey})`;

    for (const st of entry.steps || []) {
      const mInfo = resolveModelInfo(
        st.modelKey,
        dynamicModelMap,
        st.apiProvider,
        st.modelDisplayName,
        st.responseModel
      );
      const stepTotalTokens = st.inputTokens + st.cacheReadTokens + st.outputTokens;
      const stepCost = computeStepCost(st, mInfo.pricing);
      const unpriced = stepCost === null ? 1 : 0;
      const tMs = st.createdAtMs || 0;

      if (tMs > 0) {
        const stepDate = new Date(tMs);
        if (stepDate.getFullYear() === currentYear) {
          const mBucket = monthlySeries[stepDate.getMonth()];
          if (mBucket) {
            mBucket.calls += 1;
            mBucket.inputTokens += st.inputTokens || 0;
            mBucket.cacheReadTokens += st.cacheReadTokens || 0;
            mBucket.responseTokens += st.responseTokens || 0;
            mBucket.thinkingTokens += st.thinkingTokens || 0;
            mBucket.totalTokens += stepTotalTokens;
            mBucket.costUsd = +(mBucket.costUsd + (stepCost ?? 0)).toFixed(4);
            mBucket.unpricedCalls = (mBucket.unpricedCalls || 0) + unpriced;
          }
        }
      }

      for (const k of presetKeys) {
        const w = presetWindows[k];
        if (k === 'all' || (tMs >= w.startMs && tMs <= w.endMs)) {
          accumulateStepIntoBucket(accountBuckets[k], st, mInfo, stepCost, cascadeId);
          if (isCurrentConv) {
            accumulateStepIntoBucket(sessionBuckets[k], st, mInfo, stepCost, cascadeId);
          }
        }
      }

      const inSelectedWindow =
        selectedWindow.key === 'all' ||
        (tMs >= selectedWindow.startMs && tMs <= selectedWindow.endMs);

      if (inSelectedWindow) {
        accumulateStepIntoBucket(selectedAccountBucket, st, mInfo, stepCost, cascadeId);
        if (isCurrentConv) {
          accumulateStepIntoBucket(selectedSessionBucket, st, mInfo, stepCost, cascadeId);
        }
        if (tMs > 0) {
          if (tMs < earliestSelectedStepMs) earliestSelectedStepMs = tMs;
          selectedWindowSteps.push({
            tMs,
            tokens: stepTotalTokens,
            costUsd: stepCost ?? 0,
            unpricedCalls: unpriced,
          });
        }

        if (!perSourceStats.has(srcKey)) {
          perSourceStats.set(srcKey, {
            name: srcName,
            calls: 0,
            inputTokens: 0,
            cacheReadTokens: 0,
            responseTokens: 0,
            thinkingTokens: 0,
            totalTokens: 0,
            costUsd: 0,
          });
        }
        const sAgg = perSourceStats.get(srcKey);
        sAgg.calls += 1;
        sAgg.inputTokens += st.inputTokens || 0;
        sAgg.cacheReadTokens += st.cacheReadTokens || 0;
        sAgg.responseTokens += st.responseTokens || 0;
        sAgg.thinkingTokens += st.thinkingTokens || 0;
        sAgg.totalTokens += stepTotalTokens;
        sAgg.costUsd += stepCost ?? 0;
        sAgg.unpricedCalls = (sAgg.unpricedCalls || 0) + unpriced;

        accumulateStepIntoModelMap(perModelStats, st, mInfo, stepCost);
      }
    }
  }

  // 构建当前选定时间窗口的 12 段等宽趋势序列 (trendSeries)
  const trendSlotsCount = 12;
  const trendEndMs = Number.isFinite(selectedWindow.endMs) ? selectedWindow.endMs : nowMs;
  const rawTrendStartMs =
    selectedWindow.key === 'all'
      ? Number.isFinite(earliestSelectedStepMs)
        ? earliestSelectedStepMs
        : nowMs - 24 * 3600 * 1000
      : selectedWindow.startMs;
  const trendStartMs = Math.min(rawTrendStartMs, trendEndMs - 60 * 1000);
  const trendSpanMs = Math.max(60 * 1000, trendEndMs - trendStartMs);
  const slotWidthMs = trendSpanMs / trendSlotsCount;
  const isShortSpan = trendSpanMs <= 36 * 3600 * 1000;
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatTrendLabel = (ms) => {
    const d = new Date(ms);
    if (isShortSpan) {
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const trendSeries = Array.from({ length: trendSlotsCount }, (_, idx) => {
    const sMs = trendStartMs + idx * slotWidthMs;
    return {
      index: idx,
      label: formatTrendLabel(sMs),
      tokens: 0,
      costUsd: 0,
      calls: 0,
    };
  });

  for (const item of selectedWindowSteps) {
    const rawIdx = Math.floor((item.tMs - trendStartMs) / slotWidthMs);
    const idx = Math.max(0, Math.min(trendSlotsCount - 1, rawIdx));
    trendSeries[idx].tokens += item.tokens;
    trendSeries[idx].costUsd = +(trendSeries[idx].costUsd + item.costUsd).toFixed(4);
    trendSeries[idx].unpricedCalls = (trendSeries[idx].unpricedCalls || 0) + item.unpricedCalls;
    trendSeries[idx].calls += 1;
  }

  const finalizedPresets = {};
  for (const k of presetKeys) {
    finalizedPresets[k] = {
      label: presetWindows[k].label,
      session: finalizeUsageBucket(sessionBuckets[k]),
      account: finalizeUsageBucket(accountBuckets[k]),
    };
  }

  const finalizedSelectedSession = finalizeUsageBucket(selectedSessionBucket);
  const finalizedSelectedAccount = finalizeUsageBucket(selectedAccountBucket);

  const sourcesBreakdown = Array.from(perSourceStats.values())
    .filter((s) => s.totalTokens > 0 || s.calls > 0)
    .map((s) => ({
      ...s,
      costUsd: +s.costUsd.toFixed(2),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens || b.calls - a.calls);

  const todayBucket = finalizedPresets.today.account;
  const weekBucket = finalizedPresets.week.account;
  const modelBreakdown = finalizeModelBreakdownMap(perModelStats);

  return {
    selectedWindow,
    trendStartMs,
    trendEndMs,
    finalizedSelectedSession,
    finalizedSelectedAccount,
    finalizedPresets,
    trendSeries,
    sourcesBreakdown,
    currentYear,
    monthlySeries,
    todayBucket,
    weekBucket,
    modelBreakdown,
  };
}
