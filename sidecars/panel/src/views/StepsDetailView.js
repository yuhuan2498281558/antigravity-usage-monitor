/**
 * @fileoverview View 3: StepsDetailView (步骤明细与按模型汇总视图).
 * 提供“单步测速”与“按模型汇总”双子表切换：
 * - 采用 `patchKeyedList` 实现行级 DOM 增量对账与就地复用，彻底避免全表 `innerHTML` 重建引发的闪烁；
 * - 两个表格各自包裹在独立的 `CustomScrollbar` 容器中，兼具粘性表头与零原生滚动条体验；
 * - 支持在内部代号 (`modelShort`) 与实际响应模型名 (`modelUpstream`) 之间无缝切换显示。
 */

import { defineComponent } from '../core/component.js';
import {
  h,
  patchAttr,
  patchClasses,
  patchKeyedList,
  patchText,
} from '../core/domPatch.js';
import {
  formatMetric,
  formatTokens,
  formatUsd,
  normalizeOrchestratorIdDisplayMode,
  resolveModelDisplayInfo,
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
import { CustomScrollbar } from '../components/ui/CustomScrollbar.js';
import { CustomSelect } from '../components/ui/CustomSelect.js';
import { SegmentedControl } from '../components/ui/SegmentedControl.js';

export const StepsDetailView = defineComponent({
  name: 'StepsDetailView',
  setup({ onCleanup }) {
    // 方案 B：明细面板标题栏内嵌代理筛选下拉框（与顶栏代理切换条双向同步）
    const inlineScopeSelect = CustomSelect({
      modelValue: uiStore.getState().selectedAgentScope,
      icon: 'layers',
      placeholder: '全部代理',
      className: 'steps-inline-scope-select',
      options: [{ value: 'all', label: '全部代理' }],
      onUpdateModelValue: (nextScope) => {
        if (nextScope) {
          uiStore.setState({
            selectedAgentScope: nextScope,
            ...(nextScope === 'all' ? { ctxInspectorAgentId: 'auto' } : {}),
          });
        }
      },
    });
    inlineScopeSelect.el.setAttribute('hidden', '');

    // 顶部子表分段切换器：在“按步查看”与“按模型汇总”之间切换
    const subTabSwitch = SegmentedControl({
      ariaLabel: '明细表视图切换',
      modelValue: uiStore.getState().stepsSubTab,
      options: [
        { value: 'steps', label: '按步查看 (0)' },
        { value: 'models', label: '按模型汇总' },
      ],
      onUpdateModelValue: (nextTab) => {
        uiStore.setState({ stepsSubTab: nextTab });
      },
    });

    // --- 子表 1：单步明细表（列定义：步序、模型、吞吐速度、首字延迟、上下文/输出、缓存命中率、单步费用） ---
    const stepsTbody = h('tbody');
    const stepsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table steps-data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { className: 'step-col-head', text: '步序' }),
            h('th', { text: '模型' }),
            h('th', { text: '速度' }),
            h('th', { text: '首字' }),
            h('th', { text: '上下文 / 输出' }),
            h('th', { text: '缓存' }),
            h('th', { text: '费用' }),
          ]),
        ]),
        stepsTbody,
      ]),
    ]);
    const stepsScroll = CustomScrollbar({
      contentEl: stepsTablePane,
      className: 'table-scroll-host',
    });

    const turnTipEl = h('div', {
      className: 'turn-prompt-tip',
      role: 'tooltip',
      hidden: true,
    });
    const hideTurnTip = () => patchAttr(turnTipEl, 'hidden', true);

    function showTurnTip(anchorCell, promptText) {
      const text = String(promptText || '').trim();
      if (!anchorCell || !text) {
        hideTurnTip();
        return;
      }
      patchText(turnTipEl, text);
      patchAttr(turnTipEl, 'hidden', false);
      if (
        typeof panelEl.getBoundingClientRect === 'function' &&
        typeof anchorCell.getBoundingClientRect === 'function'
      ) {
        const panelRect = panelEl.getBoundingClientRect();
        const cellRect = anchorCell.getBoundingClientRect();
        if (panelRect.width > 0 && panelRect.height > 0) {
          const tipH = turnTipEl.offsetHeight || 36;
          const placeAbove =
            panelRect.bottom - cellRect.bottom < tipH + 10 &&
            cellRect.top - panelRect.top > tipH + 6;
          const topPx = placeAbove
            ? Math.max(4, Math.round(cellRect.top - panelRect.top - tipH - 4))
            : Math.round(cellRect.bottom - panelRect.top + 4);
          const leftPx = Math.max(6, Math.round(cellRect.left - panelRect.left + 4));
          turnTipEl.style.top = `${topPx}px`;
          turnTipEl.style.left = `${leftPx}px`;
        }
      }
    }

    // --- 子表 2：按模型汇总表（列定义：模型名称、调用次数、有效均速、总 Token、费用） ---
    const modelsTbody = h('tbody');
    const modelsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { text: '模型' }),
            h('th', { text: '次数' }),
            h('th', { text: '均速' }),
            h('th', { text: '总 Token' }),
            h('th', { text: '费用' }),
          ]),
        ]),
        modelsTbody,
      ]),
    ]);
    const modelsScroll = CustomScrollbar({
      contentEl: modelsTablePane,
      className: 'table-scroll-host',
    });
    modelsScroll.el.setAttribute('hidden', '');

    const panelEl = h(
      'section',
      {
        className: 'panel',
        style: 'flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative;',
      },
      [
        h('div', { className: 'panel-header steps-panel-header' }, [
          h('span', { className: 'panel-title steps-panel-title' }, [
            createSvgIcon('table', { size: 13 }),
            h('span', { text: '调用记录' }),
          ]),
          h('div', { className: 'steps-header-controls' }, [
            inlineScopeSelect.el,
            subTabSwitch.el,
          ]),
        ]),
        stepsScroll.el,
        modelsScroll.el,
        turnTipEl,
      ]
    );
    stepsTablePane.addEventListener('scroll', hideTurnTip);
    stepsTbody.addEventListener('mouseleave', hideTurnTip);

    const rootEl = h('div', { className: 'view-pane' }, [panelEl]);

    const unsubUi = uiStore.subscribe(
      (st) => st.stepsSubTab,
      (tab) => {
        hideTurnTip();
        subTabSwitch.setValue(tab);
        patchAttr(stepsScroll.el, 'hidden', tab !== 'steps');
        patchAttr(modelsScroll.el, 'hidden', tab !== 'models');
        if (tab === 'steps') stepsScroll.refresh();
        else modelsScroll.refresh();
      }
    );

    let latestSlice = null;
    let isDirty = false;

    /**
     * 对单步测速表和按模型汇总表执行基于 `patchKeyedList` 的键值增量对账与行更新。
     */
    function renderStepsData(slice) {
      if (!slice) return;
      const uiSt = uiStore.getState();
      const {
        hasSubagents,
        effectiveScope,
        subagents,
        mainAgent,
        aggregated,
        scopedConv,
      } = resolveScopedConversation(
        { activeConversation: slice.activeConversation },
        uiSt.selectedAgentScope,
        uiSt.ctxInspectorAgentId
      );

      patchAttr(inlineScopeSelect.el, 'hidden', !hasSubagents);
      if (hasSubagents) {
        const scopeOpts = [
          {
            value: 'all',
            label: '全部汇总',
            meta: `${aggregated?.stepCount ?? 0}步`,
          },
          {
            value: 'main',
            label: '主代理',
            meta: `${mainAgent?.stepCount ?? 0}步`,
          },
          ...subagents.map((s) => ({
            value: s.agentId,
            label: formatAgentLabel(s),
            meta: `${s.stepCount || 0}步`,
          })),
        ];
        inlineScopeSelect.setProps({
          modelValue: effectiveScope,
          options: scopeOpts,
        });
      } else {
        inlineScopeSelect.close();
      }

      const steps =
        (hasSubagents ? scopedConv?.recentSteps : slice.recentSteps) ||
        slice.recentSteps ||
        [];
      const models =
        (Array.isArray(scopedConv?.modelBreakdown) && scopedConv.modelBreakdown.length > 0
          ? scopedConv.modelBreakdown
          : slice.sessionModelBreakdown || slice.modelBreakdown) || [];
      const displaySettings = {
        showUpstreamModel: Boolean(slice.showUpstreamModel),
        orchestratorIdMode: slice.orchestratorIdMode,
      };
      const modelsTabBadge = hasSubagents
        ? effectiveScope === 'all'
          ? '本会话汇总'
          : scopedConv?.shortLabel || '当前代理'
        : '本会话';

      subTabSwitch.setProps({
        options: [
          { value: 'steps', label: `按步查看 (${steps.length})` },
          { value: 'models', label: `按模型汇总 (${modelsTabBadge})` },
        ],
      });

      const useRootTurn = Boolean(hasSubagents && effectiveScope === 'all');
      const getStepTurnIdx = (st) =>
        useRootTurn ? (st?.rootTurnIndex ?? st?.turnIndex) : st?.turnIndex;
      const getStepIsStart = (st) =>
        Boolean(useRootTurn ? (st?.isRootTurnStart ?? st?.isTurnStart) : st?.isTurnStart);
      const getStepIsLatest = (st) =>
        Boolean(useRootTurn ? (st?.isRootLatestTurn ?? st?.isLatestTurn) : st?.isLatestTurn);
      const getStepPrompt = (st) =>
        (useRootTurn ? (st?.rootTurnPrompt ?? st?.turnPrompt) : st?.turnPrompt) || '';
      const turnKeyOf = (st) => {
        const tIdx = getStepTurnIdx(st);
        if (!Number.isInteger(tIdx) || tIdx <= 0) return '';
        return useRootTurn ? `root:${tIdx}` : `${st.agentId || 'main'}:${tIdx}`;
      };
      const decoratedSteps = steps.map((st, idx) => {
        const tKey = turnKeyOf(st);
        const hasUp = Boolean(tKey && idx > 0 && turnKeyOf(steps[idx - 1]) === tKey);
        const hasDown = Boolean(
          tKey && idx + 1 < steps.length && turnKeyOf(steps[idx + 1]) === tKey
        );
        return {
          st,
          rowKey: `${st.agentCascadeId || slice.cascadeId || 'conv'}-${st.stepIndex}`,
          hasTurn: Boolean(tKey),
          hasUp,
          hasDown,
          isStart: getStepIsStart(st),
          isLatest: getStepIsLatest(st),
          prompt: getStepPrompt(st),
        };
      });

      // 1. 单步测速表增量对账：以 `<agentCascadeId>-<stepIndex>` 为稳定行键，仅在签名变化时刷新单元格
      patchKeyedList(stepsTbody, decoratedSteps, {
        keyFn: (item) => item.rowKey,
        sigFn: (item) => {
          const { st } = item;
          const disp = resolveModelDisplayInfo(st, displaySettings, { fallback: '—' });
          return `${hasSubagents}:${effectiveScope}:${st.agentId || 'main'}:${st.stepIndex}:${disp.text}:${disp.title}:${st.tokPerSec}:${st.ttftSec}:${st.contextTokens}:${st.outputTokens}:${st.cacheHitPct}:${st.costUsd}:${st.selectedSpeedReason}:${item.hasTurn}:${item.hasUp}:${item.hasDown}:${item.isStart}:${item.isLatest}:${item.prompt}`;
        },
        createRow: () => {
          const railLineEl = h('span', { className: 'turn-rail-line', hidden: true });
          const railDotEl = h('span', { className: 'turn-rail-dot', hidden: true });
          const railEl = h(
            'span',
            { className: 'turn-rail', 'aria-hidden': 'true', hidden: true },
            [railLineEl, railDotEl]
          );
          const agentBadgeEl = h('span', {
            className: 'agent-badge is-clickable',
            hidden: true,
            style: 'margin-right: 4px;',
          });
          const stepNumText = h('span');
          const tdStep = h('td', { className: 'step-cell' }, [
            railEl,
            agentBadgeEl,
            stepNumText,
          ]);

          const tdModel = h('td', {
            style: 'max-width: 140px; overflow: hidden; text-overflow: ellipsis;',
          });
          const speedMain = h('strong', {
            className: 'cell-value accent-speed',
            style: 'font-size: 11px;',
          });
          const speedReason = h('div', { className: 'text-muted', style: 'font-size: 9.5px;' });
          const tdSpeed = h('td', {}, [speedMain, speedReason]);

          const tdTtft = h('td');
          const tdCtx = h('td');
          const tdCache = h('td', {
            className: 'cell-value accent-ok',
            style: 'font-size: 11px;',
          });
          const tdCost = h('td', { style: 'font-weight: 600;' });

          const tr = h('tr', {}, [tdStep, tdModel, tdSpeed, tdTtft, tdCtx, tdCache, tdCost]);
          return {
            el: tr,
            refs: {
              tdStep,
              railEl,
              railLineEl,
              railDotEl,
              agentBadgeEl,
              stepNumText,
              tdModel,
              speedMain,
              speedReason,
              tdTtft,
              tdCtx,
              tdCache,
              tdCost,
            },
          };
        },
        updateRow: (refs, item) => {
          const { st, hasTurn, hasUp, hasDown, isStart, isLatest, prompt } = item;
          patchAttr(refs.railEl, 'hidden', !hasTurn);
          if (hasTurn) {
            patchClasses(refs.railEl, {
              'is-latest': isLatest,
              'has-up': hasUp,
              'has-down': hasDown,
            });
            patchAttr(refs.railLineEl, 'hidden', !hasUp && !hasDown);
            const showOrigin = isStart;
            const showCap = !showOrigin && !hasUp && hasDown;
            patchAttr(refs.railDotEl, 'hidden', !showOrigin && !showCap);
            patchClasses(refs.railDotEl, {
              'is-origin': showOrigin,
              'is-cap': showCap,
            });
          }

          refs.tdStep.onmouseenter = (ev) => {
            if (ev?.target === refs.agentBadgeEl || !hasTurn || !prompt) {
              hideTurnTip();
              return;
            }
            showTurnTip(refs.tdStep, prompt);
          };
          refs.tdStep.onmouseleave = hideTurnTip;

          patchAttr(refs.agentBadgeEl, 'hidden', !hasSubagents);
          if (hasSubagents) {
            const badgeCls = getAgentBadgeClass(st.agentIndex || 0, !st.isSubagent);
            patchAttr(refs.agentBadgeEl, 'class', `agent-badge is-clickable ${badgeCls}`);
            patchText(refs.agentBadgeEl, st.agentBadge || (st.isSubagent ? '子' : '主'));
            patchAttr(
              refs.agentBadgeEl,
              'title',
              effectiveScope === 'all'
                ? `点击仅过滤查看 ${st.agentLabel || '该代理'}`
                : '点击切回全部汇总'
            );
            refs.agentBadgeEl.onclick = () => {
              const targetScope = st.agentId || 'main';
              const nextScope = effectiveScope === targetScope ? 'all' : targetScope;
              uiStore.setState({
                selectedAgentScope: nextScope,
                ...(nextScope === 'all' ? { ctxInspectorAgentId: 'auto' } : {}),
              });
            };
          }
          patchText(refs.stepNumText, `#${Number(st.stepIndex)}`);
          const modelDisplay = resolveModelDisplayInfo(st, displaySettings, { fallback: '—' });
          patchText(refs.tdModel, modelDisplay.text);
          patchAttr(refs.tdModel, 'title', modelDisplay.title);

          patchText(refs.speedMain, formatMetric(st.tokPerSec, ' tok/s'));
          const reason = speedReasonText(st.selectedSpeedReason);
          patchText(refs.speedReason, reason);
          patchAttr(refs.speedReason, 'hidden', !reason);

          patchText(refs.tdTtft, formatMetric(st.ttftSec, 's'));
          patchText(
            refs.tdCtx,
            `${formatTokens(st.contextTokens)} / +${Number(st.outputTokens || 0)}`
          );
          patchText(refs.tdCache, `${Number(st.cacheHitPct ?? 0)}%`);

          const costVal = st.costUsd;
          patchText(refs.tdCost, formatUsd(costVal, { precise: true }));
          patchClasses(refs.tdCost, { 'accent-speed': costVal >= 0.15 });
        },
      });

      // 2. 按模型汇总表增量对账：以模型标识为稳定行键，展示调用次数、加权均速、有效样本比与总费用
      patchKeyedList(modelsTbody, models, {
        keyFn: (m) => m.label || m.shortName,
        sigFn: (m) => {
          const disp = resolveModelDisplayInfo(m, displaySettings, { fallback: '—' });
          return `${disp.text}:${disp.title}:${m.calls}:${m.avgTokPerSec}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.speedSummary?.sampleCount}`;
        },
        createRow: () => {
          const tdName = h('td', {
            style: 'font-weight: 600; max-width: 165px; overflow: hidden; text-overflow: ellipsis;',
          });
          const tdCalls = h('td');
          const speedMain = h('div');
          const speedSub = h('div', { className: 'text-muted', style: 'font-size: 9.5px;' });
          const tdSpeed = h('td', {}, [speedMain, speedSub]);
          const tdTokens = h('td');
          const tdCost = h('td', { style: 'font-weight: 600;' });
          const tr = h('tr', {}, [tdName, tdCalls, tdSpeed, tdTokens, tdCost]);
          return {
            el: tr,
            refs: { tdName, tdCalls, speedMain, speedSub, tdTokens, tdCost },
          };
        },
        updateRow: (refs, m) => {
          const modelDisplay = resolveModelDisplayInfo(m, displaySettings, { fallback: '—' });
          patchText(refs.tdName, modelDisplay.text);
          patchAttr(refs.tdName, 'title', modelDisplay.title);
          patchText(refs.tdCalls, String(Number(m.calls || 0)));
          patchText(refs.speedMain, formatMetric(m.avgTokPerSec, ' tok/s'));
          patchText(refs.speedSub, `有效 ${sampleSummary(m.speedSummary)}`);
          patchText(refs.tdTokens, formatTokens(m.totalTokens || 0));
          patchText(refs.tdCost, formatUsd(m.costUsd || 0));
        },
      });

      if (uiSt.stepsSubTab === 'models') {
        modelsScroll.refresh();
      } else {
        stepsScroll.refresh();
      }
    }

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        activeConversation: st.telemetry?.activeConversation,
        cascadeId: st.telemetry?.activeConversation?.cascadeId,
        recentSteps: st.telemetry?.activeConversation?.recentSteps,
        sessionModelBreakdown: st.telemetry?.activeConversation?.modelBreakdown,
        modelBreakdown: st.telemetry?.modelBreakdown,
        showUpstreamModel: Boolean(st.telemetry?.settings?.showUpstreamModel),
        orchestratorIdMode: normalizeOrchestratorIdDisplayMode(
          st.telemetry?.settings?.orchestratorIdMode
        ),
      }),
      (slice) => {
        latestSlice = slice;
        if (uiStore.getState().activeView !== 'steps') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderStepsData(slice);
      }
    );

    let prevScope = uiStore.getState().selectedAgentScope;

    const unsubView = uiStore.subscribe(
      (st) => ({
        activeView: st.activeView,
        selectedAgentScope: st.selectedAgentScope,
      }),
      (uiSlice) => {
        const scopeChanged = uiSlice.selectedAgentScope !== prevScope;
        prevScope = uiSlice.selectedAgentScope;
        if (uiSlice.activeView !== 'steps') {
          if (scopeChanged) isDirty = true;
          return;
        }
        if ((isDirty || scopeChanged) && latestSlice) {
          isDirty = false;
          renderStepsData(latestSlice);
        }
      }
    );

    onCleanup(() => {
      stepsTablePane.removeEventListener('scroll', hideTurnTip);
      stepsTbody.removeEventListener('mouseleave', hideTurnTip);
      unsubUi();
      unsubTelemetry();
      unsubView();
      inlineScopeSelect.destroy();
      subTabSwitch.destroy();
      stepsScroll.destroy();
      modelsScroll.destroy();
    });

    return {
      el: rootEl,
      refs: {
        stepsTbody,
        modelsTbody,
        inlineScopeSelect,
        subTabSwitch,
        stepsScroll,
        modelsScroll,
      },
    };
  },
});
