// Backend for Antigravity Usage & Speed Monitor Sidecar Extension.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Response, SidecarApp } from 'sidecar_sdk';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR || join(HERE, '.data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const CACHE_FILE = join(DATA_DIR, 'trajectory_usage_cache.json');

const LS_ADDR = process.env.ANTIGRAVITY_LS_ADDRESS;
const CSRF_TOKEN = process.env.ANTIGRAVITY_CSRF_TOKEN;

const DEFAULT_SETTINGS = {
  contextWindowLimit: 1000000, // 1M default (can be toggled to 200k / 2M)
  weeklyTokenBudget: 80000000, // 80M tokens default custom weekly target
  weeklyCostBudget: 35,        // $35 default custom weekly cost target
  weeklyLimitMode: 'official', // 'official' | 'custom_tokens' | 'custom_cost'
  speedMode: 'stream',         // 'stream' (streamTokens / streamTime) | 'total' (outputTokens / totalTime)
};

// Model pricing table in USD per 1M tokens (Input, CacheRead, Output)
const MODEL_PRICING = {
  'gemini-4-argon-high': { input: 1.25, cache: 0.3125, output: 10.0, short: 'argon-4-high', family: 'Gemini' },
  'gemini-4-argon-medium': { input: 1.00, cache: 0.25, output: 6.0, short: 'argon-4', family: 'Gemini' },
  'gemini-4-argon-low': { input: 0.50, cache: 0.125, output: 3.0, short: 'argon-4-low', family: 'Gemini' },
  'gemini-3.8-flash-high': { input: 0.30, cache: 0.075, output: 2.5, short: 'flash-3.8-high', family: 'Gemini' },
  'gemini-3.8-flash-medium': { input: 0.20, cache: 0.05, output: 1.5, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.8-flash-low': { input: 0.10, cache: 0.025, output: 0.8, short: 'flash-3.8-low', family: 'Gemini' },
  'claude-opus-4-6-thinking': { input: 15.0, cache: 1.50, output: 75.0, short: 'opus', family: 'Claude' },
  'claude-sonnet-4-6': { input: 3.0, cache: 0.30, output: 15.0, short: 'sonnet', family: 'Claude' },
  'gpt-oss-120b-medium': { input: 1.0, cache: 0.25, output: 4.0, short: 'gpt-oss', family: 'GPT' },
};

// Fallback placeholder -> modelId mapping
const PLACEHOLDER_MAP = {
  MODEL_PLACEHOLDER_M417: { modelId: 'gemini-4-argon-high', label: 'Gemini 4 Argon (High)' },
  MODEL_PLACEHOLDER_M418: { modelId: 'gemini-4-argon-medium', label: 'Gemini 4 Argon (Medium)' },
  MODEL_PLACEHOLDER_M419: { modelId: 'gemini-4-argon-low', label: 'Gemini 4 Argon (Low)' },
  MODEL_PLACEHOLDER_M318: { modelId: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
  MODEL_PLACEHOLDER_M319: { modelId: 'gemini-3.8-flash-medium', label: 'Gemini 3.8 Flash (Medium)' },
  MODEL_PLACEHOLDER_M320: { modelId: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (Low)' },
  MODEL_PLACEHOLDER_M26: { modelId: 'claude-opus-4-6-thinking', label: 'Claude Opus 4.6 (Thinking)' },
  MODEL_PLACEHOLDER_M35: { modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' },
  MODEL_OPENAI_GPT_OSS_120B_MEDIUM: { modelId: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B (Medium)' },
};

// In-memory cache of trajectory step usage: cascadeId -> { signature, steps }
const CACHE_SCHEMA_VERSION = 'v2';
let trajectoryCache = loadJson(CACHE_FILE, {});
const inFlightRequests = new Map();
let quotaSummaryCache = { ts: 0, data: null };

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
  return { ...DEFAULT_SETTINGS, ...loadJson(SETTINGS_FILE, {}) };
}

function parseIsoMs(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return 0;
  const baseMs = Date.parse(isoStr);
  if (!baseMs || Number.isNaN(baseMs)) return 0;
  const match = isoStr.match(/\.(\d+)Z$/);
  if (!match) return baseMs;
  const fracSec = Number(`0.${match[1]}`);
  const wholeSecMs = Math.floor(baseMs / 1000) * 1000;
  return wholeSecMs + fracSec * 1000;
}

function parseDurationSec(durStr) {
  if (!durStr || typeof durStr !== 'string') return 0;
  const n = Number.parseFloat(durStr);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function callLsRpc(method, body = {}) {
  const res = await fetch(
    `http://${LS_ADDR}/exa.language_server_pb.LanguageServerService/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': CSRF_TOKEN,
      },
      body: JSON.stringify(body),
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
  if (!forceRefresh && quotaSummaryCache.data && now - quotaSummaryCache.ts < 8000) {
    return quotaSummaryCache.data;
  }
  try {
    const res = await callLsRpc('RetrieveUserQuotaSummary', {});
    if (res?.response?.groups) {
      quotaSummaryCache = { ts: now, data: res.response };
      return res.response;
    }
  } catch (err) {
    console.error(`RetrieveUserQuotaSummary failed: ${err.message}`);
  }
  return quotaSummaryCache.data;
}

function resolveModelInfo(rawModelKey, dynamicModelMap) {
  const dyn = dynamicModelMap.get(rawModelKey) || PLACEHOLDER_MAP[rawModelKey] || {
    modelId: rawModelKey || 'unknown',
    label: rawModelKey || 'Unknown Model',
  };
  const pricing = MODEL_PRICING[dyn.modelId] || {
    input: 1.0,
    cache: 0.25,
    output: 5.0,
    short: (dyn.label || 'model').split(' ')[0].toLowerCase(),
    family: 'Other',
  };
  return {
    rawModel: rawModelKey,
    modelId: dyn.modelId,
    label: dyn.label,
    shortName: pricing.short,
    family: pricing.family,
    pricing,
  };
}

function computeStepCost(step, pricing) {
  const inCost = (step.inputTokens / 1_000_000) * pricing.input;
  const cacheCost = (step.cacheReadTokens / 1_000_000) * pricing.cache;
  const outCost = (step.outputTokens / 1_000_000) * pricing.output;
  return inCost + cacheCost + outCost;
}

function extractModelSteps(rawSteps = []) {
  const parsed = [];
  rawSteps.forEach((s, idx) => {
    const m = s?.metadata;
    const u = m?.modelUsage;
    if (!u) return;

    const p = s?.plannerResponse || {};
    const inputTokens = Number(u.inputTokens || 0);
    const cacheReadTokens = Number(u.cacheReadTokens || 0);
    const outputTokens = Number(u.outputTokens || 0);
    const thinkingTokens = Number(u.thinkingOutputTokens || 0);
    const responseTokens = Number(
      u.responseOutputTokens || Math.max(0, outputTokens - thinkingTokens)
    );

    const createdAtMs = parseIsoMs(m.createdAt);
    const viewableAtMs = parseIsoMs(m.viewableAt || m.createdAt) || createdAtMs;
    const finishedAtMs =
      parseIsoMs(m.finishedGeneratingAt || m.completedAt || m.viewableAt || m.createdAt) ||
      viewableAtMs;

    const rawViewableSec =
      createdAtMs > 0 && viewableAtMs >= createdAtMs
        ? Math.max(0.05, (viewableAtMs - createdAtMs) / 1000)
        : 0;
    const afterViewableSec =
      viewableAtMs > 0 && finishedAtMs > viewableAtMs
        ? (finishedAtMs - viewableAtMs) / 1000
        : 0;
    const totalDurationSec =
      createdAtMs > 0 && finishedAtMs > createdAtMs
        ? (finishedAtMs - createdAtMs) / 1000
        : 0;

    const thinkingDurationSec = parseDurationSec(p.thinkingDuration);
    const respText = String(p.modifiedResponse || p.response || '').trim();
    const hasVisibleText = respText.length > 0;

    let streamTokens = responseTokens;
    let streamDurationSec = 0;
    const ttftSec = rawViewableSec;

    if (hasVisibleText) {
      const postThinkingSec =
        thinkingDurationSec > 0 && totalDurationSec > thinkingDurationSec
          ? totalDurationSec - thinkingDurationSec
          : afterViewableSec;

      if (
        postThinkingSec >= 0.25 &&
        responseTokens > 0 &&
        responseTokens / postThinkingSec <= 240
      ) {
        streamTokens = responseTokens;
        streamDurationSec = postThinkingSec;
      } else if (
        afterViewableSec >= 0.5 &&
        outputTokens > 0 &&
        outputTokens / afterViewableSec <= 240
      ) {
        streamTokens = outputTokens;
        streamDurationSec = afterViewableSec;
      } else {
        streamTokens = outputTokens;
        streamDurationSec = totalDurationSec;
      }
    } else if (
      afterViewableSec >= 2.0 &&
      totalDurationSec > 0 &&
      afterViewableSec / totalDurationSec >= 0.35 &&
      outputTokens / afterViewableSec <= 240
    ) {
      streamTokens = outputTokens;
      streamDurationSec = afterViewableSec;
    } else {
      streamTokens = outputTokens;
      streamDurationSec = totalDurationSec;
    }

    const totalTokPerSec =
      totalDurationSec >= 0.12 && outputTokens > 0 ? outputTokens / totalDurationSec : 0;
    const streamTokPerSec =
      streamDurationSec >= 0.12 && streamTokens > 0
        ? streamTokens / streamDurationSec
        : totalTokPerSec;

    parsed.push({
      stepIndex: s?.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? idx,
      modelKey: u.model || m.generatorModel || 'MODEL_PLACEHOLDER_M418',
      createdAt: m.createdAt || null,
      createdAtMs: Math.floor(createdAtMs),
      hasVisibleText,
      inputTokens,
      cacheReadTokens,
      outputTokens,
      thinkingTokens,
      responseTokens,
      streamTokens,
      thinkingDurationSec: +thinkingDurationSec.toFixed(3),
      ttftSec: +ttftSec.toFixed(3),
      streamDurationSec: +streamDurationSec.toFixed(3),
      totalDurationSec: +totalDurationSec.toFixed(3),
      streamTokPerSec,
      totalTokPerSec,
    });
  });
  return parsed;
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

async function buildTelemetryPayloadInternal(requestedConvId, forceQuotaRefresh = false) {
  const settings = loadSettings();
  const [userStatusRes, allTrajRes, officialQuota] = await Promise.all([
    callLsRpc('GetUserStatus', {}).catch(() => ({})),
    callLsRpc('GetAllCascadeTrajectories', {}).catch(() => ({})),
    getOfficialQuotaSummary(forceQuotaRefresh),
  ]);

  const userStatus = userStatusRes?.userStatus || {};
  const clientConfigs = userStatus?.cascadeModelConfigData?.clientModelConfigs || [];
  const dynamicModelMap = new Map();

  // Extract official real-time buckets from RetrieveUserQuotaSummary if available
  const officialBuckets = new Map();
  for (const grp of officialQuota?.groups || []) {
    for (const b of grp?.buckets || []) {
      if (b?.bucketId) {
        const remFrac = b.remainingFraction ?? 1;
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

    const remFrac = live5h?.remainingFraction ?? cfg?.quotaInfo?.remainingFraction ?? 1;
    const usedFrac = Math.max(0, Math.min(1, 1 - remFrac));
    const resetTime = live5h?.resetTime || cfg?.quotaInfo?.resetTime || null;

    const quotaItem = {
      label: cfg.label,
      modelId: cfg.modelId,
      rawKey,
      family: info.family,
      remainingPct: +(remFrac * 100).toFixed(1),
      remainingIntPct: Math.floor(remFrac * 100 + 1e-6),
      usedPct: +(usedFrac * 100).toFixed(1),
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

  // Enumerate all conversations
  const summariesObj = allTrajRes?.trajectorySummaries || {};
  const conversations = Object.entries(summariesObj)
    .map(([cascadeId, item]) => ({
      cascadeId,
      title: item?.annotations?.title || item?.summary || cascadeId.slice(0, 8),
      stepCount: Number(item?.stepCount || 0),
      status: item?.status || '',
      lastModifiedTime: item?.lastModifiedTime || item?.createdTime || '',
      lastModifiedMs: parseIsoMs(item?.lastModifiedTime || item?.createdTime || ''),
    }))
    .sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);

  // Pick active conversation: requestedConvId if valid, else most recently modified conversation
  const activeConvSummary =
    conversations.find((c) => c.cascadeId === requestedConvId) ||
    conversations[0] ||
    null;
  const activeCascadeId = activeConvSummary?.cascadeId || requestedConvId || null;

  // Refresh trajectory cache for recent conversations (modified within last 8 days)
  const eightDaysAgoMs = Date.now() - 8 * 24 * 3600 * 1000;
  let cacheDirty = false;

  const toFetch = conversations.filter((conv) => {
    if (conv.lastModifiedMs < eightDaysAgoMs && conv.cascadeId !== activeCascadeId) {
      return false;
    }
    const sig = `${CACHE_SCHEMA_VERSION}:${conv.stepCount}:${conv.lastModifiedTime}`;
    const cached = trajectoryCache[conv.cascadeId];
    const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
    return !cached || cached.signature !== sig || isRunning || Boolean(cached.wasRunning);
  });

  // Fetch trajectories with bounded concurrency (up to 4 at a time)
  const CONCURRENCY = 4;
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (conv) => {
        const sig = `${CACHE_SCHEMA_VERSION}:${conv.stepCount}:${conv.lastModifiedTime}`;
        const isRunning = conv.status === 'CASCADE_RUN_STATUS_RUNNING';
        const prev = trajectoryCache[conv.cascadeId];
        try {
          const trajRes = await callLsRpc('GetCascadeTrajectory', { cascadeId: conv.cascadeId });
          const steps = extractModelSteps(trajRes?.trajectory?.steps || []);
          const prevLast = prev?.steps?.[prev.steps.length - 1];
          const nextLast = steps[steps.length - 1];
          const stepsChanged =
            !prev ||
            prev.signature !== sig ||
            Boolean(prev.wasRunning) !== isRunning ||
            prev.steps?.length !== steps.length ||
            prevLast?.outputTokens !== nextLast?.outputTokens ||
            prevLast?.totalDurationSec !== nextLast?.totalDurationSec;

          trajectoryCache[conv.cascadeId] = {
            signature: sig,
            title: conv.title,
            lastModifiedMs: conv.lastModifiedMs,
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
  const latestStep = activeSteps.length > 0 ? activeSteps[activeSteps.length - 1] : null;

  const useStreamSpeed = settings.speedMode !== 'total';
  let sessionSpeedNumeratorTokens = 0;
  let sessionSpeedDenominatorSec = 0;
  let sessionCostUsd = 0;
  let sessionInputTokens = 0;
  let sessionCacheReadTokens = 0;

  const enrichedActiveSteps = activeSteps.map((st) => {
    const mInfo = resolveModelInfo(st.modelKey, dynamicModelMap);
    const costUsd = computeStepCost(st, mInfo.pricing);
    const stepStreamTokens = st.streamTokens ?? st.outputTokens;
    const stepStreamSec = st.streamDurationSec > 0 ? st.streamDurationSec : st.totalDurationSec;

    if (useStreamSpeed) {
      sessionSpeedNumeratorTokens += stepStreamTokens;
      sessionSpeedDenominatorSec += stepStreamSec;
    } else {
      sessionSpeedNumeratorTokens += st.outputTokens;
      sessionSpeedDenominatorSec += st.totalDurationSec;
    }

    sessionCostUsd += costUsd;
    sessionInputTokens += st.inputTokens;
    sessionCacheReadTokens += st.cacheReadTokens;

    const tokPerSec = useStreamSpeed ? st.streamTokPerSec : st.totalTokPerSec;
    const totalPrompt = st.inputTokens + st.cacheReadTokens;
    const cacheHitPct = totalPrompt > 0 ? (st.cacheReadTokens / totalPrompt) * 100 : 0;

    return {
      ...st,
      modelLabel: mInfo.label,
      modelShort: mInfo.shortName,
      family: mInfo.family,
      tokPerSec: +tokPerSec.toFixed(1),
      ttftSec: +st.ttftSec.toFixed(1),
      cacheHitPct: +cacheHitPct.toFixed(1),
      costUsd: +costUsd.toFixed(4),
      contextTokens: st.inputTokens + st.cacheReadTokens + st.outputTokens,
    };
  });

  const latestEnriched =
    enrichedActiveSteps.length > 0 ? enrichedActiveSteps[enrichedActiveSteps.length - 1] : null;

  const sessionAvgTokPerSec =
    sessionSpeedDenominatorSec > 0.1
      ? +(sessionSpeedNumeratorTokens / sessionSpeedDenominatorSec).toFixed(1)
      : latestEnriched?.tokPerSec || 0;

  // Context breakdown from the latest step
  const ctxCached = latestEnriched?.cacheReadTokens || 0;
  const ctxFreshInput = latestEnriched?.inputTokens || 0;
  const ctxThinking = latestEnriched?.thinkingTokens || 0;
  const ctxResponse = latestEnriched?.responseTokens || 0;
  const ctxTotal = ctxCached + ctxFreshInput + ctxThinking + ctxResponse;
  const ctxLimit = Number(settings.contextWindowLimit || 1000000);
  const ctxPct = ctxLimit > 0 ? Math.min(100, +((ctxTotal / ctxLimit) * 100).toFixed(1)) : 0;

  // Cache hit rate (latest step & session-wide)
  const latestPromptTokens = ctxCached + ctxFreshInput;
  const latestCacheHitPct =
    latestPromptTokens > 0 ? Math.round((ctxCached / latestPromptTokens) * 100) : 0;
  const sessionPromptTokens = sessionCacheReadTokens + sessionInputTokens;
  const sessionCacheHitPct =
    sessionPromptTokens > 0 ? Math.round((sessionCacheReadTokens / sessionPromptTokens) * 100) : 0;

  // Aggregate Today & Weekly across all cached trajectories
  const startOfTodayMs = getStartOfLocalDayMs();
  const startOfWeekMs = getStartOfCurrentWeekMs();

  let todayTokens = 0;
  let todayCostUsd = 0;
  let todayCalls = 0;
  let weekTokens = 0;
  let weekCostUsd = 0;
  let weekCalls = 0;
  const perModelStats = new Map();

  for (const [, entry] of Object.entries(trajectoryCache)) {
    for (const st of entry?.steps || []) {
      const mInfo = resolveModelInfo(st.modelKey, dynamicModelMap);
      const stepTotalTokens = st.inputTokens + st.cacheReadTokens + st.outputTokens;
      const stepCost = computeStepCost(st, mInfo.pricing);

      if (st.createdAtMs >= startOfTodayMs) {
        todayTokens += stepTotalTokens;
        todayCostUsd += stepCost;
        todayCalls += 1;
      }
      if (st.createdAtMs >= startOfWeekMs) {
        weekTokens += stepTotalTokens;
        weekCostUsd += stepCost;
        weekCalls += 1;

        if (!perModelStats.has(mInfo.label)) {
          perModelStats.set(mInfo.label, {
            label: mInfo.label,
            shortName: mInfo.shortName,
            family: mInfo.family,
            calls: 0,
            inputTokens: 0,
            cacheReadTokens: 0,
            outputTokens: 0,
            speedTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            totalDurationSec: 0,
          });
        }
        const agg = perModelStats.get(mInfo.label);
        const stepStreamTokens = st.streamTokens ?? st.outputTokens;
        const stepStreamSec = st.streamDurationSec > 0 ? st.streamDurationSec : st.totalDurationSec;

        agg.calls += 1;
        agg.inputTokens += st.inputTokens;
        agg.cacheReadTokens += st.cacheReadTokens;
        agg.outputTokens += st.outputTokens;
        agg.speedTokens += useStreamSpeed ? stepStreamTokens : st.outputTokens;
        agg.totalTokens += stepTotalTokens;
        agg.costUsd += stepCost;
        agg.totalDurationSec += useStreamSpeed ? stepStreamSec : st.totalDurationSec;
      }
    }
  }

  const rawActiveFamily = latestEnriched?.family || 'Gemini';
  const activePoolKey = rawActiveFamily === 'Gemini' ? 'Gemini' : 'Claude & GPT';
  const activeLive5h = officialBuckets.get(activePoolKey === 'Gemini' ? 'gemini-5h' : '3p-5h');
  const activeLiveWeekly = officialBuckets.get(
    activePoolKey === 'Gemini' ? 'gemini-weekly' : '3p-weekly'
  );
  const familyPoolQuota = quotaPoolsMap.get(activePoolKey);

  const activePoolQuota = familyPoolQuota || {
    poolName: activePoolKey === 'Gemini' ? 'Gemini 模型池' : 'Claude & GPT 模型池',
    family: activePoolKey,
    remainingPct: activeLive5h?.remainingPct ?? 100,
    remainingIntPct: activeLive5h?.remainingIntPct ?? 100,
    usedPct: activeLive5h?.usedPct ?? 0,
    resetTime: activeLive5h?.resetTime || null,
    weeklyRemainingPct: activeLiveWeekly?.remainingPct ?? 100,
    weeklyRemainingIntPct: activeLiveWeekly?.remainingIntPct ?? 100,
    weeklyUsedPct: activeLiveWeekly?.usedPct ?? 0,
    weeklyResetTime: activeLiveWeekly?.resetTime || null,
    models: [],
  };

  const fallbackWeeklyPct =
    settings.weeklyLimitMode === 'custom_cost' || settings.weeklyLimitMode === 'cost'
      ? Math.min(100, +((weekCostUsd / Math.max(1, settings.weeklyCostBudget)) * 100).toFixed(1))
      : Math.min(
          100,
          +((weekTokens / Math.max(1000, settings.weeklyTokenBudget)) * 100).toFixed(1)
        );

  const useOfficialWeekly =
    Boolean(activeLiveWeekly) &&
    settings.weeklyLimitMode !== 'custom_tokens' &&
    settings.weeklyLimitMode !== 'custom_cost';

  const weeklyUsedPct = useOfficialWeekly ? activeLiveWeekly.usedPct : fallbackWeeklyPct;
  const weeklyRemainingPct = useOfficialWeekly
    ? activeLiveWeekly.remainingPct
    : +(100 - fallbackWeeklyPct).toFixed(1);
  const weeklyRemainingIntPct = useOfficialWeekly
    ? activeLiveWeekly.remainingIntPct
    : Math.max(0, Math.floor(100 - fallbackWeeklyPct));

  // Extract genuine Google One AI credits if present (ignore legacy hardcoded 500 prompt credits)
  const g1CreditEntry = (userStatus?.userTier?.availableCredits || []).find(
    (c) => c?.creditType === 'GOOGLE_ONE_AI'
  );
  const realAiCredits = Number(g1CreditEntry?.creditAmount || 0);

  return {
    timestamp: new Date().toISOString(),
    settings,
    account: {
      name: userStatus?.name || '',
      tierName: userStatus?.userTier?.name || 'Google AI',
      planName: userStatus?.planStatus?.planInfo?.planName || 'Pro',
      aiCredits: realAiCredits > 0 ? realAiCredits : null,
    },
    conversations: conversations.slice(0, 20),
    activeConversation: {
      cascadeId: activeCascadeId,
      title: activeConvSummary?.title || '当前会话',
      isRunning: activeConvSummary?.status === 'CASCADE_RUN_STATUS_RUNNING',
      status: activeConvSummary?.status || 'IDLE',
      stepCount: enrichedActiveSteps.length,
      latestTokPerSec: latestEnriched?.tokPerSec ?? 0,
      latestTtftSec: latestEnriched?.ttftSec ?? 0,
      avgTokPerSec: sessionAvgTokPerSec,
      sessionCostUsd: +sessionCostUsd.toFixed(2),
      latestCacheHitPct,
      sessionCacheHitPct,
      activeModelShort: latestEnriched?.modelShort || 'argon-4',
      activeModelLabel: latestEnriched?.modelLabel || 'Gemini 4 Argon (Medium)',
      context: {
        totalTokens: ctxTotal,
        limitTokens: ctxLimit,
        usedPct: ctxPct,
        cachedTokens: ctxCached,
        freshInputTokens: ctxFreshInput,
        thinkingTokens: ctxThinking,
        responseTokens: ctxResponse,
      },
      recentSteps: enrichedActiveSteps.slice(-15).reverse(),
    },
    quotas: {
      activePool: activePoolQuota,
      pools: Array.from(quotaPoolsMap.values()).sort((a, b) => {
        const order = { Gemini: 0, 'Claude & GPT': 1 };
        return (order[a.family] ?? 99) - (order[b.family] ?? 99);
      }),
      models: modelQuotas.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      weekly: {
        isOfficial: useOfficialWeekly,
        calls: weekCalls,
        tokens: weekTokens,
        costUsd: +weekCostUsd.toFixed(2),
        usedPct: weeklyUsedPct,
        remainingPct: weeklyRemainingPct,
        remainingIntPct: weeklyRemainingIntPct,
        resetTime: useOfficialWeekly
          ? activeLiveWeekly.resetTime
          : getNextMondayResetIso(),
      },
      today: {
        calls: todayCalls,
        tokens: todayTokens,
        costUsd: +todayCostUsd.toFixed(2),
      },
    },
    modelBreakdown: Array.from(perModelStats.values())
      .sort((a, b) => b.calls - a.calls || String(a.label).localeCompare(String(b.label)))
      .map((m) => ({
        ...m,
        costUsd: +m.costUsd.toFixed(3),
        avgTokPerSec:
          m.totalDurationSec > 0.1
            ? +((m.speedTokens ?? m.outputTokens) / m.totalDurationSec).toFixed(1)
            : 0,
      })),
  };
}

function buildTelemetryPayload(requestedConvId, forceQuotaRefresh = false) {
  const key = `${requestedConvId || '__auto__'}::${forceQuotaRefresh ? 'force' : 'normal'}`;
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const p = buildTelemetryPayloadInternal(requestedConvId, forceQuotaRefresh).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------
// Sidecar Server Setup
// ---------------------------------------------------------------------------

const app = new SidecarApp();
const readLocal = (name) => readFileSync(join(HERE, name), 'utf8');

app.page('/', () => readLocal('index.html'));
app.page('/app.js', () => readLocal('app.js'));
app.api(
  '/styles.css',
  () => new Response(readLocal('styles.css'), { contentType: 'text/css' }),
  'GET'
);

app.api(
  '/api/telemetry',
  async (data) => {
    const convId = data?.conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID || '';
    const force = data?.force === '1' || data?.force === true;
    return buildTelemetryPayload(convId, force);
  },
  'GET'
);

app.api('/api/settings', (data) => {
  const current = loadSettings();
  const updated = {
    ...current,
    contextWindowLimit: Number(data.contextWindowLimit || current.contextWindowLimit),
    weeklyTokenBudget: Number(data.weeklyTokenBudget || current.weeklyTokenBudget),
    weeklyCostBudget: Number(data.weeklyCostBudget || current.weeklyCostBudget),
    weeklyLimitMode: data.weeklyLimitMode || current.weeklyLimitMode,
    speedMode: data.speedMode || current.speedMode,
  };
  saveJson(SETTINGS_FILE, updated);
  return updated;
});

app.run();
