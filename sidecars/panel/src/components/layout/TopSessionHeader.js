/**
 * @fileoverview Row 1 of the compact top bar:
 * Bespoke CustomSelect for session switching, SVG live status indicator,
 * and async force-refresh button.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchText } from '../../core/domPatch.js';
import { formatUsd } from '../../core/formatters.js';
import { createSvgIcon, patchSvgIcon } from '../../icons/SvgIcon.js';
import {
  fetchTelemetry,
  formatAgentLabel,
  resolveScopedConversation,
  telemetryStore,
  triggerPluginUpdate,
} from '../../store/telemetryStore.js';
import { uiStore } from '../../store/uiStore.js';
import { CustomSelect } from '../ui/CustomSelect.js';

function formatConvOptionMeta(c) {
  if (!c) return '';
  const subs = Number(c.subagentCount || 0);
  if (subs > 0) {
    return `主${c.stepCount || 0} · ${subs}子 (共${c.totalStepCount || c.stepCount || 0}步)`;
  }
  return `${c.stepCount || 0}步`;
}

export const TopSessionHeader = defineComponent({
  name: 'TopSessionHeader',
  setup({ onCleanup }) {
    const convSelect = CustomSelect({
      modelValue: telemetryStore.getState().selectedConversationId,
      placeholder: '跟随最新会话',
      options: [{ value: '', label: '跟随最新会话' }],
      onUpdateModelValue: (nextConvId) => {
        uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
        telemetryStore.setState({ selectedConversationId: nextConvId });
        fetchTelemetry({ force: false });
      },
    });

    const updateBtnIcon = createSvgIcon('arrow-down', { size: 11 });
    const updateBtnText = h('span', { text: '有新版本' });
    let isHeaderUpdating = false;
    const updateBtn = h(
      'button',
      {
        type: 'button',
        className: 'update-badge-btn',
        hidden: true,
        'aria-label': '发现新版本，点击升级',
        onClick: async () => {
          if (isHeaderUpdating) return;
          isHeaderUpdating = true;
          patchText(updateBtnText, '升级中…');
          patchAttr(updateBtn, 'disabled', true);
          try {
            const res = await triggerPluginUpdate();
            if (!res?.ok) {
              uiStore.setState({ activeView: 'settings' });
            }
          } catch {
            uiStore.setState({ activeView: 'settings' });
          } finally {
            isHeaderUpdating = false;
            patchAttr(updateBtn, 'disabled', false);
            const cs = telemetryStore.getState().telemetry?.cloudStatus;
            patchText(
              updateBtnText,
              cs?.latestPluginVersion ? `升级 v${cs.latestPluginVersion}` : '有新版本'
            );
          }
        },
      },
      [updateBtnIcon, updateBtnText]
    );

    const statusIcon = createSvgIcon('pulse', { size: 12 });
    const statusText = h('span', { text: '实时 2s' });
    const statusTag = h('span', { className: 'status-tag' }, [statusIcon, statusText]);

    const refreshBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '刷新数据',
        onClick: () => fetchTelemetry({ force: true }),
      },
      [createSvgIcon('refresh', { size: 13 })]
    );

    const headerRowEl = h('div', { className: 'session-header' }, [
      h('div', { className: 'session-left' }, [convSelect.el]),
      h('div', { className: 'session-right' }, [updateBtn, statusTag, refreshBtn]),
    ]);

    // --- 方案 A：顶栏二级主/子代理切换条 (.agent-scope-bar，无子代理时自动隐藏) ---
    const scopeAllBtnText = h('span', { text: '全部汇总' });
    const scopeAllBtn = h(
      'button',
      {
        type: 'button',
        className: 'scope-pill-btn is-active',
        onClick: () =>
          uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' }),
      },
      [scopeAllBtnText]
    );

    const scopeMainBtnText = h('span', { text: '主代理' });
    const scopeMainBtn = h(
      'button',
      {
        type: 'button',
        className: 'scope-pill-btn',
        onClick: () => uiStore.setState({ selectedAgentScope: 'main' }),
      },
      [scopeMainBtnText]
    );

    const subagentSelect = CustomSelect({
      modelValue: '',
      icon: 'cpu',
      placeholder: '子代理 (0)',
      className: 'scope-subagent-select',
      options: [],
      onUpdateModelValue: (nextSubId) => {
        if (nextSubId) {
          uiStore.setState({ selectedAgentScope: nextSubId });
        }
      },
    });

    const scopeRightText = h('span', { className: 'agent-scope-right text-mono', text: '' });

    const scopeBarEl = h(
      'div',
      { className: 'agent-scope-bar', hidden: true },
      [
        h('div', { className: 'agent-scope-left' }, [
          scopeAllBtn,
          scopeMainBtn,
          subagentSelect.el,
        ]),
        scopeRightText,
      ]
    );

    const headerEl = h('header', { className: 'top-session-stack' }, [headerRowEl, scopeBarEl]);

    let lastActiveCascadeId = '';

    function renderHeaderState() {
      const telSt = telemetryStore.getState();
      const uiSt = uiStore.getState();
      const telemetry = telSt.telemetry;
      const currentCascadeId = telemetry?.activeConversation?.cascadeId || '';
      if (currentCascadeId && lastActiveCascadeId && currentCascadeId !== lastActiveCascadeId) {
        lastActiveCascadeId = currentCascadeId;
        if (uiSt.selectedAgentScope !== 'all' || uiSt.ctxInspectorAgentId !== 'auto') {
          uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
          return;
        }
      } else if (currentCascadeId) {
        lastActiveCascadeId = currentCascadeId;
      }

      const convs = telemetry?.conversations || [];
      const latestTitle = convs[0]?.title ? `最新 (${convs[0].title})` : '跟随最新会话';
      const options = [
        { value: '', label: latestTitle, meta: convs[0] ? formatConvOptionMeta(convs[0]) : '' },
        ...convs.map((c) => ({
          value: c.cascadeId,
          label: c.title || c.cascadeId.slice(0, 8),
          meta: formatConvOptionMeta(c),
        })),
      ];
      convSelect.setProps({
        modelValue: telSt.selectedConversationId,
        options,
      });

      const {
        hasSubagents,
        effectiveScope,
        subagents,
        mainAgent,
        aggregated,
        scopedConv,
      } = resolveScopedConversation(telemetry, uiSt.selectedAgentScope, uiSt.ctxInspectorAgentId);

      patchAttr(scopeBarEl, 'hidden', !hasSubagents);
      if (hasSubagents) {
        patchText(scopeAllBtnText, `全部 (${aggregated?.stepCount ?? 0})`);
        patchClasses(scopeAllBtn, { 'is-active': effectiveScope === 'all' });

        patchText(scopeMainBtnText, `主代理 (${mainAgent?.stepCount ?? 0})`);
        patchClasses(scopeMainBtn, { 'is-active': effectiveScope === 'main' });

        const isSubSelected = effectiveScope !== 'all' && effectiveScope !== 'main';
        patchClasses(subagentSelect.el, { 'is-active-sub': isSubSelected });
        const subOptions = subagents.map((s) => ({
          value: s.agentId,
          label: formatAgentLabel(s),
          meta: `${s.stepCount || 0}步 · 窗${s.context?.usedPct ?? 0}%`,
        }));
        subagentSelect.setProps({
          modelValue: isSubSelected ? effectiveScope : '',
          placeholder: `子代理 (${subagents.length})`,
          options: subOptions,
        });

        patchText(
          scopeRightText,
          formatUsd(scopedConv?.sessionCostUsd || 0, {
            unpricedCalls: scopedConv?.sessionUnpricedCalls,
          })
        );
      } else {
        subagentSelect.close();
      }

      const cloudStatus = telemetry?.cloudStatus;
      const hasUpdate = Boolean(cloudStatus?.updateAvailable);
      patchAttr(updateBtn, 'hidden', !hasUpdate);
      if (hasUpdate && !isHeaderUpdating) {
        patchText(
          updateBtnText,
          cloudStatus?.latestPluginVersion
            ? `升级 v${cloudStatus.latestPluginVersion}`
            : '有新版本'
        );
      }

      const isSyncing = telSt.syncState === 'syncing';
      const isSynced = telSt.syncState === 'synced';
      const isError = telSt.syncState === 'error';
      const isRunning = Boolean(aggregated?.isRunning || telemetry?.activeConversation?.isRunning);
      const quotaMeta = telemetry?.quotas?.meta;
      const quotaStale = Boolean(quotaMeta?.refreshFailed || quotaMeta?.isStale);

      patchClasses(refreshBtn, { 'is-spinning': isSyncing });
      patchAttr(refreshBtn, 'disabled', isSyncing);

      if (isSyncing) {
        patchSvgIcon(statusIcon, 'refresh');
        patchText(statusText, '同步中');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': true,
          'state-warn': false,
        });
      } else if (isSynced) {
        patchSvgIcon(statusIcon, 'check');
        patchText(statusText, '已刷新');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': true,
          'state-warn': false,
        });
      } else if (isError) {
        patchSvgIcon(statusIcon, 'warning');
        patchText(statusText, '重试中');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': true,
        });
      } else if (isRunning) {
        const runningAgent = (telemetry?.activeConversation?.agents || []).find((a) => a.isRunning);
        const runSuffix =
          hasSubagents && runningAgent ? ` · ${runningAgent.badgeText || runningAgent.shortLabel}` : '';
        patchSvgIcon(statusIcon, 'bolt');
        patchText(statusText, `生成中${runSuffix}`);
        patchClasses(statusTag, {
          'state-running': true,
          'state-synced': false,
          'state-warn': false,
        });
      } else if (quotaStale) {
        patchSvgIcon(statusIcon, 'warning');
        patchText(statusText, quotaMeta?.hasOfficialData ? '额度缓存' : '额度离线');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': true,
        });
      } else {
        patchSvgIcon(statusIcon, 'pulse');
        patchText(statusText, '实时 2s');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': false,
        });
      }
    }

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        selectedConversationId: st.selectedConversationId,
        syncState: st.syncState,
        telemetry: st.telemetry,
      }),
      () => renderHeaderState()
    );

    const unsubUi = uiStore.subscribe(
      (st) => st.selectedAgentScope,
      () => renderHeaderState()
    );

    onCleanup(() => {
      unsubTelemetry();
      unsubUi();
      convSelect.destroy();
      subagentSelect.destroy();
    });

    return {
      el: headerEl,
      refs: { convSelect, subagentSelect, statusTag, refreshBtn, scopeBarEl },
    };
  },
});
