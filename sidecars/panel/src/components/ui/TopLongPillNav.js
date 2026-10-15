/**
 * @fileoverview Top Long-Pill Navigation Bar (顶部唯一长药丸功能分割栏).
 * Splits the application into focused single-viewport views and animates
 * the active glider using GPU-accelerated translate3d.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchStyleVar, patchText } from '../../core/domPatch.js';
import { createSvgIcon } from '../../icons/SvgIcon.js';

export const TopLongPillNav = defineComponent({
  name: 'TopLongPillNav',
  setup({ getProps, emit }) {
    const glider = h('div', { className: 'pill-glider', 'aria-hidden': 'true' });
    const navEl = h(
      'nav',
      {
        className: 'long-pill-nav',
        role: 'tablist',
        'aria-label': '主功能视图分割导航',
      },
      [glider]
    );

    const tabButtons = new Map();

    function selectValue(nextVal) {
      const current = getProps().modelValue;
      if (nextVal !== current) {
        emit('update:modelValue', nextVal);
      }
    }

    function syncTabs() {
      const { items = [], modelValue } = getProps();
      patchStyleVar(navEl, '--pill-count', Math.max(1, items.length));

      let activeIdx = 0;
      items.forEach((item, index) => {
        if (item.value === modelValue) {
          activeIdx = index;
        }
        let entry = tabButtons.get(item.value);
        if (!entry) {
          const iconEl = item.icon ? createSvgIcon(item.icon, { size: 14 }) : null;
          const labelEl = h('span', { className: 'pill-tab-label', text: item.label });
          const badgeEl = h('span', { className: 'pill-tab-badge', hidden: true });
          const btn = h(
            'button',
            {
              type: 'button',
              role: 'tab',
              className: 'pill-tab',
              dataset: { pillValue: item.value },
              onClick: () => selectValue(item.value),
              onKeydown: (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const curItems = getProps().items || [];
                  const delta = e.key === 'ArrowRight' ? 1 : -1;
                  const nextIndex = (index + delta + curItems.length) % curItems.length;
                  const target = curItems[nextIndex];
                  if (target) {
                    selectValue(target.value);
                    tabButtons.get(target.value)?.btn?.focus();
                  }
                }
              },
            },
            [iconEl, labelEl, badgeEl]
          );
          entry = { btn, labelEl, badgeEl };
          tabButtons.set(item.value, entry);
          navEl.appendChild(btn);
        }

        patchText(entry.labelEl, item.label);
        if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
          patchAttr(entry.badgeEl, 'hidden', false);
          patchText(entry.badgeEl, `(${item.badge})`);
        } else {
          patchAttr(entry.badgeEl, 'hidden', true);
        }

        const isActive = item.value === modelValue;
        patchClasses(entry.btn, { 'is-active': isActive });
        patchAttr(entry.btn, 'aria-selected', isActive ? 'true' : 'false');
        patchAttr(entry.btn, 'tabindex', isActive ? '0' : '-1');
      });

      patchStyleVar(navEl, '--active-index', activeIdx);
    }

    syncTabs();

    return {
      el: navEl,
      refs: { glider, tabButtons },
      onPropsChange: syncTabs,
      getValue: () => getProps().modelValue,
    };
  },
});
