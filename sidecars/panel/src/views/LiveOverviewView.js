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
import {
  formatAgentLabel,
  getAgentBadgeClass,
  resolveScopedConversation,
  telemetryStore,
} from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { ContextSegmentMeter } from '../components/ui/ContextSegmentMeter.js';
import { CustomScrollbar } from '../components/ui/CustomScrollbar.js';

const PILL_BASE_PAD_PX = 14;
const CJK_CHAR_PX = 11;
const ASCII_CHAR_PX = 6.1;
const PILL_GAP_PX = 4;
const DEFAULT_BAR_WIDTH_PX = 310;

function estPillWidth(text) {
  let w = PILL_BASE_PAD_PX;
  for (const ch of String(text || '')) {
    w += ch.charCodeAt(0) > 255 ? CJK_CHAR_PX : ASCII_CHAR_PX;
  }
  return Math.ceil(w);
}

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

    // --- 2. 6 段上下文窗口构成面板（自动锚定模型上下文压缩基线 + 方案 B 内嵌独立 256k 窗口检视条） ---
    const ctxAgentBadge = h('span', {
      className: 'agent-badge badge-main',
      hidden: true,
      text: '主代理',
    });
    const ctxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
    const ctxSegmentBar = ContextSegmentMeter({ context: {} });

    const ctxPillGroup = h('div', { className: 'ctx-pill-group' });
    const ctxInspectorBar = h(
      'div',
      { className: 'ctx-inspector-bar', hidden: true },
      [ctxPillGroup]
    );

    const ctxChannels = [
      {
        key: 'assistant',
        label: '模型回复',
        segClass: 'seg-assistant',
        title: '模型推理思考、回复正文与工具调用入参',
        getValue: (c) => Number(c.assistantTokens || 0),
      },
      {
        key: 'toolResults',
        label: '工具结果',
        segClass: 'seg-tool-results',
        title: '文件读取、终端输出与工具执行返回内容',
        getValue: (c) => Number(c.toolResultsTokens || 0),
      },
      {
        key: 'userInput',
        label: '用户消息',
        segClass: 'seg-user-input',
        title: '用户提问文本与上传附件',
        getValue: (c) => Number(c.userInputTokens ?? c.messagesTokens ?? 0),
      },
      {
        key: 'subagent',
        label: '子代理通知',
        segClass: 'seg-subagent-msg',
        title: '子代理完成汇报与后台任务系统通知',
        getValue: (c) => Number(c.subagentTokens || 0),
      },
      {
        key: 'checkpoint',
        label: '压缩摘要',
        segClass: 'seg-checkpoint',
        title: '自动上下文压缩生成的历史摘要检查点',
        getValue: (c) => Number(c.checkpointTokens || 0),
      },
      {
        key: 'systemPrompt',
        label: '系统提示词',
        segClass: 'seg-system-prompt',
        title: '核心身份、终端沙箱、制品与环境提示词',
        getValue: (c) => Number(c.systemPromptTokens || 0),
      },
      {
        key: 'systemTools',
        label: '系统工具',
        segClass: 'seg-system-tools',
        title: '内置系统工具 Schema 定义',
        getValue: (c) => Number(c.systemToolsTokens || 0),
      },
      {
        key: 'mcpTools',
        label: 'MCP 工具',
        segClass: 'seg-mcp-tools',
        title: 'MCP 外部服务工具与资源定义',
        getValue: (c) => Number(c.mcpToolsTokens || 0),
      },
      {
        key: 'skills',
        label: 'Skill',
        segClass: 'seg-skills',
        title: '已挂载的 Skills 技能索引与说明',
        getValue: (c) => Number(c.skillsTokens || 0),
      },
      {
        key: 'userRules',
        label: '用户规则',
        segClass: 'seg-user-rules',
        title: '全局与工作区自定义规则 (user_rules)',
        getValue: (c) => Number(c.userRulesTokens || 0),
      },
    ].map((ch, idx) => {
      const valEl = h('strong', { className: 'text-mono', text: '0' });
      const itemEl = h('div', { className: 'legend-item', title: ch.title }, [
        h('span', { className: 'legend-left' }, [
          h('span', { className: `swatch ${ch.segClass}` }),
          h('span', { text: ch.label }),
        ]),
        valEl,
      ]);
      return { ...ch, defaultOrder: idx, valEl, itemEl };
    });

    const ctxLegendGrid = h(
      'div',
      { className: 'ctx-legend-grid' },
      ctxChannels.map((ch) => ch.itemEl)
    );
    let lastLegendOrderSig = ctxChannels.map((ch) => ch.key).join(',');

    const ctxPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('layers', { size: 13 }),
          h('span', { text: '上下文窗口' }),
          ctxAgentBadge,
        ]),
        h('span', { className: 'panel-meta' }, [ctxSummaryText]),
      ]),
      ctxInspectorBar,
      ctxSegmentBar.el,
      ctxLegendGrid,
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
    let ctxPillsExpanded = false;
    let lastCascadeId = '';
    let cachedBarWidth = 0;

    /**
     * 将最新遥测载荷渲染至 4 格测速矩阵、6 段上下文进度条（支持主/子代理切换检视）与动态配额池列表。
     */
    function renderData(data) {
      if (!data) return;
      // 在本帧任何 DOM 写入前先读取容器宽度，避免写后读触发浏览器强制同步重排 (Forced Reflow)
      const measuredWidth =
        ctxInspectorBar.clientWidth || (ctxPanel.clientWidth ? ctxPanel.clientWidth - 24 : 0);
      if (measuredWidth > 160) {
        cachedBarWidth = measuredWidth;
      }
      const availRowWidth = cachedBarWidth > 160 ? cachedBarWidth : DEFAULT_BAR_WIDTH_PX;

      const currentCascadeId = data.activeConversation?.cascadeId || '';
      if (currentCascadeId && currentCascadeId !== lastCascadeId) {
        if (lastCascadeId) {
          ctxPillsExpanded = false;
        }
        lastCascadeId = currentCascadeId;
      }

      const uiSt = uiStore.getState();
      const {
        hasSubagents,
        effectiveScope,
        effectiveCtxScope,
        agents,
        aggregated,
        scopedConv,
        ctxAgent,
      } = resolveScopedConversation(data, uiSt.selectedAgentScope, uiSt.ctxInspectorAgentId);

      const active = scopedConv || data.activeConversation || {};
      const ctx = ctxAgent?.context || active.context || {};
      const quotas = data.quotas || {};

      // 1. 更新 4 格实时测速矩阵（根据当前代理作用域动态展示全部汇总或单代理指标）
      patchClasses(pulseDot, { 'is-pulsing': Boolean(active.isRunning) });
      patchText(tpsVal, formatMetric(active.latestTokPerSec, ' tok/s'));
      const reason = speedReasonText(active.latestSpeedReason);
      const modelAndAgent =
        hasSubagents && effectiveScope === 'all' && active.activeAgentBadge
          ? `[${active.activeAgentBadge}] ${active.activeModelShort || '模型未知'}`
          : active.activeModelShort || '模型未知';
      patchText(tpsSub, reason ? `${modelAndAgent} · ${reason}` : modelAndAgent);

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

      // 2. 更新 6 段上下文窗口构成与方案 B 内嵌上下文窗口检视胶囊条
      patchAttr(ctxAgentBadge, 'hidden', !hasSubagents);
      patchAttr(ctxInspectorBar, 'hidden', !hasSubagents);
      if (hasSubagents && ctxAgent) {
        const badgeCls = getAgentBadgeClass(ctxAgent.index || 0, Boolean(ctxAgent.isMain));
        patchAttr(ctxAgentBadge, 'class', `agent-badge ${badgeCls}`);
        const badgeFullText = formatAgentLabel(ctxAgent);
        patchText(ctxAgentBadge, badgeFullText);
        patchAttr(ctxAgentBadge, 'title', badgeFullText);

        const pillItems = [];
        if (effectiveScope === 'all') {
          pillItems.push({
            key: 'auto',
            label: `跟随活跃 (${aggregated?.activeAgentBadge || '主'})`,
            title: '自动展示当前正在运行或最新活跃的代理上下文窗口',
            isActive: effectiveCtxScope === 'auto',
            mode: 'ctx-only',
          });
        } else {
          pillItems.push({
            key: 'all',
            label: `全部汇总 (${aggregated?.stepCount ?? 0}步)`,
            title: '切回全部代理汇总视图',
            isActive: false,
            mode: 'scope',
          });
        }

        const allAgentPills = agents.map((ag) => {
          const agPct = ag.context?.usedPct ?? 0;
          const isAct =
            effectiveScope === 'all'
              ? effectiveCtxScope === ag.agentId
              : effectiveScope === ag.agentId;
          return {
            key: ag.agentId,
            label: `${ag.badgeText || ag.shortLabel} ${agPct}%`,
            title: `${formatAgentLabel(ag)} (${ag.activeModelShort || '模型未知'} · ${ag.stepCount || 0}步)`,
            isActive: isAct,
            mode: effectiveScope === 'all' ? 'ctx-only' : 'scope',
          };
        });

        // 根据当前卡片的实际像素宽度估算单行可容纳的胶囊数量，尽可能塞满整行右侧空间
        const firstPillWidth = pillItems.length > 0 ? estPillWidth(pillItems[0].label) : 0;
        const totalAllWidth = allAgentPills.reduce(
          (sum, p) => sum + PILL_GAP_PX + estPillWidth(p.label),
          firstPillWidth
        );
        const needsCollapse = totalAllWidth > availRowWidth && allAgentPills.length > 2;

        if (needsCollapse && !ctxPillsExpanded) {
          const toggleReservePx = PILL_GAP_PX + estPillWidth(`+${allAgentPills.length} 展开 ▾`);
          let usedW = firstPillWidth;
          let fitCount = 0;
          for (let i = 0; i < allAgentPills.length; i++) {
            const pw = PILL_GAP_PX + estPillWidth(allAgentPills[i].label);
            if (fitCount >= 1 && usedW + pw + toggleReservePx > availRowWidth) {
              break;
            }
            usedW += pw;
            fitCount++;
          }
          // 至少折叠 2 个胶囊（避免出现比胶囊本身还宽的 "+1 展开 ▾"）
          const maxKeep = Math.max(1, allAgentPills.length - 2);
          const maxCollapsedCount = Math.max(1, Math.min(maxKeep, fitCount));
          const visibleAgentPills = allAgentPills.slice(0, maxCollapsedCount);
          const activeHiddenPill = allAgentPills
            .slice(maxCollapsedCount)
            .find((p) => p.isActive);
          if (activeHiddenPill) {
            if (visibleAgentPills.length >= 2) {
              visibleAgentPills[visibleAgentPills.length - 1] = activeHiddenPill;
            } else {
              visibleAgentPills.push(activeHiddenPill);
            }
          }
          const hiddenCount = allAgentPills.length - visibleAgentPills.length;
          pillItems.push(...visibleAgentPills, {
            key: '__toggle_more__',
            label: `+${hiddenCount} 展开 ▾`,
            title: `展开全部 ${allAgentPills.length - 1} 个子代理的上下文窗口胶囊`,
            isActive: false,
            isMoreToggle: true,
            mode: 'toggle-expand',
          });
        } else {
          pillItems.push(...allAgentPills);
          if (needsCollapse) {
            pillItems.push({
              key: '__toggle_more__',
              label: '收起 ▴',
              title: '折叠多余子代理胶囊',
              isActive: false,
              isMoreToggle: true,
              mode: 'toggle-expand',
            });
          }
        }

        patchKeyedList(ctxPillGroup, pillItems, {
          keyFn: (item) => item.key,
          sigFn: (item) =>
            `${item.key}:${item.label}:${item.isActive}:${item.isMoreToggle}:${item.mode}:${item.title}`,
          createRow: () => {
            const btn = h('button', { type: 'button', className: 'ctx-agent-pill' });
            return { el: btn, refs: { btn } };
          },
          updateRow: (refs, item) => {
            patchText(refs.btn, item.label);
            patchAttr(refs.btn, 'title', item.title);
            patchClasses(refs.btn, {
              'is-active': item.isActive,
              'is-more-toggle': Boolean(item.isMoreToggle),
            });
            refs.btn.onclick = () => {
              if (item.mode === 'toggle-expand') {
                ctxPillsExpanded = !ctxPillsExpanded;
                renderData(latestData);
              } else if (item.mode === 'ctx-only') {
                uiStore.setState({ ctxInspectorAgentId: item.key });
              } else if (item.key === 'all') {
                uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
              } else {
                uiStore.setState({ selectedAgentScope: item.key });
              }
            };
          },
        });
      }

      const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
      const totalTokens = Number(ctx.totalTokens || 0);
      const usedPct =
        limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
      patchText(
        ctxSummaryText,
        `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
      );
      ctxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });
      const scoredChannels = ctxChannels.map((ch) => {
        const val = ch.getValue(ctx);
        patchText(ch.valEl, formatTokens(val));
        return { ch, val };
      });
      scoredChannels.sort((a, b) => b.val - a.val || a.ch.defaultOrder - b.ch.defaultOrder);
      const nextLegendOrderSig = scoredChannels.map((x) => x.ch.key).join(',');
      if (nextLegendOrderSig !== lastLegendOrderSig) {
        lastLegendOrderSig = nextLegendOrderSig;
        for (const { ch } of scoredChannels) {
          ctxLegendGrid.appendChild(ch.itemEl);
        }
      }

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

    let prevScope = uiStore.getState().selectedAgentScope;
    let prevCtxTarget = uiStore.getState().ctxInspectorAgentId;

    const unsubView = uiStore.subscribe(
      (st) => ({
        activeView: st.activeView,
        selectedAgentScope: st.selectedAgentScope,
        ctxInspectorAgentId: st.ctxInspectorAgentId,
      }),
      (slice) => {
        const scopeChanged =
          slice.selectedAgentScope !== prevScope || slice.ctxInspectorAgentId !== prevCtxTarget;
        prevScope = slice.selectedAgentScope;
        prevCtxTarget = slice.ctxInspectorAgentId;

        if (slice.activeView !== 'overview') {
          if (scopeChanged) isDirty = true;
          return;
        }
        if ((isDirty || scopeChanged) && latestData) {
          isDirty = false;
          renderData(latestData);
        }
      }
    );

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (uiStore.getState().activeView !== 'overview') return;
        const nextW =
          ctxInspectorBar.clientWidth || (ctxPanel.clientWidth ? ctxPanel.clientWidth - 24 : 0);
        if (nextW > 160 && Math.abs(nextW - cachedBarWidth) >= 6) {
          cachedBarWidth = nextW;
          if (latestData?.activeConversation?.hasSubagents) {
            renderData(latestData);
          }
        }
      });
      ro.observe(ctxPanel);
    }

    onCleanup(() => {
      unsub();
      unsubView();
      if (ro) ro.disconnect();
      ctxSegmentBar.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: { viewScrollbar },
    };
  },
});
