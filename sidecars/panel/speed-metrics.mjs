// Client-observed timing estimates, not server-side decoding benchmarks.
export const MEASUREMENT_VERSION = 1;
export const MIN_MEAN_RESPONSE_TOKENS = 50;
export const MIN_MEAN_RESPONSE_SECONDS = 0.5;

export function parseIsoMs(value) {
  if (typeof value !== 'string' || !value) return 0;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return 0;
  const fraction = value.match(/\.(\d+)Z$/);
  return fraction ? Math.floor(ms / 1000) * 1000 + Number(`0.${fraction[1]}`) * 1000 : ms;
}

function duration(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?s$/.test(value)) return null;
  const n = Number(value.slice(0, -1));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validCount(value) {
  return value !== undefined && value !== null && value !== '' &&
    Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

function elapsed(start, end) {
  return start > 0 && end >= start ? (end - start) / 1000 : null;
}

export function extractModelSteps(rawSteps = [], generatorMetadata = []) {
  const genByStep = new Map();
  for (const gm of generatorMetadata || []) {
    for (const index of gm?.stepIndices || []) genByStep.set(Number(index), gm);
  }
  const result = [];
  rawSteps.forEach((s, index) => {
    const m = s?.metadata;
    const u = m?.modelUsage || m?.retryInfos?.[0]?.usage;
    if (!u) return;
    const stepIndex = m.sourceTrajectoryStepInfo?.stepIndex ?? index;
    const gm = m.generatorMetadata?.[0] || genByStep.get(Number(stepIndex)) || genByStep.get(index);
    const chat = gm?.chatModel;
    const p = s.plannerResponse || {};
    const isCompactionStep = s.type === 'CORTEX_STEP_TYPE_CHECKPOINT';
    const inputTokens = Number(u.inputTokens || 0);
    const cacheReadTokens = Number(u.cacheReadTokens || 0);
    const outputTokens = Number(u.outputTokens || 0);
    const rawThinking = p.thinkingTokens ?? u.thinkingOutputTokens ?? chat?.usage?.thinkingOutputTokens;
    const thinkingTokens = Number(rawThinking ?? 0);
    const rawResponse = p.responseTokens ?? u.responseOutputTokens ?? chat?.usage?.responseOutputTokens;
    const responseTokens = Number(rawResponse ?? Math.max(0, outputTokens - thinkingTokens));
    const breakdownKnown = validCount(rawResponse) || validCount(rawThinking);
    const hasVisibleText = String(p.modifiedResponse || p.response || '').trim().length > 0;
    const hasToolCalls = Array.isArray(p.toolCalls) && p.toolCalls.length > 0;
    const start = parseIsoMs(m.createdAt);
    const end = parseIsoMs(m.finishedGeneratingAt || m.completedAt);
    const explicitlyIncomplete = Boolean(s.status && s.status !== 'CORTEX_STEP_STATUS_DONE');
    const complete = !explicitlyIncomplete && start > 0 && end >= start;
    const totalDurationSec = complete ? elapsed(start, end) : null;
    const viewableDelaySec = elapsed(start, parseIsoMs(m.viewableAt));
    const nativeTtftSec = duration(chat?.timeToFirstToken);
    const nativeStreamSec = duration(chat?.streamingDuration);
    const thinkingDurationSec = duration(p.thinkingDuration);
    const totalTokPerSec = complete && totalDurationSec > 0 && validCount(u.outputTokens)
      ? outputTokens / totalDurationSec : null;

    let streamDurationSec = null;
    let responseTimingSource = null;
    let speedReason = null;
    if (isCompactionStep) speedReason = 'compaction';
    else if (!complete) speedReason = 'incomplete_or_invalid_timing';
    else if (hasToolCalls) speedReason = 'tool_timing_unavailable';
    else if (!hasVisibleText) speedReason = 'no_answer_text';
    else if (!breakdownKnown || !validCount(u.outputTokens) || !validCount(responseTokens) ||
      !validCount(thinkingTokens) || responseTokens <= 0 || responseTokens + thinkingTokens > outputTokens) {
      speedReason = 'token_breakdown_unavailable';
    } else if (thinkingTokens > 0) {
      if (thinkingDurationSec > 0 && thinkingDurationSec < totalDurationSec) {
        streamDurationSec = totalDurationSec - thinkingDurationSec;
        responseTimingSource = 'post_thinking_estimate';
      } else speedReason = 'answer_start_unavailable';
    } else if (responseTokens === outputTokens && nativeStreamSec > 0 && nativeStreamSec <= totalDurationSec + 0.001) {
      streamDurationSec = nativeStreamSec;
      responseTimingSource = 'native_text_stream';
    } else speedReason = 'answer_start_unavailable';

    const streamTokPerSec = streamDurationSec > 0 ? responseTokens / streamDurationSec : null;
    // Short samples retain their estimate. The threshold changes eligibility only,
    // never the formula or the displayed metric. There is no TPS-based clipping.
    const responseShortSample = streamTokPerSec !== null &&
      (responseTokens < MIN_MEAN_RESPONSE_TOKENS || streamDurationSec < MIN_MEAN_RESPONSE_SECONDS);
    if (responseShortSample) speedReason = 'short_sample';
    const context = chat?.chatStartMetadata?.contextWindowMetadata;
    result.push({
      stepIndex, isCompactionStep,
      modelKey: u.model || chat?.model || m.generatorModel || 'MODEL_PLACEHOLDER_M418',
      apiProvider: u.apiProvider || chat?.usage?.apiProvider || '',
      createdAt: m.createdAt || null, createdAtMs: Math.floor(start),
      hasVisibleText, hasToolCalls,
      inputTokens, cacheReadTokens, outputTokens, thinkingTokens, responseTokens,
      estimatedContextTokens: Number(context?.estimatedTokensUsed || 0),
      maxContextBudgetTokens: Number(context?.maxContextTokens || 256000),
      measurementVersion: MEASUREMENT_VERSION,
      isComplete: complete, nativeTtftSec, nativeStreamSec, viewableDelaySec,
      ttftSec: nativeTtftSec, ttftSource: nativeTtftSec === null ? 'unavailable' : 'native',
      thinkingDurationSec, totalDurationSec, streamDurationSec,
      streamTokens: streamTokPerSec === null ? null : responseTokens,
      totalTokPerSec, streamTokPerSec,
      speedBasis: streamTokPerSec === null ? 'unavailable' : 'response_estimate',
      responseTimingSource, responseShortSample,
      responseSampleEligible: streamTokPerSec !== null && !responseShortSample,
      speedReason,
    });
  });
  return result;
}

export function normalizeCachedStep(step) {
  if (step.measurementVersion === MEASUREMENT_VERSION) return step;
  // v5 did not retain the original TTFT or trustworthy phase boundaries. Keep
  // accounting, but do not reconstruct measurements from its derived values.
  return {
    ...step, measurementVersion: null, isComplete: false,
    nativeTtftSec: null, nativeStreamSec: null, viewableDelaySec: null,
    ttftSec: null, ttftSource: 'unavailable', thinkingDurationSec: null,
    totalDurationSec: null, streamDurationSec: null, streamTokens: null,
    totalTokPerSec: null, streamTokPerSec: null, speedBasis: 'unavailable',
    responseTimingSource: null, responseShortSample: false,
    responseSampleEligible: false, speedReason: 'legacy_cache',
  };
}

export function speedMetric(step, mode) {
  const missing = (reason) => ({ value: null, tokens: 0, seconds: 0, eligible: false, reason });
  if (step.measurementVersion !== MEASUREMENT_VERSION) return missing('legacy_cache');
  if (step.isCompactionStep) return missing('compaction');
  if (mode === 'total') {
    if (!Number.isFinite(step.totalTokPerSec) || !(step.totalDurationSec > 0) || !step.isComplete) {
      return missing('incomplete_or_invalid_timing');
    }
    return { value: step.totalTokPerSec, tokens: step.outputTokens, seconds: step.totalDurationSec, eligible: true, reason: null };
  }
  if (!Number.isFinite(step.streamTokPerSec) || !(step.streamDurationSec > 0)) return missing(step.speedReason || 'answer_start_unavailable');
  return {
    value: step.streamTokPerSec, tokens: step.streamTokens, seconds: step.streamDurationSec,
    eligible: step.responseSampleEligible === true, reason: step.speedReason,
  };
}

export function createSpeedAccumulator() {
  return { tokens: 0, seconds: 0, sampleCount: 0, excludedCount: 0, excludedReasons: {}, timingSources: {} };
}

export function accumulateSpeed(acc, step, mode) {
  if (step.isCompactionStep) return;
  const metric = speedMetric(step, mode);
  if (metric.eligible) {
    acc.tokens += metric.tokens;
    acc.seconds += metric.seconds;
    acc.sampleCount++;
    const source = mode === 'total' ? 'request_total' : step.responseTimingSource;
    acc.timingSources[source] = (acc.timingSources[source] || 0) + 1;
  } else {
    acc.excludedCount++;
    acc.excludedReasons[metric.reason] = (acc.excludedReasons[metric.reason] || 0) + 1;
  }
}

export function finishSpeed(acc) {
  return { ...acc, avgTokPerSec: acc.seconds > 0 ? acc.tokens / acc.seconds : null };
}

export function summarizeSpeed(steps, mode) {
  const acc = createSpeedAccumulator();
  for (const step of steps) accumulateSpeed(acc, step, mode);
  return finishSpeed(acc);
}

export function summarizeTtft(steps) {
  const values = steps.filter(s => !s.isCompactionStep && s.measurementVersion === MEASUREMENT_VERSION &&
    Number.isFinite(s.nativeTtftSec) && s.nativeTtftSec >= 0).map(s => s.nativeTtftSec);
  return { sampleCount: values.length, avgSec: values.length ? values.reduce((a,b) => a+b,0) / values.length : null };
}
