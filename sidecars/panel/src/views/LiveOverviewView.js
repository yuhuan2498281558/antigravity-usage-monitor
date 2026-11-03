/**
 * @fileoverview View 1: LiveOverviewView (实时监控视图).
 * 负责展示当前活跃会话的核心实时遥测指标：
 * 1. 4 格实时测速矩阵：实时吞吐 (TPS)、首 Token 延迟 (TTFT)、会话有效加权均速与本步费用/缓存命中率；
 * 2. 6 通道上下文窗口构成：自动锚定当前模型的上下文压缩基线 (`compactionLimitTokens`)，
 *    通过 6 段进度条与双列图例展示消息、系统工具、MCP 工具、Skill、系统提示词与用户规则的 Token 占用；
 * 3. 动态多配额池监控卡片：支持 Gemini、Pro 订阅专属独立 Argon 周配额池、Claude & GPT 等动态配额池，
 *    自动适配 5h/每周双窗口或单窗口模式，并展示本机周累计消耗与 AI 积分脚标。
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
    // --- 1. 4 格实时测速矩阵 (实时吞吐 / 首Token / 会话均速 / 本步消费) ---
    const tpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
    const tpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
    const pulseDot = createSvgIcon('dot', { size: 10 });

    const ttftVal = h('strong', { className: 'cell-value', text: '—' });
    const ttftSub = h('span', { className: 'cell-sub', text: '均值 —' });

    const avgVal = h('strong', { className: 'cell-value', text: '—' });
    const avgSub = h('span', { className: 'cell-sub', text: '有效样本 0/0 步' });

    const costVal = h('strong', { className: 'cell-value', text: '$0.000' });
    const cacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累计 $0.00' });

    const matrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '实时指标' }, [
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [h('span', { text: '输出速度' }), pulseDot]),
        tpsVal,
        tpsSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '首字延迟' }),
          createSvgIcon('clock', { size: 11 }),
        ]),
        ttftVal,
        ttftSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '平均速度' }),
          createSvgIcon('pulse', { size: 11 }),
        ]),
        avgVal,
        avgSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '本次费用' }),
          createSvgIcon('bolt', { size: 11 }),
        ]),
        costVal,
        cacheSub,
      ]),
    ]);

    // --- 2. 6 段上下文窗口构成面板（自动锚定模型上下文压缩基线） ---
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
          h('span', { text: '上下文占用' }),
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
            h('span', { text: '用户规则' }),
          ]),
          bdUserRules,
        ]),
      ]),
    ]);

    // --- 3. 官方动态多配额池监控面板 (Gemini / Pro 独立 Argon 池 / Claude & GPT) ---
    const tierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });
    const poolsListEl = h('div', { style: 'display: flex; flex-direction: column; gap: 0;' });

    /**
     * 创建单个配额池的 DOM 行结构，内含 5h 限额与每周限额两个可独立显隐的子窗口进度条。
     */
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

    const wkFootLeft = h('span', { className: 'text-muted', text: '本周累计: 0 ($0.00)' });
    const wkFootRight = h('span', { className: 'text-muted', text: '' });

    const quotaPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('pulse', { size: 13 }),
          h('span', { text: '可用额度' }),
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

    /**
     * 同步单个配额池行的 5h 与每周窗口状态：
     * - 对于仅有周限额的独立配额池（例如 Google AI Pro 账号下的 Argon 池或 Plus 档位）自动隐藏 5h 行；
     * - 对于仅有 5h 限额的配额池自动隐藏每周行；
     * - 若两个窗口均无数据（如首次拉取失败），则同时保留两行并显示“获取失败 (--%)”占位提示。
     */
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

      // 在单窗口配额池（如 Pro 账号独立 Argon 周配额池或仅 5h 池）中隐藏不适用的另一窗口
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

    /**
     * 将最新遥测载荷渲染至 4 格测速矩阵、6 段上下文进度条与动态配额池列表。
     */
    function renderData(data) {
      if (!data) return;
      const active = data.activeConversation || {};
      const ctx = active.context || {};
      const quotas = data.quotas || {};

      // 1. 更新 4 格实时测速矩阵
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
        `缓存 ${active.latestCacheHitPct ?? 0}% · 累计 ${formatUsd(active.sessionCostUsd || 0, { unpricedCalls: active.sessionUnpricedCalls })}`
      );

      // 2. 更新 6 段上下文窗口构成（优先使用模型自动压缩基线 compactionLimitTokens）
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

      // 3. 更新动态配额池列表（支持 Gemini、Pro 独立 Argon 池、Claude & GPT 等）
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
        `本周累计: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0, { unpricedCalls: weekly.unpricedCalls })})`
      );
      patchText(
        wkFootRight,
        data.account?.aiCredits > 0
          ? `AI 积分: ${data.account.aiCredits}`
          : `本周调用: ${weekly.calls || 0} 次`
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
