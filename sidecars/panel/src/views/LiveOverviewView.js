/**
 * @fileoverview View 1: LiveOverviewView (实时监控视图).
 * Displays real-time TPS, TTFT, weighted mean speed, 4-channel Context Window
 * breakdown automatically anchored to the current model's compaction baseline,
 * and official 5h/weekly quota pools for both Gemini and Claude & GPT.
 */

import { defineComponent } from '../core/component.js';
import {
  h,
  patchClasses,
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
    const tpsSub = h('span', { className: 'cell-sub', text: 'argon-4' });
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

    // 3. Official 5h & Weekly Quotas Panel (Gemini Pool + Claude Pool)
    const tierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });

    function createPoolQuotaBlock(poolLabel) {
      const title5h = h('span', { text: `5h 限额 (${poolLabel})` });
      const meta5h = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fill5h = h('div', { className: 'progress-fill' });

      const titleWk = h('span', { text: `每周限额 (${poolLabel})` });
      const metaWk = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fillWk = h('div', { className: 'progress-fill' });

      const el = h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, [
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('div', { className: 'panel-header' }, [title5h, meta5h]),
          h('div', { className: 'progress-track' }, [fill5h]),
        ]),
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('div', { className: 'panel-header' }, [titleWk, metaWk]),
          h('div', { className: 'progress-track' }, [fillWk]),
        ]),
      ]);

      return { el, title5h, meta5h, fill5h, titleWk, metaWk, fillWk };
    }

    const geminiQuotaBlock = createPoolQuotaBlock('Gemini');
    const claudeQuotaBlock = createPoolQuotaBlock('Claude & GPT');
    claudeQuotaBlock.el.setAttribute(
      'style',
      'display: flex; flex-direction: column; gap: 8px; margin-top: 3px; padding-top: 10px; border-top: 1px solid var(--border-hairline);'
    );

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
      geminiQuotaBlock.el,
      claudeQuotaBlock.el,
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

    function syncPoolQuotaBlock(block, poolLabel, poolData, fallbackWeekly, isActiveFamily) {
      const has5h = poolData?.usedPct != null && poolData?.remainingPct != null;
      const used5hVal = has5h ? Number(poolData.usedPct) : 0;
      const rem5hVal = has5h ? Number(poolData.remainingPct) : 0;
      patchText(block.title5h, `5h 限额 (${poolLabel})`);
      patchText(
        block.meta5h,
        has5h
          ? `${formatCountdown(poolData.resetTime)} · 已用 ${used5hVal.toFixed(1)}% (余 ${rem5hVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(block.fill5h, '--fill-w', `${Math.min(100, used5hVal)}%`);
      patchClasses(block.fill5h, {
        'tone-warn': used5hVal >= 60 && used5hVal < 85,
        'tone-danger': used5hVal >= 85,
      });

      const wkUsedRaw =
        poolData?.weeklyUsedPct ?? (isActiveFamily ? fallbackWeekly?.usedPct : null);
      const wkRemRaw =
        poolData?.weeklyRemainingPct ?? (isActiveFamily ? fallbackWeekly?.remainingPct : null);
      const wkResetRaw =
        poolData?.weeklyResetTime || (isActiveFamily ? fallbackWeekly?.resetTime : null);
      const hasWk = wkUsedRaw != null && wkRemRaw != null;
      const usedWkVal = hasWk ? Number(wkUsedRaw) : 0;
      const remWkVal = hasWk ? Number(wkRemRaw) : 0;

      const customTitle =
        isActiveFamily && fallbackWeekly?.isOfficial === false && fallbackWeekly?.title
          ? fallbackWeekly.title
          : `每周限额 (${poolLabel})`;
      patchText(block.titleWk, customTitle);
      patchText(
        block.metaWk,
        hasWk
          ? `${formatCountdown(wkResetRaw)} · 已用 ${usedWkVal.toFixed(1)}% (余 ${remWkVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(block.fillWk, '--fill-w', `${Math.min(100, usedWkVal)}%`);
      patchClasses(block.fillWk, {
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
        reason ? `${active.activeModelShort || 'argon-4'} · ${reason}` : active.activeModelShort || 'argon-4'
      );

      patchText(ttftVal, formatMetric(active.latestTtftSec, 's'));
      patchText(ttftSub, `均值 ${formatMetric(active.ttftSummary?.avgSec, 's')}`);

      patchText(avgVal, formatMetric(active.avgTokPerSec, ' tok/s'));
      patchText(avgSub, `有效 ${sampleSummary(active.speedSummary)}`);

      const stepCost = Number(active.latestStepCostUsd ?? active.recentSteps?.[0]?.costUsd ?? 0);
      patchText(costVal, formatUsd(stepCost, { precise: true }));
      patchText(
        cacheSub,
        `缓 ${active.latestCacheHitPct ?? 0}% · 累 ${formatUsd(active.sessionCostUsd || 0)}`
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

      // 3. Quotas (Gemini + Claude & GPT)
      patchText(
        tierBadge,
        `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`
      );
      const activePool = quotas.activePool || {};
      const pools = quotas.pools || [];
      const weekly = quotas.weekly || {};

      const geminiPool =
        pools.find((p) => p.family === 'Gemini') ||
        (activePool.family === 'Gemini' ? activePool : null) ||
        {};
      const claudePool =
        pools.find((p) => p.family === 'Claude & GPT' || p.family === 'Claude') ||
        (activePool.family && activePool.family !== 'Gemini' ? activePool : null) ||
        {};

      const activeIsGemini = (activePool.family || 'Gemini') === 'Gemini';
      syncPoolQuotaBlock(geminiQuotaBlock, 'Gemini', geminiPool, weekly, activeIsGemini);
      syncPoolQuotaBlock(claudeQuotaBlock, 'Claude & GPT', claudePool, weekly, !activeIsGemini);

      patchText(
        wkFootLeft,
        `本周本机: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0)})`
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
