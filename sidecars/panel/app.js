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

    const notifyAll = () => {
      for (const sub of subscribers) {
        const nextSlice = sub.selector(state);
        const equal = sub.compare(sub.lastSlice, nextSlice);
        if (!equal) {
          const prevSlice = sub.lastSlice;
          sub.lastSlice = nextSlice;
          sub.listener(nextSlice, prevSlice);
        }
      }
    };

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
    if (!el.hasAttribute(attrName)) {
      return false;
    }
    el.removeAttribute(attrName);
    return true;
  }
  const strVal = nextValue === true ? '' : String(nextValue);
  if (el.getAttribute(attrName) === strVal) {
    return false;
  }
  el.setAttribute(attrName, strVal);
  return true;
}

function patchClasses(el, classMap) {
  if (!el || !classMap) return false;
  let mutated = false;
  for (const [cls, active] of Object.entries(classMap)) {
    if (!cls) continue;
    const has = el.classList.contains(cls);
    const shouldHave = Boolean(active);
    if (has !== shouldHave) {
      el.classList.toggle(cls, shouldHave);
      mutated = true;
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
  const orderedNodes = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = String(keyFn(item, i));
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

const globalEmitListeners = new Set();

function onComponentEmit(listener) {
  globalEmitListeners.add(listener);
  return () => globalEmitListeners.delete(listener);
}

function defineComponent({ name, setup }) {
  return function createInstance(initialProps = {}) {
    let props = { ...initialProps };
    const cleanups = [];
    const eventHandlers = new Map();

    function on(event, fn) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event).add(fn);
      return () => eventHandlers.get(event)?.delete(fn);
    }

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
      const handlers = eventHandlers.get(event);
      if (handlers) {
        for (const fn of handlers) {
          fn(payload);
        }
      }
      for (const observer of globalEmitListeners) {
        observer({
          component: name || 'AnonymousComponent',
          event,
          payload,
          timestamp: Date.now(),
        });
      }
    }

    function onCleanup(fn) {
      if (typeof fn === 'function') {
        cleanups.push(fn);
      }
    }

    const setupResult = setup({
      getProps: () => props,
      emit,
      onCleanup,
    });

    function setProps(nextProps = {}) {
      props = { ...props, ...nextProps };
      if (typeof setupResult.onPropsChange === 'function') {
        setupResult.onPropsChange(props);
      }
    }

    function setValue(nextValue) {
      setProps({ modelValue: nextValue });
    }

    function getValue() {
      return typeof setupResult.getValue === 'function'
        ? setupResult.getValue()
        : props.modelValue;
    }

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
      on,
      emit,
      setProps,
      setValue,
      getValue,
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

function formatUsd(amount, { precise = false, estimated = false, unpricedCalls = 0 } = {}) {
  if (amount == null || !Number.isFinite(Number(amount))) return '待定';
  const val = Number(amount || 0);
  const prefix = estimated ? '≈$' : '$';
  const suffix = unpricedCalls > 0 ? ' + 待定' : '';
  if (precise) {
    return (val >= 1 ? `${prefix}${val.toFixed(2)}` : `${prefix}${val.toFixed(3)}`) + suffix;
  }
  return `${prefix}${val.toFixed(2)}${suffix}`;
}

function speedReasonText(reason) {
  return ({
    compaction: '自动压缩不计均速',
    incomplete_or_invalid_timing: '未完成或计时缺失',
    invalid_output_tokens: '输出 Token 计数无效',
    inconsistent_timing: '原生首响应与总计时不一致',
    short_timing: '计时过短，暂不测速',
    short_sample: '短样本，不计均速',
    legacy_cache: '旧缓存，等待重新读取',
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
  if (!targetMs || Number.isNaN(targetMs)) return '未知重置时间';
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return '即将重置';

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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- src/core/httpClient.js ---
/**
 * @fileoverview Async HTTP client with AbortController cancellation for stale
 * polling requests and concurrent GET deduplication.
 */

const inFlightGets = new Map();
const activeControllers = new Map();

async function callSidecarApi(path, { method = 'GET', body, abortKey = '' } = {}) {
  const upperMethod = method.toUpperCase();
  const dedupKey = upperMethod === 'GET' && !abortKey ? path : '';

  if (dedupKey && inFlightGets.has(dedupKey)) {
    return inFlightGets.get(dedupKey);
  }

  let signal;
  if (abortKey && typeof AbortController !== 'undefined') {
    const prev = activeControllers.get(abortKey);
    if (prev) {
      prev.abort();
    }
    const controller = new AbortController();
    activeControllers.set(abortKey, controller);
    signal = controller.signal;
  }

  const runRequest = async () => {
    const sidecar = typeof window !== 'undefined' ? window.sidecar : null;
    const fetchFn = sidecar?.fetch
      ? sidecar.fetch.bind(sidecar)
      : globalThis.fetch.bind(globalThis);

    const res = await fetchFn(path, {
      method: upperMethod,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
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
  { value: 'consumption', label: '消耗统计', icon: 'chart-bar' },
  { value: 'steps', label: '步骤明细', icon: 'table' },
  { value: 'settings', label: '系统设置', icon: 'sliders' },
]);

const uiStore = createReactiveStore({
  activeView: 'overview',
  stepsSubTab: 'steps', // 'steps' | 'models'
  showAllPools: true,
  ctxBreakdownOpen: true,
});

// --- src/store/telemetryStore.js ---
/**
 * @fileoverview Reactive telemetry store with async non-overlapping poll scheduler
 * and granular slice updates.
 */


const initialConversationId =
  (typeof window !== 'undefined' && window.sidecar?.conversationId) || '';

const telemetryStore = createReactiveStore({
  selectedConversationId: initialConversationId,
  selectedTimeRange: 'today',
  customStartMs: Date.now() - 24 * 3600 * 1000,
  customEndMs: Date.now(),
  syncState: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  telemetry: null,
});

let pollTimer = null;
let feedbackTimer = null;
let activeBundleVersion = 0;
let latestRequestSeq = 0;

function isEquivalentTelemetry(prev, next) {
  if (!prev || !next) return false;
  if (prev === next) return true;

  const pAct = prev.activeConversation;
  const nAct = next.activeConversation;
  if (pAct?.cascadeId !== nAct?.cascadeId) return false;
  if (pAct?.stepCount !== nAct?.stepCount) return false;
  if (pAct?.isRunning !== nAct?.isRunning) return false;
  if (pAct?.latestTokPerSec !== nAct?.latestTokPerSec) return false;
  if (pAct?.latestTtftSec !== nAct?.latestTtftSec) return false;
  if (pAct?.activeModelShort !== nAct?.activeModelShort || pAct?.activeModelLabel !== nAct?.activeModelLabel) return false;
  if (pAct?.latestStepCostUsd !== nAct?.latestStepCostUsd || pAct?.sessionUnpricedCalls !== nAct?.sessionUnpricedCalls) return false;
  const pCtx = pAct?.context;
  const nCtx = nAct?.context;
  if (pCtx?.totalTokens !== nCtx?.totalTokens) return false;
  if (pCtx?.messagesTokens !== nCtx?.messagesTokens) return false;
  if (pCtx?.systemToolsTokens !== nCtx?.systemToolsTokens) return false;
  if (pCtx?.mcpToolsTokens !== nCtx?.mcpToolsTokens) return false;
  if (pCtx?.skillsTokens !== nCtx?.skillsTokens) return false;
  if (pCtx?.systemPromptTokens !== nCtx?.systemPromptTokens) return false;
  if (pCtx?.userRulesTokens !== nCtx?.userRulesTokens) return false;
  if ((pAct?.recentSteps?.length || 0) !== (nAct?.recentSteps?.length || 0)) return false;
  for (let i = 0; i < (pAct?.recentSteps?.length || 0); i++) {
    const before = pAct.recentSteps[i], after = nAct.recentSteps[i];
    if (before.modelKey !== after.modelKey || before.modelShort !== after.modelShort ||
        before.modelSource !== after.modelSource || before.costUsd !== after.costUsd) return false;
  }

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
  if (pAcct?.calls !== nAcct?.calls) return false;
  if (pAcct?.costUsd !== nAcct?.costUsd) return false;
  if (pAcct?.unpricedCalls !== nAcct?.unpricedCalls) return false;

  const pTrend = prev.consumption?.trendSeries || [];
  const nTrend = next.consumption?.trendSeries || [];
  if (pTrend.length !== nTrend.length) return false;
  for (let i = 0; i < pTrend.length; i++) {
    if (pTrend[i]?.tokens !== nTrend[i]?.tokens || pTrend[i]?.label !== nTrend[i]?.label) {
      return false;
    }
  }

  const pModels = prev.modelBreakdown || [];
  const nModels = next.modelBreakdown || [];
  if (pModels.length !== nModels.length) return false;
  for (let i = 0; i < pModels.length; i++) {
    if (
      pModels[i]?.label !== nModels[i]?.label ||
      pModels[i]?.shortName !== nModels[i]?.shortName ||
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

  const pQuot = prev.quotas?.activePool;
  const nQuot = next.quotas?.activePool;
  if (pQuot?.usedPct !== nQuot?.usedPct) return false;
  if (pQuot?.remainingPct !== nQuot?.remainingPct) return false;
  if (prev.quotas?.weekly?.usedPct !== next.quotas?.weekly?.usedPct) return false;

  if ((prev.conversations?.length || 0) !== (next.conversations?.length || 0)) return false;

  return true;
}

async function fetchTelemetry({ force = false } = {}) {
  const st = telemetryStore.getState();
  const reqSeq = ++latestRequestSeq;
  const startMs = Date.now();

  if (force) {
    telemetryStore.setState({ syncState: 'syncing' });
  }

  try {
    const params = new URLSearchParams();
    if (st.selectedConversationId) {
      params.set('conversationId', st.selectedConversationId);
    }
    if (st.selectedTimeRange) {
      params.set('range', st.selectedTimeRange);
    }
    if (st.selectedTimeRange === 'custom') {
      if (st.customStartMs > 0) params.set('startMs', String(st.customStartMs));
      if (st.customEndMs > 0) params.set('endMs', String(st.customEndMs));
    }
    if (force) {
      params.set('force', '1');
    }
    const qs = params.toString();
    const payload = await callSidecarApi(`/api/telemetry${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      abortKey: 'telemetry-poll',
    });

    if (reqSeq !== latestRequestSeq) {
      return payload;
    }

    if (payload?.uiBundleVersion) {
      if (activeBundleVersion && activeBundleVersion !== payload.uiBundleVersion) {
        if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
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
        syncState: latestSt.syncState === 'synced' ? 'synced' : 'idle',
      });
    }
    return payload;
  } catch (err) {
    if (err?.name === 'AbortError' || reqSeq !== latestRequestSeq) return null;
    telemetryStore.setState({ syncState: 'error' });
    return null;
  }
}

async function saveSettingsPatch(patch) {
  const prevTelemetry = telemetryStore.getState().telemetry;
  if (prevTelemetry?.settings) {
    telemetryStore.setState({
      telemetry: {
        ...prevTelemetry,
        settings: { ...prevTelemetry.settings, ...patch },
        activeConversation: patch.contextWindowLimit
          ? {
              ...prevTelemetry.activeConversation,
              context: {
                ...prevTelemetry.activeConversation?.context,
                limitTokens: patch.contextWindowLimit,
                usedPct: Math.min(
                  100,
                  Math.round(
                    ((prevTelemetry.activeConversation?.context?.totalTokens || 0) /
                      Math.max(1, patch.contextWindowLimit)) *
                      100
                  )
                ),
              },
            }
          : prevTelemetry.activeConversation,
      },
    });
  }
  await callSidecarApi('/api/settings', { method: 'POST', body: patch });
  await fetchTelemetry({ force: true });
}

function startAsyncTelemetryLoop(intervalMs = 2000) {
  stopAsyncTelemetryLoop();
  let active = true;

  const tick = async () => {
    if (!active) return;
    await fetchTelemetry({ force: false });
    if (!active) return;
    pollTimer = setTimeout(tick, intervalMs);
  };

  tick();
  return () => {
    active = false;
    stopAsyncTelemetryLoop();
  };
}

function stopAsyncTelemetryLoop() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
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
                  const delta = e.key === 'ArrowRight' ? 1 : -1;
                  const nextIndex = (index + delta + curItems.length) % curItems.length;
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

// --- src/components/ui/CustomNumberInput.js ---
/**
 * @fileoverview Bespoke CustomNumberInput spinbutton & precision stepper.
 * Replaces native <input type="number"> with custom SVG step controls,
 * keyboard ArrowUp/ArrowDown (+Shift 10x), and min/max clamping.
 */


const CustomNumberInput = defineComponent({
  name: 'CustomNumberInput',
  setup({ getProps, emit }) {
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
      const rawText = String(textField.value || '').replace(/[^0-9.-]/g, '');
      const next = clampValue(rawText);
      const prev = Number(getProps().modelValue);
      syncFieldDisplay(next);
      if (next !== prev) {
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
      getValue: () => clampValue(textField.value),
      methods: {
        stepUp: (mult = 1) => applyStep(1, mult),
        stepDown: (mult = 1) => applyStep(-1, mult),
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

// --- src/components/ui/CustomScrollbar.js ---
/**
 * @fileoverview Bespoke custom scrollbar component (零原生滚动条).
 * Hides native OS scrollbars completely and renders a precision 4px floating
 * rail + GPU-translated thumb with drag, track-jump, and modelValue ratio emit.
 */


const CustomScrollbar = defineComponent({
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

// --- src/components/ui/SegmentedControl.js ---
/**
 * @fileoverview Micro-bezel (2px radius) SegmentedControl switcher
 * for time-range filtering, context limit selection, and sub-table switching.
 */


const SegmentedControl = defineComponent({
  name: 'SegmentedControl',
  setup({ getProps, emit }) {
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
 * @fileoverview 6-channel segmented context window progress bar updated via
 * CSS custom variables against the current model's automatic compaction baseline.
 */


const ContextSegmentMeter = defineComponent({
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

// --- src/components/layout/TopSessionHeader.js ---
/**
 * @fileoverview Row 1 of the compact top bar:
 * Bespoke CustomSelect for session switching, SVG live status indicator,
 * and async force-refresh button.
 */


const TopSessionHeader = defineComponent({
  name: 'TopSessionHeader',
  setup({ onCleanup }) {
    const convSelect = CustomSelect({
      modelValue: telemetryStore.getState().selectedConversationId,
      icon: 'bolt',
      placeholder: '自动跟随最新会话',
      options: [{ value: '', label: '自动跟随最新会话' }],
      onUpdateModelValue: (nextConvId) => {
        telemetryStore.setState({ selectedConversationId: nextConvId });
        fetchTelemetry({ force: false });
      },
    });

    const statusIcon = createSvgIcon('pulse', { size: 12 });
    const statusText = h('span', { text: '实时 2s' });
    const statusTag = h('span', { className: 'status-tag' }, [statusIcon, statusText]);

    const refreshBtn = h(
      'button',
      {
        type: 'button',
        className: 'icon-btn',
        'aria-label': '立即强制同步官方额度与测速',
        onClick: () => fetchTelemetry({ force: true }),
      },
      [createSvgIcon('refresh', { size: 13 })]
    );

    const headerEl = h('header', { className: 'session-header' }, [
      h('div', { className: 'session-left' }, [convSelect.el]),
      h('div', { className: 'session-right' }, [statusTag, refreshBtn]),
    ]);

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        selectedConversationId: st.selectedConversationId,
        syncState: st.syncState,
        conversations: st.telemetry?.conversations,
        isRunning: st.telemetry?.activeConversation?.isRunning,
        quotaMeta: st.telemetry?.quotas?.meta,
      }),
      (slice) => {
        const convs = slice.conversations || [];
        const latestTitle = convs[0]?.title ? `自动跟随 (${convs[0].title})` : '自动跟随最新会话';
        const options = [
          { value: '', label: latestTitle, meta: convs[0] ? `${convs[0].stepCount}步` : '' },
          ...convs.map((c) => ({
            value: c.cascadeId,
            label: c.title || c.cascadeId.slice(0, 8),
            meta: `${c.stepCount || 0}步`,
          })),
        ];
        convSelect.setProps({
          modelValue: slice.selectedConversationId,
          options,
        });

        const isSyncing = slice.syncState === 'syncing';
        const isSynced = slice.syncState === 'synced';
        const isError = slice.syncState === 'error';
        const isRunning = Boolean(slice.isRunning);
        const quotaStale = Boolean(slice.quotaMeta?.refreshFailed || slice.quotaMeta?.isStale);

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
          patchSvgIcon(statusIcon, 'bolt');
          patchText(statusText, '生成中');
          patchClasses(statusTag, {
            'state-running': true,
            'state-synced': false,
            'state-warn': false,
          });
        } else if (quotaStale) {
          patchSvgIcon(statusIcon, 'warning');
          patchText(statusText, slice.quotaMeta?.hasOfficialData ? '额度缓存' : '额度离线');
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
 * Displays real-time TPS, TTFT, weighted mean speed, 4-channel Context Window
 * breakdown automatically anchored to the current model's compaction baseline,
 * and official 5h/weekly quota pools for both Gemini and Claude & GPT.
 */


const LiveOverviewView = defineComponent({
  name: 'LiveOverviewView',
  setup({ onCleanup }) {
    // 1. 4-Cell Real-time Telemetry Matrix
    const tpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
    const tpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
    const pulseDot = createSvgIcon('dot', { size: 10 });

    const ttftVal = h('strong', { className: 'cell-value', text: '—' });
    const ttftSub = h('span', { className: 'cell-sub', text: '均值 —' });

    const avgVal = h('strong', { className: 'cell-value', text: '—' });
    const avgSub = h('span', { className: 'cell-sub', text: '有效 0/0 步' });

    const costVal = h('strong', { className: 'cell-value', text: '$0.000' });
    const cacheSub = h('span', { className: 'cell-sub accent-ok', text: '缓存 0% · 累 $0.00' });

    const matrixEl = h('section', { className: 'telemetry-matrix', 'aria-label': '核心测速指标' }, [
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [h('span', { text: '实时吞吐' }), pulseDot]),
        tpsVal,
        tpsSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '首Token' }),
          createSvgIcon('clock', { size: 11 }),
        ]),
        ttftVal,
        ttftSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '会话均速' }),
          createSvgIcon('pulse', { size: 11 }),
        ]),
        avgVal,
        avgSub,
      ]),
      h('div', { className: 'matrix-cell' }, [
        h('div', { className: 'cell-label' }, [
          h('span', { text: '本步消费' }),
          createSvgIcon('bolt', { size: 11 }),
        ]),
        costVal,
        cacheSub,
      ]),
    ]);

    // 2. Context Window 6-Segment Panel (Auto Compaction Baseline)
    const ctxSummaryText = h('span', { className: 'text-mono', text: '0 / 256.0k (0%)' });
    const ctxSegmentBar = ContextSegmentMeter({ context: {} });

    const bdMessages = h('strong', { className: 'text-mono', text: '0' });
    const bdSystemTools = h('strong', { className: 'text-mono', text: '0' });
    const bdMcpTools = h('strong', { className: 'text-mono', text: '0' });
    const bdSkills = h('strong', { className: 'text-mono', text: '0' });
    const bdSystemPrompt = h('strong', { className: 'text-mono', text: '0' });
    const bdUserRules = h('strong', { className: 'text-mono', text: '0' });

    const ctxPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('layers', { size: 13 }),
          h('span', { text: '上下文窗口构成' }),
        ]),
        h('span', { className: 'panel-meta' }, [ctxSummaryText]),
      ]),
      ctxSegmentBar.el,
      h('div', { className: 'ctx-legend-grid' }, [
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-messages' }),
            h('span', { text: '消息' }),
          ]),
          bdMessages,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-system-tools' }),
            h('span', { text: '系统工具' }),
          ]),
          bdSystemTools,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-mcp-tools' }),
            h('span', { text: 'MCP 工具' }),
          ]),
          bdMcpTools,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-skills' }),
            h('span', { text: 'Skill' }),
          ]),
          bdSkills,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-system-prompt' }),
            h('span', { text: '系统提示词' }),
          ]),
          bdSystemPrompt,
        ]),
        h('div', { className: 'legend-item' }, [
          h('span', { className: 'legend-left' }, [
            h('span', { className: 'swatch seg-user-rules' }),
            h('span', { text: 'user_rule' }),
          ]),
          bdUserRules,
        ]),
      ]),
    ]);

    // 3. Official 5h & Weekly Quotas Panel (Gemini Pool + Claude Pool)
    const tierBadge = h('span', { className: 'panel-meta', text: 'Google AI · Pro' });

    function createPoolQuotaBlock(poolLabel) {
      const title5h = h('span', { text: `5h 限额 (${poolLabel})` });
      const meta5h = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fill5h = h('div', { className: 'progress-fill' });

      const titleWk = h('span', { text: `每周限额 (${poolLabel})` });
      const metaWk = h('span', { className: 'panel-meta text-mono', text: '--' });
      const fillWk = h('div', { className: 'progress-fill' });

      const el = h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, [
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('div', { className: 'panel-header' }, [title5h, meta5h]),
          h('div', { className: 'progress-track' }, [fill5h]),
        ]),
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('div', { className: 'panel-header' }, [titleWk, metaWk]),
          h('div', { className: 'progress-track' }, [fillWk]),
        ]),
      ]);

      return { el, title5h, meta5h, fill5h, titleWk, metaWk, fillWk };
    }

    const geminiQuotaBlock = createPoolQuotaBlock('Gemini');
    const claudeQuotaBlock = createPoolQuotaBlock('Claude & GPT');
    claudeQuotaBlock.el.setAttribute(
      'style',
      'display: flex; flex-direction: column; gap: 8px; margin-top: 3px; padding-top: 10px; border-top: 1px solid var(--border-hairline);'
    );

    const wkFootLeft = h('span', { className: 'text-muted', text: '本周本机: 0 ($0.00)' });
    const wkFootRight = h('span', { className: 'text-muted', text: '' });

    const quotaPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('pulse', { size: 13 }),
          h('span', { text: '官方配额与周期监控' }),
        ]),
        tierBadge,
      ]),
      geminiQuotaBlock.el,
      claudeQuotaBlock.el,
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
      [matrixEl, ctxPanel, quotaPanel]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: overviewInner,
      className: 'view-pane',
    });

    function syncPoolQuotaBlock(block, poolLabel, poolData, fallbackWeekly, isActiveFamily) {
      const has5h = poolData?.usedPct != null && poolData?.remainingPct != null;
      const used5hVal = has5h ? Number(poolData.usedPct) : 0;
      const rem5hVal = has5h ? Number(poolData.remainingPct) : 0;
      patchText(block.title5h, `5h 限额 (${poolLabel})`);
      patchText(
        block.meta5h,
        has5h
          ? `${formatCountdown(poolData.resetTime)} · 已用 ${used5hVal.toFixed(1)}% (余 ${rem5hVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(block.fill5h, '--fill-w', `${Math.min(100, used5hVal)}%`);
      patchClasses(block.fill5h, {
        'tone-warn': used5hVal >= 60 && used5hVal < 85,
        'tone-danger': used5hVal >= 85,
      });

      const wkUsedRaw =
        poolData?.weeklyUsedPct ?? (isActiveFamily ? fallbackWeekly?.usedPct : null);
      const wkRemRaw =
        poolData?.weeklyRemainingPct ?? (isActiveFamily ? fallbackWeekly?.remainingPct : null);
      const wkResetRaw =
        poolData?.weeklyResetTime || (isActiveFamily ? fallbackWeekly?.resetTime : null);
      const hasWk = wkUsedRaw != null && wkRemRaw != null;
      const usedWkVal = hasWk ? Number(wkUsedRaw) : 0;
      const remWkVal = hasWk ? Number(wkRemRaw) : 0;

      const customTitle =
        isActiveFamily && fallbackWeekly?.isOfficial === false && fallbackWeekly?.title
          ? fallbackWeekly.title
          : `每周限额 (${poolLabel})`;
      patchText(block.titleWk, customTitle);
      patchText(
        block.metaWk,
        hasWk
          ? `${formatCountdown(wkResetRaw)} · 已用 ${usedWkVal.toFixed(1)}% (余 ${remWkVal.toFixed(1)}%)`
          : '获取失败 (--%)'
      );
      patchStyleVar(block.fillWk, '--fill-w', `${Math.min(100, usedWkVal)}%`);
      patchClasses(block.fillWk, {
        'tone-warn': usedWkVal >= 60 && usedWkVal < 85,
        'tone-danger': usedWkVal >= 85,
      });
    }

    let latestData = null;
    let isDirty = false;

    function renderData(data) {
      if (!data) return;
      const active = data.activeConversation || {};
      const ctx = active.context || {};
      const quotas = data.quotas || {};

      // 1. Matrix
      patchClasses(pulseDot, { 'is-pulsing': Boolean(active.isRunning) });
      patchText(tpsVal, formatMetric(active.latestTokPerSec, ' tok/s'));
      const reason = speedReasonText(active.latestSpeedReason);
      patchText(
        tpsSub,
        reason ? `${active.activeModelShort || '模型未知'} · ${reason}` : active.activeModelShort || '模型未知'
      );

      patchText(ttftVal, formatMetric(active.latestTtftSec, 's'));
      patchText(ttftSub, `均值 ${formatMetric(active.ttftSummary?.avgSec, 's')}`);

      patchText(avgVal, formatMetric(active.avgTokPerSec, ' tok/s'));
      patchText(avgSub, `有效 ${sampleSummary(active.speedSummary)}`);

      const stepCost = active.latestStepCostUsd;
      patchText(costVal, formatUsd(stepCost, { precise: true }));
      patchText(
        cacheSub,
        `缓 ${active.latestCacheHitPct ?? 0}% · 累 ${formatUsd(active.sessionCostUsd || 0, { unpricedCalls: active.sessionUnpricedCalls })}`
      );

      // 2. Context (Auto Compaction Baseline)
      const limitTokens = Number(ctx.compactionLimitTokens || ctx.limitTokens || 256000);
      const totalTokens = Number(ctx.totalTokens || 0);
      const usedPct =
        limitTokens > 0 ? Math.min(100, +((totalTokens / limitTokens) * 100).toFixed(1)) : 0;
      patchText(
        ctxSummaryText,
        `${formatTokens(totalTokens)} / ${formatTokens(limitTokens)} (${usedPct}%)`
      );
      ctxSegmentBar.setProps({ context: { ...ctx, limitTokens, usedPct } });
      patchText(bdMessages, formatTokens(ctx.messagesTokens || 0));
      patchText(bdSystemTools, formatTokens(ctx.systemToolsTokens || 0));
      patchText(bdMcpTools, formatTokens(ctx.mcpToolsTokens || 0));
      patchText(bdSkills, formatTokens(ctx.skillsTokens || 0));
      patchText(bdSystemPrompt, formatTokens(ctx.systemPromptTokens || 0));
      patchText(bdUserRules, formatTokens(ctx.userRulesTokens || 0));

      // 3. Quotas (Gemini + Claude & GPT)
      patchText(
        tierBadge,
        `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`
      );
      const activePool = quotas.activePool || {};
      const pools = quotas.pools || [];
      const weekly = quotas.weekly || {};

      const geminiPool =
        pools.find((p) => p.family === 'Gemini') ||
        (activePool.family === 'Gemini' ? activePool : null) ||
        {};
      const claudePool =
        pools.find((p) => p.family === 'Claude & GPT' || p.family === 'Claude') ||
        (['Claude & GPT', 'Claude', 'GPT'].includes(activePool.family) ? activePool : null) ||
        {};

      const activeIsGemini = activePool.family === 'Gemini';
      const activeIsThirdParty = ['Claude & GPT', 'Claude', 'GPT'].includes(activePool.family);
      syncPoolQuotaBlock(geminiQuotaBlock, 'Gemini', geminiPool, weekly, activeIsGemini);
      syncPoolQuotaBlock(claudeQuotaBlock, 'Claude & GPT', claudePool, weekly, activeIsThirdParty);

      patchText(
        wkFootLeft,
        `本周本机: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0, { unpricedCalls: weekly.unpricedCalls })})`
      );
      patchText(
        wkFootRight,
        data.account?.aiCredits > 0
          ? `AI 积分: ${data.account.aiCredits}`
          : `本机调用: ${weekly.calls || 0} 步`
      );

      viewScrollbar.refresh();
    }

    const unsub = telemetryStore.subscribe(
      (st) => st.telemetry,
      (data) => {
        latestData = data;
        if (uiStore.getState().activeView !== 'overview') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderData(data);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'overview' && isDirty) {
          isDirty = false;
          if (latestData) {
            renderData(latestData);
          }
        }
      }
    );

    onCleanup(() => {
      unsub();
      unsubView();
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
 * Implements the 5-part analytics layout:
 * 1. 用量概览 (Total Tokens k/M/B, USD + CNY approx, Input/Output split, Cache Hit % + Saved Cost badge, 4-color bar)
 * 2. 历史趋势 (Pure SVG smooth cubic-bezier spline area chart with peak callout and 3 time anchors)
 * 3. 热门模型 (Per-model share badge, 4-segment bar, and Input/Cache/Output/Thinking breakdown)
 * 4. 数据来源 (SOURCES breakdown with 4-segment bar)
 * 5. 按月细分 (12-month stacked vertical bar chart with cost, stacked bars, and k/M/B totals)
 */


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

const ConsumptionView = defineComponent({
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
      patchText(refs.costEl, formatUsd(item.costUsd || 0, { unpricedCalls: item.unpricedCalls }));

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
      patchText(heroCostUsd, formatUsd(costUsd, { unpricedCalls: acct.unpricedCalls }));
      patchText(heroCostCny, acct.unpricedCalls > 0 ? `${acct.unpricedCalls} 步费用待定` : formatCnyApprox(costUsd));

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
          `${m.label}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.calls}:${modelsTotalTok}`,
        createRow: createBreakdownItemRow,
        updateRow: (refs, m) => updateBreakdownItemRow(refs, m, modelsTotalTok, true),
      });

      // 4. Sources Breakdown
      const sources = cons.sourcesBreakdown || [];
      const sourcesTotalTok = sources.reduce((s, x) => s + Number(x.totalTokens || 0), 0);
      patchKeyedList(sourcesListEl, sources, {
        keyFn: (s) => s.name,
        sigFn: (s) => `${s.name}:${s.totalTokens}:${s.costUsd}:${s.unpricedCalls}:${s.calls}:${sourcesTotalTok}`,
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
          patchText(col.costText, m.unpricedCalls > 0 ? formatUsd(cVal, { unpricedCalls: m.unpricedCalls })
            : cVal >= 10 ? `$${Math.round(cVal)}` : `$${cVal.toFixed(2)}`);
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

// --- src/views/StepsDetailView.js ---
/**
 * @fileoverview View 3: StepsDetailView (步骤明细与按模型汇总视图).
 * Uses patchKeyedList for incremental row reconciliation without innerHTML resets,
 * wraps tables in bespoke CustomScrollbar (zero native OS scrollbars), and provides
 * a live row inspector bar replacing native browser title tooltips.
 */


const StepsDetailView = defineComponent({
  name: 'StepsDetailView',
  setup({ onCleanup }) {
    const subTabSwitch = SegmentedControl({
      ariaLabel: '明细表视图切换',
      modelValue: uiStore.getState().stepsSubTab,
      options: [
        { value: 'steps', label: '单步测速 (0步)' },
        { value: 'models', label: '按模型汇总' },
      ],
      onUpdateModelValue: (nextTab) => {
        uiStore.setState({ stepsSubTab: nextTab });
      },
    });

    const stepsTbody = h('tbody');
    const stepsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { text: '步' }),
            h('th', { text: '模型' }),
            h('th', { text: '速度' }),
            h('th', { text: '首Token' }),
            h('th', { text: '上下文/输出' }),
            h('th', { text: '缓存' }),
            h('th', { text: '消费' }),
          ]),
        ]),
        stepsTbody,
      ]),
    ]);
    const stepsScroll = CustomScrollbar({
      contentEl: stepsTablePane,
      className: 'table-scroll-host',
    });

    const modelsTbody = h('tbody');
    const modelsTablePane = h('div', { className: 'table-viewport' }, [
      h('table', { className: 'data-table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { text: '模型' }),
            h('th', { text: '次数' }),
            h('th', { text: '均速' }),
            h('th', { text: '总 Token' }),
            h('th', { text: '折算费用' }),
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
        h('div', { className: 'panel-header' }, [
          h('span', { className: 'panel-title' }, [
            createSvgIcon('table', { size: 13 }),
            h('span', { text: '全量测速与计费矩阵' }),
          ]),
          subTabSwitch.el,
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

    function renderStepsData(slice) {
      if (!slice) return;
      const steps = slice.recentSteps || [];
      const models = slice.modelBreakdown || [];

      subTabSwitch.setProps({
        options: [
          { value: 'steps', label: `单步测速 (${steps.length}步)` },
          { value: 'models', label: `按模型汇总 (${slice.rangeLabel})` },
        ],
      });

      patchKeyedList(stepsTbody, steps, {
        keyFn: (st) => `${slice.cascadeId || 'conv'}-${st.stepIndex}`,
        sigFn: (st) =>
          `${st.stepIndex}:${st.modelShort}:${st.tokPerSec}:${st.ttftSec}:${st.contextTokens}:${st.outputTokens}:${st.cacheHitPct}:${st.costUsd}:${st.selectedSpeedReason}`,
        createRow: () => {
          const stepNumText = h('span');
          const compIcon = createSvgIcon('bolt', { size: 11, className: 'text-muted' });
          const tdStep = h('td', {}, [stepNumText, compIcon]);

          const tdModel = h('td');
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
              stepNumText,
              compIcon,
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
          patchText(refs.stepNumText, `#${Number(st.stepIndex)} `);
          patchAttr(refs.compIcon, 'hidden', !st.isCompactionStep);
          patchText(refs.tdModel, st.modelShort || '—');

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

      patchKeyedList(modelsTbody, models, {
        keyFn: (m) => m.label || m.shortName,
        sigFn: (m) =>
          `${m.shortName}:${m.calls}:${m.avgTokPerSec}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.speedSummary?.sampleCount}`,
        createRow: () => {
          const tdName = h('td', { style: 'font-weight: 600;' });
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
          patchText(refs.tdName, m.shortName || m.label);
          patchText(refs.tdCalls, String(Number(m.calls || 0)));
          patchText(refs.speedMain, formatMetric(m.avgTokPerSec, ' tok/s'));
          patchText(refs.speedSub, `有效 ${sampleSummary(m.speedSummary)}`);
          patchText(refs.tdTokens, formatTokens(m.totalTokens || 0));
          patchText(refs.tdCost, formatUsd(m.costUsd, { estimated: m.isEstimatedPrice, unpricedCalls: m.unpricedCalls }));
        },
      });

      stepsScroll.refresh();
      modelsScroll.refresh();
    }

    const unsubTelemetry = telemetryStore.subscribe(
      (st) => ({
        cascadeId: st.telemetry?.activeConversation?.cascadeId,
        recentSteps: st.telemetry?.activeConversation?.recentSteps,
        modelBreakdown: st.telemetry?.modelBreakdown,
        rangeLabel: st.telemetry?.consumption?.selectedRange?.label || '全部时间',
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

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'steps' && isDirty) {
          isDirty = false;
          if (latestSlice) {
            renderStepsData(latestSlice);
          }
        }
      }
    );

    onCleanup(() => {
      unsubUi();
      unsubTelemetry();
      unsubView();
      subTabSwitch.destroy();
      stepsScroll.destroy();
      modelsScroll.destroy();
    });

    return {
      el: rootEl,
      refs: { stepsTbody, modelsTbody, subTabSwitch, stepsScroll, modelsScroll },
    };
  },
});

// --- src/views/SettingsView.js ---
/**
 * @fileoverview View 4: SettingsView (系统设置视图).
 * Replaces all native form controls (<select>, <input type="number">) with
 * bespoke CustomSelect and CustomNumberInput components.
 */


const WEEKLY_MODE_OPTIONS = [
  { value: 'official', label: '官方云端周限额 (与 Models & Usage 同步)' },
  { value: 'custom_tokens', label: '按自定义每周 Token 预算计算百分比' },
  { value: 'custom_cost', label: '按自定义每周美元 ($) 预算计算百分比' },
];

const SettingsView = defineComponent({
  name: 'SettingsView',
  setup({ onCleanup }) {
    let draftMode = 'official';
    let draftTokens = 150000000;
    let draftCost = 100;

    const modeSelect = CustomSelect({
      modelValue: draftMode,
      icon: 'sliders',
      options: WEEKLY_MODE_OPTIONS,
      onUpdateModelValue: (val) => {
        draftMode = val;
      },
    });

    const tokenBudgetInput = CustomNumberInput({
      modelValue: draftTokens,
      min: 100000,
      max: 10000000000,
      step: 1000000,
      onUpdateModelValue: (val) => {
        draftTokens = val;
      },
    });

    const costBudgetInput = CustomNumberInput({
      modelValue: draftCost,
      min: 1,
      max: 100000,
      step: 5,
      onUpdateModelValue: (val) => {
        draftCost = val;
      },
    });

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    const saveBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-primary',
        onClick: async () => {
          patchText(saveStatusText, '正在异步保存...');
          await saveSettingsPatch({
            weeklyLimitMode: draftMode,
            weeklyTokenBudget: draftTokens,
            weeklyCostBudget: draftCost,
          });
          patchText(saveStatusText, '设置已生效');
          setTimeout(() => patchText(saveStatusText, ''), 1500);
        },
      },
      [createSvgIcon('check', { size: 13 }), h('span', { text: '保存参数设置' })]
    );

    const budgetPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '监控口径与周限额基准设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '每周进度条统计维度' }),
        modeSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周 Token 预算基准 (步进 1M)' }),
          tokenBudgetInput.el,
        ]),
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周费用预算基准 (USD $, 步进 $5)' }),
          costBudgetInput.el,
        ]),
      ]),
      h('div', { style: 'display: flex; justify-content: flex-end;' }, [saveBtn]),
    ]);

    const rootEl = h('div', { className: 'view-pane' }, [budgetPanel]);

    let latestSettings = null;
    let isDirty = false;

    function renderSettings(settings) {
      if (!settings) return;
      draftMode =
        settings.weeklyLimitMode === 'custom_tokens' ||
        settings.weeklyLimitMode === 'custom_cost'
          ? settings.weeklyLimitMode
          : 'official';
      draftTokens = Number(settings.weeklyTokenBudget || 150000000);
      draftCost = Number(settings.weeklyCostBudget || 100);
      modeSelect.setValue(draftMode);
      tokenBudgetInput.setValue(draftTokens);
      costBudgetInput.setValue(draftCost);
    }

    const unsub = telemetryStore.subscribe(
      (st) => st.telemetry?.settings,
      (settings) => {
        latestSettings = settings;
        if (uiStore.getState().activeView !== 'settings') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderSettings(settings);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings' && isDirty) {
          isDirty = false;
          if (latestSettings) {
            renderSettings(latestSettings);
          }
        }
      }
    );

    onCleanup(() => {
      unsub();
      unsubView();
      modeSelect.destroy();
      tokenBudgetInput.destroy();
      costBudgetInput.destroy();
    });

    return {
      el: rootEl,
      refs: { modeSelect, tokenBudgetInput, costBudgetInput },
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
        }
      }
    );

    const unsubStepCount = telemetryStore.subscribe(
      (st) => st.telemetry?.activeConversation?.stepCount ?? 0,
      (stepCount) => {
        topPillNav.setProps({
          items: VIEW_TABS.map((t) =>
            t.value === 'steps' ? { ...t, badge: stepCount > 0 ? stepCount : '' } : t
          ),
        });
      }
    );

    onCleanup(() => {
      unsubUi();
      unsubStepCount();
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

// --- src/main.js ---
/**
 * @fileoverview Async entry point for Antigravity Usage & Speed Monitor.
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

function init() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      bootstrapApp();
    });
  } else {
    bootstrapApp();
  }
}

init();
