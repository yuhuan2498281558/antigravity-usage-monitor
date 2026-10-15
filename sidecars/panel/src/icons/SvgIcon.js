/**
 * @fileoverview Dynamic SVG icon component and incremental icon patcher.
 */

import { SVG_ICON_DEFS } from './svgRegistry.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSvgIcon(name, { size = 14, className = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', `svg-icon ${className}`.trim());
  } else {
    svg.setAttribute('class', 'svg-icon');
  }
  patchSvgIcon(svg, name);
  return svg;
}

export function patchSvgIcon(svgEl, name) {
  if (!svgEl || svgEl.dataset?.iconName === name) return false;
  if (svgEl.dataset) {
    svgEl.dataset.iconName = name;
  }
  while (svgEl.firstChild) {
    svgEl.removeChild(svgEl.firstChild);
  }
  const shapes = SVG_ICON_DEFS[name] || SVG_ICON_DEFS.dot;
  for (const shape of shapes) {
    const child = document.createElementNS(SVG_NS, shape.tag);
    for (const [k, v] of Object.entries(shape.attrs)) {
      child.setAttribute(k, v);
    }
    svgEl.appendChild(child);
  }
  return true;
}
