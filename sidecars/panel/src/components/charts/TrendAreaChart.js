/**
 * @fileoverview 纯 SVG 三次贝塞尔平滑曲线趋势图组件 (TrendAreaChart).
 * 负责将按时间分桶的 Token 消耗序列渲染为带垂直渐变填充、虚线参考网格、
 * 峰值描点与自适应防溢出的顶部峰值胶囊标签的面积图。
 */

import { h, patchAttr, patchStyleVar, patchText } from '../../core/domPatch.js';
import { formatTokensPrecise } from '../../core/formatters.js';
import { SVG_NS } from '../../icons/SvgIcon.js';

/**
 * 将二维采样点序列转换为水平张力平滑的三次贝塞尔曲线 SVG 路径 (`M ... C ...`)。
 * 控制点沿 X 轴取相邻点间距的 `0.45` 张力系数，Y 轴与各自端点齐平，
 * 保证曲线在极值点处平缓过渡且不会产生上下过冲 (Overshoot)。
 *
 * @param {Array<{ x: number, y: number }>} points SVG 坐标系下的采样点数组
 * @returns {string} SVG `<path>` 的 `d` 属性字符串
 */
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

/**
 * 创建 SVG 历史趋势平滑面积图组件。
 *
 * SVG 视口坐标系 (`viewBox="0 0 460 116"`) 布局约定：
 * - 水平绘图区：`leftX = 12` 至 `rightX = 448`（总跨度 `spanX = 436`），左右预留边距容纳端点圆点描边；
 * - 垂直绘图区：顶部峰值线 `topY = 26` 至底部零基线 `bottomY = 98`（总跨度 `spanY = 72`），
 *   顶部预留 26px 空间给 HTML 峰值胶囊 (`.trend-peak-pill`)。
 *
 * @returns {{
 *   el: HTMLElement,
 *   update: (series?: Array<{ label: string, tokens: number }>) => void
 * }} 图表容器节点与序列更新方法
 */
export function createTrendAreaChart() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 460 116');
  svg.setAttribute('class', 'trend-svg');
  svg.setAttribute('aria-hidden', 'true');

  // 垂直线性渐变：由顶部 36% 不透明度的主题色平滑衰减至底部全透明
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

  // 背景辅助参考网格线：3 条水平分位线 + 3 条垂直时间锚点分割线
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

  /**
   * 根据最新时间分桶序列重绘平滑曲线、闭合渐变区域以及最高峰标记位置。
   */
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

    // SVG 绘图区边界与跨度参数（Y 轴向下递增，因此数值越大对应的 y 坐标越小）
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

    // 仅在曲线路径发生变化时更新 DOM 属性，避免无意义的 SVG 重绘
    const lineD = buildSmoothSplinePath(pts);
    if (lineD !== lastLineD) {
      lastLineD = lineD;
      const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${bottomY} L ${pts[0].x.toFixed(1)} ${bottomY} Z`;
      patchAttr(linePath, 'd', lineD);
      patchAttr(areaPath, 'd', areaD);
    }

    // 定位峰值圆点，并将顶部峰值气泡水平位置钳制在 [8%, 92%] 区间内以防贴边裁切
    const peakPt = pts[peakIdx] || { x: 230, y: bottomY };
    patchAttr(peakDot, 'cx', peakPt.x.toFixed(1));
    patchAttr(peakDot, 'cy', peakPt.y.toFixed(1));

    patchText(peakPill, formatTokensPrecise(maxTokens));
    const pctLeft = Math.max(8, Math.min(92, (peakPt.x / 460) * 100));
    patchStyleVar(peakPill, '--peak-x', `${pctLeft.toFixed(1)}%`);
  }

  return { el: chartWrap, update };
}
