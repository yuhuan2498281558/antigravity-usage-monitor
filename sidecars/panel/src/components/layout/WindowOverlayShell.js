/**
 * @fileoverview 主窗口双栖挂载外壳 (WindowOverlayShell.js).
 *
 * 采用「分离式双 Shadow Host」架构，彻底规避宿主顶栏层叠上下文 (`z-0` / `overflow: hidden`) 裁切与路由重绘卸载问题：
 * 1. `#ag-usage-monitor-capsule`：轻量顶栏胶囊，优先内嵌停靠至 `[class*="@container/titlebar"]` 右侧按钮组，
 *    支持四级迟滞宽度自适应折叠（`wide` -> `compact` -> `minimal` -> `ring-only`），找不到顶栏时自动回退至右上角固定定位；
 * 2. `#ag-usage-monitor-portal`：常驻 `document.body` 顶层的无遮挡浮层宿主，承载悬停速览卡与完整四标签 `App()` 监控面板，
 *    在宿主切换会话重建顶栏 DOM 时始终保持组件实例、滚动位置与动画状态不丢失。
 */

import { App } from '../../App.js';
import { ContextSegmentMeter } from '../ui/ContextSegmentMeter.js';
import {
  h,
  isEventInside,
  patchAttr,
  patchClasses,
  patchKeyedList,
  patchText,
} from '../../core/domPatch.js';
import {
  formatElapsedSec,
  formatMetric,
  formatTokens,
  formatUsd,
  resolveModelDisplayInfo,
  sampleSummary,
  speedReasonText,
} from '../../core/formatters.js';
import { deliverCdpBridgeResponses, getWindowBridgeConfig } from '../../core/httpClient.js';
import { createSvgIcon, patchSvgIcon, SVG_NS } from '../../icons/SvgIcon.js';
import {
  extractHostRouteCascadeId,
  fetchTelemetry,
  formatAgentLabel,
  getAgentBadgeClass,
  normalizeClientTopbarSlots,
  normalizeClientUpdateMode,
  resolveScopedConversation,
  startAsyncTelemetryLoop,
  stopAsyncTelemetryLoop,
  telemetryStore,
  triggerPluginUpdate,
} from '../../store/telemetryStore.js';
import { uiStore } from '../../store/uiStore.js';
import {
  buildQuotaPoolItems,
  createPoolQuotaRow,
  CTX_CHANNEL_DEFS,
  quotaPoolRowSig,
  syncPoolQuotaRow,
} from '../../views/LiveOverviewView.js';

const CAPSULE_HOST_ID = 'ag-usage-monitor-capsule';
const PORTAL_HOST_ID = 'ag-usage-monitor-portal';
const FLOATING_CARD_WIDTH = 492;
const MULTI_PANEL_WIDTH = 484;
const RING_RADIUS = 5.2;
const RING_CIRCUMFERENCE = +(2 * Math.PI * RING_RADIUS).toFixed(2);

/**
 * 带迟滞区间（Hysteresis）的四阶段顶栏双胶囊响应式宽度计算，避免临界宽度反复跳动。
 * 当左侧多会话入口关闭（`showMulti === false`）时自动释放约 76px 预算给右侧指标胶囊。
 *
 * @param {number} availWidth
 * @param {'wide'|'compact'|'minimal'|'ring-only'} currentMode
 * @param {{ showMulti?: boolean }} [options]
 * @returns {'wide'|'compact'|'minimal'|'ring-only'}
 */
export function computeCapsuleLayoutMode(availWidth, currentMode = 'wide', options = undefined) {
  if (availWidth == null || Number.isNaN(availWidth)) return 'wide';
  const showMulti = options?.showMulti !== false;
  const updateReserve = options?.hasUpdate ? 52 : 0;
  const baseEffWidth = showMulti ? availWidth : availWidth + 76;
  const effWidth = baseEffWidth - updateReserve;
  if (currentMode === 'wide') {
    if (baseEffWidth < 78) return 'ring-only';
    if (effWidth < 196) return 'minimal';
    if (effWidth < 256) return 'compact';
    return 'wide';
  }
  if (currentMode === 'compact') {
    if (effWidth >= 272) return 'wide';
    if (baseEffWidth < 78) return 'ring-only';
    if (effWidth < 196) return 'minimal';
    return 'compact';
  }
  if (currentMode === 'minimal') {
    if (effWidth >= 272) return 'wide';
    if (effWidth >= 212) return 'compact';
    if (baseEffWidth < 78) return 'ring-only';
    return 'minimal';
  }
  if (effWidth >= 272) return 'wide';
  if (effWidth >= 212) return 'compact';
  if (baseEffWidth >= 92) return 'minimal';
  return 'ring-only';
}

function findHostTitlebar() {
  try {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
      return null;
    }
    return document.querySelector('[class*="@container/titlebar"]');
  } catch {
    return null;
  }
}

function findNativeTopRightAnchor() {
  try {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
      return null;
    }
    const auxToggle = document.querySelector('[data-testid="toggle-aux-sidebar"]');
    if (auxToggle?.closest) {
      return auxToggle.closest('div.absolute.right-0.top-0') || auxToggle;
    }
    const candidates = document.querySelectorAll('button, a, [role="button"]');
    for (const btn of candidates) {
      const text = String(btn.textContent || '').trim();
      if (
        (text === 'Open IDE' || text === '打开 IDE' || text.includes('Open IDE') || text.includes('打开 IDE')) &&
        btn.getBoundingClientRect?.().top < 52
      ) {
        return btn.closest?.('div.flex.items-center, div.absolute.right-0') || btn;
      }
    }
    return document.querySelector('div.absolute.right-0.top-0');
  } catch {
    return null;
  }
}

function getLeftSidebarRightEdge(vw) {
  try {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      const navEl = document.querySelector('div[role="navigation"]');
      if (navEl?.getBoundingClientRect) {
        const nr = navEl.getBoundingClientRect();
        if (nr.width > 0 && nr.left <= 8 && nr.right > 0 && nr.right < vw - 280) {
          return Math.ceil(nr.right);
        }
      }
    }
  } catch {
    // 忽略侧栏测量异常
  }
  return 0;
}

function resolveQuotaCapsuleSummary(quotas) {
  if (!quotas) return null;
  const activePool = quotas.activePool;
  const weekly = quotas.weekly;
  const candidates = [];
  if (activePool && Number.isFinite(Number(activePool.remainingPct))) {
    candidates.push({
      pct: Number(activePool.remainingPct),
      label: activePool.poolLabel || activePool.family || '当前池',
      windowTag: '5h',
    });
  }
  if (activePool && Number.isFinite(Number(activePool.weeklyRemainingPct))) {
    candidates.push({
      pct: Number(activePool.weeklyRemainingPct),
      label: activePool.poolLabel || activePool.family || '当前池',
      windowTag: '周',
    });
  }
  if (!candidates.length && weekly && Number.isFinite(Number(weekly.remainingPct))) {
    candidates.push({
      pct: Number(weekly.remainingPct),
      label: weekly.poolFamily || '周限额',
      windowTag: '周',
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.pct - b.pct);
  const tightest = candidates[0];
  const rounded = Math.max(0, Math.min(100, Math.round(tightest.pct)));
  return {
    roundedPct: rounded,
    shortText: `余 ${rounded}%`,
    detailText: candidates
      .map((c) => `${c.label} ${c.windowTag} 余 ${Math.max(0, Math.min(100, Math.round(c.pct)))}%`)
      .join(' · '),
  };
}

const THIRD_PARTY_FAMILY_RE = /claude|gpt|anthropic|openai|3p|sonnet|opus|haiku/i;

/**
 * 解析指定模型池（Gemini 或 Claude & GPT）与指定时间窗口（5h 或周额度）的剩余百分比摘要。
 *
 * @param {object|null|undefined} quotas
 * @param {'gemini_5h'|'gemini_weekly'|'claude_5h'|'claude_weekly'} slotKey
 * @returns {{ roundedPct: number, shortText: string } | null}
 */
function resolveSpecificQuotaSlotSummary(quotas, slotKey) {
  if (!quotas) return null;
  const pools = Array.isArray(quotas.pools) ? quotas.pools : [];
  const activePool = quotas.activePool || null;
  const isClaude = slotKey.startsWith('claude_');
  const isWeekly = slotKey.endsWith('_weekly');
  let rawPct = null;

  if (isClaude) {
    const claudePool =
      pools.find((p) => p?.poolKey === 'Claude & GPT') ||
      pools.find((p) => THIRD_PARTY_FAMILY_RE.test(String(p?.poolKey || p?.poolLabel || '')));
    const cand = isWeekly ? claudePool?.weeklyRemainingPct : claudePool?.remainingPct;
    if (cand != null && Number.isFinite(Number(cand))) {
      rawPct = Number(cand);
    } else if (
      activePool &&
      THIRD_PARTY_FAMILY_RE.test(String(activePool.family || activePool.poolLabel || ''))
    ) {
      const fb = isWeekly ? activePool.weeklyRemainingPct : activePool.remainingPct;
      if (fb != null && Number.isFinite(Number(fb))) {
        rawPct = Number(fb);
      }
    }
  } else {
    const stdGemini =
      pools.find((p) => p?.poolKey === 'Gemini') ||
      pools.find(
        (p) =>
          /gemini/i.test(String(p?.poolKey || p?.poolLabel || '')) &&
          !/carbon|argon/i.test(String(p?.poolKey || ''))
      );
    const geminiFamilyPools = pools.filter((p) =>
      /gemini|carbon|argon/i.test(String(p?.poolKey || p?.poolLabel || ''))
    );
    const primaryCand = isWeekly ? stdGemini?.weeklyRemainingPct : stdGemini?.remainingPct;
    if (primaryCand != null && Number.isFinite(Number(primaryCand))) {
      rawPct = Number(primaryCand);
    } else {
      const familyVals = geminiFamilyPools
        .map((p) => (isWeekly ? p?.weeklyRemainingPct : p?.remainingPct))
        .filter((v) => v != null && Number.isFinite(Number(v)))
        .map(Number);
      if (familyVals.length > 0) {
        rawPct = Math.min(...familyVals);
      } else if (
        activePool &&
        !THIRD_PARTY_FAMILY_RE.test(String(activePool.family || activePool.poolLabel || ''))
      ) {
        const fb = isWeekly ? activePool.weeklyRemainingPct : activePool.remainingPct;
        if (fb != null && Number.isFinite(Number(fb))) {
          rawPct = Number(fb);
        }
      }
      if (
        rawPct == null &&
        isWeekly &&
        quotas.weekly &&
        !THIRD_PARTY_FAMILY_RE.test(String(quotas.weekly.poolFamily || '')) &&
        quotas.weekly.remainingPct != null &&
        Number.isFinite(Number(quotas.weekly.remainingPct))
      ) {
        rawPct = Number(quotas.weekly.remainingPct);
      }
    }
  }

  if (rawPct == null || !Number.isFinite(rawPct)) return null;
  const rounded = Math.max(0, Math.min(100, Math.round(rawPct)));
  return {
    roundedPct: rounded,
    shortText: `余 ${rounded}%`,
  };
}

function formatCompactCapsuleCost(stepCost) {
  if (stepCost == null || !Number.isFinite(Number(stepCost))) return '--';
  const val = Math.max(0, Number(stepCost));
  if (val === 0) return '$0.00';
  if (val < 0.001) return '<$0.001';
  if (val < 1) return `$${val.toFixed(3)}`;
  if (val < 100) return `$${val.toFixed(2)}`;
  return `$${Math.round(val)}`;
}

function formatCompactCapsuleTtft(ttftSec) {
  if (ttftSec == null || !Number.isFinite(Number(ttftSec)) || Number(ttftSec) < 0) return '--s';
  const val = Number(ttftSec);
  if (val < 1) return `${val.toFixed(2)}s`;
  if (val < 100) return `${val.toFixed(1)}s`;
  return `${Math.round(val)}s`;
}

/**
 * 在主窗口挂载双栖顶栏胶囊与完整四标签悬浮面板，并注册 `window.__AGUsageMonitorOverlay` 生命周期句柄。
 */
export function mountWindowOverlay() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // 先读取旧实例缓存的遥测快照与展开态（热升级时无缝承接数据与悬停状态，杜绝闪烁或关开），再安全卸载旧实例
  let carryOverTelemetry = null;
  let carryOverTooltipOpen = false;
  let carryOverPopoverOpen = false;
  let carryOverMultiHoverOpen = false;
  let carryOverMultiPinnedOpen = false;
  let carryOverPointer = null;
  try {
    const prevOv = window.__AGUsageMonitorOverlay;
    carryOverTelemetry = prevOv?.getTelemetrySnapshot?.() || null;
    carryOverTooltipOpen = Boolean(prevOv?.isHoverOpen?.());
    carryOverPopoverOpen = Boolean(prevOv?.isOpen?.());
    carryOverMultiHoverOpen = Boolean(prevOv?.isMultiHoverOpen?.());
    carryOverMultiPinnedOpen = Boolean(prevOv?.isMultiPinnedOpen?.());
    carryOverPointer = prevOv?.getLastPointer?.() || null;
    prevOv?.dispose?.();
  } catch {
    // 忽略旧实例卸载异常
  }
  try {
    document.getElementById(CAPSULE_HOST_ID)?.remove?.();
    document.getElementById(PORTAL_HOST_ID)?.remove?.();
  } catch {
    // 忽略残留节点清理异常
  }

  const bridgeConfig = getWindowBridgeConfig();
  const bundleVersion = String(bridgeConfig?.bundleVersion || '');
  const stylesCss = String(bridgeConfig?.stylesCss || '');
  const seedTelemetry =
    (bridgeConfig?.initialTelemetry && typeof bridgeConfig.initialTelemetry === 'object'
      ? bridgeConfig.initialTelemetry
      : null) || carryOverTelemetry;
  if (bridgeConfig?.initialTelemetry) {
    delete bridgeConfig.initialTelemetry;
  }
  if (seedTelemetry) {
    telemetryStore.setState({
      telemetry: seedTelemetry,
      minuteTick: Math.floor(Date.now() / 30000),
      syncState: 'idle',
    });
  }

  let disposed = false;
  let popoverOpen = false;
  let tooltipOpen = false;
  let multiOpen = false;
  let multiPinned = false;
  let hoverLeaveTimer = null;
  let multiLeaveTimer = null;
  const manualSubExpandMap = new Map();
  const multiTimersMap = new Map();
  let multiLiveTickTimer = null;
  let hasPointerCoords = Boolean(
    carryOverPointer &&
      Number.isFinite(carryOverPointer.x) &&
      Number.isFinite(carryOverPointer.y)
  );
  let lastPointerX = hasPointerCoords ? carryOverPointer.x : -1;
  let lastPointerY = hasPointerCoords ? carryOverPointer.y : -1;
  let layoutMode = 'wide';
  let observedTitlebar = null;
  let dockRafId = 0;
  let lastObservedRouteId = extractHostRouteCascadeId();

  function recordPointerCoords(e) {
    if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      hasPointerCoords = true;
    }
  }

  function isPointerStillInCapsule() {
    if (!hasPointerCoords || document.hidden || !capsuleBtn.getBoundingClientRect) {
      return false;
    }
    const r = capsuleBtn.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    let rightBound = r.right;
    if (!topbarUpdateBtn.hasAttribute('hidden') && topbarUpdateBtn.getBoundingClientRect) {
      const ur = topbarUpdateBtn.getBoundingClientRect();
      if (ur.width > 0 && ur.height > 0) {
        rightBound = Math.max(rightBound, ur.right);
      }
    }
    return (
      lastPointerX >= r.left - 1 &&
      lastPointerX <= rightBound + 1 &&
      lastPointerY >= r.top - 1 &&
      lastPointerY <= r.bottom + 1
    );
  }

  function isPointerInMultiZone() {
    if (!hasPointerCoords || document.hidden || multiBtn.hasAttribute('hidden')) {
      return false;
    }
    if (multiBtn.getBoundingClientRect) {
      const mr = multiBtn.getBoundingClientRect();
      if (
        mr.width > 0 &&
        mr.height > 0 &&
        lastPointerX >= mr.left - 1 &&
        lastPointerX <= mr.right + 1 &&
        lastPointerY >= mr.top - 1 &&
        lastPointerY <= mr.bottom + 10
      ) {
        return true;
      }
    }
    if (multiOpen && multiPanelEl.getBoundingClientRect) {
      const pr = multiPanelEl.getBoundingClientRect();
      if (
        pr.width > 0 &&
        pr.height > 0 &&
        lastPointerX >= pr.left - 1 &&
        lastPointerX <= pr.right + 1 &&
        lastPointerY >= pr.top - 4 &&
        lastPointerY <= pr.bottom + 1
      ) {
        return true;
      }
    }
    return false;
  }

  function scheduleMultiHoverClose() {
    if (multiLeaveTimer) {
      clearTimeout(multiLeaveTimer);
    }
    multiLeaveTimer = setTimeout(() => {
      multiLeaveTimer = null;
      if (disposed || multiPinned || !multiOpen) return;
      let nativeHover = false;
      try {
        nativeHover = Boolean(
          multiBtn.matches?.(':hover') || multiPanelEl.matches?.(':hover')
        );
      } catch {
        nativeHover = false;
      }
      if (nativeHover || isPointerInMultiZone()) {
        return;
      }
      setMultiOpen(false);
    }, 90);
  }

  function bindMultiElapsedTimer(timerKey, sig, rawStartMs, targetEl) {
    const now = Date.now();
    const prev = multiTimersMap.get(timerKey);
    let startMs = prev?.startMs || 0;
    if (!prev || prev.sig !== sig) {
      const validRaw = Number(rawStartMs || 0);
      startMs = validRaw > 0 && validRaw <= now + 2000 ? validRaw : now;
    } else if (startMs <= 0 && Number(rawStartMs) > 0 && Number(rawStartMs) <= now + 2000) {
      startMs = Number(rawStartMs);
    }
    multiTimersMap.set(timerKey, { sig, startMs, el: targetEl });
    const elapsedSec = Math.max(0, (now - startMs) / 1000);
    patchText(targetEl, formatElapsedSec(elapsedSec));
  }

  function tickMultiElapsedDisplay() {
    const now = Date.now();
    for (const entry of multiTimersMap.values()) {
      if (!entry?.el) continue;
      const elapsedSec = entry.startMs > 0 ? Math.max(0, (now - entry.startMs) / 1000) : 0;
      patchText(entry.el, formatElapsedSec(elapsedSec));
    }
  }

  function stopMultiLiveTicker() {
    if (multiLiveTickTimer) {
      clearInterval(multiLiveTickTimer);
      multiLiveTickTimer = null;
    }
    multiTimersMap.clear();
  }

  function ensureMultiLiveTicker() {
    if (multiTimersMap.size === 0) {
      stopMultiLiveTicker();
      return;
    }
    if (!multiLiveTickTimer) {
      multiLiveTickTimer = setInterval(tickMultiElapsedDisplay, 1000);
    }
  }

  function inspectSessionInMonitor(cascadeId) {
    if (!cascadeId || cascadeId === 'current') return;
    uiStore.setState({
      activeView: 'overview',
      selectedAgentScope: 'all',
      ctxInspectorAgentId: 'auto',
    });
    telemetryStore.setState({ selectedConversationId: cascadeId });
    void fetchTelemetry({ force: false });
    setMultiOpen(false);
    setPopoverOpen(true);
  }

  // --- 1. 创建顶栏双胶囊 Shadow Host（左：多会话实时信息；右：单会话指标胶囊） ---
  const capsuleHost = document.createElement('div');
  capsuleHost.id = CAPSULE_HOST_ID;
  capsuleHost.className = 'wm-capsule-host';
  capsuleHost.setAttribute('data-dock', 'fixed');
  capsuleHost.setAttribute('data-layout', layoutMode);
  const capsuleShadow = capsuleHost.attachShadow({ mode: 'open' });

  const capsuleStyleEl = document.createElement('style');
  capsuleStyleEl.textContent = stylesCss;
  capsuleShadow.appendChild(capsuleStyleEl);

  // 左侧无边框多会话实时触发按钮（固定预占宽度，不随运行数跳动）
  const multiDot = h('span', { className: 'wm-multi-dot' });
  const multiLabel = h('span', { className: 'wm-multi-label', text: '0 运行中' });
  const multiBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-multi-btn',
      'aria-label': '多会话实时信息',
      'aria-expanded': 'false',
      onClick: (e) => {
        e.stopPropagation();
        if (multiOpen && multiPinned) {
          setMultiOpen(false);
        } else {
          setMultiOpen(true, { pinned: true });
        }
      },
      onContextmenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        void fetchTelemetry({ force: true });
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (multiLeaveTimer) {
          clearTimeout(multiLeaveTimer);
          multiLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          setMultiOpen(true, { pinned: false });
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (!multiPinned) {
          scheduleMultiHoverClose();
        }
      },
    },
    [multiDot, multiLabel]
  );

  // 构建可复用的预占胶囊槽位节点（仅当槽位配置为 context 时挂载环形 SVG，运行期仅就地更新文本与属性）
  function createCapsuleSlot(slotIndex, initialMetric) {
    const ringSvg = document.createElementNS(SVG_NS, 'svg');
    ringSvg.setAttribute('viewBox', '0 0 14 14');
    ringSvg.setAttribute('class', 'wm-ring-svg');
    ringSvg.setAttribute('aria-hidden', 'true');

    const ringTrack = document.createElementNS(SVG_NS, 'circle');
    ringTrack.setAttribute('cx', '7');
    ringTrack.setAttribute('cy', '7');
    ringTrack.setAttribute('r', String(RING_RADIUS));
    ringTrack.setAttribute('class', 'wm-ring-track');

    const ringFill = document.createElementNS(SVG_NS, 'circle');
    ringFill.setAttribute('cx', '7');
    ringFill.setAttribute('cy', '7');
    ringFill.setAttribute('r', String(RING_RADIUS));
    ringFill.setAttribute('class', 'wm-ring-fill');
    ringFill.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
    ringFill.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE));

    ringSvg.appendChild(ringTrack);
    ringSvg.appendChild(ringFill);

    const isCtx = initialMetric === 'context';
    const textSpan = h('span', {
      className: isCtx ? 'wm-slot-text wm-ctx-pct' : 'wm-slot-text',
      text: isCtx ? '--%' : initialMetric === 'tps' ? '-- t/s' : '余 --%',
    });
    const el = h(
      'span',
      {
        className: isCtx
          ? 'wm-cap-slot wm-ctx-seg'
          : initialMetric === 'tps'
            ? 'wm-cap-slot wm-seg-speed'
            : 'wm-cap-slot wm-seg-quota',
        'data-slot-idx': String(slotIndex),
        'data-metric': initialMetric,
        'data-vis-rank': String(slotIndex + 1),
      },
      isCtx ? [ringSvg, textSpan] : [textSpan]
    );

    return {
      el,
      ringSvg,
      ringFill,
      textSpan,
      ringMounted: isCtx,
    };
  }

  const capsuleSlots = [
    createCapsuleSlot(0, 'context'),
    createCapsuleSlot(1, 'tps'),
    createCapsuleSlot(2, 'quota_auto'),
  ];
  const sep0 = h('span', { className: 'wm-sep wm-sep-speed', 'data-sep-for-rank': '2' });
  const sep1 = h('span', { className: 'wm-sep wm-sep-quota', 'data-sep-for-rank': '3' });
  let lastShowMulti = true;
  let lastShowUpdate = false;
  let isTopbarUpdating = false;

  const updateDot = h('span', { className: 'wm-update-dot', hidden: true });
  const topbarUpdateIcon = createSvgIcon('arrow-down', { size: 10 });
  const topbarUpdateLabel = h('span', { className: 'wm-update-label', text: '新版本' });
  const topbarUpdateBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-update-btn',
      hidden: true,
      'aria-label': '发现新版本，点击更新',
      title: '发现新版本，点击立即更新',
      onClick: async (e) => {
        e.stopPropagation();
        if (isTopbarUpdating) return;
        isTopbarUpdating = true;
        patchClasses(topbarUpdateBtn, { 'is-updating': true });
        patchSvgIcon(topbarUpdateIcon, 'refresh');
        patchText(topbarUpdateLabel, '更新中…');
        patchAttr(topbarUpdateBtn, 'disabled', true);
        try {
          const res = await triggerPluginUpdate();
          if (!res?.ok) {
            uiStore.setState({ activeView: 'settings' });
            setPopoverOpen(true);
          }
        } catch {
          uiStore.setState({ activeView: 'settings' });
          setPopoverOpen(true);
        } finally {
          isTopbarUpdating = false;
          patchClasses(topbarUpdateBtn, { 'is-updating': false });
          patchSvgIcon(topbarUpdateIcon, 'arrow-down');
          patchAttr(topbarUpdateBtn, 'disabled', false);
          const cs = telemetryStore.getState().telemetry?.cloudStatus;
          patchText(
            topbarUpdateLabel,
            cs?.latestPluginVersion ? `v${cs.latestPluginVersion}` : '新版本'
          );
        }
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
          hoverLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          if (multiOpen) {
            setMultiOpen(false);
          }
          setTooltipOpen(true);
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
        }
        hoverLeaveTimer = setTimeout(() => {
          hoverLeaveTimer = null;
          if (disposed || popoverOpen) return;
          let nativeHover = false;
          try {
            nativeHover = Boolean(
              capsuleBtn.matches?.(':hover') || topbarUpdateBtn.matches?.(':hover')
            );
          } catch {
            nativeHover = false;
          }
          if (nativeHover || isPointerStillInCapsule()) {
            return;
          }
          setTooltipOpen(false);
        }, 40);
      },
    },
    [topbarUpdateIcon, topbarUpdateLabel]
  );

  const capsuleBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-capsule-btn',
      'aria-label': '用量与速度监控',
      'aria-expanded': 'false',
      onClick: (e) => {
        e.stopPropagation();
        setPopoverOpen(!popoverOpen);
      },
      onContextmenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        void fetchTelemetry({ force: true });
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
          hoverLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          if (multiOpen) {
            setMultiOpen(false);
          }
          setTooltipOpen(true);
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
        }
        hoverLeaveTimer = setTimeout(() => {
          hoverLeaveTimer = null;
          if (disposed || popoverOpen) return;
          let nativeHover = false;
          try {
            nativeHover = Boolean(
              capsuleBtn.matches?.(':hover') || topbarUpdateBtn.matches?.(':hover')
            );
          } catch {
            nativeHover = false;
          }
          if (nativeHover || isPointerStillInCapsule()) {
            return;
          }
          setTooltipOpen(false);
        }, 40);
      },
    },
    [capsuleSlots[0].el, sep0, capsuleSlots[1].el, sep1, capsuleSlots[2].el, updateDot]
  );
  capsuleShadow.appendChild(multiBtn);
  capsuleShadow.appendChild(capsuleBtn);
  capsuleShadow.appendChild(topbarUpdateBtn);

  // --- 2. 创建 Body 顶层浮层 Portal Shadow Host ---
  const portalHost = document.createElement('div');
  portalHost.id = PORTAL_HOST_ID;
  portalHost.className = 'wm-portal-host';
  const portalShadow = portalHost.attachShadow({ mode: 'open' });

  const portalStyleEl = document.createElement('style');
  portalStyleEl.textContent = stylesCss;
  portalShadow.appendChild(portalStyleEl);

  // 悬停全景概览浮层（复用实时概览三卡片架构：4格测速矩阵 + 10通道上下文窗口 + 动态配额池，全槽位预占）
  const hoverTpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
  const hoverTpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
  const hoverPulseDot = createSvgIcon('dot', { size: 10 });

  const hoverTtftVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverTtftSub = h('span', { className: 'cell-sub', text: '均值 —' });

  const hoverAvgVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverAvgSub = h('span', { className: 'cell-sub', text: '有效 0/0 步' });

  const hoverCostVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverCacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累计 $0.00' });

  const hoverMatrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '实时指标' }, [
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [h('span', { text: '输出速度' }), hoverPulseDot]),
      hoverTpsVal,
      hoverTpsSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '首字延迟' }),
        createSvgIcon('clock', { size: 11 }),
      ]),
      hoverTtftVal,
      hoverTtftSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '平均速度' }),
        createSvgIcon('pulse', { size: 11 }),
      ]),
      hoverAvgVal,
      hoverAvgSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '本次费用' }),
        createSvgIcon('bolt', { size: 11 }),
      ]),
      hoverCostVal,
      hoverCacheSub,
    ]),
  ]);

  const hoverCtxAgentBadge = h('span', {
    className: 'agent-badge badge-main',
    hidden: true,
    text: '主代理',
  });
  const hoverCtxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
  const hoverCtxSegmentBar = ContextSegmentMeter({ context: {} });

  // 固定预占 10 个双列图例槽位，排序时仅就地替换色块类名与文本，不调用 appendChild 移动节点
  const hoverLegendSlots = CTX_CHANNEL_DEFS.map((ch) => {
    const swatchEl = h('span', { className: `swatch ${ch.segClass}` });
    const labelEl = h('span', { text: ch.label });
    const valEl = h('strong', { className: 'text-mono', text: '0' });
    const itemEl = h('div', { className: 'legend-item' }, [
      h('span', { className: 'legend-left' }, [swatchEl, labelEl]),
      valEl,
    ]);
    return { itemEl, swatchEl, labelEl, valEl };
  });

  const hoverCtxLegendGrid = h(
    'div',
    { className: 'ctx-legend-grid' },
    hoverLegendSlots.map((slot) => slot.itemEl)
  );

  const hoverCtxPanel = h('section', { className: 'panel' }, [
    h('div', { className: 'panel-header' }, [
      h('span', { className: 'panel-title' }, [
        createSvgIcon('layers', { size: 13 }),
        h('span', { text: '上下文窗口' }),
        hoverCtxAgentBadge,
      ]),
      h('span', { className: 'panel-meta' }, [hoverCtxSummaryText]),
    ]),
    hoverCtxSegmentBar.el,
    hoverCtxLegendGrid,
  ]);

  const hoverTierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });
  const hoverPoolsListEl = h('div', { className: 'wm-hover-quota-pools' });
  patchKeyedList(
    hoverPoolsListEl,
    buildQuotaPoolItems(null, 0, { isPending: true }),
    {
      keyFn: (item) => item.key,
      sigFn: quotaPoolRowSig,
      createRow: createPoolQuotaRow,
      updateRow: syncPoolQuotaRow,
    }
  );
  const hoverWkFootLeft = h('span', { className: 'text-muted', text: '本周累计: 0 ($0.00)' });
  const hoverWkFootRight = h('span', { className: 'text-muted', text: '本周调用: 0 次' });

  const hoverQuotaPanel = h('section', { className: 'panel' }, [
    h('div', { className: 'panel-header' }, [
      h('span', { className: 'panel-title' }, [
        createSvgIcon('pulse', { size: 13 }),
        h('span', { text: '可用额度' }),
      ]),
      hoverTierBadge,
    ]),
    hoverPoolsListEl,
    h('div', { className: 'panel-header wm-hover-quota-foot' }, [
      hoverWkFootLeft,
      hoverWkFootRight,
    ]),
  ]);

  const hoverUpdateVerText = h('span', { text: '发现新版本' });
  const hoverUpdateHintText = h('span', {
    className: 'wm-hover-update-hint',
    text: '点击顶栏版本胶囊即可一键更新',
  });
  const hoverUpdateBar = h(
    'div',
    {
      className: 'wm-hover-update-bar',
      hidden: true,
    },
    [
      h('span', { className: 'wm-hover-update-left' }, [
        createSvgIcon('arrow-down', { size: 11 }),
        hoverUpdateVerText,
      ]),
      hoverUpdateHintText,
    ]
  );

  const hoverTipEl = h(
    'div',
    {
      className: 'wm-hover-tip',
      hidden: true,
    },
    [hoverUpdateBar, hoverMatrixEl, hoverCtxPanel, hoverQuotaPanel]
  );

  // 左侧多会话实时看板浮层（活跃运行会话卡片 + 近期多窗口会话速览，全槽位预占、就地补丁更新）
  function createMultiLiveSubRow() {
    const subBadge = h('span', { className: 'agent-badge badge-sub-1', text: '子1' });
    const subRole = h('span', { className: 'live-sub-role', text: '子代理' });
    const subSummary = h('span', { className: 'live-sub-summary', text: '' });
    const subElapsed = h('span', { className: 'live-sub-elapsed text-mono', text: '0s' });
    const rowEl = h('div', { className: 'live-sub-row' }, [
      h('div', { className: 'live-sub-left' }, [subBadge, subRole, subSummary]),
      subElapsed,
    ]);
    return {
      el: rowEl,
      refs: { rowEl, subBadge, subRole, subSummary, subElapsed },
    };
  }

  function createMultiLiveTaskCard() {
    const dotIcon = createSvgIcon('dot', { size: 11 });
    patchClasses(dotIcon, { 'is-pulsing': true });
    const dotWrap = h('span', { className: 'live-activity-dot' }, [dotIcon]);
    const titleEl = h('strong', { className: 'live-task-title', text: '当前会话' });
    const hereTagEl = h('span', {
      className: 'wm-session-tag is-here',
      hidden: true,
      text: '本窗',
    });
    const metricsEl = h('span', {
      className: 'wm-task-metrics text-mono',
      hidden: true,
      text: '',
    });
    const subToggleBtn = h('button', {
      type: 'button',
      className: 'live-sub-toggle',
      hidden: true,
      text: '子代理 (0) ▸',
    });
    const elapsedEl = h('span', {
      className: 'live-activity-elapsed text-mono',
      text: '0s',
    });

    const headerEl = h('div', { className: 'live-task-header' }, [
      h('div', { className: 'live-task-title-wrap' }, [dotWrap, titleEl, hereTagEl]),
      h('div', { className: 'live-task-header-right' }, [metricsEl, subToggleBtn, elapsedEl]),
    ]);

    const mainBadge = h('span', {
      className: 'agent-badge badge-main',
      hidden: true,
      text: '主',
    });
    const mainPhase = h('strong', { className: 'live-activity-phase', text: '推理中' });
    const mainProgress = h('span', {
      className: 'live-activity-progress text-mono',
      hidden: true,
      text: '',
    });
    const mainSep = h('span', { className: 'live-activity-sep', hidden: true, text: '·' });
    const mainDetail = h('span', {
      className: 'live-activity-detail',
      hidden: true,
      text: '',
    });

    const mainRowEl = h('div', { className: 'live-task-main-row' }, [
      mainBadge,
      mainPhase,
      mainProgress,
      mainSep,
      mainDetail,
    ]);

    const subListEl = h('div', { className: 'live-sub-list', hidden: true });
    const cardEl = h('div', { className: 'live-task-card' }, [headerEl, mainRowEl, subListEl]);

    return {
      el: cardEl,
      refs: {
        cardEl,
        dotIcon,
        titleEl,
        hereTagEl,
        metricsEl,
        subToggleBtn,
        elapsedEl,
        mainBadge,
        mainPhase,
        mainProgress,
        mainSep,
        mainDetail,
        subListEl,
      },
    };
  }

  const multiPinBadge = h('span', { className: 'wm-pin-badge', hidden: true, text: '已固定' });
  const multiRunningMetaEl = h('span', { className: 'panel-meta text-mono', text: '读取中...' });
  const multiEmptyEl = h('div', { className: 'wm-multi-empty' }, [
    h('span', { className: 'wm-multi-empty-left' }, [
      h('span', { className: 'wm-idle-dot' }),
      h('span', { text: '当前暂无在线运行的会话' }),
    ]),
  ]);
  const multiRunningListEl = h('div', {
    className: 'live-activity-list',
    hidden: true,
    'aria-live': 'polite',
  });

  const multiHeaderEl = h('div', { className: 'panel-header wm-multi-header' }, [
    h('span', { className: 'panel-title' }, [
      createSvgIcon('pulse', { size: 13 }),
      h('span', { text: '实时运行会话' }),
      multiPinBadge,
    ]),
    multiRunningMetaEl,
  ]);

  const multiPanelEl = h(
    'div',
    {
      className: 'wm-multi-panel',
      role: 'dialog',
      'aria-label': '多会话实时信息面板',
      hidden: true,
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (multiLeaveTimer) {
          clearTimeout(multiLeaveTimer);
          multiLeaveTimer = null;
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (!multiPinned) {
          scheduleMultiHoverClose();
        }
      },
    },
    [multiHeaderEl, multiEmptyEl, multiRunningListEl]
  );

  // 完整四标签悬浮容器
  const appInstance = App();
  const popoverEl = h(
    'div',
    {
      className: 'wm-popover-panel',
      role: 'dialog',
      'aria-label': '用量与速度监控面板',
      hidden: true,
    },
    [appInstance.el]
  );

  portalShadow.appendChild(multiPanelEl);
  portalShadow.appendChild(hoverTipEl);
  portalShadow.appendChild(popoverEl);
  (document.body || document.documentElement).appendChild(portalHost);

  // --- 3. 几何测量、顶栏停靠与防溢出定位 ---
  function updateFixedFallbackPosition() {
    if (capsuleHost.getAttribute('data-dock') === 'flow') {
      capsuleHost.style.top = '';
      capsuleHost.style.right = '';
      return;
    }
    try {
      const vw = Number(window.innerWidth || 1280);
      let rightOffset = 144;
      const anchor = findNativeTopRightAnchor();
      if (anchor?.getBoundingClientRect) {
        const r = anchor.getBoundingClientRect();
        if (r.width > 0 && r.left > 0 && r.left < vw) {
          rightOffset = Math.max(144, Math.ceil(vw - r.left + 6));
        }
      }
      capsuleHost.style.top = '7px';
      capsuleHost.style.right = `${rightOffset}px`;
    } catch {
      // 忽略回退坐标计算异常
    }
  }

  function measureAvailableTitlebarWidth(titlebar) {
    try {
      if (titlebar?.getBoundingClientRect) {
        const tbRect = titlebar.getBoundingClientRect();
        if (tbRect.width > 0) {
          const titleEl = titlebar.firstElementChild;
          const titleInner = titleEl?.firstElementChild;
          const contentStart = titleInner?.getBoundingClientRect
            ? Math.max(8, titleInner.getBoundingClientRect().left - tbRect.left)
            : tbRect.left < 168
              ? 168 - tbRect.left
              : 12;
          const minTitleWidth = 180;
          let siblingButtonsWidth = 64;
          let rightPad = 8;
          const rightGroup = capsuleHost.parentElement;
          if (rightGroup && rightGroup !== titlebar) {
            const auxOpen =
              typeof document.querySelector === 'function' &&
              Boolean(document.querySelector('[data-testid="aux-pane-sash"]'));
            const root =
              typeof document.querySelector === 'function'
                ? document.querySelector('div.h-screen.w-screen')
                : null;
            const rightClusterVar =
              root?.style?.getPropertyValue?.('--right-cluster-width')?.trim() || '';
            if (auxOpen) {
              rightPad = 8;
            } else if (rightClusterVar) {
              rightPad = Math.max(8, (parseFloat(rightClusterVar) || 44) - 4);
            } else if (typeof window.getComputedStyle === 'function') {
              rightPad = parseFloat(window.getComputedStyle(rightGroup).paddingRight) || 0;
            }
            if (rightGroup.children) {
              let sum = 0;
              for (const child of rightGroup.children) {
                if (child !== capsuleHost && child.getBoundingClientRect) {
                  sum += child.getBoundingClientRect().width;
                }
              }
              if (sum > 0) siblingButtonsWidth = sum + 8;
            }
          }
          return tbRect.width - contentStart - minTitleWidth - rightPad - siblingButtonsWidth;
        }
      }
      if (window.innerWidth) {
        return window.innerWidth - 360;
      }
    } catch {
      // 忽略测量异常
    }
    return 320;
  }

  function positionFloatingElements() {
    if (disposed || !capsuleBtn.getBoundingClientRect) return;
    try {
      const bRect = capsuleBtn.getBoundingClientRect();
      if (bRect.width === 0 && bRect.height === 0) return;
      const vw = Number(window.innerWidth || 1280);
      const vh = Number(window.innerHeight || 800);
      const navRight = getLeftSidebarRightEdge(vw);
      const minLeft = navRight > 0 ? Math.max(12, navRight + 12) : 12;
      const defaultCardW = Math.min(FLOATING_CARD_WIDTH, Math.max(280, vw - 24));
      const defaultMultiW = Math.min(MULTI_PANEL_WIDTH, Math.max(280, vw - 24));

      if (multiOpen) {
        const mRect = multiBtn.getBoundingClientRect?.() || bRect;
        const anchorRect = mRect.width > 0 || mRect.height > 0 ? mRect : bRect;
        const rawW =
          Number(multiPanelEl.offsetWidth) ||
          Number(multiPanelEl.getBoundingClientRect?.().width) ||
          defaultMultiW;
        const panelW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const panelH =
          Number(multiPanelEl.offsetHeight) ||
          Number(multiPanelEl.getBoundingClientRect?.().height) ||
          320;
        let top = Math.max(38, Math.round(anchorRect.bottom + 6));
        if (top + panelH > vh - 8 && anchorRect.top > panelH + 12) {
          top = Math.round(anchorRect.top - panelH - 6);
        }
        let left = Math.round(anchorRect.left);
        left = Math.min(left, vw - panelW - 12);
        left = Math.max(minLeft, left);
        multiPanelEl.style.top = `${top}px`;
        multiPanelEl.style.left = `${left}px`;
        multiPanelEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }

      const rightAnchorEdge =
        !topbarUpdateBtn.hasAttribute('hidden') && topbarUpdateBtn.getBoundingClientRect
          ? Math.max(bRect.right, topbarUpdateBtn.getBoundingClientRect().right || 0)
          : bRect.right;

      if (popoverOpen) {
        const rawW =
          Number(popoverEl.offsetWidth) ||
          Number(popoverEl.getBoundingClientRect?.().width) ||
          defaultCardW;
        const panelW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const top = Math.max(38, Math.min(vh - 140, Math.round(bRect.bottom + 6)));
        let left = Math.round(rightAnchorEdge - panelW);
        left = Math.min(left, vw - panelW - 12);
        left = Math.max(minLeft, left);
        popoverEl.style.top = `${top}px`;
        popoverEl.style.left = `${left}px`;
        popoverEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }

      if (tooltipOpen && !popoverOpen && !multiOpen) {
        const rawW =
          Number(hoverTipEl.offsetWidth) ||
          Number(hoverTipEl.getBoundingClientRect?.().width) ||
          defaultCardW;
        const tipW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const tipH =
          Number(hoverTipEl.offsetHeight) ||
          Number(hoverTipEl.getBoundingClientRect?.().height) ||
          480;
        let top = Math.max(38, Math.round(bRect.bottom + 6));
        if (top + tipH > vh - 8 && bRect.top > tipH + 12) {
          top = Math.round(bRect.top - tipH - 6);
        }
        let left = Math.round(rightAnchorEdge - tipW);
        left = Math.min(left, vw - tipW - 12);
        left = Math.max(minLeft, left);
        hoverTipEl.style.top = `${top}px`;
        hoverTipEl.style.left = `${left}px`;
        hoverTipEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }
    } catch {
      // 忽略定位异常
    }
  }

  function updateResponsiveLayout() {
    if (disposed) return;
    const titlebar = findHostTitlebar();
    const avail = measureAvailableTitlebarWidth(titlebar);
    const curTel = telemetryStore.getState().telemetry;
    const showMulti = curTel?.settings?.showTopbarMultiSession !== false;
    const curUpdateMode = normalizeClientUpdateMode(
      curTel?.settings?.pluginUpdateMode,
      curTel?.settings?.autoUpdatePlugin
    );
    const hasUpdate = Boolean(curTel?.cloudStatus?.updateAvailable) && curUpdateMode !== 'off';
    const nextMode = computeCapsuleLayoutMode(avail, layoutMode, { showMulti, hasUpdate });
    if (nextMode !== layoutMode) {
      layoutMode = nextMode;
      capsuleHost.setAttribute('data-layout', layoutMode);
    }
    if (capsuleHost.getAttribute('data-dock') === 'fixed') {
      updateFixedFallbackPosition();
    }
    if (popoverOpen || tooltipOpen || multiOpen) {
      positionFloatingElements();
    }
  }

  let resizeObserver = null;

  function ensureCapsuleDocked() {
    if (disposed) return false;
    const bodyOrDoc = document.body || document.documentElement;
    if (bodyOrDoc && !portalHost.isConnected) {
      bodyOrDoc.appendChild(portalHost);
    }

    const titlebar = findHostTitlebar();
    if (titlebar) {
      let targetContainer = titlebar;
      try {
        const rightGroup = titlebar.querySelector(':scope > div.shrink-0') || titlebar.lastElementChild;
        if (rightGroup && rightGroup !== titlebar.firstElementChild) {
          targetContainer = rightGroup;
        }
      } catch {
        // 忽略子选择器不兼容场景
      }

      if (capsuleHost.parentElement !== targetContainer) {
        if (targetContainer.firstChild && targetContainer !== titlebar) {
          targetContainer.insertBefore(capsuleHost, targetContainer.firstChild);
        } else {
          targetContainer.appendChild(capsuleHost);
        }
      }
      patchAttr(capsuleHost, 'data-dock', 'flow');
      if (capsuleHost.style.top) capsuleHost.style.top = '';
      if (capsuleHost.style.right) capsuleHost.style.right = '';

      if (observedTitlebar !== titlebar) {
        observedTitlebar = titlebar;
        try {
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver.observe(titlebar);
            if (document.body) resizeObserver.observe(document.body);
          }
        } catch {
          // 忽略观察器异常
        }
      }
    } else if (bodyOrDoc) {
      if (capsuleHost.parentElement !== bodyOrDoc) {
        bodyOrDoc.appendChild(capsuleHost);
      }
      patchAttr(capsuleHost, 'data-dock', 'fixed');
      updateFixedFallbackPosition();
    }

    updateResponsiveLayout();
    return Boolean(capsuleHost.isConnected && portalHost.isConnected);
  }

  function scheduleDockSync() {
    if (disposed) return;
    if (typeof requestAnimationFrame === 'function') {
      if (dockRafId) return;
      dockRafId = requestAnimationFrame(() => {
        dockRafId = 0;
        ensureCapsuleDocked();
      });
    } else {
      ensureCapsuleDocked();
    }
  }

  function refreshActiveViewScrollbars() {
    const activeView = uiStore.getState().activeView;
    const refs = appInstance.refs;
    if (activeView === 'overview') {
      refs?.overviewView?.refs?.viewScrollbar?.refresh();
    } else if (activeView === 'consumption') {
      refs?.consumptionView?.refs?.viewScrollbar?.refresh();
    } else if (activeView === 'steps') {
      refs?.stepsView?.refs?.stepsScroll?.refresh();
      refs?.stepsView?.refs?.modelsScroll?.refresh();
    } else if (activeView === 'settings') {
      refs?.settingsView?.refs?.viewScrollbar?.refresh();
    }
  }

  function setMultiOpen(nextOpen, { pinned = false, instant = false } = {}) {
    const targetOpen = Boolean(nextOpen);
    if (targetOpen && multiLeaveTimer) {
      clearTimeout(multiLeaveTimer);
      multiLeaveTimer = null;
    }
    if (targetOpen) {
      setTooltipOpen(false);
      if (pinned && popoverOpen) {
        setPopoverOpen(false);
      }
    }
    const nextPinned = targetOpen ? Boolean(pinned) : false;
    const stateChanged = multiOpen !== targetOpen || multiPinned !== nextPinned;
    multiOpen = targetOpen;
    multiPinned = nextPinned;
    patchClasses(multiBtn, { 'is-open': multiOpen && multiPinned });
    patchAttr(multiBtn, 'aria-expanded', multiOpen ? 'true' : 'false');
    patchAttr(multiPinBadge, 'hidden', !multiPinned);
    if (!stateChanged) return;
    patchClasses(multiPanelEl, { 'is-instant': Boolean(instant && multiOpen) });
    patchAttr(multiPanelEl, 'hidden', !multiOpen);
    if (multiOpen) {
      positionFloatingElements();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => positionFloatingElements());
      }
    }
  }

  function setTooltipOpen(nextOpen, { instant = false } = {}) {
    const targetOpen = Boolean(nextOpen && !popoverOpen && !(multiOpen && multiPinned));
    if (targetOpen && hoverLeaveTimer) {
      clearTimeout(hoverLeaveTimer);
      hoverLeaveTimer = null;
    }
    if (targetOpen && multiOpen && !multiPinned) {
      setMultiOpen(false);
    }
    if (tooltipOpen === targetOpen) return;
    tooltipOpen = targetOpen;
    patchClasses(hoverTipEl, { 'is-instant': Boolean(instant && targetOpen) });
    patchAttr(hoverTipEl, 'hidden', !tooltipOpen);
    if (tooltipOpen) {
      positionFloatingElements();
    }
  }

  function setPopoverOpen(nextOpen, { instant = false } = {}) {
    const targetOpen = Boolean(nextOpen);
    if (targetOpen) {
      setTooltipOpen(false);
      if (multiOpen) {
        setMultiOpen(false);
      }
    }
    if (popoverOpen === targetOpen) return;
    popoverOpen = targetOpen;
    patchClasses(capsuleBtn, { 'is-open': popoverOpen });
    patchClasses(popoverEl, { 'is-instant': Boolean(instant && popoverOpen) });
    patchAttr(capsuleBtn, 'aria-expanded', popoverOpen ? 'true' : 'false');
    patchAttr(popoverEl, 'hidden', !popoverOpen);
    if (popoverOpen) {
      positionFloatingElements();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          positionFloatingElements();
          refreshActiveViewScrollbars();
        });
      } else {
        refreshActiveViewScrollbars();
      }
    }
  }

  function resolveCapsuleSlotPresentation(metricKey, slotCtx) {
    if (metricKey === 'none') {
      return {
        hidden: true,
        metric: 'none',
        segClass: 'wm-cap-slot',
        textClass: 'wm-slot-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: '',
        running: false,
        warn: false,
        danger: false,
      };
    }

    if (metricKey === 'context') {
      if (!slotCtx.hasTelemetry) {
        return {
          hidden: false,
          metric: 'context',
          segClass: 'wm-cap-slot wm-ctx-seg',
          textClass: 'wm-slot-text wm-ctx-pct',
          showRing: true,
          dashOffset: RING_CIRCUMFERENCE,
          text: '--%',
          running: false,
          warn: false,
          danger: false,
        };
      }
      const isDanger = slotCtx.usedPct >= 88;
      const isWarn = !isDanger && slotCtx.usedPct >= 70;
      return {
        hidden: false,
        metric: 'context',
        segClass: 'wm-cap-slot wm-ctx-seg',
        textClass: 'wm-slot-text wm-ctx-pct',
        showRing: true,
        dashOffset: slotCtx.dashOffset,
        text: `${Math.round(slotCtx.usedPct)}%`,
        running: false,
        warn: isWarn,
        danger: isDanger,
      };
    }

    if (metricKey === 'tps') {
      if (!slotCtx.hasTelemetry) {
        return {
          hidden: false,
          metric: 'tps',
          segClass: 'wm-cap-slot wm-seg-speed',
          textClass: 'wm-slot-text wm-speed-text',
          showRing: false,
          dashOffset: RING_CIRCUMFERENCE,
          text: '-- t/s',
          running: false,
          warn: false,
          danger: false,
        };
      }
      const hasValidTps = Number.isFinite(slotCtx.tps) && slotCtx.tps > 0;
      const tpsText = hasValidTps
        ? `${slotCtx.tps >= 100 ? Math.round(slotCtx.tps) : slotCtx.tps.toFixed(1)} t/s`
        : slotCtx.isRunning
          ? '生成中'
          : '待命';
      return {
        hidden: false,
        metric: 'tps',
        segClass: 'wm-cap-slot wm-seg-speed',
        textClass: 'wm-slot-text wm-speed-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: tpsText,
        running: slotCtx.isRunning,
        warn: false,
        danger: false,
      };
    }

    if (metricKey === 'ttft') {
      const val = slotCtx.hasTelemetry ? slotCtx.ttft : null;
      const valid = val != null && Number.isFinite(Number(val)) && Number(val) >= 0;
      const numVal = valid ? Number(val) : 0;
      const isDanger = valid && numVal >= 30;
      const isWarn = valid && !isDanger && numVal >= 15;
      return {
        hidden: false,
        metric: 'ttft',
        segClass: 'wm-cap-slot wm-seg-ttft',
        textClass: 'wm-slot-text wm-ttft-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: valid ? formatCompactCapsuleTtft(numVal) : '--s',
        running: false,
        warn: isWarn,
        danger: isDanger,
      };
    }

    if (metricKey === 'cost') {
      const costVal = slotCtx.hasTelemetry ? slotCtx.stepCost : null;
      return {
        hidden: false,
        metric: 'cost',
        segClass: 'wm-cap-slot wm-seg-cost',
        textClass: 'wm-slot-text wm-cost-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: slotCtx.hasTelemetry ? formatCompactCapsuleCost(costVal) : '--',
        running: false,
        warn: false,
        danger: false,
      };
    }

    const quotaSum = !slotCtx.hasTelemetry
      ? null
      : metricKey === 'quota_auto'
        ? resolveQuotaCapsuleSummary(slotCtx.quotas)
        : resolveSpecificQuotaSlotSummary(slotCtx.quotas, metricKey);
    const isDanger = Boolean(quotaSum && quotaSum.roundedPct <= 15);
    const isWarn = Boolean(quotaSum && !isDanger && quotaSum.roundedPct <= 30);
    return {
      hidden: false,
      metric: metricKey,
      segClass: 'wm-cap-slot wm-seg-quota',
      textClass: 'wm-slot-text wm-quota-text',
      showRing: false,
      dashOffset: RING_CIRCUMFERENCE,
      text: quotaSum ? quotaSum.shortText : '余 --%',
      running: false,
      warn: isWarn,
      danger: isDanger,
    };
  }

  function applyCapsuleSlots(slotKeys, slotCtx) {
    const presList = slotKeys.map((key) => resolveCapsuleSlotPresentation(key, slotCtx));
    let visRank = 0;
    const visRanks = [0, 0, 0];
    for (let i = 0; i < 3; i += 1) {
      const slot = capsuleSlots[i];
      const pres = presList[i];
      if (pres.hidden) {
        patchAttr(slot.el, 'hidden', true);
        patchAttr(slot.el, 'data-metric', 'none');
        patchAttr(slot.el, 'data-vis-rank', '');
        continue;
      }
      visRank += 1;
      visRanks[i] = visRank;
      patchAttr(slot.el, 'hidden', false);
      patchAttr(slot.el, 'data-metric', pres.metric);
      patchAttr(slot.el, 'data-vis-rank', String(visRank));

      if (pres.showRing && !slot.ringMounted) {
        slot.el.insertBefore(slot.ringSvg, slot.textSpan);
        slot.ringMounted = true;
      } else if (!pres.showRing && slot.ringMounted) {
        slot.ringSvg.remove();
        slot.ringMounted = false;
      }

      const fullSegClass =
        `${pres.segClass}${pres.running ? ' state-running' : ''}${pres.warn ? ' tone-warn' : ''}${pres.danger ? ' tone-danger' : ''}`;
      patchAttr(slot.el, 'class', fullSegClass);
      const fullTextClass =
        `${pres.textClass}${pres.warn ? ' tone-warn' : ''}${pres.danger ? ' tone-danger' : ''}`;
      patchAttr(slot.textSpan, 'class', fullTextClass);
      patchText(slot.textSpan, pres.text);

      if (pres.showRing) {
        slot.ringFill.setAttribute('stroke-dashoffset', String(pres.dashOffset));
        patchClasses(slot.ringFill, { 'tone-warn': pres.warn, 'tone-danger': pres.danger });
      }
    }

    const showSep0 = visRanks[1] >= 2;
    patchAttr(sep0, 'hidden', !showSep0);
    patchAttr(sep0, 'data-sep-for-rank', showSep0 ? String(visRanks[1]) : '');

    const showSep1 = visRanks[2] >= 2;
    patchAttr(sep1, 'hidden', !showSep1);
    patchAttr(sep1, 'data-sep-for-rank', showSep1 ? String(visRanks[2]) : '');
  }

  // --- 4. 实时遥测状态绑定（双胶囊与多会话/全景概览浮层全部槽位预占，仅就地更新节点，零布局跳动） ---
  function renderCapsuleTelemetry() {
    if (disposed) return;
    const telSt = telemetryStore.getState();
    const uiSt = uiStore.getState();
    const telemetry = telSt.telemetry;

    const showMulti = telemetry?.settings?.showTopbarMultiSession !== false;
    patchAttr(multiBtn, 'hidden', !showMulti);
    patchAttr(capsuleHost, 'data-multi', showMulti ? 'on' : 'off');
    if (!showMulti && multiOpen) {
      setMultiOpen(false);
    }
    if (showMulti !== lastShowMulti) {
      lastShowMulti = showMulti;
      updateResponsiveLayout();
    }

    const slotKeys = normalizeClientTopbarSlots(telemetry?.settings?.topbarCapsuleSlots);

    if (!telemetry) {
      patchClasses(multiBtn, { 'is-running': false, 'is-waiting': false });
      patchText(multiLabel, '0 运行中');
      patchText(multiRunningMetaEl, '读取中...');
      stopMultiLiveTicker();

      applyCapsuleSlots(slotKeys, { hasTelemetry: false });
      return;
    }

    const { hasSubagents, agents, scopedConv: overviewScopedConv, ctxAgent, aggregated } =
      resolveScopedConversation(telemetry, 'all', uiSt.ctxInspectorAgentId);
    const { scopedConv: capsuleScopedConv } = resolveScopedConversation(
      telemetry,
      uiSt.selectedAgentScope,
      uiSt.ctxInspectorAgentId
    );
    const activeConv = telemetry.activeConversation || {};
    const overviewActive = overviewScopedConv || activeConv;
    const ctx = ctxAgent?.context || overviewActive.context || activeConv.context || {};
    const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
    const totalTokens = Number(ctx.totalTokens || 0);
    const usedPct =
      limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
    const dashOffset = +(
      RING_CIRCUMFERENCE *
      (1 - Math.max(0, Math.min(100, usedPct)) / 100)
    ).toFixed(2);

    // --- 4a. 同步左侧多会话实时状态胶囊与浮层看板 ---
    const rawRunningList =
      Array.isArray(telemetry.runningConversations) && telemetry.runningConversations.length > 0
        ? telemetry.runningConversations
        : activeConv.isRunning || aggregated?.isRunning
          ? [
              {
                cascadeId: activeConv.cascadeId || 'current',
                title: activeConv.title || '当前会话',
                isCurrentSelected: true,
                isMainRunning: Boolean(activeConv.isRunning),
                isRunning: true,
                mainActivity: activeConv.liveActivity || aggregated?.liveActivity || null,
                subagentCount: Math.max(0, (agents?.length || 1) - 1),
                runningSubagentCount: (agents || []).filter((a) => !a.isMain && a.isRunning).length,
                latestTokPerSec: overviewActive.latestTokPerSec ?? null,
                contextUsedPct: usedPct,
                subagents: (agents || [])
                  .filter((a) => !a.isMain)
                  .map((s, idx) => ({
                    cascadeId: s.cascadeId || s.agentId,
                    index: s.index || idx + 1,
                    badgeText: s.badgeText || `子${idx + 1}`,
                    shortLabel: s.shortLabel || `子代理 #${idx + 1}`,
                    role: s.role || `子代理 #${idx + 1}`,
                    isRunning: Boolean(s.isRunning),
                    stepCount: Number(s.stepCount || 0),
                    lastModifiedMs: s.lastModifiedMs || 0,
                    liveActivity: s.liveActivity || {
                      phase: s.isRunning ? 'thinking' : 'done',
                      label: s.isRunning ? '推理中' : '已完成',
                      detail: '',
                      stepProgress: '',
                      startedAtMs: s.lastModifiedMs || 0,
                      signature: `${s.agentId}:${s.stepCount || 0}`,
                    },
                  })),
              },
            ]
          : [];

    const runningCount = rawRunningList.length;
    const runningSubCount = rawRunningList.reduce(
      (acc, item) => acc + Number(item.runningSubagentCount || 0),
      0
    );
    const hasWaiting = rawRunningList.some((item) => item.mainActivity?.phase === 'waiting');

    patchClasses(multiBtn, {
      'is-running': runningCount > 0 && !hasWaiting,
      'is-waiting': runningCount > 0 && hasWaiting,
    });
    const multiBtnText =
      runningCount > 0
        ? runningSubCount > 0
          ? `${runningCount} 运行 · ${runningSubCount} 子`
          : `${runningCount} 运行中`
        : '0 运行中';
    patchText(multiLabel, multiBtnText);

    const hostRouteLower = String(
      telSt.hostRouteConversationId || extractHostRouteCascadeId() || ''
    ).toLowerCase();

    patchText(
      multiRunningMetaEl,
      runningCount > 0
        ? runningSubCount > 0
          ? `${runningCount} 主会话 · ${runningSubCount} 子代理运行中`
          : `${runningCount} 个会话运行中`
        : '全部待命'
    );
    patchAttr(multiEmptyEl, 'hidden', runningCount > 0);
    patchAttr(multiRunningListEl, 'hidden', runningCount === 0);

    const runningIdsLower = new Set(
      rawRunningList.map((item) => String(item.cascadeId || '').toLowerCase())
    );

    if (runningCount === 0) {
      stopMultiLiveTicker();
      manualSubExpandMap.clear();
    } else {
      for (const cid of [...manualSubExpandMap.keys()]) {
        if (!runningIdsLower.has(String(cid || '').toLowerCase())) {
          manualSubExpandMap.delete(cid);
        }
      }

      const activeTimerKeys = new Set();
      for (const item of rawRunningList) {
        activeTimerKeys.add(`main:${item.cascadeId}`);
        const subCount = Number(item.subagentCount || item.subagents?.length || 0);
        const runSubs = Number(item.runningSubagentCount || 0);
        const isExp = manualSubExpandMap.has(item.cascadeId)
          ? manualSubExpandMap.get(item.cascadeId)
          : runSubs > 0;
        if (subCount > 0 && isExp) {
          for (const sub of item.subagents || []) {
            if (sub?.isRunning) {
              activeTimerKeys.add(`sub:${sub.cascadeId}`);
            }
          }
        }
      }

      patchKeyedList(multiRunningListEl, rawRunningList, {
        keyFn: (item) => item.cascadeId,
        sigFn: (item) => {
          const runSubs = Number(item.runningSubagentCount || 0);
          const isExp = manualSubExpandMap.has(item.cascadeId)
            ? manualSubExpandMap.get(item.cascadeId)
            : runSubs > 0;
          const isHere =
            Boolean(hostRouteLower) &&
            String(item.cascadeId || '').toLowerCase() === hostRouteLower;
          const subSig = (item.subagents || [])
            .map(
              (s) =>
                `${s.cascadeId}:${s.isRunning}:${s.stepCount}:${s.liveActivity?.signature || ''}:${s.liveActivity?.startedAtMs || 0}`
            )
            .join('|');
          return `${item.cascadeId}:${item.title}:${isHere}:${item.isMainRunning}:${item.subagentCount}:${runSubs}:${isExp}:${item.latestTokPerSec ?? ''}:${item.contextUsedPct ?? ''}:${item.mainActivity?.signature || ''}:${item.mainActivity?.startedAtMs || 0}:${subSig}`;
        },
        createRow: createMultiLiveTaskCard,
        updateRow: (refs, item) => {
          const act = item.mainActivity || {
            phase: 'thinking',
            label: '推理中',
            detail: '',
            stepProgress: '',
            startedAtMs: item.lastModifiedMs || 0,
            signature: `fallback:${item.lastModifiedMs || 0}`,
          };
          const isWaiting = act.phase === 'waiting';
          const isCompacting = act.phase === 'compacting';
          patchClasses(refs.cardEl, {
            'is-waiting': isWaiting,
            'is-compacting': isCompacting,
          });
          patchClasses(refs.dotIcon, { 'is-pulsing': true });

          const convTitle = item.title || item.cascadeId?.slice(0, 8) || '当前会话';
          patchText(refs.titleEl, convTitle);
          patchAttr(refs.titleEl, 'title', `点击在监控面板中检视会话：${convTitle}`);
          refs.titleEl.onclick = (e) => {
            e.stopPropagation();
            inspectSessionInMonitor(item.cascadeId);
          };

          const isHere =
            Boolean(hostRouteLower) &&
            String(item.cascadeId || '').toLowerCase() === hostRouteLower;
          patchAttr(refs.hereTagEl, 'hidden', !isHere);

          const metricParts = [];
          if (Number.isFinite(item.latestTokPerSec) && item.latestTokPerSec > 0) {
            metricParts.push(
              `${item.latestTokPerSec >= 100 ? Math.round(item.latestTokPerSec) : item.latestTokPerSec.toFixed(1)} t/s`
            );
          }
          if (item.contextUsedPct != null && Number.isFinite(Number(item.contextUsedPct))) {
            metricParts.push(`${Math.round(Number(item.contextUsedPct))}%`);
          }
          const metricsStr = metricParts.join(' · ');
          patchAttr(refs.metricsEl, 'hidden', !metricsStr);
          if (metricsStr) {
            patchText(refs.metricsEl, metricsStr);
          }

          const subCount = Number(item.subagentCount || item.subagents?.length || 0);
          const runSubCount = Number(item.runningSubagentCount || 0);
          const isExpanded = manualSubExpandMap.has(item.cascadeId)
            ? manualSubExpandMap.get(item.cascadeId)
            : runSubCount > 0;
          patchAttr(refs.mainBadge, 'hidden', subCount === 0);
          patchAttr(refs.subToggleBtn, 'hidden', subCount === 0);
          if (subCount > 0) {
            const arrow = isExpanded ? '▾' : '▸';
            const toggleText =
              runSubCount > 0
                ? `子代理 ${runSubCount}/${subCount} ${arrow}`
                : `子代理 (${subCount}) ${arrow}`;
            patchText(refs.subToggleBtn, toggleText);
            patchClasses(refs.subToggleBtn, { 'is-expanded': isExpanded });
            refs.subToggleBtn.onclick = (e) => {
              e.stopPropagation();
              manualSubExpandMap.set(item.cascadeId, !isExpanded);
              renderCapsuleTelemetry();
              if (multiOpen) {
                positionFloatingElements();
              }
            };
          }

          const mainTimerKey = `main:${item.cascadeId}`;
          activeTimerKeys.add(mainTimerKey);
          bindMultiElapsedTimer(
            mainTimerKey,
            `${item.cascadeId}:${act.signature || act.label}`,
            act.startedAtMs,
            refs.elapsedEl
          );

          patchText(refs.mainPhase, act.label || '推理中');
          const progText = act.stepProgress ? `[${act.stepProgress}]` : '';
          patchAttr(refs.mainProgress, 'hidden', !progText);
          if (progText) {
            patchText(refs.mainProgress, progText);
          }

          const detailStr = act.detail || '';
          patchAttr(refs.mainSep, 'hidden', !detailStr);
          patchAttr(refs.mainDetail, 'hidden', !detailStr);
          patchText(refs.mainDetail, detailStr);

          const showSubs = subCount > 0 && isExpanded;
          patchAttr(refs.subListEl, 'hidden', !showSubs);
          if (showSubs) {
            const subItems = item.subagents || [];
            patchKeyedList(refs.subListEl, subItems, {
              keyFn: (sub) => sub.cascadeId,
              sigFn: (sub) =>
                `${sub.cascadeId}:${sub.role}:${sub.isRunning}:${sub.stepCount}:${sub.liveActivity?.signature || ''}:${sub.isRunning ? multiTimersMap.has(`sub:${sub.cascadeId}`) : true}`,
              createRow: createMultiLiveSubRow,
              updateRow: (subRefs, sub) => {
                const subAct = sub.liveActivity || {
                  phase: sub.isRunning ? 'thinking' : 'done',
                  label: sub.isRunning ? '推理中' : '已完成',
                  detail: '',
                  stepProgress: '',
                  startedAtMs: sub.lastModifiedMs || 0,
                };
                patchClasses(subRefs.rowEl, { 'is-done': !sub.isRunning });
                const subBadgeCls = getAgentBadgeClass(sub.index || 1, false);
                patchAttr(subRefs.subBadge, 'class', `agent-badge ${subBadgeCls}`);
                patchText(subRefs.subBadge, sub.badgeText || `子${sub.index || 1}`);
                patchText(subRefs.subRole, sub.role || sub.shortLabel || '子代理');

                const subProg = subAct.stepProgress ? ` [${subAct.stepProgress}]` : '';
                const summaryText = sub.isRunning
                  ? `${subAct.label || '运行中'}${subProg}${subAct.detail ? ` · ${subAct.detail}` : ''}`
                  : `已完成 (${sub.stepCount || 0} 步)`;
                patchText(subRefs.subSummary, summaryText);

                const subTimerKey = `sub:${sub.cascadeId}`;
                if (sub.isRunning) {
                  activeTimerKeys.add(subTimerKey);
                  bindMultiElapsedTimer(
                    subTimerKey,
                    `${sub.cascadeId}:${subAct.signature || subAct.label}`,
                    subAct.startedAtMs || sub.lastModifiedMs,
                    subRefs.subElapsed
                  );
                } else {
                  multiTimersMap.delete(subTimerKey);
                  patchText(subRefs.subElapsed, `${sub.stepCount || 0}步`);
                }
              },
            });
          }
        },
      });

      for (const k of [...multiTimersMap.keys()]) {
        if (!activeTimerKeys.has(k)) {
          multiTimersMap.delete(k);
        }
      }
      ensureMultiLiveTicker();
    }

    // --- 4b. 同步右侧指标胶囊与悬停全景三卡片 ---
    const isRunning = Boolean(aggregated?.isRunning || activeConv.isRunning);
    const tps =
      capsuleScopedConv?.latestTokPerSec ??
      aggregated?.latestTokPerSec ??
      activeConv.latestTokPerSec ??
      null;
    const ttft =
      capsuleScopedConv?.latestTtftSec ??
      aggregated?.latestTtftSec ??
      activeConv.latestTtftSec ??
      null;
    const capsuleStepCost =
      capsuleScopedConv?.latestStepCostUsd ??
      aggregated?.latestStepCostUsd ??
      activeConv.latestStepCostUsd ??
      null;

    patchClasses(capsuleBtn, { 'is-running': isRunning });
    applyCapsuleSlots(slotKeys, {
      hasTelemetry: true,
      usedPct,
      dashOffset,
      isRunning,
      tps,
      ttft,
      stepCost: capsuleStepCost,
      quotas: telemetry.quotas,
    });

    const updateMode = normalizeClientUpdateMode(
      telemetry.settings?.pluginUpdateMode,
      telemetry.settings?.autoUpdatePlugin
    );
    const showUpdatePrompt =
      Boolean(telemetry.cloudStatus?.updateAvailable) && updateMode !== 'off';
    const latestVer = telemetry.cloudStatus?.latestPluginVersion || '';
    patchAttr(updateDot, 'hidden', !showUpdatePrompt);
    patchAttr(topbarUpdateBtn, 'hidden', !showUpdatePrompt);
    patchAttr(hoverUpdateBar, 'hidden', !showUpdatePrompt);
    if (showUpdatePrompt) {
      if (!isTopbarUpdating) {
        patchText(topbarUpdateLabel, latestVer ? `v${latestVer}` : '新版本');
      }
      patchAttr(
        topbarUpdateBtn,
        'title',
        latestVer ? `发现新版本 v${latestVer}，左键立即更新` : '发现新版本，左键立即更新'
      );
      patchText(
        hoverUpdateVerText,
        latestVer ? `发现新版本 v${latestVer}` : '发现新版本可用'
      );
      patchText(
        hoverUpdateHintText,
        latestVer ? `点击顶栏 v${latestVer} 即可更新` : '点击顶栏版本胶囊即可更新'
      );
    }
    if (showUpdatePrompt !== lastShowUpdate) {
      lastShowUpdate = showUpdatePrompt;
      updateResponsiveLayout();
    }

    // --- 同步悬停三卡片全景概览（与 LiveOverviewView 保持完全一致的数据口径与视觉呈现） ---
    const activeModelDisplay = resolveModelDisplayInfo(overviewActive, telemetry.settings, {
      fallback: '模型未知',
    }).text;

    patchClasses(hoverPulseDot, { 'is-pulsing': Boolean(overviewActive.isRunning || isRunning) });
    patchText(hoverTpsVal, formatMetric(overviewActive.latestTokPerSec, ' tok/s'));
    const reason = speedReasonText(overviewActive.latestSpeedReason);
    const modelAndAgent =
      hasSubagents && overviewActive.activeAgentBadge
        ? `[${overviewActive.activeAgentBadge}] ${activeModelDisplay}`
        : activeModelDisplay;
    patchText(hoverTpsSub, reason ? `${modelAndAgent} · ${reason}` : modelAndAgent);

    patchText(hoverTtftVal, formatMetric(overviewActive.latestTtftSec, 's'));
    patchText(hoverTtftSub, `均值 ${formatMetric(overviewActive.ttftSummary?.avgSec, 's')}`);

    patchText(hoverAvgVal, formatMetric(overviewActive.avgTokPerSec, ' tok/s'));
    patchText(hoverAvgSub, `有效 ${sampleSummary(overviewActive.speedSummary)}`);

    const stepCost = overviewActive.latestStepCostUsd;
    const hasAnySteps = Number(overviewActive.stepCount || 0) > 0;
    patchText(
      hoverCostVal,
      !hasAnySteps && stepCost == null ? '—' : formatUsd(stepCost, { precise: true })
    );
    patchText(
      hoverCacheSub,
      `缓存 ${overviewActive.latestCacheHitPct ?? 0}% · 累计 ${formatUsd(overviewActive.sessionCostUsd || 0)}`
    );

    patchAttr(hoverCtxAgentBadge, 'hidden', !(hasSubagents && ctxAgent));
    if (hasSubagents && ctxAgent) {
      const badgeCls = getAgentBadgeClass(ctxAgent.index || 0, Boolean(ctxAgent.isMain));
      patchAttr(hoverCtxAgentBadge, 'class', `agent-badge ${badgeCls}`);
      patchText(hoverCtxAgentBadge, formatAgentLabel(ctxAgent));
    }
    patchText(
      hoverCtxSummaryText,
      `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
    );
    hoverCtxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });

    const scoredChannels = CTX_CHANNEL_DEFS.map((ch, defaultOrder) => ({
      ch,
      defaultOrder,
      val: ch.getValue(ctx),
    }));
    scoredChannels.sort((a, b) => b.val - a.val || a.defaultOrder - b.defaultOrder);
    for (let i = 0; i < hoverLegendSlots.length; i += 1) {
      const slot = hoverLegendSlots[i];
      const entry = scoredChannels[i];
      if (!slot || !entry) continue;
      patchAttr(slot.swatchEl, 'class', `swatch ${entry.ch.segClass}`);
      patchText(slot.labelEl, entry.ch.label);
      patchText(slot.valEl, formatTokens(entry.val));
    }

    const quotas = telemetry.quotas || {};
    const weekly = quotas.weekly || {};
    const minuteTick = Number(telSt.minuteTick || Math.floor(Date.now() / 30000));
    patchText(
      hoverTierBadge,
      `${telemetry.account?.tierName || 'Google AI'} · ${telemetry.account?.planName || 'Pro'}`
    );
    patchKeyedList(hoverPoolsListEl, buildQuotaPoolItems(quotas, minuteTick), {
      keyFn: (item) => item.key,
      sigFn: quotaPoolRowSig,
      createRow: createPoolQuotaRow,
      updateRow: syncPoolQuotaRow,
    });
    patchText(
      hoverWkFootLeft,
      `本周累计: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0)})`
    );
    patchText(
      hoverWkFootRight,
      telemetry.account?.aiCredits > 0
        ? `AI 积分: ${telemetry.account.aiCredits}`
        : `本周调用: ${weekly.calls || 0} 次`
    );
  }

  const unsubStore = telemetryStore.subscribe(
    (st) => ({
      syncState: st.syncState,
      telemetry: st.telemetry,
      minuteTick: st.minuteTick,
      selectedConversationId: st.selectedConversationId,
    }),
    (slice) => {
      if (slice.telemetry?.settings?.enableWindowOverlay === false) {
        if (popoverOpen) setPopoverOpen(false);
        if (multiOpen) setMultiOpen(false);
      }
      renderCapsuleTelemetry();
    }
  );

  const unsubUiScope = uiStore.subscribe(
    (st) => ({
      selectedAgentScope: st.selectedAgentScope,
      ctxInspectorAgentId: st.ctxInspectorAgentId,
    }),
    () => renderCapsuleTelemetry()
  );

  // --- 5. 宿主会话路由跟随与全局交互监听 ---
  function syncHostRouteIfChanged() {
    if (disposed) return;
    const currentRouteId = extractHostRouteCascadeId();
    if (currentRouteId === lastObservedRouteId) return;
    lastObservedRouteId = currentRouteId;
    const st = telemetryStore.getState();
    const patch = { hostRouteConversationId: currentRouteId };
    if (currentRouteId && st.selectedConversationId && st.selectedConversationId !== currentRouteId) {
      patch.selectedConversationId = '';
    }
    uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
    telemetryStore.setState(patch);
    void fetchTelemetry({ force: false });
  }

  const onDocMouseDown = (e) => {
    if (popoverOpen && !isEventInside(e, popoverEl) && !isEventInside(e, capsuleHost)) {
      setPopoverOpen(false);
    }
    if (multiOpen && !isEventInside(e, multiPanelEl) && !isEventInside(e, capsuleHost)) {
      setMultiOpen(false);
    }
  };

  const onDocKeyDown = (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      if (popoverOpen) {
        setPopoverOpen(false);
      }
      if (multiOpen) {
        setMultiOpen(false);
      }
    }
  };

  const onWindowPointerMove = (e) => recordPointerCoords(e);
  const onWindowBlur = () => {
    hasPointerCoords = false;
    if (tooltipOpen) {
      setTooltipOpen(false);
    }
    if (multiOpen && !multiPinned) {
      setMultiOpen(false);
    }
  };
  const onWindowResize = () => updateResponsiveLayout();
  const onPopState = () => syncHostRouteIfChanged();
  const onVisibilityChange = () => {
    if (document.hidden) {
      hasPointerCoords = false;
      if (tooltipOpen) {
        setTooltipOpen(false);
      }
      if (multiOpen && !multiPinned) {
        setMultiOpen(false);
      }
      return;
    }
    if (!document.hidden && !disposed) {
      syncHostRouteIfChanged();
      void fetchTelemetry({ force: false });
    }
  };

  let hostDomObserver = null;
  try {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateResponsiveLayout());
      if (document.body) resizeObserver.observe(document.body);
    }
    if (typeof MutationObserver !== 'undefined' && document.body) {
      hostDomObserver = new MutationObserver(() => {
        syncHostRouteIfChanged();
        const tb = findHostTitlebar();
        if (
          !capsuleHost.isConnected ||
          !portalHost.isConnected ||
          (tb && !tb.contains(capsuleHost)) ||
          (!tb && capsuleHost.getAttribute('data-dock') === 'flow')
        ) {
          scheduleDockSync();
        }
      });
      hostDomObserver.observe(document.body, { childList: true, subtree: true });
    }
  } catch {
    // 忽略观察器初始化异常
  }

  document.addEventListener?.('mousedown', onDocMouseDown, true);
  document.addEventListener?.('keydown', onDocKeyDown);
  document.addEventListener?.('visibilitychange', onVisibilityChange);
  window.addEventListener?.('pointermove', onWindowPointerMove, { passive: true });
  window.addEventListener?.('blur', onWindowBlur);
  window.addEventListener?.('resize', onWindowResize);
  window.addEventListener?.('popstate', onPopState);
  navigator?.windowControlsOverlay?.addEventListener?.('geometrychange', onWindowResize);

  const watchdogTimer = setInterval(() => {
    if (disposed) return;
    syncHostRouteIfChanged();
    if (!capsuleHost.isConnected || !portalHost.isConnected) {
      ensureCapsuleDocked();
    }
  }, 1200);

  ensureCapsuleDocked();
  renderCapsuleTelemetry();
  const allowMultiCarryOver =
    telemetryStore.getState().telemetry?.settings?.showTopbarMultiSession !== false;
  if (carryOverPopoverOpen) {
    setPopoverOpen(true, { instant: true });
  } else if (carryOverMultiPinnedOpen && allowMultiCarryOver) {
    setMultiOpen(true, { pinned: true, instant: true });
  } else if (carryOverMultiHoverOpen && allowMultiCarryOver) {
    setMultiOpen(true, { pinned: false, instant: true });
  } else if (carryOverTooltipOpen) {
    setTooltipOpen(true, { instant: true });
  }
  const stopPolling = startAsyncTelemetryLoop(2000);

  const handle = {
    bundleVersion,
    ensureAlive() {
      if (disposed) return false;
      return ensureCapsuleDocked();
    },
    updateBridge(nextBridge) {
      if (disposed || !nextBridge || typeof nextBridge !== 'object') return false;
      const port = Number(nextBridge.port || 0);
      const token = String(nextBridge.token || '');
      if (!Number.isInteger(port) || port <= 0 || !token) return false;
      const cur = window.__AGUsageMonitorBridge || {};
      const portChanged = Number(cur.port || 0) !== port;
      cur.port = port;
      cur.token = token;
      if (portChanged && cur.transportMode !== 'cdp') {
        cur.transportMode = 'http';
      }
      window.__AGUsageMonitorBridge = cur;
      void fetchTelemetry({ force: false });
      return true;
    },
    getTelemetrySnapshot() {
      return telemetryStore.getState().telemetry;
    },
    getLastPointer() {
      return hasPointerCoords ? { x: lastPointerX, y: lastPointerY } : null;
    },
    deliverRpc(responses) {
      if (disposed) return 0;
      return deliverCdpBridgeResponses(responses);
    },
    open() {
      setPopoverOpen(true);
    },
    close() {
      setPopoverOpen(false);
    },
    toggle() {
      setPopoverOpen(!popoverOpen);
    },
    openMulti(pinned = true) {
      setMultiOpen(true, { pinned: Boolean(pinned) });
    },
    closeMulti() {
      setMultiOpen(false);
    },
    isOpen: () => popoverOpen,
    isHoverOpen: () => tooltipOpen,
    isMultiOpen: () => multiOpen,
    isMultiHoverOpen: () => Boolean(multiOpen && !multiPinned),
    isMultiPinnedOpen: () => Boolean(multiOpen && multiPinned),
    getLayoutMode: () => layoutMode,
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(watchdogTimer);
      if (hoverLeaveTimer) {
        clearTimeout(hoverLeaveTimer);
        hoverLeaveTimer = null;
      }
      if (multiLeaveTimer) {
        clearTimeout(multiLeaveTimer);
        multiLeaveTimer = null;
      }
      stopMultiLiveTicker();
      if (dockRafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(dockRafId);
        dockRafId = 0;
      }
      stopPolling();
      stopAsyncTelemetryLoop();
      unsubStore();
      unsubUiScope();
      try {
        resizeObserver?.disconnect();
      } catch {}
      try {
        hostDomObserver?.disconnect();
      } catch {}
      document.removeEventListener?.('mousedown', onDocMouseDown, true);
      document.removeEventListener?.('keydown', onDocKeyDown);
      document.removeEventListener?.('visibilitychange', onVisibilityChange);
      window.removeEventListener?.('pointermove', onWindowPointerMove);
      window.removeEventListener?.('blur', onWindowBlur);
      window.removeEventListener?.('resize', onWindowResize);
      window.removeEventListener?.('popstate', onPopState);
      navigator?.windowControlsOverlay?.removeEventListener?.('geometrychange', onWindowResize);
      try {
        hoverCtxSegmentBar.destroy();
      } catch {}
      try {
        appInstance.destroy();
      } catch {}
      try {
        capsuleHost.remove();
      } catch {}
      try {
        portalHost.remove();
      } catch {}
      if (window.__AGUsageMonitorOverlay === handle) {
        delete window.__AGUsageMonitorOverlay;
      }
    },
  };

  window.__AGUsageMonitorOverlay = handle;
  return handle;
}
