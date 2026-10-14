// Backend for Antigravity Usage & Speed Monitor Sidecar Extension.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Response, SidecarApp } from 'sidecar_sdk';
import { extractModelSteps, parseIsoMs, normalizeCachedStep, speedMetric, summarizeSpeed, summarizeTtft, createSpeedAccumulator, accumulateSpeed, finishSpeed } from './speed-metrics.mjs';
import { StreamDiagnostics } from './stream-diagnostics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR || join(HERE, '.data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const CACHE_FILE = join(DATA_DIR, 'trajectory_usage_cache.json');
const CONVERSATIONS_DIR = join(homedir(), '.gemini', 'antigravity', 'conversations');

const LS_ADDR = process.env.ANTIGRAVITY_LS_ADDRESS;
const CSRF_TOKEN = process.env.ANTIGRAVITY_CSRF_TOKEN;

const DEFAULT_SETTINGS = {
  contextWindowLimit: 256000,  // 256k auto-compaction budget default (can be toggled to 256k / 1M / 2M)
  weeklyTokenBudget: 150000000, // 150M tokens default custom weekly target
  weeklyCostBudget: 100,       // $100 default custom weekly cost target (matches Ultra weekly pool)
  weeklyLimitMode: 'official', // 'official' | 'custom_tokens' | 'custom_cost'
};

// Official API pricing in USD per 1M tokens (Input, CacheRead, Output incl. Thinking)
// Verified to 6 decimal places against RetrieveUserQuotaSummary({ forceRefresh: true }):
// Gemini 4 Argon official price (until 2026-11-30): Input $2.00 / Cache $0.10 / Output $10.00
// Ultra 5h Pool (100%) = $25.00 USD | Ultra Weekly Pool (100%) = $100.00 USD
const MODEL_PRICING = {
  'gemini-4-argon-high': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-high', family: 'Gemini' },
  'gemini-4-argon-medium': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4', family: 'Gemini' },
  'gemini-4-argon-low': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-low', family: 'Gemini' },
  'gemini-3.8-flash-high': { input: 0.30, cache: 0.03, output: 2.5, short: 'flash-3.8-high', family: 'Gemini' },
  'gemini-3.8-flash-medium': { input: 0.30, cache: 0.03, output: 2.5, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.8-flash-low': { input: 0.15, cache: 0.015, output: 1.0, short: 'flash-3.8-low', family: 'Gemini' },
  'gemini-2.5-flash-lite': { input: 0.10, cache: 0.01, output: 0.40, short: 'flash-2.5-lite', family: 'Gemini' },
  'gemini-2.5-flash': { input: 0.30, cache: 0.03, output: 2.5, short: 'flash-2.5', family: 'Gemini' },
  'gemini-2.5-pro': { input: 1.25, cache: 0.125, output: 10.0, short: 'pro-2.5', family: 'Gemini' },
  'claude-opus-4-6-thinking': { input: 5.0, cache: 0.50, output: 25.0, short: 'opus', family: 'Claude' },
  'claude-sonnet-4-6': { input: 3.0, cache: 0.30, output: 15.0, short: 'sonnet', family: 'Claude' },
  'gpt-oss-120b-medium': { input: 0.80, cache: 0.10, output: 2.40, short: 'gpt-oss', family: 'GPT' },
};

// Fallback placeholder -> modelId mapping
const PLACEHOLDER_MAP = {
  MODEL_PLACEHOLDER_M417: { modelId: 'gemini-4-argon-high', label: 'Gemini 4 Argon (High)' },
  MODEL_PLACEHOLDER_M418: { modelId: 'gemini-4-argon-medium', label: 'Gemini 4 Argon (Medium)' },
  MODEL_PLACEHOLDER_M419: { modelId: 'gemini-4-argon-low', label: 'Gemini 4 Argon (Low)' },
  MODEL_PLACEHOLDER_M318: { modelId: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
  MODEL_PLACEHOLDER_M319: { modelId: 'gemini-3.8-flash-medium', label: 'Gemini 3.8 Flash (Medium)' },
  MODEL_PLACEHOLDER_M320: { modelId: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (Low)' },
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE: { modelId: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  MODEL_GOOGLE_GEMINI_2_5_FLASH: { modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  MODEL_GOOGLE_GEMINI_2_5_PRO: { modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  MODEL_PLACEHOLDER_M26: { modelId: 'claude-opus-4-6-thinking', label: 'Claude Opus 4.6 (Thinking)' },
  MODEL_PLACEHOLDER_M35: { modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' },
  MODEL_OPENAI_GPT_OSS_120B_MEDIUM: { modelId: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B (Medium)' },
};

// In-memory cache of trajectory step usage: cascadeId -> { signature, steps }
const CACHE_SCHEMA_VERSION = 'v9-unified-throughput';
let trajectoryCache = Object.fromEntries(Object.entries(loadJson(CACHE_FILE, {})).map(([id, entry]) => [
  id, { ...entry, steps: (entry.steps || []).map(normalizeCachedStep) },
]));
const inFlightRequests = new Map();
let quotaSummaryCache = { ts: 0, data: null, error: null };

function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Failed writing ${filePath}: ${err.message}`);
  }
}

function loadSettings() {
  const { speedMode: _legacySpeedMode, ...settings } = loadJson(SETTINGS_FILE, {});
  return { ...DEFAULT_SETTINGS, ...settings };
}

function roundMetric(value) {
  return Number.isFinite(value) ? +value.toFixed(1) : null;
}

async function callLsRpc(method, body = {}, timeoutMs = 5000) {
  const res = await fetch(
    `http://${LS_ADDR}/exa.language_server_pb.LanguageServerService/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': CSRF_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RPC ${method} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function getOfficialQuotaSummary(forceRefresh = false) {
  const now = Date.now();
  // Use 10s local cache for routine polling; when cache expires or forceRefresh=true,
  // pass { forceRefresh: true } to bypass language_server.exe's internal 3-minute stale cache.
  if (!forceRefresh && quotaSummaryCache.data && now - quotaSummaryCache.ts < 10000) {
    return {
      data: quotaSummaryCache.data,
      fetchedAtMs: quotaSummaryCache.ts,
      isStale: false,
      refreshFailed: false,
      error: null,
    };
  }
  try {
    const res = await callLsRpc('RetrieveUserQuotaSummary', { forceRefresh: true }, 6000);
    if (res?.response?.groups) {
      quotaSummaryCache = { ts: now, data: res.response, error: null };
      return {
        data: res.response,
        fetchedAtMs: now,
        isStale: false,
        refreshFailed: false,
        error: null,
      };
    }
  } catch (err) {
    console.error(`RetrieveUserQuotaSummary failed: ${err.message}`);
    quotaSummaryCache.error = err.message;
  }
  return {
    data: quotaSummaryCache.data,
    fetchedAtMs: quotaSummaryCache.ts || 0,
    isStale: Boolean(quotaSummaryCache.data),
    refreshFailed: true,
    error: quotaSummaryCache.error || 'Quota RPC unavailable',
  };
}

function inferFamilyFromProviderOrKey(rawModelKey = '', modelId = '', apiProvider = '') {
  const prov = String(apiProvider || '').toUpperCase();
  if (prov.includes('GEMINI') || prov.includes('GOOGLE')) return 'Gemini';
  if (prov.includes('ANTHROPIC') || prov.includes('CLAUDE')) return 'Claude';
  if (prov.includes('OPENAI') || prov.includes('GPT')) return 'GPT';

  const combined = `${rawModelKey} ${modelId}`.toUpperCase();
  if (combined.includes('GEMINI') || combined.includes('ARGON') || combined.includes('FLASH') || combined.includes('GOOGLE')) {
    return 'Gemini';
  }
  if (combined.includes('CLAUDE') || combined.includes('SONNET') || combined.includes('OPUS') || combined.includes('HAIKU')) {
    return 'Claude';
  }
  if (combined.includes('GPT') || combined.includes('OPENAI')) {
    return 'GPT';
  }
  return 'Other';
}

function resolveModelInfo(rawModelKey, dynamicModelMap, apiProvider = '') {
  const dyn = dynamicModelMap.get(rawModelKey) || PLACEHOLDER_MAP[rawModelKey] || {
    modelId: rawModelKey || 'unknown',
    label: rawModelKey || 'Unknown Model',
  };
  const explicitPricing = MODEL_PRICING[dyn.modelId];
  if (explicitPricing) {
    return {
      rawModel: rawModelKey,
      modelId: dyn.modelId,
      label: dyn.label,
      shortName: explicitPricing.short,
      family: explicitPricing.family,
      pricing: explicitPricing,
      isEstimatedPrice: false,
    };
  }

  const inferredFamily = inferFamilyFromProviderOrKey(rawModelKey, dyn.modelId, apiProvider);
  const rawUpper = String(rawModelKey || dyn.modelId || '').toUpperCase();
  let fallbackPricing;
  if (inferredFamily === 'Gemini') {
    if (rawUpper.includes('LITE')) {
      fallbackPricing = { input: 0.10, cache: 0.01, output: 0.40, short: 'gemini-lite', family: 'Gemini' };
    } else if (rawUpper.includes('FLASH')) {
      fallbackPricing = { input: 0.30, cache: 0.03, output: 2.50, short: 'gemini-flash', family: 'Gemini' };
    } else {
      fallbackPricing = { input: 2.00, cache: 0.10, output: 10.0, short: 'gemini', family: 'Gemini' };
    }
  } else if (inferredFamily === 'Claude') {
    fallbackPricing = { input: 3.0, cache: 0.30, output: 15.0, short: 'claude', family: 'Claude' };
  } else if (inferredFamily === 'GPT') {
    fallbackPricing = { input: 0.80, cache: 0.10, output: 2.40, short: 'gpt', family: 'GPT' };
  } else {
    fallbackPricing = {
      input: 0,
      cache: 0,
      output: 0,
      short: (dyn.label || 'unknown').split(' ')[0].toLowerCase(),
      family: 'Other',
    };
  }

  return {
    rawModel: rawModelKey,
    modelId: dyn.modelId,
    label: dyn.label,
    shortName: fallbackPricing.short,
    family: fallbackPricing.family,
    pricing: fallbackPricing,
    isEstimatedPrice: true,
  };
}

function computeStepCost(step, pricing) {
  const inCost = (step.inputTokens / 1_000_000) * pricing.input;
  const cacheCost = (step.cacheReadTokens / 1_000_000) * pricing.cache;
  const outCost = (step.outputTokens / 1_000_000) * pricing.output;
  return inCost + cacheCost + outCost;
}

function getStartOfLocalDayMs(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getNextMondayResetIso(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ...
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getStartOfCurrentWeekMs(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function resolveTimeWindow(
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
        reset5hMs > nowMs
          ? reset5hMs - 5 * 3600 * 1000
          : nowMs - 5 * 3600 * 1000;
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
        resetWkMs > nowMs
          ? resetWkMs - 7 * 24 * 3600 * 1000
          : getStartOfCurrentWeekMs(now);
      return {
        key: 'week',
        label: resetWkMs > nowMs ? '当前周限周期' : '本周',
        startMs: startWkMs,
        endMs: nowMs,
      };
    }
    case '7d':
      return { key: '7d', label: '近 7 天', startMs: nowMs - 7 * 24 * 3600 * 1000, endMs: nowMs };
    case '30d':
      return { key: '30d', label: '近 30 天', startMs: nowMs - 30 * 24 * 3600 * 1000, endMs: nowMs };
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

function createUsageBucket() {
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
    geminiTokens: 0,
    geminiCostUsd: 0,
    geminiCalls: 0,
    claudeGptTokens: 0,
    claudeGptCostUsd: 0,
    claudeGptCalls: 0,
  };
}

function accumulateStepIntoBucket(bucket, st, mInfo, stepCost, cascadeId) {
  const stepTotalTokens = st.inputTokens + st.cacheReadTokens + st.outputTokens;
  bucket.calls += 1;
  if (cascadeId) bucket.conversationsSet.add(cascadeId);
  bucket.inputTokens += st.inputTokens;
  bucket.cacheReadTokens += st.cacheReadTokens;
  bucket.outputTokens += st.outputTokens;
  bucket.thinkingTokens += st.thinkingTokens || 0;
  bucket.responseTokens += st.responseTokens || 0;
  bucket.totalTokens += stepTotalTokens;
  bucket.costUsd += stepCost;

  if (mInfo.family === 'Gemini') {
    bucket.geminiTokens += stepTotalTokens;
    bucket.geminiCostUsd += stepCost;
    bucket.geminiCalls += 1;
  } else if (mInfo.family === 'Claude' || mInfo.family === 'GPT') {
    bucket.claudeGptTokens += stepTotalTokens;
    bucket.claudeGptCostUsd += stepCost;
    bucket.claudeGptCalls += 1;
  }
}

function finalizeUsageBucket(bucket) {
  const promptTokens = bucket.inputTokens + bucket.cacheReadTokens;
  const cacheHitPct =
    promptTokens > 0 ? Math.round((bucket.cacheReadTokens / promptTokens) * 100) : 0;
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
    cacheHitPct,
    geminiTokens: bucket.geminiTokens,
    geminiCostUsd: +bucket.geminiCostUsd.toFixed(2),
    geminiCalls: bucket.geminiCalls,
    claudeGptTokens: bucket.claudeGptTokens,
    claudeGptCostUsd: +bucket.claudeGptCostUsd.toFixed(2),
    claudeGptCalls: bucket.claudeGptCalls,
  };
}

function discoverLocalConversationFiles() {
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
    // Ignore directory read errors
  }
  return map;
}

async function buildTelemetryPayloadInternal(
  requestedConvId,
  forceQuotaRefresh = false,
  filterOpts = {}
) {
  const settings = loadSettings();
  const [userStatusRes, allTrajRes, officialQuotaInfo] = await Promise.all([
    callLsRpc('GetUserStatus', {}).catch(() => ({})),
    callLsRpc('GetAllCascadeTrajectories', {}).catch(() => ({})),
    getOfficialQuotaSummary(forceQuotaRefresh),
  ]);

  const officialQuota = officialQuotaInfo?.data || null;
  const userStatus = userStatusRes?.userStatus || {};
  const currentAccountName = userStatus?.email || userStatus?.name || '';
  const clientConfigs = userStatus?.cascadeModelConfigData?.clientModelConfigs || [];
  const dynamicModelMap = new Map();

  // Extract official real-time buckets from RetrieveUserQuotaSummary if available
  const officialBuckets = new Map();
  for (const grp of officialQuota?.groups || []) {
    for (const b of grp?.buckets || []) {
      if (b?.bucketId && b.remainingFraction !== undefined && b.remainingFraction !== null) {
        const remFrac = Number(b.remainingFraction);
        const usedFrac = Math.max(0, Math.min(1, 1 - remFrac));
        officialBuckets.set(b.bucketId, {
          bucketId: b.bucketId,
          groupName: grp.displayName,
          remainingFraction: remFrac,
          remainingPct: +(remFrac * 100).toFixed(1),
          remainingIntPct: Math.floor(remFrac * 100 + 1e-6),
          usedPct: +(usedFrac * 100).toFixed(1),
          resetTime: b.resetTime || null,
          description: b.description || '',
        });
      }
    }
  }

  // Group 5h quotas by model pool
  const quotaPoolsMap = new Map();
  const modelQuotas = [];
  const modelQuotaByKey = new Map();

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
    const isGemini = info.family === 'Gemini';
    const live5h = officialBuckets.get(isGemini ? 'gemini-5h' : '3p-5h');
    const liveWeekly = officialBuckets.get(isGemini ? 'gemini-weekly' : '3p-weekly');

    const rawRemFrac = live5h?.remainingFraction ?? cfg?.quotaInfo?.remainingFraction ?? null;
    const hasValid5h = rawRemFrac !== null && rawRemFrac !== undefined && Number.isFinite(Number(rawRemFrac));
    const remFrac = hasValid5h ? Number(rawRemFrac) : null;
    const usedFrac = hasValid5h ? Math.max(0, Math.min(1, 1 - remFrac)) : null;
    const resetTime = live5h?.resetTime || cfg?.quotaInfo?.resetTime || null;

    const quotaItem = {
      label: cfg.label,
      modelId: cfg.modelId,
      rawKey,
      family: info.family,
      isAvailable: hasValid5h,
      remainingPct: hasValid5h ? +(remFrac * 100).toFixed(1) : null,
      remainingIntPct: hasValid5h ? Math.floor(remFrac * 100 + 1e-6) : null,
      usedPct: hasValid5h ? +(usedFrac * 100).toFixed(1) : null,
      resetTime,
      weeklyRemainingPct: liveWeekly?.remainingPct ?? null,
      weeklyRemainingIntPct: liveWeekly?.remainingIntPct ?? null,
      weeklyUsedPct: liveWeekly?.usedPct ?? null,
      weeklyResetTime: liveWeekly?.resetTime ?? null,
    };
    modelQuotas.push(quotaItem);
    if (rawKey) modelQuotaByKey.set(rawKey, quotaItem);

    const poolKey = isGemini ? 'Gemini' : 'Claude & GPT';
    if (!quotaPoolsMap.has(poolKey)) {
      quotaPoolsMap.set(poolKey, {
        poolName: isGemini ? 'Gemini 模型池' : 'Claude & GPT 模型池',
        family: poolKey,
        isAvailable: quotaItem.isAvailable,
        remainingPct: quotaItem.remainingPct,
        remainingIntPct: quotaItem.remainingIntPct,
        usedPct: quotaItem.usedPct,
        resetTime,
        weeklyRemainingPct: quotaItem.weeklyRemainingPct,
        weeklyRemainingIntPct: quotaItem.weeklyRemainingIntPct,
        weeklyUsedPct: quotaItem.weeklyUsedPct,
        weeklyResetTime: quotaItem.weeklyResetTime,
        models: [cfg.label],
      });
    } else {
      const existingPool = quotaPoolsMap.get(poolKey);
      existingPool.models.push(cfg.label);
    }
  }

  // Enumerate all conversations from LS + local disk + existing cache
  const summariesObj = allTrajRes?.trajectorySummaries || {};
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

  // Pick active conversation: requestedConvId if valid, else most recently modified conversation
  const activeConvSummary =
    conversations.find((c) => c.cascadeId === requestedConvId) ||
    conversations[0] ||
    null;
  const activeCascadeId = activeConvSummary?.cascadeId || requestedConvId || null;

  // Refresh trajectory cache for any uncached, schema-outdated, or updated conversation
  let cacheDirty = false;

  const toFetch = conversations.filter((conv) => {
    const cached = trajectoryCache[conv.cascadeId];
    if (!cached || conv.needsInitialLoad) return true;
    const hasCurrentSchema = String(cached.signature || '').startsWith(`${CACHE_SCHEMA_VERSION}:`);
    if (!hasCurrentSchema) return true;
    if (!conv.inSummaries) {
      return conv.diskMtimeMs > 0 && conv.diskMtimeMs > (cached.diskMtimeMs || cached.lastModifiedMs || 0);
    }
    const sig = `${CACHE_SCHEMA_VERSION}:${conv.stepCount}:${conv.lastModifiedTime}`;
    const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
    return cached.signature !== sig || isRunning || Boolean(cached.wasRunning);
  });

  // Fetch trajectories with bounded concurrency (up to 4 at a time)
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
          if (!Array.isArray(trajRes?.trajectory?.steps)) throw new Error('Trajectory steps unavailable');
          const rawSteps = trajRes.trajectory.steps;
          if (Number(trajRes.numTotalSteps) > rawSteps.length) throw new Error('Incomplete trajectory; retaining cached usage');
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
    saveJson(CACHE_FILE, trajectoryCache);
  }

  // Compute Active Conversation Metrics
  const activeEntry = activeCascadeId ? trajectoryCache[activeCascadeId] : null;
  const activeSteps = activeEntry?.steps || [];

  const sessionSpeed = summarizeSpeed(activeSteps);
  const sessionTtft = summarizeTtft(activeSteps);
  let sessionCostUsd = 0;
  let sessionInputTokens = 0;
  let sessionCacheReadTokens = 0;

  const enrichedActiveSteps = activeSteps.map((st) => {
    const mInfo = resolveModelInfo(st.modelKey, dynamicModelMap, st.apiProvider);
    const costUsd = computeStepCost(st, mInfo.pricing);
    const metric = speedMetric(st);

    sessionCostUsd += costUsd;
    sessionInputTokens += st.inputTokens;
    sessionCacheReadTokens += st.cacheReadTokens;

    const tokPerSec = metric.value;
    const totalPrompt = st.inputTokens + st.cacheReadTokens;
    const cacheHitPct = totalPrompt > 0 ? (st.cacheReadTokens / totalPrompt) * 100 : 0;

    const inCostUsd = (st.inputTokens / 1_000_000) * mInfo.pricing.input;
    const cacheCostUsd = (st.cacheReadTokens / 1_000_000) * mInfo.pricing.cache;
    const outCostUsd = (st.outputTokens / 1_000_000) * mInfo.pricing.output;

    return {
      ...st,
      modelLabel: st.isCompactionStep ? `${mInfo.label} [自动压缩]` : mInfo.label,
      modelShort: st.isCompactionStep ? `${mInfo.shortName}·压缩` : mInfo.shortName,
      family: mInfo.family,
      tokPerSec: roundMetric(tokPerSec),
      selectedSpeedReason: metric.reason,
      ttftSec: st.nativeTtftSec,
      cacheHitPct: +cacheHitPct.toFixed(1),
      costUsd: +costUsd.toFixed(4),
      inCostUsd: +inCostUsd.toFixed(4),
      cacheCostUsd: +cacheCostUsd.toFixed(4),
      outCostUsd: +outCostUsd.toFixed(4),
      contextTokens: st.inputTokens + st.cacheReadTokens + st.outputTokens,
    };
  });

  const latestEnriched =
    enrichedActiveSteps.length > 0 ? enrichedActiveSteps[enrichedActiveSteps.length - 1] : null;

  const sessionAvgTokPerSec = roundMetric(sessionSpeed.avgTokPerSec);

  // Context breakdown from the latest step
  const ctxCached = latestEnriched?.cacheReadTokens || 0;
  const ctxFreshInput = latestEnriched?.inputTokens || 0;
  const ctxThinking = latestEnriched?.thinkingTokens || 0;
  const ctxResponse = latestEnriched?.responseTokens || 0;
  const ctxTotal = ctxCached + ctxFreshInput + ctxThinking + ctxResponse;
  const compactionLimitTokens = Number(latestEnriched?.maxContextBudgetTokens || 256000);
  const compactionUsedTokens = Number(
    latestEnriched?.estimatedContextTokens || ctxCached + ctxFreshInput
  );
  const compactionUsedPct =
    compactionLimitTokens > 0
      ? Math.min(100, +((compactionUsedTokens / compactionLimitTokens) * 100).toFixed(1))
      : 0;

  const ctxLimit = Number(settings.contextWindowLimit || 256000);
  const ctxPct = ctxLimit > 0 ? Math.min(100, +((ctxTotal / ctxLimit) * 100).toFixed(1)) : 0;

  // Cache hit rate (latest step & session-wide)
  const latestPromptTokens = ctxCached + ctxFreshInput;
  const latestCacheHitPct =
    latestPromptTokens > 0 ? Math.round((ctxCached / latestPromptTokens) * 100) : 0;
  const sessionPromptTokens = sessionCacheReadTokens + sessionInputTokens;
  const sessionCacheHitPct =
    sessionPromptTokens > 0 ? Math.round((sessionCacheReadTokens / sessionPromptTokens) * 100) : 0;

  // Determine active pool and its official cycle anchors for time window alignment
  const rawActiveFamily = latestEnriched?.family || 'Gemini';
  const activePoolKey = rawActiveFamily === 'Gemini' ? 'Gemini' : 'Claude & GPT';
  const activeLive5h = officialBuckets.get(activePoolKey === 'Gemini' ? 'gemini-5h' : '3p-5h');
  const activeLiveWeekly = officialBuckets.get(
    activePoolKey === 'Gemini' ? 'gemini-weekly' : '3p-weekly'
  );
  const cycleAnchors = {
    fiveHourResetMs: parseIsoMs(activeLive5h?.resetTime),
    weeklyResetMs: parseIsoMs(activeLiveWeekly?.resetTime),
  };

  // Aggregate across time windows (presets + selected range)
  const nowMs = Date.now();
  const selectedWindow = resolveTimeWindow(
    filterOpts.range || 'all',
    filterOpts.startMs,
    filterOpts.endMs,
    nowMs,
    cycleAnchors
  );

  const presetKeys = ['all', '5h', 'today', '24h', 'week', '7d', '30d'];
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

  for (const [cascadeId, entry] of Object.entries(trajectoryCache)) {
    if (
      entry?.accountName &&
      currentAccountName &&
      entry.accountName !== currentAccountName &&
      cascadeId !== activeCascadeId
    ) {
      continue;
    }
    const isCurrentConv = cascadeId === activeCascadeId;
    for (const st of entry?.steps || []) {
      const mInfo = resolveModelInfo(st.modelKey, dynamicModelMap, st.apiProvider);
      const stepTotalTokens = st.inputTokens + st.cacheReadTokens + st.outputTokens;
      const stepCost = computeStepCost(st, mInfo.pricing);
      const tMs = st.createdAtMs || 0;

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

        if (!perModelStats.has(mInfo.label)) {
          perModelStats.set(mInfo.label, {
            label: mInfo.label,
            shortName: mInfo.shortName,
            family: mInfo.family,
            calls: 0,
            inputTokens: 0,
            cacheReadTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            speedAccumulator: createSpeedAccumulator(),
          });
        }
        const agg = perModelStats.get(mInfo.label);
        accumulateSpeed(agg.speedAccumulator, st);

        agg.calls += 1;
        agg.inputTokens += st.inputTokens;
        agg.cacheReadTokens += st.cacheReadTokens;
        agg.outputTokens += st.outputTokens;
        agg.totalTokens += stepTotalTokens;
        agg.costUsd += stepCost;
      }
    }
  }

  const finalizedPresets = {};
  for (const k of presetKeys) {
    finalizedPresets[k] = {
      label: presetWindows[k].label,
      session: finalizeUsageBucket(sessionBuckets[k]),
      account: finalizeUsageBucket(accountBuckets[k]),
    };
  }

  const todayBucket = finalizedPresets.today.account;
  const weekBucket = finalizedPresets.week.account;

  const familyPoolQuota = quotaPoolsMap.get(activePoolKey);
  const activePoolQuota = familyPoolQuota || {
    poolName: activePoolKey === 'Gemini' ? 'Gemini 模型池' : 'Claude & GPT 模型池',
    family: activePoolKey,
    isAvailable: Boolean(activeLive5h),
    remainingPct: activeLive5h?.remainingPct ?? null,
    remainingIntPct: activeLive5h?.remainingIntPct ?? null,
    usedPct: activeLive5h?.usedPct ?? null,
    resetTime: activeLive5h?.resetTime || null,
    weeklyRemainingPct: activeLiveWeekly?.remainingPct ?? null,
    weeklyRemainingIntPct: activeLiveWeekly?.remainingIntPct ?? null,
    weeklyUsedPct: activeLiveWeekly?.usedPct ?? null,
    weeklyResetTime: activeLiveWeekly?.resetTime || null,
    models: [],
  };

  const fallbackWeeklyPct =
    settings.weeklyLimitMode === 'custom_cost' || settings.weeklyLimitMode === 'cost'
      ? Math.min(100, +((weekBucket.costUsd / Math.max(1, settings.weeklyCostBudget)) * 100).toFixed(1))
      : Math.min(
          100,
          +((weekBucket.totalTokens / Math.max(1000, settings.weeklyTokenBudget)) * 100).toFixed(1)
        );

  const isCustomWeeklyMode =
    settings.weeklyLimitMode === 'custom_tokens' || settings.weeklyLimitMode === 'custom_cost';
  const useOfficialWeekly = Boolean(activeLiveWeekly) && !isCustomWeeklyMode;

  const weeklyUsedPct = useOfficialWeekly
    ? activeLiveWeekly.usedPct
    : isCustomWeeklyMode
      ? fallbackWeeklyPct
      : null;
  const weeklyRemainingPct = useOfficialWeekly
    ? activeLiveWeekly.remainingPct
    : isCustomWeeklyMode
      ? +(100 - fallbackWeeklyPct).toFixed(1)
      : null;
  const weeklyRemainingIntPct = useOfficialWeekly
    ? activeLiveWeekly.remainingIntPct
    : isCustomWeeklyMode
      ? Math.max(0, Math.floor(100 - fallbackWeeklyPct))
      : null;

  // Extract genuine Google One AI credits if present (ignore legacy hardcoded 500 prompt credits)
  const g1CreditEntry = (userStatus?.userTier?.availableCredits || []).find(
    (c) => c?.creditType === 'GOOGLE_ONE_AI'
  );
  const realAiCredits = Number(g1CreditEntry?.creditAmount || 0);

  return {
    timestamp: new Date().toISOString(),
    settings,
    diagnostics: diagnostics.status(),
    account: {
      name: userStatus?.name || '',
      tierName: userStatus?.userTier?.name || 'Google AI',
      planName: userStatus?.planStatus?.planInfo?.planName || 'Pro',
      aiCredits: realAiCredits > 0 ? realAiCredits : null,
      totalConversations: conversations.length,
    },
    conversations: conversations.slice(0, 30),
    activeConversation: {
      cascadeId: activeCascadeId,
      title: activeConvSummary?.title || '当前会话',
      isRunning: activeConvSummary?.status === 'CASCADE_RUN_STATUS_RUNNING',
      status: activeConvSummary?.status || 'IDLE',
      stepCount: enrichedActiveSteps.length,
      latestTokPerSec: latestEnriched?.tokPerSec ?? null,
      latestTtftSec: latestEnriched?.ttftSec ?? null,
      latestSpeedReason: latestEnriched?.selectedSpeedReason ?? null,
      avgTokPerSec: sessionAvgTokPerSec,
      speedSummary: sessionSpeed,
      ttftSummary: sessionTtft,
      latestStepCostUsd: latestEnriched?.costUsd ?? 0,
      sessionCostUsd: +sessionCostUsd.toFixed(2),
      latestCacheHitPct,
      sessionCacheHitPct,
      activeModelShort: latestEnriched?.modelShort || 'argon-4',
      activeModelLabel: latestEnriched?.modelLabel || 'Gemini 4 Argon (Medium)',
      context: {
        totalTokens: ctxTotal,
        limitTokens: ctxLimit,
        usedPct: ctxPct,
        compactionUsedTokens,
        compactionLimitTokens,
        compactionUsedPct,
        cachedTokens: ctxCached,
        freshInputTokens: ctxFreshInput,
        thinkingTokens: ctxThinking,
        responseTokens: ctxResponse,
      },
      recentSteps: enrichedActiveSteps.slice().reverse(),
    },
    consumption: {
      selectedRange: {
        key: selectedWindow.key,
        label: selectedWindow.label,
        startMs: selectedWindow.startMs,
        endMs: Number.isFinite(selectedWindow.endMs) ? selectedWindow.endMs : nowMs,
      },
      session: finalizeUsageBucket(selectedSessionBucket),
      sessionAllTime: finalizedPresets.all.session,
      account: finalizeUsageBucket(selectedAccountBucket),
      accountAllTime: finalizedPresets.all.account,
      presets: finalizedPresets,
    },
    quotas: {
      meta: {
        fetchedAtMs: officialQuotaInfo?.fetchedAtMs || 0,
        hasOfficialData: Boolean(officialQuotaInfo?.data),
        isStale: Boolean(officialQuotaInfo?.isStale),
        refreshFailed: Boolean(officialQuotaInfo?.refreshFailed),
        error: officialQuotaInfo?.error || null,
        errorMessage: officialQuotaInfo?.error || null,
      },
      activePool: activePoolQuota,
      pools: Array.from(quotaPoolsMap.values()).sort((a, b) => {
        const order = { Gemini: 0, 'Claude & GPT': 1 };
        return (order[a.family] ?? 99) - (order[b.family] ?? 99);
      }),
      models: modelQuotas.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      weekly: {
        isOfficial: useOfficialWeekly,
        poolFamily: activePoolKey,
        title: isCustomWeeklyMode
          ? '每周限额 (自定义本机)'
          : `每周限额 (${activePoolKey || '当前'})`,
        calls: weekBucket.calls,
        tokens: weekBucket.totalTokens,
        costUsd: weekBucket.costUsd,
        usedPct: weeklyUsedPct,
        remainingPct: weeklyRemainingPct,
        remainingIntPct: weeklyRemainingIntPct,
        resetTime: useOfficialWeekly
          ? activeLiveWeekly.resetTime
          : isCustomWeeklyMode
            ? getNextMondayResetIso()
            : null,
      },
      today: {
        calls: todayBucket.calls,
        tokens: todayBucket.totalTokens,
        costUsd: todayBucket.costUsd,
      },
    },
    modelBreakdown: Array.from(perModelStats.values())
      .sort((a, b) => b.calls - a.calls || String(a.label).localeCompare(String(b.label)))
      .map(({ speedAccumulator, ...m }) => ({
        ...m,
        costUsd: +m.costUsd.toFixed(3),
        avgTokPerSec: roundMetric(finishSpeed(speedAccumulator).avgTokPerSec),
        speedSummary: finishSpeed(speedAccumulator),
      })),
  };
}

function buildTelemetryPayload(requestedConvId, forceQuotaRefresh = false, filterOpts = {}) {
  const rangeSig = `${filterOpts.range || 'all'}:${filterOpts.startMs || 0}:${filterOpts.endMs || 0}`;
  const key = `${requestedConvId || '__auto__'}::${forceQuotaRefresh ? 'force' : 'normal'}::${rangeSig}`;
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const p = buildTelemetryPayloadInternal(requestedConvId, forceQuotaRefresh, filterOpts).finally(
    () => {
      inFlightRequests.delete(key);
    }
  );
  inFlightRequests.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------
// Sidecar Server Setup
// ---------------------------------------------------------------------------

const app = new SidecarApp();
const diagnostics = new StreamDiagnostics({ dataDir: DATA_DIR, lsAddress: LS_ADDR, csrfToken: CSRF_TOKEN });
const readLocal = (name) => readFileSync(join(HERE, name), 'utf8');

function isLocalHostRequest(req) {
  if (!req?.headers) return true;
  const host = String(req.headers.host || '').toLowerCase();
  if (host && !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) {
    return false;
  }
  const origin = String(req.headers.origin || '').toLowerCase();
  if (
    origin &&
    !/^(https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?|vscode-webview:\/\/)/.test(origin)
  ) {
    return false;
  }
  return true;
}

app.page('/', () => readLocal('index.html'));
app.page('/app.js', () => readLocal('app.js'));
app.api(
  '/styles.css',
  () => new Response(readLocal('styles.css'), { contentType: 'text/css' }),
  'GET'
);

app.api(
  '/api/telemetry',
  async (data, req) => {
    if (!isLocalHostRequest(req)) {
      return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
        status: 403,
        contentType: 'application/json',
      });
    }
    const convId = data?.conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID || '';
    const force = data?.force === '1' || data?.force === true;
    const filterOpts = {
      range: data?.range || 'all',
      startMs: data?.startMs ? Number(data.startMs) : 0,
      endMs: data?.endMs ? Number(data.endMs) : 0,
    };
    const payload = await buildTelemetryPayload(convId, force, filterOpts);
    return new Response(JSON.stringify(payload), {
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  'GET'
);

app.api('/api/settings', (data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const current = loadSettings();
  const updated = {
    ...current,
    contextWindowLimit: Number(data.contextWindowLimit || current.contextWindowLimit),
    weeklyTokenBudget: Number(data.weeklyTokenBudget || current.weeklyTokenBudget),
    weeklyCostBudget: Number(data.weeklyCostBudget || current.weeklyCostBudget),
    weeklyLimitMode: data.weeklyLimitMode || current.weeklyLimitMode,
  };
  saveJson(SETTINGS_FILE, updated);
  return updated;
});

app.api('/api/diagnostics', (_data, req) => {
  if (!isLocalHostRequest(req)) return new Response('Forbidden host or origin', { status: 403 });
  return new Response(JSON.stringify(diagnostics.status()), {
    contentType: 'application/json', headers: { 'Cache-Control': 'no-store' },
  });
}, 'GET');

app.api('/api/diagnostics', (data, req) => {
  if (!isLocalHostRequest(req)) return new Response('Forbidden host or origin', { status: 403 });
  try {
    return diagnostics.configure({ enabled: data?.enabled, conversationId: data?.conversationId || '' });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message === 'invalid_diagnostic_config' ? 'Invalid diagnostic settings' : 'Could not save diagnostic settings' }), {
      status: error.message === 'invalid_diagnostic_config' ? 400 : 500, contentType: 'application/json',
    });
  }
});

app.run();
diagnostics.start();
