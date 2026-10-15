/**
 * @fileoverview Bespoke custom scrollbar component (零原生滚动条).
 * Hides native OS scrollbars completely and renders a precision 4px floating
 * rail + GPU-translated thumb with drag, track-jump, and modelValue ratio emit.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchClasses, patchStyleVar } from '../../core/domPatch.js';

export const CustomScrollbar = defineComponent({
  name: 'CustomScrollbar',
  setup({ getProps, emit, onCleanup }) {
    const contentEl = getProps().contentEl || h('div');
    contentEl.classList.add('custom-scroll-content');

    const thumbEl = h('div', { className: 'scrollbar-thumb' });
    const railEl = h(
      'div',
      {
        className: 'scrollbar-rail is-inactive',
        'aria-hidden': 'true',
      },
      [thumbEl]
    );

    const hostEl = h(
      'div',
      {
        className: `custom-scroll-host ${getProps().className || ''}`.trim(),
      },
      [contentEl, railEl]
    );

    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollTop = 0;

    function syncThumb() {
      const scrollHeight = Number(contentEl.scrollHeight || 0);
      const clientHeight = Number(contentEl.clientHeight || 0);
      const scrollTop = Number(contentEl.scrollTop || 0);
      const overflow = scrollHeight - clientHeight;

      if (overflow <= 1 || clientHeight <= 0) {
        patchClasses(railEl, { 'is-inactive': true });
        patchStyleVar(thumbEl, '--thumb-h', '0px');
        patchStyleVar(thumbEl, '--thumb-y', '0px');
        return;
      }

      patchClasses(railEl, { 'is-inactive': false });
      const railHeight = Math.max(24, clientHeight - 4);
      const thumbHeight = Math.max(24, Math.round((clientHeight / scrollHeight) * railHeight));
      const maxThumbTop = Math.max(0, railHeight - thumbHeight);
      const ratio = Math.max(0, Math.min(1, scrollTop / overflow));
      const thumbTop = Math.round(ratio * maxThumbTop);

      patchStyleVar(thumbEl, '--thumb-h', `${thumbHeight}px`);
      patchStyleVar(thumbEl, '--thumb-y', `${thumbTop}px`);
    }

    function onContentScroll() {
      syncThumb();
      const overflow = (contentEl.scrollHeight || 0) - (contentEl.clientHeight || 0);
      if (overflow > 1) {
        const ratio = +Math.max(0, Math.min(1, (contentEl.scrollTop || 0) / overflow)).toFixed(3);
        emit('update:modelValue', ratio);
      }
    }

    function onDocMouseMove(e) {
      if (!isDragging) return;
      const clientHeight = Number(contentEl.clientHeight || 0);
      const scrollHeight = Number(contentEl.scrollHeight || 0);
      const overflow = scrollHeight - clientHeight;
      if (overflow <= 1) return;

      const railHeight = Math.max(24, clientHeight - 4);
      const thumbHeight = Math.max(24, Math.round((clientHeight / scrollHeight) * railHeight));
      const maxThumbTop = Math.max(1, railHeight - thumbHeight);

      const deltaY = (e.clientY || 0) - dragStartY;
      const scrollDelta = (deltaY / maxThumbTop) * overflow;
      contentEl.scrollTop = Math.max(0, Math.min(overflow, dragStartScrollTop + scrollDelta));
      syncThumb();
    }

    function onDocMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      patchClasses(railEl, { 'is-dragging': false });
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousemove', onDocMouseMove);
        document.removeEventListener('mouseup', onDocMouseUp);
      }
    }

    thumbEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      dragStartY = e.clientY || 0;
      dragStartScrollTop = Number(contentEl.scrollTop || 0);
      patchClasses(railEl, { 'is-dragging': true });
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onDocMouseMove);
        document.addEventListener('mouseup', onDocMouseUp);
      }
    });

    railEl.addEventListener('mousedown', (e) => {
      if (e.target === thumbEl) return;
      e.preventDefault();
      const rect = railEl.getBoundingClientRect ? railEl.getBoundingClientRect() : null;
      if (!rect || rect.height <= 0) return;
      const clickOffset = (e.clientY || 0) - rect.top;
      const ratio = Math.max(0, Math.min(1, clickOffset / rect.height));
      const overflow = Math.max(0, (contentEl.scrollHeight || 0) - (contentEl.clientHeight || 0));
      contentEl.scrollTop = Math.round(ratio * overflow);
      syncThumb();
    });

    contentEl.addEventListener('scroll', onContentScroll);
    hostEl.addEventListener('mouseenter', syncThumb);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncThumb());
      resizeObserver.observe(hostEl);
      resizeObserver.observe(contentEl);
    }

    syncThumb();

    onCleanup(() => {
      onDocMouseUp();
      contentEl.removeEventListener('scroll', onContentScroll);
      hostEl.removeEventListener('mouseenter', syncThumb);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    return {
      el: hostEl,
      refs: { contentEl, railEl, thumbEl },
      onPropsChange: syncThumb,
      methods: {
        refresh() {
          syncThumb();
          if (typeof queueMicrotask === 'function') {
            queueMicrotask(syncThumb);
          }
        },
        scrollToRatio(ratio) {
          const r = Math.max(0, Math.min(1, Number(ratio || 0)));
          const overflow = Math.max(0, (contentEl.scrollHeight || 0) - (contentEl.clientHeight || 0));
          contentEl.scrollTop = Math.round(r * overflow);
          syncThumb();
        },
      },
    };
  },
});
