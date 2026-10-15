/**
 * @fileoverview Micro-bezel (2px radius) SegmentedControl switcher
 * for time-range filtering, context limit selection, and sub-table switching.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchKeyedList, patchText } from '../../core/domPatch.js';

export const SegmentedControl = defineComponent({
  name: 'SegmentedControl',
  setup({ getProps, emit }) {
    const rootEl = h('div', {
      className: 'segmented',
      role: 'group',
      'aria-label': getProps().ariaLabel || '分段切换器',
    });

    function syncSegments() {
      const { options = [], modelValue } = getProps();
      patchKeyedList(rootEl, options, {
        keyFn: (opt) => opt.value,
        sigFn: (opt) => `${opt.value}::${opt.label}::${opt.value === modelValue}`,
        createRow: (opt) => {
          const btn = h('button', {
            type: 'button',
            className: 'seg-btn',
            onClick: (e) => {
              e.stopPropagation();
              if (getProps().modelValue !== opt.value) {
                emit('update:modelValue', opt.value);
              }
            },
          });
          return { el: btn, refs: {} };
        },
        updateRow: (_refs, opt, _idx, el) => {
          const active = opt.value === modelValue;
          patchText(el, opt.label);
          patchClasses(el, { 'is-active': active });
          patchAttr(el, 'aria-pressed', active ? 'true' : 'false');
          patchAttr(el, 'data-seg-value', opt.value);
        },
      });
    }

    syncSegments();

    return {
      el: rootEl,
      refs: {},
      onPropsChange: syncSegments,
      getValue: () => getProps().modelValue,
    };
  },
});
