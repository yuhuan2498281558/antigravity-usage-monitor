/**
 * @fileoverview Bespoke CustomDateTimePicker calendar matrix and hour/minute stepper.
 * Replaces native <input type="datetime-local"> and emits Unix epoch ms.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchClasses, patchKeyedList, patchText } from '../../core/domPatch.js';
import { formatCompactDateTime } from '../../core/formatters.js';
import { createSvgIcon } from '../../icons/SvgIcon.js';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function buildCalendarDays(viewYear, viewMonth, selectedDate) {
  const firstDay = new Date(viewYear, viewMonth, 1);
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(viewYear, viewMonth, 1 - startOffset + i);
    const y = cellDate.getFullYear();
    const m = cellDate.getMonth();
    const d = cellDate.getDate();
    const isCurrentMonth = m === viewMonth;
    const isSelected =
      selectedDate &&
      selectedDate.getFullYear() === y &&
      selectedDate.getMonth() === m &&
      selectedDate.getDate() === d;

    cells.push({
      key: `${y}-${m}-${d}`,
      year: y,
      month: m,
      day: d,
      isCurrentMonth,
      isSelected,
    });
  }
  return cells;
}

export const CustomDateTimePicker = defineComponent({
  name: 'CustomDateTimePicker',
  setup({ getProps, emit, onCleanup }) {
    let isOpen = false;
    const initialDate = new Date(getProps().modelValue || Date.now());
    let viewYear = initialDate.getFullYear();
    let viewMonth = initialDate.getMonth();

    const triggerText = h('span', { className: 'text-mono' });
    const triggerBtn = h(
      'button',
      {
        type: 'button',
        className: 'dt-trigger',
        'aria-expanded': 'false',
        onClick: (e) => {
          e.stopPropagation();
          togglePopover(!isOpen);
        },
      },
      [createSvgIcon('calendar', { size: 13 }), triggerText]
    );

    const monthTitle = h('span', { className: 'text-mono' });
    const prevMonthBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '上个月',
        onClick: (e) => {
          e.stopPropagation();
          viewMonth -= 1;
          if (viewMonth < 0) {
            viewMonth = 11;
            viewYear -= 1;
          }
          renderCalendar();
        },
      },
      [createSvgIcon('chevron-left', { size: 12 })]
    );

    const nextMonthBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '下个月',
        onClick: (e) => {
          e.stopPropagation();
          viewMonth += 1;
          if (viewMonth > 11) {
            viewMonth = 0;
            viewYear += 1;
          }
          renderCalendar();
        },
      },
      [createSvgIcon('chevron-right', { size: 12 })]
    );

    const navBar = h('div', { className: 'dt-nav' }, [prevMonthBtn, monthTitle, nextMonthBtn]);

    const weekdayRow = h(
      'div',
      { className: 'dt-weekdays' },
      WEEKDAYS.map((w) => h('span', { className: 'dt-weekday', text: w }))
    );

    const daysGrid = h('div', { className: 'dt-days' });

    const hourValSpan = h('strong', { className: 'text-mono', text: '00' });
    const minValSpan = h('strong', { className: 'text-mono', text: '00' });

    function adjustTime(part, delta) {
      const cur = new Date(getProps().modelValue || Date.now());
      if (part === 'hour') {
        cur.setHours((cur.getHours() + delta + 24) % 24);
      } else {
        cur.setMinutes((cur.getMinutes() + delta + 60) % 60);
      }
      const nextMs = cur.getTime();
      viewYear = cur.getFullYear();
      viewMonth = cur.getMonth();
      emit('update:modelValue', nextMs);
    }

    const timeRow = h('div', { className: 'dt-time-row' }, [
      h('span', { className: 'text-muted', text: '时 / 分' }),
      h('div', { className: 'dt-time-controls' }, [
        h('div', { className: 'dt-mini-step' }, [
          h('button', {
            type: 'button',
            className: 'dt-mini-btn',
            text: '-',
            onClick: (e) => {
              e.stopPropagation();
              adjustTime('hour', -1);
            },
          }),
          hourValSpan,
          h('button', {
            type: 'button',
            className: 'dt-mini-btn',
            text: '+',
            onClick: (e) => {
              e.stopPropagation();
              adjustTime('hour', 1);
            },
          }),
        ]),
        h('span', { text: ':' }),
        h('div', { className: 'dt-mini-step' }, [
          h('button', {
            type: 'button',
            className: 'dt-mini-btn',
            text: '-',
            onClick: (e) => {
              e.stopPropagation();
              adjustTime('minute', -5);
            },
          }),
          minValSpan,
          h('button', {
            type: 'button',
            className: 'dt-mini-btn',
            text: '+',
            onClick: (e) => {
              e.stopPropagation();
              adjustTime('minute', 5);
            },
          }),
        ]),
      ]),
    ]);

    const popoverEl = h(
      'div',
      {
        className: 'dt-popover',
        hidden: true,
      },
      [navBar, weekdayRow, daysGrid, timeRow]
    );

    const rootEl = h('div', { className: 'datetime-picker' }, [triggerBtn, popoverEl]);

    function togglePopover(nextOpen) {
      isOpen = Boolean(nextOpen);
      patchAttr(popoverEl, 'hidden', !isOpen);
      patchAttr(triggerBtn, 'aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        const cur = new Date(getProps().modelValue || Date.now());
        viewYear = cur.getFullYear();
        viewMonth = cur.getMonth();
        renderCalendar();
      }
    }

    function selectDay(cell) {
      const cur = new Date(getProps().modelValue || Date.now());
      cur.setFullYear(cell.year, cell.month, cell.day);
      const nextMs = cur.getTime();
      viewYear = cell.year;
      viewMonth = cell.month;
      emit('update:modelValue', nextMs);
    }

    function renderCalendar() {
      const cur = new Date(getProps().modelValue || Date.now());
      const pad = (n) => String(n).padStart(2, '0');
      patchText(monthTitle, `${viewYear}-${pad(viewMonth + 1)}`);
      patchText(hourValSpan, pad(cur.getHours()));
      patchText(minValSpan, pad(cur.getMinutes()));

      const cells = buildCalendarDays(viewYear, viewMonth, cur);
      patchKeyedList(daysGrid, cells, {
        keyFn: (c) => c.key,
        sigFn: (c) => `${c.key}:${c.isCurrentMonth}:${c.isSelected}`,
        createRow: (cell) => {
          const btn = h('button', {
            type: 'button',
            className: 'dt-day',
            onClick: (e) => {
              e.stopPropagation();
              selectDay(cell);
            },
          });
          return { el: btn, refs: {} };
        },
        updateRow: (_refs, cell, _idx, el) => {
          patchText(el, cell.day);
          patchClasses(el, {
            'is-selected': cell.isSelected,
            'is-outside': !cell.isCurrentMonth,
          });
          patchAttr(el, 'data-date-key', cell.key);
        },
      });
    }

    function syncDisplay() {
      const ms = Number(getProps().modelValue || Date.now());
      patchText(triggerText, formatCompactDateTime(ms));
      if (isOpen) {
        renderCalendar();
      }
    }

    const handleDocClick = (e) => {
      if (isOpen && !rootEl.contains(e.target)) {
        togglePopover(false);
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('click', handleDocClick);
      onCleanup(() => document.removeEventListener('click', handleDocClick));
    }

    syncDisplay();

    return {
      el: rootEl,
      refs: { triggerBtn, triggerText, popoverEl, daysGrid, hourValSpan, minValSpan },
      onPropsChange: syncDisplay,
      getValue: () => Number(getProps().modelValue || 0),
      methods: {
        open: () => togglePopover(true),
        close: () => togglePopover(false),
        selectDayByOffset: (daysDelta) => {
          const cur = new Date(getProps().modelValue || Date.now());
          cur.setDate(cur.getDate() + daysDelta);
          emit('update:modelValue', cur.getTime());
        },
      },
    };
  },
});
