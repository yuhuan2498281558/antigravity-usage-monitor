/**
 * @fileoverview 6-channel segmented context window progress bar updated via
 * CSS custom variables against the current model's automatic compaction baseline.
 */

import { defineComponent } from '../../core/component.js';
import { h, patchAttr, patchStyleVar } from '../../core/domPatch.js';

export const ContextSegmentMeter = defineComponent({
  name: 'ContextSegmentMeter',
  setup({ getProps }) {
    const segMessages = h('div', { className: 'progress-seg seg-messages' });
    const segSystemTools = h('div', { className: 'progress-seg seg-system-tools' });
    const segMcpTools = h('div', { className: 'progress-seg seg-mcp-tools' });
    const segSkills = h('div', { className: 'progress-seg seg-skills' });
    const segSystemPrompt = h('div', { className: 'progress-seg seg-system-prompt' });
    const segUserRules = h('div', { className: 'progress-seg seg-user-rules' });

    const trackEl = h(
      'div',
      {
        className: 'progress-track',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
      },
      [segMessages, segSystemTools, segMcpTools, segSkills, segSystemPrompt, segUserRules]
    );

    function syncMeter() {
      const ctx = getProps().context || {};
      const limit = Math.max(1, Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000));
      const pctMessages = Math.min(100, ((ctx.messagesTokens || 0) / limit) * 100);
      const pctSystemTools = Math.min(100, ((ctx.systemToolsTokens || 0) / limit) * 100);
      const pctMcpTools = Math.min(100, ((ctx.mcpToolsTokens || 0) / limit) * 100);
      const pctSkills = Math.min(100, ((ctx.skillsTokens || 0) / limit) * 100);
      const pctSystemPrompt = Math.min(100, ((ctx.systemPromptTokens || 0) / limit) * 100);
      const pctUserRules = Math.min(100, ((ctx.userRulesTokens || 0) / limit) * 100);

      patchStyleVar(segMessages, '--seg-w', `${pctMessages.toFixed(2)}%`);
      patchStyleVar(segSystemTools, '--seg-w', `${pctSystemTools.toFixed(2)}%`);
      patchStyleVar(segMcpTools, '--seg-w', `${pctMcpTools.toFixed(2)}%`);
      patchStyleVar(segSkills, '--seg-w', `${pctSkills.toFixed(2)}%`);
      patchStyleVar(segSystemPrompt, '--seg-w', `${pctSystemPrompt.toFixed(2)}%`);
      patchStyleVar(segUserRules, '--seg-w', `${pctUserRules.toFixed(2)}%`);
      patchAttr(trackEl, 'aria-valuenow', Math.round(ctx.compactionUsedPct ?? ctx.usedPct ?? 0));
    }

    syncMeter();

    return {
      el: trackEl,
      refs: {
        segMessages,
        segSystemTools,
        segMcpTools,
        segSkills,
        segSystemPrompt,
        segUserRules,
      },
      onPropsChange: syncMeter,
    };
  },
});
