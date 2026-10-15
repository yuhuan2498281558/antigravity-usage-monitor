/**
 * @fileoverview UI navigation and view state store.
 */

import { createReactiveStore } from '../core/reactive.js';

export const VIEW_TABS = Object.freeze([
  { value: 'overview', label: '实时监控', icon: 'pulse' },
  { value: 'consumption', label: '消耗统计', icon: 'chart-bar' },
  { value: 'steps', label: '步骤明细', icon: 'table' },
  { value: 'settings', label: '系统设置', icon: 'sliders' },
]);

export const uiStore = createReactiveStore({
  activeView: 'overview',
  stepsSubTab: 'steps', // 'steps' | 'models'
  showAllPools: true,
  ctxBreakdownOpen: true,
});
