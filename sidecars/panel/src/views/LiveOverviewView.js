/**
 * @fileoverview View 1: LiveOverviewView (实时监控视图).
 * Displays real-time TPS, TTFT, weighted mean speed, 4-channel Context Window
 * breakdown automatically anchored to the current model's compaction baseline,
 * and official 5h/weekly quota pools for both Gemini and Claude & GPT.
 */

import { defineComponent } from '../core/component.js';
import {
  h,
  patchAttr,
  patchClasses,
  patchKeyedList,
  patchStyleVar,
  patchText,
} from '../core/domPatch.js';
import {
  formatCountdown,
  formatMetric,
  formatTokens,
  formatUsd,
  sampleSummary,
  speedReasonText,
} from '../core/formatters.js';
import { createSvgIcon } from '../icons/SvgIcon.js';
import { telemetryStore } from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { ContextSegmentMeter } from '../components/ui/ContextSegmentMeter.js';
import { CustomScrollbar } from '../components/ui/CustomScrollbar.js';

export const LiveOverviewView = defineComponent({
  name: 'LiveOverviewView',
  setup({ onCleanup }) {
    // 1. 4-Cell Real-time Telemetry Matrix
    const tpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
    const tpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
    const pulseDot = createSvgIcon('dot', { size: 10 });

    const ttftVal = h('strong', { className: 'cell-value', text: '—' });
    const ttftSub = h('span', { className: 'cell-sub', text: '均值 —' });

    const avgVal = h('strong', { className: 'cell-value', text: '—' });
    const avgSub = h('span', { className: 'cell-sub', text: '有效 0/0 步' });

    const costVal = h('strong', { className: 'cell-value', text: '$0.000' });
    const cacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累 $0.00' });

    const matrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '核心测速指标' }, [
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [h('span', { text: '实时吞吐' }), pulseDot]),
        tpsVal,
        tpsSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '首Token' }),
          createSvgIcon('clock', { size: 11 }),
        ]),
        ttftVal,
        ttftSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '会话均速' }),
          createSvgIcon('pulse', { size: 11 }),
        ]),
        avgVal,
        avgSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '本步消费' }),
          createSvgIcon('bolt', { size: 11 }),
        ]),
        costVal,
        cacheSub,
      ]),
    ]);

    // 2. Context Window 6-Segment Panel (Auto Compaction Baseline)
    const ctxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
    const ctxSegmentBar = ContextSegmentMeter({ context: {} });

    const bdMessages = h('strong', { className: 'text-mono', text: '0' });
    const bdSystemTools = h('strong', { className: 'text-mono', text: '0' });
    const bdMcpTools = h('strong', { className: 'text-mono', text: '0' });
    const bdSkills = h('strong', { className: 'text-mono', text: '0' });
    const bdSystemPrompt = h('strong', { className: 'text-mono', text: '0' });
    const bdUserRules = h('strong', { className: 'text-mono', text: '0' });

    const ctxPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('layers', { size: 13 }),
          h('span', { text: '上下文窗口构成' }),
        ]),
        h('span', { className: 'panel-meta' }, [ctxSummaryText]),
      ]),
      ctxSegmentBar.el,
      h('div', { className: 'ctx-legend-grid' }, [
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-messages' }),
            h('span', { text: '消息' }),
          ]),
          bdMessages,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-system-tools' }),
            h('span', { text: '系统工具' }),
          ]),
          bdSystemTools,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-mcp-tools' }),
            h('span', { text: 'MCP 工具' }),
          ]),
          bdMcpTools,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-skills' }),
            h('span', { text: 'Skill' }),
          ]),
          bdSkills,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-system-prompt' }),
            h('span', { text: '系统提示词' }),
          ]),
          bdSystemPrompt,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-user-rules' }),
            h('span', { text: 'user_rule' }),
          ]),
          bdUserRules,
        ]),
      ]),
    ]);

    // 3. Official 5h & Weekly Quotas Panel (Dynamic Pools: Gemini, Argon on Pro, Claude & GPT, etc.)
    const tierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });
    const poolsListEl = h('div', { style: 'display: flex; flex-direction: column; gap: 0;' });

    function createPoolQuotaRow() {
      const title5h = h('span', { text: '5h 限额' });
      const meta5h = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fill5h = h('div', { className: 'progress-fill' });
      const row5h = h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
        h('div', { className: 'panel-header' }, [title5h, meta5h]),
        h('div', { className: 'progress-track' }, [fill5h]),
      ]);

      const titleWk = h('span', { text: '每周限额' });
      const metaWk = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fillWk = h('div', { className: 'progress-fill' });
      const rowWk = h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
        h('div', { className: 'panel-header' }, [titleWk, metaWk]),
        h('div', { className: 'progress-track' }, [fillWk]),
      ]);

      const el = h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, [
        row5h,
        rowWk,
      ]);

      return {
        el,
        refs: { row5h, title5h, meta5h, fill5h, rowWk, titleWk, metaWk, fillWk },
      };
    }

    const wkFootLeft = h('span', { className: 'text-muted', text: '本周本机: 0 ($0.00)' });
    const wkFootRight = h('span', { className: 'text-muted', text: '' });

    const quotaPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('pulse', { size: 13 }),
          h('span', { text: '官方配额与周期监控' }),
        ]),
        tierBadge,
      ]),
      poolsListEl,
      h('div', { className: 'panel-header', style: 'font-size: 11px; padding-top: 2px;' }, [
        wkFootLeft,
        wkFootRight,
      ]),
    ]);

    const overviewInner = h(
      'div',
      {
        style: 'display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: 2px;',
      },
      [matrixEl, ctxPanel, quotaPanel]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: overviewInner,
      className: 'view-pane',
    });

    function syncPoolQuotaRow(refs, item, idx, rowEl) {
      const { poolData, poolLabel, fallbackWeekly, isActivePool } = item;
      patchAttr(
        rowEl,
        'style',
        idx === 0
          ? 'display: flex; flex-direction: column; gap: 8px;'
          : 'display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-hairline);'
      );

      const has5h = poolData?.usedPct != null && poolData?.remainingPct != null;
      const used5hVal = has5h ? Number(poolData.usedPct) : 0;
      const rem5hVal = has5h ? Number(poolData.remainingPct) : 0;

      const wkUsedRaw =
        poolData?.weeklyUsedPct ?? (isActivePool ? fallbackWeekly?.usedPct : null);
      const wkRemRaw =
        poolData?.weeklyRemainingPct ?? (isActivePool ? fallbackWeekly?.remainingPct : null);
      const wkResetRaw =
        poolData?.weeklyResetTime || (isActivePool ? fallbackWeekly?.resetTime : null);
      const hasWk = wkUsedRaw != null && wkRemRaw != null;
      const usedWkVal = hasWk ? Number(wkUsedRaw) : 0;
      const remWkVal = hasWk ? Number(wkRemRaw) : 0;

      // Hide non-applicable window on weekly-only pools (e.g. Pro Argon pool or Plus tier)
      // or 5h-only pools, while still showing both rows with error state if both failed.
      const hide5h = !has5h && hasWk;
      const hideWk = !hasWk && has5h;
      refs.row5h.hidden = hide5h;
      refs.row5h.style.display = hide5h ? 'none' : 'flex';
      refs.rowWk.hidden = hideWk;
      refs.rowWk.style.display = hideWk ? 'none' : 'flex';

      patchText(refs.title5h, `5h 限额 (${poolLabel})`);
      patchText(
        refs.meta5h,
        has5h
          ? `${formatCountdown(poolData.resetTime)} · 已用 ${used5hVal.toFixed(1)}% (余 ${rem5hVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(refs.fill5h, '--fill-w', `${Math.min(100, used5hVal)}%`);
      patchClasses(refs.fill5h, {
        'tone-warn': used5hVal >= 60 && used5hVal < 85,
        'tone-danger': used5hVal >= 85,
      });

      const customTitle =
        isActivePool && fallbackWeekly?.isOfficial === false && fallbackWeekly?.title
          ? fallbackWeekly.title
          : `每周限额 (${poolLabel})`;
      patchText(refs.titleWk, customTitle);
      patchText(
        refs.metaWk,
        hasWk
          ? `${formatCountdown(wkResetRaw)} · 已用 ${usedWkVal.toFixed(1)}% (余 ${remWkVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(refs.fillWk, '--fill-w', `${Math.min(100, usedWkVal)}%`);
      patchClasses(refs.fillWk, {
        'tone-warn': usedWkVal >= 60 && usedWkVal < 85,
        'tone-danger': usedWkVal >= 85,
      });
    }

    let latestData = null;
    let isDirty = false;

    function renderData(data) {
      if (!data) return;
      const active = data.activeConversation || {};
      const ctx = active.context || {};
      const quotas = data.quotas || {};

      // 1. Matrix
      patchClasses(pulseDot, { 'is-pulsing': Boolean(active.isRunning) });
      patchText(tpsVal, formatMetric(active.latestTokPerSec, ' tok/s'));
      const reason = speedReasonText(active.latestSpeedReason);
      patchText(
        tpsSub,
        reason ? `${active.activeModelShort || '模型未知'} · ${reason}` : active.activeModelShort || '模型未知'
      );

      patchText(ttftVal, formatMetric(active.latestTtftSec, 's'));
      patchText(ttftSub, `均值 ${formatMetric(active.ttftSummary?.avgSec, 's')}`);

      patchText(avgVal, formatMetric(active.avgTokPerSec, ' tok/s'));
      patchText(avgSub, `有效 ${sampleSummary(active.speedSummary)}`);

      const stepCost = active.latestStepCostUsd;
      patchText(costVal, formatUsd(stepCost, { precise: true }));
      patchText(
        cacheSub,
        `缓 ${active.latestCacheHitPct ?? 0}% · 累 ${formatUsd(active.sessionCostUsd || 0, { unpricedCalls: active.sessionUnpricedCalls })}`
      );

      // 2. Context (Auto Compaction Baseline)
      const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
      const totalTokens = Number(ctx.totalTokens || 0);
      const usedPct =
        limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
      patchText(
        ctxSummaryText,
        `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
      );
      ctxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });
      patchText(bdMessages, formatTokens(ctx.messagesTokens || 0));
      patchText(bdSystemTools, formatTokens(ctx.systemToolsTokens || 0));
      patchText(bdMcpTools, formatTokens(ctx.mcpToolsTokens || 0));
      patchText(bdSkills, formatTokens(ctx.skillsTokens || 0));
      patchText(bdSystemPrompt, formatTokens(ctx.systemPromptTokens || 0));
      patchText(bdUserRules, formatTokens(ctx.userRulesTokens || 0));

      // 3. Quotas (Dynamic Pools: Gemini, Argon on Pro, Claude & GPT, etc.)
      patchText(
        tierBadge,
        `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`
      );
      const activePool = quotas.activePool || {};
      const rawPools = Array.isArray(quotas.pools) && quotas.pools.length > 0
        ? quotas.pools
        : [
            { poolKey: 'Gemini', poolLabel: 'Gemini', family: 'Gemini' },
            { poolKey: 'Claude & GPT', poolLabel: 'Claude & GPT', family: 'Claude & GPT' },
          ];
      const weekly = quotas.weekly || {};
      const minuteTick = Math.floor(Date.now() / 30000);
      const poolItems = rawPools.map((p) => {
        const key = p.poolKey || p.family || p.poolLabel || 'Other';
        const poolLabel = p.poolLabel || p.family || key;
        const isActivePool =
          Boolean(activePool.family) &&
          (activePool.poolKey === key ||
            activePool.family === p.family ||
            (key === 'Claude & GPT' && ['Claude', 'GPT'].includes(activePool.family)));
        return {
          key,
          poolLabel,
          poolData: p,
          fallbackWeekly: weekly,
          isActivePool,
          minuteTick,
        };
      });

      patchKeyedList(poolsListEl, poolItems, {
        keyFn: (item) => item.key,
        sigFn: (item, idx) =>
          `${idx}:${item.poolLabel}:${item.isActivePool}:${item.minuteTick}:${item.poolData?.usedPct}:${item.poolData?.remainingPct}:${item.poolData?.resetTime}:${item.poolData?.weeklyUsedPct}:${item.poolData?.weeklyRemainingPct}:${item.poolData?.weeklyResetTime}:${item.fallbackWeekly?.isOfficial}:${item.fallbackWeekly?.usedPct}:${item.fallbackWeekly?.title}`,
        createRow: createPoolQuotaRow,
        updateRow: syncPoolQuotaRow,
      });

      patchText(
        wkFootLeft,
        `本周本机: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0, { unpricedCalls: weekly.unpricedCalls })})`
      );
      patchText(
        wkFootRight,
        data.account?.aiCredits > 0
          ? `AI 积分: ${data.account.aiCredits}`
          : `本机调用: ${weekly.calls || 0} 步`
      );

      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => st.telemetry,
      (data) => {
        latestData = data;
        if (uiStore.getState().activeView !== 'overview') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderData(data);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'overview' && isDirty) {
          isDirty = false;
          if (latestData) {
            renderData(latestData);
          }
        }
      }
    );

    onCleanup(() => {
      unsub();
      unsubView();
      ctxSegmentBar.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: { viewScrollbar },
    };
  },
});
