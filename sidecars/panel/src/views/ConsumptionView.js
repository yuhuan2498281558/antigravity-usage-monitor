/**
 * @fileoverview View 2: ConsumptionView (全景消耗统计视图).
 * Implements the 5-part analytics layout:
 * 1. 用量概览 (Total Tokens k/M/B, USD + CNY approx, Input/Output split, Cache Hit % + Saved Cost badge, 4-color bar)
 * 2. 历史趋势 (Pure SVG smooth cubic-bezier spline area chart with peak callout and 3 time anchors)
 * 3. 热门模型 (Per-model share badge, 4-segment bar, and Input/Cache/Output/Thinking breakdown)
 * 4. 数据来源 (SOURCES breakdown with 4-segment bar)
 * 5. 按月细分 (12-month stacked vertical bar chart with cost, stacked bars, and k/M/B totals)
 */

import { defineComponent } from '../core/component.js';
import {
  h,
  patchAttr,
  patchClasses,
  patchKeyedList,
  patchStyleVar,
  patchText,
} from '../core/domPatch.js';
import {
  formatCnyApprox,
  formatDateSpanBadge,
  formatTokensPrecise,
  formatUsd,
} from '../core/formatters.js';
import { createSvgIcon, SVG_NS } from '../icons/SvgIcon.js';
import { fetchTelemetry, telemetryStore } from '../store/telemetryStore.js';
import { uiStore } from '../store/uiStore.js';
import { CustomDateTimePicker } from '../components/ui/CustomDateTimePicker.js';
import { CustomScrollbar } from '../components/ui/CustomScrollbar.js';
import { SegmentedControl } from '../components/ui/SegmentedControl.js';

const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: '24h', label: '1天' },
  { value: '7d', label: '7天' },
  { value: '14d', label: '14天' },
  { value: '30d', label: '30天' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自定义' },
];

function createFourSegmentBar() {
  const segInput = h('div', { className: 'progress-seg seg-input' });
  const segCached = h('div', { className: 'progress-seg seg-cached' });
  const segOutput = h('div', { className: 'progress-seg seg-output' });
  const segThinking = h('div', { className: 'progress-seg seg-thinking' });
  const el = h('div', { className: 'progress-track cons-seg-bar' }, [
    segInput,
    segCached,
    segOutput,
    segThinking,
  ]);

  function update({ inputTokens = 0, cacheReadTokens = 0, responseTokens = 0, thinkingTokens = 0 }) {
    const total = Math.max(1, inputTokens + cacheReadTokens + responseTokens + thinkingTokens);
    patchStyleVar(segInput, '--seg-w', `${((inputTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segCached, '--seg-w', `${((cacheReadTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segOutput, '--seg-w', `${((responseTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segThinking, '--seg-w', `${((thinkingTokens / total) * 100).toFixed(2)}%`);
  }

  return { el, update };
}

function buildSmoothSplinePath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
    const cpx2 = p1.x - (p1.x - p0.x) * 0.45;
    d += ` C ${cpx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cpx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

function createTrendAreaChart() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 460 116');
  svg.setAttribute('class', 'trend-svg');
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', 'trend-area-grad');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', 'var(--ctx-cached)');
  stop1.setAttribute('stop-opacity', '0.36');

  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', 'var(--ctx-cached)');
  stop2.setAttribute('stop-opacity', '0.0');

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Subtle grid lines
  const gridGroup = document.createElementNS(SVG_NS, 'g');
  gridGroup.setAttribute('class', 'trend-grid');
  for (const y of [26, 62, 98]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '10');
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', '450');
    line.setAttribute('y2', String(y));
    gridGroup.appendChild(line);
  }
  for (const x of [118, 230, 342]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', '16');
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', '98');
    gridGroup.appendChild(line);
  }
  svg.appendChild(gridGroup);

  const areaPath = document.createElementNS(SVG_NS, 'path');
  areaPath.setAttribute('fill', 'url(#trend-area-grad)');
  svg.appendChild(areaPath);

  const linePath = document.createElementNS(SVG_NS, 'path');
  linePath.setAttribute('class', 'trend-line');
  linePath.setAttribute('fill', 'none');
  svg.appendChild(linePath);

  const peakDot = document.createElementNS(SVG_NS, 'circle');
  peakDot.setAttribute('r', '3');
  peakDot.setAttribute('class', 'trend-peak-dot');
  svg.appendChild(peakDot);

  const peakPill = h('span', { className: 'trend-peak-pill text-mono', text: '0' });
  const chartWrap = h('div', { className: 'trend-chart-wrap' }, [peakPill, svg]);

  let lastLineD = '';

  function update(series = []) {
    const slots = series.length >= 2 ? series : [
      { label: '00:00', tokens: 0 },
      { label: '06:00', tokens: 0 },
      { label: '12:00', tokens: 0 },
    ];
    let maxTokens = 0;
    let peakIdx = 0;
    for (let i = 0; i < slots.length; i++) {
      const t = Number(slots[i].tokens || 0);
      if (t >= maxTokens) {
        maxTokens = t;
        peakIdx = i;
      }
    }

    const leftX = 12;
    const rightX = 448;
    const topY = 26;
    const bottomY = 98;
    const spanX = rightX - leftX;
    const spanY = bottomY - topY;
    const denom = Math.max(1, maxTokens);

    const pts = slots.map((s, idx) => {
      const x = leftX + (idx / Math.max(1, slots.length - 1)) * spanX;
      const ratio = maxTokens > 0 ? Number(s.tokens || 0) / denom : 0;
      const y = bottomY - ratio * spanY;
      return { x, y };
    });

    const lineD = buildSmoothSplinePath(pts);
    if (lineD !== lastLineD) {
      lastLineD = lineD;
      const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${bottomY} L ${pts[0].x.toFixed(1)} ${bottomY} Z`;
      patchAttr(linePath, 'd', lineD);
      patchAttr(areaPath, 'd', areaD);
    }

    const peakPt = pts[peakIdx] || { x: 230, y: bottomY };
    patchAttr(peakDot, 'cx', peakPt.x.toFixed(1));
    patchAttr(peakDot, 'cy', peakPt.y.toFixed(1));

    patchText(peakPill, formatTokensPrecise(maxTokens));
    const pctLeft = Math.max(8, Math.min(92, (peakPt.x / 460) * 100));
    patchStyleVar(peakPill, '--peak-x', `${pctLeft.toFixed(1)}%`);
  }

  return { el: chartWrap, update };
}

export const ConsumptionView = defineComponent({
  name: 'ConsumptionView',
  setup({ onCleanup }) {
    // Default to 'today' if store is on initial 'all' or keep user's selection
    const timeFilterSwitch = SegmentedControl({
      ariaLabel: '消耗统计时间范围',
      modelValue: telemetryStore.getState().selectedTimeRange,
      options: TIME_RANGE_OPTIONS,
      onUpdateModelValue: (nextRange) => {
        telemetryStore.setState({ selectedTimeRange: nextRange });
        fetchTelemetry({ force: false });
      },
    });

    const startPicker = CustomDateTimePicker({
      modelValue: telemetryStore.getState().customStartMs,
      onUpdateModelValue: (ms) => {
        telemetryStore.setState({ customStartMs: ms });
      },
    });

    const endPicker = CustomDateTimePicker({
      modelValue: telemetryStore.getState().customEndMs,
      onUpdateModelValue: (ms) => {
        telemetryStore.setState({ customEndMs: ms });
      },
    });

    const applyCustomBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-primary',
        style: 'height: 26px; padding: 0 10px;',
        onClick: () => {
          telemetryStore.setState({ selectedTimeRange: 'custom' });
          fetchTelemetry({ force: true });
        },
      },
      [createSvgIcon('check', { size: 12 }), h('span', { text: '筛选' })]
    );

    const customRangeBar = h(
      'div',
      {
        style:
          'display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 8px; background: var(--surface-subtle); border: 1px solid var(--border-hairline); border-radius: var(--radius-xs);',
        hidden: true,
      },
      [
        startPicker.el,
        h('span', { className: 'text-muted', text: '至' }),
        endPicker.el,
        applyCustomBtn,
      ]
    );

    // --- Section 1: 用量概览 (Compact Integrated Overview) ---
    const dateSpanBadge = h('span', { className: 'cons-badge text-mono', text: '-- ~ --' });
    const heroTotalTokens = h('strong', { className: 'cons-hero-num text-mono', text: '0' });
    const heroTotalCalls = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '0 调用' });
    const heroCostUsd = h('strong', { className: 'cons-hero-cost text-mono', text: '$0.00' });
    const heroCostCny = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '≈ ¥0' });

    const cacheHitPctEl = h('strong', { className: 'cons-hero-cache text-mono', text: '0%' });
    const cacheTokensEl = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '命中 0' });

    const inputSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-input); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const inputMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const inputSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '直接输入 0 · 缓存读取 0' });

    const outputSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-output); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const outputMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const outputSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '内容生成 0 · 思考推理 0' });

    const overviewSegBar = createFourSegmentBar();

    const overviewPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header cons-overview-head' }, [
        h('span', { className: 'panel-title' }, [
          h('span', { text: '用量概览' }),
          dateSpanBadge,
        ]),
        timeFilterSwitch.el,
      ]),
      customRangeBar,
      h('div', { className: 'cons-box cons-unified-matrix' }, [
        h('div', { className: 'cons-split-3' }, [
          h('div', { className: 'cons-col' }, [
            h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '总 Token 数' }),
            h('div', { className: 'cons-baseline' }, [heroTotalTokens, heroTotalCalls]),
          ]),
          h('div', { className: 'cons-col is-bordered-col' }, [
            h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '预估费用' }),
            h('div', { className: 'cons-baseline' }, [heroCostUsd, heroCostCny]),
          ]),
          h('div', { className: 'cons-col is-bordered-col' }, [
            h('span', { className: 'legend-left', style: 'font-size: 11px;' }, [
              h('span', { className: 'dot-swatch seg-cached' }),
              h('span', { text: '缓存命中率' }),
            ]),
            h('div', { className: 'cons-baseline' }, [cacheHitPctEl, cacheTokensEl]),
          ]),
        ]),
        h('div', { className: 'cons-split-2 cons-matrix-bottom' }, [
          h('div', { className: 'cons-col' }, [
            h('div', { className: 'panel-header' }, [
              h('span', { className: 'legend-left' }, [
                h('span', { className: 'dot-swatch seg-input' }),
                h('span', { style: 'color: var(--text-primary); font-weight: 600; font-size: 11.5px;', text: '输入用量' }),
                inputMainTokens,
              ]),
              inputSharePct,
            ]),
            inputSubText,
          ]),
          h('div', { className: 'cons-col is-bordered-col' }, [
            h('div', { className: 'panel-header' }, [
              h('span', { className: 'legend-left' }, [
                h('span', { className: 'dot-swatch seg-output' }),
                h('span', { style: 'color: var(--text-primary); font-weight: 600; font-size: 11.5px;', text: '输出用量' }),
                outputMainTokens,
              ]),
              outputSharePct,
            ]),
            outputSubText,
          ]),
        ]),
      ]),
      overviewSegBar.el,
    ]);

    // --- Section 2: 历史趋势 (Historical Trend SVG Spline Area Chart) ---
    const trendRangeBadge = h('span', { className: 'cons-badge', text: '全部时间' });
    const trendChart = createTrendAreaChart();
    const anchorStartTime = h('span', { className: 'text-muted text-mono', text: '00:00' });
    const anchorStartVal = h('strong', { className: 'text-mono', text: '0' });
    const anchorMidTime = h('span', { className: 'text-muted text-mono', text: '06:00' });
    const anchorMidVal = h('strong', { className: 'text-mono', text: '0' });
    const anchorEndTime = h('span', { className: 'text-muted text-mono', text: '12:00' });
    const anchorEndVal = h('strong', { className: 'text-mono', text: '0' });

    const trendPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '历史趋势' }),
        trendRangeBadge,
      ]),
      trendChart.el,
      h('div', { className: 'trend-anchors' }, [
        h('div', { className: 'trend-anchor-col' }, [anchorStartTime, anchorStartVal]),
        h('div', { className: 'trend-anchor-col is-center' }, [anchorMidTime, anchorMidVal]),
        h('div', { className: 'trend-anchor-col is-end' }, [anchorEndTime, anchorEndVal]),
      ]),
    ]);

    // --- Section 3: 热门模型 (Popular Models Breakdown) ---
    const modelsListEl = h('div', { className: 'cons-item-list' });
    const modelsPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '热门模型' }),
      ]),
      modelsListEl,
    ]);

    // --- Section 4: 数据来源 ---
    const sourcesListEl = h('div', { className: 'cons-item-list' });
    const sourcesPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '数据来源' }),
      ]),
      sourcesListEl,
    ]);

    // --- Section 5: 按月细分 (12-Month Stacked Bar Chart) ---
    const monthlyYearBadge = h('span', { className: 'cons-badge text-mono', text: '2026' });
    const monthlyCols = Array.from({ length: 12 }, (_, idx) => {
      const costText = h('span', { className: 'month-cost text-mono', text: '' });
      const barThink = h('div', { className: 'month-seg seg-thinking' });
      const barOut = h('div', { className: 'month-seg seg-output' });
      const barCache = h('div', { className: 'month-seg seg-cached' });
      const barIn = h('div', { className: 'month-seg seg-input' });
      const stackWrap = h('div', { className: 'month-stack' }, [
        barThink,
        barOut,
        barCache,
        barIn,
      ]);
      const zeroDot = h('span', { className: 'month-zero-dot' });
      const monthLabel = h('span', { className: 'month-label', text: `${idx + 1}月` });
      const tokText = h('span', { className: 'month-tok text-mono', text: '' });

      const colEl = h('div', { className: 'month-col' }, [
        costText,
        h('div', { className: 'month-bar-well' }, [stackWrap, zeroDot]),
        monthLabel,
        tokText,
      ]);
      return {
        el: colEl,
        costText,
        stackWrap,
        zeroDot,
        barThink,
        barOut,
        barCache,
        barIn,
        monthLabel,
        tokText,
      };
    });

    const monthlyPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '按月细分' }),
        monthlyYearBadge,
      ]),
      h(
        'div',
        { className: 'monthly-grid' },
        monthlyCols.map((c) => c.el)
      ),
      h('div', { className: 'monthly-legend' }, [
        h('span', { className: 'legend-left' }, [
          h('span', { className: 'dot-swatch seg-input' }),
          h('span', { text: '输入' }),
        ]),
        h('span', { className: 'legend-left' }, [
          h('span', { className: 'dot-swatch seg-cached' }),
          h('span', { text: '缓存' }),
        ]),
        h('span', { className: 'legend-left' }, [
          h('span', { className: 'dot-swatch seg-output' }),
          h('span', { text: '输出' }),
        ]),
        h('span', { className: 'legend-left' }, [
          h('span', { className: 'dot-swatch seg-thinking' }),
          h('span', { text: '思考' }),
        ]),
      ]),
    ]);

    const scrollInner = h(
      'div',
      {
        style: 'display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: var(--space-3);',
      },
      [
        overviewPanel,
        trendPanel,
        modelsPanel,
        sourcesPanel,
        monthlyPanel,
      ]
    );

    const viewScrollbar = CustomScrollbar({
      contentEl: scrollInner,
      className: 'view-pane',
    });

    function createBreakdownItemRow() {
      const nameEl = h('strong', { className: 'cons-row-title' });
      const pctBadge = h('span', { className: 'cons-share-pill text-mono', text: '0%' });
      const totalTokEl = h('span', { className: 'cons-row-tok text-mono' });
      const costEl = h('strong', { className: 'cons-row-cost text-mono' });
      const segBar = createFourSegmentBar();

      const inVal = h('strong', { className: 'text-mono' });
      const cacheVal = h('strong', { className: 'text-mono' });
      const outVal = h('strong', { className: 'text-mono' });
      const thinkVal = h('strong', { className: 'text-mono' });
      const callsVal = h('strong', { className: 'text-mono' });

      const rowEl = h('div', { className: 'cons-item-row' }, [
        h('div', { className: 'panel-header' }, [
          nameEl,
          h('span', { className: 'cons-row-metrics' }, [
            pctBadge,
            totalTokEl,
            costEl,
          ]),
        ]),
        segBar.el,
        h('div', { className: 'cons-item-foot' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'dot-swatch seg-input' }),
            h('span', { text: '输入 ' }),
            inVal,
          ]),
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'dot-swatch seg-cached' }),
            h('span', { text: '缓存 ' }),
            cacheVal,
          ]),
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'dot-swatch seg-output' }),
            h('span', { text: '输出 ' }),
            outVal,
          ]),
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'dot-swatch seg-thinking' }),
            h('span', { text: '思考 ' }),
            thinkVal,
          ]),
          h('span', { className: 'legend-left' }, [
            h('span', { text: '调用 ' }),
            callsVal,
          ]),
        ]),
      ]);

      return {
        el: rowEl,
        refs: { nameEl, pctBadge, totalTokEl, costEl, segBar, inVal, cacheVal, outVal, thinkVal, callsVal },
      };
    }

    function updateBreakdownItemRow(refs, item, grandTotalTokens, showTokensInHeader = true) {
      patchText(refs.nameEl, item.label || item.name || item.shortName || '—');
      const total = Number(item.totalTokens || 0);
      const share = grandTotalTokens > 0 ? +((total / grandTotalTokens) * 100).toFixed(1) : 0;
      patchText(refs.pctBadge, `${share.toFixed(1)}%`);
      patchText(refs.totalTokEl, showTokensInHeader ? formatTokensPrecise(total) : '');
      patchAttr(refs.totalTokEl, 'hidden', !showTokensInHeader);
      patchText(refs.costEl, formatUsd(item.costUsd || 0));

      const responseTok =
        item.responseTokens != null
          ? Number(item.responseTokens)
          : Math.max(0, Number(item.outputTokens || 0) - Number(item.thinkingTokens || 0));
      const thinkingTok = Number(item.thinkingTokens || 0);

      refs.segBar.update({
        inputTokens: Number(item.inputTokens || 0),
        cacheReadTokens: Number(item.cacheReadTokens || 0),
        responseTokens: responseTok,
        thinkingTokens: thinkingTok,
      });

      patchText(refs.inVal, formatTokensPrecise(item.inputTokens || 0));
      patchText(refs.cacheVal, formatTokensPrecise(item.cacheReadTokens || 0));
      patchText(refs.outVal, formatTokensPrecise(responseTok));
      patchText(refs.thinkVal, formatTokensPrecise(thinkingTok));
      patchText(refs.callsVal, String(Number(item.calls || 0)));
    }

    let latestSlice = null;
    let isDirty = false;

    function renderConsumptionData(slice) {
      if (!slice) return;
      timeFilterSwitch.setValue(slice.range);
      patchAttr(customRangeBar, 'hidden', slice.range !== 'custom');
      startPicker.setValue(slice.customStartMs);
      endPicker.setValue(slice.customEndMs);

      const cons = slice.consumption || {};
      const preset =
        slice.range !== 'custom' && cons.presets?.[slice.range]
          ? cons.presets[slice.range]
          : null;
      const acct = preset?.account || cons.account || {};
      const rangeInfo = cons.selectedRange || {};

      // 1. Overview
      patchText(dateSpanBadge, formatDateSpanBadge(rangeInfo.startMs, rangeInfo.endMs));
      const totalTokens = Number(acct.totalTokens || 0);
      const inputTokens = Number(acct.inputTokens || 0);
      const cacheTokens = Number(acct.cacheReadTokens || 0);
      const outputTokens = Number(acct.outputTokens || 0);
      const responseTokens = Number(acct.responseTokens || 0);
      const thinkingTokens = Number(acct.thinkingTokens || 0);
      const costUsd = Number(acct.costUsd || 0);

      patchText(heroTotalTokens, formatTokensPrecise(totalTokens));
      patchText(heroTotalCalls, `${acct.calls || 0} 调用`);
      patchText(heroCostUsd, formatUsd(costUsd));
      patchText(heroCostCny, formatCnyApprox(costUsd));

      patchText(cacheHitPctEl, `${Number(acct.cacheHitPct ?? 0).toFixed(1)}%`);
      patchText(cacheTokensEl, `命中 ${formatTokensPrecise(cacheTokens)}`);

      const inPct = totalTokens > 0 ? +((inputTokens / totalTokens) * 100).toFixed(1) : 0;
      const outPct = totalTokens > 0 ? +((outputTokens / totalTokens) * 100).toFixed(1) : 0;
      patchText(inputSharePct, `${inPct}%`);
      patchText(inputMainTokens, formatTokensPrecise(inputTokens));
      patchText(
        inputSubText,
        `直接输入 ${formatTokensPrecise(inputTokens)} · 缓存读取 ${formatTokensPrecise(cacheTokens)}`
      );

      patchText(outputSharePct, `${outPct}%`);
      patchText(outputMainTokens, formatTokensPrecise(outputTokens));
      patchText(
        outputSubText,
        `内容生成 ${formatTokensPrecise(responseTokens)} · 思考推理 ${formatTokensPrecise(thinkingTokens)}`
      );

      overviewSegBar.update({
        inputTokens,
        cacheReadTokens: cacheTokens,
        responseTokens,
        thinkingTokens,
      });

      // 2. Historical Trend
      patchText(trendRangeBadge, preset?.label || rangeInfo.label || '全部时间');
      const trendSeries = cons.trendSeries || [];
      trendChart.update(trendSeries);
      if (trendSeries.length > 0) {
        const first = trendSeries[0];
        const mid = trendSeries[Math.floor(trendSeries.length / 2)];
        const last = trendSeries[trendSeries.length - 1];
        patchText(anchorStartTime, first.label);
        patchText(anchorStartVal, formatTokensPrecise(first.tokens));
        patchText(anchorMidTime, mid.label);
        patchText(anchorMidVal, formatTokensPrecise(mid.tokens));
        patchText(anchorEndTime, last.label);
        patchText(anchorEndVal, formatTokensPrecise(last.tokens));
      }

      // 3. Popular Models
      const models = (slice.modelBreakdown || [])
        .slice()
        .sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));
      const modelsTotalTok = models.reduce((s, m) => s + Number(m.totalTokens || 0), 0);

      patchKeyedList(modelsListEl, models, {
        keyFn: (m) => m.label || m.shortName,
        sigFn: (m) =>
          `${m.label}:${m.totalTokens}:${m.costUsd}:${m.calls}:${modelsTotalTok}`,
        createRow: createBreakdownItemRow,
        updateRow: (refs, m) => updateBreakdownItemRow(refs, m, modelsTotalTok, true),
      });

      // 4. Sources Breakdown
      const sources = cons.sourcesBreakdown || [];
      const sourcesTotalTok = sources.reduce((s, x) => s + Number(x.totalTokens || 0), 0);
      patchKeyedList(sourcesListEl, sources, {
        keyFn: (s) => s.name,
        sigFn: (s) => `${s.name}:${s.totalTokens}:${s.costUsd}:${s.calls}:${sourcesTotalTok}`,
        createRow: createBreakdownItemRow,
        updateRow: (refs, s) => updateBreakdownItemRow(refs, s, sourcesTotalTok, true),
      });

      // 5. Monthly Breakdown
      const monthlyYear = cons.monthlyYear || new Date().getFullYear();
      const currentMonthIdx = new Date().getMonth();
      patchText(monthlyYearBadge, String(monthlyYear));
      const monthlySeries = cons.monthlySeries || [];
      const maxMonthTokens = Math.max(
        1,
        ...monthlySeries.map((m) => Number(m.totalTokens || 0))
      );

      for (let i = 0; i < 12; i++) {
        const col = monthlyCols[i];
        const m = monthlySeries[i] || { totalTokens: 0, costUsd: 0 };
        const mTot = Number(m.totalTokens || 0);
        const hasData = mTot > 0;

        patchClasses(col.monthLabel, { 'is-current': i === currentMonthIdx });
        patchAttr(col.stackWrap, 'hidden', !hasData);
        patchAttr(col.zeroDot, 'hidden', hasData);

        if (!hasData) {
          patchText(col.costText, '');
          patchText(col.tokText, '');
        } else {
          const cVal = Number(m.costUsd || 0);
          patchText(col.costText, cVal >= 10 ? `$${Math.round(cVal)}` : `$${cVal.toFixed(2)}`);
          patchText(col.tokText, formatTokensPrecise(mTot));

          const totalHeightPct = Math.max(8, Math.min(100, (mTot / maxMonthTokens) * 100));
          patchStyleVar(col.stackWrap, '--bar-h', `${totalHeightPct.toFixed(1)}%`);

          const inPctM = (Number(m.inputTokens || 0) / mTot) * 100;
          const cachePctM = (Number(m.cacheReadTokens || 0) / mTot) * 100;
          const outPctM = (Number(m.responseTokens || 0) / mTot) * 100;
          const thinkPctM = (Number(m.thinkingTokens || 0) / mTot) * 100;

          patchStyleVar(col.barIn, '--seg-h', `${inPctM.toFixed(1)}%`);
          patchStyleVar(col.barCache, '--seg-h', `${cachePctM.toFixed(1)}%`);
          patchStyleVar(col.barOut, '--seg-h', `${outPctM.toFixed(1)}%`);
          patchStyleVar(col.barThink, '--seg-h', `${thinkPctM.toFixed(1)}%`);
        }
      }

      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({
        range: st.selectedTimeRange,
        customStartMs: st.customStartMs,
        customEndMs: st.customEndMs,
        consumption: st.telemetry?.consumption,
        modelBreakdown: st.telemetry?.modelBreakdown,
      }),
      (slice) => {
        latestSlice = slice;
        if (uiStore.getState().activeView !== 'consumption') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderConsumptionData(slice);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'consumption' && isDirty) {
          isDirty = false;
          if (latestSlice) {
            renderConsumptionData(latestSlice);
          }
        }
      }
    );

    onCleanup(() => {
      unsub();
      unsubView();
      timeFilterSwitch.destroy();
      startPicker.destroy();
      endPicker.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: { timeFilterSwitch, startPicker, endPicker, viewScrollbar },
    };
  },
});
