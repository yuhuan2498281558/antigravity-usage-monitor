/**
 * @fileoverview Row 1 of the compact top bar:
 * Bespoke CustomSelect for session switching, SVG live status indicator,
 * and async force-refresh button.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchText } from '../../core/domPatch.js';
import { createSvgIcon, patchSvgIcon } from '../../icons/SvgIcon.js';
import { fetchTelemetry, telemetryStore } from '../../store/telemetryStore.js';
import { CustomSelect } from '../ui/CustomSelect.js';

export const TopSessionHeader = defineComponent({
  name: 'TopSessionHeader',
  setup({ onCleanup }) {
    const convSelect = CustomSelect({
      modelValue: telemetryStore.getState().selectedConversationId,
      icon: 'bolt',
      placeholder: '自动跟随最新会话',
      options: [{ value: '', label: '自动跟随最新会话' }],
      onUpdateModelValue: (nextConvId) => {
        telemetryStore.setState({ selectedConversationId: nextConvId });
        fetchTelemetry({ force: false });
      },
    });

    const statusIcon = createSvgIcon('pulse', { size: 12 });
    const statusText = h('span', { text: '实时 2s' });
    const statusTag = h('span', { className: 'status-tag' }, [statusIcon, statusText]);

    const refreshBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '立即强制同步官方额度与测速',
        onClick: () => fetchTelemetry({ force: true }),
      },
      [createSvgIcon('refresh', { size: 13 })]
    );

    const headerEl = h('header', { className: 'session-header' }, [
      h('div', { className: 'session-left' }, [convSelect.el]),
      h('div', { className: 'session-right' }, [statusTag, refreshBtn]),
    ]);

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        selectedConversationId: st.selectedConversationId,
        syncState: st.syncState,
        conversations: st.telemetry?.conversations,
        isRunning: st.telemetry?.activeConversation?.isRunning,
        quotaMeta: st.telemetry?.quotas?.meta,
      }),
      (slice) => {
        const convs = slice.conversations || [];
        const latestTitle = convs[0]?.title ? `自动跟随 (${convs[0].title})` : '自动跟随最新会话';
        const options = [
          { value: '', label: latestTitle, meta: convs[0] ? `${convs[0].stepCount}步` : '' },
          ...convs.map((c) => ({
            value: c.cascadeId,
            label: c.title || c.cascadeId.slice(0, 8),
            meta: `${c.stepCount || 0}步`,
          })),
        ];
        convSelect.setProps({
          modelValue: slice.selectedConversationId,
          options,
        });

        const isSyncing = slice.syncState === 'syncing';
        const isSynced = slice.syncState === 'synced';
        const isError = slice.syncState === 'error';
        const isRunning = Boolean(slice.isRunning);
        const quotaStale = Boolean(slice.quotaMeta?.refreshFailed || slice.quotaMeta?.isStale);

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
          patchSvgIcon(statusIcon, 'bolt');
          patchText(statusText, '生成中');
          patchClasses(statusTag, {
            'state-running': true,
            'state-synced': false,
            'state-warn': false,
          });
        } else if (quotaStale) {
          patchSvgIcon(statusIcon, 'warning');
          patchText(statusText, slice.quotaMeta?.hasOfficialData ? '额度缓存' : '额度离线');
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
    );

    onCleanup(() => {
      unsubTelemetry();
      convSelect.destroy();
    });

    return {
      el: headerEl,
      refs: { convSelect, statusTag, refreshBtn },
    };
  },
});
