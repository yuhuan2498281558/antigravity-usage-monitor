/**
 * @fileoverview 遥测载荷组装器与并发请求合并入口。
 *
 * 将原来超过 1,000 行的 `buildTelemetryPayloadInternal` 拆解为清晰的子阶段：
 * 1. 拉取用户状态、轨迹摘要与官方实时配额摘要（含账号切换自动穿透缓存）；
 * 2. 调用 `buildOfficialQuotaPools` 构建动态模型映射与多模型配额池；
 * 3. 调用 `enumerateAndSyncConversations` 枚举会话并增量更新轨迹缓存；
 * 4. 调用 `enrichActiveConversationSteps` 与 `extractActiveContextTelemetry` 计算当前活跃会话指标与上下文拆解；
 * 5. 调用 `aggregateMultiWindowUsage` 完成全量多窗口聚合，并组装最终前端遥测 JSON。
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseIsoMs,
  speedMetric,
  summarizeSpeed,
  summarizeTtft,
} from '../speed-metrics.mjs';
import {
  HERE,
  inFlightRequests,
  loadSettings,
  quotaSummaryCache,
  roundMetric,
  trajectoryCache,
} from './config.mjs';
import { enumerateAndSyncConversations } from './local-scanner.mjs';
import { callLsRpc, diagnostics, getOfficialQuotaSummary } from './ls-rpc.mjs';
import {
  computeStepCost,
  isArgonModelIdentifier,
  resolveModelInfo,
} from './model-pricing.mjs';
import { getCloudStatus } from './pricing-catalog.mjs';
import { buildOfficialQuotaPools } from './quota-pools.mjs';
import {
  aggregateMultiWindowUsage,
  buildScopedModelBreakdown,
  getNextMondayResetIso,
} from './usage-aggregator.mjs';

const MAX_RECENT_CONVERSATIONS = 30;

/**
 * 构建全局 `modelKey -> responseModel` 已知映射表（单次轮询仅扫描一次 `trajectoryCache`）。
 *
 * @returns {Map<string, string>}
 */
function buildKnownUpstreamModelMap() {
  const knownUpstreamByModelKey = new Map();
  for (const entry of Object.values(trajectoryCache)) {
    for (const s of entry?.steps || []) {
      if (s?.modelKey && s.modelKey !== 'unknown' && s.responseModel) {
        knownUpstreamByModelKey.set(s.modelKey, s.responseModel);
      }
    }
  }
  return knownUpstreamByModelKey;
}

/**
 * 为当前活跃会话的步骤补充模型标签、上游响应模型、单步费用、缓存命中率与生成速率指标。
 *
 * @param {object[]} activeSteps 当前会话的原始缓存步骤
 * @param {Map<string, object>} dynamicModelMap 动态模型字典
 * @param {Map<string, string>} [sharedUpstreamMap=null] 预先构建的已知上游模型映射表
 */
export function enrichActiveConversationSteps(
  activeSteps,
  dynamicModelMap,
  sharedUpstreamMap = null
) {
  const sessionSpeed = summarizeSpeed(activeSteps);
  const sessionTtft = summarizeTtft(activeSteps);
  let sessionCostUsd = 0;
  let sessionUnpricedCalls = 0;
  let sessionInputTokens = 0;
  let sessionCacheReadTokens = 0;

  // 记录已知的 modelKey -> 最近观测到的上游 responseModel，避免正在生成的步骤因尚未收到 generatorMetadata 而闪烁
  const knownUpstreamByModelKey = sharedUpstreamMap || buildKnownUpstreamModelMap();
  for (const s of activeSteps) {
    if (s?.modelKey && s.modelKey !== 'unknown' && s.responseModel) {
      knownUpstreamByModelKey.set(s.modelKey, s.responseModel);
    }
  }

  const enrichedActiveSteps = activeSteps.map((st) => {
    const mInfo = resolveModelInfo(
      st.modelKey,
      dynamicModelMap,
      st.apiProvider,
      st.modelDisplayName,
      st.responseModel
    );
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
    const cacheCostUsd = mInfo.pricing
      ? (st.cacheReadTokens / 1_000_000) * mInfo.pricing.cache
      : null;
    const outCostUsd = mInfo.pricing ? (st.outputTokens / 1_000_000) * mInfo.pricing.output : null;
    const resolvedResponseModel =
      st.responseModel ||
      (st.modelKey && st.modelKey !== 'unknown'
        ? knownUpstreamByModelKey.get(st.modelKey) || ''
        : '');
    const rawUpstreamModel =
      resolvedResponseModel ||
      (mInfo.modelId && mInfo.modelId !== 'unknown' ? mInfo.modelId : mInfo.shortName);
    const modelUpstream = st.isCompactionStep ? `${rawUpstreamModel}·压缩` : rawUpstreamModel;

    return {
      ...st,
      responseModel: st.responseModel || '',
      modelUpstream,
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

  return {
    enrichedActiveSteps,
    latestEnriched,
    sessionSpeed,
    sessionTtft,
    sessionAvgTokPerSec,
    sessionCostUsd,
    sessionUnpricedCalls,
    sessionInputTokens,
    sessionCacheReadTokens,
  };
}

/**
 * 从当前活跃会话的最新步骤提取上下文 6 维拆解、自动压缩水位与缓存命中率。
 *
 * @param {object[]} enrichedActiveSteps
 * @param {object|null} latestEnriched
 * @param {number} sessionInputTokens
 * @param {number} sessionCacheReadTokens
 */
export function extractActiveContextTelemetry(
  enrichedActiveSteps,
  latestEnriched,
  sessionInputTokens,
  sessionCacheReadTokens
) {
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
  const hasGranularMsgBreakdown =
    Boolean(latestBreakdown) &&
    Object.prototype.hasOwnProperty.call(latestBreakdown, 'toolResultsTokens');
  const ctxUserInput = hasGranularMsgBreakdown
    ? Number(latestBreakdown?.userInputTokens || 0)
    : ctxMessages;
  const ctxAssistant = Number(latestBreakdown?.assistantTokens || 0);
  const ctxToolResults = Number(latestBreakdown?.toolResultsTokens || 0);
  const ctxSubagent = Number(latestBreakdown?.subagentTokens || 0);
  const ctxCheckpoint = Number(latestBreakdown?.checkpointTokens || 0);
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
    ctxBreakdownTotal > 0 ? ctxBreakdownTotal : ctxCached + ctxFreshInput + ctxThinking + ctxResponse;
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

  const latestPromptTokens = ctxCached + ctxFreshInput;
  const latestCacheHitPct =
    latestPromptTokens > 0 ? Math.round((ctxCached / latestPromptTokens) * 100) : 0;
  const sessionPromptTokens = sessionCacheReadTokens + sessionInputTokens;
  const sessionCacheHitPct =
    sessionPromptTokens > 0 ? Math.round((sessionCacheReadTokens / sessionPromptTokens) * 100) : 0;

  return {
    latestCacheHitPct,
    sessionCacheHitPct,
    context: {
      totalTokens: ctxTotal,
      limitTokens: ctxLimit,
      usedPct: ctxPct,
      compactionUsedTokens,
      compactionLimitTokens,
      compactionUsedPct,
      messagesTokens: ctxMessages,
      userInputTokens: ctxUserInput,
      assistantTokens: ctxAssistant,
      toolResultsTokens: ctxToolResults,
      subagentTokens: ctxSubagent,
      checkpointTokens: ctxCheckpoint,
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
  };
}

/**
 * 构建单个代理（主代理或子代理）的标准遥测单元对象，消除主/子代理 25 字段重复组装。
 */
function buildAgentUnitTelemetry({
  agentId,
  cascadeId,
  isMain,
  index,
  shortLabel,
  badgeText,
  role,
  typeName,
  agentLabel,
  status,
  rawSteps,
  fallbackLastModMs,
  dynamicModelMap,
  knownUpstreamByModelKey,
  includeRecentSteps = true,
}) {
  const enrichedRes = enrichActiveConversationSteps(
    rawSteps,
    dynamicModelMap,
    knownUpstreamByModelKey
  );
  const taggedSteps = enrichedRes.enrichedActiveSteps.map((st) => ({
    ...st,
    agentId,
    agentCascadeId: cascadeId,
    agentLabel,
    agentBadge: badgeText,
    agentRole: role,
    agentIndex: index,
    isSubagent: !isMain,
  }));
  const ctxRes = extractActiveContextTelemetry(
    taggedSteps,
    enrichedRes.latestEnriched,
    enrichedRes.sessionInputTokens,
    enrichedRes.sessionCacheReadTokens
  );
  const modelBreakdown = buildScopedModelBreakdown(taggedSteps, dynamicModelMap);
  const lastModifiedMs =
    enrichedRes.latestEnriched?.createdAtMs || fallbackLastModMs || 0;

  return {
    enrichedRes,
    taggedSteps,
    ctxRes,
    telemetryUnit: {
      agentId,
      cascadeId,
      isMain,
      index,
      shortLabel,
      badgeText,
      role,
      typeName,
      isRunning: status === 'CASCADE_RUN_STATUS_RUNNING',
      status: status || 'IDLE',
      stepCount: taggedSteps.length,
      latestTokPerSec: enrichedRes.latestEnriched?.tokPerSec ?? null,
      latestTtftSec: enrichedRes.latestEnriched?.ttftSec ?? null,
      latestSpeedReason: enrichedRes.latestEnriched?.selectedSpeedReason ?? null,
      avgTokPerSec: enrichedRes.sessionAvgTokPerSec,
      speedSummary: enrichedRes.sessionSpeed,
      ttftSummary: enrichedRes.sessionTtft,
      latestStepCostUsd: enrichedRes.latestEnriched?.costUsd ?? null,
      sessionCostUsd: +enrichedRes.sessionCostUsd.toFixed(2),
      sessionUnpricedCalls: enrichedRes.sessionUnpricedCalls,
      latestCacheHitPct: ctxRes.latestCacheHitPct,
      sessionCacheHitPct: ctxRes.sessionCacheHitPct,
      activeModelShort: enrichedRes.latestEnriched?.modelShort || '模型未知',
      activeModelLabel: enrichedRes.latestEnriched?.modelLabel || '模型未知',
      context: ctxRes.context,
      ...(includeRecentSteps ? { recentSteps: taggedSteps.slice().reverse() } : {}),
      modelBreakdown,
      lastModifiedMs,
    },
  };
}

/**
 * 构建完整的前端遥测载荷（核心内部实现，直接供单元测试沙箱调用）。
 *
 * @param {string} requestedConvId 请求指定的会话 ID（为空时自动选定最近活跃会话）
 * @param {boolean} [forceQuotaRefresh=false] 是否强制穿透官方配额 10 秒缓存
 * @param {{ range?: string, startMs?: number, endMs?: number }} [filterOpts={}] 时间范围筛选选项
 * @returns {Promise<object>}
 */
export async function buildTelemetryPayloadInternal(
  requestedConvId,
  forceQuotaRefresh = false,
  filterOpts = {}
) {
  const settings = loadSettings();
  const [userStatusRes, allTrajRes, initialOfficialQuotaInfo] = await Promise.all([
    callLsRpc('GetUserStatus', {}).catch(() => ({})),
    callLsRpc('GetAllCascadeTrajectories', {}).catch(() => ({})),
    getOfficialQuotaSummary(forceQuotaRefresh),
  ]);

  const userStatus = userStatusRes?.userStatus || {};
  const currentAccountName = userStatus?.email || userStatus?.name || '';
  let officialQuotaInfo = initialOfficialQuotaInfo;

  // 若检测到登录账号在 10 秒缓存期内发生切换，立即强制刷新配额摘要
  if (
    currentAccountName &&
    quotaSummaryCache.accountName &&
    quotaSummaryCache.accountName !== currentAccountName
  ) {
    officialQuotaInfo = await getOfficialQuotaSummary(true);
  }
  if (currentAccountName && officialQuotaInfo?.data) {
    quotaSummaryCache.accountName = currentAccountName;
  }

  const officialQuota = officialQuotaInfo?.data || null;
  const clientConfigs = userStatus?.cascadeModelConfigData?.clientModelConfigs || [];

  // 1. 构建官方实时配额池与动态模型目录
  const { dynamicModelMap, quotaPoolsMap, modelQuotas } = buildOfficialQuotaPools(
    officialQuota,
    clientConfigs
  );

  // 2. 枚举本地与 LS 会话，并增量同步历史轨迹步骤
  const { conversations, activeConvSummary, activeCascadeId } =
    await enumerateAndSyncConversations({
      summariesObj: allTrajRes?.trajectorySummaries || {},
      currentAccountName,
      requestedConvId,
    });

  // 3. 计算当前活跃根会话及其子代理的步骤指标、6 通道上下文拆解与按模型汇总
  const knownUpstreamByModelKey = buildKnownUpstreamModelMap();
  const activeEntry = activeCascadeId ? trajectoryCache[activeCascadeId] : null;
  const activeSteps = activeEntry?.steps || [];
  const mainUnit = buildAgentUnitTelemetry({
    agentId: 'main',
    cascadeId: activeCascadeId,
    isMain: true,
    index: 0,
    shortLabel: '主代理',
    badgeText: '主',
    role: '主代理',
    typeName: 'root',
    agentLabel: '主代理',
    status: activeConvSummary?.status || 'IDLE',
    rawSteps: activeSteps,
    fallbackLastModMs: activeConvSummary?.lastModifiedMs || activeEntry?.lastModifiedMs || 0,
    dynamicModelMap,
    knownUpstreamByModelKey,
    // 主代理步骤通过 activeConversation.recentSteps 下发一次，避免 JSON 重复序列化
    includeRecentSteps: false,
  });

  const enrichedActiveSteps = mainUnit.taggedSteps;
  const {
    latestEnriched,
    sessionSpeed,
    sessionTtft,
    sessionAvgTokPerSec,
    sessionCostUsd,
    sessionUnpricedCalls,
    sessionInputTokens,
    sessionCacheReadTokens,
  } = mainUnit.enrichedRes;
  const { latestCacheHitPct, sessionCacheHitPct, context } = mainUnit.ctxRes;
  const mainAgentTelemetry = mainUnit.telemetryUnit;
  const mainModelBreakdown = mainAgentTelemetry.modelBreakdown;

  const subagentSummaries = activeConvSummary?.subagents || [];
  const activeFamilyCascadeIds = new Set(activeCascadeId ? [activeCascadeId.toLowerCase()] : []);
  const subAgentTelemetries = [];
  const allCombinedRawSteps = [...activeSteps];
  const allCombinedEnrichedSteps = [...enrichedActiveSteps];
  let totalRawSessionCostUsd = sessionCostUsd;
  let totalFamilyInputTokens = sessionInputTokens;
  let totalFamilyCacheReadTokens = sessionCacheReadTokens;

  for (let idx = 0; idx < subagentSummaries.length; idx++) {
    const subSum = subagentSummaries[idx];
    const subCid = subSum.cascadeId;
    activeFamilyCascadeIds.add(String(subCid || '').toLowerCase());
    const subEntry = trajectoryCache[subCid] || null;
    const subRawSteps = subEntry?.steps || [];
    allCombinedRawSteps.push(...subRawSteps);

    const subSpec = subSum.subagentSpec || subEntry?.subagentSpec || null;
    const rawRole =
      subSpec?.role || subSum.agentScriptName || subEntry?.agentScriptName || subSpec?.typeName || '';
    const subIndex = idx + 1;
    const shortLabel = `子代理 #${subIndex}`;
    const badgeText = `子${subIndex}`;
    const roleLabel = rawRole || '子代理';
    const typeName = subSpec?.typeName || '';

    const subUnit = buildAgentUnitTelemetry({
      agentId: subCid,
      cascadeId: subCid,
      isMain: false,
      index: subIndex,
      shortLabel,
      badgeText,
      role: roleLabel,
      typeName,
      agentLabel: rawRole ? `${shortLabel} · ${rawRole}` : shortLabel,
      status: subSum.status || 'IDLE',
      rawSteps: subRawSteps,
      fallbackLastModMs: subSum.lastModifiedMs || subEntry?.lastModifiedMs || 0,
      dynamicModelMap,
      knownUpstreamByModelKey,
      includeRecentSteps: true,
    });

    allCombinedEnrichedSteps.push(...subUnit.taggedSteps);
    totalRawSessionCostUsd += subUnit.enrichedRes.sessionCostUsd;
    totalFamilyInputTokens += subUnit.enrichedRes.sessionInputTokens;
    totalFamilyCacheReadTokens += subUnit.enrichedRes.sessionCacheReadTokens;
    subAgentTelemetries.push(subUnit.telemetryUnit);
  }

  const allAgents = [mainAgentTelemetry, ...subAgentTelemetries];
  let aggregatedTelemetry = mainAgentTelemetry;

  if (subAgentTelemetries.length > 0) {
    allCombinedRawSteps.sort(
      (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0) || (a.stepIndex || 0) - (b.stepIndex || 0)
    );
    allCombinedEnrichedSteps.sort(
      (a, b) =>
        (a.createdAtMs || 0) - (b.createdAtMs || 0) ||
        (a.agentIndex || 0) - (b.agentIndex || 0) ||
        (a.stepIndex || 0) - (b.stepIndex || 0)
    );
    const combinedSpeed = summarizeSpeed(allCombinedRawSteps);
    const combinedTtft = summarizeTtft(allCombinedRawSteps);
    const combinedAvgTokPerSec = roundMetric(combinedSpeed.avgTokPerSec);
    const combinedModelBreakdown = buildScopedModelBreakdown(
      allCombinedEnrichedSteps,
      dynamicModelMap
    );

    const runningAgent = allAgents.find((a) => a.isRunning);
    const latestActiveAgent =
      runningAgent ||
      allAgents
        .slice()
        .sort((a, b) => (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0))[0] ||
      mainAgentTelemetry;

    // 若刚启动的子代理尚无已完成步骤 (stepCount === 0)，实时速率与上下文回退取最近有步骤的代理，避免闪现空白
    const agentsWithSteps = allAgents.filter((a) => a.stepCount > 0);
    const latestMetricAgent =
      latestActiveAgent.stepCount > 0
        ? latestActiveAgent
        : agentsWithSteps.find((a) => a.isRunning) ||
          agentsWithSteps
            .slice()
            .sort((a, b) => (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0))[0] ||
          latestActiveAgent;

    const totalCostUsd = +totalRawSessionCostUsd.toFixed(2);
    const totalUnpricedCalls = allAgents.reduce(
      (sum, a) => sum + (a.sessionUnpricedCalls || 0),
      0
    );
    const totalFamilyPromptTokens = totalFamilyInputTokens + totalFamilyCacheReadTokens;
    const combinedSessionCacheHitPct =
      totalFamilyPromptTokens > 0
        ? Math.round((totalFamilyCacheReadTokens / totalFamilyPromptTokens) * 100)
        : 0;

    aggregatedTelemetry = {
      agentId: 'all',
      cascadeId: activeCascadeId,
      isMain: false,
      index: -1,
      shortLabel: '全部汇总',
      badgeText: '全部',
      role: `主代理 + ${subAgentTelemetries.length} 子代理`,
      typeName: 'all',
      activeAgentId: latestActiveAgent.agentId,
      activeAgentShortLabel: latestActiveAgent.shortLabel,
      activeAgentBadge: latestActiveAgent.badgeText,
      activeAgentRole: latestActiveAgent.role,
      isRunning: allAgents.some((a) => a.isRunning),
      status: allAgents.some((a) => a.isRunning) ? 'CASCADE_RUN_STATUS_RUNNING' : 'IDLE',
      stepCount: allCombinedEnrichedSteps.length,
      latestTokPerSec: latestMetricAgent.latestTokPerSec,
      latestTtftSec: latestMetricAgent.latestTtftSec,
      latestSpeedReason: latestMetricAgent.latestSpeedReason,
      avgTokPerSec: combinedAvgTokPerSec,
      speedSummary: combinedSpeed,
      ttftSummary: combinedTtft,
      latestStepCostUsd: latestMetricAgent.latestStepCostUsd,
      sessionCostUsd: totalCostUsd,
      sessionUnpricedCalls: totalUnpricedCalls,
      latestCacheHitPct: latestMetricAgent.latestCacheHitPct,
      sessionCacheHitPct: combinedSessionCacheHitPct,
      activeModelShort: latestMetricAgent.activeModelShort,
      activeModelLabel: latestMetricAgent.activeModelLabel,
      context: latestMetricAgent.context,
      modelBreakdown: combinedModelBreakdown,
      lastModifiedMs: latestActiveAgent.lastModifiedMs,
    };
  }

  // 4. 识别当前活跃会话家族绑定的模型池及其官方 5h / 周限重置锚点
  const latestFamilyStep =
    allCombinedEnrichedSteps.length > 0
      ? allCombinedEnrichedSteps[allCombinedEnrichedSteps.length - 1]
      : latestEnriched;
  const latestIsArgon = latestFamilyStep
    ? isArgonModelIdentifier(
        latestFamilyStep.modelKey,
        latestFamilyStep.responseModel,
        latestFamilyStep.modelUpstream,
        latestFamilyStep.modelLabel
      )
    : false;
  const rawActiveFamily = latestFamilyStep?.family || 'Other';
  const activePoolKey =
    latestIsArgon && quotaPoolsMap.has('Argon')
      ? 'Argon'
      : rawActiveFamily === 'Gemini'
        ? 'Gemini'
        : ['Claude', 'GPT'].includes(rawActiveFamily)
          ? 'Claude & GPT'
          : 'Unknown';
  const matchedActivePool = quotaPoolsMap.get(activePoolKey) || null;
  const activeLive5h = matchedActivePool?.has5h
    ? {
        remainingPct: matchedActivePool.remainingPct,
        remainingIntPct: matchedActivePool.remainingIntPct,
        usedPct: matchedActivePool.usedPct,
        resetTime: matchedActivePool.resetTime,
      }
    : null;
  const activeLiveWeekly = matchedActivePool?.hasWeekly
    ? {
        remainingPct: matchedActivePool.weeklyRemainingPct,
        remainingIntPct: matchedActivePool.weeklyRemainingIntPct,
        usedPct: matchedActivePool.weeklyUsedPct,
        resetTime: matchedActivePool.weeklyResetTime,
      }
    : null;
  const cycleAnchors = {
    fiveHourResetMs: parseIsoMs(activeLive5h?.resetTime),
    weeklyResetMs: parseIsoMs(activeLiveWeekly?.resetTime),
  };

  // 5. 多时间窗口聚合（预设窗口 + 当前选定窗口 + 12 段趋势 + 月序列 + 来源与模型拆解）
  const {
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
  } = aggregateMultiWindowUsage({
    filterOpts,
    cycleAnchors,
    currentAccountName,
    activeCascadeId,
    activeFamilyCascadeIds,
    dynamicModelMap,
  });

  // 6. 组装当前活跃配额池与每周限额视图数据
  const familyPoolQuota = quotaPoolsMap.get(activePoolKey);
  const activePoolLabel = familyPoolQuota?.poolLabel || activePoolKey;
  const activePoolQuota = familyPoolQuota || {
    poolKey: activePoolKey,
    poolLabel: activePoolKey === 'Unknown' ? '未知' : activePoolKey,
    poolName:
      activePoolKey === 'Argon'
        ? 'Gemini 4 Argon 模型池'
        : activePoolKey === 'Gemini'
          ? 'Gemini 模型池'
          : activePoolKey === 'Claude & GPT'
            ? 'Claude & GPT 模型池'
            : '模型池未知',
    family: activePoolKey,
    isAvailable: Boolean(activeLive5h || activeLiveWeekly),
    has5h: Boolean(activeLive5h),
    hasWeekly: Boolean(activeLiveWeekly),
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
      ? weekBucket.unpricedCalls > 0
        ? null
        : Math.min(
            100,
            +((weekBucket.costUsd / Math.max(1, settings.weeklyCostBudget)) * 100).toFixed(1)
          )
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

  // 提取真实的 Google One AI Credits（忽略旧版硬编码的 500 prompt credits）
  const g1CreditEntry = (userStatus?.userTier?.availableCredits || []).find(
    (c) => c?.creditType === 'GOOGLE_ONE_AI'
  );
  const realAiCredits = Number(g1CreditEntry?.creditAmount || 0);

  let uiBundleVersion = 0;
  try {
    uiBundleVersion = statSync(join(HERE, 'app.js')).mtimeMs || 0;
  } catch {
    // 忽略 stat 异常
  }

  return {
    timestamp: new Date().toISOString(),
    uiBundleVersion,
    settings,
    cloudStatus: getCloudStatus(),
    diagnostics: diagnostics.status(),
    account: {
      name: userStatus?.name || '',
      tierName: userStatus?.userTier?.name || 'Google AI',
      planName: userStatus?.planStatus?.planInfo?.planName || 'Pro',
      aiCredits: realAiCredits > 0 ? realAiCredits : null,
      totalConversations: conversations.length,
    },
    conversations: conversations.slice(0, MAX_RECENT_CONVERSATIONS).map((c) => ({
      cascadeId: c.cascadeId,
      title: c.title,
      stepCount: c.stepCount,
      subagentCount: c.subagentCount || 0,
      totalStepCount: c.totalStepCount || c.stepCount || 0,
      status: c.status,
      lastModifiedTime: c.lastModifiedTime,
      lastModifiedMs: c.lastModifiedMs,
    })),
    activeConversation: {
      cascadeId: activeCascadeId,
      title: activeConvSummary?.title || '当前会话',
      isRunning: activeConvSummary?.status === 'CASCADE_RUN_STATUS_RUNNING',
      status: activeConvSummary?.status || 'IDLE',
      stepCount: enrichedActiveSteps.length,
      hasSubagents: subAgentTelemetries.length > 0,
      subagentCount: subAgentTelemetries.length,
      totalStepsAllAgents: allCombinedEnrichedSteps.length,
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
      context,
      recentSteps: enrichedActiveSteps.slice().reverse(),
      modelBreakdown: mainModelBreakdown,
      agents: allAgents,
      aggregated: aggregatedTelemetry,
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
        const order = { Gemini: 0, Argon: 1, 'Claude & GPT': 2 };
        return (order[a.family] ?? 99) - (order[b.family] ?? 99);
      }),
      models: modelQuotas.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      weekly: {
        isOfficial: useOfficialWeekly,
        poolFamily: activePoolKey,
        title: isCustomWeeklyMode
          ? '每周限额 (自定义本机)'
          : `每周限额 (${activePoolLabel && activePoolLabel !== 'Unknown' ? activePoolLabel : '当前'})`,
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
    modelBreakdown,
  };
}

/**
 * 带并发请求合并（In-Flight Deduplication）的遥测载荷构建入口。
 * 当相同会话、刷新模式与时间范围的请求正在处理中时，直接复用同一个 Promise。
 *
 * @param {string} requestedConvId
 * @param {boolean} [forceQuotaRefresh=false]
 * @param {{ range?: string, startMs?: number, endMs?: number }} [filterOpts={}]
 * @returns {Promise<object>}
 */
export function buildTelemetryPayload(
  requestedConvId,
  forceQuotaRefresh = false,
  filterOpts = {}
) {
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
