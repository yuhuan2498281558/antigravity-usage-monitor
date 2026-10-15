/**
 * @fileoverview Pure vector SVG icon registry (16x16 grid).
 * Strictly zero emoji characters anywhere in the codebase.
 */

export const SVG_ICON_DEFS = Object.freeze({
  pulse: [
    { tag: 'path', attrs: { d: 'M1.5 8h2.5l2.2-5.5 3.6 11 2.2-5.5h2.5' } },
  ],
  bolt: [
    { tag: 'path', attrs: { d: 'M9.2 1.5L3.5 9h4.2l-.9 5.5L12.5 7H8.3l.9-5.5z' } },
  ],
  refresh: [
    { tag: 'path', attrs: { d: 'M13.5 8a5.5 5.5 0 1 1-1.4-3.7' } },
    { tag: 'path', attrs: { d: 'M13.5 2.2v2.6h-2.6' } },
  ],
  check: [
    { tag: 'path', attrs: { d: 'M3 8.5l3.2 3.2L13 4.8' } },
  ],
  warning: [
    { tag: 'path', attrs: { d: 'M8 2.2L1.8 13.2h12.4L8 2.2z' } },
    { tag: 'path', attrs: { d: 'M8 6.2v3.4' } },
    { tag: 'circle', attrs: { cx: '8', cy: '11.5', r: '0.6', fill: 'currentColor', stroke: 'none' } },
  ],
  'chevron-down': [
    { tag: 'path', attrs: { d: 'M4 6.2l4 4 4-4' } },
  ],
  'chevron-up': [
    { tag: 'path', attrs: { d: 'M4 9.8l4-4 4 4' } },
  ],
  'chevron-right': [
    { tag: 'path', attrs: { d: 'M6.2 4l4 4-4 4' } },
  ],
  'chevron-left': [
    { tag: 'path', attrs: { d: 'M9.8 4l-4 4 4 4' } },
  ],
  layers: [
    { tag: 'path', attrs: { d: 'M8 2L2 5.2 8 8.4l6-3.2L8 2z' } },
    { tag: 'path', attrs: { d: 'M2 8.2L8 11.4l6-3.2' } },
    { tag: 'path', attrs: { d: 'M2 11.2L8 14.4l6-3.2' } },
  ],
  'chart-bar': [
    { tag: 'path', attrs: { d: 'M2 13.5h12' } },
    { tag: 'path', attrs: { d: 'M4.5 13.5V7.5' } },
    { tag: 'path', attrs: { d: 'M8 13.5V2.5' } },
    { tag: 'path', attrs: { d: 'M11.5 13.5V5.2' } },
  ],
  table: [
    { tag: 'rect', attrs: { x: '2', y: '2.5', width: '12', height: '11', rx: '1.5' } },
    { tag: 'path', attrs: { d: 'M2 6.2h12' } },
    { tag: 'path', attrs: { d: 'M6.2 6.2v7.3' } },
  ],
  sliders: [
    { tag: 'path', attrs: { d: 'M2 3.5h2M7 3.5h7' } },
    { tag: 'path', attrs: { d: 'M2 8h7M12 8h2' } },
    { tag: 'path', attrs: { d: 'M2 12.5h3.3M8.3 12.5H14' } },
    { tag: 'circle', attrs: { cx: '5.5', cy: '3.5', r: '1.5' } },
    { tag: 'circle', attrs: { cx: '10.5', cy: '8', r: '1.5' } },
    { tag: 'circle', attrs: { cx: '6.8', cy: '12.5', r: '1.5' } },
  ],
  flask: [
    { tag: 'path', attrs: { d: 'M6 2.2h4' } },
    { tag: 'path', attrs: { d: 'M6.8 2.2v3.6L3.2 12.2a1.2 1.2 0 0 0 1.1 1.8h7.4a1.2 1.2 0 0 0 1.1-1.8L9.2 5.8V2.2' } },
    { tag: 'path', attrs: { d: 'M4.6 10.2h6.8' } },
  ],
  session: [
    { tag: 'path', attrs: { d: 'M2.5 3.2h11v7.6H6l-3.5 2.5V3.2z' } },
  ],
  cpu: [
    { tag: 'rect', attrs: { x: '4', y: '4', width: '8', height: '8', rx: '1' } },
    { tag: 'path', attrs: { d: 'M6.5 1.8v2.2M9.5 1.8v2.2M6.5 12v2.2M9.5 12v2.2M1.8 6.5H4M1.8 9.5H4M12 6.5h2.2M12 9.5h2.2' } },
  ],
  calendar: [
    { tag: 'rect', attrs: { x: '2.2', y: '3.2', width: '11.6', height: '10.6', rx: '1' } },
    { tag: 'path', attrs: { d: 'M5.2 1.8v2.4M10.8 1.8v2.4M2.2 6.5h11.6' } },
  ],
  clock: [
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '5.8' } },
    { tag: 'path', attrs: { d: 'M8 4.8v3.5l2.4 1.5' } },
  ],
  plus: [
    { tag: 'path', attrs: { d: 'M8 3.5v9M3.5 8h9' } },
  ],
  minus: [
    { tag: 'path', attrs: { d: 'M3.5 8h9' } },
  ],
  swap: [
    { tag: 'path', attrs: { d: 'M3 5.5h10l-2.6-2.6M13 10.5H3l2.6 2.6' } },
  ],
  close: [
    { tag: 'path', attrs: { d: 'M4 4l8 8M12 4l-8 8' } },
  ],
  dot: [
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '3.2', fill: 'currentColor', stroke: 'none' } },
  ],
  'arrow-down': [
    { tag: 'path', attrs: { d: 'M8 2.8v10.4M4.2 9.4L8 13.2l3.8-3.8' } },
  ],
});
