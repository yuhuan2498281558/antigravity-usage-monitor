/**
 * @fileoverview Bespoke CustomSelect dropdown component replacing native <select> / <option>.
 * Supports incremental option patching while open without losing focus or closing the menu.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchKeyedList, patchText } from '../../core/domPatch.js';
import { createSvgIcon, patchSvgIcon } from '../../icons/SvgIcon.js';

export const CustomSelect = defineComponent({
  name: 'CustomSelect',
  setup({ getProps, emit, onCleanup }) {
    let isOpen = false;
    let focusedIndex = -1;

    const leadIcon = createSvgIcon(getProps().icon || 'bolt', { size: 13 });
    const triggerLabel = h('span', { className: 'select-label' });
    const chevronIcon = createSvgIcon('chevron-down', { size: 13 });

    const triggerBtn = h(
      'button',
      {
        type: 'button',
        className: 'select-trigger',
        role: 'combobox',
        'aria-expanded': 'false',
        'aria-haspopup': 'listbox',
        onClick: (e) => {
          e.stopPropagation();
          toggleOpen(!isOpen);
        },
        onKeydown: handleKeydown,
      },
      [leadIcon, triggerLabel, chevronIcon]
    );

    const menuEl = h('div', {
      className: 'select-menu',
      role: 'listbox',
      hidden: true,
    });

    const rootEl = h('div', { className: 'custom-select' }, [triggerBtn, menuEl]);

    function toggleOpen(nextOpen) {
      isOpen = Boolean(nextOpen);
      patchClasses(rootEl, { 'is-open': isOpen });
      patchAttr(triggerBtn, 'aria-expanded', isOpen ? 'true' : 'false');
      patchAttr(menuEl, 'hidden', !isOpen);
      patchSvgIcon(chevronIcon, isOpen ? 'chevron-up' : 'chevron-down');
      if (isOpen) {
        const opts = getProps().options || [];
        const currentVal = getProps().modelValue;
        focusedIndex = Math.max(
          0,
          opts.findIndex((o) => o.value === currentVal)
        );
        renderMenuOptions();
      }
    }

    function chooseOption(option) {
      if (!option) return;
      const prevVal = getProps().modelValue;
      toggleOpen(false);
      if (option.value !== prevVal) {
        emit('update:modelValue', option.value);
      }
    }

    function handleKeydown(e) {
      const opts = getProps().options || [];
      if (!opts.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          toggleOpen(true);
        } else {
          focusedIndex = (focusedIndex + 1) % opts.length;
          renderMenuOptions();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          toggleOpen(true);
        } else {
          focusedIndex = (focusedIndex - 1 + opts.length) % opts.length;
          renderMenuOptions();
        }
      } else if (e.key === 'Enter' && isOpen) {
        e.preventDefault();
        const target = opts[focusedIndex];
        if (target) chooseOption(target);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        toggleOpen(false);
      }
    }

    function renderMenuOptions() {
      const { options = [], modelValue } = getProps();
      patchKeyedList(menuEl, options, {
        keyFn: (opt) => opt.value,
        sigFn: (opt, idx) =>
          `${opt.value}::${opt.label}::${opt.meta || ''}::${opt.value === modelValue}::${idx === focusedIndex}`,
        createRow: (opt) => {
          const textSpan = h('span', { className: 'select-option-text' });
          const metaSpan = h('span', { className: 'text-muted' });
          const checkIcon = createSvgIcon('check', { size: 12 });
          const btn = h(
            'button',
            {
              type: 'button',
              role: 'option',
              className: 'select-option',
              onClick: (e) => {
                e.stopPropagation();
                const latestOpt = (getProps().options || []).find((o) => o.value === opt.value) || opt;
                chooseOption(latestOpt);
              },
            },
            [textSpan, metaSpan, checkIcon]
          );
          return { el: btn, refs: { textSpan, metaSpan, checkIcon } };
        },
        updateRow: (refs, opt, idx, el) => {
          const selected = opt.value === modelValue;
          const focused = idx === focusedIndex;
          patchText(refs.textSpan, opt.label);
          patchText(refs.metaSpan, opt.meta || '');
          patchAttr(refs.metaSpan, 'hidden', !opt.meta);
          patchAttr(refs.checkIcon, 'hidden', !selected);
          patchClasses(el, {
            'is-selected': selected,
            'is-focused': focused,
          });
          patchAttr(el, 'aria-selected', selected ? 'true' : 'false');
          patchAttr(el, 'data-value', opt.value);
        },
      });
    }

    function syncTriggerAndMenu() {
      const { options = [], modelValue, placeholder = '请选择', icon = 'bolt' } = getProps();
      patchSvgIcon(leadIcon, icon);
      const selectedOpt = options.find((o) => o.value === modelValue) || options[0];
      patchText(triggerLabel, selectedOpt ? selectedOpt.label : placeholder);
      if (isOpen) {
        renderMenuOptions();
      }
    }

    const handleDocClick = (e) => {
      if (isOpen && !rootEl.contains(e.target)) {
        toggleOpen(false);
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('click', handleDocClick);
      onCleanup(() => document.removeEventListener('click', handleDocClick));
    }

    syncTriggerAndMenu();

    return {
      el: rootEl,
      refs: { triggerBtn, triggerLabel, menuEl },
      onPropsChange: syncTriggerAndMenu,
      getValue: () => getProps().modelValue,
      methods: {
        open: () => toggleOpen(true),
        close: () => toggleOpen(false),
        selectByValue: (val) => {
          const found = (getProps().options || []).find((o) => o.value === val);
          if (found) chooseOption(found);
        },
      },
    };
  },
});
