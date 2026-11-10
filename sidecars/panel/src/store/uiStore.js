/**
 * @fileoverview UI navigation and view state store.
 */

import { createReactiveStore } from '../core/reactive.js';

export const VIEW_TABS = Object.freeze([
  { value: 'overview', label: '实时监控', icon: 'pulse' },
  { value: 'consumption', label: '用量统计', icon: 'chart-bar' },
  { value: 'steps', label: '调用明细', icon: 'table' },
  { value: 'settings', label: '偏好设置', icon: 'sliders' },
]);

export const uiStore = createReactiveStore({
  activeView: 'overview',
  stepsSubTab: 'steps', // 'steps' | 'models'
  selectedAgentScope: 'all', // 'all' | 'main' | <subagent cascadeId>
  ctxInspectorAgentId: 'auto', // 'auto' | 'main' | <subagent cascadeId>
});
