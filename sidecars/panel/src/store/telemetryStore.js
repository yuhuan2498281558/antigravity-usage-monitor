/**
 * @fileoverview Reactive telemetry store with async non-overlapping poll scheduler
 * and granular slice updates.
 */

import { createReactiveStore } from '../core/reactive.js';
import { callSidecarApi } from '../core/httpClient.js';

const initialConversationId =
  (typeof window !== 'undefined' && window.sidecar?.conversationId) || '';

export const telemetryStore = createReactiveStore({
  selectedConversationId: initialConversationId,
  selectedTimeRange: 'today',
  customStartMs: Date.now() - 24 * 3600 * 1000,
  customEndMs: Date.now(),
  syncState: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  telemetry: null,
});

let pollTimer = null;
let feedbackTimer = null;
let activeBundleVersion = 0;
let latestRequestSeq = 0;

function isEquivalentTelemetry(prev, next) {
  if (!prev || !next) return false;
  if (prev === next) return true;

  const pAct = prev.activeConversation;
  const nAct = next.activeConversation;
  if (prev.settings?.showUpstreamModel !== next.settings?.showUpstreamModel) return false;
  if (prev.settings?.weeklyLimitMode !== next.settings?.weeklyLimitMode) return false;
  if (prev.settings?.weeklyTokenBudget !== next.settings?.weeklyTokenBudget) return false;
  if (prev.settings?.weeklyCostBudget !== next.settings?.weeklyCostBudget) return false;
  if (pAct?.cascadeId !== nAct?.cascadeId) return false;
  if (pAct?.stepCount !== nAct?.stepCount) return false;
  if (pAct?.isRunning !== nAct?.isRunning) return false;
  if (pAct?.latestTokPerSec !== nAct?.latestTokPerSec) return false;
  if (pAct?.latestTtftSec !== nAct?.latestTtftSec) return false;
  if (pAct?.activeModelShort !== nAct?.activeModelShort || pAct?.activeModelLabel !== nAct?.activeModelLabel) return false;
  if (pAct?.latestStepCostUsd !== nAct?.latestStepCostUsd || pAct?.sessionUnpricedCalls !== nAct?.sessionUnpricedCalls) return false;
  const pCtx = pAct?.context;
  const nCtx = nAct?.context;
  if (pCtx?.totalTokens !== nCtx?.totalTokens) return false;
  if (pCtx?.messagesTokens !== nCtx?.messagesTokens) return false;
  if (pCtx?.systemToolsTokens !== nCtx?.systemToolsTokens) return false;
  if (pCtx?.mcpToolsTokens !== nCtx?.mcpToolsTokens) return false;
  if (pCtx?.skillsTokens !== nCtx?.skillsTokens) return false;
  if (pCtx?.systemPromptTokens !== nCtx?.systemPromptTokens) return false;
  if (pCtx?.userRulesTokens !== nCtx?.userRulesTokens) return false;
  if ((pAct?.recentSteps?.length || 0) !== (nAct?.recentSteps?.length || 0)) return false;
  for (let i = 0; i < (pAct?.recentSteps?.length || 0); i++) {
    const before = pAct.recentSteps[i], after = nAct.recentSteps[i];
    if (before.modelKey !== after.modelKey || before.modelShort !== after.modelShort ||
        before.modelUpstream !== after.modelUpstream || before.responseModel !== after.responseModel ||
        before.modelSource !== after.modelSource || before.costUsd !== after.costUsd) return false;
  }

  const pRange = prev.consumption?.selectedRange;
  const nRange = next.consumption?.selectedRange;
  if (pRange?.key !== nRange?.key) return false;
  if (nRange?.key === 'custom') {
    if (pRange?.startMs !== nRange?.startMs || pRange?.endMs !== nRange?.endMs) return false;
  }

  const pCons = prev.consumption?.session;
  const nCons = next.consumption?.session;
  if (pCons?.totalTokens !== nCons?.totalTokens) return false;
  if (pCons?.costUsd !== nCons?.costUsd) return false;
  if (pCons?.unpricedCalls !== nCons?.unpricedCalls) return false;

  const pAcct = prev.consumption?.account;
  const nAcct = next.consumption?.account;
  if (pAcct?.totalTokens !== nAcct?.totalTokens) return false;
  if (pAcct?.calls !== nAcct?.calls) return false;
  if (pAcct?.costUsd !== nAcct?.costUsd) return false;
  if (pAcct?.unpricedCalls !== nAcct?.unpricedCalls) return false;

  const pTrend = prev.consumption?.trendSeries || [];
  const nTrend = next.consumption?.trendSeries || [];
  if (pTrend.length !== nTrend.length) return false;
  for (let i = 0; i < pTrend.length; i++) {
    if (pTrend[i]?.tokens !== nTrend[i]?.tokens || pTrend[i]?.label !== nTrend[i]?.label) {
      return false;
    }
  }

  const pModels = prev.modelBreakdown || [];
  const nModels = next.modelBreakdown || [];
  if (pModels.length !== nModels.length) return false;
  for (let i = 0; i < pModels.length; i++) {
    if (
      pModels[i]?.label !== nModels[i]?.label ||
      pModels[i]?.shortName !== nModels[i]?.shortName ||
      pModels[i]?.upstreamName !== nModels[i]?.upstreamName ||
      pModels[i]?.costUsd !== nModels[i]?.costUsd ||
      pModels[i]?.unpricedCalls !== nModels[i]?.unpricedCalls ||
      pModels[i]?.totalTokens !== nModels[i]?.totalTokens ||
      pModels[i]?.calls !== nModels[i]?.calls
    ) {
      return false;
    }
  }

  const pSources = prev.consumption?.sourcesBreakdown || [];
  const nSources = next.consumption?.sourcesBreakdown || [];
  if (pSources.length !== nSources.length) return false;
  for (let i = 0; i < pSources.length; i++) {
    if (
      pSources[i]?.name !== nSources[i]?.name ||
      pSources[i]?.costUsd !== nSources[i]?.costUsd ||
      pSources[i]?.unpricedCalls !== nSources[i]?.unpricedCalls ||
      pSources[i]?.totalTokens !== nSources[i]?.totalTokens ||
      pSources[i]?.calls !== nSources[i]?.calls
    ) {
      return false;
    }
  }

  if (prev.account?.tierName !== next.account?.tierName || prev.account?.planName !== next.account?.planName) {
    return false;
  }

  const pQuot = prev.quotas?.activePool;
  const nQuot = next.quotas?.activePool;
  if (pQuot?.family !== nQuot?.family) return false;
  if (pQuot?.usedPct !== nQuot?.usedPct) return false;
  if (pQuot?.remainingPct !== nQuot?.remainingPct) return false;
  if (pQuot?.weeklyUsedPct !== nQuot?.weeklyUsedPct) return false;
  if (prev.quotas?.weekly?.usedPct !== next.quotas?.weekly?.usedPct) return false;
  if (prev.quotas?.weekly?.remainingPct !== next.quotas?.weekly?.remainingPct) return false;

  const pPools = prev.quotas?.pools || [];
  const nPools = next.quotas?.pools || [];
  if (pPools.length !== nPools.length) return false;
  for (let i = 0; i < pPools.length; i++) {
    if (
      pPools[i]?.poolKey !== nPools[i]?.poolKey ||
      pPools[i]?.poolLabel !== nPools[i]?.poolLabel ||
      pPools[i]?.usedPct !== nPools[i]?.usedPct ||
      pPools[i]?.remainingPct !== nPools[i]?.remainingPct ||
      pPools[i]?.resetTime !== nPools[i]?.resetTime ||
      pPools[i]?.weeklyUsedPct !== nPools[i]?.weeklyUsedPct ||
      pPools[i]?.weeklyRemainingPct !== nPools[i]?.weeklyRemainingPct ||
      pPools[i]?.weeklyResetTime !== nPools[i]?.weeklyResetTime
    ) {
      return false;
    }
  }

  if ((prev.conversations?.length || 0) !== (next.conversations?.length || 0)) return false;

  return true;
}

export async function fetchTelemetry({ force = false } = {}) {
  const st = telemetryStore.getState();
  const reqSeq = ++latestRequestSeq;
  const startMs = Date.now();

  if (force) {
    telemetryStore.setState({ syncState: 'syncing' });
  }

  try {
    const params = new URLSearchParams();
    if (st.selectedConversationId) {
      params.set('conversationId', st.selectedConversationId);
    }
    if (st.selectedTimeRange) {
      params.set('range', st.selectedTimeRange);
    }
    if (st.selectedTimeRange === 'custom') {
      if (st.customStartMs > 0) params.set('startMs', String(st.customStartMs));
      if (st.customEndMs > 0) params.set('endMs', String(st.customEndMs));
    }
    if (force) {
      params.set('force', '1');
    }
    const qs = params.toString();
    const payload = await callSidecarApi(`/api/telemetry${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      abortKey: 'telemetry-poll',
    });

    if (reqSeq !== latestRequestSeq) {
      return payload;
    }

    if (payload?.uiBundleVersion) {
      if (activeBundleVersion && activeBundleVersion !== payload.uiBundleVersion) {
        if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
          window.location.reload();
          return payload;
        }
      }
      activeBundleVersion = payload.uiBundleVersion;
    }

    const latestSt = telemetryStore.getState();
    if (force) {
      const elapsed = Date.now() - startMs;
      if (elapsed < 220) {
        await new Promise((r) => setTimeout(r, 220 - elapsed));
      }
      if (reqSeq !== latestRequestSeq) {
        return payload;
      }
      if (feedbackTimer) clearTimeout(feedbackTimer);
      telemetryStore.setState({
        telemetry: payload,
        syncState: 'synced',
      });
      feedbackTimer = setTimeout(() => {
        feedbackTimer = null;
        telemetryStore.setState({ syncState: 'idle' });
      }, 1100);
    } else {
      const isSame = isEquivalentTelemetry(latestSt.telemetry, payload);
      const nextTelemetry = isSame ? latestSt.telemetry : payload;
      telemetryStore.setState({
        telemetry: nextTelemetry,
        syncState: latestSt.syncState === 'synced' ? 'synced' : 'idle',
      });
    }
    return payload;
  } catch (err) {
    if (err?.name === 'AbortError' || reqSeq !== latestRequestSeq) return null;
    telemetryStore.setState({ syncState: 'error' });
    return null;
  }
}

export async function saveSettingsPatch(patch) {
  const prevTelemetry = telemetryStore.getState().telemetry;
  if (prevTelemetry?.settings) {
    telemetryStore.setState({
      telemetry: {
        ...prevTelemetry,
        settings: { ...prevTelemetry.settings, ...patch },
        activeConversation: patch.contextWindowLimit
          ? {
              ...prevTelemetry.activeConversation,
              context: {
                ...prevTelemetry.activeConversation?.context,
                limitTokens: patch.contextWindowLimit,
                usedPct: Math.min(
                  100,
                  Math.round(
                    ((prevTelemetry.activeConversation?.context?.totalTokens || 0) /
                      Math.max(1, patch.contextWindowLimit)) *
                      100
                  )
                ),
              },
            }
          : prevTelemetry.activeConversation,
      },
    });
  }
  await callSidecarApi('/api/settings', { method: 'POST', body: patch });
  await fetchTelemetry({ force: true });
}

export function startAsyncTelemetryLoop(intervalMs = 2000) {
  stopAsyncTelemetryLoop();
  let active = true;

  const tick = async () => {
    if (!active) return;
    await fetchTelemetry({ force: false });
    if (!active) return;
    pollTimer = setTimeout(tick, intervalMs);
  };

  tick();
  return () => {
    active = false;
    stopAsyncTelemetryLoop();
  };
}

export function stopAsyncTelemetryLoop() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
