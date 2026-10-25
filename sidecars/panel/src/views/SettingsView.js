/**
 * @fileoverview View 4: SettingsView (系统设置视图).
 * Replaces all native form controls (<select>, <input type="number">) with
 * bespoke CustomSelect and CustomNumberInput components.
 */

import { defineComponent } from '../core/component.js';
import { h, patchText } from '../core/domPatch.js';
import { createSvgIcon } from '../icons/SvgIcon.js';
import {
  saveSettingsPatch,
  telemetryStore,
} from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { CustomNumberInput } from '../components/ui/CustomNumberInput.js';
import { CustomSelect } from '../components/ui/CustomSelect.js';

const WEEKLY_MODE_OPTIONS = [
  { value: 'official', label: '官方云端周限额 (与 Models & Usage 同步)' },
  { value: 'custom_tokens', label: '按自定义每周 Token 预算计算百分比' },
  { value: 'custom_cost', label: '按自定义每周美元 ($) 预算计算百分比' },
];

const STEP_MODEL_DISPLAY_OPTIONS = [
  { value: 'short', label: '本地简称 (如 argon-4-high / flash-3.8-high)' },
  { value: 'upstream', label: '上游真实模型名 (如 gemini-4-argon / gemini-3.8-flash-n)' },
];

export const SettingsView = defineComponent({
  name: 'SettingsView',
  setup({ onCleanup }) {
    let draftMode = 'official';
    let draftTokens = 150000000;
    let draftCost = 100;
    let draftShowUpstreamModel = false;
    let statusTimer = null;
    let lastSyncedSettingsSig = '';

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    function showSaveFeedback(text) {
      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }
      patchText(saveStatusText, text);
      if (text === '设置已生效') {
        statusTimer = setTimeout(() => {
          statusTimer = null;
          patchText(saveStatusText, '');
        }, 1500);
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
        showSaveFeedback('正在异步保存...');
        await saveSettingsPatch({
          showUpstreamModel: draftShowUpstreamModel,
        });
        showSaveFeedback('设置已生效');
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
          showSaveFeedback('正在异步保存...');
          await saveSettingsPatch({
            weeklyLimitMode: draftMode,
            weeklyTokenBudget: draftTokens,
            weeklyCostBudget: draftCost,
            showUpstreamModel: draftShowUpstreamModel,
          });
          showSaveFeedback('设置已生效');
        },
      },
      [createSvgIcon('check', { size: 13 }), h('span', { text: '保存参数设置' })]
    );

    const budgetPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '监控口径与周限额基准设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '步骤明细模型名称显示' }),
        stepModelSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '每周进度条统计维度' }),
        modeSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周 Token 预算基准 (步进 1M)' }),
          tokenBudgetInput.el,
        ]),
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周费用预算基准 (USD $, 步进 $5)' }),
          costBudgetInput.el,
        ]),
      ]),
      h('div', { style: 'display: flex; justify-content: flex-end;' }, [saveBtn]),
    ]);

    const rootEl = h('div', { className: 'view-pane' }, [budgetPanel]);

    let latestSettings = null;
    let isDirty = false;

    function settingsSig(s) {
      if (!s) return '';
      return `${s.weeklyLimitMode}:${s.weeklyTokenBudget}:${s.weeklyCostBudget}:${Boolean(s.showUpstreamModel)}`;
    }

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
      modeSelect.setValue(draftMode);
      stepModelSelect.setValue(draftShowUpstreamModel ? 'upstream' : 'short');
      tokenBudgetInput.setValue(draftTokens);
      costBudgetInput.setValue(draftCost);
    }

    const unsub = telemetryStore.subscribe(
      (st) => st.telemetry?.settings,
      (settings) => {
        latestSettings = settings;
        if (uiStore.getState().activeView !== 'settings') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderSettings(settings);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings' && isDirty) {
          isDirty = false;
          if (latestSettings) {
            renderSettings(latestSettings);
          }
        }
      }
    );

    onCleanup(() => {
      if (statusTimer) clearTimeout(statusTimer);
      unsub();
      unsubView();
      modeSelect.destroy();
      stepModelSelect.destroy();
      tokenBudgetInput.destroy();
      costBudgetInput.destroy();
    });

    return {
      el: rootEl,
      refs: { modeSelect, stepModelSelect, tokenBudgetInput, costBudgetInput },
    };
  },
});
