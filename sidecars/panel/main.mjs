// Backend for Antigravity Usage & Speed Monitor Sidecar Extension.
import { existsSync, mkdirSync, promises as fsPromises, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
const DEEP_STATS_CACHE_CANDIDATES = [
  join(homedir(), '.gemini', 'antigravity-ide', 'brain', '.deep_stats_cache.json'),
  join(homedir(), '.gemini', 'antigravity', 'brain', '.deep_stats_cache.json'),
  join(homedir(), '.gemini', 'antigravity-idea', 'brain', '.deep_stats_cache.json'),
];

const LS_ADDR = process.env.ANTIGRAVITY_LS_ADDRESS;
const CSRF_TOKEN = process.env.ANTIGRAVITY_CSRF_TOKEN;

const DEFAULT_SETTINGS = {
  contextWindowLimit: 256000,  // 256k auto-compaction budget default (can be toggled to 256k / 1M / 2M)
  weeklyTokenBudget: 150000000, // 150M tokens default custom weekly target
  weeklyCostBudget: 100,       // Default user-configurable local cost target
  weeklyLimitMode: 'official', // 'official' | 'custom_tokens' | 'custom_cost'
};

// Local API price catalog in USD per 1M tokens (Input, CacheRead, Output).
// These estimates do not establish a conversion to subscription quota.
// Missing model/price evidence is left unpriced, never filled from another model.
const MODEL_PRICING = {
  // Gemini 4 & 3.x & 2.5 Official Catalog Pricing (USD / 1M tokens)
  'gemini-4-argon-high': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-high', family: 'Gemini' },
  'gemini-4-argon-medium': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4', family: 'Gemini' },
  'gemini-4-argon-low': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-low', family: 'Gemini' },
  'gemini-4-argon': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4', family: 'Gemini' },
  'gemini-3.8-flash-high': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8-high', family: 'Gemini' },
  'gemini-3.8-flash-medium': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.8-flash-low': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-3.8-low', family: 'Gemini' },
  'gemini-3.8-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.7-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.7', family: 'Gemini' },
  'gemini-3.6-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.6', family: 'Gemini' },
  'gemini-3.5-flash': { input: 1.50, cache: 0.15, output: 9.00, short: 'flash-3.5', family: 'Gemini' },
  'gemini-3.5-flash-lite': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-3.5-lite', family: 'Gemini' },
  'gemini-3.1-pro': { input: 2.00, cache: 0.20, output: 12.0, short: 'pro-3.1', family: 'Gemini' },
  'gemini-3.1-flash-lite': { input: 0.25, cache: 0.025, output: 1.50, short: 'flash-3.1-lite', family: 'Gemini' },
  'gemini-3-flash': { input: 0.50, cache: 0.05, output: 3.00, short: 'flash-3', family: 'Gemini' },
  'gemini-2.5-pro': { input: 1.25, cache: 0.125, output: 10.0, short: 'pro-2.5', family: 'Gemini' },
  'gemini-2.5-flash': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-2.5', family: 'Gemini' },
  'gemini-2.5-flash-lite': { input: 0.10, cache: 0.01, output: 0.40, short: 'flash-2.5-lite', family: 'Gemini' },

  // Claude 4.5 / 4.6 / 4.7 / 4.8 / 5.x Official Catalog Pricing
  'claude-fable-5-1': { input: 10.0, cache: 0.25, output: 50.0, short: 'fable-5.1', family: 'Claude' },
  'claude-fable-5': { input: 10.0, cache: 1.00, output: 50.0, short: 'fable-5', family: 'Claude' },
  'claude-opus-5-5': { input: 4.00, cache: 0.20, output: 20.0, short: 'opus-5.5', family: 'Claude' },
  'claude-opus-5': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-5', family: 'Claude' },
  'claude-opus-4-8': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.8', family: 'Claude' },
  'claude-opus-4-7': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.7', family: 'Claude' },
  'claude-opus-4-6-thinking': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus', family: 'Claude' },
  'claude-opus-4-6': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.6', family: 'Claude' },
  'claude-opus-4-5': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.5', family: 'Claude' },
  'claude-sonnet-5-5': { input: 2.00, cache: 0.10, output: 10.0, short: 'sonnet-5.5', family: 'Claude' },
  'claude-sonnet-5': { input: 2.00, cache: 0.20, output: 10.0, short: 'sonnet-5', family: 'Claude' },
  'claude-sonnet-4-6': { input: 3.00, cache: 0.30, output: 15.0, short: 'sonnet', family: 'Claude' },
  'claude-sonnet-4-5': { input: 3.00, cache: 0.30, output: 15.0, short: 'sonnet-4.5', family: 'Claude' },
  'claude-haiku-5-5': { input: 0.10, cache: 0.01, output: 0.50, short: 'haiku-5.5', family: 'Claude' },
  'claude-haiku-4-5': { input: 1.00, cache: 0.10, output: 5.00, short: 'haiku-4.5', family: 'Claude' },

  // OpenAI / GPT Official Catalog Pricing
  'gpt-6-astra': { input: 10.0, cache: 1.00, output: 50.0, short: 'gpt-6-astra', family: 'GPT' },
  'gpt-6.1-sol': { input: 2.00, cache: 0.10, output: 10.0, short: 'gpt-6.1-sol', family: 'GPT' },
  'gpt-6-sol': { input: 2.00, cache: 0.20, output: 10.0, short: 'gpt-6-sol', family: 'GPT' },
  'gpt-6-luna': { input: 0.10, cache: 0.01, output: 0.50, short: 'gpt-6-luna', family: 'GPT' },
  'gpt-5.6': { input: 4.00, cache: 0.40, output: 20.0, short: 'gpt-5.6', family: 'GPT' },
  'gpt-5.6-sol': { input: 4.00, cache: 0.40, output: 20.0, short: 'gpt-5.6-sol', family: 'GPT' },
  'gpt-5.6-terra': { input: 2.00, cache: 0.20, output: 12.0, short: 'gpt-5.6-terra', family: 'GPT' },
  'gpt-5.6-luna': { input: 0.20, cache: 0.02, output: 1.20, short: 'gpt-5.6-luna', family: 'GPT' },
  'gpt-5.5': { input: 5.00, cache: 0.50, output: 30.0, short: 'gpt-5.5', family: 'GPT' },
  'gpt-5.4': { input: 2.50, cache: 0.25, output: 15.0, short: 'gpt-5.4', family: 'GPT' },
  'gpt-5.4-mini': { input: 0.75, cache: 0.075, output: 4.50, short: 'gpt-5.4-mini', family: 'GPT' },
  'gpt-5.4-nano': { input: 0.20, cache: 0.02, output: 1.25, short: 'gpt-5.4-nano', family: 'GPT' },
  'gpt-5.3-codex': { input: 1.75, cache: 0.175, output: 14.0, short: 'gpt-5.3-codex', family: 'GPT' },
  'gpt-5.2': { input: 1.75, cache: 0.175, output: 14.0, short: 'gpt-5.2', family: 'GPT' },
  'gpt-5.1': { input: 1.25, cache: 0.125, output: 10.0, short: 'gpt-5.1', family: 'GPT' },
  'gpt-5': { input: 1.25, cache: 0.125, output: 10.0, short: 'gpt-5', family: 'GPT' },
  'gpt-5-mini': { input: 0.25, cache: 0.025, output: 2.00, short: 'gpt-5-mini', family: 'GPT' },
  'gpt-5-nano': { input: 0.05, cache: 0.005, output: 0.40, short: 'gpt-5-nano', family: 'GPT' },
  'gpt-4.1': { input: 2.00, cache: 0.50, output: 8.00, short: 'gpt-4.1', family: 'GPT' },
  'gpt-4.1-mini': { input: 0.40, cache: 0.10, output: 1.60, short: 'gpt-4.1-mini', family: 'GPT' },
  'gpt-4o': { input: 2.50, cache: 1.25, output: 10.0, short: 'gpt-4o', family: 'GPT' },
  'gpt-4o-mini': { input: 0.15, cache: 0.075, output: 0.60, short: 'gpt-4o-mini', family: 'GPT' },
  'o4-mini': { input: 1.10, cache: 0.275, output: 4.40, short: 'o4-mini', family: 'GPT' },
  'o3': { input: 2.00, cache: 0.50, output: 8.00, short: 'o3', family: 'GPT' },
  'o3-mini': { input: 1.10, cache: 0.55, output: 4.40, short: 'o3-mini', family: 'GPT' },
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
const CACHE_SCHEMA_VERSION = 'v10-model-identity';
const loadedTrajectoryCache = loadJson(CACHE_FILE, {});
let trajectoryCache = Object.fromEntries(Object.entries(loadedTrajectoryCache).map(([id, entry]) => [
  id, { ...entry, steps: (entry.steps || []).map(normalizeCachedStep) },
]));
let cacheNeedsSave = JSON.stringify(trajectoryCache) !== JSON.stringify(loadedTrajectoryCache);
let externalDeepStatsMemo = { sig: '', convos: new Map() };
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
    return true;
  } catch (err) {
    console.error(`Failed writing ${filePath}: ${err.message}`);
    return false;
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

function getBaseModelLabel(label = '') {
  return String(label || '')
    .replace(/\s*\((?:High|Medium|Low|Thinking|Extra Low)\)\s*$/i, '')
    .trim() || String(label || 'Unknown Model');
}

function formatGenericModelSlug(slug = '') {
  const s = String(slug || '').trim().replace(/^session-display:/i, '');
  if (!s || /^MODEL_PLACEHOLDER_/i.test(s)) return '';
  const m = s.match(/^gemini-(\d+(?:\.\d+)?)-(pro|flash|argon)(?:-(lite))?/i);
  if (m) {
    const ver = m[1];
    const tier = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const lite = m[3] ? ' Lite' : '';
    return `Gemini ${ver} ${tier}${lite}`;
  }
  return '';
}

function resolveModelInfo(rawModelKey, dynamicModelMap, apiProvider = '', modelDisplayName = '') {
  const dyn = dynamicModelMap.get(rawModelKey) || PLACEHOLDER_MAP[rawModelKey];
  const cleanRawFallback =
    rawModelKey && rawModelKey !== 'unknown' ? rawModelKey : '';
  const derivedDisplay =
    modelDisplayName ||
    dyn?.label ||
    formatGenericModelSlug(rawModelKey) ||
    cleanRawFallback ||
    '模型未知';
  const baseLabel = getBaseModelLabel(derivedDisplay);
  const canonicalSlug = baseLabel.toLowerCase().replace(/\s+/g, '-');
  const dashedSlug = canonicalSlug.replace(/\./g, '-');
  const modelId = dyn?.modelId || rawModelKey || 'unknown';
  const explicitPricing =
    MODEL_PRICING[modelId] ||
    MODEL_PRICING[rawModelKey] ||
    MODEL_PRICING[canonicalSlug] ||
    MODEL_PRICING[dashedSlug];
  if (explicitPricing) {
    return {
      rawModel: rawModelKey,
      modelId,
      label: derivedDisplay,
      baseLabel,
      shortName: explicitPricing.short,
      family: explicitPricing.family,
      pricing: explicitPricing,
      isEstimatedPrice: false,
    };
  }

  const inferredFamily = inferFamilyFromProviderOrKey(rawModelKey, modelId, apiProvider);
  return {
    rawModel: rawModelKey,
    modelId,
    label: derivedDisplay,
    baseLabel: getBaseModelLabel(derivedDisplay),
    shortName: derivedDisplay,
    family: inferredFamily,
    pricing: null,
    isEstimatedPrice: true,
  };
}

function computeStepCost(step, pricing) {
  if (!pricing) return null;
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
    case '14d':
      return { key: '14d', label: '近 14 天', startMs: nowMs - 14 * 24 * 3600 * 1000, endMs: nowMs };
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
    savedCostUsd: 0,
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
  const savedCost = mInfo.pricing
    ? (st.cacheReadTokens / 1_000_000) * Math.max(0, mInfo.pricing.input - mInfo.pricing.cache) : 0;
  if (stepCost === null) bucket.unpricedCalls = (bucket.unpricedCalls || 0) + 1;
  stepCost = stepCost ?? 0;
  bucket.calls += 1;
  if (cascadeId) bucket.conversationsSet.add(cascadeId);
  bucket.inputTokens += st.inputTokens;
  bucket.cacheReadTokens += st.cacheReadTokens;
  bucket.outputTokens += st.outputTokens;
  bucket.thinkingTokens += st.thinkingTokens || 0;
  bucket.responseTokens += st.responseTokens || 0;
  bucket.totalTokens += stepTotalTokens;
  bucket.costUsd += stepCost;
  bucket.savedCostUsd += savedCost;

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

function loadExternalDeepStatsCache() {
  const sigParts = [];
  const existingFiles = [];
  for (const candidate of DEEP_STATS_CACHE_CANDIDATES) {
    if (!existsSync(candidate)) continue;
    try {
      const st = statSync(candidate);
      sigParts.push(`${candidate}:${st.mtimeMs || 0}:${st.size || 0}`);
      existingFiles.push(candidate);
    } catch {
      // Ignore stat errors
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

  externalDeepStatsMemo = { sig, convos };
  return convos;
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

  for (const [poolKey, b5hKey, bWkKey, poolName] of [
    ['Gemini', 'gemini-5h', 'gemini-weekly', 'Gemini 模型池'],
    ['Claude & GPT', '3p-5h', '3p-weekly', 'Claude & GPT 模型池'],
  ]) {
    if (!quotaPoolsMap.has(poolKey)) {
      const b5h = officialBuckets.get(b5hKey);
      const bWk = officialBuckets.get(bWkKey);
      quotaPoolsMap.set(poolKey, {
        poolName,
        family: poolKey,
        isAvailable: Boolean(b5h),
        remainingPct: b5h?.remainingPct ?? null,
        remainingIntPct: b5h?.remainingIntPct ?? null,
        usedPct: b5h?.usedPct ?? null,
        resetTime: b5h?.resetTime || null,
        weeklyRemainingPct: bWk?.remainingPct ?? null,
        weeklyRemainingIntPct: bWk?.remainingIntPct ?? null,
        weeklyUsedPct: bWk?.usedPct ?? null,
        weeklyResetTime: bWk?.resetTime || null,
        models: [],
      });
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
  let cacheDirty = cacheNeedsSave;

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
    const lastCachedStep = cached.steps?.[cached.steps.length - 1];
    const missingBreakdownField =
      Boolean(lastCachedStep) &&
      !Object.prototype.hasOwnProperty.call(lastCachedStep, 'contextBreakdown');
    return (
      cached.signature !== sig ||
      isRunning ||
      Boolean(cached.wasRunning) ||
      missingBreakdownField
    );
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
    cacheNeedsSave = !saveJson(CACHE_FILE, trajectoryCache);
  }

  // Compute Active Conversation Metrics
  const activeEntry = activeCascadeId ? trajectoryCache[activeCascadeId] : null;
  const activeSteps = activeEntry?.steps || [];

  const sessionSpeed = summarizeSpeed(activeSteps);
  const sessionTtft = summarizeTtft(activeSteps);
  let sessionCostUsd = 0;
  let sessionUnpricedCalls = 0;
  let sessionInputTokens = 0;
  let sessionCacheReadTokens = 0;

  const enrichedActiveSteps = activeSteps.map((st) => {
    const mInfo = resolveModelInfo(st.modelKey, dynamicModelMap, st.apiProvider, st.modelDisplayName);
    const costUsd = computeStepCost(st, mInfo.pricing);
    const metric = speedMetric(st);

    sessionCostUsd += costUsd ?? 0;
    if (costUsd === null) sessionUnpricedCalls++;
    sessionInputTokens += st.inputTokens;
    sessionCacheReadTokens += st.cacheReadTokens;

    const tokPerSec = metric.value;
    const totalPrompt = st.inputTokens + st.cacheReadTokens;
    const cacheHitPct = totalPrompt > 0 ? (st.cacheReadTokens / totalPrompt) * 100 : 0;

    const inCostUsd = mInfo.pricing ? (st.inputTokens / 1_000_000) * mInfo.pricing.input : null;
    const cacheCostUsd = mInfo.pricing ? (st.cacheReadTokens / 1_000_000) * mInfo.pricing.cache : null;
    const outCostUsd = mInfo.pricing ? (st.outputTokens / 1_000_000) * mInfo.pricing.output : null;

    return {
      ...st,
      modelLabel: st.isCompactionStep ? `${mInfo.label} [自动压缩]` : mInfo.label,
      modelShort: st.isCompactionStep ? `${mInfo.shortName}·压缩` : mInfo.shortName,
      family: mInfo.family,
      tokPerSec: roundMetric(tokPerSec),
      selectedSpeedReason: metric.reason,
      ttftSec: st.nativeTtftSec,
      cacheHitPct: +cacheHitPct.toFixed(1),
      costUsd: costUsd === null ? null : +costUsd.toFixed(4),
      inCostUsd: inCostUsd === null ? null : +inCostUsd.toFixed(4),
      cacheCostUsd: cacheCostUsd === null ? null : +cacheCostUsd.toFixed(4),
      outCostUsd: outCostUsd === null ? null : +outCostUsd.toFixed(4),
      contextTokens: st.inputTokens + st.cacheReadTokens + st.outputTokens,
    };
  });

  const latestEnriched =
    enrichedActiveSteps.length > 0 ? enrichedActiveSteps[enrichedActiveSteps.length - 1] : null;

  const sessionAvgTokPerSec = roundMetric(sessionSpeed.avgTokPerSec);

  // Context breakdown from the latest step
  let latestBreakdown = latestEnriched?.contextBreakdown || null;
  if (!latestBreakdown) {
    for (let i = enrichedActiveSteps.length - 1; i >= 0; i--) {
      if (enrichedActiveSteps[i]?.contextBreakdown) {
        latestBreakdown = enrichedActiveSteps[i].contextBreakdown;
        break;
      }
    }
  }
  const ctxMessages = Number(latestBreakdown?.messagesTokens || 0);
  const ctxSystemTools = Number(latestBreakdown?.systemToolsTokens || 0);
  const ctxMcpTools = Number(latestBreakdown?.mcpToolsTokens || 0);
  const ctxSkills = Number(latestBreakdown?.skillsTokens || 0);
  const ctxSystemPrompt = Number(latestBreakdown?.systemPromptTokens || 0);
  const ctxUserRules = Number(latestBreakdown?.userRulesTokens || 0);
  const ctxBreakdownTotal =
    ctxMessages + ctxSystemTools + ctxMcpTools + ctxSkills + ctxSystemPrompt + ctxUserRules;

  const ctxCached = latestEnriched?.cacheReadTokens || 0;
  const ctxFreshInput = latestEnriched?.inputTokens || 0;
  const ctxThinking = latestEnriched?.thinkingTokens || 0;
  const ctxResponse = latestEnriched?.responseTokens || 0;
  const ctxTotal =
    ctxBreakdownTotal > 0
      ? ctxBreakdownTotal
      : ctxCached + ctxFreshInput + ctxThinking + ctxResponse;
  const compactionLimitTokens = Number(latestEnriched?.maxContextBudgetTokens || 256000);
  const compactionUsedTokens = Number(
    latestEnriched?.estimatedContextTokens || ctxBreakdownTotal || ctxCached + ctxFreshInput
  );
  const compactionUsedPct =
    compactionLimitTokens > 0
      ? Math.min(100, +((compactionUsedTokens / compactionLimitTokens) * 100).toFixed(1))
      : 0;

  const ctxLimit = compactionLimitTokens;
  const ctxPct = ctxLimit > 0 ? Math.min(100, +((ctxTotal / ctxLimit) * 100).toFixed(1)) : 0;

  // Cache hit rate (latest step & session-wide)
  const latestPromptTokens = ctxCached + ctxFreshInput;
  const latestCacheHitPct =
    latestPromptTokens > 0 ? Math.round((ctxCached / latestPromptTokens) * 100) : 0;
  const sessionPromptTokens = sessionCacheReadTokens + sessionInputTokens;
  const sessionCacheHitPct =
    sessionPromptTokens > 0 ? Math.round((sessionCacheReadTokens / sessionPromptTokens) * 100) : 0;

  // Determine active pool and its official cycle anchors for time window alignment
  const rawActiveFamily = latestEnriched?.family || 'Other';
  const activePoolKey = rawActiveFamily === 'Gemini' ? 'Gemini'
    : ['Claude', 'GPT'].includes(rawActiveFamily) ? 'Claude & GPT' : 'Unknown';
  const activeLive5h = officialBuckets.get(activePoolKey === 'Gemini' ? 'gemini-5h'
    : activePoolKey === 'Claude & GPT' ? '3p-5h' : null);
  const activeLiveWeekly = officialBuckets.get(
    activePoolKey === 'Gemini' ? 'gemini-weekly' : activePoolKey === 'Claude & GPT' ? '3p-weekly' : null
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
    if (
      entry?.accountName &&
      currentAccountName &&
      entry.accountName !== currentAccountName &&
      cascadeId !== activeCascadeId
    ) {
      continue;
    }
    allEntriesToAggregate.push({
      cascadeId,
      appSource: entry?.appSource || 'standalone',
      steps: entry?.steps || [],
      isCurrentConv: cascadeId === activeCascadeId,
    });
  }

  for (const ext of externalConvos.values()) {
    const liveEntry = trajectoryCache[ext.cascadeId];
    if (
      ext.appSource === 'standalone' &&
      liveEntry &&
      (liveEntry.steps?.length || 0) >= ext.steps.length
    ) {
      continue;
    }
    allEntriesToAggregate.push({
      cascadeId: `${ext.appSource}:${ext.cascadeId}`,
      appSource: ext.appSource || 'ide',
      steps: ext.steps || [],
      isCurrentConv: ext.cascadeId === activeCascadeId && !liveEntry,
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
        st.modelDisplayName
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

        const modelGroupKey = mInfo.baseLabel || mInfo.label;
        if (!perModelStats.has(modelGroupKey)) {
          perModelStats.set(modelGroupKey, {
            label: modelGroupKey,
            shortName: mInfo.shortName,
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
        accumulateSpeed(agg.speedAccumulator, st);

        agg.calls += 1;
        agg.inputTokens += st.inputTokens;
        agg.cacheReadTokens += st.cacheReadTokens;
        agg.outputTokens += st.outputTokens;
        agg.thinkingTokens += st.thinkingTokens || 0;
        agg.responseTokens += st.responseTokens || 0;
        agg.totalTokens += stepTotalTokens;
        agg.costUsd += stepCost ?? 0;
        agg.unpricedCalls = (agg.unpricedCalls || 0) + unpriced;
      }
    }
  }

  // Build 12-slot trendSeries across selectedWindow
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

  const familyPoolQuota = quotaPoolsMap.get(activePoolKey);
  const activePoolQuota = familyPoolQuota || {
    poolName: activePoolKey === 'Gemini' ? 'Gemini 模型池'
      : activePoolKey === 'Claude & GPT' ? 'Claude & GPT 模型池' : '模型池未知',
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
      ? weekBucket.unpricedCalls > 0 ? null
        : Math.min(100, +((weekBucket.costUsd / Math.max(1, settings.weeklyCostBudget)) * 100).toFixed(1))
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
    : isCustomWeeklyMode && fallbackWeeklyPct !== null
      ? +(100 - fallbackWeeklyPct).toFixed(1)
      : null;
  const weeklyRemainingIntPct = useOfficialWeekly
    ? activeLiveWeekly.remainingIntPct
    : isCustomWeeklyMode && fallbackWeeklyPct !== null
      ? Math.max(0, Math.floor(100 - fallbackWeeklyPct))
      : null;

  // Extract genuine Google One AI credits if present (ignore legacy hardcoded 500 prompt credits)
  const g1CreditEntry = (userStatus?.userTier?.availableCredits || []).find(
    (c) => c?.creditType === 'GOOGLE_ONE_AI'
  );
  const realAiCredits = Number(g1CreditEntry?.creditAmount || 0);

  let uiBundleVersion = 0;
  try {
    uiBundleVersion = statSync(join(HERE, 'app.js')).mtimeMs || 0;
  } catch {}

  return {
    timestamp: new Date().toISOString(),
    uiBundleVersion,
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
      latestStepCostUsd: latestEnriched?.costUsd ?? null,
      sessionCostUsd: +sessionCostUsd.toFixed(2),
      sessionUnpricedCalls,
      latestCacheHitPct,
      sessionCacheHitPct,
      activeModelShort: latestEnriched?.modelShort || '模型未知',
      activeModelLabel: latestEnriched?.modelLabel || '模型未知',
      context: {
        totalTokens: ctxTotal,
        limitTokens: ctxLimit,
        usedPct: ctxPct,
        compactionUsedTokens,
        compactionLimitTokens,
        compactionUsedPct,
        messagesTokens: ctxMessages,
        systemToolsTokens: ctxSystemTools,
        mcpToolsTokens: ctxMcpTools,
        skillsTokens: ctxSkills,
        systemPromptTokens: ctxSystemPrompt,
        userRulesTokens: ctxUserRules,
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
        startMs: trendStartMs,
        endMs: trendEndMs,
      },
      session: finalizedSelectedSession,
      sessionAllTime: finalizedPresets.all.session,
      account: finalizedSelectedAccount,
      accountAllTime: finalizedPresets.all.account,
      presets: finalizedPresets,
      trendSeries,
      sourcesBreakdown,
      monthlyYear: currentYear,
      monthlySeries,
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
        unpricedCalls: weekBucket.unpricedCalls,
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
        unpricedCalls: todayBucket.unpricedCalls,
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
const readLocalAsync = async (relPath) => {
  const fullPath = join(HERE, relPath);
  if (typeof fsPromises !== 'undefined' && fsPromises?.readFile) {
    return fsPromises.readFile(fullPath, 'utf8');
  }
  return readFileSync(fullPath, 'utf8');
};

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

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

app.page(
  '/',
  async () =>
    new Response(await readLocalAsync('index.html'), {
      contentType: 'text/html; charset=utf-8',
      headers: NO_STORE_HEADERS,
    })
);
app.page(
  '/app.js',
  async () =>
    new Response(await readLocalAsync('app.js'), {
      contentType: 'application/javascript; charset=utf-8',
      headers: NO_STORE_HEADERS,
    })
);
app.api(
  '/styles.css',
  async () =>
    new Response(await readLocalAsync('styles.css'), {
      contentType: 'text/css; charset=utf-8',
      headers: NO_STORE_HEADERS,
    }),
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
