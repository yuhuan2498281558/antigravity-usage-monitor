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

  const conversations = [];
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

    if (item) {
      const lastModifiedTime = item?.lastModifiedTime || item?.createdTime || '';
      const lastModifiedMs =
        parseIsoMs(lastModifiedTime) || diskMtimeMs || cached?.lastModifiedMs || 0;
      conversations.push({
        cascadeId,
        title:
          item?.annotations?.title || item?.summary || cached?.title || cascadeId.slice(0, 8),
        stepCount: Number(item?.stepCount || cached?.steps?.length || 0),
        status: item?.status || '',
        lastModifiedTime,
        lastModifiedMs,
        diskMtimeMs,
        inSummaries: true,
      });
    } else if (cached) {
      const lastStepMs = cached.steps?.[cached.steps.length - 1]?.createdAtMs || 0;
      conversations.push({
        cascadeId,
        title: cached.title || cascadeId.slice(0, 8),
        stepCount: Number(cached.steps?.length || 0),
        status: 'IDLE',
        lastModifiedTime: '',
        lastModifiedMs: Math.max(cached.lastModifiedMs || 0, lastStepMs, diskMtimeMs),
        diskMtimeMs,
        inSummaries: false,
      });
    } else {
      conversations.push({
        cascadeId,
        title: cascadeId.slice(0, 8),
        stepCount: 0,
        status: 'IDLE',
        lastModifiedTime: '',
        lastModifiedMs: diskMtimeMs,
        diskMtimeMs,
        inSummaries: false,
        needsInitialLoad: true,
      });
    }
  }

  conversations.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);

  // 选定当前活跃会话：若指定了有效 requestedConvId 则优先使用，否则取最近修改的会话
  const activeConvSummary =
    conversations.find((c) => c.cascadeId === requestedConvId) || conversations[0] || null;
  const activeCascadeId = activeConvSummary?.cascadeId || requestedConvId || null;

  let cacheDirty = cacheState.needsSave;

  const toFetch = conversations.filter((conv) => {
    const cached = trajectoryCache[conv.cascadeId];
    if (!cached || conv.needsInitialLoad) return true;
    const hasCurrentSchema = String(cached.signature || '').startsWith(
      `${CACHE_SCHEMA_VERSION}:`
    );
    if (!hasCurrentSchema) return true;
    const lastCachedStep = cached.steps?.[cached.steps.length - 1];
    const missingBreakdownField =
      Boolean(lastCachedStep) &&
      (!Object.prototype.hasOwnProperty.call(lastCachedStep, 'contextBreakdown') ||
        cached.steps.some((s) => !Object.prototype.hasOwnProperty.call(s, 'responseModel')));
    if (missingBreakdownField) return true;
    if (!conv.inSummaries) {
      return (
        conv.diskMtimeMs > 0 &&
        conv.diskMtimeMs > (cached.diskMtimeMs || cached.lastModifiedMs || 0)
      );
    }
    const sig = `${CACHE_SCHEMA_VERSION}:${conv.stepCount}:${conv.lastModifiedTime}`;
    const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
    return cached.signature !== sig || isRunning || Boolean(cached.wasRunning);
  });

  // 限制并发度为 4，批量拉取需要更新的会话轨迹
  const CONCURRENCY = 4;
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (conv) => {
        const sig = conv.inSummaries
          ? `${CACHE_SCHEMA_VERSION}:${conv.stepCount}:${conv.lastModifiedTime}`
          : `${CACHE_SCHEMA_VERSION}:disk:${Math.floor(conv.diskMtimeMs || conv.lastModifiedMs || 0)}`;
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
          const generatorMeta = trajRes?.trajectory?.generatorMetadata || [];
          const steps = extractModelSteps(rawSteps, generatorMeta);
          const nextLast = steps[steps.length - 1];
          const stepsChanged =
            !prev ||
            prev.signature !== sig ||
            Boolean(prev.wasRunning) !== isRunning ||
            JSON.stringify(prev.steps) !== JSON.stringify(steps);

          const lastStepMs = nextLast?.createdAtMs || 0;
          const resolvedLastModMs = Math.max(conv.lastModifiedMs || 0, lastStepMs);
          conv.lastModifiedMs = resolvedLastModMs;
          if (!conv.inSummaries) {
            conv.stepCount = rawSteps.length || steps.length;
          }

          trajectoryCache[conv.cascadeId] = {
            signature: sig,
            accountName: currentAccountName || prev?.accountName || '',
            title: conv.title,
            lastModifiedMs: resolvedLastModMs,
            diskMtimeMs: conv.diskMtimeMs || 0,
            wasRunning: isRunning,
            steps,
          };
          if (stepsChanged) {
            cacheDirty = true;
          }
        } catch (err) {
          console.error(`Failed loading trajectory ${conv.cascadeId}: ${err.message}`);
        }
      })
    );
  }

  if (cacheDirty) {
    cacheState.needsSave = !saveJson(CACHE_FILE, trajectoryCache);
  }

  return {
    conversations,
    activeConvSummary,
    activeCascadeId,
  };
}
