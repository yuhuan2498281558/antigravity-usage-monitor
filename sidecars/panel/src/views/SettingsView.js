/**
 * @fileoverview View 4: SettingsView (系统设置视图).
 * 采用定制的 `CustomSelect` 与 `SegmentedControl` 替代所有原生表单控件，分为三个单层细线设置面板：
 * 1. 常规设置：配置面板挂载方式（双栖挂载 / 仅右侧辅助栏）、模型名称格式（精简代号 / 原始模型 ID）与 Orchestrator 系列 ID 格式；
 * 2. 顶部栏定制：控制左侧「实时运行会话」入口开关，以及自由定义右侧精简胶囊三个数值槽位的显示内容与左右顺序；
 * 3. 版本更新：配置插件自动更新策略、手动同步云端模型价格表，以及检查并执行 Git/ZIP 双模式插件升级。
 */

import { defineComponent } from '../core/component.js';
import { h, patchAttr, patchClasses, patchText } from '../core/domPatch.js';
import { createSvgIcon } from '../icons/SvgIcon.js';
import {
  DEFAULT_CLIENT_TOPBAR_SLOTS,
  normalizeClientOrchestratorIdMode,
  normalizeClientTopbarSlots,
  normalizeClientUpdateMode,
  saveSettingsPatch,
  telemetryStore,
  triggerCloudSync,
  triggerPluginUpdate,
} from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { CustomScrollbar } from '../components/ui/CustomScrollbar.js';
import { CustomSelect } from '../components/ui/CustomSelect.js';
import { SegmentedControl } from '../components/ui/SegmentedControl.js';

/** 步骤明细表中的模型名称显示方式可选项 */
const STEP_MODEL_DISPLAY_OPTIONS = [
  { value: 'short', label: '精简代号 (如 argon-4-high)' },
  { value: 'upstream', label: '原始模型 ID (如 gemini-3.8-flash-n)' },
];

/** Orchestrator 系列模型 ID 显示方式可选项（独立于普通模型名称格式） */
const ORCHESTRATOR_ID_DISPLAY_OPTIONS = [
  { value: 'compact', label: '精简代号 (如 orchestrator-argon)' },
  { value: 'full', label: '原始完整 ID (如 gemini-pro-orchestrator)' },
];

/** 面板挂载模式可选项（顶部栏 + 侧边栏 vs 仅侧边栏） */
const WINDOW_MOUNT_OPTIONS = [
  { value: 'dual', label: '双栖挂载 (顶部栏 + 侧边栏)' },
  { value: 'sidebar', label: '仅侧边栏' },
];

/** 顶栏左侧实时运行会话入口显隐选项 */
const TOPBAR_MULTI_TOGGLE_OPTIONS = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' },
];

/** 顶栏右侧精简胶囊三槽位可选指标项 */
const TOPBAR_SLOT_OPTIONS = [
  { value: 'context', label: '上下文占用 (%)' },
  { value: 'tps', label: '输出速度 (TPS)' },
  { value: 'ttft', label: '首字延迟 (TTFT)' },
  { value: 'cost', label: '本次费用 ($)' },
  { value: 'quota_auto', label: '自动紧俏额度' },
  { value: 'gemini_5h', label: 'Gemini 5h 额度' },
  { value: 'gemini_weekly', label: 'Gemini 周额度' },
  { value: 'claude_5h', label: 'Claude 5h 额度' },
  { value: 'claude_weekly', label: 'Claude 周额度' },
  { value: 'none', label: '不显示' },
];

/** 插件版本更新策略可选项（默认仅提示新版本、手动更新） */
const AUTO_UPDATE_OPTIONS = [
  { value: 'manual', label: '仅提示新版本，手动更新' },
  { value: 'auto', label: '自动更新' },
  { value: 'off', label: '关闭更新' },
];

/**
 * 格式化云端价格目录的最近同步时间或版本日期文本。
 */
function formatSyncTimeText(tsMs, updatedAt) {
  if (Number(tsMs) > 0) {
    const d = new Date(Number(tsMs));
    const pad = (n) => String(n).padStart(2, '0');
    return `更新于 ${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (updatedAt) {
    return `发布于 ${String(updatedAt).slice(0, 10)}`;
  }
  return '默认价格';
}

export const SettingsView = defineComponent({
  name: 'SettingsView',
  setup({ onCleanup }) {
    let draftShowUpstreamModel = false;
    let draftOrchestratorIdMode = 'compact';
    let draftPluginUpdateMode = 'manual';
    let draftEnableWindowOverlay = true;
    let draftShowTopbarMulti = true;
    let draftTopbarSlots = [...DEFAULT_CLIENT_TOPBAR_SLOTS];
    let statusTimer = null;
    let topbarTimer = null;
    let cloudTimer = null;

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const topbarStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const cloudStatusMsg = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    /** 在常规设置面板右上角展示短暂的保存状态提示 */
    function showSaveFeedback(text) {
      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }
      patchText(saveStatusText, text);
      if (text === '已保存' || text === '保存失败') {
        statusTimer = setTimeout(() => {
          statusTimer = null;
          patchText(saveStatusText, '');
        }, text === '保存失败' ? 2500 : 1500);
      }
    }

    /** 在顶部栏定制面板右上角展示短暂的状态提示 */
    function showTopbarFeedback(text, autoClearMs = 1500) {
      if (topbarTimer) {
        clearTimeout(topbarTimer);
        topbarTimer = null;
      }
      patchText(topbarStatusText, text);
      if (autoClearMs > 0) {
        topbarTimer = setTimeout(() => {
          topbarTimer = null;
          patchText(topbarStatusText, '');
        }, autoClearMs);
      }
    }

    /** 在云端同步面板右上角展示同步或更新进度提示 */
    function showCloudFeedback(text, autoClearMs = 3500) {
      if (cloudTimer) {
        clearTimeout(cloudTimer);
        cloudTimer = null;
      }
      patchText(cloudStatusMsg, text);
      if (autoClearMs > 0) {
        cloudTimer = setTimeout(() => {
          cloudTimer = null;
          patchText(cloudStatusMsg, '');
        }, autoClearMs);
      }
    }

    // --- 面板 1：常规设置 ---
    const windowMountSelect = CustomSelect({
      modelValue: 'dual',
      icon: 'dock',
      options: WINDOW_MOUNT_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextEnable = val !== 'sidebar';
        draftEnableWindowOverlay = nextEnable;
        windowMountSelect.setValue(nextEnable ? 'dual' : 'sidebar');
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            enableWindowOverlay: nextEnable,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const stepModelSelect = CustomSelect({
      modelValue: 'short',
      icon: 'table',
      options: STEP_MODEL_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextUpstream = val === 'upstream';
        draftShowUpstreamModel = nextUpstream;
        stepModelSelect.setValue(nextUpstream ? 'upstream' : 'short');
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            showUpstreamModel: nextUpstream,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const orchestratorIdSelect = CustomSelect({
      modelValue: 'compact',
      icon: 'layers',
      options: ORCHESTRATOR_ID_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextMode = normalizeClientOrchestratorIdMode(val);
        draftOrchestratorIdMode = nextMode;
        orchestratorIdSelect.setValue(nextMode);
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            orchestratorIdMode: nextMode,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const generalPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '常规设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '面板挂载方式' }),
        windowMountSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '模型名称格式' }),
        stepModelSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: 'Orchestrator 系列 ID' }),
        orchestratorIdSelect.el,
      ]),
    ]);

    // --- 面板 2：顶部栏定制（实时运行会话开关 + 右侧三槽位指标与顺序自定义） ---
    const multiSessionToggle = SegmentedControl({
      ariaLabel: '实时运行会话开关',
      modelValue: 'show',
      options: TOPBAR_MULTI_TOGGLE_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextShow = val !== 'hide';
        draftShowTopbarMulti = nextShow;
        syncTopbarControls();
        showTopbarFeedback('保存中…', 0);
        try {
          await saveSettingsPatch({
            showTopbarMultiSession: nextShow,
          });
          showTopbarFeedback('已保存', 1500);
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showTopbarFeedback('保存失败', 2500);
        }
      },
    });

    async function persistTopbarSlots(nextRawSlots, noticeText = '') {
      const normalized = normalizeClientTopbarSlots(nextRawSlots);
      draftTopbarSlots = normalized;
      syncTopbarControls();
      showTopbarFeedback(noticeText || '保存中…', 0);
      try {
        await saveSettingsPatch({
          topbarCapsuleSlots: normalized,
        });
        showTopbarFeedback(noticeText || '已保存', noticeText ? 2000 : 1500);
      } catch {
        if (latestSettings) {
          renderSettings(latestSettings);
        }
        showTopbarFeedback('保存失败', 2500);
      }
    }

    function handleSlotMetricChange(slotIndex, nextVal) {
      const candidate = [...draftTopbarSlots];
      candidate[slotIndex] = nextVal;
      const wouldAllBeHidden = candidate.every((item) => item === 'none');
      void persistTopbarSlots(
        candidate,
        wouldAllBeHidden ? '至少保留 1 项显示' : ''
      );
    }

    function swapTopbarSlots(idxA, idxB) {
      if (idxA < 0 || idxA > 2 || idxB < 0 || idxB > 2 || idxA === idxB) return;
      const candidate = [...draftTopbarSlots];
      const temp = candidate[idxA];
      candidate[idxA] = candidate[idxB];
      candidate[idxB] = temp;
      void persistTopbarSlots(candidate);
    }

    const slotSelects = [0, 1, 2].map((idx) =>
      CustomSelect({
        modelValue: draftTopbarSlots[idx],
        options: TOPBAR_SLOT_OPTIONS,
        onUpdateModelValue: (val) => handleSlotMetricChange(idx, val),
      })
    );

    const slotRows = [0, 1, 2].map((idx) => {
      const upBtn = h(
        'button',
        {
          type: 'button',
          className: 'slot-move-btn',
          disabled: idx === 0,
          'aria-label': `槽位 ${idx + 1} 左移`,
          title: idx === 0 ? '已在最左' : '上移 (在顶栏靠左)',
          onClick: (e) => {
            e.stopPropagation();
            swapTopbarSlots(idx, idx - 1);
          },
        },
        [createSvgIcon('chevron-up', { size: 12 })]
      );

      const downBtn = h(
        'button',
        {
          type: 'button',
          className: 'slot-move-btn',
          disabled: idx === 2,
          'aria-label': `槽位 ${idx + 1} 右移`,
          title: idx === 2 ? '已在最右' : '下移 (在顶栏靠右)',
          onClick: (e) => {
            e.stopPropagation();
            swapTopbarSlots(idx, idx + 1);
          },
        },
        [createSvgIcon('chevron-down', { size: 12 })]
      );

      return h('div', { className: 'topbar-slot-row', 'data-slot-row': String(idx) }, [
        h('span', { className: 'slot-index-badge', text: String(idx + 1) }),
        slotSelects[idx].el,
        h('span', { className: 'slot-order-btns' }, [upBtn, downBtn]),
      ]);
    });

    const resetTopbarBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-ghost-sm',
        disabled: true,
        onClick: async () => {
          draftShowTopbarMulti = true;
          draftTopbarSlots = [...DEFAULT_CLIENT_TOPBAR_SLOTS];
          syncTopbarControls();
          showTopbarFeedback('保存中…', 0);
          try {
            await saveSettingsPatch({
              showTopbarMultiSession: true,
              topbarCapsuleSlots: [...DEFAULT_CLIENT_TOPBAR_SLOTS],
            });
            showTopbarFeedback('已恢复默认', 1600);
          } catch {
            if (latestSettings) {
              renderSettings(latestSettings);
            }
            showTopbarFeedback('保存失败', 2500);
          }
        },
      },
      [h('span', { text: '恢复默认' })]
    );

    function syncTopbarControls() {
      multiSessionToggle.setValue(draftShowTopbarMulti ? 'show' : 'hide');
      for (let i = 0; i < 3; i += 1) {
        slotSelects[i].setValue(draftTopbarSlots[i]);
      }
      const isDefault =
        draftShowTopbarMulti === true &&
        draftTopbarSlots[0] === DEFAULT_CLIENT_TOPBAR_SLOTS[0] &&
        draftTopbarSlots[1] === DEFAULT_CLIENT_TOPBAR_SLOTS[1] &&
        draftTopbarSlots[2] === DEFAULT_CLIENT_TOPBAR_SLOTS[2];
      patchAttr(resetTopbarBtn, 'disabled', isDefault);
    }

    const topbarPanel = h('section', { className: 'panel topbar-config-panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('dock', { size: 13 }),
          h('span', { text: '顶部栏定制' }),
        ]),
        h('span', { className: 'topbar-header-right' }, [topbarStatusText, resetTopbarBtn]),
      ]),
      h('div', { className: 'settings-inline-row' }, [
        h('span', { className: 'form-label', text: '实时运行会话' }),
        multiSessionToggle.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '胶囊数值与顺序 (左 → 右)' }),
        h('div', { className: 'topbar-slot-list' }, slotRows),
      ]),
    ]);

    // --- 面板 3：版本更新面板 ---
    const autoUpdateSelect = CustomSelect({
      modelValue: 'manual',
      icon: 'refresh',
      options: AUTO_UPDATE_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextMode = normalizeClientUpdateMode(val);
        draftPluginUpdateMode = nextMode;
        autoUpdateSelect.setValue(nextMode);
        if (latestCloudStatus) {
          renderCloudStatus(latestCloudStatus);
        }
        showCloudFeedback('保存中…', 0);
        try {
          await saveSettingsPatch({
            pluginUpdateMode: nextMode,
            autoUpdatePlugin: nextMode === 'auto',
          });
          showCloudFeedback('已保存', 1800);
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          if (latestCloudStatus) {
            renderCloudStatus(latestCloudStatus);
          }
          showCloudFeedback('保存失败', 2500);
        }
      },
    });

    const pricingCountVal = h('strong', { className: 'cell-value', text: '—' });
    const pricingSyncSub = h('span', { className: 'cell-sub', text: '读取中…' });
    const versionVal = h('strong', { className: 'cell-value', text: 'v1.4.4' });
    const versionSub = h('span', { className: 'cell-sub', text: '检查中…' });

    const syncPricingBtnText = h('span', { text: '更新价格表' });
    const syncPricingBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-secondary',
        onClick: async () => {
          patchAttr(syncPricingBtn, 'disabled', true);
          patchText(syncPricingBtnText, '更新中…');
          showCloudFeedback('正在同步价格表…', 0);
          try {
            const res = await triggerCloudSync();
            const cs = res?.cloudStatus;
            if (res?.ok && cs) {
              showCloudFeedback(`价格表已更新 (${cs.modelCount} 个模型)`, 3500);
            } else {
              showCloudFeedback(cs?.lastSyncError || '连接超时，使用本地价格表', 4500);
            }
          } catch (err) {
            showCloudFeedback(err?.message || '同步失败，使用本地价格表', 4500);
          } finally {
            patchAttr(syncPricingBtn, 'disabled', false);
            patchText(syncPricingBtnText, '更新价格表');
          }
        },
      },
      [createSvgIcon('refresh', { size: 12 }), syncPricingBtnText]
    );

    const updatePluginBtnText = h('span', { text: '检查更新' });
    const updatePluginBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-secondary',
        onClick: async () => {
          patchAttr(updatePluginBtn, 'disabled', true);
          try {
            if (!latestCloudStatus?.updateAvailable) {
              patchText(updatePluginBtnText, '检查中…');
              showCloudFeedback('正在检查新版本…', 0);
              const syncRes = await triggerCloudSync();
              const cs = syncRes?.cloudStatus || latestCloudStatus;
              if (cs) {
                latestCloudStatus = cs;
                renderCloudStatus(cs);
              }
              if (!syncRes?.ok && cs?.lastSyncError) {
                showCloudFeedback(`检查失败：${cs.lastSyncError}`, 5000);
                return;
              }
              if (!cs?.updateAvailable) {
                const curVer = cs?.currentPluginVersion || '1.4.4';
                showCloudFeedback(`当前已是最新版本 (v${curVer})`, 4500);
                return;
              }
            }
            patchText(updatePluginBtnText, '更新中…');
            showCloudFeedback('正在下载更新…', 0);
            const res = await triggerPluginUpdate();
            if (res?.cloudStatus) {
              latestCloudStatus = res.cloudStatus;
            }
            if (res?.ok) {
              showCloudFeedback(res.message || '更新完成，正在重启面板…', 5000);
            } else {
              showCloudFeedback(res?.message || '未执行更新', 5500);
            }
          } catch (err) {
            showCloudFeedback(err?.message || '更新失败', 5000);
          } finally {
            patchAttr(updatePluginBtn, 'disabled', false);
            renderCloudStatus(latestCloudStatus);
          }
        },
      },
      [createSvgIcon('arrow-down', { size: 12 }), updatePluginBtnText]
    );

    const cloudPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('bolt', { size: 13 }),
          h('span', { text: '版本更新' }),
        ]),
        cloudStatusMsg,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '更新方式' }),
        autoUpdateSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'matrix-cell' }, [
          h('span', { className: 'cell-label', text: '价格表' }),
          pricingCountVal,
          pricingSyncSub,
        ]),
        h('div', { className: 'matrix-cell' }, [
          h('span', { className: 'cell-label', text: '当前版本' }),
          versionVal,
          versionSub,
        ]),
      ]),
      h('div', { className: 'cloud-actions-row' }, [syncPricingBtn, updatePluginBtn]),
    ]);

    const settingsInner = h(
      'div',
      {
        style: 'display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: 2px;',
      },
      [generalPanel, topbarPanel, cloudPanel]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: settingsInner,
      className: 'view-pane',
    });

    let latestSettings = null;
    let latestCloudStatus = null;

    /** 将后端返回的最新设置同步至表单控件 */
    function renderSettings(settings) {
      if (!settings) return;
      draftShowUpstreamModel = Boolean(settings.showUpstreamModel);
      draftOrchestratorIdMode = normalizeClientOrchestratorIdMode(settings.orchestratorIdMode);
      draftPluginUpdateMode = normalizeClientUpdateMode(
        settings.pluginUpdateMode,
        settings.autoUpdatePlugin
      );
      draftEnableWindowOverlay = settings.enableWindowOverlay !== false;
      draftShowTopbarMulti = settings.showTopbarMultiSession !== false;
      draftTopbarSlots = normalizeClientTopbarSlots(settings.topbarCapsuleSlots);

      windowMountSelect.setValue(draftEnableWindowOverlay ? 'dual' : 'sidebar');
      stepModelSelect.setValue(draftShowUpstreamModel ? 'upstream' : 'short');
      orchestratorIdSelect.setValue(draftOrchestratorIdMode);
      autoUpdateSelect.setValue(draftPluginUpdateMode);
      syncTopbarControls();
      viewScrollbar.refresh();
    }

    /** 将云端价格表统计与插件版本对比状态同步至云端面板 */
    function renderCloudStatus(cs) {
      if (!cs) return;
      const srcLabel =
        cs.source === 'remote'
          ? '云端同步'
          : cs.source === 'local'
            ? '本地文件'
            : '内置默认';
      patchText(pricingCountVal, `${cs.modelCount || 0} 个模型`);
      patchText(
        pricingSyncSub,
        `${srcLabel} · ${formatSyncTimeText(cs.lastSyncedAtMs, cs.catalogUpdatedAt)}`
      );

      const curVer = cs.currentPluginVersion || '1.4.4';
      const latVer = cs.latestPluginVersion || curVer;
      const modeTag = cs.installMode === 'git' ? 'Git' : 'ZIP';
      patchText(versionVal, `v${curVer}`);
      if (cs.updateAvailable && draftPluginUpdateMode !== 'off') {
        patchText(versionSub, `可升级至 v${latVer} (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': true });
        patchText(updatePluginBtnText, `升级至 v${latVer}`);
        patchClasses(updatePluginBtn, { 'btn-primary': true, 'btn-secondary': false });
      } else if (draftPluginUpdateMode === 'off') {
        patchText(versionSub, `已关闭更新提醒 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, cs.updateAvailable ? `手动升级 v${latVer}` : '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      } else {
        patchText(versionSub, `已是最新 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      }

      if (!cloudTimer && (cs.lastUpdateError || (cs.lastUpdateResult?.ok === false && cs.lastUpdateResult?.message))) {
        showCloudFeedback(cs.lastUpdateError || cs.lastUpdateResult.message, 5500);
      }
      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({
        settings: st.telemetry?.settings,
        cloudStatus: st.telemetry?.cloudStatus,
      }),
      (slice) => {
        latestSettings = slice.settings;
        latestCloudStatus = slice.cloudStatus;
        renderSettings(slice.settings);
        if (uiStore.getState().activeView === 'settings') {
          renderCloudStatus(slice.cloudStatus);
        }
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings') {
          if (latestSettings) renderSettings(latestSettings);
          if (latestCloudStatus) renderCloudStatus(latestCloudStatus);
          viewScrollbar.refresh();
        }
      }
    );

    onCleanup(() => {
      if (statusTimer) clearTimeout(statusTimer);
      if (topbarTimer) clearTimeout(topbarTimer);
      if (cloudTimer) clearTimeout(cloudTimer);
      unsub();
      unsubView();
      windowMountSelect.destroy();
      stepModelSelect.destroy();
      orchestratorIdSelect.destroy();
      multiSessionToggle.destroy();
      for (const sel of slotSelects) {
        sel.destroy();
      }
      autoUpdateSelect.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: {
        windowMountSelect,
        stepModelSelect,
        orchestratorIdSelect,
        multiSessionToggle,
        slotSelects,
        resetTopbarBtn,
        autoUpdateSelect,
        viewScrollbar,
      },
    };
  },
});
