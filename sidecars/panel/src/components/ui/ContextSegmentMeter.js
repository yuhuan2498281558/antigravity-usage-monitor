/**
 * @fileoverview 10-channel segmented context window progress bar updated via
 * CSS custom variables against the current model's automatic compaction baseline,
 * dynamically ordered from largest to smallest segment.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchStyleVar } from '../../core/domPatch.js';

const SEGMENT_DEFS = [
  { key: 'assistant', cls: 'seg-assistant', getVal: (c) => Number(c.assistantTokens || 0) },
  { key: 'toolResults', cls: 'seg-tool-results', getVal: (c) => Number(c.toolResultsTokens || 0) },
  {
    key: 'userInput',
    cls: 'seg-user-input',
    getVal: (c) => Number(c.userInputTokens ?? c.messagesTokens ?? 0),
  },
  { key: 'subagent', cls: 'seg-subagent-msg', getVal: (c) => Number(c.subagentTokens || 0) },
  { key: 'checkpoint', cls: 'seg-checkpoint', getVal: (c) => Number(c.checkpointTokens || 0) },
  { key: 'systemPrompt', cls: 'seg-system-prompt', getVal: (c) => Number(c.systemPromptTokens || 0) },
  { key: 'systemTools', cls: 'seg-system-tools', getVal: (c) => Number(c.systemToolsTokens || 0) },
  { key: 'mcpTools', cls: 'seg-mcp-tools', getVal: (c) => Number(c.mcpToolsTokens || 0) },
  { key: 'skills', cls: 'seg-skills', getVal: (c) => Number(c.skillsTokens || 0) },
  { key: 'userRules', cls: 'seg-user-rules', getVal: (c) => Number(c.userRulesTokens || 0) },
];

export const ContextSegmentMeter = defineComponent({
  name: 'ContextSegmentMeter',
  setup({ getProps }) {
    const segments = SEGMENT_DEFS.map((def, idx) => ({
      ...def,
      defaultOrder: idx,
      el: h('div', { className: `progress-seg ${def.cls}` }),
    }));

    const trackEl = h(
      'div',
      {
        className: 'progress-track',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
      },
      segments.map((s) => s.el)
    );

    let lastOrderSig = segments.map((s) => s.key).join(',');

    function syncMeter() {
      const ctx = getProps().context || {};
      const limit = Math.max(1, Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000));
      const scored = segments.map((seg) => {
        const val = seg.getVal(ctx);
        const pct = Math.min(100, (val / limit) * 100);
        patchStyleVar(seg.el, '--seg-w', `${pct.toFixed(2)}%`);
        return { seg, val };
      });

      scored.sort((a, b) => b.val - a.val || a.seg.defaultOrder - b.seg.defaultOrder);
      const nextOrderSig = scored.map((x) => x.seg.key).join(',');
      if (nextOrderSig !== lastOrderSig) {
        lastOrderSig = nextOrderSig;
        for (const { seg } of scored) {
          trackEl.appendChild(seg.el);
        }
      }

      patchAttr(trackEl, 'aria-valuenow', Math.round(ctx.compactionUsedPct ?? ctx.usedPct ?? 0));
    }

    syncMeter();

    return {
      el: trackEl,
      refs: { segments },
      onPropsChange: syncMeter,
    };
  },
});
