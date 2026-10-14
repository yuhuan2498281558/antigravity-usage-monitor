// Client-observed request throughput, including waiting and thinking.
// One formula for text and tools; no rate-based clipping or denominator changes.
export const MEASUREMENT_VERSION = 2;
export const MIN_SPEED_DURATION_SECONDS = 0.5;
export const MIN_MEAN_OUTPUT_TOKENS = 50;

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
    const thinkingTokens = Number(p.thinkingTokens ?? u.thinkingOutputTokens ?? chat?.usage?.thinkingOutputTokens ?? 0);
    const responseTokens = Number(p.responseTokens ?? u.responseOutputTokens ?? chat?.usage?.responseOutputTokens ?? Math.max(0, outputTokens - thinkingTokens));
    const start = parseIsoMs(m.createdAt);
    const end = parseIsoMs(m.finishedGeneratingAt || m.completedAt);
    const explicitlyIncomplete = Boolean(s.status && s.status !== 'CORTEX_STEP_STATUS_DONE');
    const complete = !explicitlyIncomplete && start > 0 && end >= start;
    const totalDurationSec = complete ? elapsed(start, end) : null;
    const nativeTtftSec = duration(chat?.timeToFirstToken);
    // These phase timers remain diagnostic only: buffered tools can make them
    // tiny, so neither is used as a divisor or subtracted from request time.
    const nativeStreamSec = duration(chat?.streamingDuration);
    const thinkingDurationSec = duration(p.thinkingDuration);
    let timingReason = null;
    if (!complete || !(totalDurationSec > 0)) timingReason = 'incomplete_or_invalid_timing';
    else if (!validCount(u.outputTokens)) timingReason = 'invalid_output_tokens';
    else if (totalDurationSec < MIN_SPEED_DURATION_SECONDS) timingReason = 'short_timing';
    const totalTokPerSec = timingReason === null ? outputTokens / totalDurationSec : null;
    const shortOutputSample = totalTokPerSec !== null && outputTokens < MIN_MEAN_OUTPUT_TOKENS;
    const speedReason = timingReason || (isCompactionStep ? 'compaction' : shortOutputSample ? 'short_sample' : null);
    const context = chat?.chatStartMetadata?.contextWindowMetadata;
    result.push({
      stepIndex, isCompactionStep,
      modelKey: u.model || chat?.model || m.generatorModel || 'MODEL_PLACEHOLDER_M418',
      apiProvider: u.apiProvider || chat?.usage?.apiProvider || '',
      createdAt: m.createdAt || null, createdAtMs: Math.floor(start),
      hasVisibleText: String(p.modifiedResponse || p.response || '').trim().length > 0,
      hasToolCalls: Array.isArray(p.toolCalls) && p.toolCalls.length > 0,
      inputTokens, cacheReadTokens, outputTokens, thinkingTokens, responseTokens,
      estimatedContextTokens: Number(context?.estimatedTokensUsed || 0),
      maxContextBudgetTokens: Number(context?.maxContextTokens || 256000),
      measurementVersion: MEASUREMENT_VERSION,
      isComplete: complete, nativeTtftSec, nativeStreamSec,
      viewableDelaySec: elapsed(start, parseIsoMs(m.viewableAt)),
      ttftSec: nativeTtftSec, ttftSource: nativeTtftSec === null ? 'unavailable' : 'native',
      thinkingDurationSec, totalDurationSec, totalTokPerSec,
      speedBasis: totalTokPerSec === null ? 'unavailable' : 'request_total',
      speedSampleEligible: totalTokPerSec !== null && !shortOutputSample && !isCompactionStep,
      speedReason,
    });
  });
  return result;
}

export function normalizeCachedStep(step) {
  if (step.measurementVersion === MEASUREMENT_VERSION) return step;
  // Keep billing through failed reloads, but never show old derived speeds as
  // current measurements. Raw trajectories rebuild measurements after migration.
  return {
    ...step, measurementVersion: null, isComplete: false,
    nativeTtftSec: null, nativeStreamSec: null, viewableDelaySec: null,
    ttftSec: null, ttftSource: 'unavailable', thinkingDurationSec: null,
    totalDurationSec: null, totalTokPerSec: null,
    streamDurationSec: null, streamTokens: null, streamTokPerSec: null,
    speedBasis: 'unavailable', speedSampleEligible: false, speedReason: 'legacy_cache',
  };
}

export function speedMetric(step) {
  const missing = (reason) => ({ value: null, tokens: 0, seconds: 0, eligible: false, reason });
  if (step.measurementVersion !== MEASUREMENT_VERSION) return missing('legacy_cache');
  if (!step.isComplete || !Number.isFinite(step.totalTokPerSec) ||
      !(step.totalDurationSec >= MIN_SPEED_DURATION_SECONDS)) {
    return missing(step.speedReason || 'incomplete_or_invalid_timing');
  }
  return { value: step.totalTokPerSec, tokens: step.outputTokens, seconds: step.totalDurationSec,
    eligible: step.speedSampleEligible === true && !step.isCompactionStep, reason: step.speedReason };
}

export function createSpeedAccumulator() {
  return { tokens: 0, seconds: 0, sampleCount: 0, excludedCount: 0, excludedReasons: {} };
}

export function accumulateSpeed(acc, step) {
  if (step.isCompactionStep) return;
  const metric = speedMetric(step);
  if (metric.eligible) {
    acc.tokens += metric.tokens;
    acc.seconds += metric.seconds;
    acc.sampleCount++;
  } else {
    acc.excludedCount++;
    acc.excludedReasons[metric.reason] = (acc.excludedReasons[metric.reason] || 0) + 1;
  }
}

export function finishSpeed(acc) {
  return { ...acc, avgTokPerSec: acc.seconds > 0 ? acc.tokens / acc.seconds : null };
}

export function summarizeSpeed(steps) {
  const acc = createSpeedAccumulator();
  for (const step of steps) accumulateSpeed(acc, step);
  return finishSpeed(acc);
}

export function summarizeTtft(steps) {
  const values = steps.filter(s => !s.isCompactionStep && s.measurementVersion === MEASUREMENT_VERSION &&
    Number.isFinite(s.nativeTtftSec) && s.nativeTtftSec >= 0).map(s => s.nativeTtftSec);
  return { sampleCount: values.length, avgSec: values.length ? values.reduce((a,b) => a+b,0) / values.length : null };
}
