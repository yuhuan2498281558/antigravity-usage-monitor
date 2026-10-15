// Client-observed request throughput, including waiting and thinking.
// One formula for text and tools; no rate-based clipping or denominator changes.
export const MEASUREMENT_VERSION = 4;
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
  return (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

// Subtract timestamps before converting to Number so epoch-sized floats do not
// round a 499,999,999 ns request up across the 0.5 second validity threshold.
function timestampNs(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const ms = Date.parse(match[1] + match[3]);
  return Number.isFinite(ms) ? BigInt(ms) * 1_000_000n + BigInt((match[2] || '').padEnd(9, '0')) : null;
}

function requestDuration(startValue, endValue) {
  const start = timestampNs(startValue), end = timestampNs(endValue);
  return start !== null && end !== null && start > 0n && end >= start
    ? Number(end - start) / 1e9 : null;
}

function elapsed(start, end) {
  return start > 0 && end >= start ? (end - start) / 1000 : null;
}

function estimateUtf8Tokens(text) {
  if (typeof text !== 'string' || !text) return 0;
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 3);
}

function classifyPromptSection(name) {
  const key = String(name || '').trim().toLowerCase();
  if (key === 'skills' || key === 'skill') return 'skills';
  if (key === 'user_rules' || key === 'user_rule' || key === 'rules') return 'userRules';
  if (key === 'mcp_servers' || key === 'mcp' || key.startsWith('mcp_')) return 'mcpTools';
  return 'systemPrompt';
}

function isMcpToolItem(name, source = '', type = '') {
  const n = String(name || '').trim().toLowerCase();
  const src = String(source || '').toUpperCase();
  const t = String(type || '').toUpperCase();
  return (
    src.includes('MCP') ||
    t.includes('MCP') ||
    n.startsWith('mcp_') ||
    n.startsWith('mcp-') ||
    n === 'call_mcp_tool' ||
    n === 'list_mcp_resources' ||
    n === 'read_mcp_resource'
  );
}

export function extractContextBreakdown(chat) {
  if (!chat || typeof chat !== 'object') return null;
  const tb = chat?.chatStartMetadata?.contextWindowMetadata?.tokenBreakdown;
  const groups = Array.isArray(tb?.groups) ? tb.groups : [];
  const promptSections = Array.isArray(chat?.promptSections) ? chat.promptSections : [];
  const tools = Array.isArray(chat?.tools) ? chat.tools : [];
  const messagePrompts = Array.isArray(chat?.messagePrompts) ? chat.messagePrompts : [];

  if (!groups.length && !promptSections.length && !tools.length && !messagePrompts.length) {
    return null;
  }

  let messagesTokens = 0;
  let systemToolsTokens = 0;
  let mcpToolsTokens = 0;
  let skillsTokens = 0;
  let systemPromptTokens = 0;
  let userRulesTokens = 0;

  let hasPromptGroup = false;
  let hasToolsGroup = false;
  let hasMessagesGroup = false;

  for (const g of groups) {
    const gType = String(g?.type || '').toUpperCase();
    const gName = String(g?.name || '').trim().toLowerCase();
    const gSource = String(g?.source || '').toUpperCase();
    const gTokens = Math.max(0, Number(g?.numTokens || 0));
    const children = Array.isArray(g?.children) ? g.children : [];

    if (gType === 'TOKEN_TYPE_SYSTEM_PROMPT' || gName === 'system prompt') {
      hasPromptGroup = true;
      if (children.length > 0) {
        let childSum = 0;
        for (const c of children) {
          const tok = Math.max(0, Number(c?.numTokens || 0));
          childSum += tok;
          const bucket = classifyPromptSection(c?.name ?? c?.title);
          if (bucket === 'skills') skillsTokens += tok;
          else if (bucket === 'userRules') userRulesTokens += tok;
          else if (bucket === 'mcpTools') mcpToolsTokens += tok;
          else systemPromptTokens += tok;
        }
        if (gTokens > childSum) {
          systemPromptTokens += gTokens - childSum;
        }
      } else {
        systemPromptTokens += gTokens;
      }
    } else if (
      gType === 'TOKEN_TYPE_TOOLS' ||
      gName === 'tools' ||
      gType.includes('MCP') ||
      gSource.includes('MCP')
    ) {
      hasToolsGroup = true;
      if (children.length > 0) {
        let childSum = 0;
        for (const c of children) {
          const tok = Math.max(0, Number(c?.numTokens || 0));
          childSum += tok;
          if (isMcpToolItem(c?.name, c?.source || g?.source, c?.type || g?.type)) {
            mcpToolsTokens += tok;
          } else {
            systemToolsTokens += tok;
          }
        }
        if (gTokens > childSum) {
          if (isMcpToolItem(g?.name, g?.source, g?.type)) mcpToolsTokens += gTokens - childSum;
          else systemToolsTokens += gTokens - childSum;
        }
      } else if (isMcpToolItem(g?.name, g?.source, g?.type)) {
        mcpToolsTokens += gTokens;
      } else {
        systemToolsTokens += gTokens;
      }
    } else if (
      gType === 'TOKEN_TYPE_CHAT_MESSAGES' ||
      gName === 'chat messages' ||
      gName === 'messages'
    ) {
      hasMessagesGroup = true;
      if (gTokens > 0) {
        messagesTokens += gTokens;
      } else {
        for (const c of children) {
          messagesTokens += Math.max(0, Number(c?.numTokens || 0));
        }
      }
    }
  }

  if (!hasPromptGroup && promptSections.length > 0) {
    for (const s of promptSections) {
      const tok =
        Number.isFinite(Number(s?.numTokens)) && Number(s?.numTokens) >= 0
          ? Number(s.numTokens)
          : estimateUtf8Tokens(s?.content ?? s?.text ?? '');
      const bucket = classifyPromptSection(s?.title ?? s?.name);
      if (bucket === 'skills') skillsTokens += tok;
      else if (bucket === 'userRules') userRulesTokens += tok;
      else if (bucket === 'mcpTools') mcpToolsTokens += tok;
      else systemPromptTokens += tok;
    }
  }

  if (!hasToolsGroup && tools.length > 0) {
    for (const t of tools) {
      const rawText = `${t?.name || ''}${t?.description || ''}${t?.jsonSchemaString || ''}`;
      const tok =
        Number.isFinite(Number(t?.numTokens)) && Number(t?.numTokens) >= 0
          ? Number(t.numTokens)
          : estimateUtf8Tokens(rawText);
      if (isMcpToolItem(t?.name, t?.source, t?.type)) {
        mcpToolsTokens += tok;
      } else {
        systemToolsTokens += tok;
      }
    }
  }

  if (!hasMessagesGroup && messagePrompts.length > 0) {
    for (const m of messagePrompts) {
      const tok =
        Number.isFinite(Number(m?.numTokens)) && Number(m?.numTokens) >= 0
          ? Number(m.numTokens)
          : estimateUtf8Tokens(m?.prompt ?? m?.content ?? '');
      messagesTokens += tok;
    }
  }

  const totalTokens =
    messagesTokens +
    systemToolsTokens +
    mcpToolsTokens +
    skillsTokens +
    systemPromptTokens +
    userRulesTokens;

  return {
    messagesTokens,
    systemToolsTokens,
    mcpToolsTokens,
    skillsTokens,
    systemPromptTokens,
    userRulesTokens,
    totalTokens,
  };
}

export function extractModelSteps(rawSteps = [], generatorMetadata = []) {
  const genByStep = new Map();
  let latestBreakdownChat = null;
  for (const gm of generatorMetadata || []) {
    if (!gm?.chatModel) continue;
    for (const index of gm?.stepIndices || []) genByStep.set(Number(index), gm);
    if (extractContextBreakdown(gm.chatModel)) {
      latestBreakdownChat = gm.chatModel;
    }
  }
  const result = [];
  rawSteps.forEach((s, index) => {
    const m = s?.metadata;
    const u = m?.modelUsage || m?.retryInfos?.[0]?.usage;
    if (!u) return;
    const stepIndex = m.sourceTrajectoryStepInfo?.stepIndex ?? index;
    const inlineChat = Array.isArray(m.generatorMetadata) ? m.generatorMetadata.find(g => g?.chatModel) : null;
    const gm = inlineChat || genByStep.get(Number(stepIndex));
    const chat = gm?.chatModel;
    const p = s.plannerResponse || {};
    const isCompactionStep = s.type === 'CORTEX_STEP_TYPE_CHECKPOINT';
    const inputTokens = Number(u.inputTokens || 0);
    const cacheReadTokens = Number(u.cacheReadTokens || 0);
    const outputTokens = Number(u.outputTokens || 0);
    const thinkingTokens = Number(p.thinkingTokens ?? u.thinkingOutputTokens ?? chat?.usage?.thinkingOutputTokens ?? 0);
    const responseTokens = Number(p.responseTokens ?? u.responseOutputTokens ?? chat?.usage?.responseOutputTokens ?? Math.max(0, outputTokens - thinkingTokens));
    const start = parseIsoMs(m.createdAt);
    const measuredDuration = requestDuration(m.createdAt, m.finishedGeneratingAt || m.completedAt);
    const explicitlyIncomplete = Boolean(s.status && s.status !== 'CORTEX_STEP_STATUS_DONE');
    const complete = !explicitlyIncomplete && measuredDuration !== null;
    const totalDurationSec = complete ? measuredDuration : null;
    const nativeTtftSec = duration(chat?.timeToFirstToken);
    // These phase timers remain diagnostic only: buffered tools can make them
    // tiny, so neither is used as a divisor or subtracted from request time.
    const nativeStreamSec = duration(chat?.streamingDuration);
    const thinkingDurationSec = duration(p.thinkingDuration);
    let timingReason = null;
    if (!complete || !(totalDurationSec > 0)) timingReason = 'incomplete_or_invalid_timing';
    else if (!validCount(u.outputTokens)) timingReason = 'invalid_output_tokens';
    else if (totalDurationSec < MIN_SPEED_DURATION_SECONDS) timingReason = 'short_timing';
    else if (nativeTtftSec !== null && nativeTtftSec > totalDurationSec + 0.01) timingReason = 'inconsistent_timing';
    const totalTokPerSec = timingReason === null ? outputTokens / totalDurationSec : null;
    const shortOutputSample = totalTokPerSec !== null && outputTokens < MIN_MEAN_OUTPUT_TOKENS;
    const speedReason = timingReason || (isCompactionStep ? 'compaction' : shortOutputSample ? 'short_sample' : null);
    const context = chat?.chatStartMetadata?.contextWindowMetadata;
    const contextBreakdown = extractContextBreakdown(chat);
    result.push({
      stepIndex, isCompactionStep,
      modelKey: u.model || chat?.model || m.generatorModel || 'MODEL_PLACEHOLDER_M418',
      apiProvider: u.apiProvider || chat?.usage?.apiProvider || '',
      createdAt: m.createdAt || null, createdAtMs: Math.floor(start),
      hasVisibleText: String(p.modifiedResponse || p.response || '').trim().length > 0,
      hasToolCalls: Array.isArray(p.toolCalls) && p.toolCalls.length > 0,
      inputTokens, cacheReadTokens, outputTokens, thinkingTokens, responseTokens,
      estimatedContextTokens: Number(context?.estimatedTokensUsed || contextBreakdown?.totalTokens || 0),
      maxContextBudgetTokens: Number(context?.maxContextTokens || 256000),
      contextBreakdown,
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
  if (result.length > 0 && !result[result.length - 1].contextBreakdown && latestBreakdownChat) {
    const lastStep = result[result.length - 1];
    const fallbackBreakdown = extractContextBreakdown(latestBreakdownChat);
    const fallbackCtx = latestBreakdownChat?.chatStartMetadata?.contextWindowMetadata;
    lastStep.contextBreakdown = fallbackBreakdown;
    if (!lastStep.estimatedContextTokens) {
      lastStep.estimatedContextTokens = Number(
        fallbackCtx?.estimatedTokensUsed || fallbackBreakdown?.totalTokens || 0
      );
    }
    if (fallbackCtx?.maxContextTokens) {
      lastStep.maxContextBudgetTokens = Number(fallbackCtx.maxContextTokens);
    }
  }
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
    phaseDurationSec: null, phaseTokPerSec: null, phaseReason: 'legacy_cache', answerStartDelaySec: null,
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
    s.isComplete && Number.isFinite(s.totalDurationSec) &&
    Number.isFinite(s.nativeTtftSec) && s.nativeTtftSec >= 0 &&
    s.nativeTtftSec <= s.totalDurationSec + 0.01).map(s => s.nativeTtftSec);
  return { sampleCount: values.length, avgSec: values.length ? values.reduce((a,b) => a+b,0) / values.length : null };
}
