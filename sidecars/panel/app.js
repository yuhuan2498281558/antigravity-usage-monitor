(() => {
'use strict';

// --- src/icons/svgRegistry.js ---
/**
 * @fileoverview Pure vector SVG icon registry (16x16 grid).
 * Strictly zero emoji characters anywhere in the codebase.
 */

const SVG_ICON_DEFS = Object.freeze({
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
  dot: [
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '5', fill: 'currentColor', stroke: 'none' } },
  ],
  'arrow-down': [
    { tag: 'path', attrs: { d: 'M8 2.8v10.4M4.2 9.4L8 13.2l3.8-3.8' } },
  ],
  'arrow-up': [
    { tag: 'path', attrs: { d: 'M8 13.2V2.8M4.2 6.6L8 2.8l3.8 3.8' } },
  ],
  dock: [
    { tag: 'rect', attrs: { x: '1.8', y: '2.5', width: '12.4', height: '11', rx: '1.5' } },
    { tag: 'path', attrs: { d: 'M1.8 6h12.4' } },
    { tag: 'path', attrs: { d: 'M9.2 4.25h3.2' } },
  ],
  close: [
    { tag: 'path', attrs: { d: 'M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6' } },
  ],
});

// --- src/icons/SvgIcon.js ---
/**
 * @fileoverview Dynamic SVG icon component and incremental icon patcher.
 */


const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgIcon(name, { size = 14, className = '' } = {}) {
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

function patchSvgIcon(svgEl, name) {
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

// --- src/core/reactive.js ---
/**
 * @fileoverview Fine-grained reactive store with async microtask batching
 * and structural slice comparison to prevent full-page re-renders.
 */

const pendingJobs = new Set();
let isFlushPending = false;

function scheduleAsyncJob(job) {
  pendingJobs.add(job);
  if (!isFlushPending) {
    isFlushPending = true;
    queueMicrotask(flushAsyncJobs);
  }
}

function flushAsyncJobs() {
  isFlushPending = false;
  const jobs = Array.from(pendingJobs);
  pendingJobs.clear();
  for (const job of jobs) {
    job();
  }
}

function isShallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) {
      return false;
    }
  }
  return true;
}

function createReactiveStore(initialState) {
  let state = { ...initialState };
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function notifyAll() {
    for (const sub of Array.from(subscribers)) {
      if (!subscribers.has(sub)) continue;
      const nextSlice = sub.selector(state);
      const equal = sub.compare(sub.lastSlice, nextSlice);
      if (!equal) {
        const prevSlice = sub.lastSlice;
        sub.lastSlice = nextSlice;
        sub.listener(nextSlice, prevSlice);
      }
    }
  }

  function setState(patchOrUpdater, { sync = false } = {}) {
    const patch = typeof patchOrUpdater === 'function' ? patchOrUpdater(state) : patchOrUpdater;
    if (!patch || typeof patch !== 'object') return;

    let changed = false;
    const nextState = { ...state };
    for (const [k, v] of Object.entries(patch)) {
      if (!Object.is(state[k], v)) {
        nextState[k] = v;
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    state = nextState;

    if (sync) {
      notifyAll();
    } else {
      scheduleAsyncJob(notifyAll);
    }
  }

  function subscribe(selector, listener, { immediate = true, compare = isShallowEqual } = {}) {
    const initialSlice = selector(state);
    const sub = {
      selector,
      listener,
      compare,
      lastSlice: initialSlice,
    };
    subscribers.add(sub);
    if (immediate) {
      listener(initialSlice, undefined);
    }
    return () => {
      subscribers.delete(sub);
    };
  }

  return {
    getState,
    setState,
    subscribe,
  };
}

// --- src/core/domPatch.js ---
/**
 * @fileoverview Incremental DOM patching utilities and keyed list reconciler.
 * Prevents full innerHTML replacements and preserves active DOM element state.
 */

function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val === undefined || val === null || val === false) continue;
      if (key === 'className' || key === 'class') {
        el.className = String(val);
      } else if (key === 'dataset' && typeof val === 'object') {
        for (const [dk, dv] of Object.entries(val)) {
          if (dv !== undefined && dv !== null) {
            el.dataset[dk] = String(dv);
          }
        }
      } else if (key.startsWith('on') && typeof val === 'function') {
        const evt = key.slice(2).toLowerCase();
        el.addEventListener(evt, val);
      } else if (key === 'text') {
        el.textContent = String(val);
      } else if (val === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

function patchText(el, nextValue) {
  if (!el) return false;
  const nextStr = String(nextValue ?? '');
  if (el.textContent === nextStr) {
    return false;
  }
  el.textContent = nextStr;
  return true;
}

function patchAttr(el, attrName, nextValue) {
  if (!el) return false;
  if (nextValue === null || nextValue === undefined || nextValue === false) {
    let mutated = false;
    if (el.hasAttribute(attrName)) {
      el.removeAttribute(attrName);
      mutated = true;
    }
    if (attrName === 'value' && 'value' in el && el.value !== '') {
      el.value = '';
      mutated = true;
    }
    return mutated;
  }
  const strVal = nextValue === true ? '' : String(nextValue);
  let mutated = false;
  if (el.getAttribute(attrName) !== strVal) {
    el.setAttribute(attrName, strVal);
    mutated = true;
  }
  if (attrName === 'value' && 'value' in el && el.value !== strVal) {
    el.value = strVal;
    mutated = true;
  }
  return mutated;
}

function patchClasses(el, classMap) {
  if (!el || !classMap) return false;
  let mutated = false;
  for (const [cls, active] of Object.entries(classMap)) {
    if (!cls) continue;
    const shouldHave = Boolean(active);
    const tokens = String(cls).split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      const has = el.classList.contains(tok);
      if (has !== shouldHave) {
        el.classList.toggle(tok, shouldHave);
        mutated = true;
      }
    }
  }
  return mutated;
}

function patchStyleVar(el, varName, nextValue) {
  if (!el) return false;
  const strVal = String(nextValue ?? '');
  const prev = el.style.getPropertyValue(varName);
  if (prev === strVal) {
    return false;
  }
  el.style.setProperty(varName, strVal);
  return true;
}

/**
 * 判断事件是否发生在目标节点内部（兼容 Shadow DOM 的 `composedPath()` 穿透）。
 *
 * @param {Event|null|undefined} event
 * @param {Node|null|undefined} element
 * @returns {boolean}
 */
function isEventInside(event, element) {
  if (!event || !element) return false;
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath();
    if (Array.isArray(path) && path.includes(element)) {
      return true;
    }
  }
  const target = event.target;
  return Boolean(target && typeof element.contains === 'function' && element.contains(target));
}

const keyedListState = new WeakMap();

/**
 * Keyed incremental list reconciler.
 * Reuses existing DOM nodes by key and patches only changed items in-place.
 */
function patchKeyedList(container, items, { keyFn, sigFn, createRow, updateRow }) {
  if (!container) return;
  let map = keyedListState.get(container);
  if (!map) {
    map = new Map();
    keyedListState.set(container, map);
  }

  const nextKeys = new Set();
  const seenInPass = new Map();
  const orderedNodes = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawKey = String(keyFn(item, i));
    const dupIdx = seenInPass.get(rawKey) || 0;
    seenInPass.set(rawKey, dupIdx + 1);
    const key = dupIdx === 0 ? rawKey : `${rawKey}__dup_${dupIdx}`;
    const sig = sigFn ? String(sigFn(item, i)) : JSON.stringify(item);
    nextKeys.add(key);

    let record = map.get(key);
    if (!record) {
      const created = createRow(item, i);
      record = {
        el: created.el,
        refs: created.refs,
        sig,
      };
      updateRow(record.refs, item, i, record.el);
      map.set(key, record);
    } else if (record.sig !== sig) {
      record.sig = sig;
      updateRow(record.refs, item, i, record.el);
    }
    orderedNodes.push(record.el);
  }

  // Remove stale keys
  for (const [oldKey, record] of map.entries()) {
    if (!nextKeys.has(oldKey)) {
      if (record.el.parentNode === container) {
        container.removeChild(record.el);
      }
      map.delete(oldKey);
    }
  }

  // Reorder or insert nodes with minimal DOM moves
  for (let i = 0; i < orderedNodes.length; i++) {
    const targetNode = orderedNodes[i];
    const currentNode = container.children[i] || null;
    if (currentNode !== targetNode) {
      container.insertBefore(targetNode, currentNode);
    }
  }
}

// --- src/core/component.js ---
/**
 * @fileoverview Vue-inspired lightweight component kernel supporting
 * props, custom v-model value transmission (emit('update:modelValue', val)),
 * reactive subscriptions, and lifecycle cleanup.
 */

function defineComponent({ name, setup }) {
  return function createInstance(initialProps = {}) {
    let props = { ...initialProps };
    const cleanups = [];

    function emit(event, payload) {
      // Support Vue-style onUpdateModelValue / onChange prop callbacks
      if (event === 'update:modelValue') {
        if (typeof props.onUpdateModelValue === 'function') {
          props.onUpdateModelValue(payload);
        }
        if (typeof props.onChange === 'function') {
          props.onChange(payload);
        }
      }
    }

    function onCleanup(fn) {
      if (typeof fn === 'function') {
        cleanups.push(fn);
      }
    }

    let setupResult = null;

    function setProps(nextProps = {}) {
      props = { ...props, ...nextProps };
      if (setupResult && typeof setupResult.onPropsChange === 'function') {
        setupResult.onPropsChange(props);
      }
    }

    function setValue(nextValue) {
      setProps({ modelValue: nextValue });
    }

    setupResult = setup({
      getProps: () => props,
      setProps,
      emit,
      onCleanup,
    });

    function destroy() {
      for (const fn of cleanups.splice(0)) {
        try {
          fn();
        } catch (err) {
          console.error(`[${name}] cleanup error:`, err);
        }
      }
      if (setupResult.el?.parentNode) {
        setupResult.el.parentNode.removeChild(setupResult.el);
      }
    }

    return {
      name,
      el: setupResult.el,
      refs: setupResult.refs || {},
      setProps,
      setValue,
      destroy,
      ...setupResult.methods,
    };
  };
}

// --- src/core/formatters.js ---
/**
 * @fileoverview Pure formatting utilities for speed metrics, token counts,
 * USD estimates, countdown timers, and custom datetime displays.
 */

function formatMetric(value, unit = '') {
  return Number.isFinite(value) ? `${value.toFixed(1)}${unit}` : '—';
}

function formatTokens(num) {
  const n = Number(num || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatTokensPrecise(num) {
  const n = Number(num || 0);
  if (n <= 0) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatCnyApprox(usdAmount, rate = 7.2) {
  const rmb = Number(usdAmount || 0) * rate;
  if (rmb <= 0) return '≈ ¥0';
  if (rmb >= 10) return `≈ ¥${Math.round(rmb)}`;
  return `≈ ¥${rmb.toFixed(1)}`;
}

function formatDateSpanBadge(startMs, endMs) {
  const s = startMs && Number.isFinite(startMs) ? new Date(startMs) : new Date();
  const e = endMs && Number.isFinite(endMs) ? new Date(endMs) : new Date();
  return `${s.getMonth() + 1}月${s.getDate()}日 ~ ${e.getMonth() + 1}月${e.getDate()}日`;
}

function formatUsd(amount, { precise = false } = {}) {
  if (amount == null || !Number.isFinite(Number(amount))) return '待定';
  const val = Number(amount || 0);
  if (precise) {
    if (val > 0 && val < 0.001) return '<$0.001';
    return val >= 1 ? `$${val.toFixed(2)}` : `$${val.toFixed(3)}`;
  }
  return `$${val.toFixed(2)}`;
}

function speedReasonText(reason) {
  return ({
    incomplete_or_invalid_timing: '生成未完成',
    invalid_output_tokens: '无有效输出',
    inconsistent_timing: '耗时数据异常',
    short_timing: '耗时过短 (<0.5s)',
    legacy_cache: '旧版缓存记录',
  })[reason] || '';
}

function sampleSummary(summary) {
  const valid = summary?.sampleCount || 0;
  const excluded = summary?.excludedCount || 0;
  return `${valid}/${valid + excluded} 步`;
}

function formatCountdown(isoTime, nowMs = Date.now()) {
  if (!isoTime) return '未知重置时间';
  const targetMs = Date.parse(isoTime);
  if (!Number.isFinite(targetMs) || targetMs <= 0) return '未知重置时间';
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return '即将重置';
  if (diffMs < 60_000) return '<1分钟后重置';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}天 ${hours}小时后重置`;
  if (hours > 0) return `${hours}小时 ${minutes}分后重置`;
  return `${minutes}分钟后重置`;
}

function formatCompactDateTime(ms) {
  if (!ms || !Number.isFinite(ms)) return '选择时间';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatElapsedSec(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) {
    return `${m}m ${String(remS).padStart(2, '0')}s`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

/**
 * 归一化 Orchestrator 系列 ID 显示格式枚举（`'compact'` 精简代号 vs `'full'` 原始完整 ID，默认 `'compact'`）。
 *
 * @param {unknown} mode
 * @returns {'compact'|'full'}
 */
function normalizeOrchestratorIdDisplayMode(mode) {
  return String(mode ?? '').trim().toLowerCase() === 'full' ? 'full' : 'compact';
}

/**
 * 统一解析步骤、会话摘要或模型汇总行面向用户的模型显示文本与悬停提示。
 *
 * 规则：
 * - Orchestrator 系列（`Orchestrator (Carbon)`、`Orchestrator (Argon)`、`gemini-flash-worker-agy` / `M669`）
 *   独立遵循 `orchestratorIdMode`（`'compact'` 显示 `orchestrator-carbon` / `orchestrator-argon` / `worker-agy-hydrogen`；
 *   `'full'` 显示带括号标注的完整上游 ID），不受普通模型“精简代号 / 原始模型 ID”切换影响；
 * - 其余普通模型继续按 `showUpstreamModel` 与视图选项切换。
 *
 * @param {object|null|undefined} target
 * @param {{ showUpstreamModel?: boolean, orchestratorIdMode?: string }|boolean} [settings]
 * @param {{ preferLabelInShort?: boolean, fallback?: string }} [options]
 * @returns {{ text: string, title: string, isOrchestratorSeries: boolean }}
 */
function resolveModelDisplayInfo(target, settings = {}, options = {}) {
  const showUpstream =
    typeof settings === 'boolean' ? settings : Boolean(settings?.showUpstreamModel);
  const orchestratorMode = normalizeOrchestratorIdDisplayMode(
    typeof settings === 'object' && settings ? settings.orchestratorIdMode : 'compact'
  );
  const preferLabelInShort = Boolean(options?.preferLabelInShort);
  const fallback = options?.fallback ?? '模型未知';

  if (!target || typeof target !== 'object') {
    return { text: fallback, title: fallback, isOrchestratorSeries: false };
  }

  const shortText = String(
    target.activeModelShort ?? target.modelShort ?? target.shortName ?? ''
  ).trim();
  const labelText = String(
    target.activeModelLabel ?? target.modelLabel ?? target.label ?? ''
  ).trim();
  const upstreamText = String(
    target.activeModelUpstream ?? target.modelUpstream ?? target.upstreamName ?? ''
  ).trim();
  const responseText = String(target.responseModel ?? '').trim();
  const modelKeyText = String(target.modelKey ?? '').trim();

  const isCompaction =
    Boolean(target.isCompactionStep) ||
    /·压缩\s*$/.test(shortText) ||
    /·压缩\s*$/.test(upstreamText) ||
    /·压缩\s*$/.test(labelText);

  const combined = `${modelKeyText} ${shortText} ${labelText} ${upstreamText} ${responseText}`;
  const isOrchWorker =
    /\bMODEL_PLACEHOLDER_M669\b|\b[a-z0-9.-]*worker-agy\b|\bworker-agy-hydrogen\b|\bOrchestrator\s+Worker\b/i.test(
      combined
    );
  const isOrchSeries =
    isOrchWorker ||
    /\bgemini-pro-orchestrator(?:-argon)?\b|\borchestrator-(?:carbon|argon)\b|\borch-(?:carbon|argon)(?:·压缩)?(?=\s|$)|Orchestrator\s*\((?:Carbon|Argon)\)|\bMODEL_PLACEHOLDER_M(?:667|681)\b/i.test(
      combined
    );

  if (isOrchSeries) {
    let compactId = 'orchestrator-carbon';
    let fullId = 'gemini-pro-orchestrator (carbon-4)';
    if (isOrchWorker) {
      compactId = 'worker-agy-hydrogen';
      fullId = 'gemini-flash-worker-agy (hydrogen-4)';
    } else if (/\bargon\b|\bMODEL_PLACEHOLDER_M681\b|\borch-argon\b/i.test(combined)) {
      compactId = 'orchestrator-argon';
      fullId = 'gemini-pro-orchestrator-argon (argon-4)';
    }
    const suffix = isCompaction ? '·压缩' : '';
    const text = `${orchestratorMode === 'full' ? fullId : compactId}${suffix}`;
    const multiUpstream =
      Array.isArray(target.upstreamModels) && target.upstreamModels.length > 1
        ? target.upstreamModels.join(' / ')
        : '';
    const title = multiUpstream || `${fullId}${suffix}`;
    return { text, title, isOrchestratorSeries: true };
  }

  const standardText =
    (showUpstream
      ? upstreamText || responseText || shortText || labelText
      : preferLabelInShort
        ? labelText || shortText
        : shortText || labelText) || fallback;
  const standardTitle =
    showUpstream && Array.isArray(target.upstreamModels) && target.upstreamModels.length > 1
      ? target.upstreamModels.join(' / ')
      : standardText;
  return { text: standardText, title: standardTitle, isOrchestratorSeries: false };
}

// --- src/core/httpClient.js ---
/**
 * @fileoverview Async HTTP client with AbortController cancellation for stale
 * polling requests, concurrent GET deduplication, and dual-mode transport
 * (Sidecar Webview `window.sidecar.fetch` + Main Window Loopback Bridge).
 */

const inFlightGets = new Map();
const activeControllers = new Map();

/**
 * 读取主窗口双栖模式下注入的本地桥接配置（`port`、`token`、`bundleVersion`、`stylesCss`）。
 *
 * @returns {{ port: number, token: string, bundleVersion?: string, stylesCss?: string } | null}
 */
function getWindowBridgeConfig() {
  if (typeof window === 'undefined') return null;
  const br = window.__AGUsageMonitorBridge;
  const port = Number(br?.port || 0);
  if (br && Number.isInteger(port) && port > 0 && typeof br.token === 'string' && br.token) {
    return br;
  }
  return null;
}

/**
 * 判断当前脚本是否以双栖悬浮模式运行在宿主主聊天窗口内（而非右侧辅助栏 Webview）。
 *
 * @returns {boolean}
 */
function isWindowOverlayMode() {
  if (typeof window === 'undefined') return false;
  if (window.sidecar?.fetch) return false;
  return Boolean(getWindowBridgeConfig());
}

/**
 * 接收 Sidecar 通过 CDP `Runtime.evaluate` 批量投递的 RPC 响应，完成因 CSP/代理解除 HTTP 直连时的兜底请求。
 *
 * @param {Array<{ id: string, ok: boolean, status?: number, data?: any, error?: string }>} responses
 * @returns {number}
 */
function deliverCdpBridgeResponses(responses) {
  const br = getWindowBridgeConfig();
  if (!br || !(br.rpcPending instanceof Map) || !Array.isArray(responses)) return 0;
  let delivered = 0;
  for (const item of responses) {
    const entry = br.rpcPending.get(item?.id);
    if (!entry) continue;
    br.rpcPending.delete(item.id);
    delivered += 1;
    if (item.ok) {
      entry.resolve(item.data);
    } else {
      entry.reject(new Error(item.error || `HTTP ${item.status || 500}`));
    }
  }
  return delivered;
}

function callViaCdpBridge(bridge, path, { method, body, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      reject(abortErr);
      return;
    }
    if (!Array.isArray(bridge.rpcQueue)) bridge.rpcQueue = [];
    if (!(bridge.rpcPending instanceof Map)) bridge.rpcPending = new Map();

    const reqId = `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanupQueueItem = () => {
      if (!Array.isArray(bridge.rpcQueue)) return;
      const idx = bridge.rpcQueue.findIndex((item) => item?.id === reqId);
      if (idx >= 0) bridge.rpcQueue.splice(idx, 1);
    };

    const timeoutId = setTimeout(() => {
      bridge.rpcPending.delete(reqId);
      cleanupQueueItem();
      reject(new Error('CDP bridge timeout'));
    }, 8000);

    const onAbort = () => {
      clearTimeout(timeoutId);
      bridge.rpcPending.delete(reqId);
      cleanupQueueItem();
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      reject(abortErr);
    };
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    bridge.rpcPending.set(reqId, {
      resolve: (data) => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    });

    if (bridge.rpcQueue.length >= 16) {
      const dropped = bridge.rpcQueue.shift();
      if (dropped?.id) {
        const stale = bridge.rpcPending.get(dropped.id);
        bridge.rpcPending.delete(dropped.id);
        stale?.reject(new Error('CDP queue superseded'));
      }
    }
    bridge.rpcQueue.push({ id: reqId, path, method, body });
  });
}

async function callSidecarApi(path, { method = 'GET', body, abortKey = '' } = {}) {
  const upperMethod = method.toUpperCase();
  const dedupKey = upperMethod === 'GET' && !abortKey ? path : '';

  if (dedupKey && inFlightGets.has(dedupKey)) {
    return inFlightGets.get(dedupKey);
  }

  let signal;
  let requestController = null;
  if (abortKey && typeof AbortController !== 'undefined') {
    const prev = activeControllers.get(abortKey);
    if (prev) {
      prev.abort();
    }
    requestController = new AbortController();
    activeControllers.set(abortKey, requestController);
    signal = requestController.signal;
  }

  const runRequest = async () => {
    const sidecar = typeof window !== 'undefined' ? window.sidecar : null;
    const bridge = !sidecar?.fetch ? getWindowBridgeConfig() : null;
    const fetchFn = sidecar?.fetch
      ? sidecar.fetch.bind(sidecar)
      : typeof window !== 'undefined' && typeof window.fetch === 'function'
        ? window.fetch.bind(window)
        : globalThis.fetch.bind(globalThis);

    const requestUrl = bridge ? `http://127.0.0.1:${bridge.port}${path}` : path;
    const headers = {};
    if (body !== undefined || !bridge) {
      headers['Content-Type'] = 'application/json';
    }
    if (bridge) {
      headers['X-Usage-Monitor-Token'] = bridge.token;
      if (bridge.transportMode === 'cdp') {
        return callViaCdpBridge(bridge, path, { method: upperMethod, body, signal });
      }
    }

    let res;
    try {
      res = await fetchFn(requestUrl, {
        method: upperMethod,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (fetchErr) {
      if (!bridge || signal?.aborted || fetchErr?.name === 'AbortError') {
        throw fetchErr;
      }
      // 当宿主环境的 CSP connect-src、混合内容策略或本地代理阻断 HTTP 直连时，无缝切至 CDP 通道
      bridge.transportMode = 'cdp';
      return callViaCdpBridge(bridge, path, { method: upperMethod, body, signal });
    }
    if (signal?.aborted) {
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    const data = await res.json().catch(() => ({}));
    if (signal?.aborted) {
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  };

  const promise = runRequest().finally(() => {
    if (dedupKey) {
      inFlightGets.delete(dedupKey);
    }
    if (abortKey && requestController && activeControllers.get(abortKey) === requestController) {
      activeControllers.delete(abortKey);
    }
  });

  if (dedupKey) {
    inFlightGets.set(dedupKey, promise);
  }
  return promise;
}

// --- src/store/uiStore.js ---
/**
 * @fileoverview UI navigation and view state store.
 */


const VIEW_TABS = Object.freeze([
  { value: 'overview', label: '实时监控', icon: 'pulse' },
  { value: 'consumption', label: '用量统计', icon: 'chart-bar' },
  { value: 'steps', label: '调用明细', icon: 'table' },
  { value: 'settings', label: '偏好设置', icon: 'sliders' },
]);

const uiStore = createReactiveStore({
  activeView: 'overview',
  stepsSubTab: 'steps', // 'steps' | 'models'
  selectedAgentScope: 'all', // 'all' | 'main' | <subagent cascadeId>
  ctxInspectorAgentId: 'auto', // 'auto' | 'main' | <subagent cascadeId>
});

// --- src/store/telemetryStore.js ---
/**
 * @fileoverview Reactive telemetry store with async non-overlapping poll scheduler
 * and granular slice updates.
 */


/**
 * 在主窗口双栖模式下，从宿主页面路径 `/c/<uuid>` 提取当前正在浏览的会话 ID。
 *
 * @returns {string}
 */
function extractHostRouteCascadeId() {
  if (typeof window === 'undefined' || !isWindowOverlayMode()) return '';
  const pathname = String(window.location?.pathname || '');
  const m = pathname.match(/^\/c\/([a-f0-9-]{36})(?:\/|$)/i);
  return m ? m[1] : '';
}

const initialConversationId =
  (typeof window !== 'undefined' && window.sidecar?.conversationId) || '';

const telemetryStore = createReactiveStore({
  selectedConversationId: initialConversationId,
  hostRouteConversationId: extractHostRouteCascadeId(),
  selectedTimeRange: 'today',
  customStartMs: Date.now() - 24 * 3600 * 1000,
  customEndMs: Date.now(),
  syncState: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  minuteTick: 0,
  telemetry: null,
});

let pollTimer = null;
let feedbackTimer = null;
let activeBundleVersion = 0;
let latestRequestSeq = 0;
let activeForceCount = 0;
let loopActive = false;
let loopIntervalMs = 2000;
let loopTickFn = null;

const CLIENT_TOPBAR_SLOT_KEYS = Object.freeze([
  'context',
  'tps',
  'ttft',
  'cost',
  'quota_auto',
  'gemini_5h',
  'gemini_weekly',
  'claude_5h',
  'claude_weekly',
  'none',
]);

const DEFAULT_CLIENT_TOPBAR_SLOTS = Object.freeze(['context', 'tps', 'quota_auto']);

/**
 * 归一化前端顶栏胶囊三槽位配置数组，非法项回退默认值，且禁止三项同时为 `none`。
 *
 * @param {unknown} raw
 * @returns {[string, string, string]}
 */
function normalizeClientTopbarSlots(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const slots = [0, 1, 2].map((idx) => {
    const val = String(arr[idx] ?? '').trim();
    return CLIENT_TOPBAR_SLOT_KEYS.includes(val) ? val : DEFAULT_CLIENT_TOPBAR_SLOTS[idx];
  });
  if (slots.every((s) => s === 'none')) {
    slots[0] = 'context';
  }
  return slots;
}

/**
 * 归一化前端插件更新策略（`'off'` | `'manual'` | `'auto'`），兼容旧版布尔字段。
 *
 * @param {unknown} mode
 * @param {unknown} [legacyAutoUpdate]
 * @returns {'off'|'manual'|'auto'}
 */
function normalizeClientUpdateMode(mode, legacyAutoUpdate) {
  const m = String(mode ?? '').trim().toLowerCase();
  if (m === 'off' || m === 'manual' || m === 'auto') return m;
  if (legacyAutoUpdate === true) return 'auto';
  return 'manual';
}

function normalizeClientOrchestratorIdMode(mode) {
  return String(mode ?? '').trim().toLowerCase() === 'full' ? 'full' : 'compact';
}

function isEquivalentTelemetry(prev, next) {
  if (!prev || !next) return false;
  if (prev === next) return true;

  // 1. 比对系统设置项（模型显示策略、Orchestrator ID 显示风格、周预算模式与额度、插件更新策略、双栖与顶栏槽位配置）
  const pAct = prev.activeConversation;
  const nAct = next.activeConversation;
  if (prev.settings?.showUpstreamModel !== next.settings?.showUpstreamModel) return false;
  const prevOrchIdMode =
    String(prev.settings?.orchestratorIdMode ?? 'compact').trim().toLowerCase() === 'full'
      ? 'full'
      : 'compact';
  const nextOrchIdMode =
    String(next.settings?.orchestratorIdMode ?? 'compact').trim().toLowerCase() === 'full'
      ? 'full'
      : 'compact';
  if (prevOrchIdMode !== nextOrchIdMode) {
    return false;
  }
  if (prev.settings?.weeklyLimitMode !== next.settings?.weeklyLimitMode) return false;
  if (prev.settings?.weeklyTokenBudget !== next.settings?.weeklyTokenBudget) return false;
  if (prev.settings?.weeklyCostBudget !== next.settings?.weeklyCostBudget) return false;
  if ((prev.settings?.pluginUpdateMode ?? '') !== (next.settings?.pluginUpdateMode ?? '')) return false;
  if (prev.settings?.autoUpdatePlugin !== next.settings?.autoUpdatePlugin) return false;
  if (prev.settings?.enableWindowOverlay !== next.settings?.enableWindowOverlay) return false;
  if ((prev.settings?.showTopbarMultiSession !== false) !== (next.settings?.showTopbarMultiSession !== false)) {
    return false;
  }
  const pTopSlots = prev.settings?.topbarCapsuleSlots;
  const nTopSlots = next.settings?.topbarCapsuleSlots;
  if (
    (pTopSlots?.[0] ?? 'context') !== (nTopSlots?.[0] ?? 'context') ||
    (pTopSlots?.[1] ?? 'tps') !== (nTopSlots?.[1] ?? 'tps') ||
    (pTopSlots?.[2] ?? 'quota_auto') !== (nTopSlots?.[2] ?? 'quota_auto')
  ) {
    return false;
  }

  // 2. 比对云端状态（插件当前/最新版本、安装模式、价格表版本与模型数量、同步/更新执行状态及错误信息）
  const pCloud = prev.cloudStatus;
  const nCloud = next.cloudStatus;
  if (
    pCloud?.currentPluginVersion !== nCloud?.currentPluginVersion ||
    pCloud?.latestPluginVersion !== nCloud?.latestPluginVersion ||
    pCloud?.updateAvailable !== nCloud?.updateAvailable ||
    pCloud?.installMode !== nCloud?.installMode ||
    pCloud?.catalogVersion !== nCloud?.catalogVersion ||
    pCloud?.source !== nCloud?.source ||
    pCloud?.lastSyncedAtMs !== nCloud?.lastSyncedAtMs ||
    pCloud?.modelCount !== nCloud?.modelCount ||
    pCloud?.isSyncing !== nCloud?.isSyncing ||
    pCloud?.isUpdating !== nCloud?.isUpdating ||
    pCloud?.lastSyncError !== nCloud?.lastSyncError ||
    pCloud?.lastUpdateError !== nCloud?.lastUpdateError ||
    pCloud?.lastUpdateResult?.updatedAtMs !== nCloud?.lastUpdateResult?.updatedAtMs
  ) {
    return false;
  }

  // 3. 比对活跃会话的实时测速指标（会话 ID、步数、子代理拓扑、运行状态、TPS、TTFT、当前模型标识与费用）
  if (pAct?.cascadeId !== nAct?.cascadeId) return false;
  if (pAct?.stepCount !== nAct?.stepCount) return false;
  if (pAct?.subagentCount !== nAct?.subagentCount) return false;
  if (pAct?.totalStepsAllAgents !== nAct?.totalStepsAllAgents) return false;
  if (pAct?.isRunning !== nAct?.isRunning) return false;
  if (
    pAct?.liveActivity?.signature !== nAct?.liveActivity?.signature ||
    pAct?.liveActivity?.startedAtMs !== nAct?.liveActivity?.startedAtMs
  ) {
    return false;
  }
  if (pAct?.aggregated?.isRunning !== nAct?.aggregated?.isRunning) return false;
  if (
    pAct?.aggregated?.liveActivity?.signature !== nAct?.aggregated?.liveActivity?.signature ||
    pAct?.aggregated?.liveActivity?.startedAtMs !== nAct?.aggregated?.liveActivity?.startedAtMs
  ) {
    return false;
  }
  if (pAct?.aggregated?.liveActivity?.agentId !== nAct?.aggregated?.liveActivity?.agentId) return false;
  if (pAct?.aggregated?.activeAgentId !== nAct?.aggregated?.activeAgentId) return false;
  if (pAct?.aggregated?.activeAgentBadge !== nAct?.aggregated?.activeAgentBadge) return false;
  if (pAct?.aggregated?.latestTokPerSec !== nAct?.aggregated?.latestTokPerSec) return false;
  if (pAct?.aggregated?.latestTtftSec !== nAct?.aggregated?.latestTtftSec) return false;
  if (pAct?.aggregated?.avgTokPerSec !== nAct?.aggregated?.avgTokPerSec) return false;
  if (pAct?.aggregated?.latestStepCostUsd !== nAct?.aggregated?.latestStepCostUsd) return false;
  if (pAct?.aggregated?.sessionCostUsd !== nAct?.aggregated?.sessionCostUsd) return false;
  if (pAct?.aggregated?.sessionUnpricedCalls !== nAct?.aggregated?.sessionUnpricedCalls) return false;
  if (pAct?.aggregated?.sessionCacheHitPct !== nAct?.aggregated?.sessionCacheHitPct) return false;
  if (pAct?.aggregated?.activeModelShort !== nAct?.aggregated?.activeModelShort) return false;
  if (pAct?.aggregated?.activeModelUpstream !== nAct?.aggregated?.activeModelUpstream) return false;
  if (pAct?.aggregated?.latestCacheHitPct !== nAct?.aggregated?.latestCacheHitPct) return false;
  if (pAct?.aggregated?.latestSpeedReason !== nAct?.aggregated?.latestSpeedReason) return false;
  if (pAct?.latestTokPerSec !== nAct?.latestTokPerSec) return false;
  if (pAct?.latestTtftSec !== nAct?.latestTtftSec) return false;
  if (pAct?.avgTokPerSec !== nAct?.avgTokPerSec) return false;
  if (pAct?.latestCacheHitPct !== nAct?.latestCacheHitPct) return false;
  if (pAct?.sessionCacheHitPct !== nAct?.sessionCacheHitPct) return false;
  if (pAct?.latestSpeedReason !== nAct?.latestSpeedReason) return false;
  if (pAct?.ttftSummary?.avgSec !== nAct?.ttftSummary?.avgSec) return false;
  if (pAct?.speedSummary?.sampleCount !== nAct?.speedSummary?.sampleCount) return false;
  if (
    pAct?.activeModelShort !== nAct?.activeModelShort ||
    pAct?.activeModelLabel !== nAct?.activeModelLabel ||
    pAct?.activeModelUpstream !== nAct?.activeModelUpstream
  ) {
    return false;
  }
  if (
    pAct?.latestStepCostUsd !== nAct?.latestStepCostUsd ||
    pAct?.sessionCostUsd !== nAct?.sessionCostUsd ||
    pAct?.sessionUnpricedCalls !== nAct?.sessionUnpricedCalls
  ) {
    return false;
  }

  const pAgents = pAct?.agents || [];
  const nAgents = nAct?.agents || [];
  if (pAgents.length !== nAgents.length) return false;
  for (let i = 0; i < pAgents.length; i++) {
    const pa = pAgents[i];
    const na = nAgents[i];
    if (
      pa?.agentId !== na?.agentId ||
      pa?.role !== na?.role ||
      pa?.stepCount !== na?.stepCount ||
      pa?.isRunning !== na?.isRunning ||
      pa?.liveActivity?.signature !== na?.liveActivity?.signature ||
      pa?.latestTokPerSec !== na?.latestTokPerSec ||
      pa?.latestTtftSec !== na?.latestTtftSec ||
      pa?.avgTokPerSec !== na?.avgTokPerSec ||
      pa?.latestCacheHitPct !== na?.latestCacheHitPct ||
      pa?.sessionCacheHitPct !== na?.sessionCacheHitPct ||
      pa?.latestSpeedReason !== na?.latestSpeedReason ||
      pa?.latestStepCostUsd !== na?.latestStepCostUsd ||
      pa?.sessionCostUsd !== na?.sessionCostUsd ||
      pa?.sessionUnpricedCalls !== na?.sessionUnpricedCalls ||
      pa?.activeModelShort !== na?.activeModelShort ||
      pa?.activeModelUpstream !== na?.activeModelUpstream ||
      pa?.context?.totalTokens !== na?.context?.totalTokens ||
      pa?.context?.compactionLimitTokens !== na?.context?.compactionLimitTokens ||
      pa?.context?.limitTokens !== na?.context?.limitTokens ||
      pa?.context?.messagesTokens !== na?.context?.messagesTokens ||
      pa?.context?.toolResultsTokens !== na?.context?.toolResultsTokens ||
      pa?.context?.assistantTokens !== na?.context?.assistantTokens ||
      pa?.context?.userInputTokens !== na?.context?.userInputTokens ||
      pa?.context?.subagentTokens !== na?.context?.subagentTokens ||
      pa?.context?.checkpointTokens !== na?.context?.checkpointTokens ||
      pa?.context?.systemToolsTokens !== na?.context?.systemToolsTokens ||
      pa?.context?.mcpToolsTokens !== na?.context?.mcpToolsTokens ||
      pa?.context?.skillsTokens !== na?.context?.skillsTokens ||
      pa?.context?.systemPromptTokens !== na?.context?.systemPromptTokens ||
      pa?.context?.userRulesTokens !== na?.context?.userRulesTokens
    ) {
      return false;
    }
    const paSteps = pa?.recentSteps || [];
    const naSteps = na?.recentSteps || [];
    if (paSteps.length !== naSteps.length) return false;
    for (let j = 0; j < paSteps.length; j++) {
      const bs = paSteps[j];
      const as = naSteps[j];
      if (
        bs?.stepIndex !== as?.stepIndex ||
        bs?.modelKey !== as?.modelKey ||
        bs?.modelShort !== as?.modelShort ||
        bs?.modelLabel !== as?.modelLabel ||
        bs?.modelUpstream !== as?.modelUpstream ||
        bs?.responseModel !== as?.responseModel ||
        bs?.modelSource !== as?.modelSource ||
        bs?.costUsd !== as?.costUsd ||
        bs?.tokPerSec !== as?.tokPerSec ||
        bs?.ttftSec !== as?.ttftSec ||
        bs?.outputTokens !== as?.outputTokens ||
        bs?.inputTokens !== as?.inputTokens ||
        bs?.cacheReadTokens !== as?.cacheReadTokens ||
        bs?.selectedSpeedReason !== as?.selectedSpeedReason
      ) {
        return false;
      }
    }
  }

  // 4. 比对 10 通道上下文窗口构成及近期步骤明细
  const pCtx = pAct?.context;
  const nCtx = nAct?.context;
  if (pCtx?.totalTokens !== nCtx?.totalTokens) return false;
  if (pCtx?.compactionLimitTokens !== nCtx?.compactionLimitTokens) return false;
  if (pCtx?.limitTokens !== nCtx?.limitTokens) return false;
  if (pCtx?.messagesTokens !== nCtx?.messagesTokens) return false;
  if (pCtx?.assistantTokens !== nCtx?.assistantTokens) return false;
  if (pCtx?.toolResultsTokens !== nCtx?.toolResultsTokens) return false;
  if (pCtx?.userInputTokens !== nCtx?.userInputTokens) return false;
  if (pCtx?.subagentTokens !== nCtx?.subagentTokens) return false;
  if (pCtx?.checkpointTokens !== nCtx?.checkpointTokens) return false;
  if (pCtx?.systemToolsTokens !== nCtx?.systemToolsTokens) return false;
  if (pCtx?.mcpToolsTokens !== nCtx?.mcpToolsTokens) return false;
  if (pCtx?.skillsTokens !== nCtx?.skillsTokens) return false;
  if (pCtx?.systemPromptTokens !== nCtx?.systemPromptTokens) return false;
  if (pCtx?.userRulesTokens !== nCtx?.userRulesTokens) return false;
  if ((pAct?.recentSteps?.length || 0) !== (nAct?.recentSteps?.length || 0)) return false;
  for (let i = 0; i < (pAct?.recentSteps?.length || 0); i++) {
    const before = pAct.recentSteps[i], after = nAct.recentSteps[i];
    if (
      before.modelKey !== after.modelKey ||
      before.modelShort !== after.modelShort ||
      before.modelLabel !== after.modelLabel ||
      before.modelUpstream !== after.modelUpstream ||
      before.responseModel !== after.responseModel ||
      before.modelSource !== after.modelSource ||
      before.costUsd !== after.costUsd ||
      before.tokPerSec !== after.tokPerSec ||
      before.ttftSec !== after.ttftSec ||
      before.outputTokens !== after.outputTokens ||
      before.inputTokens !== after.inputTokens ||
      before.cacheReadTokens !== after.cacheReadTokens ||
      before.selectedSpeedReason !== after.selectedSpeedReason
    ) {
      return false;
    }
  }

  // 5. 比对消费统计所选时间区间、当前会话累计消费与账号全局累计消费
  const pRange = prev.consumption?.selectedRange;
  const nRange = next.consumption?.selectedRange;
  if (pRange?.key !== nRange?.key) return false;
  if (nRange?.key === 'custom') {
    if (pRange?.startMs !== nRange?.startMs || pRange?.endMs !== nRange?.endMs) return false;
  }

  const pCons = prev.consumption?.session;
  const nCons = next.consumption?.session;
  if (pCons?.totalTokens !== nCons?.totalTokens) return false;
  if (pCons?.costUsd !== nCons?.costUsd) return false;
  if (pCons?.unpricedCalls !== nCons?.unpricedCalls) return false;

  const pAcct = prev.consumption?.account;
  const nAcct = next.consumption?.account;
  if (pAcct?.totalTokens !== nAcct?.totalTokens) return false;
  if (pAcct?.inputTokens !== nAcct?.inputTokens) return false;
  if (pAcct?.cacheReadTokens !== nAcct?.cacheReadTokens) return false;
  if (pAcct?.outputTokens !== nAcct?.outputTokens) return false;
  if (pAcct?.calls !== nAcct?.calls) return false;
  if (pAcct?.costUsd !== nAcct?.costUsd) return false;
  if (pAcct?.savedCostUsd !== nAcct?.savedCostUsd) return false;
  if (pAcct?.cacheHitPct !== nAcct?.cacheHitPct) return false;
  if (pAcct?.unpricedCalls !== nAcct?.unpricedCalls) return false;

  // 6. 比对历史趋势时间分桶序列与年度分月序列
  const pTrend = prev.consumption?.trendSeries || [];
  const nTrend = next.consumption?.trendSeries || [];
  if (pTrend.length !== nTrend.length) return false;
  for (let i = 0; i < pTrend.length; i++) {
    if (
      pTrend[i]?.tokens !== nTrend[i]?.tokens ||
      pTrend[i]?.calls !== nTrend[i]?.calls ||
      pTrend[i]?.label !== nTrend[i]?.label ||
      pTrend[i]?.fullLabel !== nTrend[i]?.fullLabel
    ) {
      return false;
    }
  }
  if (prev.consumption?.monthlyYear !== next.consumption?.monthlyYear) return false;
  const pMonthly = prev.consumption?.monthlySeries || [];
  const nMonthly = next.consumption?.monthlySeries || [];
  if (pMonthly.length !== nMonthly.length) return false;
  for (let i = 0; i < pMonthly.length; i++) {
    if (
      pMonthly[i]?.totalTokens !== nMonthly[i]?.totalTokens ||
      pMonthly[i]?.costUsd !== nMonthly[i]?.costUsd ||
      pMonthly[i]?.calls !== nMonthly[i]?.calls
    ) {
      return false;
    }
  }

  // 7. 比对按模型汇总明细与数据来源汇总明细
  const pModels = prev.modelBreakdown || [];
  const nModels = next.modelBreakdown || [];
  if (pModels.length !== nModels.length) return false;
  for (let i = 0; i < pModels.length; i++) {
    if (
      pModels[i]?.label !== nModels[i]?.label ||
      pModels[i]?.shortName !== nModels[i]?.shortName ||
      pModels[i]?.upstreamName !== nModels[i]?.upstreamName ||
      pModels[i]?.costUsd !== nModels[i]?.costUsd ||
      pModels[i]?.unpricedCalls !== nModels[i]?.unpricedCalls ||
      pModels[i]?.totalTokens !== nModels[i]?.totalTokens ||
      pModels[i]?.calls !== nModels[i]?.calls
    ) {
      return false;
    }
  }

  const pSources = prev.consumption?.sourcesBreakdown || [];
  const nSources = next.consumption?.sourcesBreakdown || [];
  if (pSources.length !== nSources.length) return false;
  for (let i = 0; i < pSources.length; i++) {
    if (
      pSources[i]?.name !== nSources[i]?.name ||
      pSources[i]?.costUsd !== nSources[i]?.costUsd ||
      pSources[i]?.unpricedCalls !== nSources[i]?.unpricedCalls ||
      pSources[i]?.totalTokens !== nSources[i]?.totalTokens ||
      pSources[i]?.calls !== nSources[i]?.calls
    ) {
      return false;
    }
  }

  // 8. 比对账号订阅档位与动态多配额池（活跃池、周汇总及各配额池的 5h/周限额进度与重置时间）
  if (
    prev.account?.tierName !== next.account?.tierName ||
    prev.account?.planName !== next.account?.planName ||
    prev.account?.aiCredits !== next.account?.aiCredits
  ) {
    return false;
  }

  if (
    prev.quotas?.meta?.refreshFailed !== next.quotas?.meta?.refreshFailed ||
    prev.quotas?.meta?.isStale !== next.quotas?.meta?.isStale
  ) {
    return false;
  }

  const pQuot = prev.quotas?.activePool;
  const nQuot = next.quotas?.activePool;
  if (pQuot?.family !== nQuot?.family) return false;
  if (pQuot?.usedPct !== nQuot?.usedPct) return false;
  if (pQuot?.remainingPct !== nQuot?.remainingPct) return false;
  if (pQuot?.weeklyUsedPct !== nQuot?.weeklyUsedPct) return false;
  if (pQuot?.weeklyRemainingPct !== nQuot?.weeklyRemainingPct) return false;
  if (prev.quotas?.weekly?.usedPct !== next.quotas?.weekly?.usedPct) return false;
  if (prev.quotas?.weekly?.remainingPct !== next.quotas?.weekly?.remainingPct) return false;
  if (prev.quotas?.weekly?.tokens !== next.quotas?.weekly?.tokens) return false;
  if (prev.quotas?.weekly?.costUsd !== next.quotas?.weekly?.costUsd) return false;
  if (prev.quotas?.weekly?.calls !== next.quotas?.weekly?.calls) return false;
  if (prev.quotas?.weekly?.unpricedCalls !== next.quotas?.weekly?.unpricedCalls) return false;
  if (prev.quotas?.weekly?.resetTime !== next.quotas?.weekly?.resetTime) return false;

  const pPools = prev.quotas?.pools || [];
  const nPools = next.quotas?.pools || [];
  if (pPools.length !== nPools.length) return false;
  for (let i = 0; i < pPools.length; i++) {
    if (
      pPools[i]?.poolKey !== nPools[i]?.poolKey ||
      pPools[i]?.poolLabel !== nPools[i]?.poolLabel ||
      pPools[i]?.usedPct !== nPools[i]?.usedPct ||
      pPools[i]?.remainingPct !== nPools[i]?.remainingPct ||
      pPools[i]?.resetTime !== nPools[i]?.resetTime ||
      pPools[i]?.weeklyUsedPct !== nPools[i]?.weeklyUsedPct ||
      pPools[i]?.weeklyRemainingPct !== nPools[i]?.weeklyRemainingPct ||
      pPools[i]?.weeklyResetTime !== nPools[i]?.weeklyResetTime
    ) {
      return false;
    }
  }

  const pConvs = prev.conversations || [];
  const nConvs = next.conversations || [];
  if (pConvs.length !== nConvs.length) return false;
  for (let i = 0; i < pConvs.length; i++) {
    if (
      pConvs[i]?.cascadeId !== nConvs[i]?.cascadeId ||
      pConvs[i]?.title !== nConvs[i]?.title ||
      pConvs[i]?.status !== nConvs[i]?.status ||
      pConvs[i]?.stepCount !== nConvs[i]?.stepCount ||
      pConvs[i]?.subagentCount !== nConvs[i]?.subagentCount ||
      pConvs[i]?.totalStepCount !== nConvs[i]?.totalStepCount
    ) {
      return false;
    }
  }

  const pRunning = prev.runningConversations || [];
  const nRunning = next.runningConversations || [];
  if (pRunning.length !== nRunning.length) return false;
  for (let i = 0; i < pRunning.length; i++) {
    const pr = pRunning[i];
    const nr = nRunning[i];
    if (
      pr?.cascadeId !== nr?.cascadeId ||
      pr?.title !== nr?.title ||
      pr?.isCurrentSelected !== nr?.isCurrentSelected ||
      pr?.isMainRunning !== nr?.isMainRunning ||
      pr?.subagentCount !== nr?.subagentCount ||
      pr?.runningSubagentCount !== nr?.runningSubagentCount ||
      pr?.mainActivity?.signature !== nr?.mainActivity?.signature ||
      pr?.mainActivity?.startedAtMs !== nr?.mainActivity?.startedAtMs
    ) {
      return false;
    }
    const pSubs = pr?.subagents || [];
    const nSubs = nr?.subagents || [];
    if (pSubs.length !== nSubs.length) return false;
    for (let j = 0; j < pSubs.length; j++) {
      if (
        pSubs[j]?.cascadeId !== nSubs[j]?.cascadeId ||
        pSubs[j]?.role !== nSubs[j]?.role ||
        pSubs[j]?.isRunning !== nSubs[j]?.isRunning ||
        pSubs[j]?.stepCount !== nSubs[j]?.stepCount ||
        pSubs[j]?.liveActivity?.signature !== nSubs[j]?.liveActivity?.signature ||
        pSubs[j]?.liveActivity?.startedAtMs !== nSubs[j]?.liveActivity?.startedAtMs
      ) {
        return false;
      }
    }
  }

  return true;
}

async function fetchTelemetry({ force = false } = {}) {
  if (!force && activeForceCount > 0) {
    return telemetryStore.getState().telemetry;
  }

  const st = telemetryStore.getState();
  const reqSeq = ++latestRequestSeq;
  const startMs = Date.now();

  if (force) {
    activeForceCount += 1;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    telemetryStore.setState({ syncState: 'syncing' });
  }

  try {
    if (isWindowOverlayMode()) {
      const liveRouteId = extractHostRouteCascadeId();
      if (liveRouteId !== st.hostRouteConversationId) {
        const patch = { hostRouteConversationId: liveRouteId };
        if (liveRouteId && st.selectedConversationId && st.selectedConversationId !== liveRouteId) {
          patch.selectedConversationId = '';
        }
        telemetryStore.setState(patch);
      }
    }
    const curSt = telemetryStore.getState();
    const effectiveConvId = curSt.selectedConversationId || curSt.hostRouteConversationId || '';
    const params = new URLSearchParams();
    if (effectiveConvId) {
      params.set('conversationId', effectiveConvId);
    }
    if (curSt.selectedTimeRange) {
      params.set('range', curSt.selectedTimeRange);
    }
    if (curSt.selectedTimeRange === 'custom') {
      if (curSt.customStartMs > 0) params.set('startMs', String(curSt.customStartMs));
      if (curSt.customEndMs > 0) params.set('endMs', String(curSt.customEndMs));
    }
    if (force) {
      params.set('force', '1');
    }
    const qs = params.toString();
    const payload = await callSidecarApi(`/api/telemetry${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      abortKey: force ? 'telemetry-force' : 'telemetry-poll',
    });

    if (reqSeq !== latestRequestSeq) {
      return payload;
    }

    if (payload?.uiBundleVersion) {
      if (activeBundleVersion && activeBundleVersion !== payload.uiBundleVersion) {
        if (
          !isWindowOverlayMode() &&
          typeof window !== 'undefined' &&
          typeof window.location?.reload === 'function'
        ) {
          window.location.reload();
          return payload;
        }
      }
      activeBundleVersion = payload.uiBundleVersion;
    }

    const latestSt = telemetryStore.getState();
    if (force) {
      const elapsed = Date.now() - startMs;
      if (elapsed < 220) {
        await new Promise((r) => setTimeout(r, 220 - elapsed));
      }
      if (reqSeq !== latestRequestSeq) {
        return payload;
      }
      if (feedbackTimer) clearTimeout(feedbackTimer);
      telemetryStore.setState({
        telemetry: payload,
        minuteTick: Math.floor(Date.now() / 30000),
        syncState: 'synced',
      });
      feedbackTimer = setTimeout(() => {
        feedbackTimer = null;
        telemetryStore.setState({ syncState: 'idle' });
      }, 1100);
    } else {
      const isSame = isEquivalentTelemetry(latestSt.telemetry, payload);
      const nextTelemetry = isSame ? latestSt.telemetry : payload;
      telemetryStore.setState({
        telemetry: nextTelemetry,
        minuteTick: Math.floor(Date.now() / 30000),
        syncState: latestSt.syncState === 'synced' ? 'synced' : 'idle',
      });
    }
    return payload;
  } catch (err) {
    if (err?.name === 'AbortError' || reqSeq !== latestRequestSeq) return null;
    telemetryStore.setState({ syncState: 'error' });
    return null;
  } finally {
    if (force) {
      activeForceCount = Math.max(0, activeForceCount - 1);
      if (activeForceCount === 0 && loopActive && loopTickFn && !pollTimer) {
        pollTimer = setTimeout(loopTickFn, loopIntervalMs);
      }
    }
  }
}

async function saveSettingsPatch(patch) {
  const safePatch = patch && typeof patch === 'object' ? { ...patch } : {};
  if (Object.prototype.hasOwnProperty.call(safePatch, 'weeklyLimitMode')) {
    const mode = safePatch.weeklyLimitMode;
    safePatch.weeklyLimitMode =
      mode === 'custom_tokens' || mode === 'custom_cost' ? mode : 'official';
  }
  if (Object.prototype.hasOwnProperty.call(safePatch, 'orchestratorIdMode')) {
    safePatch.orchestratorIdMode = normalizeClientOrchestratorIdMode(safePatch.orchestratorIdMode);
  }
  if (Object.prototype.hasOwnProperty.call(safePatch, 'showTopbarMultiSession')) {
    safePatch.showTopbarMultiSession = Boolean(safePatch.showTopbarMultiSession);
  }
  if (Object.prototype.hasOwnProperty.call(safePatch, 'topbarCapsuleSlots')) {
    safePatch.topbarCapsuleSlots = normalizeClientTopbarSlots(safePatch.topbarCapsuleSlots);
  }
  const prevTelemetry = telemetryStore.getState().telemetry;
  if (prevTelemetry?.settings) {
    telemetryStore.setState({
      telemetry: {
        ...prevTelemetry,
        settings: { ...prevTelemetry.settings, ...safePatch },
      },
    });
  }
  try {
    await callSidecarApi('/api/settings', { method: 'POST', body: safePatch });
  } catch (err) {
    if (prevTelemetry) {
      telemetryStore.setState({ telemetry: prevTelemetry });
    }
    throw err;
  }
  await fetchTelemetry({ force: true });
}

async function triggerCloudSync() {
  const res = await callSidecarApi('/api/cloud-sync', { method: 'POST', body: {} });
  await fetchTelemetry({ force: true });
  return res;
}

async function triggerPluginUpdate() {
  const res = await callSidecarApi('/api/plugin-update', { method: 'POST', body: {} });
  if (res?.ok && res?.restarting) {
    await new Promise((r) => setTimeout(r, 1100));
    if (
      !isWindowOverlayMode() &&
      typeof window !== 'undefined' &&
      typeof window.location?.reload === 'function'
    ) {
      window.location.reload();
      return res;
    }
  }
  await fetchTelemetry({ force: true });
  return res;
}

function startAsyncTelemetryLoop(intervalMs = 2000) {
  stopAsyncTelemetryLoop();
  loopActive = true;
  loopIntervalMs = intervalMs;

  const resolveNextDelay = () => {
    if (isWindowOverlayMode() && typeof document !== 'undefined' && document.hidden) {
      return Math.max(loopIntervalMs, 8000);
    }
    return loopIntervalMs;
  };

  const tick = async () => {
    pollTimer = null;
    if (!loopActive) return;
    await fetchTelemetry({ force: false });
    if (!loopActive || activeForceCount > 0) return;
    if (!pollTimer) {
      pollTimer = setTimeout(tick, resolveNextDelay());
    }
  };
  loopTickFn = tick;

  tick();
  return () => {
    stopAsyncTelemetryLoop();
  };
}

function stopAsyncTelemetryLoop() {
  loopActive = false;
  loopTickFn = null;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
}

/**
 * 根据代理索引返回对应的微边框语义徽章样式类名。
 *
 * @param {number} [index=0]
 * @param {boolean} [isMain=false]
 * @returns {string}
 */
function getAgentBadgeClass(index = 0, isMain = false) {
  if (isMain || index <= 0) return 'badge-main';
  const slot = ((index - 1) % 3) + 1;
  return `badge-sub-${slot}`;
}

/**
 * 格式化主/子代理的完整显示名称（如 `子代理 #1 · Codebase Researcher`）。
 *
 * @param {object|null|undefined} agent
 * @returns {string}
 */
function formatAgentLabel(agent) {
  if (!agent) return '主代理';
  if (agent.isMain) return agent.shortLabel || '主代理';
  const rolePart = agent.role && agent.role !== '子代理' ? ` · ${agent.role}` : '';
  return `${agent.shortLabel || '子代理'}${rolePart}`;
}

/**
 * 解析当前选中的主/子代理作用域视图数据与独立上下文窗口检视目标。
 * 同时在客户端按需组装主代理与全部汇总的 `recentSteps`，避免后端 JSON 载荷重复序列化 2-3 倍步骤列表。
 *
 * @param {object|null} telemetry
 * @param {string} [selectedAgentScope='all']
 * @param {string} [ctxInspectorAgentId='auto']
 */
function resolveScopedConversation(
  telemetry,
  selectedAgentScope = 'all',
  ctxInspectorAgentId = 'auto'
) {
  const active = telemetry?.activeConversation || {};
  const agents = Array.isArray(active.agents) && active.agents.length > 0 ? active.agents : [];
  const hasSubagents = Boolean(active.hasSubagents && agents.length > 1);
  const subagents = agents.filter((a) => !a.isMain);
  const mainAgent = agents.find((a) => a.isMain) || active;
  if (mainAgent && !Array.isArray(mainAgent.recentSteps) && Array.isArray(active.recentSteps)) {
    mainAgent.recentSteps = active.recentSteps;
  }
  const aggregated = active.aggregated || active;
  if (hasSubagents && aggregated && !Array.isArray(aggregated.recentSteps)) {
    const combined = [];
    for (const ag of agents) {
      const steps = ag.isMain ? ag.recentSteps || active.recentSteps || [] : ag.recentSteps || [];
      combined.push(...steps);
    }
    combined.sort(
      (a, b) =>
        (b.createdAtMs || 0) - (a.createdAtMs || 0) ||
        (b.agentIndex || 0) - (a.agentIndex || 0) ||
        (b.stepIndex || 0) - (a.stepIndex || 0)
    );
    aggregated.recentSteps = combined;
  }

  if (!hasSubagents) {
    return {
      hasSubagents: false,
      effectiveScope: 'main',
      effectiveCtxScope: 'main',
      agents,
      subagents: [],
      mainAgent,
      aggregated,
      scopedConv: active,
      ctxAgent: mainAgent,
    };
  }

  const isValidSub = subagents.some((s) => s.agentId === selectedAgentScope);
  const effectiveScope =
    selectedAgentScope === 'main'
      ? 'main'
      : isValidSub
        ? selectedAgentScope
        : 'all';

  const scopedConv =
    effectiveScope === 'all'
      ? aggregated
      : agents.find((a) => a.agentId === effectiveScope) || mainAgent;

  let ctxAgent = scopedConv;
  let effectiveCtxScope = effectiveScope;
  if (effectiveScope === 'all') {
    if (ctxInspectorAgentId && ctxInspectorAgentId !== 'auto') {
      const matched = agents.find((a) => a.agentId === ctxInspectorAgentId);
      if (matched) {
        ctxAgent = matched;
        effectiveCtxScope = matched.agentId;
      } else {
        effectiveCtxScope = 'auto';
      }
    } else {
      effectiveCtxScope = 'auto';
    }
    if (effectiveCtxScope === 'auto') {
      ctxAgent =
        agents.find((a) => a.agentId === aggregated.activeAgentId) ||
        agents.find((a) => a.isRunning) ||
        mainAgent;
    }
  }

  return {
    hasSubagents: true,
    effectiveScope,
    effectiveCtxScope,
    agents,
    subagents,
    mainAgent,
    aggregated,
    scopedConv,
    ctxAgent,
  };
}

// --- src/components/ui/TopLongPillNav.js ---
/**
 * @fileoverview Top Long-Pill Navigation Bar (顶部唯一长药丸功能分割栏).
 * Splits the application into focused single-viewport views and animates
 * the active glider using GPU-accelerated translate3d.
 */


const TopLongPillNav = defineComponent({
  name: 'TopLongPillNav',
  setup({ getProps, emit }) {
    const glider = h('div', { className: 'pill-glider', 'aria-hidden': 'true' });
    const navEl = h(
      'nav',
      {
        className: 'long-pill-nav',
        role: 'tablist',
        'aria-label': '主功能视图分割导航',
      },
      [glider]
    );

    const tabButtons = new Map();

    function selectValue(nextVal) {
      const current = getProps().modelValue;
      if (nextVal !== current) {
        emit('update:modelValue', nextVal);
      }
    }

    function syncTabs() {
      const { items = [], modelValue } = getProps();
      patchStyleVar(navEl, '--pill-count', Math.max(1, items.length));

      const validValues = new Set(items.map((it) => it.value));
      for (const [val, entry] of tabButtons.entries()) {
        if (!validValues.has(val)) {
          if (entry.btn?.parentNode === navEl) {
            navEl.removeChild(entry.btn);
          }
          tabButtons.delete(val);
        }
      }

      let activeIdx = 0;
      items.forEach((item, index) => {
        if (item.value === modelValue) {
          activeIdx = index;
        }
        let entry = tabButtons.get(item.value);
        if (!entry) {
          const iconEl = item.icon ? createSvgIcon(item.icon, { size: 14 }) : null;
          const labelEl = h('span', { className: 'pill-tab-label', text: item.label });
          const badgeEl = h('span', { className: 'pill-tab-badge', hidden: true });
          const btn = h(
            'button',
            {
              type: 'button',
              role: 'tab',
              className: 'pill-tab',
              dataset: { pillValue: item.value },
              onClick: () => selectValue(item.value),
              onKeydown: (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const curItems = getProps().items || [];
                  if (!curItems.length) return;
                  const curIndex = Math.max(
                    0,
                    curItems.findIndex((it) => it.value === item.value)
                  );
                  const delta = e.key === 'ArrowRight' ? 1 : -1;
                  const nextIndex = (curIndex + delta + curItems.length) % curItems.length;
                  const target = curItems[nextIndex];
                  if (target) {
                    selectValue(target.value);
                    tabButtons.get(target.value)?.btn?.focus();
                  }
                }
              },
            },
            [iconEl, labelEl, badgeEl]
          );
          entry = { btn, labelEl, badgeEl };
          tabButtons.set(item.value, entry);
          navEl.appendChild(btn);
        }

        patchText(entry.labelEl, item.label);
        if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
          patchAttr(entry.badgeEl, 'hidden', false);
          patchText(entry.badgeEl, `(${item.badge})`);
        } else {
          patchAttr(entry.badgeEl, 'hidden', true);
        }

        const isActive = item.value === modelValue;
        patchClasses(entry.btn, { 'is-active': isActive });
        patchAttr(entry.btn, 'aria-selected', isActive ? 'true' : 'false');
        patchAttr(entry.btn, 'tabindex', isActive ? '0' : '-1');
      });

      patchStyleVar(navEl, '--active-index', activeIdx);
    }

    syncTabs();

    return {
      el: navEl,
      refs: { glider, tabButtons },
      onPropsChange: syncTabs,
      getValue: () => getProps().modelValue,
    };
  },
});

// --- src/components/ui/CustomSelect.js ---
/**
 * @fileoverview Bespoke CustomSelect dropdown component replacing native <select> / <option>.
 * Supports incremental option patching while open without losing focus or closing the menu.
 */


const CustomSelect = defineComponent({
  name: 'CustomSelect',
  setup({ getProps, setProps, emit, onCleanup }) {
    let isOpen = false;
    let focusedIndex = -1;

    const initialIcon = getProps().icon;
    const leadIcon = createSvgIcon(initialIcon || 'bolt', { size: 13 });
    patchAttr(leadIcon, 'hidden', !initialIcon);
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

    const initialClass = ['custom-select', getProps().className].filter(Boolean).join(' ');
    const rootEl = h('div', { className: initialClass }, [triggerBtn, menuEl]);

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
        setProps({ modelValue: option.value });
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
          menuEl.children[focusedIndex]?.scrollIntoView?.({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          toggleOpen(true);
        } else {
          focusedIndex = (focusedIndex - 1 + opts.length) % opts.length;
          renderMenuOptions();
          menuEl.children[focusedIndex]?.scrollIntoView?.({ block: 'nearest' });
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
      const { options = [], modelValue, placeholder = '请选择', icon } = getProps();
      patchAttr(leadIcon, 'hidden', !icon);
      if (icon) {
        patchSvgIcon(leadIcon, icon);
      }
      const matchedOpt = options.find((o) => o.value === modelValue);
      const selectedOpt = matchedOpt || (!modelValue ? options[0] : undefined);
      const fallbackText = modelValue ? `${placeholder} (${String(modelValue).slice(0, 8)})` : placeholder;
      const labelText = selectedOpt ? selectedOpt.label : fallbackText;
      patchText(triggerLabel, labelText);
      patchAttr(triggerBtn, 'title', labelText);
      if (isOpen) {
        renderMenuOptions();
      }
    }

    const handleDocClick = (e) => {
      if (isOpen && !isEventInside(e, rootEl)) {
        toggleOpen(false);
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('click', handleDocClick, true);
      onCleanup(() => document.removeEventListener('click', handleDocClick, true));
    }

    syncTriggerAndMenu();

    return {
      el: rootEl,
      refs: { triggerBtn, triggerLabel, menuEl },
      onPropsChange: syncTriggerAndMenu,
      methods: {
        close: () => toggleOpen(false),
      },
    };
  },
});

// --- src/components/ui/CustomNumberInput.js ---
/**
 * @fileoverview Bespoke CustomNumberInput spinbutton & precision stepper.
 * Replaces native <input type="number"> with custom SVG step controls,
 * keyboard ArrowUp/ArrowDown (+Shift 10x), and min/max clamping.
 */


const CustomNumberInput = defineComponent({
  name: 'CustomNumberInput',
  setup({ getProps, setProps, emit }) {
    function clampValue(raw) {
      const { min = -Infinity, max = Infinity, precision = 0 } = getProps();
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return Number(getProps().modelValue ?? (Number.isFinite(min) ? min : 0));
      }
      const clamped = Math.min(max, Math.max(min, num));
      return precision > 0 ? Number(clamped.toFixed(precision)) : Math.round(clamped);
    }

    function applyStep(direction, multiplier = 1) {
      const { step = 1, modelValue = 0 } = getProps();
      const current = Number(modelValue) || 0;
      const next = clampValue(current + direction * step * multiplier);
      syncFieldDisplay(next);
      if (next !== current) {
        setProps({ modelValue: next });
        emit('update:modelValue', next);
      }
    }

    const decBtn = h(
      'button',
      {
        type: 'button',
        className: 'num-step-btn',
        'aria-label': '减少数值',
        onClick: (e) => {
          e.preventDefault();
          applyStep(-1, e.shiftKey ? 10 : 1);
        },
      },
      [createSvgIcon('minus', { size: 12 })]
    );

    const incBtn = h(
      'button',
      {
        type: 'button',
        className: 'num-step-btn',
        'aria-label': '增加数值',
        onClick: (e) => {
          e.preventDefault();
          applyStep(1, e.shiftKey ? 10 : 1);
        },
      },
      [createSvgIcon('plus', { size: 12 })]
    );

    const textField = h('input', {
      type: 'text',
      inputmode: 'decimal',
      role: 'spinbutton',
      className: 'num-field',
      onKeydown: (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          applyStep(1, e.shiftKey ? 10 : 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          applyStep(-1, e.shiftKey ? 10 : 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          commitManualInput();
        }
      },
      onBlur: () => commitManualInput(),
    });

    function commitManualInput() {
      const raw = String(textField.value ?? '').trim();
      if (!raw || !/\d/.test(raw)) {
        syncFieldDisplay(getProps().modelValue);
        return;
      }
      const cleaned = raw.replace(/[^0-9.-]/g, '');
      const parsed = Number(cleaned);
      if (!Number.isFinite(parsed)) {
        syncFieldDisplay(getProps().modelValue);
        return;
      }
      const next = clampValue(parsed);
      const prev = Number(getProps().modelValue);
      syncFieldDisplay(next);
      if (next !== prev) {
        setProps({ modelValue: next });
        emit('update:modelValue', next);
      }
    }

    function syncFieldDisplay(val = getProps().modelValue) {
      const { min, max } = getProps();
      const normalized = clampValue(val);
      if (textField.value !== String(normalized)) {
        textField.value = String(normalized);
      }
      patchAttr(textField, 'aria-valuenow', normalized);
      if (Number.isFinite(min)) patchAttr(textField, 'aria-valuemin', min);
      if (Number.isFinite(max)) patchAttr(textField, 'aria-valuemax', max);
    }

    const rootEl = h('div', { className: 'number-input' }, [decBtn, textField, incBtn]);
    syncFieldDisplay();

    return {
      el: rootEl,
      refs: { decBtn, incBtn, textField },
      onPropsChange: () => syncFieldDisplay(),
      methods: {
        commit: () => commitManualInput(),
      },
    };
  },
});

// --- src/components/ui/CustomDateTimePicker.js ---
/**
 * @fileoverview Bespoke CustomDateTimePicker calendar matrix and hour/minute stepper.
 * Replaces native <input type="datetime-local"> and emits Unix epoch ms.
 */


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

const CustomDateTimePicker = defineComponent({
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
        cur.setHours(cur.getHours() + delta);
      } else {
        cur.setMinutes(cur.getMinutes() + delta);
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
      if (isOpen && !isEventInside(e, rootEl)) {
        togglePopover(false);
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('click', handleDocClick, true);
      onCleanup(() => document.removeEventListener('click', handleDocClick, true));
    }

    syncDisplay();

    return {
      el: rootEl,
      refs: { triggerBtn, triggerText, popoverEl, daysGrid, hourValSpan, minValSpan },
      onPropsChange: syncDisplay,
    };
  },
});

// --- src/components/ui/CustomScrollbar.js ---
/**
 * @fileoverview Bespoke custom scrollbar component (零原生滚动条).
 * Hides native OS scrollbars completely and renders a precision 4px floating
 * rail + GPU-translated thumb with drag and track-jump support.
 */


const CustomScrollbar = defineComponent({
  name: 'CustomScrollbar',
  setup({ getProps, onCleanup }) {
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

    let pendingSync = false;
    function scheduleSyncThumb() {
      if (typeof queueMicrotask === 'function') {
        if (pendingSync) return;
        pendingSync = true;
        queueMicrotask(() => {
          pendingSync = false;
          syncThumb();
        });
      } else {
        syncThumb();
      }
    }

    return {
      el: hostEl,
      refs: { contentEl, railEl, thumbEl },
      onPropsChange: scheduleSyncThumb,
      methods: {
        refresh() {
          scheduleSyncThumb();
        },
      },
    };
  },
});

// --- src/components/ui/SegmentedControl.js ---
/**
 * @fileoverview Micro-bezel (2px radius) SegmentedControl switcher
 * for time-range filtering, context limit selection, and sub-table switching.
 */


const SegmentedControl = defineComponent({
  name: 'SegmentedControl',
  setup({ getProps, setProps, emit }) {
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
                setProps({ modelValue: opt.value });
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

// --- src/components/ui/ContextSegmentMeter.js ---
/**
 * @fileoverview 10-channel segmented context window progress bar updated via
 * CSS custom variables against the current model's automatic compaction baseline,
 * dynamically ordered from largest to smallest segment.
 */


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

const ContextSegmentMeter = defineComponent({
  name: 'ContextSegmentMeter',
  setup({ getProps }) {
    // 固定 10 个位置槽位节点，不通过 appendChild 移动 DOM，防止浏览器中断 CSS transition 动画
    const slotEls = SEGMENT_DEFS.map((def) =>
      h('div', { className: `progress-seg ${def.cls}` })
    );

    const trackEl = h(
      'div',
      {
        className: 'progress-track',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
      },
      slotEls
    );

    let lastOrderSig = '';

    function syncMeter() {
      const ctx = getProps().context || {};
      const limit = Math.max(1, Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000));
      const scored = SEGMENT_DEFS.map((def, defaultOrder) => {
        const val = def.getVal(ctx);
        const pct = Math.min(100, (val / limit) * 100);
        return { def, defaultOrder, val, pct };
      });

      scored.sort((a, b) => b.val - a.val || a.defaultOrder - b.defaultOrder);
      // 仅关注非零通道的相对顺序变化，决定是否启用 0.05s 先变色再伸缩的衔接延迟
      const activeOrderSig = scored
        .filter((x) => x.val > 0)
        .map((x) => x.def.key)
        .join(',');
      const orderChanged = Boolean(lastOrderSig && activeOrderSig && activeOrderSig !== lastOrderSig);
      if (activeOrderSig) {
        lastOrderSig = activeOrderSig;
      }

      patchClasses(trackEl, { 'is-reordering': orderChanged });

      for (let i = 0; i < slotEls.length; i++) {
        const slotEl = slotEls[i];
        const item = scored[i];
        patchAttr(slotEl, 'class', `progress-seg ${item.def.cls}`);
        patchStyleVar(slotEl, '--seg-w', `${item.pct.toFixed(2)}%`);
      }

      patchAttr(trackEl, 'aria-valuenow', Math.round(ctx.compactionUsedPct ?? ctx.usedPct ?? 0));
    }

    syncMeter();

    return {
      el: trackEl,
      refs: { segments: slotEls },
      onPropsChange: syncMeter,
    };
  },
});

// --- src/components/ui/FourSegmentBar.js ---
/**
 * @fileoverview 通用 4 段式 Token 构成比例条组件 (FourSegmentBar).
 * 用于在消费概览、热门模型明细及数据来源明细中直观展示：
 * 直接输入 (Input)、缓存读取 (Cached)、内容生成 (Output) 与思考推理 (Thinking) 的 Token 占比。
 */


/**
 * 创建 4 段式水平比例进度条实例。
 * 通过动态更新各分段节点的 `--seg-w` CSS 变量实现零重排平滑过渡。
 *
 * @returns {{
 *   el: HTMLElement,
 *   update: (metrics: {
 *     inputTokens?: number,
 *     cacheReadTokens?: number,
 *     responseTokens?: number,
 *     thinkingTokens?: number
 *   }) => void
 * }} 组件根元素与增量更新方法
 */
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

  /**
   * 根据四类 Token 数量重新计算并写入各分段百分比宽度。
   */
  function update({ inputTokens = 0, cacheReadTokens = 0, responseTokens = 0, thinkingTokens = 0 }) {
    const total = Math.max(1, inputTokens + cacheReadTokens + responseTokens + thinkingTokens);
    patchStyleVar(segInput, '--seg-w', `${((inputTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segCached, '--seg-w', `${((cacheReadTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segOutput, '--seg-w', `${((responseTokens / total) * 100).toFixed(2)}%`);
    patchStyleVar(segThinking, '--seg-w', `${((thinkingTokens / total) * 100).toFixed(2)}%`);
  }

  return { el, update };
}

// --- src/components/charts/TrendAreaChart.js ---
/**
 * @fileoverview 交互式 SVG 三次贝塞尔平滑曲线趋势图组件 (TrendAreaChart).
 * 支持：
 * 1. 自适应整点小时（<=72h）与自然日（>72h）高精度分桶序列渲染；
 * 2. 鼠标悬停/滑动十字准星探针、高亮圆点与自适应防溢出的悬浮详情卡片（精确日期/小时区间、Token 拆分、费用与调用次数）；
 * 3. 与 SVG 垂直网格线像素级对齐的多刻度底部时间轴（彻底告别首/中/末简单对半切分）。
 */


let chartUidCounter = 0;

function safeSlotTokens(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * 将二维采样点序列转换为水平张力平滑的三次贝塞尔曲线 SVG 路径 (`M ... C ...`)。
 * 控制点沿 X 轴取相邻点间距的 `0.42` 张力系数，Y 轴与各自端点齐平，
 * 保证曲线在极值点处平缓过渡且不会产生上下过冲 (Overshoot)。
 *
 * @param {Array<{ x: number, y: number }>} points SVG 坐标系下的采样点数组（长度 >= 2）
 * @returns {string} SVG `<path>` 的 `d` 属性字符串
 */
function buildSmoothSplinePath(points) {
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.42;
    const cpx2 = p1.x - (p1.x - p0.x) * 0.42;
    d += ` C ${cpx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cpx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

/**
 * 根据分桶总数与标签平均长度，计算底部 X 轴应当展示的均匀刻度下标列表。
 *
 * @param {Array<{ label?: string }>} slots
 * @returns {number[]}
 */
function computeTickIndices(slots) {
  const n = slots.length;
  if (n <= 1) return [0];
  if (n <= 8) {
    return Array.from({ length: n }, (_, i) => i);
  }
  const sampleLabel = String(slots[Math.floor(n / 2)]?.label || slots[0]?.label || '');
  const maxTicks = sampleLabel.length > 6 ? 5 : 6;
  const set = new Set();
  for (let k = 0; k < maxTicks; k++) {
    const idx = Math.round((k / (maxTicks - 1)) * (n - 1));
    set.add(idx);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * 创建交互式 SVG 历史趋势平滑面积图组件。
 *
 * @returns {{
 *   el: HTMLElement,
 *   update: (series?: Array<object>) => void
 * }}
 */
function createTrendAreaChart() {
  const VIEW_W = 460;
  const VIEW_H = 120;
  const LEFT_X = 14;
  const RIGHT_X = 446;
  const TOP_Y = 24;
  const BOTTOM_Y = 102;
  const SPAN_X = RIGHT_X - LEFT_X;
  const SPAN_Y = BOTTOM_Y - TOP_Y;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('class', 'trend-svg');
  svg.setAttribute('aria-hidden', 'true');

  // 垂直线性渐变（每实例独立 ID，避免多图表挂载时 SVG url(#...) 冲突）
  const gradId = `trend-area-grad-${++chartUidCounter}`;
  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', 'var(--ctx-cached)');
  stop1.setAttribute('stop-opacity', '0.34');

  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', 'var(--ctx-cached)');
  stop2.setAttribute('stop-opacity', '0.0');

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  // 背景水平与垂直参考网格线
  const hGridGroup = document.createElementNS(SVG_NS, 'g');
  hGridGroup.setAttribute('class', 'trend-grid');
  for (const y of [TOP_Y, Math.round((TOP_Y + BOTTOM_Y) / 2), BOTTOM_Y]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(LEFT_X));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(RIGHT_X));
    line.setAttribute('y2', String(y));
    hGridGroup.appendChild(line);
  }
  svg.appendChild(hGridGroup);

  const vGridGroup = document.createElementNS(SVG_NS, 'g');
  vGridGroup.setAttribute('class', 'trend-grid trend-v-grid');
  svg.appendChild(vGridGroup);

  const areaPath = document.createElementNS(SVG_NS, 'path');
  areaPath.setAttribute('fill', `url(#${gradId})`);
  svg.appendChild(areaPath);

  const linePath = document.createElementNS(SVG_NS, 'path');
  linePath.setAttribute('class', 'trend-line');
  linePath.setAttribute('fill', 'none');
  svg.appendChild(linePath);

  const dotsGroup = document.createElementNS(SVG_NS, 'g');
  dotsGroup.setAttribute('class', 'trend-dots-group');
  svg.appendChild(dotsGroup);

  const peakDot = document.createElementNS(SVG_NS, 'circle');
  peakDot.setAttribute('r', '3');
  peakDot.setAttribute('class', 'trend-peak-dot');
  svg.appendChild(peakDot);

  // 悬停十字准星与焦点圆点
  const hoverLine = document.createElementNS(SVG_NS, 'line');
  hoverLine.setAttribute('class', 'trend-hover-line');
  hoverLine.setAttribute('y1', '12');
  hoverLine.setAttribute('y2', String(BOTTOM_Y));
  hoverLine.setAttribute('hidden', 'true');
  svg.appendChild(hoverLine);

  const hoverDot = document.createElementNS(SVG_NS, 'circle');
  hoverDot.setAttribute('r', '3.2');
  hoverDot.setAttribute('class', 'trend-hover-dot');
  hoverDot.setAttribute('hidden', 'true');
  svg.appendChild(hoverDot);

  const peakPill = h('span', { className: 'trend-peak-pill text-mono', text: '0' });

  // 悬停详情浮层卡片
  const tipTimeEl = h('span', { className: 'trend-tip-time text-mono' });
  const tipCallsEl = h('span', { className: 'trend-tip-calls text-mono' });
  const tipTokensEl = h('strong', { className: 'trend-tip-tokens text-mono' });
  const tipCostEl = h('span', { className: 'trend-tip-cost text-mono' });
  const tipSubEl = h('div', { className: 'trend-tip-sub text-mono', hidden: true });

  const tooltipEl = h(
    'div',
    { className: 'trend-tooltip', hidden: true },
    [
      h('div', { className: 'trend-tip-head' }, [tipTimeEl, tipCallsEl]),
      h('div', { className: 'trend-tip-main' }, [tipTokensEl, tipCostEl]),
      tipSubEl,
    ]
  );

  // 底部对齐刻度轴
  const xAxisEl = h('div', { className: 'trend-x-axis' });

  const plotStage = h('div', { className: 'trend-plot-stage' }, [peakPill, tooltipEl, svg]);
  const chartWrap = h('div', { className: 'trend-chart-wrap' }, [plotStage, xAxisEl]);

  let currentSlots = [];
  let currentPts = [];
  let tickElsByIdx = new Map();
  let hoveredIdx = -1;
  let lastRenderSig = '';

  function showHoverAtIndex(idx) {
    if (idx < 0 || idx >= currentSlots.length || !currentPts[idx]) {
      clearHover();
      return;
    }
    hoveredIdx = idx;
    const slot = currentSlots[idx];
    const pt = currentPts[idx];

    patchAttr(hoverLine, 'hidden', false);
    patchAttr(hoverLine, 'x1', pt.x.toFixed(1));
    patchAttr(hoverLine, 'x2', pt.x.toFixed(1));

    patchAttr(hoverDot, 'hidden', false);
    patchAttr(hoverDot, 'cx', pt.x.toFixed(1));
    patchAttr(hoverDot, 'cy', pt.y.toFixed(1));

    patchAttr(peakPill, 'hidden', true);
    patchAttr(tooltipEl, 'hidden', false);

    patchText(tipTimeEl, slot.fullLabel || slot.label || '--');
    patchText(tipCallsEl, `${Math.max(0, Math.floor(Number(slot.calls) || 0))} 次`);
    const slotTok = safeSlotTokens(slot.tokens);
    patchText(tipTokensEl, `${formatTokensPrecise(slotTok)} tok`);
    const slotCost = Number.isFinite(Number(slot.costUsd)) ? Math.max(0, Number(slot.costUsd)) : 0;
    patchText(
      tipCostEl,
      formatUsd(slotCost, {
        precise: slotCost > 0 && slotCost < 0.1,
      })
    );

    const hasSubBreakdown =
      slotTok > 0 &&
      (slot.inputTokens !== undefined ||
        slot.cacheReadTokens !== undefined ||
        slot.outputTokens !== undefined);
    patchAttr(tipSubEl, 'hidden', !hasSubBreakdown);
    if (hasSubBreakdown) {
      patchText(
        tipSubEl,
        `入 ${formatTokensPrecise(safeSlotTokens(slot.inputTokens))} · 缓 ${formatTokensPrecise(safeSlotTokens(slot.cacheReadTokens))} · 出 ${formatTokensPrecise(safeSlotTokens(slot.outputTokens))}`
      );
    }

    const rawPct = (pt.x / VIEW_W) * 100;
    const clampedPct = Math.max(2, Math.min(98, rawPct));
    const shiftX = rawPct < 28 ? '0%' : rawPct > 72 ? '-100%' : '-50%';
    patchStyleVar(tooltipEl, '--tip-x', `${clampedPct.toFixed(1)}%`);
    patchStyleVar(tooltipEl, '--tip-shift', shiftX);

    for (const [tIdx, el] of tickElsByIdx.entries()) {
      patchClasses(el, { 'is-hovered': tIdx === idx });
    }
  }

  function clearHover() {
    hoveredIdx = -1;
    patchAttr(hoverLine, 'hidden', true);
    patchAttr(hoverDot, 'hidden', true);
    patchAttr(tooltipEl, 'hidden', true);
    patchAttr(peakPill, 'hidden', false);
    for (const el of tickElsByIdx.values()) {
      patchClasses(el, { 'is-hovered': false });
    }
  }

  function handlePointerMove(e) {
    if (!currentSlots.length) return;
    const rect = svg.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const ratio = (relX - LEFT_X) / Math.max(1, SPAN_X);
    const idx = Math.max(
      0,
      Math.min(currentSlots.length - 1, Math.round(ratio * (currentSlots.length - 1)))
    );
    showHoverAtIndex(idx);
  }

  plotStage.addEventListener('mousemove', handlePointerMove);
  plotStage.addEventListener('mouseleave', clearHover);

  /**
   * 根据最新时间分桶序列重绘平滑曲线、渐变区域、峰值气泡与底部对齐刻度。
   */
  function update(series = []) {
    const slots =
      Array.isArray(series) && series.length >= 1
        ? series
        : [
            { label: '00:00', fullLabel: '00:00 - 01:00', tokens: 0, calls: 0, costUsd: 0 },
            { label: '06:00', fullLabel: '06:00 - 07:00', tokens: 0, calls: 0, costUsd: 0 },
            { label: '12:00', fullLabel: '12:00 - 13:00', tokens: 0, calls: 0, costUsd: 0 },
            { label: '18:00', fullLabel: '18:00 - 19:00', tokens: 0, calls: 0, costUsd: 0 },
          ];
    currentSlots = slots;

    let maxTokens = 0;
    let peakIdx = 0;
    for (let i = 0; i < slots.length; i++) {
      const t = safeSlotTokens(slots[i]?.tokens);
      if (t >= maxTokens) {
        maxTokens = t;
        peakIdx = i;
      }
    }

    const denom = Math.max(1, maxTokens);
    const isSingle = slots.length === 1;
    const pts = slots.map((s, idx) => {
      const tok = safeSlotTokens(s?.tokens);
      const x = isSingle ? (LEFT_X + RIGHT_X) / 2 : LEFT_X + (idx / Math.max(1, slots.length - 1)) * SPAN_X;
      const ratio = maxTokens > 0 ? tok / denom : 0;
      const y = BOTTOM_Y - ratio * SPAN_Y;
      return { x, y, tokens: tok };
    });
    currentPts = pts;

    const sig = slots
      .map((s) => `${s?.label || ''}:${s?.fullLabel || ''}:${safeSlotTokens(s?.tokens)}:${Number(s?.costUsd || 0)}:${Number(s?.calls || 0)}`)
      .join('|');

    if (sig !== lastRenderSig) {
      lastRenderSig = sig;
      let lineD;
      let areaD;
      if (isSingle) {
        const yStr = pts[0].y.toFixed(1);
        lineD = `M ${LEFT_X.toFixed(1)} ${yStr} L ${RIGHT_X.toFixed(1)} ${yStr}`;
        areaD = `${lineD} L ${RIGHT_X.toFixed(1)} ${BOTTOM_Y} L ${LEFT_X.toFixed(1)} ${BOTTOM_Y} Z`;
      } else {
        lineD = buildSmoothSplinePath(pts);
        areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${BOTTOM_Y} L ${pts[0].x.toFixed(1)} ${BOTTOM_Y} Z`;
      }
      patchAttr(linePath, 'd', lineD);
      patchAttr(areaPath, 'd', areaD);

      // 渲染与底部刻度对齐的垂直参考网格线及底部 X 轴标签
      const tickIndices = computeTickIndices(slots);
      while (vGridGroup.firstChild) vGridGroup.removeChild(vGridGroup.firstChild);
      while (xAxisEl.firstChild) xAxisEl.removeChild(xAxisEl.firstChild);
      tickElsByIdx = new Map();

      for (let i = 0; i < tickIndices.length; i++) {
        const tIdx = tickIndices[i];
        const pt = pts[tIdx];
        const slot = slots[tIdx];
        if (!pt || !slot) continue;

        if (i > 0 && i < tickIndices.length - 1) {
          const vLine = document.createElementNS(SVG_NS, 'line');
          vLine.setAttribute('x1', pt.x.toFixed(1));
          vLine.setAttribute('y1', '16');
          vLine.setAttribute('x2', pt.x.toFixed(1));
          vLine.setAttribute('y2', String(BOTTOM_Y));
          vGridGroup.appendChild(vLine);
        }

        const isFirst = !isSingle && i === 0;
        const isLast = !isSingle && i === tickIndices.length - 1;
        const pct = (pt.x / VIEW_W) * 100;
        const tickEl = h('span', {
          className: `trend-x-tick text-mono${isFirst ? ' is-start' : isLast ? ' is-end' : ''}`,
          text: slot.label || '',
          title: slot.fullLabel || slot.label || '',
        });
        patchStyleVar(tickEl, '--tick-x', `${pct.toFixed(2)}%`);
        tickEl.onclick = () => showHoverAtIndex(tIdx);
        xAxisEl.appendChild(tickEl);
        tickElsByIdx.set(tIdx, tickEl);
      }

      // 渲染采样点小圆点（当点数 <= 36 时展示，突出有消耗的整点/日期）
      while (dotsGroup.firstChild) dotsGroup.removeChild(dotsGroup.firstChild);
      if (pts.length <= 36) {
        for (let i = 0; i < pts.length; i++) {
          if (pts[i].tokens <= 0) continue;
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', pts[i].x.toFixed(1));
          dot.setAttribute('cy', pts[i].y.toFixed(1));
          dot.setAttribute('r', '2');
          dot.setAttribute('class', 'trend-node-dot');
          dotsGroup.appendChild(dot);
        }
      }
    }

    const peakPt = pts[peakIdx] || { x: 230, y: BOTTOM_Y };
    patchAttr(peakDot, 'cx', peakPt.x.toFixed(1));
    patchAttr(peakDot, 'cy', peakPt.y.toFixed(1));

    const peakSlot = slots[peakIdx];
    const peakText =
      maxTokens > 0 && peakSlot?.label
        ? `峰值 ${peakSlot.label} · ${formatTokensPrecise(maxTokens)}`
        : formatTokensPrecise(maxTokens);
    patchText(peakPill, peakText);
    const pctLeft = Math.max(12, Math.min(88, (peakPt.x / VIEW_W) * 100));
    patchStyleVar(peakPill, '--peak-x', `${pctLeft.toFixed(1)}%`);

    if (hoveredIdx >= slots.length) {
      clearHover();
    } else if (hoveredIdx >= 0) {
      showHoverAtIndex(hoveredIdx);
    }
  }

  return { el: chartWrap, update };
}

// --- src/components/layout/TopSessionHeader.js ---
/**
 * @fileoverview Row 1 of the compact top bar:
 * Bespoke CustomSelect for session switching, SVG live status indicator,
 * and async force-refresh button.
 */


function formatConvOptionMeta(c) {
  if (!c) return '';
  const subs = Number(c.subagentCount || 0);
  if (subs > 0) {
    return `主${c.stepCount || 0} · ${subs}子 (共${c.totalStepCount || c.stepCount || 0}步)`;
  }
  return `${c.stepCount || 0}步`;
}

const TopSessionHeader = defineComponent({
  name: 'TopSessionHeader',
  setup({ onCleanup }) {
    const convSelect = CustomSelect({
      modelValue: telemetryStore.getState().selectedConversationId,
      placeholder: '跟随最新会话',
      options: [{ value: '', label: '跟随最新会话' }],
      onUpdateModelValue: (nextConvId) => {
        uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
        telemetryStore.setState({ selectedConversationId: nextConvId });
        fetchTelemetry({ force: false });
      },
    });

    const updateBtnIcon = createSvgIcon('arrow-down', { size: 11 });
    const updateBtnText = h('span', { text: '有新版本' });
    let isHeaderUpdating = false;
    const updateBtn = h(
      'button',
      {
        type: 'button',
        className: 'update-badge-btn',
        hidden: true,
        'aria-label': '发现新版本，点击升级',
        onClick: async () => {
          if (isHeaderUpdating) return;
          isHeaderUpdating = true;
          patchText(updateBtnText, '升级中…');
          patchAttr(updateBtn, 'disabled', true);
          try {
            const res = await triggerPluginUpdate();
            if (!res?.ok) {
              uiStore.setState({ activeView: 'settings' });
            }
          } catch {
            uiStore.setState({ activeView: 'settings' });
          } finally {
            isHeaderUpdating = false;
            patchAttr(updateBtn, 'disabled', false);
            const cs = telemetryStore.getState().telemetry?.cloudStatus;
            patchText(
              updateBtnText,
              cs?.latestPluginVersion ? `升级 v${cs.latestPluginVersion}` : '有新版本'
            );
          }
        },
      },
      [updateBtnIcon, updateBtnText]
    );

    const statusIcon = createSvgIcon('pulse', { size: 12 });
    const statusText = h('span', { text: '实时 2s' });
    const statusTag = h('span', { className: 'status-tag' }, [statusIcon, statusText]);

    const refreshBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '刷新数据',
        onClick: () => fetchTelemetry({ force: true }),
      },
      [createSvgIcon('refresh', { size: 13 })]
    );

    const headerRowEl = h('div', { className: 'session-header' }, [
      h('div', { className: 'session-left' }, [convSelect.el]),
      h('div', { className: 'session-right' }, [updateBtn, statusTag, refreshBtn]),
    ]);

    const headerEl = h('header', { className: 'top-session-stack' }, [headerRowEl]);

    let lastActiveCascadeId = '';

    function renderHeaderState() {
      const telSt = telemetryStore.getState();
      const uiSt = uiStore.getState();
      const telemetry = telSt.telemetry;
      const currentCascadeId = telemetry?.activeConversation?.cascadeId || '';
      if (currentCascadeId && lastActiveCascadeId && currentCascadeId !== lastActiveCascadeId) {
        lastActiveCascadeId = currentCascadeId;
        if (uiSt.selectedAgentScope !== 'all' || uiSt.ctxInspectorAgentId !== 'auto') {
          uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
          return;
        }
      } else if (currentCascadeId) {
        lastActiveCascadeId = currentCascadeId;
      }

      const actConv = telemetry?.activeConversation;
      const convs = telemetry?.conversations || [];
      const hostRouteId = telSt.hostRouteConversationId || '';
      const hostMatchedConv = hostRouteId
        ? convs.find((c) => c.cascadeId === hostRouteId) ||
          (actConv?.cascadeId === hostRouteId ? actConv : null)
        : null;
      const defaultOptLabel = hostRouteId
        ? hostMatchedConv?.title
          ? `当前窗口 (${hostMatchedConv.title})`
          : `当前窗口 (${hostRouteId.slice(0, 8)})`
        : convs[0]?.title
          ? `最新 (${convs[0].title})`
          : '跟随最新会话';
      const defaultOptMeta = hostRouteId
        ? hostMatchedConv
          ? formatConvOptionMeta({
              stepCount: hostMatchedConv.stepCount,
              subagentCount: hostMatchedConv.subagentCount,
              totalStepCount: hostMatchedConv.totalStepCount ?? hostMatchedConv.totalStepsAllAgents,
            })
          : ''
        : convs[0]
          ? formatConvOptionMeta(convs[0])
          : '';
      const options = [
        { value: '', label: defaultOptLabel, meta: defaultOptMeta },
        ...convs.map((c) => ({
          value: c.cascadeId,
          label: c.title || c.cascadeId.slice(0, 8),
          meta: formatConvOptionMeta(c),
        })),
      ];
      const lockedId = telSt.selectedConversationId;
      if (lockedId && !convs.some((c) => c.cascadeId === lockedId)) {
        const isLoadedLocked = actConv?.cascadeId === lockedId;
        const lockedTitle =
          isLoadedLocked && actConv?.title
            ? actConv.title
            : `已锁定会话 (${String(lockedId).slice(0, 8)})`;
        const lockedMeta = isLoadedLocked
          ? formatConvOptionMeta({
              stepCount: actConv.stepCount,
              subagentCount: actConv.subagentCount,
              totalStepCount: actConv.totalStepsAllAgents,
            })
          : '已锁定';
        options.splice(1, 0, {
          value: lockedId,
          label: lockedTitle,
          meta: lockedMeta,
        });
      }
      convSelect.setProps({
        modelValue: telSt.selectedConversationId,
        options,
      });

      const hasSubagents = Boolean(actConv?.hasSubagents || (actConv?.subagentCount || 0) > 0);
      const aggregated = actConv?.aggregated;

      const cloudStatus = telemetry?.cloudStatus;
      const updateMode = normalizeClientUpdateMode(
        telemetry?.settings?.pluginUpdateMode,
        telemetry?.settings?.autoUpdatePlugin
      );
      const showUpdate = Boolean(cloudStatus?.updateAvailable) && updateMode !== 'off';
      patchAttr(updateBtn, 'hidden', !showUpdate);
      if (showUpdate && !isHeaderUpdating) {
        patchText(
          updateBtnText,
          cloudStatus?.latestPluginVersion
            ? `升级 v${cloudStatus.latestPluginVersion}`
            : '有新版本'
        );
      }

      const isSyncing = telSt.syncState === 'syncing';
      const isSynced = telSt.syncState === 'synced';
      const isError = telSt.syncState === 'error';
      const isRunning = Boolean(aggregated?.isRunning || telemetry?.activeConversation?.isRunning);
      const quotaMeta = telemetry?.quotas?.meta;
      const quotaStale = Boolean(quotaMeta?.refreshFailed || quotaMeta?.isStale);

      patchClasses(refreshBtn, { 'is-spinning': isSyncing });
      patchAttr(refreshBtn, 'disabled', isSyncing);

      if (isSyncing) {
        patchSvgIcon(statusIcon, 'refresh');
        patchText(statusText, '同步中');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': true,
          'state-warn': false,
        });
      } else if (isSynced) {
        patchSvgIcon(statusIcon, 'check');
        patchText(statusText, '已刷新');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': true,
          'state-warn': false,
        });
      } else if (isError) {
        patchSvgIcon(statusIcon, 'warning');
        patchText(statusText, '重试中');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': true,
        });
      } else if (isRunning) {
        const runningAgent = (telemetry?.activeConversation?.agents || []).find((a) => a.isRunning);
        const runSuffix =
          hasSubagents && runningAgent ? ` · ${runningAgent.badgeText || runningAgent.shortLabel}` : '';
        patchSvgIcon(statusIcon, 'bolt');
        patchText(statusText, `生成中${runSuffix}`);
        patchClasses(statusTag, {
          'state-running': true,
          'state-synced': false,
          'state-warn': false,
        });
      } else if (quotaStale) {
        patchSvgIcon(statusIcon, 'warning');
        patchText(statusText, quotaMeta?.hasOfficialData ? '额度缓存' : '额度离线');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': true,
        });
      } else {
        patchSvgIcon(statusIcon, 'pulse');
        patchText(statusText, '实时 2s');
        patchClasses(statusTag, {
          'state-running': false,
          'state-synced': false,
          'state-warn': false,
        });
      }
    }

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        selectedConversationId: st.selectedConversationId,
        hostRouteConversationId: st.hostRouteConversationId,
        syncState: st.syncState,
        telemetry: st.telemetry,
      }),
      () => renderHeaderState()
    );

    onCleanup(() => {
      unsubTelemetry();
      convSelect.destroy();
    });

    return {
      el: headerEl,
      refs: { convSelect, statusTag, refreshBtn },
    };
  },
});

// --- src/views/LiveOverviewView.js ---
/**
 * @fileoverview View 1: LiveOverviewView (实时监控视图).
 * 负责展示当前活跃会话的核心实时遥测指标：
 * 1. 4 格实时测速矩阵：实时吞吐 (TPS)、首 Token 延迟 (TTFT)、会话有效加权均速与本步费用/缓存命中率；
 * 2. 10 通道上下文窗口构成：自动锚定当前模型的上下文压缩基线 (`compactionLimitTokens`)，
 *    通过 10 段进度条与双列图例展示模型回复、工具结果、用户消息、子代理通知、压缩摘要及系统提示词/工具/MCP/Skill/规则的 Token 占用；
 * 3. 动态多配额池监控卡片：支持 Gemini、Pro 订阅专属独立 Argon/Carbon 周配额池、Claude & GPT 等动态配额池，
 *    自动适配 5h/每周双窗口或单窗口模式，并展示本机周累计消耗与 AI 积分脚标。
 */


const PILL_BASE_PAD_PX = 14;
const CJK_CHAR_PX = 11;
const ASCII_CHAR_PX = 6.1;
const PILL_GAP_PX = 4;
const DEFAULT_BAR_WIDTH_PX = 310;

function estPillWidth(text) {
  let w = PILL_BASE_PAD_PX;
  for (const ch of String(text || '')) {
    w += ch.charCodeAt(0) > 255 ? CJK_CHAR_PX : ASCII_CHAR_PX;
  }
  return Math.ceil(w);
}

/**
 * 10 通道上下文窗口构成定义（供实时监控主视图与主窗口顶栏悬停概览卡共享）。
 */
const CTX_CHANNEL_DEFS = [
  {
    key: 'assistant',
    label: '模型回复',
    segClass: 'seg-assistant',
    title: '模型推理思考、回复正文与工具调用入参',
    getValue: (c) => Number(c.assistantTokens || 0),
  },
  {
    key: 'toolResults',
    label: '工具结果',
    segClass: 'seg-tool-results',
    title: '文件读取、终端输出与工具执行返回内容',
    getValue: (c) => Number(c.toolResultsTokens || 0),
  },
  {
    key: 'userInput',
    label: '用户消息',
    segClass: 'seg-user-input',
    title: '用户提问文本与上传附件',
    getValue: (c) => Number(c.userInputTokens ?? c.messagesTokens ?? 0),
  },
  {
    key: 'subagent',
    label: '子代理通知',
    segClass: 'seg-subagent-msg',
    title: '子代理完成汇报与后台任务系统通知',
    getValue: (c) => Number(c.subagentTokens || 0),
  },
  {
    key: 'checkpoint',
    label: '压缩摘要',
    segClass: 'seg-checkpoint',
    title: '自动上下文压缩生成的历史摘要检查点',
    getValue: (c) => Number(c.checkpointTokens || 0),
  },
  {
    key: 'systemPrompt',
    label: '系统提示词',
    segClass: 'seg-system-prompt',
    title: '核心身份、终端沙箱、制品与环境提示词',
    getValue: (c) => Number(c.systemPromptTokens || 0),
  },
  {
    key: 'systemTools',
    label: '系统工具',
    segClass: 'seg-system-tools',
    title: '内置系统工具 Schema 定义',
    getValue: (c) => Number(c.systemToolsTokens || 0),
  },
  {
    key: 'mcpTools',
    label: 'MCP 工具',
    segClass: 'seg-mcp-tools',
    title: 'MCP 外部服务工具与资源定义',
    getValue: (c) => Number(c.mcpToolsTokens || 0),
  },
  {
    key: 'skills',
    label: 'Skill',
    segClass: 'seg-skills',
    title: '已挂载的 Skills 技能索引与说明',
    getValue: (c) => Number(c.skillsTokens || 0),
  },
  {
    key: 'userRules',
    label: '用户规则',
    segClass: 'seg-user-rules',
    title: '全局与工作区自定义规则 (user_rules)',
    getValue: (c) => Number(c.userRulesTokens || 0),
  },
];

/**
 * 归一化动态配额池列表；在官方配额尚未返回时回退预占 Gemini 与 Claude & GPT 两个标准池槽位。
 *
 * @param {object|null|undefined} quotas
 * @param {number} minuteTick
 * @param {{ isPending?: boolean }} [options]
 * @returns {Array<object>}
 */
function buildQuotaPoolItems(quotas, minuteTick = 0, { isPending = false } = {}) {
  const safeQuotas = quotas || {};
  const activePool = safeQuotas.activePool || {};
  const rawPools =
    Array.isArray(safeQuotas.pools) && safeQuotas.pools.length > 0
      ? safeQuotas.pools
      : [
          { poolKey: 'Gemini', poolLabel: 'Gemini', family: 'Gemini' },
          { poolKey: 'Claude & GPT', poolLabel: 'Claude & GPT', family: 'Claude & GPT' },
        ];
  const weekly = safeQuotas.weekly || {};
  const poolItems = rawPools.map((p) => {
    const key = p.poolKey || p.family || p.poolLabel || 'Other';
    const poolLabel = p.poolLabel || p.family || key;
    const isActivePool =
      Boolean(activePool.family) &&
      (activePool.poolKey === key ||
        activePool.family === p.family ||
        (key === 'Claude & GPT' && ['Claude', 'GPT'].includes(activePool.family)));
    return {
      key,
      poolLabel,
      poolData: p,
      fallbackWeekly: weekly,
      isActivePool,
      minuteTick,
      isPending,
    };
  });
  if (
    weekly?.isOfficial === false &&
    poolItems.length > 0 &&
    !poolItems.some((item) => item.isActivePool)
  ) {
    poolItems[0].isActivePool = true;
  }
  return poolItems;
}

/**
 * 创建单个配额池的 DOM 行结构，内含 5h 限额与每周限额两个可独立显隐的子窗口进度条。
 */
function createPoolQuotaRow() {
  const title5h = h('span', { text: '5h 限额' });
  const meta5h = h('span', { className: 'panel-meta text-mono', text: '--' });
  const fill5h = h('div', { className: 'progress-fill' });
  const row5h = h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
    h('div', { className: 'panel-header' }, [title5h, meta5h]),
    h('div', { className: 'progress-track' }, [fill5h]),
  ]);

  const titleWk = h('span', { text: '每周限额' });
  const metaWk = h('span', { className: 'panel-meta text-mono', text: '--' });
  const fillWk = h('div', { className: 'progress-fill' });
  const rowWk = h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
    h('div', { className: 'panel-header' }, [titleWk, metaWk]),
    h('div', { className: 'progress-track' }, [fillWk]),
  ]);

  const el = h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, [
    row5h,
    rowWk,
  ]);

  return {
    el,
    refs: { row5h, title5h, meta5h, fill5h, rowWk, titleWk, metaWk, fillWk },
  };
}

/**
 * 同步单个配额池行的 5h 与每周窗口状态：
 * - 对于仅有周限额的独立配额池（例如 Google AI Pro 账号下的 Argon 池或 Plus 档位）自动隐藏 5h 行；
 * - 对于仅有 5h 限额的配额池自动隐藏每周行；
 * - 若两个窗口均无数据（首次加载或拉取失败），同时保留两行以维持预占高度不跳动。
 */
function syncPoolQuotaRow(refs, item, idx, rowEl) {
  const { poolData, poolLabel, fallbackWeekly, isActivePool, isPending } = item;
  patchAttr(
    rowEl,
    'style',
    idx === 0
      ? 'display: flex; flex-direction: column; gap: 8px;'
      : 'display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-hairline);'
  );

  const has5h = poolData?.usedPct != null && poolData?.remainingPct != null;
  const used5hVal = has5h ? Number(poolData.usedPct) : 0;
  const rem5hVal = has5h ? Number(poolData.remainingPct) : 0;

  const useCustomWeekly = Boolean(isActivePool && fallbackWeekly?.isOfficial === false);
  const wkUsedRaw = useCustomWeekly
    ? fallbackWeekly?.usedPct
    : poolData?.weeklyUsedPct ?? (isActivePool ? fallbackWeekly?.usedPct : null);
  const wkRemRaw = useCustomWeekly
    ? fallbackWeekly?.remainingPct
    : poolData?.weeklyRemainingPct ?? (isActivePool ? fallbackWeekly?.remainingPct : null);
  const wkResetRaw = useCustomWeekly
    ? fallbackWeekly?.resetTime || poolData?.weeklyResetTime
    : poolData?.weeklyResetTime || (isActivePool ? fallbackWeekly?.resetTime : null);
  const hasWk = wkUsedRaw != null && wkRemRaw != null;
  const usedWkVal = hasWk ? Number(wkUsedRaw) : 0;
  const remWkVal = hasWk ? Number(wkRemRaw) : 0;

  // 在单窗口配额池（如 Pro 账号独立 Argon 周配额池或仅 5h 池）中隐藏不适用的另一窗口
  const hide5h = !has5h && hasWk;
  const hideWk = !hasWk && has5h;
  refs.row5h.hidden = hide5h;
  refs.row5h.style.display = hide5h ? 'none' : 'flex';
  refs.rowWk.hidden = hideWk;
  refs.rowWk.style.display = hideWk ? 'none' : 'flex';

  const fallbackMetaText = isPending ? '读取中...' : '获取失败 (--%)';

  patchText(refs.title5h, `5h 限额 (${poolLabel})`);
  patchText(
    refs.meta5h,
    has5h
      ? `${formatCountdown(poolData.resetTime)} · 已用 ${used5hVal.toFixed(1)}% (余 ${rem5hVal.toFixed(1)}%)`
      : fallbackMetaText
  );
  patchStyleVar(refs.fill5h, '--fill-w', `${Math.min(100, used5hVal)}%`);
  patchClasses(refs.fill5h, {
    'tone-warn': used5hVal >= 60 && used5hVal < 85,
    'tone-danger': used5hVal >= 85,
  });

  const customTitle =
    isActivePool && fallbackWeekly?.isOfficial === false && fallbackWeekly?.title
      ? fallbackWeekly.title
      : `每周限额 (${poolLabel})`;
  patchText(refs.titleWk, customTitle);
  patchText(
    refs.metaWk,
    hasWk
      ? `${formatCountdown(wkResetRaw)} · 已用 ${usedWkVal.toFixed(1)}% (余 ${remWkVal.toFixed(1)}%)`
      : fallbackMetaText
  );
  patchStyleVar(refs.fillWk, '--fill-w', `${Math.min(100, usedWkVal)}%`);
  patchClasses(refs.fillWk, {
    'tone-warn': usedWkVal >= 60 && usedWkVal < 85,
    'tone-danger': usedWkVal >= 85,
  });
}

function quotaPoolRowSig(item, idx) {
  return `${idx}:${item.poolLabel}:${item.isActivePool}:${Boolean(item.isPending)}:${item.minuteTick}:${item.poolData?.usedPct}:${item.poolData?.remainingPct}:${item.poolData?.resetTime}:${item.poolData?.weeklyUsedPct}:${item.poolData?.weeklyRemainingPct}:${item.poolData?.weeklyResetTime}:${item.fallbackWeekly?.isOfficial}:${item.fallbackWeekly?.usedPct}:${item.fallbackWeekly?.remainingPct}:${item.fallbackWeekly?.resetTime}:${item.fallbackWeekly?.title}`;
}

const LiveOverviewView = defineComponent({
  name: 'LiveOverviewView',
  setup({ onCleanup }) {
    // --- 0. 可用额度下方的多任务实时运行卡片列表 (展示所有正在运行的主进程 + 默认主代理缩略 + 可折叠子代理列表) ---
    const liveActivityBar = h('div', {
      className: 'live-activity-list',
      hidden: true,
      'aria-live': 'polite',
    });

    const expandedTaskConvIds = new Set();
    const activityTimersMap = new Map();
    let liveTickTimer = null;
    let countdownTickTimer = null;

    function bindLiveElapsedTimer(timerKey, sig, rawStartMs, targetEl) {
      const now = Date.now();
      const prev = activityTimersMap.get(timerKey);
      let startMs = prev?.startMs || 0;
      if (!prev || prev.sig !== sig) {
        const validRaw = Number(rawStartMs || 0);
        startMs = validRaw > 0 && validRaw <= now + 2000 ? validRaw : now;
      } else if (startMs <= 0 && Number(rawStartMs) > 0 && Number(rawStartMs) <= now + 2000) {
        startMs = Number(rawStartMs);
      }
      activityTimersMap.set(timerKey, { sig, startMs, el: targetEl });
      const elapsedSec = Math.max(0, (now - startMs) / 1000);
      patchText(targetEl, formatElapsedSec(elapsedSec));
    }

    function updateLiveElapsedDisplay() {
      const now = Date.now();
      for (const entry of activityTimersMap.values()) {
        if (!entry?.el) continue;
        const elapsedSec = entry.startMs > 0 ? Math.max(0, (now - entry.startMs) / 1000) : 0;
        patchText(entry.el, formatElapsedSec(elapsedSec));
      }
    }

    function pauseLiveTicker() {
      if (liveTickTimer) {
        clearInterval(liveTickTimer);
        liveTickTimer = null;
      }
    }

    function stopLiveTicker() {
      pauseLiveTicker();
      activityTimersMap.clear();
    }

    function ensureLiveTicker() {
      if (uiStore.getState().activeView !== 'overview' || activityTimersMap.size === 0) {
        pauseLiveTicker();
        return;
      }
      if (!liveTickTimer) {
        liveTickTimer = setInterval(updateLiveElapsedDisplay, 1000);
      }
    }

    function stopCountdownTicker() {
      if (countdownTickTimer) {
        clearInterval(countdownTickTimer);
        countdownTickTimer = null;
      }
    }

    function ensureCountdownTicker() {
      if (uiStore.getState().activeView !== 'overview') {
        stopCountdownTicker();
        return;
      }
      if (!countdownTickTimer) {
        countdownTickTimer = setInterval(() => {
          if (uiStore.getState().activeView === 'overview' && latestData) {
            renderData(latestData);
          }
        }, 30_000);
      }
    }

    function createLiveTaskCard() {
      const dotIcon = createSvgIcon('dot', { size: 11 });
      patchClasses(dotIcon, { 'is-pulsing': true });
      const dotWrap = h('span', { className: 'live-activity-dot' }, [dotIcon]);
      const titleEl = h('strong', { className: 'live-task-title', text: '当前会话' });
      const subToggleBtn = h('button', {
        type: 'button',
        className: 'live-sub-toggle',
        hidden: true,
        text: '子代理 (0) ▸',
      });
      const elapsedEl = h('span', {
        className: 'live-activity-elapsed text-mono',
        text: '0s',
      });

      const headerEl = h('div', { className: 'live-task-header' }, [
        h('div', { className: 'live-task-title-wrap' }, [dotWrap, titleEl]),
        h('div', { className: 'live-task-header-right' }, [subToggleBtn, elapsedEl]),
      ]);

      const mainBadge = h('span', {
        className: 'agent-badge badge-main',
        hidden: true,
        text: '主',
      });
      const mainPhase = h('strong', { className: 'live-activity-phase', text: '推理中' });
      const mainProgress = h('span', {
        className: 'live-activity-progress text-mono',
        hidden: true,
        text: '',
      });
      const mainSep = h('span', { className: 'live-activity-sep', hidden: true, text: '·' });
      const mainDetail = h('span', {
        className: 'live-activity-detail',
        hidden: true,
        text: '',
      });

      const mainRowEl = h('div', { className: 'live-task-main-row' }, [
        mainBadge,
        mainPhase,
        mainProgress,
        mainSep,
        mainDetail,
      ]);

      const subListEl = h('div', { className: 'live-sub-list', hidden: true });
      const cardEl = h('div', { className: 'live-task-card' }, [headerEl, mainRowEl, subListEl]);

      return {
        el: cardEl,
        refs: {
          cardEl,
          dotIcon,
          titleEl,
          subToggleBtn,
          elapsedEl,
          mainBadge,
          mainPhase,
          mainProgress,
          mainSep,
          mainDetail,
          subListEl,
        },
      };
    }

    function createLiveSubRow() {
      const subBadge = h('span', { className: 'agent-badge badge-sub-1', text: '子1' });
      const subRole = h('span', { className: 'live-sub-role', text: '子代理' });
      const subSummary = h('span', { className: 'live-sub-summary', text: '' });
      const subElapsed = h('span', { className: 'live-sub-elapsed text-mono', text: '0s' });

      const rowEl = h('div', { className: 'live-sub-row' }, [
        h('div', { className: 'live-sub-left' }, [
          subBadge,
          subRole,
          subSummary,
        ]),
        subElapsed,
      ]);

      return {
        el: rowEl,
        refs: {
          rowEl,
          subBadge,
          subRole,
          subSummary,
          subElapsed,
        },
      };
    }

    // --- 1. 4 格实时测速矩阵 (实时吞吐 / 首Token / 会话均速 / 本步消费) ---
    const tpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
    const tpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
    const pulseDot = createSvgIcon('dot', { size: 10 });

    const ttftVal = h('strong', { className: 'cell-value', text: '—' });
    const ttftSub = h('span', { className: 'cell-sub', text: '均值 —' });

    const avgVal = h('strong', { className: 'cell-value', text: '—' });
    const avgSub = h('span', { className: 'cell-sub', text: '有效样本 0/0 步' });

    const costVal = h('strong', { className: 'cell-value', text: '—' });
    const cacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累计 $0.00' });

    const matrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '实时指标' }, [
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [h('span', { text: '输出速度' }), pulseDot]),
        tpsVal,
        tpsSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '首字延迟' }),
          createSvgIcon('clock', { size: 11 }),
        ]),
        ttftVal,
        ttftSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '平均速度' }),
          createSvgIcon('pulse', { size: 11 }),
        ]),
        avgVal,
        avgSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '本次费用' }),
          createSvgIcon('bolt', { size: 11 }),
        ]),
        costVal,
        cacheSub,
      ]),
    ]);

    // --- 2. 6 段上下文窗口构成面板（自动锚定模型上下文压缩基线 + 方案 B 内嵌独立 256k 窗口检视条） ---
    const ctxAgentBadge = h('span', {
      className: 'agent-badge badge-main',
      hidden: true,
      text: '主代理',
    });
    const ctxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
    const ctxSegmentBar = ContextSegmentMeter({ context: {} });

    const ctxPillGroup = h('div', { className: 'ctx-pill-group' });
    const ctxInspectorBar = h(
      'div',
      { className: 'ctx-inspector-bar', hidden: true },
      [ctxPillGroup]
    );

    const ctxChannels = CTX_CHANNEL_DEFS.map((ch, idx) => {
      const valEl = h('strong', { className: 'text-mono', text: '0' });
      const itemEl = h('div', { className: 'legend-item', title: ch.title }, [
        h('span', { className: 'legend-left' }, [
          h('span', { className: `swatch ${ch.segClass}` }),
          h('span', { text: ch.label }),
        ]),
        valEl,
      ]);
      return { ...ch, defaultOrder: idx, valEl, itemEl };
    });

    const ctxLegendGrid = h(
      'div',
      { className: 'ctx-legend-grid' },
      ctxChannels.map((ch) => ch.itemEl)
    );
    let lastLegendOrderSig = ctxChannels.map((ch) => ch.key).join(',');

    const ctxPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('layers', { size: 13 }),
          h('span', { text: '上下文窗口' }),
          ctxAgentBadge,
        ]),
        h('span', { className: 'panel-meta' }, [ctxSummaryText]),
      ]),
      ctxInspectorBar,
      ctxSegmentBar.el,
      ctxLegendGrid,
    ]);

    // --- 3. 官方动态多配额池监控面板 (Gemini / Pro 独立 Argon 池 / Claude & GPT) ---
    const tierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });
    const poolsListEl = h('div', { style: 'display: flex; flex-direction: column; gap: 0;' });

    const wkFootLeft = h('span', { className: 'text-muted', text: '本周累计: 0 ($0.00)' });
    const wkFootRight = h('span', { className: 'text-muted', text: '' });

    const quotaPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('pulse', { size: 13 }),
          h('span', { text: '可用额度' }),
        ]),
        tierBadge,
      ]),
      poolsListEl,
      h('div', { className: 'panel-header', style: 'font-size: 11px; padding-top: 2px;' }, [
        wkFootLeft,
        wkFootRight,
      ]),
    ]);

    const overviewInner = h(
      'div',
      {
        style: 'display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: 2px;',
      },
      [matrixEl, ctxPanel, quotaPanel, liveActivityBar]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: overviewInner,
      className: 'view-pane',
    });

    let latestData = null;
    let isDirty = false;
    let ctxPillsExpanded = false;
    let lastCascadeId = '';
    let cachedBarWidth = 0;

    /**
     * 将最新遥测载荷渲染至 4 格测速矩阵、6 段上下文进度条（支持主/子代理切换检视）与动态配额池列表。
     */
    function renderData(data) {
      if (!data) return;
      // 在本帧任何 DOM 写入前先读取容器宽度，避免写后读触发浏览器强制同步重排 (Forced Reflow)
      const measuredWidth =
        ctxInspectorBar.clientWidth || (ctxPanel.clientWidth ? ctxPanel.clientWidth - 24 : 0);
      if (measuredWidth > 160) {
        cachedBarWidth = measuredWidth;
      }
      const availRowWidth = cachedBarWidth > 160 ? cachedBarWidth : DEFAULT_BAR_WIDTH_PX;

      const currentCascadeId = data.activeConversation?.cascadeId || '';
      if (currentCascadeId && currentCascadeId !== lastCascadeId) {
        if (lastCascadeId) {
          ctxPillsExpanded = false;
        }
        lastCascadeId = currentCascadeId;
      }

      const uiSt = uiStore.getState();
      const {
        hasSubagents,
        effectiveCtxScope,
        agents,
        aggregated,
        scopedConv,
        ctxAgent,
      } = resolveScopedConversation(data, 'all', uiSt.ctxInspectorAgentId);

      const active = scopedConv || data.activeConversation || {};
      const ctx = ctxAgent?.context || active.context || {};
      const quotas = data.quotas || {};

      // 0. 更新多任务实时运行列表（展示所有正在运行的主进程 + 默认主代理缩略 + 默认收起的子代理列表）
      const rawRunningList =
        Array.isArray(data.runningConversations) && data.runningConversations.length > 0
          ? data.runningConversations
          : data.activeConversation?.isRunning || aggregated?.isRunning
            ? [
                {
                  cascadeId: data.activeConversation?.cascadeId || 'current',
                  title: data.activeConversation?.title || '当前会话',
                  isCurrentSelected: true,
                  isMainRunning: Boolean(data.activeConversation?.isRunning),
                  isRunning: true,
                  mainActivity:
                    data.activeConversation?.liveActivity || aggregated?.liveActivity || null,
                  subagentCount: Math.max(0, agents.length - 1),
                  runningSubagentCount: agents.filter((a) => !a.isMain && a.isRunning).length,
                  subagents: agents
                    .filter((a) => !a.isMain)
                    .map((s, idx) => ({
                      cascadeId: s.cascadeId || s.agentId,
                      index: s.index || idx + 1,
                      badgeText: s.badgeText || `子${idx + 1}`,
                      shortLabel: s.shortLabel || `子代理 #${idx + 1}`,
                      role: s.role || `子代理 #${idx + 1}`,
                      isRunning: Boolean(s.isRunning),
                      stepCount: Number(s.stepCount || 0),
                      lastModifiedMs: s.lastModifiedMs || 0,
                      liveActivity: s.liveActivity || {
                        phase: s.isRunning ? 'thinking' : 'done',
                        label: s.isRunning ? '推理中' : '已完成',
                        detail: '',
                        stepProgress: '',
                        startedAtMs: s.lastModifiedMs || 0,
                        signature: `${s.agentId}:${s.stepCount || 0}`,
                      },
                    })),
                },
              ]
            : [];

      const hasRunningTasks = rawRunningList.length > 0;
      patchAttr(liveActivityBar, 'hidden', !hasRunningTasks);
      if (!hasRunningTasks) {
        stopLiveTicker();
      } else {
        // 先基于完整运行列表收集所有有效计时器 Key（防止 patchKeyedList 在 sig 未变化跳过 updateRow 时误删计时器）
        const activeTimerKeys = new Set();
        for (const item of rawRunningList) {
          activeTimerKeys.add(`main:${item.cascadeId}`);
          for (const sub of item.subagents || []) {
            if (sub?.isRunning) {
              activeTimerKeys.add(`sub:${sub.cascadeId}`);
            }
          }
        }
        // 清理已结束会话的展开状态
        const runningIdsSet = new Set(rawRunningList.map((item) => item.cascadeId));
        for (const id of [...expandedTaskConvIds]) {
          if (!runningIdsSet.has(id)) {
            expandedTaskConvIds.delete(id);
          }
        }

        patchKeyedList(liveActivityBar, rawRunningList, {
          keyFn: (item) => item.cascadeId,
          sigFn: (item) => {
            const isExp = expandedTaskConvIds.has(item.cascadeId);
            const subSig = (item.subagents || [])
              .map(
                (s) =>
                  `${s.cascadeId}:${s.isRunning}:${s.stepCount}:${s.liveActivity?.signature || ''}:${s.liveActivity?.startedAtMs || 0}`
              )
              .join('|');
            return `${item.cascadeId}:${item.title}:${item.isMainRunning}:${item.subagentCount}:${item.runningSubagentCount}:${isExp}:${item.mainActivity?.signature || ''}:${item.mainActivity?.startedAtMs || 0}:${subSig}`;
          },
          createRow: createLiveTaskCard,
          updateRow: (refs, item) => {
            const act = item.mainActivity || {
              phase: 'thinking',
              label: '推理中',
              detail: '',
              stepProgress: '',
              startedAtMs: item.lastModifiedMs || 0,
              signature: `fallback:${item.lastModifiedMs || 0}`,
            };

            const isWaiting = act.phase === 'waiting';
            const isCompacting = act.phase === 'compacting';
            patchClasses(refs.cardEl, {
              'is-waiting': isWaiting,
              'is-compacting': isCompacting,
            });
            patchClasses(refs.dotIcon, { 'is-pulsing': true });

            const convTitle = item.title || item.cascadeId?.slice(0, 8) || '当前会话';
            patchText(refs.titleEl, convTitle);
            patchAttr(refs.titleEl, 'title', `点击切换查看会话：${convTitle}`);
            refs.titleEl.onclick = () => {
              if (item.cascadeId && item.cascadeId !== 'current') {
                uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
                telemetryStore.setState({ selectedConversationId: item.cascadeId });
                fetchTelemetry({ force: false });
              }
            };

            const subCount = Number(item.subagentCount || item.subagents?.length || 0);
            const runSubCount = Number(item.runningSubagentCount || 0);
            const isExpanded = expandedTaskConvIds.has(item.cascadeId);
            patchAttr(refs.mainBadge, 'hidden', subCount === 0);
            patchAttr(refs.subToggleBtn, 'hidden', subCount === 0);
            if (subCount > 0) {
              const arrow = isExpanded ? '▾' : '▸';
              const toggleText =
                runSubCount > 0
                  ? `子代理 ${runSubCount}/${subCount} ${arrow}`
                  : `子代理 (${subCount}) ${arrow}`;
              patchText(refs.subToggleBtn, toggleText);
              patchClasses(refs.subToggleBtn, { 'is-expanded': isExpanded });
              patchAttr(
                refs.subToggleBtn,
                'title',
                isExpanded ? '点击收起子代理列表' : '点击展开查看子代理缩略状态'
              );
              refs.subToggleBtn.onclick = (e) => {
                e.stopPropagation();
                if (expandedTaskConvIds.has(item.cascadeId)) {
                  expandedTaskConvIds.delete(item.cascadeId);
                } else {
                  expandedTaskConvIds.add(item.cascadeId);
                }
                renderData(latestData);
              };
            }

            const mainTimerKey = `main:${item.cascadeId}`;
            activeTimerKeys.add(mainTimerKey);
            bindLiveElapsedTimer(
              mainTimerKey,
              `${item.cascadeId}:${act.signature || act.label}`,
              act.startedAtMs,
              refs.elapsedEl
            );

            patchText(refs.mainPhase, act.label || '推理中');
            const progText = act.stepProgress ? `[${act.stepProgress}]` : '';
            patchAttr(refs.mainProgress, 'hidden', !progText);
            if (progText) {
              patchText(refs.mainProgress, progText);
            }

            const detailStr = act.detail || '';
            patchAttr(refs.mainSep, 'hidden', !detailStr);
            patchAttr(refs.mainDetail, 'hidden', !detailStr);
            patchText(refs.mainDetail, detailStr);

            const fullTooltip = `[${convTitle}] 主代理 · ${act.label || ''}${progText ? ` ${progText}` : ''}${detailStr ? ` · ${detailStr}` : ''}`;
            patchAttr(refs.cardEl, 'title', fullTooltip);

            const showSubs = subCount > 0 && isExpanded;
            patchAttr(refs.subListEl, 'hidden', !showSubs);
            if (showSubs) {
              const subItems = item.subagents || [];
              patchKeyedList(refs.subListEl, subItems, {
                keyFn: (sub) => sub.cascadeId,
                sigFn: (sub) =>
                  `${sub.cascadeId}:${sub.role}:${sub.isRunning}:${sub.stepCount}:${sub.liveActivity?.signature || ''}:${sub.isRunning ? activityTimersMap.has(`sub:${sub.cascadeId}`) : true}`,
                createRow: createLiveSubRow,
                updateRow: (subRefs, sub) => {
                  const subAct = sub.liveActivity || {
                    phase: sub.isRunning ? 'thinking' : 'done',
                    label: sub.isRunning ? '推理中' : '已完成',
                    detail: '',
                    stepProgress: '',
                    startedAtMs: sub.lastModifiedMs || 0,
                  };
                  patchClasses(subRefs.rowEl, { 'is-done': !sub.isRunning });

                  const badgeCls = getAgentBadgeClass(sub.index || 1, false);
                  patchAttr(subRefs.subBadge, 'class', `agent-badge ${badgeCls}`);
                  patchText(subRefs.subBadge, sub.badgeText || `子${sub.index || 1}`);

                  const roleText = sub.role || sub.shortLabel || '子代理';
                  patchText(subRefs.subRole, roleText);

                  const rawSubLabel = sub.isRunning ? subAct.label || '' : subAct.label || '已完成';
                  const subProg = subAct.stepProgress ? ` [${subAct.stepProgress}]` : '';
                  const summaryStr = [
                    `${rawSubLabel}${subProg}`.trim(),
                    subAct.detail || '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  patchAttr(subRefs.subSummary, 'hidden', !summaryStr);
                  patchText(subRefs.subSummary, summaryStr);

                  patchAttr(
                    subRefs.rowEl,
                    'title',
                    `[${sub.badgeText || '子'}] ${roleText}${summaryStr ? ` ${summaryStr}` : ''}`
                  );

                  if (sub.isRunning) {
                    const subTimerKey = `sub:${sub.cascadeId}`;
                    activeTimerKeys.add(subTimerKey);
                    bindLiveElapsedTimer(
                      subTimerKey,
                      `${sub.cascadeId}:${subAct.signature || subAct.label}`,
                      subAct.startedAtMs,
                      subRefs.subElapsed
                    );
                  } else {
                    patchText(subRefs.subElapsed, `${sub.stepCount || 0}步`);
                  }
                },
              });
            }
          },
        });

        for (const key of [...activityTimersMap.keys()]) {
          if (!activeTimerKeys.has(key)) {
            activityTimersMap.delete(key);
          }
        }
        updateLiveElapsedDisplay();
        ensureLiveTicker();
      }

      // 1. 更新 4 格实时测速矩阵（展示当前会话全局汇总指标，遵循模型名称格式与 Orchestrator ID 格式设置）
      const activeModelDisplay = resolveModelDisplayInfo(active, data.settings, {
        fallback: '模型未知',
      }).text;
      patchClasses(pulseDot, { 'is-pulsing': Boolean(active.isRunning) });
      patchText(tpsVal, formatMetric(active.latestTokPerSec, ' tok/s'));
      const reason = speedReasonText(active.latestSpeedReason);
      const modelAndAgent =
        hasSubagents && active.activeAgentBadge
          ? `[${active.activeAgentBadge}] ${activeModelDisplay}`
          : activeModelDisplay;
      patchText(tpsSub, reason ? `${modelAndAgent} · ${reason}` : modelAndAgent);

      patchText(ttftVal, formatMetric(active.latestTtftSec, 's'));
      patchText(ttftSub, `均值 ${formatMetric(active.ttftSummary?.avgSec, 's')}`);

      patchText(avgVal, formatMetric(active.avgTokPerSec, ' tok/s'));
      patchText(avgSub, `有效 ${sampleSummary(active.speedSummary)}`);

      const stepCost = active.latestStepCostUsd;
      const hasAnySteps = Number(active.stepCount || 0) > 0;
      patchText(
        costVal,
        !hasAnySteps && stepCost == null ? '—' : formatUsd(stepCost, { precise: true })
      );
      patchText(
        cacheSub,
        `缓存 ${active.latestCacheHitPct ?? 0}% · 累计 ${formatUsd(active.sessionCostUsd || 0)}`
      );

      // 2. 更新 10 段上下文窗口构成与内嵌上下文窗口检视胶囊条
      patchAttr(ctxAgentBadge, 'hidden', !hasSubagents);
      patchAttr(ctxInspectorBar, 'hidden', !hasSubagents);
      if (hasSubagents && ctxAgent) {
        const badgeCls = getAgentBadgeClass(ctxAgent.index || 0, Boolean(ctxAgent.isMain));
        patchAttr(ctxAgentBadge, 'class', `agent-badge ${badgeCls}`);
        const badgeFullText = formatAgentLabel(ctxAgent);
        patchText(ctxAgentBadge, badgeFullText);
        patchAttr(ctxAgentBadge, 'title', badgeFullText);

        const pillItems = [
          {
            key: 'auto',
            label: `跟随活跃 (${aggregated?.activeAgentBadge || '主'})`,
            title: '自动展示当前正在运行或最新活跃的代理上下文窗口',
            isActive: effectiveCtxScope === 'auto',
            mode: 'ctx-only',
          },
        ];

        const allAgentPills = agents.map((ag) => {
          const agPct = ag.context?.usedPct ?? 0;
          const agModelDisplay = resolveModelDisplayInfo(ag, data.settings, {
            fallback: '模型未知',
          }).text;
          return {
            key: ag.agentId,
            label: `${ag.badgeText || ag.shortLabel} ${agPct}%`,
            title: `${formatAgentLabel(ag)} (${agModelDisplay} · ${ag.stepCount || 0}步)`,
            isActive: effectiveCtxScope === ag.agentId,
            mode: 'ctx-only',
          };
        });

        // 根据当前卡片的实际像素宽度估算单行可容纳的胶囊数量，尽可能塞满整行右侧空间
        const firstPillWidth = pillItems.length > 0 ? estPillWidth(pillItems[0].label) : 0;
        const totalAllWidth = allAgentPills.reduce(
          (sum, p) => sum + PILL_GAP_PX + estPillWidth(p.label),
          firstPillWidth
        );
        const needsCollapse = totalAllWidth > availRowWidth && allAgentPills.length > 2;

        if (needsCollapse && !ctxPillsExpanded) {
          const toggleReservePx = PILL_GAP_PX + estPillWidth(`+${allAgentPills.length} 展开 ▾`);
          let usedW = firstPillWidth;
          let fitCount = 0;
          for (let i = 0; i < allAgentPills.length; i++) {
            const pw = PILL_GAP_PX + estPillWidth(allAgentPills[i].label);
            if (fitCount >= 1 && usedW + pw + toggleReservePx > availRowWidth) {
              break;
            }
            usedW += pw;
            fitCount++;
          }
          // 至少折叠 2 个胶囊（避免出现比胶囊本身还宽的 "+1 展开 ▾"）
          const maxKeep = Math.max(1, allAgentPills.length - 2);
          const maxCollapsedCount = Math.max(1, Math.min(maxKeep, fitCount));
          const visibleAgentPills = allAgentPills.slice(0, maxCollapsedCount);
          const activeHiddenPill = allAgentPills
            .slice(maxCollapsedCount)
            .find((p) => p.isActive);
          if (activeHiddenPill) {
            if (visibleAgentPills.length >= 2) {
              visibleAgentPills[visibleAgentPills.length - 1] = activeHiddenPill;
            } else {
              visibleAgentPills.push(activeHiddenPill);
            }
          }
          const hiddenCount = allAgentPills.length - visibleAgentPills.length;
          pillItems.push(...visibleAgentPills, {
            key: '__toggle_more__',
            label: `+${hiddenCount} 展开 ▾`,
            title: `展开全部 ${allAgentPills.length - 1} 个子代理的上下文窗口胶囊`,
            isActive: false,
            isMoreToggle: true,
            mode: 'toggle-expand',
          });
        } else {
          pillItems.push(...allAgentPills);
          if (needsCollapse) {
            pillItems.push({
              key: '__toggle_more__',
              label: '收起 ▴',
              title: '折叠多余子代理胶囊',
              isActive: false,
              isMoreToggle: true,
              mode: 'toggle-expand',
            });
          }
        }

        patchKeyedList(ctxPillGroup, pillItems, {
          keyFn: (item) => item.key,
          sigFn: (item) =>
            `${item.key}:${item.label}:${item.isActive}:${item.isMoreToggle}:${item.mode}:${item.title}`,
          createRow: () => {
            const btn = h('button', { type: 'button', className: 'ctx-agent-pill' });
            return { el: btn, refs: { btn } };
          },
          updateRow: (refs, item) => {
            patchText(refs.btn, item.label);
            patchAttr(refs.btn, 'title', item.title);
            patchClasses(refs.btn, {
              'is-active': item.isActive,
              'is-more-toggle': Boolean(item.isMoreToggle),
            });
            refs.btn.onclick = () => {
              if (item.mode === 'toggle-expand') {
                ctxPillsExpanded = !ctxPillsExpanded;
                renderData(latestData);
              } else {
                uiStore.setState({ ctxInspectorAgentId: item.key });
              }
            };
          },
        });
      }

      const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
      const totalTokens = Number(ctx.totalTokens || 0);
      const usedPct =
        limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
      patchText(
        ctxSummaryText,
        `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
      );
      ctxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });
      const scoredChannels = ctxChannels.map((ch) => {
        const val = ch.getValue(ctx);
        patchText(ch.valEl, formatTokens(val));
        return { ch, val };
      });
      scoredChannels.sort((a, b) => b.val - a.val || a.ch.defaultOrder - b.ch.defaultOrder);
      const nextLegendOrderSig = scoredChannels.map((x) => x.ch.key).join(',');
      if (nextLegendOrderSig !== lastLegendOrderSig) {
        lastLegendOrderSig = nextLegendOrderSig;
        for (const { ch } of scoredChannels) {
          ctxLegendGrid.appendChild(ch.itemEl);
        }
      }

      // 3. 更新动态配额池列表（支持 Gemini、Pro 独立 Argon 池、Claude & GPT 等）
      patchText(
        tierBadge,
        `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`
      );
      const weekly = quotas.weekly || {};
      const minuteTick = Math.floor(Date.now() / 30000);
      const poolItems = buildQuotaPoolItems(quotas, minuteTick);

      patchKeyedList(poolsListEl, poolItems, {
        keyFn: (item) => item.key,
        sigFn: quotaPoolRowSig,
        createRow: createPoolQuotaRow,
        updateRow: syncPoolQuotaRow,
      });

      patchText(
        wkFootLeft,
        `本周累计: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0)})`
      );
      patchText(
        wkFootRight,
        data.account?.aiCredits > 0
          ? `AI 积分: ${data.account.aiCredits}`
          : `本周调用: ${weekly.calls || 0} 次`
      );

      ensureCountdownTicker();
      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({ telemetry: st.telemetry, minuteTick: st.minuteTick }),
      ({ telemetry: data }) => {
        latestData = data;
        if (uiStore.getState().activeView !== 'overview') {
          const stillRunning =
            (Array.isArray(data?.runningConversations) && data.runningConversations.length > 0) ||
            Boolean(
              data?.activeConversation?.isRunning ||
                data?.activeConversation?.aggregated?.isRunning
            );
          if (!stillRunning) {
            stopLiveTicker();
          }
          isDirty = true;
          return;
        }
        isDirty = false;
        renderData(data);
      }
    );

    let prevCtxTarget = uiStore.getState().ctxInspectorAgentId;

    const unsubView = uiStore.subscribe(
      (st) => ({
        activeView: st.activeView,
        ctxInspectorAgentId: st.ctxInspectorAgentId,
      }),
      (slice) => {
        const scopeChanged = slice.ctxInspectorAgentId !== prevCtxTarget;
        prevCtxTarget = slice.ctxInspectorAgentId;

        if (slice.activeView !== 'overview') {
          pauseLiveTicker();
          stopCountdownTicker();
          if (scopeChanged) isDirty = true;
          return;
        }
        ensureCountdownTicker();
        if ((isDirty || scopeChanged) && latestData) {
          isDirty = false;
          renderData(latestData);
        } else if (activityTimersMap.size > 0) {
          updateLiveElapsedDisplay();
          ensureLiveTicker();
        }
      }
    );

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (uiStore.getState().activeView !== 'overview') return;
        const nextW =
          ctxInspectorBar.clientWidth || (ctxPanel.clientWidth ? ctxPanel.clientWidth - 24 : 0);
        if (nextW > 160 && Math.abs(nextW - cachedBarWidth) >= 6) {
          cachedBarWidth = nextW;
          if (latestData?.activeConversation?.hasSubagents) {
            renderData(latestData);
          }
        }
      });
      ro.observe(ctxPanel);
    }

    onCleanup(() => {
      stopLiveTicker();
      stopCountdownTicker();
      unsub();
      unsubView();
      if (ro) ro.disconnect();
      ctxSegmentBar.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: { viewScrollbar },
    };
  },
});

// --- src/views/ConsumptionView.js ---
/**
 * @fileoverview View 2: ConsumptionView (全景消耗统计视图).
 * 采用 5 段式分析布局展示指定时间窗口内的全量 Token 与费用消耗：
 * 1. 用量概览：支持预设时间段与自定义区间筛选，通过 3+3 组合矩阵展示总 Token/调用次数、
 *    USD/CNY 预估费用、缓存命中率与命中量、新输入/缓存读取（含节省费用）/输出细分占比，以及底部 4 段比例条 (`FourSegmentBar`)。
 * 2. 历史趋势：基于 `TrendAreaChart` 渲染纯 SVG 三次贝塞尔平滑曲线面积图、峰值气泡、对齐多刻度时间轴与悬停详情浮层。
 * 3. 热门模型：按 Token 总量降序展示各模型的消耗占比徽章、4 段构成条及输入/缓存/输出/思考/调用明细。
 * 4. 数据来源：按调用来源聚合展示 Token 构成、占比与费用明细。
 * 5. 按月细分：12 个月垂直 4 段堆叠柱状图，直观对比全年各月费用、Token 总量与缓存/思考结构。
 */


/** 消耗统计顶栏支持的时间范围预设项 */
const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: '24h', label: '1天' },
  { value: '7d', label: '7天' },
  { value: '14d', label: '14天' },
  { value: '30d', label: '30天' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自定义' },
];

const ConsumptionView = defineComponent({
  name: 'ConsumptionView',
  setup({ onCleanup }) {
    // --- 时间筛选栏：快速时间段分段控制器与自定义起止时间选择条 ---
    let draftStartMs = telemetryStore.getState().customStartMs;
    let draftEndMs = telemetryStore.getState().customEndMs;
    let hasUncommittedCustomDraft = false;

    const timeFilterSwitch = SegmentedControl({
      ariaLabel: '消耗统计时间范围',
      modelValue: telemetryStore.getState().selectedTimeRange,
      options: TIME_RANGE_OPTIONS,
      onUpdateModelValue: (nextRange) => {
        if (nextRange === 'custom') {
          const st = telemetryStore.getState();
          draftStartMs = st.customStartMs;
          draftEndMs = st.customEndMs;
          hasUncommittedCustomDraft = false;
          startPicker.setValue(draftStartMs);
          endPicker.setValue(draftEndMs);
        } else {
          hasUncommittedCustomDraft = false;
        }
        telemetryStore.setState({ selectedTimeRange: nextRange });
        fetchTelemetry({ force: false });
      },
    });

    const startPicker = CustomDateTimePicker({
      modelValue: draftStartMs,
      onUpdateModelValue: (ms) => {
        draftStartMs = ms;
        hasUncommittedCustomDraft = true;
        startPicker.setValue(ms);
      },
    });

    const endPicker = CustomDateTimePicker({
      modelValue: draftEndMs,
      onUpdateModelValue: (ms) => {
        draftEndMs = ms;
        hasUncommittedCustomDraft = true;
        endPicker.setValue(ms);
      },
    });

    const applyCustomBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-primary',
        style: 'height: 26px; padding: 0 10px;',
        onClick: () => {
          const sMs = Number(draftStartMs || 0);
          const eMs = Number(draftEndMs || 0);
          const minMs = sMs > 0 && eMs > 0 ? Math.min(sMs, eMs) : sMs;
          const maxMs = sMs > 0 && eMs > 0 ? Math.max(sMs, eMs) : eMs;
          draftStartMs = minMs;
          draftEndMs = maxMs;
          hasUncommittedCustomDraft = false;
          startPicker.setValue(minMs);
          endPicker.setValue(maxMs);
          telemetryStore.setState({
            selectedTimeRange: 'custom',
            customStartMs: minMs,
            customEndMs: maxMs,
          });
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

    // --- Section 1: 用量概览矩阵 (上层 3 列核心总量 + 下层 3 列新输入/缓存读取/输出拆分 + 底部 4 段比例条) ---
    const dateSpanBadge = h('span', { className: 'cons-badge text-mono', text: '-- ~ --' });
    const heroTotalTokens = h('strong', { className: 'cons-hero-num text-mono', text: '0' });
    const heroTotalCalls = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '0 次' });
    const heroCostUsd = h('strong', { className: 'cons-hero-cost text-mono', text: '$0.00' });
    const heroCostCny = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '≈ ¥0' });

    const cacheHitPctEl = h('strong', { className: 'cons-hero-cache text-mono', text: '0%' });
    const cacheTokensEl = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '命中 0' });

    const inputSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-input); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const inputMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const inputSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '未命中缓存输入' });

    const cacheSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-cached); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const cacheMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const cacheSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '节省 $0.00' });

    const outputSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-output); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const outputMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const outputSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '回复 0 · 思考 0' });

    const overviewSegBar = createFourSegmentBar();

    const overviewPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header cons-overview-head' }, [
        h('span', { className: 'panel-title' }, [
          h('span', { text: '用量总览' }),
          dateSpanBadge,
        ]),
        timeFilterSwitch.el,
      ]),
      customRangeBar,
      h('div', { className: 'cons-box cons-unified-matrix' }, [
        h('div', { className: 'cons-split-3' }, [
          h('div', { className: 'cons-col' }, [
            h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '总 Token' }),
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
        h('div', { className: 'cons-split-3 cons-matrix-bottom' }, [
          h('div', { className: 'cons-col' }, [
            h('div', { className: 'cons-sub-head' }, [
              h('span', { className: 'legend-left cons-sub-label' }, [
                h('span', { className: 'dot-swatch seg-input' }),
                h('span', { text: '新输入' }),
              ]),
              inputSharePct,
            ]),
            inputMainTokens,
            inputSubText,
          ]),
          h('div', { className: 'cons-col is-bordered-col' }, [
            h('div', { className: 'cons-sub-head' }, [
              h('span', { className: 'legend-left cons-sub-label' }, [
                h('span', { className: 'dot-swatch seg-cached' }),
                h('span', { text: '缓存读取' }),
              ]),
              cacheSharePct,
            ]),
            cacheMainTokens,
            cacheSubText,
          ]),
          h('div', { className: 'cons-col is-bordered-col' }, [
            h('div', { className: 'cons-sub-head' }, [
              h('span', { className: 'legend-left cons-sub-label' }, [
                h('span', { className: 'dot-swatch seg-output' }),
                h('span', { text: '输出用量' }),
              ]),
              outputSharePct,
            ]),
            outputMainTokens,
            outputSubText,
          ]),
        ]),
      ]),
      overviewSegBar.el,
    ]);

    // --- Section 2: 历史趋势 (交互式 SVG 平滑曲线图 + 悬停精确日期/小时浮层 + 多刻度时间轴) ---
    const trendRangeBadge = h('span', { className: 'cons-badge', text: '全部时间' });
    const trendGranularityHint = h('span', {
      className: 'text-muted text-mono',
      style: 'font-size: 10.5px;',
      text: '按小时 · 悬停查看明细',
    });
    const trendChart = createTrendAreaChart();

    const trendPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          h('span', { text: '用量趋势' }),
          trendRangeBadge,
        ]),
        trendGranularityHint,
      ]),
      trendChart.el,
    ]);

    // --- Section 3: 模型排行列表 ---
    const modelsListEl = h('div', { className: 'cons-item-list' });
    const modelsPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '模型排行' }),
      ]),
      modelsListEl,
    ]);

    // --- Section 4: 客户端来源列表 ---
    const sourcesListEl = h('div', { className: 'cons-item-list' });
    const sourcesPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title', text: '客户端来源' }),
      ]),
      sourcesListEl,
    ]);

    // --- Section 5: 按月细分 (12 个月垂直 4 段堆叠柱状图) ---
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
        h('span', { className: 'panel-title', text: '月度统计' }),
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

    /**
     * 创建热门模型或数据来源的通用单行 DOM 结构（含标题、占比胶囊、总量、费用、4 段条与底部分项脚标）。
     */
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

    /**
     * 增量更新热门模型或数据来源单行的指标文本与 4 段比例条宽度。
     */
    function updateBreakdownItemRow(refs, item, grandTotalTokens, showTokensInHeader = true) {
      const displayLabel = item.label || item.name || item.shortName || '—';
      patchText(refs.nameEl, displayLabel);
      patchAttr(refs.nameEl, 'title', item.title || displayLabel);
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

    /**
     * 将遥测状态切片同步渲染至消费统计视图的 5 个子面板。
     */
    function renderConsumptionData(slice) {
      if (!slice) return;
      timeFilterSwitch.setValue(slice.range);
      patchAttr(customRangeBar, 'hidden', slice.range !== 'custom');
      if (!hasUncommittedCustomDraft) {
        draftStartMs = slice.customStartMs;
        draftEndMs = slice.customEndMs;
        startPicker.setValue(draftStartMs);
        endPicker.setValue(draftEndMs);
      }

      const cons = slice.consumption || {};
      const preset =
        slice.range !== 'custom' && cons.presets?.[slice.range]
          ? cons.presets[slice.range]
          : null;
      const acct = preset?.account || cons.account || {};
      const rangeInfo = cons.selectedRange || {};

      // 1. 同步用量概览矩阵与顶部 4 段比例条
      patchText(dateSpanBadge, formatDateSpanBadge(rangeInfo.startMs, rangeInfo.endMs));
      const totalTokens = Number(acct.totalTokens || 0);
      const inputTokens = Number(acct.inputTokens || 0);
      const cacheTokens = Number(acct.cacheReadTokens || 0);
      const outputTokens = Number(acct.outputTokens || 0);
      const responseTokens = Number(acct.responseTokens || 0);
      const thinkingTokens = Number(acct.thinkingTokens || 0);
      const costUsd = Number(acct.costUsd || 0);
      const savedCostUsd = Number(acct.savedCostUsd || 0);

      patchText(heroTotalTokens, formatTokensPrecise(totalTokens));
      patchText(heroTotalCalls, `${acct.calls || 0} 次`);
      patchText(heroCostUsd, formatUsd(costUsd));
      patchText(heroCostCny, formatCnyApprox(costUsd));

      patchText(cacheHitPctEl, `${Number(acct.cacheHitPct ?? 0).toFixed(1)}%`);
      patchText(cacheTokensEl, `命中 ${formatTokensPrecise(cacheTokens)}`);

      let inPct = 0;
      let cachePct = 0;
      let outPct = 0;
      if (totalTokens > 0) {
        const rawTenths = [
          (inputTokens / totalTokens) * 1000,
          (cacheTokens / totalTokens) * 1000,
          (outputTokens / totalTokens) * 1000,
        ];
        const floored = rawTenths.map((v) => Math.max(0, Math.floor(v)));
        const rem = Math.max(0, 1000 - (floored[0] + floored[1] + floored[2]));
        const order = [0, 1, 2].sort(
          (a, b) => rawTenths[b] - floored[b] - (rawTenths[a] - floored[a])
        );
        for (let k = 0; k < rem && k < 3; k++) {
          floored[order[k]] += 1;
        }
        inPct = +(floored[0] / 10).toFixed(1);
        cachePct = +(floored[1] / 10).toFixed(1);
        outPct = +(floored[2] / 10).toFixed(1);
      }

      patchText(inputSharePct, `${inPct}%`);
      patchText(inputMainTokens, formatTokensPrecise(inputTokens));
      patchText(inputSubText, '未命中缓存输入');

      patchText(cacheSharePct, `${cachePct}%`);
      patchText(cacheMainTokens, formatTokensPrecise(cacheTokens));
      patchText(
        cacheSubText,
        `节省 ${formatUsd(savedCostUsd, { precise: savedCostUsd > 0 && savedCostUsd < 0.01 })}`
      );

      patchText(outputSharePct, `${outPct}%`);
      patchText(outputMainTokens, formatTokensPrecise(outputTokens));
      patchText(
        outputSubText,
        `回复 ${formatTokensPrecise(responseTokens)} · 思考 ${formatTokensPrecise(thinkingTokens)}`
      );

      overviewSegBar.update({
        inputTokens,
        cacheReadTokens: cacheTokens,
        responseTokens,
        thinkingTokens,
      });

      // 2. 同步历史趋势交互式 SVG 面积图与粒度提示
      patchText(trendRangeBadge, preset?.label || rangeInfo.label || '全部时间');
      const trendSeries = cons.trendSeries || [];
      const isHourlyTrend =
        trendSeries[0]?.granularity === 'hour' ||
        (trendSeries[0]?.label || '').includes(':');
      patchText(
        trendGranularityHint,
        `${isHourlyTrend ? '按小时' : '按日'} (${trendSeries.length || 0}点) · 悬停查看`
      );
      trendChart.update(trendSeries);

      // 3. 同步热门模型列表（按总 Token 数降序排列并执行键值增量对账，遵循模型名称与 Orchestrator ID 格式设置）
      const displaySettings = {
        showUpstreamModel: Boolean(slice.showUpstreamModel),
        orchestratorIdMode: slice.orchestratorIdMode,
      };
      const models = (slice.modelBreakdown || [])
        .slice()
        .sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));
      const modelsTotalTok = models.reduce((s, m) => s + Number(m.totalTokens || 0), 0);

      patchKeyedList(modelsListEl, models, {
        keyFn: (m) => m.label || m.shortName,
        sigFn: (m) => {
          const disp = resolveModelDisplayInfo(m, displaySettings, { preferLabelInShort: true });
          return `${disp.text}:${disp.title}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.calls}:${modelsTotalTok}`;
        },
        createRow: createBreakdownItemRow,
        updateRow: (refs, m) => {
          const disp = resolveModelDisplayInfo(m, displaySettings, { preferLabelInShort: true });
          return updateBreakdownItemRow(
            refs,
            { ...m, label: disp.text, title: disp.title },
            modelsTotalTok,
            true
          );
        },
      });

      // 4. 同步数据来源列表
      const sources = cons.sourcesBreakdown || [];
      const sourcesTotalTok = sources.reduce((s, x) => s + Number(x.totalTokens || 0), 0);
      patchKeyedList(sourcesListEl, sources, {
        keyFn: (s) => s.name,
        sigFn: (s) => `${s.name}:${s.totalTokens}:${s.costUsd}:${s.unpricedCalls}:${s.calls}:${sourcesTotalTok}`,
        createRow: createBreakdownItemRow,
        updateRow: (refs, s) => updateBreakdownItemRow(refs, s, sourcesTotalTok, true),
      });

      // 5. 同步 12 个月垂直堆叠柱状图（相对于年度峰值月缩放柱高，最低保留 8% 可视高度）
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
          patchText(
            col.costText,
            cVal >= 10 ? `$${Math.round(cVal)}` : `$${cVal.toFixed(2)}`
          );
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
        showUpstreamModel: Boolean(st.telemetry?.settings?.showUpstreamModel),
        orchestratorIdMode: normalizeOrchestratorIdDisplayMode(
          st.telemetry?.settings?.orchestratorIdMode
        ),
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

// --- src/views/StepsDetailView.js ---
/**
 * @fileoverview View 3: StepsDetailView (步骤明细与按模型汇总视图).
 * 提供“单步测速”与“按模型汇总”双子表切换：
 * - 采用 `patchKeyedList` 实现行级 DOM 增量对账与就地复用，彻底避免全表 `innerHTML` 重建引发的闪烁；
 * - 两个表格各自包裹在独立的 `CustomScrollbar` 容器中，兼具粘性表头与零原生滚动条体验；
 * - 支持在内部代号 (`modelShort`) 与实际响应模型名 (`modelUpstream`) 之间无缝切换显示。
 */


const StepsDetailView = defineComponent({
  name: 'StepsDetailView',
  setup({ onCleanup }) {
    // 方案 B：明细面板标题栏内嵌代理筛选下拉框（与顶栏代理切换条双向同步）
    const inlineScopeSelect = CustomSelect({
      modelValue: uiStore.getState().selectedAgentScope,
      icon: 'layers',
      placeholder: '全部代理',
      className: 'steps-inline-scope-select',
      options: [{ value: 'all', label: '全部代理' }],
      onUpdateModelValue: (nextScope) => {
        if (nextScope) {
          uiStore.setState({
            selectedAgentScope: nextScope,
            ...(nextScope === 'all' ? { ctxInspectorAgentId: 'auto' } : {}),
          });
        }
      },
    });
    inlineScopeSelect.el.setAttribute('hidden', '');

    // 顶部子表分段切换器：在“按步查看”与“按模型汇总”之间切换
    const subTabSwitch = SegmentedControl({
      ariaLabel: '明细表视图切换',
      modelValue: uiStore.getState().stepsSubTab,
      options: [
        { value: 'steps', label: '按步查看 (0)' },
        { value: 'models', label: '按模型汇总' },
      ],
      onUpdateModelValue: (nextTab) => {
        uiStore.setState({ stepsSubTab: nextTab });
      },
    });

    // --- 子表 1：单步明细表（列定义：步序、模型、吞吐速度、首字延迟、上下文/输出、缓存命中率、单步费用） ---
    const stepsTbody = h('tbody');
    const stepsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { text: '步序' }),
            h('th', { text: '模型' }),
            h('th', { text: '速度' }),
            h('th', { text: '首字' }),
            h('th', { text: '上下文 / 输出' }),
            h('th', { text: '缓存' }),
            h('th', { text: '费用' }),
          ]),
        ]),
        stepsTbody,
      ]),
    ]);
    const stepsScroll = CustomScrollbar({
      contentEl: stepsTablePane,
      className: 'table-scroll-host',
    });

    // --- 子表 2：按模型汇总表（列定义：模型名称、调用次数、有效均速、总 Token、费用） ---
    const modelsTbody = h('tbody');
    const modelsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { text: '模型' }),
            h('th', { text: '次数' }),
            h('th', { text: '均速' }),
            h('th', { text: '总 Token' }),
            h('th', { text: '费用' }),
          ]),
        ]),
        modelsTbody,
      ]),
    ]);
    const modelsScroll = CustomScrollbar({
      contentEl: modelsTablePane,
      className: 'table-scroll-host',
    });
    modelsScroll.el.setAttribute('hidden', '');

    const panelEl = h(
      'section',
      {
        className: 'panel',
        style: 'flex: 1; min-height: 0; display: flex; flex-direction: column;',
      },
      [
        h('div', { className: 'panel-header steps-panel-header' }, [
          h('span', { className: 'panel-title steps-panel-title' }, [
            createSvgIcon('table', { size: 13 }),
            h('span', { text: '调用记录' }),
          ]),
          h('div', { className: 'steps-header-controls' }, [
            inlineScopeSelect.el,
            subTabSwitch.el,
          ]),
        ]),
        stepsScroll.el,
        modelsScroll.el,
      ]
    );

    const rootEl = h('div', { className: 'view-pane' }, [panelEl]);

    const unsubUi = uiStore.subscribe(
      (st) => st.stepsSubTab,
      (tab) => {
        subTabSwitch.setValue(tab);
        patchAttr(stepsScroll.el, 'hidden', tab !== 'steps');
        patchAttr(modelsScroll.el, 'hidden', tab !== 'models');
        if (tab === 'steps') stepsScroll.refresh();
        else modelsScroll.refresh();
      }
    );

    let latestSlice = null;
    let isDirty = false;

    /**
     * 对单步测速表和按模型汇总表执行基于 `patchKeyedList` 的键值增量对账与行更新。
     */
    function renderStepsData(slice) {
      if (!slice) return;
      const uiSt = uiStore.getState();
      const {
        hasSubagents,
        effectiveScope,
        subagents,
        mainAgent,
        aggregated,
        scopedConv,
      } = resolveScopedConversation(
        { activeConversation: slice.activeConversation },
        uiSt.selectedAgentScope,
        uiSt.ctxInspectorAgentId
      );

      patchAttr(inlineScopeSelect.el, 'hidden', !hasSubagents);
      if (hasSubagents) {
        const scopeOpts = [
          {
            value: 'all',
            label: '全部汇总',
            meta: `${aggregated?.stepCount ?? 0}步`,
          },
          {
            value: 'main',
            label: '主代理',
            meta: `${mainAgent?.stepCount ?? 0}步`,
          },
          ...subagents.map((s) => ({
            value: s.agentId,
            label: formatAgentLabel(s),
            meta: `${s.stepCount || 0}步`,
          })),
        ];
        inlineScopeSelect.setProps({
          modelValue: effectiveScope,
          options: scopeOpts,
        });
      } else {
        inlineScopeSelect.close();
      }

      const steps =
        (hasSubagents ? scopedConv?.recentSteps : slice.recentSteps) ||
        slice.recentSteps ||
        [];
      const models =
        (Array.isArray(scopedConv?.modelBreakdown) && scopedConv.modelBreakdown.length > 0
          ? scopedConv.modelBreakdown
          : slice.sessionModelBreakdown || slice.modelBreakdown) || [];
      const displaySettings = {
        showUpstreamModel: Boolean(slice.showUpstreamModel),
        orchestratorIdMode: slice.orchestratorIdMode,
      };
      const modelsTabBadge = hasSubagents
        ? effectiveScope === 'all'
          ? '本会话汇总'
          : scopedConv?.shortLabel || '当前代理'
        : '本会话';

      subTabSwitch.setProps({
        options: [
          { value: 'steps', label: `按步查看 (${steps.length})` },
          { value: 'models', label: `按模型汇总 (${modelsTabBadge})` },
        ],
      });

      // 1. 单步测速表增量对账：以 `<agentCascadeId>-<stepIndex>` 为稳定行键，仅在签名变化时刷新单元格
      patchKeyedList(stepsTbody, steps, {
        keyFn: (st) => `${st.agentCascadeId || slice.cascadeId || 'conv'}-${st.stepIndex}`,
        sigFn: (st) => {
          const disp = resolveModelDisplayInfo(st, displaySettings, { fallback: '—' });
          return `${hasSubagents}:${effectiveScope}:${st.agentId || 'main'}:${st.stepIndex}:${disp.text}:${disp.title}:${st.tokPerSec}:${st.ttftSec}:${st.contextTokens}:${st.outputTokens}:${st.cacheHitPct}:${st.costUsd}:${st.selectedSpeedReason}`;
        },
        createRow: () => {
          const agentBadgeEl = h('span', {
            className: 'agent-badge is-clickable',
            hidden: true,
            style: 'margin-right: 4px;',
          });
          const stepNumText = h('span');
          const tdStep = h('td', {}, [agentBadgeEl, stepNumText]);

          const tdModel = h('td', {
            style: 'max-width: 140px; overflow: hidden; text-overflow: ellipsis;',
          });
          const speedMain = h('strong', {
            className: 'cell-value accent-speed',
            style: 'font-size: 11px;',
          });
          const speedReason = h('div', { className: 'text-muted', style: 'font-size: 9.5px;' });
          const tdSpeed = h('td', {}, [speedMain, speedReason]);

          const tdTtft = h('td');
          const tdCtx = h('td');
          const tdCache = h('td', {
            className: 'cell-value accent-ok',
            style: 'font-size: 11px;',
          });
          const tdCost = h('td', { style: 'font-weight: 600;' });

          const tr = h('tr', {}, [tdStep, tdModel, tdSpeed, tdTtft, tdCtx, tdCache, tdCost]);
          return {
            el: tr,
            refs: {
              agentBadgeEl,
              stepNumText,
              tdModel,
              speedMain,
              speedReason,
              tdTtft,
              tdCtx,
              tdCache,
              tdCost,
            },
          };
        },
        updateRow: (refs, st) => {
          patchAttr(refs.agentBadgeEl, 'hidden', !hasSubagents);
          if (hasSubagents) {
            const badgeCls = getAgentBadgeClass(st.agentIndex || 0, !st.isSubagent);
            patchAttr(refs.agentBadgeEl, 'class', `agent-badge is-clickable ${badgeCls}`);
            patchText(refs.agentBadgeEl, st.agentBadge || (st.isSubagent ? '子' : '主'));
            patchAttr(
              refs.agentBadgeEl,
              'title',
              effectiveScope === 'all'
                ? `点击仅过滤查看 ${st.agentLabel || '该代理'}`
                : '点击切回全部汇总'
            );
            refs.agentBadgeEl.onclick = () => {
              const targetScope = st.agentId || 'main';
              const nextScope = effectiveScope === targetScope ? 'all' : targetScope;
              uiStore.setState({
                selectedAgentScope: nextScope,
                ...(nextScope === 'all' ? { ctxInspectorAgentId: 'auto' } : {}),
              });
            };
          }
          patchText(refs.stepNumText, `#${Number(st.stepIndex)}`);
          const modelDisplay = resolveModelDisplayInfo(st, displaySettings, { fallback: '—' });
          patchText(refs.tdModel, modelDisplay.text);
          patchAttr(refs.tdModel, 'title', modelDisplay.title);

          patchText(refs.speedMain, formatMetric(st.tokPerSec, ' tok/s'));
          const reason = speedReasonText(st.selectedSpeedReason);
          patchText(refs.speedReason, reason);
          patchAttr(refs.speedReason, 'hidden', !reason);

          patchText(refs.tdTtft, formatMetric(st.ttftSec, 's'));
          patchText(
            refs.tdCtx,
            `${formatTokens(st.contextTokens)} / +${Number(st.outputTokens || 0)}`
          );
          patchText(refs.tdCache, `${Number(st.cacheHitPct ?? 0)}%`);

          const costVal = st.costUsd;
          patchText(refs.tdCost, formatUsd(costVal, { precise: true }));
          patchClasses(refs.tdCost, { 'accent-speed': costVal >= 0.15 });
        },
      });

      // 2. 按模型汇总表增量对账：以模型标识为稳定行键，展示调用次数、加权均速、有效样本比与总费用
      patchKeyedList(modelsTbody, models, {
        keyFn: (m) => m.label || m.shortName,
        sigFn: (m) => {
          const disp = resolveModelDisplayInfo(m, displaySettings, { fallback: '—' });
          return `${disp.text}:${disp.title}:${m.calls}:${m.avgTokPerSec}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.speedSummary?.sampleCount}`;
        },
        createRow: () => {
          const tdName = h('td', {
            style: 'font-weight: 600; max-width: 165px; overflow: hidden; text-overflow: ellipsis;',
          });
          const tdCalls = h('td');
          const speedMain = h('div');
          const speedSub = h('div', { className: 'text-muted', style: 'font-size: 9.5px;' });
          const tdSpeed = h('td', {}, [speedMain, speedSub]);
          const tdTokens = h('td');
          const tdCost = h('td', { style: 'font-weight: 600;' });
          const tr = h('tr', {}, [tdName, tdCalls, tdSpeed, tdTokens, tdCost]);
          return {
            el: tr,
            refs: { tdName, tdCalls, speedMain, speedSub, tdTokens, tdCost },
          };
        },
        updateRow: (refs, m) => {
          const modelDisplay = resolveModelDisplayInfo(m, displaySettings, { fallback: '—' });
          patchText(refs.tdName, modelDisplay.text);
          patchAttr(refs.tdName, 'title', modelDisplay.title);
          patchText(refs.tdCalls, String(Number(m.calls || 0)));
          patchText(refs.speedMain, formatMetric(m.avgTokPerSec, ' tok/s'));
          patchText(refs.speedSub, `有效 ${sampleSummary(m.speedSummary)}`);
          patchText(refs.tdTokens, formatTokens(m.totalTokens || 0));
          patchText(refs.tdCost, formatUsd(m.costUsd || 0));
        },
      });

      if (uiSt.stepsSubTab === 'models') {
        modelsScroll.refresh();
      } else {
        stepsScroll.refresh();
      }
    }

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        activeConversation: st.telemetry?.activeConversation,
        cascadeId: st.telemetry?.activeConversation?.cascadeId,
        recentSteps: st.telemetry?.activeConversation?.recentSteps,
        sessionModelBreakdown: st.telemetry?.activeConversation?.modelBreakdown,
        modelBreakdown: st.telemetry?.modelBreakdown,
        showUpstreamModel: Boolean(st.telemetry?.settings?.showUpstreamModel),
        orchestratorIdMode: normalizeOrchestratorIdDisplayMode(
          st.telemetry?.settings?.orchestratorIdMode
        ),
      }),
      (slice) => {
        latestSlice = slice;
        if (uiStore.getState().activeView !== 'steps') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderStepsData(slice);
      }
    );

    let prevScope = uiStore.getState().selectedAgentScope;

    const unsubView = uiStore.subscribe(
      (st) => ({
        activeView: st.activeView,
        selectedAgentScope: st.selectedAgentScope,
      }),
      (uiSlice) => {
        const scopeChanged = uiSlice.selectedAgentScope !== prevScope;
        prevScope = uiSlice.selectedAgentScope;
        if (uiSlice.activeView !== 'steps') {
          if (scopeChanged) isDirty = true;
          return;
        }
        if ((isDirty || scopeChanged) && latestSlice) {
          isDirty = false;
          renderStepsData(latestSlice);
        }
      }
    );

    onCleanup(() => {
      unsubUi();
      unsubTelemetry();
      unsubView();
      inlineScopeSelect.destroy();
      subTabSwitch.destroy();
      stepsScroll.destroy();
      modelsScroll.destroy();
    });

    return {
      el: rootEl,
      refs: {
        stepsTbody,
        modelsTbody,
        inlineScopeSelect,
        subTabSwitch,
        stepsScroll,
        modelsScroll,
      },
    };
  },
});

// --- src/views/SettingsView.js ---
/**
 * @fileoverview View 4: SettingsView (系统设置视图).
 * 采用定制的 `CustomSelect` 与 `SegmentedControl` 替代所有原生表单控件，分为三个单层细线设置面板：
 * 1. 常规设置：配置面板挂载方式（双栖挂载 / 仅右侧辅助栏）、模型名称格式（精简代号 / 原始模型 ID）与 Orchestrator 系列 ID 格式；
 * 2. 顶部栏定制：控制左侧「实时运行会话」入口开关，以及自由定义右侧精简胶囊三个数值槽位的显示内容与左右顺序；
 * 3. 版本更新：配置插件自动更新策略、手动同步云端模型价格表，以及检查并执行 Git/ZIP 双模式插件升级。
 */


/** 步骤明细表中的模型名称显示方式可选项 */
const STEP_MODEL_DISPLAY_OPTIONS = [
  { value: 'short', label: '精简代号 (如 argon-4-high)' },
  { value: 'upstream', label: '原始模型 ID (如 gemini-3.8-flash-n)' },
];

/** Orchestrator 系列模型 ID 显示方式可选项（独立于普通模型名称格式） */
const ORCHESTRATOR_ID_DISPLAY_OPTIONS = [
  { value: 'compact', label: '精简代号 (如 orchestrator-argon)' },
  { value: 'full', label: '原始完整 ID (如 gemini-pro-orchestrator)' },
];

/** 面板挂载模式可选项（顶部栏 + 侧边栏 vs 仅侧边栏） */
const WINDOW_MOUNT_OPTIONS = [
  { value: 'dual', label: '双栖挂载 (顶部栏 + 侧边栏)' },
  { value: 'sidebar', label: '仅侧边栏' },
];

/** 顶栏左侧实时运行会话入口显隐选项 */
const TOPBAR_MULTI_TOGGLE_OPTIONS = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' },
];

/** 顶栏右侧精简胶囊三槽位可选指标项 */
const TOPBAR_SLOT_OPTIONS = [
  { value: 'context', label: '上下文占用 (%)' },
  { value: 'tps', label: '输出速度 (TPS)' },
  { value: 'ttft', label: '首字延迟 (TTFT)' },
  { value: 'cost', label: '本次费用 ($)' },
  { value: 'quota_auto', label: '自动紧俏额度' },
  { value: 'gemini_5h', label: 'Gemini 5h 额度' },
  { value: 'gemini_weekly', label: 'Gemini 周额度' },
  { value: 'claude_5h', label: 'Claude 5h 额度' },
  { value: 'claude_weekly', label: 'Claude 周额度' },
  { value: 'none', label: '不显示' },
];

/** 插件版本更新策略可选项（默认仅提示新版本、手动更新） */
const AUTO_UPDATE_OPTIONS = [
  { value: 'manual', label: '仅提示新版本，手动更新' },
  { value: 'auto', label: '自动更新' },
  { value: 'off', label: '关闭更新' },
];

/**
 * 格式化云端价格目录的最近同步时间或版本日期文本。
 */
function formatSyncTimeText(tsMs, updatedAt) {
  if (Number(tsMs) > 0) {
    const d = new Date(Number(tsMs));
    const pad = (n) => String(n).padStart(2, '0');
    return `更新于 ${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (updatedAt) {
    return `发布于 ${String(updatedAt).slice(0, 10)}`;
  }
  return '默认价格';
}

const SettingsView = defineComponent({
  name: 'SettingsView',
  setup({ onCleanup }) {
    let draftShowUpstreamModel = false;
    let draftOrchestratorIdMode = 'compact';
    let draftPluginUpdateMode = 'manual';
    let draftEnableWindowOverlay = true;
    let draftShowTopbarMulti = true;
    let draftTopbarSlots = [...DEFAULT_CLIENT_TOPBAR_SLOTS];
    let statusTimer = null;
    let topbarTimer = null;
    let cloudTimer = null;

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const topbarStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const cloudStatusMsg = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    /** 在常规设置面板右上角展示短暂的保存状态提示 */
    function showSaveFeedback(text) {
      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }
      patchText(saveStatusText, text);
      if (text === '已保存' || text === '保存失败') {
        statusTimer = setTimeout(() => {
          statusTimer = null;
          patchText(saveStatusText, '');
        }, text === '保存失败' ? 2500 : 1500);
      }
    }

    /** 在顶部栏定制面板右上角展示短暂的状态提示 */
    function showTopbarFeedback(text, autoClearMs = 1500) {
      if (topbarTimer) {
        clearTimeout(topbarTimer);
        topbarTimer = null;
      }
      patchText(topbarStatusText, text);
      if (autoClearMs > 0) {
        topbarTimer = setTimeout(() => {
          topbarTimer = null;
          patchText(topbarStatusText, '');
        }, autoClearMs);
      }
    }

    /** 在云端同步面板右上角展示同步或更新进度提示 */
    function showCloudFeedback(text, autoClearMs = 3500) {
      if (cloudTimer) {
        clearTimeout(cloudTimer);
        cloudTimer = null;
      }
      patchText(cloudStatusMsg, text);
      if (autoClearMs > 0) {
        cloudTimer = setTimeout(() => {
          cloudTimer = null;
          patchText(cloudStatusMsg, '');
        }, autoClearMs);
      }
    }

    // --- 面板 1：常规设置 ---
    const windowMountSelect = CustomSelect({
      modelValue: 'dual',
      icon: 'dock',
      options: WINDOW_MOUNT_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextEnable = val !== 'sidebar';
        draftEnableWindowOverlay = nextEnable;
        windowMountSelect.setValue(nextEnable ? 'dual' : 'sidebar');
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            enableWindowOverlay: nextEnable,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const stepModelSelect = CustomSelect({
      modelValue: 'short',
      icon: 'table',
      options: STEP_MODEL_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextUpstream = val === 'upstream';
        draftShowUpstreamModel = nextUpstream;
        stepModelSelect.setValue(nextUpstream ? 'upstream' : 'short');
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            showUpstreamModel: nextUpstream,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const orchestratorIdSelect = CustomSelect({
      modelValue: 'compact',
      icon: 'layers',
      options: ORCHESTRATOR_ID_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextMode = normalizeClientOrchestratorIdMode(val);
        draftOrchestratorIdMode = nextMode;
        orchestratorIdSelect.setValue(nextMode);
        showSaveFeedback('保存中…');
        try {
          await saveSettingsPatch({
            orchestratorIdMode: nextMode,
          });
          showSaveFeedback('已保存');
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showSaveFeedback('保存失败');
        }
      },
    });

    const generalPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '常规设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '面板挂载方式' }),
        windowMountSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '模型名称格式' }),
        stepModelSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: 'Orchestrator 系列 ID' }),
        orchestratorIdSelect.el,
      ]),
    ]);

    // --- 面板 2：顶部栏定制（实时运行会话开关 + 右侧三槽位指标与顺序自定义） ---
    const multiSessionToggle = SegmentedControl({
      ariaLabel: '实时运行会话开关',
      modelValue: 'show',
      options: TOPBAR_MULTI_TOGGLE_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextShow = val !== 'hide';
        draftShowTopbarMulti = nextShow;
        syncTopbarControls();
        showTopbarFeedback('保存中…', 0);
        try {
          await saveSettingsPatch({
            showTopbarMultiSession: nextShow,
          });
          showTopbarFeedback('已保存', 1500);
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          showTopbarFeedback('保存失败', 2500);
        }
      },
    });

    async function persistTopbarSlots(nextRawSlots, noticeText = '') {
      const normalized = normalizeClientTopbarSlots(nextRawSlots);
      draftTopbarSlots = normalized;
      syncTopbarControls();
      showTopbarFeedback(noticeText || '保存中…', 0);
      try {
        await saveSettingsPatch({
          topbarCapsuleSlots: normalized,
        });
        showTopbarFeedback(noticeText || '已保存', noticeText ? 2000 : 1500);
      } catch {
        if (latestSettings) {
          renderSettings(latestSettings);
        }
        showTopbarFeedback('保存失败', 2500);
      }
    }

    function handleSlotMetricChange(slotIndex, nextVal) {
      const candidate = [...draftTopbarSlots];
      candidate[slotIndex] = nextVal;
      const wouldAllBeHidden = candidate.every((item) => item === 'none');
      void persistTopbarSlots(
        candidate,
        wouldAllBeHidden ? '至少保留 1 项显示' : ''
      );
    }

    function swapTopbarSlots(idxA, idxB) {
      if (idxA < 0 || idxA > 2 || idxB < 0 || idxB > 2 || idxA === idxB) return;
      const candidate = [...draftTopbarSlots];
      const temp = candidate[idxA];
      candidate[idxA] = candidate[idxB];
      candidate[idxB] = temp;
      void persistTopbarSlots(candidate);
    }

    const slotSelects = [0, 1, 2].map((idx) =>
      CustomSelect({
        modelValue: draftTopbarSlots[idx],
        options: TOPBAR_SLOT_OPTIONS,
        onUpdateModelValue: (val) => handleSlotMetricChange(idx, val),
      })
    );

    const slotRows = [0, 1, 2].map((idx) => {
      const upBtn = h(
        'button',
        {
          type: 'button',
          className: 'slot-move-btn',
          disabled: idx === 0,
          'aria-label': `槽位 ${idx + 1} 左移`,
          title: idx === 0 ? '已在最左' : '上移 (在顶栏靠左)',
          onClick: (e) => {
            e.stopPropagation();
            swapTopbarSlots(idx, idx - 1);
          },
        },
        [createSvgIcon('chevron-up', { size: 12 })]
      );

      const downBtn = h(
        'button',
        {
          type: 'button',
          className: 'slot-move-btn',
          disabled: idx === 2,
          'aria-label': `槽位 ${idx + 1} 右移`,
          title: idx === 2 ? '已在最右' : '下移 (在顶栏靠右)',
          onClick: (e) => {
            e.stopPropagation();
            swapTopbarSlots(idx, idx + 1);
          },
        },
        [createSvgIcon('chevron-down', { size: 12 })]
      );

      return h('div', { className: 'topbar-slot-row', 'data-slot-row': String(idx) }, [
        h('span', { className: 'slot-index-badge', text: String(idx + 1) }),
        slotSelects[idx].el,
        h('span', { className: 'slot-order-btns' }, [upBtn, downBtn]),
      ]);
    });

    const resetTopbarBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-ghost-sm',
        disabled: true,
        onClick: async () => {
          draftShowTopbarMulti = true;
          draftTopbarSlots = [...DEFAULT_CLIENT_TOPBAR_SLOTS];
          syncTopbarControls();
          showTopbarFeedback('保存中…', 0);
          try {
            await saveSettingsPatch({
              showTopbarMultiSession: true,
              topbarCapsuleSlots: [...DEFAULT_CLIENT_TOPBAR_SLOTS],
            });
            showTopbarFeedback('已恢复默认', 1600);
          } catch {
            if (latestSettings) {
              renderSettings(latestSettings);
            }
            showTopbarFeedback('保存失败', 2500);
          }
        },
      },
      [h('span', { text: '恢复默认' })]
    );

    function syncTopbarControls() {
      multiSessionToggle.setValue(draftShowTopbarMulti ? 'show' : 'hide');
      for (let i = 0; i < 3; i += 1) {
        slotSelects[i].setValue(draftTopbarSlots[i]);
      }
      const isDefault =
        draftShowTopbarMulti === true &&
        draftTopbarSlots[0] === DEFAULT_CLIENT_TOPBAR_SLOTS[0] &&
        draftTopbarSlots[1] === DEFAULT_CLIENT_TOPBAR_SLOTS[1] &&
        draftTopbarSlots[2] === DEFAULT_CLIENT_TOPBAR_SLOTS[2];
      patchAttr(resetTopbarBtn, 'disabled', isDefault);
    }

    const topbarPanel = h('section', { className: 'panel topbar-config-panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('dock', { size: 13 }),
          h('span', { text: '顶部栏定制' }),
        ]),
        h('span', { className: 'topbar-header-right' }, [topbarStatusText, resetTopbarBtn]),
      ]),
      h('div', { className: 'settings-inline-row' }, [
        h('span', { className: 'form-label', text: '实时运行会话' }),
        multiSessionToggle.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '胶囊数值与顺序 (左 → 右)' }),
        h('div', { className: 'topbar-slot-list' }, slotRows),
      ]),
    ]);

    // --- 面板 3：版本更新面板 ---
    const autoUpdateSelect = CustomSelect({
      modelValue: 'manual',
      icon: 'refresh',
      options: AUTO_UPDATE_OPTIONS,
      onUpdateModelValue: async (val) => {
        const nextMode = normalizeClientUpdateMode(val);
        draftPluginUpdateMode = nextMode;
        autoUpdateSelect.setValue(nextMode);
        if (latestCloudStatus) {
          renderCloudStatus(latestCloudStatus);
        }
        showCloudFeedback('保存中…', 0);
        try {
          await saveSettingsPatch({
            pluginUpdateMode: nextMode,
            autoUpdatePlugin: nextMode === 'auto',
          });
          showCloudFeedback('已保存', 1800);
        } catch {
          if (latestSettings) {
            renderSettings(latestSettings);
          }
          if (latestCloudStatus) {
            renderCloudStatus(latestCloudStatus);
          }
          showCloudFeedback('保存失败', 2500);
        }
      },
    });

    const pricingCountVal = h('strong', { className: 'cell-value', text: '—' });
    const pricingSyncSub = h('span', { className: 'cell-sub', text: '读取中…' });
    const versionVal = h('strong', { className: 'cell-value', text: 'v1.4.4' });
    const versionSub = h('span', { className: 'cell-sub', text: '检查中…' });

    const syncPricingBtnText = h('span', { text: '更新价格表' });
    const syncPricingBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-secondary',
        onClick: async () => {
          patchAttr(syncPricingBtn, 'disabled', true);
          patchText(syncPricingBtnText, '更新中…');
          showCloudFeedback('正在同步价格表…', 0);
          try {
            const res = await triggerCloudSync();
            const cs = res?.cloudStatus;
            if (res?.ok && cs) {
              showCloudFeedback(`价格表已更新 (${cs.modelCount} 个模型)`, 3500);
            } else {
              showCloudFeedback(cs?.lastSyncError || '连接超时，使用本地价格表', 4500);
            }
          } catch (err) {
            showCloudFeedback(err?.message || '同步失败，使用本地价格表', 4500);
          } finally {
            patchAttr(syncPricingBtn, 'disabled', false);
            patchText(syncPricingBtnText, '更新价格表');
          }
        },
      },
      [createSvgIcon('refresh', { size: 12 }), syncPricingBtnText]
    );

    const updatePluginBtnText = h('span', { text: '检查更新' });
    const updatePluginBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-secondary',
        onClick: async () => {
          patchAttr(updatePluginBtn, 'disabled', true);
          try {
            if (!latestCloudStatus?.updateAvailable) {
              patchText(updatePluginBtnText, '检查中…');
              showCloudFeedback('正在检查新版本…', 0);
              const syncRes = await triggerCloudSync();
              const cs = syncRes?.cloudStatus || latestCloudStatus;
              if (cs) {
                latestCloudStatus = cs;
                renderCloudStatus(cs);
              }
              if (!syncRes?.ok && cs?.lastSyncError) {
                showCloudFeedback(`检查失败：${cs.lastSyncError}`, 5000);
                return;
              }
              if (!cs?.updateAvailable) {
                const curVer = cs?.currentPluginVersion || '1.4.4';
                showCloudFeedback(`当前已是最新版本 (v${curVer})`, 4500);
                return;
              }
            }
            patchText(updatePluginBtnText, '更新中…');
            showCloudFeedback('正在下载更新…', 0);
            const res = await triggerPluginUpdate();
            if (res?.cloudStatus) {
              latestCloudStatus = res.cloudStatus;
            }
            if (res?.ok) {
              showCloudFeedback(res.message || '更新完成，正在重启面板…', 5000);
            } else {
              showCloudFeedback(res?.message || '未执行更新', 5500);
            }
          } catch (err) {
            showCloudFeedback(err?.message || '更新失败', 5000);
          } finally {
            patchAttr(updatePluginBtn, 'disabled', false);
            renderCloudStatus(latestCloudStatus);
          }
        },
      },
      [createSvgIcon('arrow-down', { size: 12 }), updatePluginBtnText]
    );

    const cloudPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('bolt', { size: 13 }),
          h('span', { text: '版本更新' }),
        ]),
        cloudStatusMsg,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '更新方式' }),
        autoUpdateSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'matrix-cell' }, [
          h('span', { className: 'cell-label', text: '价格表' }),
          pricingCountVal,
          pricingSyncSub,
        ]),
        h('div', { className: 'matrix-cell' }, [
          h('span', { className: 'cell-label', text: '当前版本' }),
          versionVal,
          versionSub,
        ]),
      ]),
      h('div', { className: 'cloud-actions-row' }, [syncPricingBtn, updatePluginBtn]),
    ]);

    const settingsInner = h(
      'div',
      {
        style: 'display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: 2px;',
      },
      [generalPanel, topbarPanel, cloudPanel]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: settingsInner,
      className: 'view-pane',
    });

    let latestSettings = null;
    let latestCloudStatus = null;

    /** 将后端返回的最新设置同步至表单控件 */
    function renderSettings(settings) {
      if (!settings) return;
      draftShowUpstreamModel = Boolean(settings.showUpstreamModel);
      draftOrchestratorIdMode = normalizeClientOrchestratorIdMode(settings.orchestratorIdMode);
      draftPluginUpdateMode = normalizeClientUpdateMode(
        settings.pluginUpdateMode,
        settings.autoUpdatePlugin
      );
      draftEnableWindowOverlay = settings.enableWindowOverlay !== false;
      draftShowTopbarMulti = settings.showTopbarMultiSession !== false;
      draftTopbarSlots = normalizeClientTopbarSlots(settings.topbarCapsuleSlots);

      windowMountSelect.setValue(draftEnableWindowOverlay ? 'dual' : 'sidebar');
      stepModelSelect.setValue(draftShowUpstreamModel ? 'upstream' : 'short');
      orchestratorIdSelect.setValue(draftOrchestratorIdMode);
      autoUpdateSelect.setValue(draftPluginUpdateMode);
      syncTopbarControls();
      viewScrollbar.refresh();
    }

    /** 将云端价格表统计与插件版本对比状态同步至云端面板 */
    function renderCloudStatus(cs) {
      if (!cs) return;
      const srcLabel =
        cs.source === 'remote'
          ? '云端同步'
          : cs.source === 'local'
            ? '本地文件'
            : '内置默认';
      patchText(pricingCountVal, `${cs.modelCount || 0} 个模型`);
      patchText(
        pricingSyncSub,
        `${srcLabel} · ${formatSyncTimeText(cs.lastSyncedAtMs, cs.catalogUpdatedAt)}`
      );

      const curVer = cs.currentPluginVersion || '1.4.4';
      const latVer = cs.latestPluginVersion || curVer;
      const modeTag = cs.installMode === 'git' ? 'Git' : 'ZIP';
      patchText(versionVal, `v${curVer}`);
      if (cs.updateAvailable && draftPluginUpdateMode !== 'off') {
        patchText(versionSub, `可升级至 v${latVer} (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': true });
        patchText(updatePluginBtnText, `升级至 v${latVer}`);
        patchClasses(updatePluginBtn, { 'btn-primary': true, 'btn-secondary': false });
      } else if (draftPluginUpdateMode === 'off') {
        patchText(versionSub, `已关闭更新提醒 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, cs.updateAvailable ? `手动升级 v${latVer}` : '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      } else {
        patchText(versionSub, `已是最新 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      }

      if (!cloudTimer && (cs.lastUpdateError || (cs.lastUpdateResult?.ok === false && cs.lastUpdateResult?.message))) {
        showCloudFeedback(cs.lastUpdateError || cs.lastUpdateResult.message, 5500);
      }
      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({
        settings: st.telemetry?.settings,
        cloudStatus: st.telemetry?.cloudStatus,
      }),
      (slice) => {
        latestSettings = slice.settings;
        latestCloudStatus = slice.cloudStatus;
        renderSettings(slice.settings);
        if (uiStore.getState().activeView === 'settings') {
          renderCloudStatus(slice.cloudStatus);
        }
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings') {
          if (latestSettings) renderSettings(latestSettings);
          if (latestCloudStatus) renderCloudStatus(latestCloudStatus);
          viewScrollbar.refresh();
        }
      }
    );

    onCleanup(() => {
      if (statusTimer) clearTimeout(statusTimer);
      if (topbarTimer) clearTimeout(topbarTimer);
      if (cloudTimer) clearTimeout(cloudTimer);
      unsub();
      unsubView();
      windowMountSelect.destroy();
      stepModelSelect.destroy();
      orchestratorIdSelect.destroy();
      multiSessionToggle.destroy();
      for (const sel of slotSelects) {
        sel.destroy();
      }
      autoUpdateSelect.destroy();
      viewScrollbar.destroy();
    });

    return {
      el: viewScrollbar.el,
      refs: {
        windowMountSelect,
        stepModelSelect,
        orchestratorIdSelect,
        multiSessionToggle,
        slotSelects,
        resetTopbarBtn,
        autoUpdateSelect,
        viewScrollbar,
      },
    };
  },
});

// --- src/App.js ---
/**
 * @fileoverview Root Application Shell (App.js).
 * Combines the compact dual-layer header (TopSessionHeader + TopLongPillNav)
 * and single-viewport functional views.
 */


const App = defineComponent({
  name: 'App',
  setup({ onCleanup }) {
    const sessionHeader = TopSessionHeader();
    const topPillNav = TopLongPillNav({
      modelValue: uiStore.getState().activeView,
      items: VIEW_TABS,
      onUpdateModelValue: (nextView) => {
        uiStore.setState({ activeView: nextView });
      },
    });

    const overviewView = LiveOverviewView();
    const consumptionView = ConsumptionView();
    const stepsView = StepsDetailView();
    const settingsView = SettingsView();

    const viewMap = {
      overview: overviewView.el,
      consumption: consumptionView.el,
      steps: stepsView.el,
      settings: settingsView.el,
    };

    const stageEl = h('div', { className: 'viewport-stage' }, [
      overviewView.el,
      consumptionView.el,
      stepsView.el,
      settingsView.el,
    ]);

    const shellEl = h('main', { className: 'app-shell' }, [
      h('div', { className: 'top-deck' }, [sessionHeader.el, topPillNav.el]),
      stageEl,
    ]);

    function syncStepsBadge() {
      const uiSt = uiStore.getState();
      const scopeForBadge = uiSt.activeView === 'steps' ? uiSt.selectedAgentScope : 'all';
      const { scopedConv } = resolveScopedConversation(
        telemetryStore.getState().telemetry,
        scopeForBadge,
        uiSt.ctxInspectorAgentId
      );
      const stepCount = scopedConv?.stepCount ?? 0;
      topPillNav.setProps({
        items: VIEW_TABS.map((t) =>
          t.value === 'steps' ? { ...t, badge: stepCount > 0 ? stepCount : '' } : t
        ),
      });
    }

    const unsubUi = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        topPillNav.setValue(activeView);
        for (const [key, paneEl] of Object.entries(viewMap)) {
          patchAttr(paneEl, 'hidden', key !== activeView);
        }
        if (activeView === 'overview') {
          overviewView.refs?.viewScrollbar?.refresh();
        } else if (activeView === 'consumption') {
          consumptionView.refs?.viewScrollbar?.refresh();
        } else if (activeView === 'steps') {
          stepsView.refs?.stepsScroll?.refresh();
          stepsView.refs?.modelsScroll?.refresh();
        } else if (activeView === 'settings') {
          settingsView.refs?.viewScrollbar?.refresh();
        }
        syncStepsBadge();
      }
    );

    const unsubStepCount = telemetryStore.subscribe(
      (st) => ({
        stepCount: st.telemetry?.activeConversation?.stepCount ?? 0,
        totalStepsAllAgents: st.telemetry?.activeConversation?.totalStepsAllAgents ?? 0,
        subagentCount: st.telemetry?.activeConversation?.subagentCount ?? 0,
      }),
      () => syncStepsBadge()
    );

    const unsubScopeBadge = uiStore.subscribe(
      (st) => st.selectedAgentScope,
      () => syncStepsBadge()
    );

    onCleanup(() => {
      unsubUi();
      unsubStepCount();
      unsubScopeBadge();
      sessionHeader.destroy();
      topPillNav.destroy();
      overviewView.destroy();
      consumptionView.destroy();
      stepsView.destroy();
      settingsView.destroy();
    });

    return {
      el: shellEl,
      refs: {
        sessionHeader,
        topPillNav,
        overviewView,
        consumptionView,
        stepsView,
        settingsView,
      },
    };
  },
});

// --- src/components/layout/WindowOverlayShell.js ---
/**
 * @fileoverview 主窗口双栖挂载外壳 (WindowOverlayShell.js).
 *
 * 采用「分离式双 Shadow Host」架构，彻底规避宿主顶栏层叠上下文 (`z-0` / `overflow: hidden`) 裁切与路由重绘卸载问题：
 * 1. `#ag-usage-monitor-capsule`：轻量顶栏胶囊，优先内嵌停靠至 `[class*="@container/titlebar"]` 右侧按钮组，
 *    支持四级迟滞宽度自适应折叠（`wide` -> `compact` -> `minimal` -> `ring-only`），找不到顶栏时自动回退至右上角固定定位；
 * 2. `#ag-usage-monitor-portal`：常驻 `document.body` 顶层的无遮挡浮层宿主，承载悬停速览卡与完整四标签 `App()` 监控面板，
 *    在宿主切换会话重建顶栏 DOM 时始终保持组件实例、滚动位置与动画状态不丢失。
 */


const CAPSULE_HOST_ID = 'ag-usage-monitor-capsule';
const PORTAL_HOST_ID = 'ag-usage-monitor-portal';
const FLOATING_CARD_WIDTH = 492;
const MULTI_PANEL_WIDTH = 484;
const RING_RADIUS = 5.2;
const RING_CIRCUMFERENCE = +(2 * Math.PI * RING_RADIUS).toFixed(2);

/**
 * 带迟滞区间（Hysteresis）的四阶段顶栏双胶囊响应式宽度计算，避免临界宽度反复跳动。
 * 当左侧多会话入口关闭（`showMulti === false`）时自动释放约 76px 预算给右侧指标胶囊。
 *
 * @param {number} availWidth
 * @param {'wide'|'compact'|'minimal'|'ring-only'} currentMode
 * @param {{ showMulti?: boolean }} [options]
 * @returns {'wide'|'compact'|'minimal'|'ring-only'}
 */
function computeCapsuleLayoutMode(availWidth, currentMode = 'wide', options = undefined) {
  if (availWidth == null || Number.isNaN(availWidth)) return 'wide';
  const showMulti = options?.showMulti !== false;
  const updateReserve = options?.hasUpdate ? 52 : 0;
  const baseEffWidth = showMulti ? availWidth : availWidth + 76;
  const effWidth = baseEffWidth - updateReserve;
  if (currentMode === 'wide') {
    if (baseEffWidth < 78) return 'ring-only';
    if (effWidth < 196) return 'minimal';
    if (effWidth < 256) return 'compact';
    return 'wide';
  }
  if (currentMode === 'compact') {
    if (effWidth >= 272) return 'wide';
    if (baseEffWidth < 78) return 'ring-only';
    if (effWidth < 196) return 'minimal';
    return 'compact';
  }
  if (currentMode === 'minimal') {
    if (effWidth >= 272) return 'wide';
    if (effWidth >= 212) return 'compact';
    if (baseEffWidth < 78) return 'ring-only';
    return 'minimal';
  }
  if (effWidth >= 272) return 'wide';
  if (effWidth >= 212) return 'compact';
  if (baseEffWidth >= 92) return 'minimal';
  return 'ring-only';
}

function findHostTitlebar() {
  try {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
      return null;
    }
    return document.querySelector('[class*="@container/titlebar"]');
  } catch {
    return null;
  }
}

function findNativeTopRightAnchor() {
  try {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
      return null;
    }
    const auxToggle = document.querySelector('[data-testid="toggle-aux-sidebar"]');
    if (auxToggle?.closest) {
      return auxToggle.closest('div.absolute.right-0.top-0') || auxToggle;
    }
    const candidates = document.querySelectorAll('button, a, [role="button"]');
    for (const btn of candidates) {
      const text = String(btn.textContent || '').trim();
      if (
        (text === 'Open IDE' || text === '打开 IDE' || text.includes('Open IDE') || text.includes('打开 IDE')) &&
        btn.getBoundingClientRect?.().top < 52
      ) {
        return btn.closest?.('div.flex.items-center, div.absolute.right-0') || btn;
      }
    }
    return document.querySelector('div.absolute.right-0.top-0');
  } catch {
    return null;
  }
}

function getLeftSidebarRightEdge(vw) {
  try {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      const navEl = document.querySelector('div[role="navigation"]');
      if (navEl?.getBoundingClientRect) {
        const nr = navEl.getBoundingClientRect();
        if (nr.width > 0 && nr.left <= 8 && nr.right > 0 && nr.right < vw - 280) {
          return Math.ceil(nr.right);
        }
      }
    }
  } catch {
    // 忽略侧栏测量异常
  }
  return 0;
}

function resolveQuotaCapsuleSummary(quotas) {
  if (!quotas) return null;
  const activePool = quotas.activePool;
  const weekly = quotas.weekly;
  const candidates = [];
  if (activePool && Number.isFinite(Number(activePool.remainingPct))) {
    candidates.push({
      pct: Number(activePool.remainingPct),
      label: activePool.poolLabel || activePool.family || '当前池',
      windowTag: '5h',
    });
  }
  if (activePool && Number.isFinite(Number(activePool.weeklyRemainingPct))) {
    candidates.push({
      pct: Number(activePool.weeklyRemainingPct),
      label: activePool.poolLabel || activePool.family || '当前池',
      windowTag: '周',
    });
  }
  if (!candidates.length && weekly && Number.isFinite(Number(weekly.remainingPct))) {
    candidates.push({
      pct: Number(weekly.remainingPct),
      label: weekly.poolFamily || '周限额',
      windowTag: '周',
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.pct - b.pct);
  const tightest = candidates[0];
  const rounded = Math.max(0, Math.min(100, Math.round(tightest.pct)));
  return {
    roundedPct: rounded,
    shortText: `余 ${rounded}%`,
    detailText: candidates
      .map((c) => `${c.label} ${c.windowTag} 余 ${Math.max(0, Math.min(100, Math.round(c.pct)))}%`)
      .join(' · '),
  };
}

const THIRD_PARTY_FAMILY_RE = /claude|gpt|anthropic|openai|3p|sonnet|opus|haiku/i;

/**
 * 解析指定模型池（Gemini 或 Claude & GPT）与指定时间窗口（5h 或周额度）的剩余百分比摘要。
 *
 * @param {object|null|undefined} quotas
 * @param {'gemini_5h'|'gemini_weekly'|'claude_5h'|'claude_weekly'} slotKey
 * @returns {{ roundedPct: number, shortText: string } | null}
 */
function resolveSpecificQuotaSlotSummary(quotas, slotKey) {
  if (!quotas) return null;
  const pools = Array.isArray(quotas.pools) ? quotas.pools : [];
  const activePool = quotas.activePool || null;
  const isClaude = slotKey.startsWith('claude_');
  const isWeekly = slotKey.endsWith('_weekly');
  let rawPct = null;

  if (isClaude) {
    const claudePool =
      pools.find((p) => p?.poolKey === 'Claude & GPT') ||
      pools.find((p) => THIRD_PARTY_FAMILY_RE.test(String(p?.poolKey || p?.poolLabel || '')));
    const cand = isWeekly ? claudePool?.weeklyRemainingPct : claudePool?.remainingPct;
    if (cand != null && Number.isFinite(Number(cand))) {
      rawPct = Number(cand);
    } else if (
      activePool &&
      THIRD_PARTY_FAMILY_RE.test(String(activePool.family || activePool.poolLabel || ''))
    ) {
      const fb = isWeekly ? activePool.weeklyRemainingPct : activePool.remainingPct;
      if (fb != null && Number.isFinite(Number(fb))) {
        rawPct = Number(fb);
      }
    }
  } else {
    const stdGemini =
      pools.find((p) => p?.poolKey === 'Gemini') ||
      pools.find(
        (p) =>
          /gemini/i.test(String(p?.poolKey || p?.poolLabel || '')) &&
          !/carbon|argon/i.test(String(p?.poolKey || ''))
      );
    const geminiFamilyPools = pools.filter((p) =>
      /gemini|carbon|argon/i.test(String(p?.poolKey || p?.poolLabel || ''))
    );
    const primaryCand = isWeekly ? stdGemini?.weeklyRemainingPct : stdGemini?.remainingPct;
    if (primaryCand != null && Number.isFinite(Number(primaryCand))) {
      rawPct = Number(primaryCand);
    } else {
      const familyVals = geminiFamilyPools
        .map((p) => (isWeekly ? p?.weeklyRemainingPct : p?.remainingPct))
        .filter((v) => v != null && Number.isFinite(Number(v)))
        .map(Number);
      if (familyVals.length > 0) {
        rawPct = Math.min(...familyVals);
      } else if (
        activePool &&
        !THIRD_PARTY_FAMILY_RE.test(String(activePool.family || activePool.poolLabel || ''))
      ) {
        const fb = isWeekly ? activePool.weeklyRemainingPct : activePool.remainingPct;
        if (fb != null && Number.isFinite(Number(fb))) {
          rawPct = Number(fb);
        }
      }
      if (
        rawPct == null &&
        isWeekly &&
        quotas.weekly &&
        !THIRD_PARTY_FAMILY_RE.test(String(quotas.weekly.poolFamily || '')) &&
        quotas.weekly.remainingPct != null &&
        Number.isFinite(Number(quotas.weekly.remainingPct))
      ) {
        rawPct = Number(quotas.weekly.remainingPct);
      }
    }
  }

  if (rawPct == null || !Number.isFinite(rawPct)) return null;
  const rounded = Math.max(0, Math.min(100, Math.round(rawPct)));
  return {
    roundedPct: rounded,
    shortText: `余 ${rounded}%`,
  };
}

function formatCompactCapsuleCost(stepCost) {
  if (stepCost == null || !Number.isFinite(Number(stepCost))) return '--';
  const val = Math.max(0, Number(stepCost));
  if (val === 0) return '$0.00';
  if (val < 0.001) return '<$0.001';
  if (val < 1) return `$${val.toFixed(3)}`;
  if (val < 100) return `$${val.toFixed(2)}`;
  return `$${Math.round(val)}`;
}

function formatCompactCapsuleTtft(ttftSec) {
  if (ttftSec == null || !Number.isFinite(Number(ttftSec)) || Number(ttftSec) < 0) return '--s';
  const val = Number(ttftSec);
  if (val < 1) return `${val.toFixed(2)}s`;
  if (val < 100) return `${val.toFixed(1)}s`;
  return `${Math.round(val)}s`;
}

/**
 * 在主窗口挂载双栖顶栏胶囊与完整四标签悬浮面板，并注册 `window.__AGUsageMonitorOverlay` 生命周期句柄。
 */
function mountWindowOverlay() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // 先读取旧实例缓存的遥测快照与展开态（热升级时无缝承接数据与悬停状态，杜绝闪烁或关开），再安全卸载旧实例
  let carryOverTelemetry = null;
  let carryOverTooltipOpen = false;
  let carryOverPopoverOpen = false;
  let carryOverMultiHoverOpen = false;
  let carryOverMultiPinnedOpen = false;
  let carryOverPointer = null;
  try {
    const prevOv = window.__AGUsageMonitorOverlay;
    carryOverTelemetry = prevOv?.getTelemetrySnapshot?.() || null;
    carryOverTooltipOpen = Boolean(prevOv?.isHoverOpen?.());
    carryOverPopoverOpen = Boolean(prevOv?.isOpen?.());
    carryOverMultiHoverOpen = Boolean(prevOv?.isMultiHoverOpen?.());
    carryOverMultiPinnedOpen = Boolean(prevOv?.isMultiPinnedOpen?.());
    carryOverPointer = prevOv?.getLastPointer?.() || null;
    prevOv?.dispose?.();
  } catch {
    // 忽略旧实例卸载异常
  }
  try {
    document.getElementById(CAPSULE_HOST_ID)?.remove?.();
    document.getElementById(PORTAL_HOST_ID)?.remove?.();
  } catch {
    // 忽略残留节点清理异常
  }

  const bridgeConfig = getWindowBridgeConfig();
  const bundleVersion = String(bridgeConfig?.bundleVersion || '');
  const stylesCss = String(bridgeConfig?.stylesCss || '');
  const seedTelemetry =
    (bridgeConfig?.initialTelemetry && typeof bridgeConfig.initialTelemetry === 'object'
      ? bridgeConfig.initialTelemetry
      : null) || carryOverTelemetry;
  if (bridgeConfig?.initialTelemetry) {
    delete bridgeConfig.initialTelemetry;
  }
  if (seedTelemetry) {
    telemetryStore.setState({
      telemetry: seedTelemetry,
      minuteTick: Math.floor(Date.now() / 30000),
      syncState: 'idle',
    });
  }

  let disposed = false;
  let popoverOpen = false;
  let tooltipOpen = false;
  let multiOpen = false;
  let multiPinned = false;
  let hoverLeaveTimer = null;
  let multiLeaveTimer = null;
  const manualSubExpandMap = new Map();
  const multiTimersMap = new Map();
  let multiLiveTickTimer = null;
  let hasPointerCoords = Boolean(
    carryOverPointer &&
      Number.isFinite(carryOverPointer.x) &&
      Number.isFinite(carryOverPointer.y)
  );
  let lastPointerX = hasPointerCoords ? carryOverPointer.x : -1;
  let lastPointerY = hasPointerCoords ? carryOverPointer.y : -1;
  let layoutMode = 'wide';
  let observedTitlebar = null;
  let dockRafId = 0;
  let lastObservedRouteId = extractHostRouteCascadeId();

  function recordPointerCoords(e) {
    if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      hasPointerCoords = true;
    }
  }

  function isPointerStillInCapsule() {
    if (!hasPointerCoords || document.hidden || !capsuleBtn.getBoundingClientRect) {
      return false;
    }
    const r = capsuleBtn.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    let rightBound = r.right;
    if (!topbarUpdateBtn.hasAttribute('hidden') && topbarUpdateBtn.getBoundingClientRect) {
      const ur = topbarUpdateBtn.getBoundingClientRect();
      if (ur.width > 0 && ur.height > 0) {
        rightBound = Math.max(rightBound, ur.right);
      }
    }
    return (
      lastPointerX >= r.left - 1 &&
      lastPointerX <= rightBound + 1 &&
      lastPointerY >= r.top - 1 &&
      lastPointerY <= r.bottom + 1
    );
  }

  function isPointerInMultiZone() {
    if (!hasPointerCoords || document.hidden || multiBtn.hasAttribute('hidden')) {
      return false;
    }
    if (multiBtn.getBoundingClientRect) {
      const mr = multiBtn.getBoundingClientRect();
      if (
        mr.width > 0 &&
        mr.height > 0 &&
        lastPointerX >= mr.left - 1 &&
        lastPointerX <= mr.right + 1 &&
        lastPointerY >= mr.top - 1 &&
        lastPointerY <= mr.bottom + 10
      ) {
        return true;
      }
    }
    if (multiOpen && multiPanelEl.getBoundingClientRect) {
      const pr = multiPanelEl.getBoundingClientRect();
      if (
        pr.width > 0 &&
        pr.height > 0 &&
        lastPointerX >= pr.left - 1 &&
        lastPointerX <= pr.right + 1 &&
        lastPointerY >= pr.top - 4 &&
        lastPointerY <= pr.bottom + 1
      ) {
        return true;
      }
    }
    return false;
  }

  function scheduleMultiHoverClose() {
    if (multiLeaveTimer) {
      clearTimeout(multiLeaveTimer);
    }
    multiLeaveTimer = setTimeout(() => {
      multiLeaveTimer = null;
      if (disposed || multiPinned || !multiOpen) return;
      let nativeHover = false;
      try {
        nativeHover = Boolean(
          multiBtn.matches?.(':hover') || multiPanelEl.matches?.(':hover')
        );
      } catch {
        nativeHover = false;
      }
      if (nativeHover || isPointerInMultiZone()) {
        return;
      }
      setMultiOpen(false);
    }, 90);
  }

  function bindMultiElapsedTimer(timerKey, sig, rawStartMs, targetEl) {
    const now = Date.now();
    const prev = multiTimersMap.get(timerKey);
    let startMs = prev?.startMs || 0;
    if (!prev || prev.sig !== sig) {
      const validRaw = Number(rawStartMs || 0);
      startMs = validRaw > 0 && validRaw <= now + 2000 ? validRaw : now;
    } else if (startMs <= 0 && Number(rawStartMs) > 0 && Number(rawStartMs) <= now + 2000) {
      startMs = Number(rawStartMs);
    }
    multiTimersMap.set(timerKey, { sig, startMs, el: targetEl });
    const elapsedSec = Math.max(0, (now - startMs) / 1000);
    patchText(targetEl, formatElapsedSec(elapsedSec));
  }

  function tickMultiElapsedDisplay() {
    const now = Date.now();
    for (const entry of multiTimersMap.values()) {
      if (!entry?.el) continue;
      const elapsedSec = entry.startMs > 0 ? Math.max(0, (now - entry.startMs) / 1000) : 0;
      patchText(entry.el, formatElapsedSec(elapsedSec));
    }
  }

  function stopMultiLiveTicker() {
    if (multiLiveTickTimer) {
      clearInterval(multiLiveTickTimer);
      multiLiveTickTimer = null;
    }
    multiTimersMap.clear();
  }

  function ensureMultiLiveTicker() {
    if (multiTimersMap.size === 0) {
      stopMultiLiveTicker();
      return;
    }
    if (!multiLiveTickTimer) {
      multiLiveTickTimer = setInterval(tickMultiElapsedDisplay, 1000);
    }
  }

  function inspectSessionInMonitor(cascadeId) {
    if (!cascadeId || cascadeId === 'current') return;
    uiStore.setState({
      activeView: 'overview',
      selectedAgentScope: 'all',
      ctxInspectorAgentId: 'auto',
    });
    telemetryStore.setState({ selectedConversationId: cascadeId });
    void fetchTelemetry({ force: false });
    setMultiOpen(false);
    setPopoverOpen(true);
  }

  // --- 1. 创建顶栏双胶囊 Shadow Host（左：多会话实时信息；右：单会话指标胶囊） ---
  const capsuleHost = document.createElement('div');
  capsuleHost.id = CAPSULE_HOST_ID;
  capsuleHost.className = 'wm-capsule-host';
  capsuleHost.setAttribute('data-dock', 'fixed');
  capsuleHost.setAttribute('data-layout', layoutMode);
  const capsuleShadow = capsuleHost.attachShadow({ mode: 'open' });

  const capsuleStyleEl = document.createElement('style');
  capsuleStyleEl.textContent = stylesCss;
  capsuleShadow.appendChild(capsuleStyleEl);

  // 左侧无边框多会话实时触发按钮（固定预占宽度，不随运行数跳动）
  const multiDot = h('span', { className: 'wm-multi-dot' });
  const multiLabel = h('span', { className: 'wm-multi-label', text: '0 运行中' });
  const multiBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-multi-btn',
      'aria-label': '多会话实时信息',
      'aria-expanded': 'false',
      onClick: (e) => {
        e.stopPropagation();
        if (multiOpen && multiPinned) {
          setMultiOpen(false);
        } else {
          setMultiOpen(true, { pinned: true });
        }
      },
      onContextmenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        void fetchTelemetry({ force: true });
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (multiLeaveTimer) {
          clearTimeout(multiLeaveTimer);
          multiLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          setMultiOpen(true, { pinned: false });
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (!multiPinned) {
          scheduleMultiHoverClose();
        }
      },
    },
    [multiDot, multiLabel]
  );

  // 构建可复用的预占胶囊槽位节点（仅当槽位配置为 context 时挂载环形 SVG，运行期仅就地更新文本与属性）
  function createCapsuleSlot(slotIndex, initialMetric) {
    const ringSvg = document.createElementNS(SVG_NS, 'svg');
    ringSvg.setAttribute('viewBox', '0 0 14 14');
    ringSvg.setAttribute('class', 'wm-ring-svg');
    ringSvg.setAttribute('aria-hidden', 'true');

    const ringTrack = document.createElementNS(SVG_NS, 'circle');
    ringTrack.setAttribute('cx', '7');
    ringTrack.setAttribute('cy', '7');
    ringTrack.setAttribute('r', String(RING_RADIUS));
    ringTrack.setAttribute('class', 'wm-ring-track');

    const ringFill = document.createElementNS(SVG_NS, 'circle');
    ringFill.setAttribute('cx', '7');
    ringFill.setAttribute('cy', '7');
    ringFill.setAttribute('r', String(RING_RADIUS));
    ringFill.setAttribute('class', 'wm-ring-fill');
    ringFill.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
    ringFill.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE));

    ringSvg.appendChild(ringTrack);
    ringSvg.appendChild(ringFill);

    const isCtx = initialMetric === 'context';
    const textSpan = h('span', {
      className: isCtx ? 'wm-slot-text wm-ctx-pct' : 'wm-slot-text',
      text: isCtx ? '--%' : initialMetric === 'tps' ? '-- t/s' : '余 --%',
    });
    const el = h(
      'span',
      {
        className: isCtx
          ? 'wm-cap-slot wm-ctx-seg'
          : initialMetric === 'tps'
            ? 'wm-cap-slot wm-seg-speed'
            : 'wm-cap-slot wm-seg-quota',
        'data-slot-idx': String(slotIndex),
        'data-metric': initialMetric,
        'data-vis-rank': String(slotIndex + 1),
      },
      isCtx ? [ringSvg, textSpan] : [textSpan]
    );

    return {
      el,
      ringSvg,
      ringFill,
      textSpan,
      ringMounted: isCtx,
    };
  }

  const capsuleSlots = [
    createCapsuleSlot(0, 'context'),
    createCapsuleSlot(1, 'tps'),
    createCapsuleSlot(2, 'quota_auto'),
  ];
  const sep0 = h('span', { className: 'wm-sep wm-sep-speed', 'data-sep-for-rank': '2' });
  const sep1 = h('span', { className: 'wm-sep wm-sep-quota', 'data-sep-for-rank': '3' });
  let lastShowMulti = true;
  let lastShowUpdate = false;
  let isTopbarUpdating = false;

  const updateDot = h('span', { className: 'wm-update-dot', hidden: true });
  const topbarUpdateIcon = createSvgIcon('arrow-down', { size: 10 });
  const topbarUpdateLabel = h('span', { className: 'wm-update-label', text: '新版本' });
  const topbarUpdateBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-update-btn',
      hidden: true,
      'aria-label': '发现新版本，点击更新',
      title: '发现新版本，点击立即更新',
      onClick: async (e) => {
        e.stopPropagation();
        if (isTopbarUpdating) return;
        isTopbarUpdating = true;
        patchClasses(topbarUpdateBtn, { 'is-updating': true });
        patchSvgIcon(topbarUpdateIcon, 'refresh');
        patchText(topbarUpdateLabel, '更新中…');
        patchAttr(topbarUpdateBtn, 'disabled', true);
        try {
          const res = await triggerPluginUpdate();
          if (!res?.ok) {
            uiStore.setState({ activeView: 'settings' });
            setPopoverOpen(true);
          }
        } catch {
          uiStore.setState({ activeView: 'settings' });
          setPopoverOpen(true);
        } finally {
          isTopbarUpdating = false;
          patchClasses(topbarUpdateBtn, { 'is-updating': false });
          patchSvgIcon(topbarUpdateIcon, 'arrow-down');
          patchAttr(topbarUpdateBtn, 'disabled', false);
          const cs = telemetryStore.getState().telemetry?.cloudStatus;
          patchText(
            topbarUpdateLabel,
            cs?.latestPluginVersion ? `v${cs.latestPluginVersion}` : '新版本'
          );
        }
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
          hoverLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          if (multiOpen) {
            setMultiOpen(false);
          }
          setTooltipOpen(true);
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
        }
        hoverLeaveTimer = setTimeout(() => {
          hoverLeaveTimer = null;
          if (disposed || popoverOpen) return;
          let nativeHover = false;
          try {
            nativeHover = Boolean(
              capsuleBtn.matches?.(':hover') || topbarUpdateBtn.matches?.(':hover')
            );
          } catch {
            nativeHover = false;
          }
          if (nativeHover || isPointerStillInCapsule()) {
            return;
          }
          setTooltipOpen(false);
        }, 40);
      },
    },
    [topbarUpdateIcon, topbarUpdateLabel]
  );

  const capsuleBtn = h(
    'button',
    {
      type: 'button',
      className: 'wm-capsule-btn',
      'aria-label': '用量与速度监控',
      'aria-expanded': 'false',
      onClick: (e) => {
        e.stopPropagation();
        setPopoverOpen(!popoverOpen);
      },
      onContextmenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        void fetchTelemetry({ force: true });
      },
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
          hoverLeaveTimer = null;
        }
        if (!popoverOpen && !multiPinned) {
          if (multiOpen) {
            setMultiOpen(false);
          }
          setTooltipOpen(true);
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (hoverLeaveTimer) {
          clearTimeout(hoverLeaveTimer);
        }
        hoverLeaveTimer = setTimeout(() => {
          hoverLeaveTimer = null;
          if (disposed || popoverOpen) return;
          let nativeHover = false;
          try {
            nativeHover = Boolean(
              capsuleBtn.matches?.(':hover') || topbarUpdateBtn.matches?.(':hover')
            );
          } catch {
            nativeHover = false;
          }
          if (nativeHover || isPointerStillInCapsule()) {
            return;
          }
          setTooltipOpen(false);
        }, 40);
      },
    },
    [capsuleSlots[0].el, sep0, capsuleSlots[1].el, sep1, capsuleSlots[2].el, updateDot]
  );
  capsuleShadow.appendChild(multiBtn);
  capsuleShadow.appendChild(capsuleBtn);
  capsuleShadow.appendChild(topbarUpdateBtn);

  // --- 2. 创建 Body 顶层浮层 Portal Shadow Host ---
  const portalHost = document.createElement('div');
  portalHost.id = PORTAL_HOST_ID;
  portalHost.className = 'wm-portal-host';
  const portalShadow = portalHost.attachShadow({ mode: 'open' });

  const portalStyleEl = document.createElement('style');
  portalStyleEl.textContent = stylesCss;
  portalShadow.appendChild(portalStyleEl);

  // 悬停全景概览浮层（复用实时概览三卡片架构：4格测速矩阵 + 10通道上下文窗口 + 动态配额池，全槽位预占）
  const hoverTpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
  const hoverTpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
  const hoverPulseDot = createSvgIcon('dot', { size: 10 });

  const hoverTtftVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverTtftSub = h('span', { className: 'cell-sub', text: '均值 —' });

  const hoverAvgVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverAvgSub = h('span', { className: 'cell-sub', text: '有效 0/0 步' });

  const hoverCostVal = h('strong', { className: 'cell-value', text: '—' });
  const hoverCacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累计 $0.00' });

  const hoverMatrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '实时指标' }, [
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [h('span', { text: '输出速度' }), hoverPulseDot]),
      hoverTpsVal,
      hoverTpsSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '首字延迟' }),
        createSvgIcon('clock', { size: 11 }),
      ]),
      hoverTtftVal,
      hoverTtftSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '平均速度' }),
        createSvgIcon('pulse', { size: 11 }),
      ]),
      hoverAvgVal,
      hoverAvgSub,
    ]),
    h('div', { className: 'matrix-cell' }, [
      h('div', { className: 'cell-label' }, [
        h('span', { text: '本次费用' }),
        createSvgIcon('bolt', { size: 11 }),
      ]),
      hoverCostVal,
      hoverCacheSub,
    ]),
  ]);

  const hoverCtxAgentBadge = h('span', {
    className: 'agent-badge badge-main',
    hidden: true,
    text: '主代理',
  });
  const hoverCtxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
  const hoverCtxSegmentBar = ContextSegmentMeter({ context: {} });

  // 固定预占 10 个双列图例槽位，排序时仅就地替换色块类名与文本，不调用 appendChild 移动节点
  const hoverLegendSlots = CTX_CHANNEL_DEFS.map((ch) => {
    const swatchEl = h('span', { className: `swatch ${ch.segClass}` });
    const labelEl = h('span', { text: ch.label });
    const valEl = h('strong', { className: 'text-mono', text: '0' });
    const itemEl = h('div', { className: 'legend-item' }, [
      h('span', { className: 'legend-left' }, [swatchEl, labelEl]),
      valEl,
    ]);
    return { itemEl, swatchEl, labelEl, valEl };
  });

  const hoverCtxLegendGrid = h(
    'div',
    { className: 'ctx-legend-grid' },
    hoverLegendSlots.map((slot) => slot.itemEl)
  );

  const hoverCtxPanel = h('section', { className: 'panel' }, [
    h('div', { className: 'panel-header' }, [
      h('span', { className: 'panel-title' }, [
        createSvgIcon('layers', { size: 13 }),
        h('span', { text: '上下文窗口' }),
        hoverCtxAgentBadge,
      ]),
      h('span', { className: 'panel-meta' }, [hoverCtxSummaryText]),
    ]),
    hoverCtxSegmentBar.el,
    hoverCtxLegendGrid,
  ]);

  const hoverTierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });
  const hoverPoolsListEl = h('div', { className: 'wm-hover-quota-pools' });
  patchKeyedList(
    hoverPoolsListEl,
    buildQuotaPoolItems(null, 0, { isPending: true }),
    {
      keyFn: (item) => item.key,
      sigFn: quotaPoolRowSig,
      createRow: createPoolQuotaRow,
      updateRow: syncPoolQuotaRow,
    }
  );
  const hoverWkFootLeft = h('span', { className: 'text-muted', text: '本周累计: 0 ($0.00)' });
  const hoverWkFootRight = h('span', { className: 'text-muted', text: '本周调用: 0 次' });

  const hoverQuotaPanel = h('section', { className: 'panel' }, [
    h('div', { className: 'panel-header' }, [
      h('span', { className: 'panel-title' }, [
        createSvgIcon('pulse', { size: 13 }),
        h('span', { text: '可用额度' }),
      ]),
      hoverTierBadge,
    ]),
    hoverPoolsListEl,
    h('div', { className: 'panel-header wm-hover-quota-foot' }, [
      hoverWkFootLeft,
      hoverWkFootRight,
    ]),
  ]);

  const hoverUpdateVerText = h('span', { text: '发现新版本' });
  const hoverUpdateHintText = h('span', {
    className: 'wm-hover-update-hint',
    text: '点击顶栏版本胶囊即可一键更新',
  });
  const hoverUpdateBar = h(
    'div',
    {
      className: 'wm-hover-update-bar',
      hidden: true,
    },
    [
      h('span', { className: 'wm-hover-update-left' }, [
        createSvgIcon('arrow-down', { size: 11 }),
        hoverUpdateVerText,
      ]),
      hoverUpdateHintText,
    ]
  );

  const hoverTipEl = h(
    'div',
    {
      className: 'wm-hover-tip',
      hidden: true,
    },
    [hoverUpdateBar, hoverMatrixEl, hoverCtxPanel, hoverQuotaPanel]
  );

  // 左侧多会话实时看板浮层（活跃运行会话卡片 + 近期多窗口会话速览，全槽位预占、就地补丁更新）
  function createMultiLiveSubRow() {
    const subBadge = h('span', { className: 'agent-badge badge-sub-1', text: '子1' });
    const subRole = h('span', { className: 'live-sub-role', text: '子代理' });
    const subSummary = h('span', { className: 'live-sub-summary', text: '' });
    const subElapsed = h('span', { className: 'live-sub-elapsed text-mono', text: '0s' });
    const rowEl = h('div', { className: 'live-sub-row' }, [
      h('div', { className: 'live-sub-left' }, [subBadge, subRole, subSummary]),
      subElapsed,
    ]);
    return {
      el: rowEl,
      refs: { rowEl, subBadge, subRole, subSummary, subElapsed },
    };
  }

  function createMultiLiveTaskCard() {
    const dotIcon = createSvgIcon('dot', { size: 11 });
    patchClasses(dotIcon, { 'is-pulsing': true });
    const dotWrap = h('span', { className: 'live-activity-dot' }, [dotIcon]);
    const titleEl = h('strong', { className: 'live-task-title', text: '当前会话' });
    const hereTagEl = h('span', {
      className: 'wm-session-tag is-here',
      hidden: true,
      text: '本窗',
    });
    const metricsEl = h('span', {
      className: 'wm-task-metrics text-mono',
      hidden: true,
      text: '',
    });
    const subToggleBtn = h('button', {
      type: 'button',
      className: 'live-sub-toggle',
      hidden: true,
      text: '子代理 (0) ▸',
    });
    const elapsedEl = h('span', {
      className: 'live-activity-elapsed text-mono',
      text: '0s',
    });

    const headerEl = h('div', { className: 'live-task-header' }, [
      h('div', { className: 'live-task-title-wrap' }, [dotWrap, titleEl, hereTagEl]),
      h('div', { className: 'live-task-header-right' }, [metricsEl, subToggleBtn, elapsedEl]),
    ]);

    const mainBadge = h('span', {
      className: 'agent-badge badge-main',
      hidden: true,
      text: '主',
    });
    const mainPhase = h('strong', { className: 'live-activity-phase', text: '推理中' });
    const mainProgress = h('span', {
      className: 'live-activity-progress text-mono',
      hidden: true,
      text: '',
    });
    const mainSep = h('span', { className: 'live-activity-sep', hidden: true, text: '·' });
    const mainDetail = h('span', {
      className: 'live-activity-detail',
      hidden: true,
      text: '',
    });

    const mainRowEl = h('div', { className: 'live-task-main-row' }, [
      mainBadge,
      mainPhase,
      mainProgress,
      mainSep,
      mainDetail,
    ]);

    const subListEl = h('div', { className: 'live-sub-list', hidden: true });
    const cardEl = h('div', { className: 'live-task-card' }, [headerEl, mainRowEl, subListEl]);

    return {
      el: cardEl,
      refs: {
        cardEl,
        dotIcon,
        titleEl,
        hereTagEl,
        metricsEl,
        subToggleBtn,
        elapsedEl,
        mainBadge,
        mainPhase,
        mainProgress,
        mainSep,
        mainDetail,
        subListEl,
      },
    };
  }

  const multiPinBadge = h('span', { className: 'wm-pin-badge', hidden: true, text: '已固定' });
  const multiRunningMetaEl = h('span', { className: 'panel-meta text-mono', text: '读取中...' });
  const multiEmptyEl = h('div', { className: 'wm-multi-empty' }, [
    h('span', { className: 'wm-multi-empty-left' }, [
      h('span', { className: 'wm-idle-dot' }),
      h('span', { text: '当前暂无在线运行的会话' }),
    ]),
  ]);
  const multiRunningListEl = h('div', {
    className: 'live-activity-list',
    hidden: true,
    'aria-live': 'polite',
  });

  const multiHeaderEl = h('div', { className: 'panel-header wm-multi-header' }, [
    h('span', { className: 'panel-title' }, [
      createSvgIcon('pulse', { size: 13 }),
      h('span', { text: '实时运行会话' }),
      multiPinBadge,
    ]),
    multiRunningMetaEl,
  ]);

  const multiPanelEl = h(
    'div',
    {
      className: 'wm-multi-panel',
      role: 'dialog',
      'aria-label': '多会话实时信息面板',
      hidden: true,
      onMouseenter: (e) => {
        recordPointerCoords(e);
        if (multiLeaveTimer) {
          clearTimeout(multiLeaveTimer);
          multiLeaveTimer = null;
        }
      },
      onMouseleave: (e) => {
        recordPointerCoords(e);
        if (!multiPinned) {
          scheduleMultiHoverClose();
        }
      },
    },
    [multiHeaderEl, multiEmptyEl, multiRunningListEl]
  );

  // 完整四标签悬浮容器
  const appInstance = App();
  const popoverEl = h(
    'div',
    {
      className: 'wm-popover-panel',
      role: 'dialog',
      'aria-label': '用量与速度监控面板',
      hidden: true,
    },
    [appInstance.el]
  );

  portalShadow.appendChild(multiPanelEl);
  portalShadow.appendChild(hoverTipEl);
  portalShadow.appendChild(popoverEl);
  (document.body || document.documentElement).appendChild(portalHost);

  // --- 3. 几何测量、顶栏停靠与防溢出定位 ---
  function updateFixedFallbackPosition() {
    if (capsuleHost.getAttribute('data-dock') === 'flow') {
      capsuleHost.style.top = '';
      capsuleHost.style.right = '';
      return;
    }
    try {
      const vw = Number(window.innerWidth || 1280);
      let rightOffset = 144;
      const anchor = findNativeTopRightAnchor();
      if (anchor?.getBoundingClientRect) {
        const r = anchor.getBoundingClientRect();
        if (r.width > 0 && r.left > 0 && r.left < vw) {
          rightOffset = Math.max(144, Math.ceil(vw - r.left + 6));
        }
      }
      capsuleHost.style.top = '7px';
      capsuleHost.style.right = `${rightOffset}px`;
    } catch {
      // 忽略回退坐标计算异常
    }
  }

  function measureAvailableTitlebarWidth(titlebar) {
    try {
      if (titlebar?.getBoundingClientRect) {
        const tbRect = titlebar.getBoundingClientRect();
        if (tbRect.width > 0) {
          const titleEl = titlebar.firstElementChild;
          const titleInner = titleEl?.firstElementChild;
          const contentStart = titleInner?.getBoundingClientRect
            ? Math.max(8, titleInner.getBoundingClientRect().left - tbRect.left)
            : tbRect.left < 168
              ? 168 - tbRect.left
              : 12;
          const minTitleWidth = 180;
          let siblingButtonsWidth = 64;
          let rightPad = 8;
          const rightGroup = capsuleHost.parentElement;
          if (rightGroup && rightGroup !== titlebar) {
            const auxOpen =
              typeof document.querySelector === 'function' &&
              Boolean(document.querySelector('[data-testid="aux-pane-sash"]'));
            const root =
              typeof document.querySelector === 'function'
                ? document.querySelector('div.h-screen.w-screen')
                : null;
            const rightClusterVar =
              root?.style?.getPropertyValue?.('--right-cluster-width')?.trim() || '';
            if (auxOpen) {
              rightPad = 8;
            } else if (rightClusterVar) {
              rightPad = Math.max(8, (parseFloat(rightClusterVar) || 44) - 4);
            } else if (typeof window.getComputedStyle === 'function') {
              rightPad = parseFloat(window.getComputedStyle(rightGroup).paddingRight) || 0;
            }
            if (rightGroup.children) {
              let sum = 0;
              for (const child of rightGroup.children) {
                if (child !== capsuleHost && child.getBoundingClientRect) {
                  sum += child.getBoundingClientRect().width;
                }
              }
              if (sum > 0) siblingButtonsWidth = sum + 8;
            }
          }
          return tbRect.width - contentStart - minTitleWidth - rightPad - siblingButtonsWidth;
        }
      }
      if (window.innerWidth) {
        return window.innerWidth - 360;
      }
    } catch {
      // 忽略测量异常
    }
    return 320;
  }

  function positionFloatingElements() {
    if (disposed || !capsuleBtn.getBoundingClientRect) return;
    try {
      const bRect = capsuleBtn.getBoundingClientRect();
      if (bRect.width === 0 && bRect.height === 0) return;
      const vw = Number(window.innerWidth || 1280);
      const vh = Number(window.innerHeight || 800);
      const navRight = getLeftSidebarRightEdge(vw);
      const minLeft = navRight > 0 ? Math.max(12, navRight + 12) : 12;
      const defaultCardW = Math.min(FLOATING_CARD_WIDTH, Math.max(280, vw - 24));
      const defaultMultiW = Math.min(MULTI_PANEL_WIDTH, Math.max(280, vw - 24));

      if (multiOpen) {
        const mRect = multiBtn.getBoundingClientRect?.() || bRect;
        const anchorRect = mRect.width > 0 || mRect.height > 0 ? mRect : bRect;
        const rawW =
          Number(multiPanelEl.offsetWidth) ||
          Number(multiPanelEl.getBoundingClientRect?.().width) ||
          defaultMultiW;
        const panelW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const panelH =
          Number(multiPanelEl.offsetHeight) ||
          Number(multiPanelEl.getBoundingClientRect?.().height) ||
          320;
        let top = Math.max(38, Math.round(anchorRect.bottom + 6));
        if (top + panelH > vh - 8 && anchorRect.top > panelH + 12) {
          top = Math.round(anchorRect.top - panelH - 6);
        }
        let left = Math.round(anchorRect.left);
        left = Math.min(left, vw - panelW - 12);
        left = Math.max(minLeft, left);
        multiPanelEl.style.top = `${top}px`;
        multiPanelEl.style.left = `${left}px`;
        multiPanelEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }

      const rightAnchorEdge =
        !topbarUpdateBtn.hasAttribute('hidden') && topbarUpdateBtn.getBoundingClientRect
          ? Math.max(bRect.right, topbarUpdateBtn.getBoundingClientRect().right || 0)
          : bRect.right;

      if (popoverOpen) {
        const rawW =
          Number(popoverEl.offsetWidth) ||
          Number(popoverEl.getBoundingClientRect?.().width) ||
          defaultCardW;
        const panelW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const top = Math.max(38, Math.min(vh - 140, Math.round(bRect.bottom + 6)));
        let left = Math.round(rightAnchorEdge - panelW);
        left = Math.min(left, vw - panelW - 12);
        left = Math.max(minLeft, left);
        popoverEl.style.top = `${top}px`;
        popoverEl.style.left = `${left}px`;
        popoverEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }

      if (tooltipOpen && !popoverOpen && !multiOpen) {
        const rawW =
          Number(hoverTipEl.offsetWidth) ||
          Number(hoverTipEl.getBoundingClientRect?.().width) ||
          defaultCardW;
        const tipW = Math.min(rawW, Math.max(280, vw - minLeft - 12));
        const tipH =
          Number(hoverTipEl.offsetHeight) ||
          Number(hoverTipEl.getBoundingClientRect?.().height) ||
          480;
        let top = Math.max(38, Math.round(bRect.bottom + 6));
        if (top + tipH > vh - 8 && bRect.top > tipH + 12) {
          top = Math.round(bRect.top - tipH - 6);
        }
        let left = Math.round(rightAnchorEdge - tipW);
        left = Math.min(left, vw - tipW - 12);
        left = Math.max(minLeft, left);
        hoverTipEl.style.top = `${top}px`;
        hoverTipEl.style.left = `${left}px`;
        hoverTipEl.style.maxHeight = `${Math.max(240, vh - top - 12)}px`;
      }
    } catch {
      // 忽略定位异常
    }
  }

  function updateResponsiveLayout() {
    if (disposed) return;
    const titlebar = findHostTitlebar();
    const avail = measureAvailableTitlebarWidth(titlebar);
    const curTel = telemetryStore.getState().telemetry;
    const showMulti = curTel?.settings?.showTopbarMultiSession !== false;
    const curUpdateMode = normalizeClientUpdateMode(
      curTel?.settings?.pluginUpdateMode,
      curTel?.settings?.autoUpdatePlugin
    );
    const hasUpdate = Boolean(curTel?.cloudStatus?.updateAvailable) && curUpdateMode !== 'off';
    const nextMode = computeCapsuleLayoutMode(avail, layoutMode, { showMulti, hasUpdate });
    if (nextMode !== layoutMode) {
      layoutMode = nextMode;
      capsuleHost.setAttribute('data-layout', layoutMode);
    }
    if (capsuleHost.getAttribute('data-dock') === 'fixed') {
      updateFixedFallbackPosition();
    }
    if (popoverOpen || tooltipOpen || multiOpen) {
      positionFloatingElements();
    }
  }

  let resizeObserver = null;

  function ensureCapsuleDocked() {
    if (disposed) return false;
    const bodyOrDoc = document.body || document.documentElement;
    if (bodyOrDoc && !portalHost.isConnected) {
      bodyOrDoc.appendChild(portalHost);
    }

    const titlebar = findHostTitlebar();
    if (titlebar) {
      let targetContainer = titlebar;
      try {
        const rightGroup = titlebar.querySelector(':scope > div.shrink-0') || titlebar.lastElementChild;
        if (rightGroup && rightGroup !== titlebar.firstElementChild) {
          targetContainer = rightGroup;
        }
      } catch {
        // 忽略子选择器不兼容场景
      }

      if (capsuleHost.parentElement !== targetContainer) {
        if (targetContainer.firstChild && targetContainer !== titlebar) {
          targetContainer.insertBefore(capsuleHost, targetContainer.firstChild);
        } else {
          targetContainer.appendChild(capsuleHost);
        }
      }
      patchAttr(capsuleHost, 'data-dock', 'flow');
      if (capsuleHost.style.top) capsuleHost.style.top = '';
      if (capsuleHost.style.right) capsuleHost.style.right = '';

      if (observedTitlebar !== titlebar) {
        observedTitlebar = titlebar;
        try {
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver.observe(titlebar);
            if (document.body) resizeObserver.observe(document.body);
          }
        } catch {
          // 忽略观察器异常
        }
      }
    } else if (bodyOrDoc) {
      if (capsuleHost.parentElement !== bodyOrDoc) {
        bodyOrDoc.appendChild(capsuleHost);
      }
      patchAttr(capsuleHost, 'data-dock', 'fixed');
      updateFixedFallbackPosition();
    }

    updateResponsiveLayout();
    return Boolean(capsuleHost.isConnected && portalHost.isConnected);
  }

  function scheduleDockSync() {
    if (disposed) return;
    if (typeof requestAnimationFrame === 'function') {
      if (dockRafId) return;
      dockRafId = requestAnimationFrame(() => {
        dockRafId = 0;
        ensureCapsuleDocked();
      });
    } else {
      ensureCapsuleDocked();
    }
  }

  function refreshActiveViewScrollbars() {
    const activeView = uiStore.getState().activeView;
    const refs = appInstance.refs;
    if (activeView === 'overview') {
      refs?.overviewView?.refs?.viewScrollbar?.refresh();
    } else if (activeView === 'consumption') {
      refs?.consumptionView?.refs?.viewScrollbar?.refresh();
    } else if (activeView === 'steps') {
      refs?.stepsView?.refs?.stepsScroll?.refresh();
      refs?.stepsView?.refs?.modelsScroll?.refresh();
    } else if (activeView === 'settings') {
      refs?.settingsView?.refs?.viewScrollbar?.refresh();
    }
  }

  function setMultiOpen(nextOpen, { pinned = false, instant = false } = {}) {
    const targetOpen = Boolean(nextOpen);
    if (targetOpen && multiLeaveTimer) {
      clearTimeout(multiLeaveTimer);
      multiLeaveTimer = null;
    }
    if (targetOpen) {
      setTooltipOpen(false);
      if (pinned && popoverOpen) {
        setPopoverOpen(false);
      }
    }
    const nextPinned = targetOpen ? Boolean(pinned) : false;
    const stateChanged = multiOpen !== targetOpen || multiPinned !== nextPinned;
    multiOpen = targetOpen;
    multiPinned = nextPinned;
    patchClasses(multiBtn, { 'is-open': multiOpen && multiPinned });
    patchAttr(multiBtn, 'aria-expanded', multiOpen ? 'true' : 'false');
    patchAttr(multiPinBadge, 'hidden', !multiPinned);
    if (!stateChanged) return;
    patchClasses(multiPanelEl, { 'is-instant': Boolean(instant && multiOpen) });
    patchAttr(multiPanelEl, 'hidden', !multiOpen);
    if (multiOpen) {
      positionFloatingElements();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => positionFloatingElements());
      }
    }
  }

  function setTooltipOpen(nextOpen, { instant = false } = {}) {
    const targetOpen = Boolean(nextOpen && !popoverOpen && !(multiOpen && multiPinned));
    if (targetOpen && hoverLeaveTimer) {
      clearTimeout(hoverLeaveTimer);
      hoverLeaveTimer = null;
    }
    if (targetOpen && multiOpen && !multiPinned) {
      setMultiOpen(false);
    }
    if (tooltipOpen === targetOpen) return;
    tooltipOpen = targetOpen;
    patchClasses(hoverTipEl, { 'is-instant': Boolean(instant && targetOpen) });
    patchAttr(hoverTipEl, 'hidden', !tooltipOpen);
    if (tooltipOpen) {
      positionFloatingElements();
    }
  }

  function setPopoverOpen(nextOpen, { instant = false } = {}) {
    const targetOpen = Boolean(nextOpen);
    if (targetOpen) {
      setTooltipOpen(false);
      if (multiOpen) {
        setMultiOpen(false);
      }
    }
    if (popoverOpen === targetOpen) return;
    popoverOpen = targetOpen;
    patchClasses(capsuleBtn, { 'is-open': popoverOpen });
    patchClasses(popoverEl, { 'is-instant': Boolean(instant && popoverOpen) });
    patchAttr(capsuleBtn, 'aria-expanded', popoverOpen ? 'true' : 'false');
    patchAttr(popoverEl, 'hidden', !popoverOpen);
    if (popoverOpen) {
      positionFloatingElements();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          positionFloatingElements();
          refreshActiveViewScrollbars();
        });
      } else {
        refreshActiveViewScrollbars();
      }
    }
  }

  function resolveCapsuleSlotPresentation(metricKey, slotCtx) {
    if (metricKey === 'none') {
      return {
        hidden: true,
        metric: 'none',
        segClass: 'wm-cap-slot',
        textClass: 'wm-slot-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: '',
        running: false,
        warn: false,
        danger: false,
      };
    }

    if (metricKey === 'context') {
      if (!slotCtx.hasTelemetry) {
        return {
          hidden: false,
          metric: 'context',
          segClass: 'wm-cap-slot wm-ctx-seg',
          textClass: 'wm-slot-text wm-ctx-pct',
          showRing: true,
          dashOffset: RING_CIRCUMFERENCE,
          text: '--%',
          running: false,
          warn: false,
          danger: false,
        };
      }
      const isDanger = slotCtx.usedPct >= 88;
      const isWarn = !isDanger && slotCtx.usedPct >= 70;
      return {
        hidden: false,
        metric: 'context',
        segClass: 'wm-cap-slot wm-ctx-seg',
        textClass: 'wm-slot-text wm-ctx-pct',
        showRing: true,
        dashOffset: slotCtx.dashOffset,
        text: `${Math.round(slotCtx.usedPct)}%`,
        running: false,
        warn: isWarn,
        danger: isDanger,
      };
    }

    if (metricKey === 'tps') {
      if (!slotCtx.hasTelemetry) {
        return {
          hidden: false,
          metric: 'tps',
          segClass: 'wm-cap-slot wm-seg-speed',
          textClass: 'wm-slot-text wm-speed-text',
          showRing: false,
          dashOffset: RING_CIRCUMFERENCE,
          text: '-- t/s',
          running: false,
          warn: false,
          danger: false,
        };
      }
      const hasValidTps = Number.isFinite(slotCtx.tps) && slotCtx.tps > 0;
      const tpsText = hasValidTps
        ? `${slotCtx.tps >= 100 ? Math.round(slotCtx.tps) : slotCtx.tps.toFixed(1)} t/s`
        : slotCtx.isRunning
          ? '生成中'
          : '待命';
      return {
        hidden: false,
        metric: 'tps',
        segClass: 'wm-cap-slot wm-seg-speed',
        textClass: 'wm-slot-text wm-speed-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: tpsText,
        running: slotCtx.isRunning,
        warn: false,
        danger: false,
      };
    }

    if (metricKey === 'ttft') {
      const val = slotCtx.hasTelemetry ? slotCtx.ttft : null;
      const valid = val != null && Number.isFinite(Number(val)) && Number(val) >= 0;
      const numVal = valid ? Number(val) : 0;
      const isDanger = valid && numVal >= 30;
      const isWarn = valid && !isDanger && numVal >= 15;
      return {
        hidden: false,
        metric: 'ttft',
        segClass: 'wm-cap-slot wm-seg-ttft',
        textClass: 'wm-slot-text wm-ttft-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: valid ? formatCompactCapsuleTtft(numVal) : '--s',
        running: false,
        warn: isWarn,
        danger: isDanger,
      };
    }

    if (metricKey === 'cost') {
      const costVal = slotCtx.hasTelemetry ? slotCtx.stepCost : null;
      return {
        hidden: false,
        metric: 'cost',
        segClass: 'wm-cap-slot wm-seg-cost',
        textClass: 'wm-slot-text wm-cost-text',
        showRing: false,
        dashOffset: RING_CIRCUMFERENCE,
        text: slotCtx.hasTelemetry ? formatCompactCapsuleCost(costVal) : '--',
        running: false,
        warn: false,
        danger: false,
      };
    }

    const quotaSum = !slotCtx.hasTelemetry
      ? null
      : metricKey === 'quota_auto'
        ? resolveQuotaCapsuleSummary(slotCtx.quotas)
        : resolveSpecificQuotaSlotSummary(slotCtx.quotas, metricKey);
    const isDanger = Boolean(quotaSum && quotaSum.roundedPct <= 15);
    const isWarn = Boolean(quotaSum && !isDanger && quotaSum.roundedPct <= 30);
    return {
      hidden: false,
      metric: metricKey,
      segClass: 'wm-cap-slot wm-seg-quota',
      textClass: 'wm-slot-text wm-quota-text',
      showRing: false,
      dashOffset: RING_CIRCUMFERENCE,
      text: quotaSum ? quotaSum.shortText : '余 --%',
      running: false,
      warn: isWarn,
      danger: isDanger,
    };
  }

  function applyCapsuleSlots(slotKeys, slotCtx) {
    const presList = slotKeys.map((key) => resolveCapsuleSlotPresentation(key, slotCtx));
    let visRank = 0;
    const visRanks = [0, 0, 0];
    for (let i = 0; i < 3; i += 1) {
      const slot = capsuleSlots[i];
      const pres = presList[i];
      if (pres.hidden) {
        patchAttr(slot.el, 'hidden', true);
        patchAttr(slot.el, 'data-metric', 'none');
        patchAttr(slot.el, 'data-vis-rank', '');
        continue;
      }
      visRank += 1;
      visRanks[i] = visRank;
      patchAttr(slot.el, 'hidden', false);
      patchAttr(slot.el, 'data-metric', pres.metric);
      patchAttr(slot.el, 'data-vis-rank', String(visRank));

      if (pres.showRing && !slot.ringMounted) {
        slot.el.insertBefore(slot.ringSvg, slot.textSpan);
        slot.ringMounted = true;
      } else if (!pres.showRing && slot.ringMounted) {
        slot.ringSvg.remove();
        slot.ringMounted = false;
      }

      const fullSegClass =
        `${pres.segClass}${pres.running ? ' state-running' : ''}${pres.warn ? ' tone-warn' : ''}${pres.danger ? ' tone-danger' : ''}`;
      patchAttr(slot.el, 'class', fullSegClass);
      const fullTextClass =
        `${pres.textClass}${pres.warn ? ' tone-warn' : ''}${pres.danger ? ' tone-danger' : ''}`;
      patchAttr(slot.textSpan, 'class', fullTextClass);
      patchText(slot.textSpan, pres.text);

      if (pres.showRing) {
        slot.ringFill.setAttribute('stroke-dashoffset', String(pres.dashOffset));
        patchClasses(slot.ringFill, { 'tone-warn': pres.warn, 'tone-danger': pres.danger });
      }
    }

    const showSep0 = visRanks[1] >= 2;
    patchAttr(sep0, 'hidden', !showSep0);
    patchAttr(sep0, 'data-sep-for-rank', showSep0 ? String(visRanks[1]) : '');

    const showSep1 = visRanks[2] >= 2;
    patchAttr(sep1, 'hidden', !showSep1);
    patchAttr(sep1, 'data-sep-for-rank', showSep1 ? String(visRanks[2]) : '');
  }

  // --- 4. 实时遥测状态绑定（双胶囊与多会话/全景概览浮层全部槽位预占，仅就地更新节点，零布局跳动） ---
  function renderCapsuleTelemetry() {
    if (disposed) return;
    const telSt = telemetryStore.getState();
    const uiSt = uiStore.getState();
    const telemetry = telSt.telemetry;

    const showMulti = telemetry?.settings?.showTopbarMultiSession !== false;
    patchAttr(multiBtn, 'hidden', !showMulti);
    patchAttr(capsuleHost, 'data-multi', showMulti ? 'on' : 'off');
    if (!showMulti && multiOpen) {
      setMultiOpen(false);
    }
    if (showMulti !== lastShowMulti) {
      lastShowMulti = showMulti;
      updateResponsiveLayout();
    }

    const slotKeys = normalizeClientTopbarSlots(telemetry?.settings?.topbarCapsuleSlots);

    if (!telemetry) {
      patchClasses(multiBtn, { 'is-running': false, 'is-waiting': false });
      patchText(multiLabel, '0 运行中');
      patchText(multiRunningMetaEl, '读取中...');
      stopMultiLiveTicker();

      applyCapsuleSlots(slotKeys, { hasTelemetry: false });
      return;
    }

    const { hasSubagents, agents, scopedConv: overviewScopedConv, ctxAgent, aggregated } =
      resolveScopedConversation(telemetry, 'all', uiSt.ctxInspectorAgentId);
    const { scopedConv: capsuleScopedConv } = resolveScopedConversation(
      telemetry,
      uiSt.selectedAgentScope,
      uiSt.ctxInspectorAgentId
    );
    const activeConv = telemetry.activeConversation || {};
    const overviewActive = overviewScopedConv || activeConv;
    const ctx = ctxAgent?.context || overviewActive.context || activeConv.context || {};
    const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
    const totalTokens = Number(ctx.totalTokens || 0);
    const usedPct =
      limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
    const dashOffset = +(
      RING_CIRCUMFERENCE *
      (1 - Math.max(0, Math.min(100, usedPct)) / 100)
    ).toFixed(2);

    // --- 4a. 同步左侧多会话实时状态胶囊与浮层看板 ---
    const rawRunningList =
      Array.isArray(telemetry.runningConversations) && telemetry.runningConversations.length > 0
        ? telemetry.runningConversations
        : activeConv.isRunning || aggregated?.isRunning
          ? [
              {
                cascadeId: activeConv.cascadeId || 'current',
                title: activeConv.title || '当前会话',
                isCurrentSelected: true,
                isMainRunning: Boolean(activeConv.isRunning),
                isRunning: true,
                mainActivity: activeConv.liveActivity || aggregated?.liveActivity || null,
                subagentCount: Math.max(0, (agents?.length || 1) - 1),
                runningSubagentCount: (agents || []).filter((a) => !a.isMain && a.isRunning).length,
                latestTokPerSec: overviewActive.latestTokPerSec ?? null,
                contextUsedPct: usedPct,
                subagents: (agents || [])
                  .filter((a) => !a.isMain)
                  .map((s, idx) => ({
                    cascadeId: s.cascadeId || s.agentId,
                    index: s.index || idx + 1,
                    badgeText: s.badgeText || `子${idx + 1}`,
                    shortLabel: s.shortLabel || `子代理 #${idx + 1}`,
                    role: s.role || `子代理 #${idx + 1}`,
                    isRunning: Boolean(s.isRunning),
                    stepCount: Number(s.stepCount || 0),
                    lastModifiedMs: s.lastModifiedMs || 0,
                    liveActivity: s.liveActivity || {
                      phase: s.isRunning ? 'thinking' : 'done',
                      label: s.isRunning ? '推理中' : '已完成',
                      detail: '',
                      stepProgress: '',
                      startedAtMs: s.lastModifiedMs || 0,
                      signature: `${s.agentId}:${s.stepCount || 0}`,
                    },
                  })),
              },
            ]
          : [];

    const runningCount = rawRunningList.length;
    const runningSubCount = rawRunningList.reduce(
      (acc, item) => acc + Number(item.runningSubagentCount || 0),
      0
    );
    const hasWaiting = rawRunningList.some((item) => item.mainActivity?.phase === 'waiting');

    patchClasses(multiBtn, {
      'is-running': runningCount > 0 && !hasWaiting,
      'is-waiting': runningCount > 0 && hasWaiting,
    });
    const multiBtnText =
      runningCount > 0
        ? runningSubCount > 0
          ? `${runningCount} 运行 · ${runningSubCount} 子`
          : `${runningCount} 运行中`
        : '0 运行中';
    patchText(multiLabel, multiBtnText);

    const hostRouteLower = String(
      telSt.hostRouteConversationId || extractHostRouteCascadeId() || ''
    ).toLowerCase();

    patchText(
      multiRunningMetaEl,
      runningCount > 0
        ? runningSubCount > 0
          ? `${runningCount} 主会话 · ${runningSubCount} 子代理运行中`
          : `${runningCount} 个会话运行中`
        : '全部待命'
    );
    patchAttr(multiEmptyEl, 'hidden', runningCount > 0);
    patchAttr(multiRunningListEl, 'hidden', runningCount === 0);

    const runningIdsLower = new Set(
      rawRunningList.map((item) => String(item.cascadeId || '').toLowerCase())
    );

    if (runningCount === 0) {
      stopMultiLiveTicker();
      manualSubExpandMap.clear();
    } else {
      for (const cid of [...manualSubExpandMap.keys()]) {
        if (!runningIdsLower.has(String(cid || '').toLowerCase())) {
          manualSubExpandMap.delete(cid);
        }
      }

      const activeTimerKeys = new Set();
      for (const item of rawRunningList) {
        activeTimerKeys.add(`main:${item.cascadeId}`);
        const subCount = Number(item.subagentCount || item.subagents?.length || 0);
        const runSubs = Number(item.runningSubagentCount || 0);
        const isExp = manualSubExpandMap.has(item.cascadeId)
          ? manualSubExpandMap.get(item.cascadeId)
          : runSubs > 0;
        if (subCount > 0 && isExp) {
          for (const sub of item.subagents || []) {
            if (sub?.isRunning) {
              activeTimerKeys.add(`sub:${sub.cascadeId}`);
            }
          }
        }
      }

      patchKeyedList(multiRunningListEl, rawRunningList, {
        keyFn: (item) => item.cascadeId,
        sigFn: (item) => {
          const runSubs = Number(item.runningSubagentCount || 0);
          const isExp = manualSubExpandMap.has(item.cascadeId)
            ? manualSubExpandMap.get(item.cascadeId)
            : runSubs > 0;
          const isHere =
            Boolean(hostRouteLower) &&
            String(item.cascadeId || '').toLowerCase() === hostRouteLower;
          const subSig = (item.subagents || [])
            .map(
              (s) =>
                `${s.cascadeId}:${s.isRunning}:${s.stepCount}:${s.liveActivity?.signature || ''}:${s.liveActivity?.startedAtMs || 0}`
            )
            .join('|');
          return `${item.cascadeId}:${item.title}:${isHere}:${item.isMainRunning}:${item.subagentCount}:${runSubs}:${isExp}:${item.latestTokPerSec ?? ''}:${item.contextUsedPct ?? ''}:${item.mainActivity?.signature || ''}:${item.mainActivity?.startedAtMs || 0}:${subSig}`;
        },
        createRow: createMultiLiveTaskCard,
        updateRow: (refs, item) => {
          const act = item.mainActivity || {
            phase: 'thinking',
            label: '推理中',
            detail: '',
            stepProgress: '',
            startedAtMs: item.lastModifiedMs || 0,
            signature: `fallback:${item.lastModifiedMs || 0}`,
          };
          const isWaiting = act.phase === 'waiting';
          const isCompacting = act.phase === 'compacting';
          patchClasses(refs.cardEl, {
            'is-waiting': isWaiting,
            'is-compacting': isCompacting,
          });
          patchClasses(refs.dotIcon, { 'is-pulsing': true });

          const convTitle = item.title || item.cascadeId?.slice(0, 8) || '当前会话';
          patchText(refs.titleEl, convTitle);
          patchAttr(refs.titleEl, 'title', `点击在监控面板中检视会话：${convTitle}`);
          refs.titleEl.onclick = (e) => {
            e.stopPropagation();
            inspectSessionInMonitor(item.cascadeId);
          };

          const isHere =
            Boolean(hostRouteLower) &&
            String(item.cascadeId || '').toLowerCase() === hostRouteLower;
          patchAttr(refs.hereTagEl, 'hidden', !isHere);

          const metricParts = [];
          if (Number.isFinite(item.latestTokPerSec) && item.latestTokPerSec > 0) {
            metricParts.push(
              `${item.latestTokPerSec >= 100 ? Math.round(item.latestTokPerSec) : item.latestTokPerSec.toFixed(1)} t/s`
            );
          }
          if (item.contextUsedPct != null && Number.isFinite(Number(item.contextUsedPct))) {
            metricParts.push(`${Math.round(Number(item.contextUsedPct))}%`);
          }
          const metricsStr = metricParts.join(' · ');
          patchAttr(refs.metricsEl, 'hidden', !metricsStr);
          if (metricsStr) {
            patchText(refs.metricsEl, metricsStr);
          }

          const subCount = Number(item.subagentCount || item.subagents?.length || 0);
          const runSubCount = Number(item.runningSubagentCount || 0);
          const isExpanded = manualSubExpandMap.has(item.cascadeId)
            ? manualSubExpandMap.get(item.cascadeId)
            : runSubCount > 0;
          patchAttr(refs.mainBadge, 'hidden', subCount === 0);
          patchAttr(refs.subToggleBtn, 'hidden', subCount === 0);
          if (subCount > 0) {
            const arrow = isExpanded ? '▾' : '▸';
            const toggleText =
              runSubCount > 0
                ? `子代理 ${runSubCount}/${subCount} ${arrow}`
                : `子代理 (${subCount}) ${arrow}`;
            patchText(refs.subToggleBtn, toggleText);
            patchClasses(refs.subToggleBtn, { 'is-expanded': isExpanded });
            refs.subToggleBtn.onclick = (e) => {
              e.stopPropagation();
              manualSubExpandMap.set(item.cascadeId, !isExpanded);
              renderCapsuleTelemetry();
              if (multiOpen) {
                positionFloatingElements();
              }
            };
          }

          const mainTimerKey = `main:${item.cascadeId}`;
          activeTimerKeys.add(mainTimerKey);
          bindMultiElapsedTimer(
            mainTimerKey,
            `${item.cascadeId}:${act.signature || act.label}`,
            act.startedAtMs,
            refs.elapsedEl
          );

          patchText(refs.mainPhase, act.label || '推理中');
          const progText = act.stepProgress ? `[${act.stepProgress}]` : '';
          patchAttr(refs.mainProgress, 'hidden', !progText);
          if (progText) {
            patchText(refs.mainProgress, progText);
          }

          const detailStr = act.detail || '';
          patchAttr(refs.mainSep, 'hidden', !detailStr);
          patchAttr(refs.mainDetail, 'hidden', !detailStr);
          patchText(refs.mainDetail, detailStr);

          const showSubs = subCount > 0 && isExpanded;
          patchAttr(refs.subListEl, 'hidden', !showSubs);
          if (showSubs) {
            const subItems = item.subagents || [];
            patchKeyedList(refs.subListEl, subItems, {
              keyFn: (sub) => sub.cascadeId,
              sigFn: (sub) =>
                `${sub.cascadeId}:${sub.role}:${sub.isRunning}:${sub.stepCount}:${sub.liveActivity?.signature || ''}:${sub.isRunning ? multiTimersMap.has(`sub:${sub.cascadeId}`) : true}`,
              createRow: createMultiLiveSubRow,
              updateRow: (subRefs, sub) => {
                const subAct = sub.liveActivity || {
                  phase: sub.isRunning ? 'thinking' : 'done',
                  label: sub.isRunning ? '推理中' : '已完成',
                  detail: '',
                  stepProgress: '',
                  startedAtMs: sub.lastModifiedMs || 0,
                };
                patchClasses(subRefs.rowEl, { 'is-done': !sub.isRunning });
                const subBadgeCls = getAgentBadgeClass(sub.index || 1, false);
                patchAttr(subRefs.subBadge, 'class', `agent-badge ${subBadgeCls}`);
                patchText(subRefs.subBadge, sub.badgeText || `子${sub.index || 1}`);
                patchText(subRefs.subRole, sub.role || sub.shortLabel || '子代理');

                const subProg = subAct.stepProgress ? ` [${subAct.stepProgress}]` : '';
                const summaryText = sub.isRunning
                  ? `${subAct.label || '运行中'}${subProg}${subAct.detail ? ` · ${subAct.detail}` : ''}`
                  : `已完成 (${sub.stepCount || 0} 步)`;
                patchText(subRefs.subSummary, summaryText);

                const subTimerKey = `sub:${sub.cascadeId}`;
                if (sub.isRunning) {
                  activeTimerKeys.add(subTimerKey);
                  bindMultiElapsedTimer(
                    subTimerKey,
                    `${sub.cascadeId}:${subAct.signature || subAct.label}`,
                    subAct.startedAtMs || sub.lastModifiedMs,
                    subRefs.subElapsed
                  );
                } else {
                  multiTimersMap.delete(subTimerKey);
                  patchText(subRefs.subElapsed, `${sub.stepCount || 0}步`);
                }
              },
            });
          }
        },
      });

      for (const k of [...multiTimersMap.keys()]) {
        if (!activeTimerKeys.has(k)) {
          multiTimersMap.delete(k);
        }
      }
      ensureMultiLiveTicker();
    }

    // --- 4b. 同步右侧指标胶囊与悬停全景三卡片 ---
    const isRunning = Boolean(aggregated?.isRunning || activeConv.isRunning);
    const tps =
      capsuleScopedConv?.latestTokPerSec ??
      aggregated?.latestTokPerSec ??
      activeConv.latestTokPerSec ??
      null;
    const ttft =
      capsuleScopedConv?.latestTtftSec ??
      aggregated?.latestTtftSec ??
      activeConv.latestTtftSec ??
      null;
    const capsuleStepCost =
      capsuleScopedConv?.latestStepCostUsd ??
      aggregated?.latestStepCostUsd ??
      activeConv.latestStepCostUsd ??
      null;

    patchClasses(capsuleBtn, { 'is-running': isRunning });
    applyCapsuleSlots(slotKeys, {
      hasTelemetry: true,
      usedPct,
      dashOffset,
      isRunning,
      tps,
      ttft,
      stepCost: capsuleStepCost,
      quotas: telemetry.quotas,
    });

    const updateMode = normalizeClientUpdateMode(
      telemetry.settings?.pluginUpdateMode,
      telemetry.settings?.autoUpdatePlugin
    );
    const showUpdatePrompt =
      Boolean(telemetry.cloudStatus?.updateAvailable) && updateMode !== 'off';
    const latestVer = telemetry.cloudStatus?.latestPluginVersion || '';
    patchAttr(updateDot, 'hidden', !showUpdatePrompt);
    patchAttr(topbarUpdateBtn, 'hidden', !showUpdatePrompt);
    patchAttr(hoverUpdateBar, 'hidden', !showUpdatePrompt);
    if (showUpdatePrompt) {
      if (!isTopbarUpdating) {
        patchText(topbarUpdateLabel, latestVer ? `v${latestVer}` : '新版本');
      }
      patchAttr(
        topbarUpdateBtn,
        'title',
        latestVer ? `发现新版本 v${latestVer}，左键立即更新` : '发现新版本，左键立即更新'
      );
      patchText(
        hoverUpdateVerText,
        latestVer ? `发现新版本 v${latestVer}` : '发现新版本可用'
      );
      patchText(
        hoverUpdateHintText,
        latestVer ? `点击顶栏 v${latestVer} 即可更新` : '点击顶栏版本胶囊即可更新'
      );
    }
    if (showUpdatePrompt !== lastShowUpdate) {
      lastShowUpdate = showUpdatePrompt;
      updateResponsiveLayout();
    }

    // --- 同步悬停三卡片全景概览（与 LiveOverviewView 保持完全一致的数据口径与视觉呈现） ---
    const activeModelDisplay = resolveModelDisplayInfo(overviewActive, telemetry.settings, {
      fallback: '模型未知',
    }).text;

    patchClasses(hoverPulseDot, { 'is-pulsing': Boolean(overviewActive.isRunning || isRunning) });
    patchText(hoverTpsVal, formatMetric(overviewActive.latestTokPerSec, ' tok/s'));
    const reason = speedReasonText(overviewActive.latestSpeedReason);
    const modelAndAgent =
      hasSubagents && overviewActive.activeAgentBadge
        ? `[${overviewActive.activeAgentBadge}] ${activeModelDisplay}`
        : activeModelDisplay;
    patchText(hoverTpsSub, reason ? `${modelAndAgent} · ${reason}` : modelAndAgent);

    patchText(hoverTtftVal, formatMetric(overviewActive.latestTtftSec, 's'));
    patchText(hoverTtftSub, `均值 ${formatMetric(overviewActive.ttftSummary?.avgSec, 's')}`);

    patchText(hoverAvgVal, formatMetric(overviewActive.avgTokPerSec, ' tok/s'));
    patchText(hoverAvgSub, `有效 ${sampleSummary(overviewActive.speedSummary)}`);

    const stepCost = overviewActive.latestStepCostUsd;
    const hasAnySteps = Number(overviewActive.stepCount || 0) > 0;
    patchText(
      hoverCostVal,
      !hasAnySteps && stepCost == null ? '—' : formatUsd(stepCost, { precise: true })
    );
    patchText(
      hoverCacheSub,
      `缓存 ${overviewActive.latestCacheHitPct ?? 0}% · 累计 ${formatUsd(overviewActive.sessionCostUsd || 0)}`
    );

    patchAttr(hoverCtxAgentBadge, 'hidden', !(hasSubagents && ctxAgent));
    if (hasSubagents && ctxAgent) {
      const badgeCls = getAgentBadgeClass(ctxAgent.index || 0, Boolean(ctxAgent.isMain));
      patchAttr(hoverCtxAgentBadge, 'class', `agent-badge ${badgeCls}`);
      patchText(hoverCtxAgentBadge, formatAgentLabel(ctxAgent));
    }
    patchText(
      hoverCtxSummaryText,
      `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
    );
    hoverCtxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });

    const scoredChannels = CTX_CHANNEL_DEFS.map((ch, defaultOrder) => ({
      ch,
      defaultOrder,
      val: ch.getValue(ctx),
    }));
    scoredChannels.sort((a, b) => b.val - a.val || a.defaultOrder - b.defaultOrder);
    for (let i = 0; i < hoverLegendSlots.length; i += 1) {
      const slot = hoverLegendSlots[i];
      const entry = scoredChannels[i];
      if (!slot || !entry) continue;
      patchAttr(slot.swatchEl, 'class', `swatch ${entry.ch.segClass}`);
      patchText(slot.labelEl, entry.ch.label);
      patchText(slot.valEl, formatTokens(entry.val));
    }

    const quotas = telemetry.quotas || {};
    const weekly = quotas.weekly || {};
    const minuteTick = Number(telSt.minuteTick || Math.floor(Date.now() / 30000));
    patchText(
      hoverTierBadge,
      `${telemetry.account?.tierName || 'Google AI'} · ${telemetry.account?.planName || 'Pro'}`
    );
    patchKeyedList(hoverPoolsListEl, buildQuotaPoolItems(quotas, minuteTick), {
      keyFn: (item) => item.key,
      sigFn: quotaPoolRowSig,
      createRow: createPoolQuotaRow,
      updateRow: syncPoolQuotaRow,
    });
    patchText(
      hoverWkFootLeft,
      `本周累计: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0)})`
    );
    patchText(
      hoverWkFootRight,
      telemetry.account?.aiCredits > 0
        ? `AI 积分: ${telemetry.account.aiCredits}`
        : `本周调用: ${weekly.calls || 0} 次`
    );
  }

  const unsubStore = telemetryStore.subscribe(
    (st) => ({
      syncState: st.syncState,
      telemetry: st.telemetry,
      minuteTick: st.minuteTick,
      selectedConversationId: st.selectedConversationId,
    }),
    (slice) => {
      if (slice.telemetry?.settings?.enableWindowOverlay === false) {
        if (popoverOpen) setPopoverOpen(false);
        if (multiOpen) setMultiOpen(false);
      }
      renderCapsuleTelemetry();
    }
  );

  const unsubUiScope = uiStore.subscribe(
    (st) => ({
      selectedAgentScope: st.selectedAgentScope,
      ctxInspectorAgentId: st.ctxInspectorAgentId,
    }),
    () => renderCapsuleTelemetry()
  );

  // --- 5. 宿主会话路由跟随与全局交互监听 ---
  function syncHostRouteIfChanged() {
    if (disposed) return;
    const currentRouteId = extractHostRouteCascadeId();
    if (currentRouteId === lastObservedRouteId) return;
    lastObservedRouteId = currentRouteId;
    const st = telemetryStore.getState();
    const patch = { hostRouteConversationId: currentRouteId };
    if (currentRouteId && st.selectedConversationId && st.selectedConversationId !== currentRouteId) {
      patch.selectedConversationId = '';
    }
    uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
    telemetryStore.setState(patch);
    void fetchTelemetry({ force: false });
  }

  const onDocMouseDown = (e) => {
    if (popoverOpen && !isEventInside(e, popoverEl) && !isEventInside(e, capsuleHost)) {
      setPopoverOpen(false);
    }
    if (multiOpen && !isEventInside(e, multiPanelEl) && !isEventInside(e, capsuleHost)) {
      setMultiOpen(false);
    }
  };

  const onDocKeyDown = (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      if (popoverOpen) {
        setPopoverOpen(false);
      }
      if (multiOpen) {
        setMultiOpen(false);
      }
    }
  };

  const onWindowPointerMove = (e) => recordPointerCoords(e);
  const onWindowBlur = () => {
    hasPointerCoords = false;
    if (tooltipOpen) {
      setTooltipOpen(false);
    }
    if (multiOpen && !multiPinned) {
      setMultiOpen(false);
    }
  };
  const onWindowResize = () => updateResponsiveLayout();
  const onPopState = () => syncHostRouteIfChanged();
  const onVisibilityChange = () => {
    if (document.hidden) {
      hasPointerCoords = false;
      if (tooltipOpen) {
        setTooltipOpen(false);
      }
      if (multiOpen && !multiPinned) {
        setMultiOpen(false);
      }
      return;
    }
    if (!document.hidden && !disposed) {
      syncHostRouteIfChanged();
      void fetchTelemetry({ force: false });
    }
  };

  let hostDomObserver = null;
  try {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateResponsiveLayout());
      if (document.body) resizeObserver.observe(document.body);
    }
    if (typeof MutationObserver !== 'undefined' && document.body) {
      hostDomObserver = new MutationObserver(() => {
        syncHostRouteIfChanged();
        const tb = findHostTitlebar();
        if (
          !capsuleHost.isConnected ||
          !portalHost.isConnected ||
          (tb && !tb.contains(capsuleHost)) ||
          (!tb && capsuleHost.getAttribute('data-dock') === 'flow')
        ) {
          scheduleDockSync();
        }
      });
      hostDomObserver.observe(document.body, { childList: true, subtree: true });
    }
  } catch {
    // 忽略观察器初始化异常
  }

  document.addEventListener?.('mousedown', onDocMouseDown, true);
  document.addEventListener?.('keydown', onDocKeyDown);
  document.addEventListener?.('visibilitychange', onVisibilityChange);
  window.addEventListener?.('pointermove', onWindowPointerMove, { passive: true });
  window.addEventListener?.('blur', onWindowBlur);
  window.addEventListener?.('resize', onWindowResize);
  window.addEventListener?.('popstate', onPopState);
  navigator?.windowControlsOverlay?.addEventListener?.('geometrychange', onWindowResize);

  const watchdogTimer = setInterval(() => {
    if (disposed) return;
    syncHostRouteIfChanged();
    if (!capsuleHost.isConnected || !portalHost.isConnected) {
      ensureCapsuleDocked();
    }
  }, 1200);

  ensureCapsuleDocked();
  renderCapsuleTelemetry();
  const allowMultiCarryOver =
    telemetryStore.getState().telemetry?.settings?.showTopbarMultiSession !== false;
  if (carryOverPopoverOpen) {
    setPopoverOpen(true, { instant: true });
  } else if (carryOverMultiPinnedOpen && allowMultiCarryOver) {
    setMultiOpen(true, { pinned: true, instant: true });
  } else if (carryOverMultiHoverOpen && allowMultiCarryOver) {
    setMultiOpen(true, { pinned: false, instant: true });
  } else if (carryOverTooltipOpen) {
    setTooltipOpen(true, { instant: true });
  }
  const stopPolling = startAsyncTelemetryLoop(2000);

  const handle = {
    bundleVersion,
    ensureAlive() {
      if (disposed) return false;
      return ensureCapsuleDocked();
    },
    updateBridge(nextBridge) {
      if (disposed || !nextBridge || typeof nextBridge !== 'object') return false;
      const port = Number(nextBridge.port || 0);
      const token = String(nextBridge.token || '');
      if (!Number.isInteger(port) || port <= 0 || !token) return false;
      const cur = window.__AGUsageMonitorBridge || {};
      const portChanged = Number(cur.port || 0) !== port;
      cur.port = port;
      cur.token = token;
      if (portChanged && cur.transportMode !== 'cdp') {
        cur.transportMode = 'http';
      }
      window.__AGUsageMonitorBridge = cur;
      void fetchTelemetry({ force: false });
      return true;
    },
    getTelemetrySnapshot() {
      return telemetryStore.getState().telemetry;
    },
    getLastPointer() {
      return hasPointerCoords ? { x: lastPointerX, y: lastPointerY } : null;
    },
    deliverRpc(responses) {
      if (disposed) return 0;
      return deliverCdpBridgeResponses(responses);
    },
    open() {
      setPopoverOpen(true);
    },
    close() {
      setPopoverOpen(false);
    },
    toggle() {
      setPopoverOpen(!popoverOpen);
    },
    openMulti(pinned = true) {
      setMultiOpen(true, { pinned: Boolean(pinned) });
    },
    closeMulti() {
      setMultiOpen(false);
    },
    isOpen: () => popoverOpen,
    isHoverOpen: () => tooltipOpen,
    isMultiOpen: () => multiOpen,
    isMultiHoverOpen: () => Boolean(multiOpen && !multiPinned),
    isMultiPinnedOpen: () => Boolean(multiOpen && multiPinned),
    getLayoutMode: () => layoutMode,
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(watchdogTimer);
      if (hoverLeaveTimer) {
        clearTimeout(hoverLeaveTimer);
        hoverLeaveTimer = null;
      }
      if (multiLeaveTimer) {
        clearTimeout(multiLeaveTimer);
        multiLeaveTimer = null;
      }
      stopMultiLiveTicker();
      if (dockRafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(dockRafId);
        dockRafId = 0;
      }
      stopPolling();
      stopAsyncTelemetryLoop();
      unsubStore();
      unsubUiScope();
      try {
        resizeObserver?.disconnect();
      } catch {}
      try {
        hostDomObserver?.disconnect();
      } catch {}
      document.removeEventListener?.('mousedown', onDocMouseDown, true);
      document.removeEventListener?.('keydown', onDocKeyDown);
      document.removeEventListener?.('visibilitychange', onVisibilityChange);
      window.removeEventListener?.('pointermove', onWindowPointerMove);
      window.removeEventListener?.('blur', onWindowBlur);
      window.removeEventListener?.('resize', onWindowResize);
      window.removeEventListener?.('popstate', onPopState);
      navigator?.windowControlsOverlay?.removeEventListener?.('geometrychange', onWindowResize);
      try {
        hoverCtxSegmentBar.destroy();
      } catch {}
      try {
        appInstance.destroy();
      } catch {}
      try {
        capsuleHost.remove();
      } catch {}
      try {
        portalHost.remove();
      } catch {}
      if (window.__AGUsageMonitorOverlay === handle) {
        delete window.__AGUsageMonitorOverlay;
      }
    },
  };

  window.__AGUsageMonitorOverlay = handle;
  return handle;
}

// --- src/main.js ---
/**
 * @fileoverview Async entry point for Antigravity Usage & Speed Monitor.
 * Automatically branches between Auxiliary Sidebar Webview mode (`#app-root`)
 * and Main Window Dual-Mount Overlay mode (`window.__AGUsageMonitorBridge`).
 */


async function bootstrapApp(mountTarget = document.getElementById('app-root')) {
  if (!mountTarget) return null;
  const appInstance = App();
  mountTarget.appendChild(appInstance.el);
  const stopPolling = startAsyncTelemetryLoop(2000);
  return {
    appInstance,
    stopPolling,
  };
}

function startEntry() {
  if (isWindowOverlayMode()) {
    mountWindowOverlay();
    return;
  }
  bootstrapApp();
}

function init() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      startEntry();
    });
  } else {
    startEntry();
  }
}

init();
})();
