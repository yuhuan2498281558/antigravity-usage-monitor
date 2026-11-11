/**
 * @fileoverview 遥测载荷组装器与并发请求合并入口。
 *
 * 将遥测构建拆解为清晰的子阶段：
 * 1. 拉取用户状态、轨迹摘要与官方实时配额摘要（含账号切换缓存校验）；
 * 2. 调用 `buildOfficialQuotaPools` 构建动态模型映射与多模型配额池；
 * 3. 调用 `enumerateAndSyncConversations` 枚举会话并增量更新轨迹缓存；
 * 4. 调用 `enrichActiveConversationSteps` 与 `extractActiveContextTelemetry` 计算当前活跃会话指标与 10 通道上下文拆解；
 * 5. 调用 `aggregateMultiWindowUsage` 完成全量多窗口聚合，并组装精简的前端遥测 JSON。
 */

import {
  extractLiveActivity,
  parseIsoMs,
  speedMetric,
  summarizeSpeed,
  summarizeTtft,
} from '../speed-metrics.mjs';
import {
  computeRuntimeCodeVersion,
  inFlightRequests,
  loadSettings,
  quotaSummaryCache,
  roundMetric,
  trajectoryCache,
} from './config.mjs';
import { enumerateAndSyncConversations } from './local-scanner.mjs';
import { callLsRpc, getOfficialQuotaSummary } from './ls-rpc.mjs';
import {
  computeStepCost,
  isArgonModelIdentifier,
  isCarbonModelIdentifier,
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
const POOL_PRIORITY_ORDER = ['Gemini', 'Argon', 'Carbon', 'Claude & GPT'];

function roundSessionCost(val) {
  if (!Number.isFinite(val) || val <= 0) return 0;
  return val < 0.01 ? +val.toFixed(4) : +val.toFixed(2);
}

function findTrajectoryCacheEntry(cascadeId) {
  if (!cascadeId) return null;
  if (trajectoryCache[cascadeId]) return trajectoryCache[cascadeId];
  const targetLower = String(cascadeId).toLowerCase();
  for (const [k, v] of Object.entries(trajectoryCache)) {
    if (k.toLowerCase() === targetLower) return v;
  }
  return null;
}

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
 * 为当前活跃会话的步骤补充模型标签、上游响应模型、单步费用、缓存命中率与生成速率指标，
 * 并剔除前端未使用的冗余诊断字段以减小 JSON 体积。
 *
 * @param {object[]} activeSteps 当前会话的原始缓存步骤
 * @param {Map<string, object>} [dynamicModelMap=new Map()] 动态模型字典
 * @param {Map<string, string>} [sharedUpstreamMap=null] 预先构建的已知上游模型映射表
 */
function enrichActiveConversationSteps(
  activeSteps,
  dynamicModelMap = new Map(),
  sharedUpstreamMap = null
) {
  const sessionSpeed = summarizeSpeed(activeSteps);
  const sessionTtft = summarizeTtft(activeSteps);
  let sessionCostUsd = 0;
  let sessionUnpricedCalls = 0;
  let sessionInputTokens = 0;
  let sessionCacheReadTokens = 0;

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

    const {
      viewableDelaySec: _viewableDelaySec,
      ttftSource: _ttftSource,
      speedBasis: _speedBasis,
      ...serializedStep
    } = st;

    return {
      ...serializedStep,
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
 * 从当前活跃会话的最新步骤提取上下文 10 通道拆解、自动压缩水位与缓存命中率。
 *
 * @param {object[]} enrichedActiveSteps
 * @param {object|null} latestEnriched
 * @param {number} sessionInputTokens
 * @param {number} sessionCacheReadTokens
 */
function extractActiveContextTelemetry(
  enrichedActiveSteps,
  latestEnriched,
  sessionInputTokens,
  sessionCacheReadTokens
) {
  let latestBreakdown = latestEnriched?.contextBreakdown || null;
  if (!latestBreakdown && !latestEnriched?.isCompactionStep) {
    for (let i = enrichedActiveSteps.length - 1; i >= 0; i--) {
      if (enrichedActiveSteps[i]?.isCompactionStep) {
        break;
      }
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
    latestPromptTokens > 0 ? +((ctxCached / latestPromptTokens) * 100).toFixed(1) : 0;
  const sessionPromptTokens = sessionCacheReadTokens + sessionInputTokens;
  const sessionCacheHitPct =
    sessionPromptTokens > 0 ? +((sessionCacheReadTokens / sessionPromptTokens) * 100).toFixed(1) : 0;

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
 * 构建单个代理（主代理或子代理）的标准遥测单元对象。
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
  liveActivity = null,
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
  const isRunning = status === 'CASCADE_RUN_STATUS_RUNNING';
  const resolvedLiveActivity = isRunning
    ? liveActivity ||
      extractLiveActivity([], true, lastModifiedMs || fallbackLastModMs || 0)
    : null;

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
      isRunning,
      status: status || 'IDLE',
      liveActivity: resolvedLiveActivity,
      stepCount: taggedSteps.length,
      latestTokPerSec: enrichedRes.latestEnriched?.tokPerSec ?? null,
      latestTtftSec: enrichedRes.latestEnriched?.ttftSec ?? null,
      latestSpeedReason: enrichedRes.latestEnriched?.selectedSpeedReason ?? null,
      avgTokPerSec: enrichedRes.sessionAvgTokPerSec,
      speedSummary: enrichedRes.sessionSpeed,
      ttftSummary: enrichedRes.sessionTtft,
      latestStepCostUsd: enrichedRes.latestEnriched?.costUsd ?? null,
      sessionCostUsd: roundSessionCost(enrichedRes.sessionCostUsd),
      sessionUnpricedCalls: enrichedRes.sessionUnpricedCalls,
      latestCacheHitPct: ctxRes.latestCacheHitPct,
      sessionCacheHitPct: ctxRes.sessionCacheHitPct,
      activeModelShort: enrichedRes.latestEnriched?.modelShort || '模型未知',
      activeModelLabel: enrichedRes.latestEnriched?.modelLabel || '模型未知',
      activeModelUpstream:
        enrichedRes.latestEnriched?.modelUpstream ||
        enrichedRes.latestEnriched?.modelShort ||
        '模型未知',
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
 * @param {boolean} [forceQuotaRefresh=false] 是否强制穿透官方配额缓存与失败退避
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

  // 若检测到账号发生切换：仅当并发的 initialOfficialQuotaInfo 命中了旧账号本地缓存 (fromCache === true) 时才需清空并重刷；
  // 若本轮已经实时穿透请求了上游 RPC (fromCache === false)，直接更新归属账号即可，避免二次重复 RPC
  const accountChanged = Boolean(
    currentAccountName &&
      quotaSummaryCache.accountName &&
      quotaSummaryCache.accountName !== currentAccountName
  );
  if (accountChanged) {
    if (initialOfficialQuotaInfo?.fromCache) {
      quotaSummaryCache.data = null;
      quotaSummaryCache.ts = 0;
      quotaSummaryCache.lastAttemptTs = 0;
      quotaSummaryCache.error = null;
      quotaSummaryCache.accountName = currentAccountName;
      officialQuotaInfo = await getOfficialQuotaSummary(true);
    } else {
      quotaSummaryCache.accountName = currentAccountName;
    }
  } else if (currentAccountName && officialQuotaInfo?.data && !officialQuotaInfo.refreshFailed) {
    quotaSummaryCache.accountName = currentAccountName;
  }

  const officialQuota = officialQuotaInfo?.data || null;
  const clientConfigs = userStatus?.cascadeModelConfigData?.clientModelConfigs || [];

  // 1. 构建官方实时配额池与动态模型目录
  const { dynamicModelMap, quotaPoolsMap } = buildOfficialQuotaPools(
    officialQuota,
    clientConfigs
  );

  // 2. 枚举本地与 LS 会话，并增量同步历史轨迹步骤
  const { conversations, activeConvSummary, activeCascadeId } =
    await enumerateAndSyncConversations({
      summariesObj: allTrajRes?.trajectorySummaries || {},
      currentAccountName,
      requestedConvId,
      forceRefresh: forceQuotaRefresh,
    });

  // 3. 计算当前活跃根会话及其子代理的步骤指标、10 通道上下文拆解与按模型汇总
  const knownUpstreamByModelKey = buildKnownUpstreamModelMap();
  const activeEntry = findTrajectoryCacheEntry(activeCascadeId);
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
    liveActivity: activeConvSummary?.liveActivity || null,
    fallbackLastModMs: activeConvSummary?.lastModifiedMs || activeEntry?.lastModifiedMs || 0,
    dynamicModelMap,
    knownUpstreamByModelKey,
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
    const subEntry = findTrajectoryCacheEntry(subCid);
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
      liveActivity: subSum.liveActivity || null,
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

    const agentsWithSteps = allAgents.filter((a) => a.stepCount > 0);
    const latestMetricAgent =
      latestActiveAgent.stepCount > 0
        ? latestActiveAgent
        : agentsWithSteps.find((a) => a.isRunning) ||
          agentsWithSteps
            .slice()
            .sort((a, b) => (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0))[0] ||
          latestActiveAgent;

    const totalCostUsd = roundSessionCost(totalRawSessionCostUsd);
    const totalUnpricedCalls = allAgents.reduce(
      (sum, a) => sum + (a.sessionUnpricedCalls || 0),
      0
    );
    const totalFamilyPromptTokens = totalFamilyInputTokens + totalFamilyCacheReadTokens;
    const combinedSessionCacheHitPct =
      totalFamilyPromptTokens > 0
        ? +((totalFamilyCacheReadTokens / totalFamilyPromptTokens) * 100).toFixed(1)
        : 0;

    const runningSubs = subAgentTelemetries.filter((a) => a.isRunning);
    const primaryRunningSub = runningSubs
      .slice()
      .sort((a, b) => (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0))[0];
    const activeActivityAgent =
      primaryRunningSub || (mainAgentTelemetry.isRunning ? mainAgentTelemetry : null);
    const aggregatedLiveActivity = activeActivityAgent?.liveActivity
      ? {
          ...activeActivityAgent.liveActivity,
          agentId: activeActivityAgent.agentId,
          agentBadge: activeActivityAgent.badgeText,
          agentShortLabel: activeActivityAgent.shortLabel,
          agentRole: activeActivityAgent.role,
          agentIndex: activeActivityAgent.index,
          isMain: Boolean(activeActivityAgent.isMain),
          parallelCount: runningSubs.length > 1 ? runningSubs.length : 1,
        }
      : null;

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
      liveActivity: aggregatedLiveActivity,
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
      activeModelUpstream: latestMetricAgent.activeModelUpstream,
      context: latestMetricAgent.context,
      modelBreakdown: combinedModelBreakdown,
      lastModifiedMs: latestActiveAgent.lastModifiedMs,
    };
  }

  // 4. 识别当前活跃会话家族绑定的模型池（与 quota-pools.mjs 保持一致，将 Other 第三方模型归入 Claude & GPT）
  const latestFamilyStep =
    allCombinedEnrichedSteps.length > 0
      ? allCombinedEnrichedSteps[allCombinedEnrichedSteps.length - 1]
      : latestEnriched;
  const hasResolvedStepModel = Boolean(
    latestFamilyStep && latestFamilyStep.modelKey && latestFamilyStep.modelKey !== 'unknown'
  );
  const latestIsCarbon = hasResolvedStepModel
    ? isCarbonModelIdentifier(
        latestFamilyStep.modelKey,
        latestFamilyStep.responseModel,
        latestFamilyStep.modelUpstream,
        latestFamilyStep.modelLabel
      )
    : false;
  const latestIsArgon = hasResolvedStepModel
    ? isArgonModelIdentifier(
        latestFamilyStep.modelKey,
        latestFamilyStep.responseModel,
        latestFamilyStep.modelUpstream,
        latestFamilyStep.modelLabel
      )
    : false;
  const rawActiveFamily = latestFamilyStep?.family || 'Other';
  const activePoolKey = !hasResolvedStepModel
    ? 'Unknown'
    : latestIsCarbon && quotaPoolsMap.has('Carbon')
      ? 'Carbon'
      : latestIsArgon && quotaPoolsMap.has('Argon')
        ? 'Argon'
        : rawActiveFamily === 'Gemini'
          ? 'Gemini'
          : ['Claude', 'GPT', 'Other'].includes(rawActiveFamily)
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

  // 全局账号周期锚点采用稳定的配额池优先级（Gemini -> Argon -> Carbon -> Claude & GPT），
  // 防止切换不同会话时全局消费统计（consumption.presets.week / 5h）因重置时间偏移而突变
  let accountFiveHourResetMs = 0;
  let accountWeeklyResetMs = 0;
  for (const pk of POOL_PRIORITY_ORDER) {
    const pool = quotaPoolsMap.get(pk);
    if (!pool) continue;
    if (!accountFiveHourResetMs && pool.resetTime) {
      accountFiveHourResetMs = parseIsoMs(pool.resetTime);
    }
    if (!accountWeeklyResetMs && pool.weeklyResetTime) {
      accountWeeklyResetMs = parseIsoMs(pool.weeklyResetTime);
    }
  }
  const cycleAnchors = {
    fiveHourResetMs: accountFiveHourResetMs || parseIsoMs(activeLive5h?.resetTime),
    weeklyResetMs: accountWeeklyResetMs || parseIsoMs(activeLiveWeekly?.resetTime),
  };

  // 5. 多时间窗口聚合（预设窗口 + 当前选定窗口 + 趋势 + 月序列 + 来源与模型拆解）
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
      activePoolKey === 'Carbon'
        ? 'Gemini 4 Carbon 模型池'
        : activePoolKey === 'Argon'
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
    settings.weeklyLimitMode === 'custom_cost'
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

  const g1CreditEntry = (userStatus?.userTier?.availableCredits || []).find(
    (c) => c?.creditType === 'GOOGLE_ONE_AI'
  );
  const realAiCredits = Number(g1CreditEntry?.creditAmount || 0);
  const uiBundleVersion = computeRuntimeCodeVersion();

  const rawTierName = userStatus?.userTier?.name || '';
  const inferredPlanFallback = /\bfree\b/i.test(rawTierName)
    ? 'Free'
    : /\bultra\b/i.test(rawTierName)
      ? 'Ultra'
      : 'Pro';
  const resolvedPlanName = userStatus?.planStatus?.planInfo?.planName || inferredPlanFallback;

  // 预计算近期会话与运行中会话的轻量缓存速览指标（零额外 RPC 开销）
  const quickStatsMemo = new Map();
  const getConversationQuickStats = (rootConv) => {
    const cidKey = String(rootConv?.cascadeId || '').toLowerCase();
    if (cidKey && quickStatsMemo.has(cidKey)) {
      return quickStatsMemo.get(cidKey);
    }
    const rootEntry = findTrajectoryCacheEntry(rootConv?.cascadeId);
    const rootSteps = rootEntry?.steps || [];
    const rawSubs = Array.isArray(rootConv?.subagents) ? rootConv.subagents : [];

    let totalCost = 0;
    let unpricedCalls = 0;
    const accumulateStepsCost = (steps) => {
      for (const st of steps) {
        const mInfo = resolveModelInfo(
          st.modelKey,
          dynamicModelMap,
          st.apiProvider,
          st.modelDisplayName,
          st.responseModel
        );
        const c = computeStepCost(st, mInfo.pricing);
        if (c === null) unpricedCalls += 1;
        else totalCost += c;
      }
    };
    accumulateStepsCost(rootSteps);

    const lastRootStep = rootSteps.length > 0 ? rootSteps[rootSteps.length - 1] : null;
    let bestMetricStep = lastRootStep;
    let bestMetricRunning = rootConv?.status === 'CASCADE_RUN_STATUS_RUNNING' && Boolean(lastRootStep);

    for (const subSum of rawSubs) {
      const subEntry = findTrajectoryCacheEntry(subSum?.cascadeId);
      const subSteps = subEntry?.steps || [];
      if (subSteps.length === 0) continue;
      accumulateStepsCost(subSteps);
      const lastSub = subSteps[subSteps.length - 1];
      const subRunning = subSum?.status === 'CASCADE_RUN_STATUS_RUNNING';
      if (
        !bestMetricStep ||
        (subRunning && !bestMetricRunning) ||
        (subRunning === bestMetricRunning &&
          (lastSub.createdAtMs || 0) >= (bestMetricStep.createdAtMs || 0))
      ) {
        bestMetricStep = lastSub;
        bestMetricRunning = subRunning;
      }
    }

    let contextUsedPct = null;
    if (lastRootStep) {
      const limitTokens = Number(lastRootStep.maxContextBudgetTokens || 256000);
      const cb = lastRootStep.contextBreakdown;
      const cbTotal = cb
        ? Number(cb.messagesTokens || 0) +
          Number(cb.systemToolsTokens || 0) +
          Number(cb.mcpToolsTokens || 0) +
          Number(cb.skillsTokens || 0) +
          Number(cb.systemPromptTokens || 0) +
          Number(cb.userRulesTokens || 0)
        : 0;
      const fallbackTotal =
        Number(lastRootStep.inputTokens || 0) +
        Number(lastRootStep.cacheReadTokens || 0) +
        Number(lastRootStep.thinkingTokens || 0) +
        Number(lastRootStep.responseTokens || 0);
      const usedTokens = Number(
        cbTotal > 0 ? cbTotal : lastRootStep.estimatedContextTokens || fallbackTotal
      );
      contextUsedPct =
        limitTokens > 0 ? Math.min(100, +((usedTokens / limitTokens) * 100).toFixed(1)) : 0;
    }

    let modelShort = '';
    let modelUpstream = '';
    let latestTokPerSec = null;
    if (bestMetricStep) {
      const mInfo = resolveModelInfo(
        bestMetricStep.modelKey,
        dynamicModelMap,
        bestMetricStep.apiProvider,
        bestMetricStep.modelDisplayName,
        bestMetricStep.responseModel
      );
      const resolvedResp =
        bestMetricStep.responseModel ||
        (bestMetricStep.modelKey && bestMetricStep.modelKey !== 'unknown'
          ? knownUpstreamByModelKey.get(bestMetricStep.modelKey) || ''
          : '');
      modelShort = mInfo.shortName || '';
      modelUpstream =
        resolvedResp ||
        (mInfo.modelId && mInfo.modelId !== 'unknown' ? mInfo.modelId : mInfo.shortName) ||
        '';
      latestTokPerSec = roundMetric(speedMetric(bestMetricStep).value);
    }

    const stats = {
      modelShort,
      modelUpstream,
      latestTokPerSec,
      contextUsedPct,
      sessionCostUsd: roundSessionCost(totalCost),
      sessionUnpricedCalls: unpricedCalls,
    };
    if (cidKey) {
      quickStatsMemo.set(cidKey, stats);
    }
    return stats;
  };

  // 7. 构建所有正在运行的主进程（根会话）及其子代理缩略状态列表
  const runningConversations = [];
  for (const rootConv of conversations) {
    const isMainRunning = rootConv.status === 'CASCADE_RUN_STATUS_RUNNING';
    const rawSubs = Array.isArray(rootConv.subagents) ? rootConv.subagents : [];
    const hasRunningSub = rawSubs.some((s) => s.status === 'CASCADE_RUN_STATUS_RUNNING');
    if (!isMainRunning && !hasRunningSub) {
      continue;
    }

    const rootEntry = findTrajectoryCacheEntry(rootConv.cascadeId);
    const rootFallbackMs =
      rootConv.lastModifiedMs || rootEntry?.lastModifiedMs || rootConv.createdTimeMs || 0;

    const subItems = rawSubs.map((subSum, idx) => {
      const subCid = subSum.cascadeId;
      const subEntry = findTrajectoryCacheEntry(subCid);
      const subSpec = subSum.subagentSpec || subEntry?.subagentSpec || null;
      const rawRole =
        subSpec?.role ||
        subSum.agentScriptName ||
        subEntry?.agentScriptName ||
        subSpec?.typeName ||
        '';
      const subIndex = idx + 1;
      const badgeText = `子${subIndex}`;
      const shortLabel = `子代理 #${subIndex}`;
      const role = rawRole || shortLabel;
      const isSubRunning = subSum.status === 'CASCADE_RUN_STATUS_RUNNING';
      const stepCount = Number(subSum.stepCount ?? subEntry?.steps?.length ?? 0);
      const subModMs = subSum.lastModifiedMs || subEntry?.lastModifiedMs || 0;
      const liveActivity = isSubRunning
        ? subSum.liveActivity || extractLiveActivity([], true, subModMs)
        : {
            phase: 'done',
            label: '已完成',
            detail: '',
            stepProgress: '',
            startedAtMs: subModMs,
            signature: `done:${stepCount}`,
          };
      return {
        cascadeId: subCid,
        index: subIndex,
        badgeText,
        shortLabel,
        role,
        typeName: subSpec?.typeName || '',
        isRunning: isSubRunning,
        status: subSum.status || 'IDLE',
        stepCount,
        lastModifiedMs: subModMs,
        liveActivity,
      };
    });

    const mainLiveAct = isMainRunning
      ? rootConv.liveActivity || extractLiveActivity([], true, rootFallbackMs)
      : null;

    const runningSubCount = subItems.filter((s) => s.isRunning).length;
    if (
      isMainRunning &&
      (mainLiveAct?.toolName === 'invoke_subagent' || mainLiveAct?.label === '调用子代理') &&
      runningSubCount === 0
    ) {
      const pendingIndex = subItems.length + 1;
      const pendingRole = mainLiveAct.detail || '子代理';
      subItems.push({
        cascadeId: `${rootConv.cascadeId}:pending-sub-${pendingIndex}`,
        index: pendingIndex,
        badgeText: `子${pendingIndex}`,
        shortLabel: `子代理 #${pendingIndex}`,
        role: pendingRole,
        typeName: '',
        isRunning: true,
        status: 'CASCADE_RUN_STATUS_RUNNING',
        stepCount: 0,
        lastModifiedMs: rootFallbackMs,
        liveActivity: {
          phase: 'thinking',
          label: '启动中',
          detail: '',
          stepProgress: '',
          startedAtMs: mainLiveAct.startedAtMs || 0,
          signature: `spawning-sub:${pendingIndex}:${pendingRole}`,
        },
      });
    }

    const runningSubList = subItems.filter((s) => s.isRunning);
    const resolvedMainActivity =
      mainLiveAct ||
      (runningSubList.length > 0
        ? {
            phase: 'waiting',
            label: '等待子代理',
            detail: runningSubList.map((s) => s.role).join(', '),
            stepProgress: '',
            startedAtMs: runningSubList[0]?.liveActivity?.startedAtMs || rootFallbackMs,
            signature: `wait-subs:${runningSubList.length}:${runningSubList[0]?.cascadeId || ''}`,
          }
        : extractLiveActivity([], true, rootFallbackMs));

    const qStats = getConversationQuickStats(rootConv);
    runningConversations.push({
      cascadeId: rootConv.cascadeId,
      title: rootConv.title || rootConv.cascadeId.slice(0, 8),
      isCurrentSelected:
        Boolean(activeCascadeId) &&
        rootConv.cascadeId.toLowerCase() === String(activeCascadeId).toLowerCase(),
      isMainRunning,
      isRunning: true,
      status: isMainRunning ? rootConv.status : 'CASCADE_RUN_STATUS_RUNNING',
      stepCount: Number(rootConv.stepCount || 0),
      totalStepCount: Number(rootConv.totalStepCount || rootConv.stepCount || 0),
      lastModifiedMs: rootConv.groupLastModifiedMs || rootConv.lastModifiedMs || 0,
      mainActivity: resolvedMainActivity,
      subagentCount: subItems.length,
      runningSubagentCount: runningSubList.length,
      subagents: subItems,
      modelShort: qStats.modelShort,
      modelUpstream: qStats.modelUpstream,
      latestTokPerSec: qStats.latestTokPerSec,
      contextUsedPct: qStats.contextUsedPct,
      sessionCostUsd: qStats.sessionCostUsd,
      sessionUnpricedCalls: qStats.sessionUnpricedCalls,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    uiBundleVersion,
    settings,
    cloudStatus: getCloudStatus(),
    account: {
      name: userStatus?.name || '',
      tierName: rawTierName || 'Google AI',
      planName: resolvedPlanName,
      aiCredits: realAiCredits > 0 ? realAiCredits : null,
      totalConversations: conversations.length,
    },
    runningConversations,
    conversations: conversations.slice(0, MAX_RECENT_CONVERSATIONS).map((c) => {
      const qStats = getConversationQuickStats(c);
      const rawSubs = Array.isArray(c.subagents) ? c.subagents : [];
      const runningSubCount = rawSubs.filter((s) => s.status === 'CASCADE_RUN_STATUS_RUNNING').length;
      return {
        cascadeId: c.cascadeId,
        title: c.title,
        stepCount: c.stepCount,
        subagentCount: c.subagentCount || 0,
        runningSubagentCount: runningSubCount,
        totalStepCount: c.totalStepCount || c.stepCount || 0,
        isRunning: c.status === 'CASCADE_RUN_STATUS_RUNNING' || runningSubCount > 0,
        status: c.status,
        lastModifiedTime: c.lastModifiedTime,
        lastModifiedMs: c.groupLastModifiedMs || c.lastModifiedMs,
        modelShort: qStats.modelShort,
        modelUpstream: qStats.modelUpstream,
        latestTokPerSec: qStats.latestTokPerSec,
        contextUsedPct: qStats.contextUsedPct,
        sessionCostUsd: qStats.sessionCostUsd,
        sessionUnpricedCalls: qStats.sessionUnpricedCalls,
      };
    }),
    activeConversation: {
      cascadeId: activeCascadeId,
      title: activeConvSummary?.title || '当前会话',
      isRunning: activeConvSummary?.status === 'CASCADE_RUN_STATUS_RUNNING',
      status: activeConvSummary?.status || 'IDLE',
      liveActivity: mainAgentTelemetry.liveActivity || null,
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
      sessionCostUsd: roundSessionCost(sessionCostUsd),
      sessionUnpricedCalls,
      latestCacheHitPct,
      sessionCacheHitPct,
      activeModelShort: latestEnriched?.modelShort || '模型未知',
      activeModelLabel: latestEnriched?.modelLabel || '模型未知',
      activeModelUpstream:
        latestEnriched?.modelUpstream || latestEnriched?.modelShort || '模型未知',
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
      account: finalizedSelectedAccount,
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
        const order = { Gemini: 0, Argon: 1, Carbon: 2, 'Claude & GPT': 3 };
        return (order[a.family] ?? 99) - (order[b.family] ?? 99);
      }),
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
    },
    modelBreakdown,
  };
}

/**
 * 带并发请求合并（In-Flight Deduplication）的遥测载荷构建入口。
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
