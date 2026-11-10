/**
 * @fileoverview View 4: SettingsView (系统设置视图).
 * 采用定制的 `CustomSelect` 与 `CustomNumberInput` 替代所有原生表单控件，分为两个设置面板：
 * 1. 本地配额监控与预算表单：配置模型名称显示方式（内部代号/实际模型名）、周用量计算模式及自定义 Token/USD 预算；
 * 2. 云端价格同步与插件更新面板：配置插件自动更新策略、手动同步云端模型价格表，以及检查并执行 Git/ZIP 双模式插件升级。
 */

import { defineComponent } from '../core/component.js';
import { h, patchAttr, patchClasses, patchText } from '../core/domPatch.js';
import { createSvgIcon } from '../icons/SvgIcon.js';
import {
  saveSettingsPatch,
  telemetryStore,
  triggerCloudSync,
  triggerPluginUpdate,
} from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { CustomNumberInput } from '../components/ui/CustomNumberInput.js';
import { CustomSelect } from '../components/ui/CustomSelect.js';

/** 每周配额计算模式可选项 */
const WEEKLY_MODE_OPTIONS = [
  { value: 'official', label: '跟随官方额度' },
  { value: 'custom_tokens', label: '自定义 Token 上限' },
  { value: 'custom_cost', label: '自定义费用上限 (USD)' },
];

/** 步骤明细表中的模型名称显示方式可选项 */
const STEP_MODEL_DISPLAY_OPTIONS = [
  { value: 'short', label: '精简代号 (如 argon-4-high)' },
  { value: 'upstream', label: '原始模型 ID (如 gemini-3.8-flash-n)' },
];

/** 插件版本更新策略可选项 */
const AUTO_UPDATE_OPTIONS = [
  { value: 'manual', label: '仅提示新版本，手动更新 (推荐)' },
  { value: 'auto', label: '后台自动安装新版本' },
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
    // --- 面板 1：本地配额监控与预算表单状态与控件 ---
    let draftMode = 'official';
    let draftTokens = 150000000;
    let draftCost = 100;
    let draftShowUpstreamModel = false;
    let draftAutoUpdatePlugin = false;
    let statusTimer = null;
    let cloudTimer = null;
    let lastSyncedSettingsSig = '';

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const cloudStatusMsg = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    /** 在本地预算面板右上角展示短暂的保存状态提示 */
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

    const modeSelect = CustomSelect({
      modelValue: draftMode,
      icon: 'sliders',
      options: WEEKLY_MODE_OPTIONS,
      onUpdateModelValue: (val) => {
        draftMode = val;
      },
    });

    // 模型名显示方式切换后立即持久化并刷新遥测数据
    const stepModelSelect = CustomSelect({
      modelValue: 'short',
      icon: 'table',
      options: STEP_MODEL_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        draftShowUpstreamModel = val === 'upstream';
        if (latestSettings) {
          lastSyncedSettingsSig = settingsSig({
            ...latestSettings,
            showUpstreamModel: draftShowUpstreamModel,
          });
        }
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            showUpstreamModel: draftShowUpstreamModel,
          });
          showSaveFeedback('已保存');
        } catch {
          showSaveFeedback('保存失败');
        }
      },
    });

    // 插件自动更新策略切换后立即保存至后端
    const autoUpdateSelect = CustomSelect({
      modelValue: 'manual',
      icon: 'refresh',
      options: AUTO_UPDATE_OPTIONS,
      onUpdateModelValue: async (val) => {
        draftAutoUpdatePlugin = val === 'auto';
        if (latestSettings) {
          lastSyncedSettingsSig = settingsSig({
            ...latestSettings,
            autoUpdatePlugin: draftAutoUpdatePlugin,
          });
        }
        showCloudFeedback('保存中…', 0);
        try {
          await saveSettingsPatch({
            autoUpdatePlugin: draftAutoUpdatePlugin,
          });
          showCloudFeedback('已保存', 1800);
        } catch {
          showCloudFeedback('保存失败', 2500);
        }
      },
    });

    const tokenBudgetInput = CustomNumberInput({
      modelValue: draftTokens,
      min: 100000,
      max: 10000000000,
      step: 1000000,
      onUpdateModelValue: (val) => {
        draftTokens = val;
      },
    });

    const costBudgetInput = CustomNumberInput({
      modelValue: draftCost,
      min: 1,
      max: 100000,
      step: 5,
      onUpdateModelValue: (val) => {
        draftCost = val;
      },
    });

    const saveBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-primary',
        onClick: async () => {
          showSaveFeedback('保存中…');
          try {
            await saveSettingsPatch({
              weeklyLimitMode: draftMode,
              weeklyTokenBudget: draftTokens,
              weeklyCostBudget: draftCost,
              showUpstreamModel: draftShowUpstreamModel,
              autoUpdatePlugin: draftAutoUpdatePlugin,
            });
            showSaveFeedback('已保存');
          } catch {
            showSaveFeedback('保存失败');
          }
        },
      },
      [createSvgIcon('check', { size: 13 }), h('span', { text: '保存设置' })]
    );

    const budgetPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '常规设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '模型名称格式' }),
        stepModelSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '周额度基准' }),
        modeSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周 Token 上限' }),
          tokenBudgetInput.el,
        ]),
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周费用上限 ($)' }),
          costBudgetInput.el,
        ]),
      ]),
      h('div', { style: 'display: flex; justify-content: flex-end;' }, [saveBtn]),
    ]);

    // --- 面板 2：版本更新面板 ---
    const pricingCountVal = h('strong', { className: 'cell-value', text: '—' });
    const pricingSyncSub = h('span', { className: 'cell-sub', text: '读取中…' });
    const versionVal = h('strong', { className: 'cell-value', text: 'v1.4.1' });
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
                const curVer = cs?.currentPluginVersion || '1.4.1';
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
        h('span', { className: 'form-label', text: '自动更新' }),
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

    const rootEl = h('div', { className: 'view-pane' }, [budgetPanel, cloudPanel]);

    let latestSettings = null;
    let latestCloudStatus = null;
    let isDirty = false;

    /** 生成设置项签名，避免轮询返回相同配置时覆盖用户正在编辑的草稿值 */
    function settingsSig(s) {
      if (!s) return '';
      return `${s.weeklyLimitMode}:${s.weeklyTokenBudget}:${s.weeklyCostBudget}:${Boolean(s.showUpstreamModel)}:${Boolean(s.autoUpdatePlugin)}`;
    }

    /** 将后端返回的最新设置同步至表单控件 */
    function renderSettings(settings) {
      if (!settings) return;
      const nextSig = settingsSig(settings);
      if (nextSig === lastSyncedSettingsSig) return;
      lastSyncedSettingsSig = nextSig;
      draftMode =
        settings.weeklyLimitMode === 'custom_tokens' ||
        settings.weeklyLimitMode === 'custom_cost'
          ? settings.weeklyLimitMode
          : 'official';
      draftTokens = Number(settings.weeklyTokenBudget || 150000000);
      draftCost = Number(settings.weeklyCostBudget || 100);
      draftShowUpstreamModel = Boolean(settings.showUpstreamModel);
      draftAutoUpdatePlugin = Boolean(settings.autoUpdatePlugin);
      modeSelect.setValue(draftMode);
      stepModelSelect.setValue(draftShowUpstreamModel ? 'upstream' : 'short');
      autoUpdateSelect.setValue(draftAutoUpdatePlugin ? 'auto' : 'manual');
      tokenBudgetInput.setValue(draftTokens);
      costBudgetInput.setValue(draftCost);
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

      const curVer = cs.currentPluginVersion || '1.4.1';
      const latVer = cs.latestPluginVersion || curVer;
      const modeTag = cs.installMode === 'git' ? 'Git' : 'ZIP';
      patchText(versionVal, `v${curVer}`);
      if (cs.updateAvailable) {
        patchText(versionSub, `可升级至 v${latVer} (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': true });
        patchText(updatePluginBtnText, `升级至 v${latVer}`);
        patchClasses(updatePluginBtn, { 'btn-primary': true, 'btn-secondary': false });
      } else {
        patchText(versionSub, `已是最新 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      }

      if (!cloudTimer && (cs.lastUpdateError || (cs.lastUpdateResult?.ok === false && cs.lastUpdateResult?.message))) {
        showCloudFeedback(cs.lastUpdateError || cs.lastUpdateResult.message, 5500);
      }
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({
        settings: st.telemetry?.settings,
        cloudStatus: st.telemetry?.cloudStatus,
      }),
      (slice) => {
        latestSettings = slice.settings;
        latestCloudStatus = slice.cloudStatus;
        if (uiStore.getState().activeView !== 'settings') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderSettings(slice.settings);
        renderCloudStatus(slice.cloudStatus);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings' && isDirty) {
          isDirty = false;
          if (latestSettings) renderSettings(latestSettings);
          if (latestCloudStatus) renderCloudStatus(latestCloudStatus);
        }
      }
    );

    onCleanup(() => {
      if (statusTimer) clearTimeout(statusTimer);
      if (cloudTimer) clearTimeout(cloudTimer);
      unsub();
      unsubView();
      modeSelect.destroy();
      stepModelSelect.destroy();
      autoUpdateSelect.destroy();
      tokenBudgetInput.destroy();
      costBudgetInput.destroy();
    });

    return {
      el: rootEl,
      refs: { modeSelect, stepModelSelect, autoUpdateSelect, tokenBudgetInput, costBudgetInput },
    };
  },
});
