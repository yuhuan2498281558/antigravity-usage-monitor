/**
 * @fileoverview 本地磁盘会话文件发现、外部 IDE/CLI 深层统计缓存加载与历史轨迹增量同步。
 *
 * 负责：
 * 1. 扫描 `~/.gemini/antigravity/conversations` 下的本地 `.db` / `.pb` / `.db-wal` 会话文件及修改时间；
 * 2. 读取跨端共享的 `.deep_stats_cache.json`（兼容 IDE / CLI / Standalone 多端步骤数据合并）；
 * 3. 将 Language Server 摘要、本地磁盘文件与内存缓存三方会话列表对齐，并以受控并发（最多 4 路）
 *    拉取新增或 Schema 过期的会话轨迹步骤，持久化至 `trajectory_usage_cache.json`。
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { extractModelSteps, parseIsoMs } from '../speed-metrics.mjs';
import {
  CACHE_FILE,
  CACHE_SCHEMA_VERSION,
  CONVERSATIONS_DIR,
  DEEP_STATS_CACHE_CANDIDATES,
  cacheState,
  externalDeepStatsMemo,
  loadJson,
  saveJson,
  trajectoryCache,
} from './config.mjs';
import { callLsRpc } from './ls-rpc.mjs';
import { formatGenericModelSlug, getBaseModelLabel } from './model-pricing.mjs';

/**
 * 扫描本地 `conversations` 目录，返回 `cascadeId -> 最新磁盘修改时间 (mtimeMs)` 映射表。
 *
 * @returns {Map<string, number>}
 */
export function discoverLocalConversationFiles() {
  const map = new Map();
  if (!existsSync(CONVERSATIONS_DIR)) return map;
  try {
    for (const name of readdirSync(CONVERSATIONS_DIR)) {
      const m = name.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(db|pb|db-wal)$/i
      );
      if (!m) continue;
      const cascadeId = m[1].toLowerCase();
      try {
        const st = statSync(join(CONVERSATIONS_DIR, name));
        const prevMtime = map.get(cascadeId) || 0;
        if (st.mtimeMs > prevMtime) {
          map.set(cascadeId, st.mtimeMs);
        }
      } catch {
        if (!map.has(cascadeId)) map.set(cascadeId, 0);
      }
    }
  } catch {
    // 忽略目录读取异常
  }
  return map;
}

/**
 * 加载并解析跨端（IDE / Standalone / JetBrains）写入的 `.deep_stats_cache.json` 缓存。
 * 使用文件签名 (`mtimeMs + size`) 进行 Memoize，文件未变化时直接返回内存 Map。
 *
 * @returns {Map<string, {cascadeId: string, appSource: string, title: string, lastModifiedMs: number, steps: object[]}>}
 */
export function loadExternalDeepStatsCache() {
  const sigParts = [];
  const existingFiles = [];
  for (const candidate of DEEP_STATS_CACHE_CANDIDATES) {
    if (!existsSync(candidate)) continue;
    try {
      const st = statSync(candidate);
      sigParts.push(`${candidate}:${st.mtimeMs || 0}:${st.size || 0}`);
      existingFiles.push(candidate);
    } catch {
      // 忽略 stat 异常
    }
  }
  if (existingFiles.length === 0) {
    return new Map();
  }
  const sig = sigParts.join('|');
  if (externalDeepStatsMemo.sig === sig && externalDeepStatsMemo.convos.size > 0) {
    return externalDeepStatsMemo.convos;
  }

  const convos = new Map();
  const runtimeDisplayMap = new Map();

  for (const filePath of existingFiles) {
    const raw = loadJson(filePath, null);
    if (!raw || typeof raw.perConvo !== 'object' || !raw.perConvo) continue;

    for (const item of Object.values(raw.perConvo)) {
      for (const e of item?.entries || []) {
        const display =
          e?.modelDisplayName ||
          formatGenericModelSlug(e?.modelCanonicalId || e?.model || e?.modelAggregationId);
        if (!display) continue;
        const base = getBaseModelLabel(display);
        if (e?.modelRuntimeId && !runtimeDisplayMap.has(e.modelRuntimeId)) {
          runtimeDisplayMap.set(e.modelRuntimeId, base);
        }
        if (e?.model && !runtimeDisplayMap.has(e.model)) {
          runtimeDisplayMap.set(e.model, base);
        }
      }
    }

    const titleMap = raw.titleMap || {};
    for (const [fullKey, item] of Object.entries(raw.perConvo)) {
      const rawEntries = item?.entries;
      if (!Array.isArray(rawEntries) || rawEntries.length === 0) continue;
      const colonIdx = fullKey.indexOf(':');
      const appSource = item?.appSource || (colonIdx > 0 ? fullKey.slice(0, colonIdx) : 'ide');
      const cascadeId = (colonIdx > 0 ? fullKey.slice(colonIdx + 1) : fullKey).toLowerCase();
      const mapKey = `${appSource}:${cascadeId}`;
      const existing = convos.get(mapKey);
      if (existing && existing.steps.length >= rawEntries.length) continue;

      const steps = [];
      let lastModifiedMs = 0;
      for (let idx = 0; idx < rawEntries.length; idx++) {
        const e = rawEntries[idx];
        const inputTokens = Math.max(0, Number(e?.inp) || 0);
        const cacheReadTokens = Math.max(0, Number(e?.cache) || 0);
        const responseTokens = Math.max(0, Number(e?.out) || 0);
        const thinkingTokens = Math.max(0, Number(e?.reasoning) || 0);
        const outputTokens = responseTokens + thinkingTokens;
        if (inputTokens === 0 && cacheReadTokens === 0 && outputTokens === 0) continue;
        const createdAtMs = e?.ts ? Date.parse(e.ts) || 0 : 0;
        if (createdAtMs > lastModifiedMs) lastModifiedMs = createdAtMs;
        const resolvedDisplay =
          e?.modelDisplayName ||
          runtimeDisplayMap.get(e?.model) ||
          runtimeDisplayMap.get(e?.modelRuntimeId) ||
          formatGenericModelSlug(e?.modelCanonicalId || e?.model || e?.modelAggregationId) ||
          '';
        steps.push({
          stepIndex: idx + 1,
          createdAt: e?.ts || '',
          createdAtMs,
          modelKey: e?.modelCanonicalId || e?.model || e?.modelRuntimeId || 'unknown',
          modelDisplayName: resolvedDisplay,
          apiProvider: e?.provider || '',
          appSource,
          inputTokens,
          cacheReadTokens,
          outputTokens,
          thinkingTokens,
          responseTokens,
        });
      }
      if (steps.length > 0) {
        convos.set(mapKey, {
          cascadeId,
          appSource,
          title: titleMap[fullKey] || titleMap[cascadeId] || cascadeId.slice(0, 8),
          lastModifiedMs,
          steps,
        });
      }
    }
  }

  externalDeepStatsMemo.sig = sig;
  externalDeepStatsMemo.convos = convos;
  return convos;
}

const MAX_CONCURRENT_RPC = 4;
const LEGACY_MIGRATION_BATCH_SIZE = 8;
const MAX_SUBAGENT_RECONCILE_DEPTH = 4;
const FAILED_RPC_COOLDOWN_MS = 60_000;
const failedFetchCooldownMap = new Map();

/**
 * 清洗并裁剪 `subagentSpec`，仅保留 UI 与分组所需的 `typeName` 和 `role`，
 * 剔除体积较大的 `initialPrompt`，避免膨胀 `trajectory_usage_cache.json`。
 *
 * @param {object|null|undefined} rawSpec
 * @returns {{ typeName: string, role: string } | null}
 */
function sanitizeSubagentSpec(rawSpec) {
  if (!rawSpec || typeof rawSpec !== 'object') return null;
  const typeName = String(rawSpec.typeName || '').trim();
  const role = String(rawSpec.role || '').trim();
  if (!typeName && !role) return null;
  return { typeName, role };
}

/**
 * 按字段合并两个来源的 `subagentSpec`，避免仅含 `typeName` 的元数据覆盖掉父步骤中的 `role`。
 *
 * @param {object|null|undefined} primary
 * @param {object|null|undefined} secondary
 * @returns {{ typeName: string, role: string } | null}
 */
function mergeSubagentSpecs(primary, secondary) {
  const a = sanitizeSubagentSpec(primary);
  const b = sanitizeSubagentSpec(secondary);
  if (!a && !b) return null;
  return {
    typeName: a?.typeName || b?.typeName || '',
    role: a?.role || b?.role || '',
  };
}

/**
 * 从主/父会话的原始轨迹步骤 (`CORTEX_STEP_TYPE_INVOKE_SUBAGENT`) 中提取派生子代理列表。
 * Antigravity 重启后 `GetAllCascadeTrajectories` 不再返回历史子代理摘要，
 * 通过解析父轨迹内的 `invokeSubagent` 步骤即可完整找回所有子代理及其角色名称与启动顺序。
 *
 * @param {object[]} [rawSteps=[]]
 * @returns {Array<{ cascadeId: string, role: string, typeName: string, createdTimeMs: number, spawnOrder: number }>}
 */
export function extractSubagentRefsFromSteps(rawSteps = []) {
  const refsMap = new Map();
  let orderCounter = 0;
  for (const st of rawSteps || []) {
    const inv = st?.invokeSubagent;
    if (!inv) continue;
    let toolArgs = {};
    const argsJson = st?.metadata?.toolCall?.argumentsJson;
    if (typeof argsJson === 'string' && argsJson.trim()) {
      try {
        toolArgs = JSON.parse(argsJson);
      } catch {
        // 忽略非标准 JSON
      }
    }
    const subSpecs = Array.isArray(inv.subagents) ? inv.subagents : [];
    const results = Array.isArray(inv.results) ? inv.results : [];
    const createdTimeMs = parseIsoMs(st?.metadata?.createdAt) || 0;
    const count = Math.max(
      subSpecs.length,
      results.length,
      inv.conversationId || inv.subagentConversationId ? 1 : 0
    );
    for (let idx = 0; idx < count; idx++) {
      const resItem = results[idx] || {};
      const specItem = subSpecs[idx] || (subSpecs.length === 1 ? subSpecs[0] : {}) || {};
      const fallbackInvCid =
        idx === 0 || count === 1 ? inv.conversationId || inv.subagentConversationId || '' : '';
      const cid = String(
        resItem.conversationId ||
          resItem.subagentConversationId ||
          resItem.cascadeId ||
          specItem.conversationId ||
          specItem.subagentConversationId ||
          specItem.cascadeId ||
          fallbackInvCid
      )
        .trim()
        .toLowerCase();
      if (!cid) continue;
      const role = String(specItem.role || toolArgs.Role || toolArgs.role || '').trim();
      const typeName = String(
        specItem.typeName || toolArgs.TypeName || toolArgs.typeName || ''
      ).trim();
      const prev = refsMap.get(cid);
      refsMap.set(cid, {
        cascadeId: cid,
        role: role || prev?.role || '',
        typeName: typeName || prev?.typeName || '',
        createdTimeMs: createdTimeMs || prev?.createdTimeMs || 0,
        spawnOrder: prev ? prev.spawnOrder : orderCounter++,
      });
    }
  }
  return Array.from(refsMap.values());
}

/**
 * 从 `GetCascadeTrajectory` 响应的 `trajectory.metadata` 中提取子代理归属关系与角色元数据。
 *
 * @param {object} trajRes
 * @param {object} [fallback={}]
 */
function extractTrajectorySubagentMeta(trajRes, fallback = {}) {
  const meta =
    trajRes?.trajectory?.metadata ||
    trajRes?.trajectory?.trajectoryMetadata ||
    trajRes?.trajectoryMetadata ||
    {};
  const parentConversationId = String(
    meta.parentConversationId || fallback.parentConversationId || ''
  )
    .trim()
    .toLowerCase();
  const rootConversationId = String(
    meta.rootConversationId || fallback.rootConversationId || parentConversationId || ''
  )
    .trim()
    .toLowerCase();
  const subagentSpec = mergeSubagentSpecs(meta.subagentSpec, fallback.subagentSpec);
  const agentScriptName = String(
    meta.agentScript?.name || fallback.agentScriptName || ''
  ).trim();
  const createdTimeMs =
    parseIsoMs(meta.createdAt || meta.createdTime) || fallback.createdTimeMs || 0;
  return {
    parentConversationId,
    rootConversationId,
    subagentSpec,
    agentScriptName,
    createdTimeMs,
  };
}

/**
 * 枚举所有会话（合并 LS `trajectorySummaries`、本地磁盘文件与 `trajectoryCache`），
 * 选定当前活跃会话，并以最多 4 路并发增量同步更新了的会话轨迹。
 *
 * @param {{
 *   summariesObj: Record<string, object>,
 *   currentAccountName: string,
 *   requestedConvId: string
 * }} params
 * @returns {Promise<{
 *   conversations: object[],
 *   activeConvSummary: object|null,
 *   activeCascadeId: string|null
 * }>}
 */
export async function enumerateAndSyncConversations({
  summariesObj = {},
  currentAccountName = '',
  requestedConvId = '',
}) {
  const diskConvMap = discoverLocalConversationFiles();
  const allCascadeIds = new Set([
    ...Object.keys(summariesObj),
    ...diskConvMap.keys(),
    ...Object.keys(trajectoryCache),
  ]);
  const existingLowerIds = new Set(Array.from(allCascadeIds, (id) => id.toLowerCase()));
  for (const entry of Object.values(trajectoryCache)) {
    for (const ref of entry?.subagentRefs || []) {
      const refCid = String(ref?.cascadeId || '').trim().toLowerCase();
      if (refCid && !existingLowerIds.has(refCid)) {
        allCascadeIds.add(refCid);
        existingLowerIds.add(refCid);
      }
    }
  }

  const reqLower = String(requestedConvId || '').trim().toLowerCase();
  const rawConversations = [];
  for (const cascadeId of allCascadeIds) {
    const item = summariesObj[cascadeId];
    const cached = trajectoryCache[cascadeId];
    if (
      cached?.accountName &&
      currentAccountName &&
      cached.accountName !== currentAccountName &&
      !item
    ) {
      continue;
    }
    const diskMtimeMs = diskConvMap.get(cascadeId) || 0;
    const rawMeta = item?.trajectoryMetadata || item?.metadata || {};
    const parentConversationId = String(
      rawMeta.parentConversationId || cached?.parentConversationId || ''
    ).toLowerCase();
    const rootConversationId = String(
      rawMeta.rootConversationId || cached?.rootConversationId || parentConversationId || ''
    ).toLowerCase();
    const subagentSpec = mergeSubagentSpecs(rawMeta.subagentSpec, cached?.subagentSpec);
    const agentScriptName = rawMeta.agentScript?.name || cached?.agentScriptName || '';
    const createdTimeMs =
      parseIsoMs(item?.createdTime || rawMeta?.createdAt) || cached?.createdTimeMs || 0;
    const spawnOrder = Number.isFinite(cached?.spawnOrder) ? cached.spawnOrder : null;
    const subagentRefs = Array.isArray(cached?.subagentRefs) ? cached.subagentRefs : null;
    const isSubagent =
      Boolean(parentConversationId) ||
      Boolean(rootConversationId && rootConversationId !== cascadeId.toLowerCase());

    if (item) {
      const lastModifiedTime = item?.lastModifiedTime || item?.createdTime || '';
      const lastModifiedMs =
        parseIsoMs(lastModifiedTime) || diskMtimeMs || cached?.lastModifiedMs || 0;
      const rawSummaryStepCount = Number(item?.stepCount || 0);
      const modelStepCount = Array.isArray(cached?.steps)
        ? cached.steps.length
        : rawSummaryStepCount;
      rawConversations.push({
        cascadeId,
        title:
          item?.annotations?.title || item?.summary || cached?.title || cascadeId.slice(0, 8),
        stepCount: modelStepCount,
        rawStepCount: rawSummaryStepCount,
        status: item?.status || '',
        lastModifiedTime,
        lastModifiedMs,
        diskMtimeMs,
        inSummaries: true,
        isSubagent,
        parentConversationId,
        rootConversationId,
        subagentSpec,
        agentScriptName,
        createdTimeMs,
        spawnOrder,
        subagentRefs,
      });
    } else if (cached) {
      const lastStepMs = cached.steps?.[cached.steps.length - 1]?.createdAtMs || 0;
      const cachedStepCount = Number(cached.steps?.length || 0);
      rawConversations.push({
        cascadeId,
        title: cached.title || cascadeId.slice(0, 8),
        stepCount: cachedStepCount,
        rawStepCount: cachedStepCount,
        status: 'IDLE',
        lastModifiedTime: '',
        lastModifiedMs: Math.max(cached.lastModifiedMs || 0, lastStepMs, diskMtimeMs),
        diskMtimeMs,
        inSummaries: false,
        isSubagent,
        parentConversationId,
        rootConversationId,
        subagentSpec,
        agentScriptName,
        createdTimeMs,
        spawnOrder,
        subagentRefs,
      });
    } else {
      rawConversations.push({
        cascadeId,
        title: cascadeId.slice(0, 8),
        stepCount: 0,
        rawStepCount: 0,
        status: 'IDLE',
        lastModifiedTime: '',
        lastModifiedMs: diskMtimeMs,
        diskMtimeMs,
        inSummaries: false,
        needsInitialLoad: true,
        isSubagent: false,
        parentConversationId: '',
        rootConversationId: '',
        subagentSpec: null,
        agentScriptName: '',
        createdTimeMs: 0,
        spawnOrder: null,
        subagentRefs: null,
      });
    }
  }

  rawConversations.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);

  let cacheDirty = cacheState.needsSave;
  const attemptedFetchIds = new Set();
  const nowPollMs = Date.now();

  function buildConvSig(conv) {
    return conv.inSummaries
      ? `${CACHE_SCHEMA_VERSION}:${conv.rawStepCount ?? conv.stepCount}:${conv.lastModifiedTime}`
      : `${CACHE_SCHEMA_VERSION}:disk:${Math.floor(conv.diskMtimeMs || conv.lastModifiedMs || 0)}`;
  }

  function isFetchInCooldown(conv, sig) {
    if (conv.status === 'CASCADE_RUN_STATUS_RUNNING') return false;
    if (reqLower && conv.cascadeId.toLowerCase() === reqLower) return false;
    const key = `${conv.cascadeId.toLowerCase()}::${sig}`;
    const failedAt = failedFetchCooldownMap.get(key);
    if (!failedAt) return false;
    if (nowPollMs - failedAt >= FAILED_RPC_COOLDOWN_MS) {
      failedFetchCooldownMap.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 检查缓存条目是否缺少最新分解字段（含 10 通道上下文细分字段 `toolResultsTokens`）。
   */
  function hasMissingStepFields(cached) {
    const steps = cached?.steps || [];
    const lastCachedStep = steps[steps.length - 1];
    if (!lastCachedStep) return false;
    if (!Object.prototype.hasOwnProperty.call(lastCachedStep, 'contextBreakdown')) {
      return true;
    }
    if (steps.some((s) => !Object.prototype.hasOwnProperty.call(s, 'responseModel'))) {
      return true;
    }
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i]?.contextBreakdown) {
        return !Object.prototype.hasOwnProperty.call(
          steps[i].contextBreakdown,
          'toolResultsTokens'
        );
      }
    }
    return false;
  }

  /**
   * 批量拉取会话轨迹并提取步骤、子代理元数据 (`trajectory.metadata`) 与子代理调用引用 (`invokeSubagent`)。
   *
   * @param {object[]} targetConvs
   */
  async function fetchTrajectoryBatch(targetConvs) {
    for (const c of targetConvs) {
      attemptedFetchIds.add(c.cascadeId.toLowerCase());
    }
    for (let i = 0; i < targetConvs.length; i += MAX_CONCURRENT_RPC) {
      const batch = targetConvs.slice(i, i + MAX_CONCURRENT_RPC);
      await Promise.all(
        batch.map(async (conv) => {
          const sig = buildConvSig(conv);
          const cooldownKey = `${conv.cascadeId.toLowerCase()}::${sig}`;
          const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
          const prev = trajectoryCache[conv.cascadeId];
          try {
            const trajRes = await callLsRpc('GetCascadeTrajectory', { cascadeId: conv.cascadeId });
            if (!Array.isArray(trajRes?.trajectory?.steps)) {
              throw new Error('Trajectory steps unavailable');
            }
            const rawSteps = trajRes.trajectory.steps;
            if (Number(trajRes.numTotalSteps) > rawSteps.length) {
              throw new Error('Incomplete trajectory; retaining cached usage');
            }
            failedFetchCooldownMap.delete(cooldownKey);
            const generatorMeta = trajRes?.trajectory?.generatorMetadata || [];
            const steps = extractModelSteps(rawSteps, generatorMeta);
            const nextLast = steps[steps.length - 1];

            // 提取轨迹内携带的子代理归属元数据与派生的子代理引用列表
            const extractedMeta = extractTrajectorySubagentMeta(trajRes, conv);
            conv.parentConversationId = extractedMeta.parentConversationId;
            conv.rootConversationId = extractedMeta.rootConversationId;
            conv.subagentSpec = extractedMeta.subagentSpec;
            conv.agentScriptName = extractedMeta.agentScriptName;
            conv.createdTimeMs = extractedMeta.createdTimeMs;
            conv.isSubagent =
              Boolean(conv.parentConversationId) ||
              Boolean(
                conv.rootConversationId &&
                  conv.rootConversationId !== conv.cascadeId.toLowerCase()
              );

            const subagentRefs = extractSubagentRefsFromSteps(rawSteps);
            conv.subagentRefs = subagentRefs;

            const lastStepMs = nextLast?.createdAtMs || 0;
            const resolvedLastModMs = Math.max(conv.lastModifiedMs || 0, lastStepMs);
            conv.lastModifiedMs = resolvedLastModMs;
            conv.stepCount = steps.length;

            const cacheEntry = {
              signature: sig,
              accountName: currentAccountName || prev?.accountName || '',
              title: conv.title,
              lastModifiedMs: resolvedLastModMs,
              diskMtimeMs: conv.diskMtimeMs || 0,
              wasRunning: isRunning,
              steps,
              subagentRefs,
            };
            if (conv.isSubagent) {
              cacheEntry.parentConversationId = conv.parentConversationId;
              cacheEntry.rootConversationId = conv.rootConversationId;
              if (conv.subagentSpec) cacheEntry.subagentSpec = conv.subagentSpec;
              if (conv.agentScriptName) cacheEntry.agentScriptName = conv.agentScriptName;
              if (conv.createdTimeMs) cacheEntry.createdTimeMs = conv.createdTimeMs;
              if (Number.isFinite(conv.spawnOrder)) cacheEntry.spawnOrder = conv.spawnOrder;
            }

            const metaChanged =
              !Array.isArray(prev?.subagentRefs) ||
              JSON.stringify(prev?.subagentRefs) !== JSON.stringify(subagentRefs) ||
              (prev?.rootConversationId || '') !== (cacheEntry.rootConversationId || '');
            const stepsChanged =
              !prev ||
              prev.signature !== sig ||
              Boolean(prev.wasRunning) !== isRunning ||
              metaChanged ||
              JSON.stringify(prev.steps) !== JSON.stringify(steps);

            trajectoryCache[conv.cascadeId] = cacheEntry;
            if (stepsChanged) {
              cacheDirty = true;
            }
          } catch (err) {
            console.error(`Failed loading trajectory ${conv.cascadeId}: ${err.message}`);
            if (!isRunning) {
              failedFetchCooldownMap.set(cooldownKey, nowPollMs);
            }
            if (
              prev &&
              String(prev.signature || '').startsWith(`${CACHE_SCHEMA_VERSION}:`) &&
              !Array.isArray(prev.subagentRefs)
            ) {
              prev.subagentRefs = [];
              cacheDirty = true;
            }
          }
        })
      );
    }
  }

  // 阶段 1：拉取常规新增/变更会话，以及摘要列表中尚未提取 subagentRefs 的会话
  const toFetch = rawConversations.filter((conv) => {
    const sig = buildConvSig(conv);
    if (isFetchInCooldown(conv, sig)) return false;
    const cached = trajectoryCache[conv.cascadeId];
    if (!cached || conv.needsInitialLoad) return true;
    const hasCurrentSchema = String(cached.signature || '').startsWith(
      `${CACHE_SCHEMA_VERSION}:`
    );
    if (!hasCurrentSchema) return true;
    if (hasMissingStepFields(cached)) return true;
    const missingSubagentRefs = !Array.isArray(cached.subagentRefs);
    if (!conv.inSummaries) {
      if (missingSubagentRefs && conv.cascadeId.toLowerCase() === reqLower) {
        return true;
      }
      return (
        conv.diskMtimeMs > 0 &&
        conv.diskMtimeMs > (cached.diskMtimeMs || cached.lastModifiedMs || 0)
      );
    }
    if (missingSubagentRefs) return true;
    const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
    return cached.signature !== sig || isRunning || Boolean(cached.wasRunning);
  });

  await fetchTrajectoryBatch(toFetch);

  /**
   * 阶段 2：根据父会话的 `subagentRefs` 将子代理归属关系、角色名称与启动顺序回填至子代理会话，
   * 支持多层嵌套子代理（主会话 -> 子代理 -> 二级子代理）逐层补拉与归属收敛。
   */
  async function reconcileParentSubagentRefs() {
    for (let depth = 0; depth < MAX_SUBAGENT_RECONCILE_DEPTH; depth++) {
      const byLowerId = new Map(rawConversations.map((c) => [c.cascadeId.toLowerCase(), c]));
      const missingSubagentsToFetch = [];

      for (const parentConv of [...rawConversations]) {
        const parentCached = trajectoryCache[parentConv.cascadeId];
        const refs = parentConv.subagentRefs || parentCached?.subagentRefs || [];
        if (!Array.isArray(refs) || refs.length === 0) continue;

        const parentId = parentConv.cascadeId.toLowerCase();
        const rootId = (
          parentConv.rootConversationId ||
          parentConv.parentConversationId ||
          parentId
        ).toLowerCase();

        for (const ref of refs) {
          const subCid = String(ref?.cascadeId || '').trim().toLowerCase();
          if (!subCid || subCid === parentId) continue;

          let subConv = byLowerId.get(subCid);
          const subCached = trajectoryCache[subConv?.cascadeId || subCid];
          if (!subConv) {
            const diskMtimeMs = diskConvMap.get(subCid) || 0;
            const lastStepMs = subCached?.steps?.[subCached.steps.length - 1]?.createdAtMs || 0;
            const stepCount = Number(subCached?.steps?.length || 0);
            subConv = {
              cascadeId: subCid,
              title: ref.role || subCached?.title || subCid.slice(0, 8),
              stepCount,
              rawStepCount: stepCount,
              status: 'IDLE',
              lastModifiedTime: '',
              lastModifiedMs: Math.max(
                subCached?.lastModifiedMs || 0,
                lastStepMs,
                diskMtimeMs,
                ref.createdTimeMs || 0
              ),
              diskMtimeMs,
              inSummaries: false,
              needsInitialLoad: !subCached,
              isSubagent: true,
              parentConversationId: parentId,
              rootConversationId: rootId,
              subagentSpec: mergeSubagentSpecs(ref, subCached?.subagentSpec),
              agentScriptName: subCached?.agentScriptName || '',
              createdTimeMs: ref.createdTimeMs || subCached?.createdTimeMs || 0,
              spawnOrder: Number.isFinite(ref.spawnOrder) ? ref.spawnOrder : null,
              subagentRefs: Array.isArray(subCached?.subagentRefs) ? subCached.subagentRefs : null,
            };
            rawConversations.push(subConv);
            byLowerId.set(subCid, subConv);
          } else {
            subConv.isSubagent = true;
            subConv.parentConversationId = subConv.parentConversationId || parentId;
            subConv.rootConversationId = subConv.rootConversationId || rootId;
            subConv.subagentSpec = mergeSubagentSpecs(subConv.subagentSpec, ref);
            if (ref.createdTimeMs && !subConv.createdTimeMs) {
              subConv.createdTimeMs = ref.createdTimeMs;
            }
            if (Number.isFinite(ref.spawnOrder) && !Number.isFinite(subConv.spawnOrder)) {
              subConv.spawnOrder = ref.spawnOrder;
            }
            if (Array.isArray(subCached?.steps)) {
              subConv.stepCount = subCached.steps.length;
            }
          }

          const targetCacheKey = subConv.cascadeId;
          const existingSubCache = trajectoryCache[targetCacheKey];
          const hasValidSubCache =
            existingSubCache &&
            String(existingSubCache.signature || '').startsWith(`${CACHE_SCHEMA_VERSION}:`) &&
            !hasMissingStepFields(existingSubCache);

          if (hasValidSubCache) {
            let subMetaUpdated = false;
            if (existingSubCache.parentConversationId !== subConv.parentConversationId) {
              existingSubCache.parentConversationId = subConv.parentConversationId;
              subMetaUpdated = true;
            }
            if (existingSubCache.rootConversationId !== subConv.rootConversationId) {
              existingSubCache.rootConversationId = subConv.rootConversationId;
              subMetaUpdated = true;
            }
            const nextSpec = sanitizeSubagentSpec(subConv.subagentSpec);
            if (
              nextSpec &&
              JSON.stringify(existingSubCache.subagentSpec || null) !== JSON.stringify(nextSpec)
            ) {
              existingSubCache.subagentSpec = nextSpec;
              subMetaUpdated = true;
            }
            if (
              subConv.createdTimeMs &&
              existingSubCache.createdTimeMs !== subConv.createdTimeMs
            ) {
              existingSubCache.createdTimeMs = subConv.createdTimeMs;
              subMetaUpdated = true;
            }
            if (
              Number.isFinite(subConv.spawnOrder) &&
              existingSubCache.spawnOrder !== subConv.spawnOrder
            ) {
              existingSubCache.spawnOrder = subConv.spawnOrder;
              subMetaUpdated = true;
            }
            if (!Array.isArray(existingSubCache.subagentRefs)) {
              existingSubCache.subagentRefs = [];
              subMetaUpdated = true;
            }
            if (subMetaUpdated) {
              cacheDirty = true;
            }
          } else {
            const subSig = buildConvSig(subConv);
            if (!attemptedFetchIds.has(subCid) && !isFetchInCooldown(subConv, subSig)) {
              missingSubagentsToFetch.push(subConv);
            }
          }
        }
      }

      if (missingSubagentsToFetch.length === 0) break;
      await fetchTrajectoryBatch(missingSubagentsToFetch);
    }
  }

  await reconcileParentSubagentRefs();

  // 阶段 3：对剩余尚未标记 subagentRefs 的纯磁盘历史会话每次增量迁移最多 8 个，避免单次轮询阻塞
  const remainingLegacyDiskConvs = rawConversations
    .filter((c) => {
      const sig = buildConvSig(c);
      if (attemptedFetchIds.has(c.cascadeId.toLowerCase()) || isFetchInCooldown(c, sig)) {
        return false;
      }
      const cached = trajectoryCache[c.cascadeId];
      return cached && !Array.isArray(cached.subagentRefs);
    })
    .slice(0, LEGACY_MIGRATION_BATCH_SIZE);

  if (remainingLegacyDiskConvs.length > 0) {
    await fetchTrajectoryBatch(remainingLegacyDiskConvs);
    await reconcileParentSubagentRefs();
  }

  // 阶段 4：将多层嵌套子代理的 rootConversationId 沿着父链向上收敛至最顶层根会话，防止二级子代理丢失
  const byId = new Map(rawConversations.map((c) => [c.cascadeId.toLowerCase(), c]));
  for (const conv of rawConversations) {
    if (!conv.isSubagent) continue;
    const cid = conv.cascadeId.toLowerCase();
    let candidate = (conv.rootConversationId || conv.parentConversationId || '').toLowerCase();
    const visited = new Set([cid]);
    while (candidate && !visited.has(candidate)) {
      visited.add(candidate);
      const ancestor = byId.get(candidate);
      if (!ancestor || !ancestor.isSubagent) break;
      const nextUp = (
        ancestor.parentConversationId ||
        ancestor.rootConversationId ||
        ''
      ).toLowerCase();
      if (!nextUp || nextUp === candidate) break;
      candidate = nextUp;
    }
    if (candidate && candidate !== conv.rootConversationId) {
      conv.rootConversationId = candidate;
      const cached = trajectoryCache[conv.cascadeId];
      if (cached && cached.rootConversationId !== candidate) {
        cached.rootConversationId = candidate;
        cacheDirty = true;
      }
    }
  }

  if (cacheDirty) {
    cacheState.needsSave = !saveJson(CACHE_FILE, trajectoryCache);
  }

  // 按最终收敛的 rootConversationId 将所有层级的子代理挂载至对应顶层根会话下
  const subagentsByRoot = new Map();
  const conversations = [];

  for (const conv of rawConversations) {
    const cid = conv.cascadeId.toLowerCase();
    const rootId = (conv.rootConversationId || conv.parentConversationId || '').toLowerCase();
    const rootTarget = byId.get(rootId);
    if (conv.isSubagent && rootId && rootId !== cid && rootTarget && !rootTarget.isSubagent) {
      if (!subagentsByRoot.has(rootId)) {
        subagentsByRoot.set(rootId, []);
      }
      subagentsByRoot.get(rootId).push(conv);
    } else if (!conv.isSubagent || !rootTarget) {
      conversations.push(conv);
    }
  }

  for (const rootConv of conversations) {
    const cid = rootConv.cascadeId.toLowerCase();
    const subs = subagentsByRoot.get(cid) || [];
    subs.sort((a, b) => {
      if (
        a.parentConversationId === b.parentConversationId &&
        Number.isFinite(a.spawnOrder) &&
        Number.isFinite(b.spawnOrder) &&
        a.spawnOrder !== b.spawnOrder
      ) {
        return a.spawnOrder - b.spawnOrder;
      }
      const aStart =
        a.createdTimeMs ||
        trajectoryCache[a.cascadeId]?.steps?.[0]?.createdAtMs ||
        a.lastModifiedMs ||
        0;
      const bStart =
        b.createdTimeMs ||
        trajectoryCache[b.cascadeId]?.steps?.[0]?.createdAtMs ||
        b.lastModifiedMs ||
        0;
      return aStart - bStart || String(a.cascadeId).localeCompare(String(b.cascadeId));
    });
    rootConv.subagents = subs;
    rootConv.subagentCount = subs.length;
    rootConv.totalStepCount =
      Number(rootConv.stepCount || 0) +
      subs.reduce((sum, s) => sum + Number(s.stepCount || 0), 0);
    const maxSubModMs = subs.reduce((m, s) => Math.max(m, s.lastModifiedMs || 0), 0);
    rootConv.groupLastModifiedMs = Math.max(rootConv.lastModifiedMs || 0, maxSubModMs);
  }

  conversations.sort(
    (a, b) =>
      (b.groupLastModifiedMs || b.lastModifiedMs || 0) -
      (a.groupLastModifiedMs || a.lastModifiedMs || 0)
  );

  // 选定当前活跃根会话：若指定了有效 requestedConvId（支持根会话 ID 或子代理 ID）则优先使用，否则取最近修改的根会话
  const activeConvSummary =
    (reqLower &&
      (conversations.find((c) => c.cascadeId.toLowerCase() === reqLower) ||
        conversations.find((c) =>
          (c.subagents || []).some((s) => s.cascadeId.toLowerCase() === reqLower)
        ))) ||
    conversations[0] ||
    null;
  const activeCascadeId = activeConvSummary?.cascadeId || requestedConvId || null;

  return {
    conversations,
    activeConvSummary,
    activeCascadeId,
  };
}
