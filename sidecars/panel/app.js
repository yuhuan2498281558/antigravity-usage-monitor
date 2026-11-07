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
    incomplete_or_invalid_timing: '生成未完成',
    invalid_output_tokens: '无有效输出',
    inconsistent_timing: '耗时数据异常',
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
  { value: 'consumption', label: '用量统计', icon: 'chart-bar' },
  { value: 'steps', label: '调用明细', icon: 'table' },
  { value: 'settings', label: '偏好设置', icon: 'sliders' },
]);

const uiStore = createReactiveStore({
  activeView: 'overview',
  stepsSubTab: 'steps', // 'steps' | 'models'
  selectedAgentScope: 'all', // 'all' | 'main' | <subagent cascadeId>
  ctxInspectorAgentId: 'auto', // 'auto' | 'main' | <subagent cascadeId>
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

  // 1. 比对系统设置项（模型显示策略、周预算模式与额度、插件自动更新开关）
  const pAct = prev.activeConversation;
  const nAct = next.activeConversation;
  if (prev.settings?.showUpstreamModel !== next.settings?.showUpstreamModel) return false;
  if (prev.settings?.weeklyLimitMode !== next.settings?.weeklyLimitMode) return false;
  if (prev.settings?.weeklyTokenBudget !== next.settings?.weeklyTokenBudget) return false;
  if (prev.settings?.weeklyCostBudget !== next.settings?.weeklyCostBudget) return false;
  if (prev.settings?.autoUpdatePlugin !== next.settings?.autoUpdatePlugin) return false;

  // 2. 比对云端状态（插件当前/最新版本、价格表版本与模型数量、同步/更新执行状态及错误信息）
  const pCloud = prev.cloudStatus;
  const nCloud = next.cloudStatus;
  if (
    pCloud?.currentPluginVersion !== nCloud?.currentPluginVersion ||
    pCloud?.latestPluginVersion !== nCloud?.latestPluginVersion ||
    pCloud?.updateAvailable !== nCloud?.updateAvailable ||
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

  // 3. 比对活跃会话的实时测速指标（会话 ID、步数、子代理拓扑、运行状态、TPS、TTFT、当前模型标识与单步费用）
  if (pAct?.cascadeId !== nAct?.cascadeId) return false;
  if (pAct?.stepCount !== nAct?.stepCount) return false;
  if (pAct?.subagentCount !== nAct?.subagentCount) return false;
  if (pAct?.totalStepsAllAgents !== nAct?.totalStepsAllAgents) return false;
  if (pAct?.isRunning !== nAct?.isRunning) return false;
  if (pAct?.aggregated?.isRunning !== nAct?.aggregated?.isRunning) return false;
  if (pAct?.aggregated?.activeAgentId !== nAct?.aggregated?.activeAgentId) return false;
  if (pAct?.aggregated?.activeAgentBadge !== nAct?.aggregated?.activeAgentBadge) return false;
  if (pAct?.aggregated?.latestTokPerSec !== nAct?.aggregated?.latestTokPerSec) return false;
  if (pAct?.aggregated?.latestTtftSec !== nAct?.aggregated?.latestTtftSec) return false;
  if (pAct?.aggregated?.avgTokPerSec !== nAct?.aggregated?.avgTokPerSec) return false;
  if (pAct?.aggregated?.latestStepCostUsd !== nAct?.aggregated?.latestStepCostUsd) return false;
  if (pAct?.aggregated?.sessionCostUsd !== nAct?.aggregated?.sessionCostUsd) return false;
  if (pAct?.aggregated?.activeModelShort !== nAct?.aggregated?.activeModelShort) return false;
  if (pAct?.latestTokPerSec !== nAct?.latestTokPerSec) return false;
  if (pAct?.latestTtftSec !== nAct?.latestTtftSec) return false;
  if (pAct?.activeModelShort !== nAct?.activeModelShort || pAct?.activeModelLabel !== nAct?.activeModelLabel) return false;
  if (pAct?.latestStepCostUsd !== nAct?.latestStepCostUsd || pAct?.sessionUnpricedCalls !== nAct?.sessionUnpricedCalls) return false;

  const pAgents = pAct?.agents || [];
  const nAgents = nAct?.agents || [];
  if (pAgents.length !== nAgents.length) return false;
  for (let i = 0; i < pAgents.length; i++) {
    const pa = pAgents[i];
    const na = nAgents[i];
    const pLastStep = pa?.recentSteps?.[0];
    const nLastStep = na?.recentSteps?.[0];
    if (
      pa?.agentId !== na?.agentId ||
      pa?.role !== na?.role ||
      pa?.stepCount !== na?.stepCount ||
      pa?.isRunning !== na?.isRunning ||
      pa?.latestTokPerSec !== na?.latestTokPerSec ||
      pa?.latestTtftSec !== na?.latestTtftSec ||
      pa?.avgTokPerSec !== na?.avgTokPerSec ||
      pa?.latestStepCostUsd !== na?.latestStepCostUsd ||
      pa?.sessionCostUsd !== na?.sessionCostUsd ||
      pa?.activeModelShort !== na?.activeModelShort ||
      pa?.context?.totalTokens !== na?.context?.totalTokens ||
      pa?.context?.messagesTokens !== na?.context?.messagesTokens ||
      pa?.context?.toolResultsTokens !== na?.context?.toolResultsTokens ||
      pa?.context?.assistantTokens !== na?.context?.assistantTokens ||
      pLastStep?.tokPerSec !== nLastStep?.tokPerSec ||
      pLastStep?.ttftSec !== nLastStep?.ttftSec ||
      pLastStep?.outputTokens !== nLastStep?.outputTokens ||
      pLastStep?.modelUpstream !== nLastStep?.modelUpstream ||
      pLastStep?.costUsd !== nLastStep?.costUsd
    ) {
      return false;
    }
  }

  // 4. 比对 6 通道上下文窗口构成（总 Token 与消息/系统工具/MCP/Skill/系统提示词/用户规则）及近期步骤明细
  const pCtx = pAct?.context;
  const nCtx = nAct?.context;
  if (pCtx?.totalTokens !== nCtx?.totalTokens) return false;
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
    if (before.modelKey !== after.modelKey || before.modelShort !== after.modelShort ||
        before.modelUpstream !== after.modelUpstream || before.responseModel !== after.responseModel ||
        before.modelSource !== after.modelSource || before.costUsd !== after.costUsd) return false;
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
  if (pAcct?.calls !== nAcct?.calls) return false;
  if (pAcct?.costUsd !== nAcct?.costUsd) return false;
  if (pAcct?.unpricedCalls !== nAcct?.unpricedCalls) return false;

  // 6. 比对历史趋势时间分桶序列
  const pTrend = prev.consumption?.trendSeries || [];
  const nTrend = next.consumption?.trendSeries || [];
  if (pTrend.length !== nTrend.length) return false;
  for (let i = 0; i < pTrend.length; i++) {
    if (pTrend[i]?.tokens !== nTrend[i]?.tokens || pTrend[i]?.label !== nTrend[i]?.label) {
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
  if (prev.account?.tierName !== next.account?.tierName || prev.account?.planName !== next.account?.planName) {
    return false;
  }

  const pQuot = prev.quotas?.activePool;
  const nQuot = next.quotas?.activePool;
  if (pQuot?.family !== nQuot?.family) return false;
  if (pQuot?.usedPct !== nQuot?.usedPct) return false;
  if (pQuot?.remainingPct !== nQuot?.remainingPct) return false;
  if (pQuot?.weeklyUsedPct !== nQuot?.weeklyUsedPct) return false;
  if (prev.quotas?.weekly?.usedPct !== next.quotas?.weekly?.usedPct) return false;
  if (prev.quotas?.weekly?.remainingPct !== next.quotas?.weekly?.remainingPct) return false;

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
      pConvs[i]?.stepCount !== nConvs[i]?.stepCount ||
      pConvs[i]?.subagentCount !== nConvs[i]?.subagentCount ||
      pConvs[i]?.totalStepCount !== nConvs[i]?.totalStepCount
    ) {
      return false;
    }
  }

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

async function triggerCloudSync() {
  const res = await callSidecarApi('/api/cloud-sync', { method: 'POST', body: {} });
  await fetchTelemetry({ force: true });
  return res;
}

async function triggerPluginUpdate() {
  const res = await callSidecarApi('/api/plugin-update', { method: 'POST', body: {} });
  if (res?.ok && res?.restarting) {
    await new Promise((r) => setTimeout(r, 1100));
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
      return res;
    }
  }
  await fetchTelemetry({ force: true });
  return res;
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
      const { options = [], modelValue, placeholder = '请选择', icon } = getProps();
      patchAttr(leadIcon, 'hidden', !icon);
      if (icon) {
        patchSvgIcon(leadIcon, icon);
      }
      const selectedOpt =
        options.find((o) => o.value === modelValue) ||
        (modelValue !== '' && modelValue !== null && modelValue !== undefined
          ? options[0]
          : undefined);
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
 * @fileoverview 纯 SVG 三次贝塞尔平滑曲线趋势图组件 (TrendAreaChart).
 * 负责将按时间分桶的 Token 消耗序列渲染为带垂直渐变填充、虚线参考网格、
 * 峰值描点与自适应防溢出的顶部峰值胶囊标签的面积图。
 */


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
function createTrendAreaChart() {
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

    // --- 方案 A：顶栏二级主/子代理切换条 (.agent-scope-bar，无子代理时自动隐藏) ---
    const scopeAllBtnText = h('span', { text: '全部汇总' });
    const scopeAllBtn = h(
      'button',
      {
        type: 'button',
        className: 'scope-pill-btn is-active',
        onClick: () =>
          uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' }),
      },
      [scopeAllBtnText]
    );

    const scopeMainBtnText = h('span', { text: '主代理' });
    const scopeMainBtn = h(
      'button',
      {
        type: 'button',
        className: 'scope-pill-btn',
        onClick: () => uiStore.setState({ selectedAgentScope: 'main' }),
      },
      [scopeMainBtnText]
    );

    const subagentSelect = CustomSelect({
      modelValue: '',
      icon: 'cpu',
      placeholder: '子代理 (0)',
      className: 'scope-subagent-select',
      options: [],
      onUpdateModelValue: (nextSubId) => {
        if (nextSubId) {
          uiStore.setState({ selectedAgentScope: nextSubId });
        }
      },
    });

    const scopeRightText = h('span', { className: 'agent-scope-right text-mono', text: '' });

    const scopeBarEl = h(
      'div',
      { className: 'agent-scope-bar', hidden: true },
      [
        h('div', { className: 'agent-scope-left' }, [
          scopeAllBtn,
          scopeMainBtn,
          subagentSelect.el,
        ]),
        scopeRightText,
      ]
    );

    const headerEl = h('header', { className: 'top-session-stack' }, [headerRowEl, scopeBarEl]);

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

      const convs = telemetry?.conversations || [];
      const latestTitle = convs[0]?.title ? `最新 (${convs[0].title})` : '跟随最新会话';
      const options = [
        { value: '', label: latestTitle, meta: convs[0] ? formatConvOptionMeta(convs[0]) : '' },
        ...convs.map((c) => ({
          value: c.cascadeId,
          label: c.title || c.cascadeId.slice(0, 8),
          meta: formatConvOptionMeta(c),
        })),
      ];
      convSelect.setProps({
        modelValue: telSt.selectedConversationId,
        options,
      });

      const {
        hasSubagents,
        effectiveScope,
        subagents,
        mainAgent,
        aggregated,
        scopedConv,
      } = resolveScopedConversation(telemetry, uiSt.selectedAgentScope, uiSt.ctxInspectorAgentId);

      patchAttr(scopeBarEl, 'hidden', !hasSubagents);
      if (hasSubagents) {
        patchText(scopeAllBtnText, `全部 (${aggregated?.stepCount ?? 0})`);
        patchClasses(scopeAllBtn, { 'is-active': effectiveScope === 'all' });

        patchText(scopeMainBtnText, `主代理 (${mainAgent?.stepCount ?? 0})`);
        patchClasses(scopeMainBtn, { 'is-active': effectiveScope === 'main' });

        const isSubSelected = effectiveScope !== 'all' && effectiveScope !== 'main';
        patchClasses(subagentSelect.el, { 'is-active-sub': isSubSelected });
        const subOptions = subagents.map((s) => ({
          value: s.agentId,
          label: formatAgentLabel(s),
          meta: `${s.stepCount || 0}步 · 窗${s.context?.usedPct ?? 0}%`,
        }));
        subagentSelect.setProps({
          modelValue: isSubSelected ? effectiveScope : '',
          placeholder: `子代理 (${subagents.length})`,
          options: subOptions,
        });

        patchText(
          scopeRightText,
          formatUsd(scopedConv?.sessionCostUsd || 0, {
            unpricedCalls: scopedConv?.sessionUnpricedCalls,
          })
        );
      } else {
        subagentSelect.close();
      }

      const cloudStatus = telemetry?.cloudStatus;
      const hasUpdate = Boolean(cloudStatus?.updateAvailable);
      patchAttr(updateBtn, 'hidden', !hasUpdate);
      if (hasUpdate && !isHeaderUpdating) {
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
        syncState: st.syncState,
        telemetry: st.telemetry,
      }),
      () => renderHeaderState()
    );

    const unsubUi = uiStore.subscribe(
      (st) => st.selectedAgentScope,
      () => renderHeaderState()
    );

    onCleanup(() => {
      unsubTelemetry();
      unsubUi();
      convSelect.destroy();
      subagentSelect.destroy();
    });

    return {
      el: headerEl,
      refs: { convSelect, subagentSelect, statusTag, refreshBtn, scopeBarEl },
    };
  },
});

// --- src/views/LiveOverviewView.js ---
/**
 * @fileoverview View 1: LiveOverviewView (实时监控视图).
 * 负责展示当前活跃会话的核心实时遥测指标：
 * 1. 4 格实时测速矩阵：实时吞吐 (TPS)、首 Token 延迟 (TTFT)、会话有效加权均速与本步费用/缓存命中率；
 * 2. 6 通道上下文窗口构成：自动锚定当前模型的上下文压缩基线 (`compactionLimitTokens`)，
 *    通过 6 段进度条与双列图例展示消息、系统工具、MCP 工具、Skill、系统提示词与用户规则的 Token 占用；
 * 3. 动态多配额池监控卡片：支持 Gemini、Pro 订阅专属独立 Argon 周配额池、Claude & GPT 等动态配额池，
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

const LiveOverviewView = defineComponent({
  name: 'LiveOverviewView',
  setup({ onCleanup }) {
    // --- 1. 4 格实时测速矩阵 (实时吞吐 / 首Token / 会话均速 / 本步消费) ---
    const tpsVal = h('strong', { className: 'cell-value accent-speed', text: '—' });
    const tpsSub = h('span', { className: 'cell-sub', text: '模型未知' });
    const pulseDot = createSvgIcon('dot', { size: 10 });

    const ttftVal = h('strong', { className: 'cell-value', text: '—' });
    const ttftSub = h('span', { className: 'cell-sub', text: '均值 —' });

    const avgVal = h('strong', { className: 'cell-value', text: '—' });
    const avgSub = h('span', { className: 'cell-sub', text: '有效样本 0/0 步' });

    const costVal = h('strong', { className: 'cell-value', text: '$0.000' });
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

    const ctxChannels = [
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
    ].map((ch, idx) => {
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
      [matrixEl, ctxPanel, quotaPanel]
    );
    const viewScrollbar = CustomScrollbar({
      contentEl: overviewInner,
      className: 'view-pane',
    });

    /**
     * 同步单个配额池行的 5h 与每周窗口状态：
     * - 对于仅有周限额的独立配额池（例如 Google AI Pro 账号下的 Argon 池或 Plus 档位）自动隐藏 5h 行；
     * - 对于仅有 5h 限额的配额池自动隐藏每周行；
     * - 若两个窗口均无数据（如首次拉取失败），则同时保留两行并显示“获取失败 (--%)”占位提示。
     */
    function syncPoolQuotaRow(refs, item, idx, rowEl) {
      const { poolData, poolLabel, fallbackWeekly, isActivePool } = item;
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

      const wkUsedRaw =
        poolData?.weeklyUsedPct ?? (isActivePool ? fallbackWeekly?.usedPct : null);
      const wkRemRaw =
        poolData?.weeklyRemainingPct ?? (isActivePool ? fallbackWeekly?.remainingPct : null);
      const wkResetRaw =
        poolData?.weeklyResetTime || (isActivePool ? fallbackWeekly?.resetTime : null);
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

      patchText(refs.title5h, `5h 限额 (${poolLabel})`);
      patchText(
        refs.meta5h,
        has5h
          ? `${formatCountdown(poolData.resetTime)} · 已用 ${used5hVal.toFixed(1)}% (余 ${rem5hVal.toFixed(1)}%)`
          : '获取失败 (--%)'
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
          : '获取失败 (--%)'
      );
      patchStyleVar(refs.fillWk, '--fill-w', `${Math.min(100, usedWkVal)}%`);
      patchClasses(refs.fillWk, {
        'tone-warn': usedWkVal >= 60 && usedWkVal < 85,
        'tone-danger': usedWkVal >= 85,
      });
    }

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
        effectiveScope,
        effectiveCtxScope,
        agents,
        aggregated,
        scopedConv,
        ctxAgent,
      } = resolveScopedConversation(data, uiSt.selectedAgentScope, uiSt.ctxInspectorAgentId);

      const active = scopedConv || data.activeConversation || {};
      const ctx = ctxAgent?.context || active.context || {};
      const quotas = data.quotas || {};

      // 1. 更新 4 格实时测速矩阵（根据当前代理作用域动态展示全部汇总或单代理指标）
      patchClasses(pulseDot, { 'is-pulsing': Boolean(active.isRunning) });
      patchText(tpsVal, formatMetric(active.latestTokPerSec, ' tok/s'));
      const reason = speedReasonText(active.latestSpeedReason);
      const modelAndAgent =
        hasSubagents && effectiveScope === 'all' && active.activeAgentBadge
          ? `[${active.activeAgentBadge}] ${active.activeModelShort || '模型未知'}`
          : active.activeModelShort || '模型未知';
      patchText(tpsSub, reason ? `${modelAndAgent} · ${reason}` : modelAndAgent);

      patchText(ttftVal, formatMetric(active.latestTtftSec, 's'));
      patchText(ttftSub, `均值 ${formatMetric(active.ttftSummary?.avgSec, 's')}`);

      patchText(avgVal, formatMetric(active.avgTokPerSec, ' tok/s'));
      patchText(avgSub, `有效 ${sampleSummary(active.speedSummary)}`);

      const stepCost = active.latestStepCostUsd;
      patchText(costVal, formatUsd(stepCost, { precise: true }));
      patchText(
        cacheSub,
        `缓存 ${active.latestCacheHitPct ?? 0}% · 累计 ${formatUsd(active.sessionCostUsd || 0, { unpricedCalls: active.sessionUnpricedCalls })}`
      );

      // 2. 更新 6 段上下文窗口构成与方案 B 内嵌上下文窗口检视胶囊条
      patchAttr(ctxAgentBadge, 'hidden', !hasSubagents);
      patchAttr(ctxInspectorBar, 'hidden', !hasSubagents);
      if (hasSubagents && ctxAgent) {
        const badgeCls = getAgentBadgeClass(ctxAgent.index || 0, Boolean(ctxAgent.isMain));
        patchAttr(ctxAgentBadge, 'class', `agent-badge ${badgeCls}`);
        const badgeFullText = formatAgentLabel(ctxAgent);
        patchText(ctxAgentBadge, badgeFullText);
        patchAttr(ctxAgentBadge, 'title', badgeFullText);

        const pillItems = [];
        if (effectiveScope === 'all') {
          pillItems.push({
            key: 'auto',
            label: `跟随活跃 (${aggregated?.activeAgentBadge || '主'})`,
            title: '自动展示当前正在运行或最新活跃的代理上下文窗口',
            isActive: effectiveCtxScope === 'auto',
            mode: 'ctx-only',
          });
        } else {
          pillItems.push({
            key: 'all',
            label: `全部汇总 (${aggregated?.stepCount ?? 0}步)`,
            title: '切回全部代理汇总视图',
            isActive: false,
            mode: 'scope',
          });
        }

        const allAgentPills = agents.map((ag) => {
          const agPct = ag.context?.usedPct ?? 0;
          const isAct =
            effectiveScope === 'all'
              ? effectiveCtxScope === ag.agentId
              : effectiveScope === ag.agentId;
          return {
            key: ag.agentId,
            label: `${ag.badgeText || ag.shortLabel} ${agPct}%`,
            title: `${formatAgentLabel(ag)} (${ag.activeModelShort || '模型未知'} · ${ag.stepCount || 0}步)`,
            isActive: isAct,
            mode: effectiveScope === 'all' ? 'ctx-only' : 'scope',
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
              } else if (item.mode === 'ctx-only') {
                uiStore.setState({ ctxInspectorAgentId: item.key });
              } else if (item.key === 'all') {
                uiStore.setState({ selectedAgentScope: 'all', ctxInspectorAgentId: 'auto' });
              } else {
                uiStore.setState({ selectedAgentScope: item.key });
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
      const activePool = quotas.activePool || {};
      const rawPools = Array.isArray(quotas.pools) && quotas.pools.length > 0
        ? quotas.pools
        : [
            { poolKey: 'Gemini', poolLabel: 'Gemini', family: 'Gemini' },
            { poolKey: 'Claude & GPT', poolLabel: 'Claude & GPT', family: 'Claude & GPT' },
          ];
      const weekly = quotas.weekly || {};
      const minuteTick = Math.floor(Date.now() / 30000);
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
        };
      });

      patchKeyedList(poolsListEl, poolItems, {
        keyFn: (item) => item.key,
        sigFn: (item, idx) =>
          `${idx}:${item.poolLabel}:${item.isActivePool}:${item.minuteTick}:${item.poolData?.usedPct}:${item.poolData?.remainingPct}:${item.poolData?.resetTime}:${item.poolData?.weeklyUsedPct}:${item.poolData?.weeklyRemainingPct}:${item.poolData?.weeklyResetTime}:${item.fallbackWeekly?.isOfficial}:${item.fallbackWeekly?.usedPct}:${item.fallbackWeekly?.title}`,
        createRow: createPoolQuotaRow,
        updateRow: syncPoolQuotaRow,
      });

      patchText(
        wkFootLeft,
        `本周累计: ${formatTokens(weekly.tokens || 0)} (${formatUsd(weekly.costUsd || 0, { unpricedCalls: weekly.unpricedCalls })})`
      );
      patchText(
        wkFootRight,
        data.account?.aiCredits > 0
          ? `AI 积分: ${data.account.aiCredits}`
          : `本周调用: ${weekly.calls || 0} 次`
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

    let prevScope = uiStore.getState().selectedAgentScope;
    let prevCtxTarget = uiStore.getState().ctxInspectorAgentId;

    const unsubView = uiStore.subscribe(
      (st) => ({
        activeView: st.activeView,
        selectedAgentScope: st.selectedAgentScope,
        ctxInspectorAgentId: st.ctxInspectorAgentId,
      }),
      (slice) => {
        const scopeChanged =
          slice.selectedAgentScope !== prevScope || slice.ctxInspectorAgentId !== prevCtxTarget;
        prevScope = slice.selectedAgentScope;
        prevCtxTarget = slice.ctxInspectorAgentId;

        if (slice.activeView !== 'overview') {
          if (scopeChanged) isDirty = true;
          return;
        }
        if ((isDirty || scopeChanged) && latestData) {
          isDirty = false;
          renderData(latestData);
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
 * 1. 用量概览：支持预设时间段与自定义区间筛选，通过 3+2 组合矩阵展示总 Token/调用次数、
 *    USD/CNY 预估费用、缓存命中率与命中量、输入/输出细分占比，以及底部 4 段比例条 (`FourSegmentBar`)。
 * 2. 历史趋势：基于 `TrendAreaChart` 渲染纯 SVG 三次贝塞尔平滑曲线面积图、峰值气泡与首/中/末三时间锚点。
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

    // --- Section 1: 用量概览矩阵 (上层 3 列核心总量 + 下层 2 列输入/输出拆分 + 底部 4 段比例条) ---
    const dateSpanBadge = h('span', { className: 'cons-badge text-mono', text: '-- ~ --' });
    const heroTotalTokens = h('strong', { className: 'cons-hero-num text-mono', text: '0' });
    const heroTotalCalls = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '0 次' });
    const heroCostUsd = h('strong', { className: 'cons-hero-cost text-mono', text: '$0.00' });
    const heroCostCny = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '≈ ¥0' });

    const cacheHitPctEl = h('strong', { className: 'cons-hero-cache text-mono', text: '0%' });
    const cacheTokensEl = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '命中 0' });

    const inputSharePct = h('span', { className: 'text-mono', style: 'color: var(--ctx-input); font-weight: 600; font-size: 11.5px;', text: '0%' });
    const inputMainTokens = h('strong', { className: 'cons-mid-num text-mono', text: '0' });
    const inputSubText = h('span', { className: 'text-muted text-mono', style: 'font-size: 11px;', text: '新输入 0 · 缓存 0' });

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

    // --- Section 2: 历史趋势 (SVG 三次贝塞尔平滑曲线图 + 首/中/末三时间锚点) ---
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
        h('span', { className: 'panel-title', text: '用量趋势' }),
        trendRangeBadge,
      ]),
      trendChart.el,
      h('div', { className: 'trend-anchors' }, [
        h('div', { className: 'trend-anchor-col' }, [anchorStartTime, anchorStartVal]),
        h('div', { className: 'trend-anchor-col is-center' }, [anchorMidTime, anchorMidVal]),
        h('div', { className: 'trend-anchor-col is-end' }, [anchorEndTime, anchorEndVal]),
      ]),
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

    /**
     * 将遥测状态切片同步渲染至消费统计视图的 5 个子面板。
     */
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

      // 1. 同步用量概览矩阵与顶部 4 段比例条
      patchText(dateSpanBadge, formatDateSpanBadge(rangeInfo.startMs, rangeInfo.endMs));
      const totalTokens = Number(acct.totalTokens || 0);
      const inputTokens = Number(acct.inputTokens || 0);
      const cacheTokens = Number(acct.cacheReadTokens || 0);
      const outputTokens = Number(acct.outputTokens || 0);
      const responseTokens = Number(acct.responseTokens || 0);
      const thinkingTokens = Number(acct.thinkingTokens || 0);
      const costUsd = Number(acct.costUsd || 0);

      patchText(heroTotalTokens, formatTokensPrecise(totalTokens));
      patchText(heroTotalCalls, `${acct.calls || 0} 次`);
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
        `新输入 ${formatTokensPrecise(inputTokens)} · 缓存 ${formatTokensPrecise(cacheTokens)}`
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

      // 2. 同步历史趋势 SVG 面积图与首/中/末三时间锚点
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

      // 3. 同步热门模型列表（按总 Token 数降序排列并执行键值增量对账）
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
        h('div', { className: 'panel-header' }, [
          h('span', { className: 'panel-title' }, [
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
        hasSubagents && Array.isArray(scopedConv?.modelBreakdown)
          ? scopedConv.modelBreakdown
          : slice.modelBreakdown || [];
      const showUpstream = Boolean(slice.showUpstreamModel);
      const modelsTabBadge = hasSubagents
        ? effectiveScope === 'all'
          ? '本会话汇总'
          : scopedConv?.shortLabel || '当前代理'
        : slice.rangeLabel;

      subTabSwitch.setProps({
        options: [
          { value: 'steps', label: `按步查看 (${steps.length})` },
          { value: 'models', label: `按模型汇总 (${modelsTabBadge})` },
        ],
      });

      // 1. 单步测速表增量对账：以 `<agentCascadeId>-<stepIndex>` 为稳定行键，仅在签名变化时刷新单元格
      patchKeyedList(stepsTbody, steps, {
        keyFn: (st) => `${st.agentCascadeId || slice.cascadeId || 'conv'}-${st.stepIndex}`,
        sigFn: (st) =>
          `${hasSubagents}:${effectiveScope}:${st.agentId || 'main'}:${st.stepIndex}:${showUpstream ? st.modelUpstream || st.responseModel || st.modelShort : st.modelShort}:${st.tokPerSec}:${st.ttftSec}:${st.contextTokens}:${st.outputTokens}:${st.cacheHitPct}:${st.costUsd}:${st.selectedSpeedReason}`,
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
          const modelText =
            (showUpstream ? st.modelUpstream || st.responseModel : st.modelShort) ||
            st.modelShort ||
            '—';
          patchText(refs.tdModel, modelText);
          patchAttr(refs.tdModel, 'title', modelText);

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
        sigFn: (m) =>
          `${showUpstream ? m.upstreamName || m.shortName : m.shortName}:${m.calls}:${m.avgTokPerSec}:${m.totalTokens}:${m.costUsd}:${m.unpricedCalls}:${m.speedSummary?.sampleCount}`,
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
          const nameText = showUpstream
            ? m.upstreamName || m.shortName || m.label
            : m.shortName || m.label;
          patchText(refs.tdName, nameText);
          const fullUpstreamTitle =
            showUpstream && Array.isArray(m.upstreamModels) && m.upstreamModels.length > 1
              ? m.upstreamModels.join(' / ')
              : nameText;
          patchAttr(refs.tdName, 'title', fullUpstreamTitle);
          patchText(refs.tdCalls, String(Number(m.calls || 0)));
          patchText(refs.speedMain, formatMetric(m.avgTokPerSec, ' tok/s'));
          patchText(refs.speedSub, `有效 ${sampleSummary(m.speedSummary)}`);
          patchText(refs.tdTokens, formatTokens(m.totalTokens || 0));
          patchText(refs.tdCost, formatUsd(m.costUsd, { estimated: m.isEstimatedPrice, unpricedCalls: m.unpricedCalls }));
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
        modelBreakdown: st.telemetry?.modelBreakdown,
        rangeLabel: st.telemetry?.consumption?.selectedRange?.label || '全部时间',
        showUpstreamModel: Boolean(st.telemetry?.settings?.showUpstreamModel),
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
 * 采用定制的 `CustomSelect` 与 `CustomNumberInput` 替代所有原生表单控件，分为两个设置面板：
 * 1. 本地配额监控与预算表单：配置模型名称显示方式（内部代号/实际模型名）、周用量计算模式及自定义 Token/USD 预算；
 * 2. 云端价格同步与插件更新面板：配置插件自动更新策略、手动同步云端模型价格表，以及检查并执行 Git/ZIP 双模式插件升级。
 */


/** 每周配额计算模式可选项 */
const WEEKLY_MODE_OPTIONS = [
  { value: 'official', label: '跟随官方额度' },
  { value: 'custom_tokens', label: '自定义 Token 上限' },
  { value: 'custom_cost', label: '自定义费用上限 (USD)' },
];

/** 步骤明细表中的模型名称显示方式可选项 */
const STEP_MODEL_DISPLAY_OPTIONS = [
  { value: 'short', label: '精简代号 (如 argon-4-high)' },
  { value: 'upstream', label: '原始模型 ID (如 gemini-3.8-flash-n)' },
];

/** 插件版本更新策略可选项 */
const AUTO_UPDATE_OPTIONS = [
  { value: 'manual', label: '仅提示新版本，手动更新 (推荐)' },
  { value: 'auto', label: '后台自动安装新版本' },
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
    // --- 面板 1：本地配额监控与预算表单状态与控件 ---
    let draftMode = 'official';
    let draftTokens = 150000000;
    let draftCost = 100;
    let draftShowUpstreamModel = false;
    let draftAutoUpdatePlugin = false;
    let statusTimer = null;
    let cloudTimer = null;
    let lastSyncedSettingsSig = '';

    const saveStatusText = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });
    const cloudStatusMsg = h('span', { className: 'text-muted', style: 'font-size: 11px;', text: '' });

    /** 在本地预算面板右上角展示短暂的保存状态提示 */
    function showSaveFeedback(text) {
      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }
      patchText(saveStatusText, text);
      if (text === '已保存') {
        statusTimer = setTimeout(() => {
          statusTimer = null;
          patchText(saveStatusText, '');
        }, 1500);
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

    const modeSelect = CustomSelect({
      modelValue: draftMode,
      icon: 'sliders',
      options: WEEKLY_MODE_OPTIONS,
      onUpdateModelValue: (val) => {
        draftMode = val;
      },
    });

    // 模型名显示方式切换后立即持久化并刷新遥测数据
    const stepModelSelect = CustomSelect({
      modelValue: 'short',
      icon: 'table',
      options: STEP_MODEL_DISPLAY_OPTIONS,
      onUpdateModelValue: async (val) => {
        draftShowUpstreamModel = val === 'upstream';
        if (latestSettings) {
          lastSyncedSettingsSig = settingsSig({
            ...latestSettings,
            showUpstreamModel: draftShowUpstreamModel,
          });
        }
        showSaveFeedback('保存中…');
        await saveSettingsPatch({
          showUpstreamModel: draftShowUpstreamModel,
        });
        showSaveFeedback('已保存');
      },
    });

    // 插件自动更新策略切换后立即保存至后端
    const autoUpdateSelect = CustomSelect({
      modelValue: 'manual',
      icon: 'refresh',
      options: AUTO_UPDATE_OPTIONS,
      onUpdateModelValue: async (val) => {
        draftAutoUpdatePlugin = val === 'auto';
        if (latestSettings) {
          lastSyncedSettingsSig = settingsSig({
            ...latestSettings,
            autoUpdatePlugin: draftAutoUpdatePlugin,
          });
        }
        showCloudFeedback('保存中…', 0);
        await saveSettingsPatch({
          autoUpdatePlugin: draftAutoUpdatePlugin,
        });
        showCloudFeedback('已保存', 1800);
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

    const saveBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn-primary',
        onClick: async () => {
          showSaveFeedback('保存中…');
          await saveSettingsPatch({
            weeklyLimitMode: draftMode,
            weeklyTokenBudget: draftTokens,
            weeklyCostBudget: draftCost,
            showUpstreamModel: draftShowUpstreamModel,
            autoUpdatePlugin: draftAutoUpdatePlugin,
          });
          showSaveFeedback('已保存');
        },
      },
      [createSvgIcon('check', { size: 13 }), h('span', { text: '保存设置' })]
    );

    const budgetPanel = h('section', { className: 'panel' }, [
      h('div', { className: 'panel-header' }, [
        h('span', { className: 'panel-title' }, [
          createSvgIcon('sliders', { size: 13 }),
          h('span', { text: '常规设置' }),
        ]),
        saveStatusText,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '模型名称格式' }),
        stepModelSelect.el,
      ]),
      h('div', { className: 'form-row' }, [
        h('span', { className: 'form-label', text: '周额度基准' }),
        modeSelect.el,
      ]),
      h('div', { className: 'dual-grid' }, [
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周 Token 上限' }),
          tokenBudgetInput.el,
        ]),
        h('div', { className: 'form-row' }, [
          h('span', { className: 'form-label', text: '每周费用上限 ($)' }),
          costBudgetInput.el,
        ]),
      ]),
      h('div', { style: 'display: flex; justify-content: flex-end;' }, [saveBtn]),
    ]);

    // --- 面板 2：版本更新面板 ---
    const pricingCountVal = h('strong', { className: 'cell-value', text: '—' });
    const pricingSyncSub = h('span', { className: 'cell-sub', text: '读取中…' });
    const versionVal = h('strong', { className: 'cell-value', text: 'v1.4.1' });
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
                const curVer = cs?.currentPluginVersion || '1.4.1';
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
        h('span', { className: 'form-label', text: '自动更新' }),
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

    const rootEl = h('div', { className: 'view-pane' }, [budgetPanel, cloudPanel]);

    let latestSettings = null;
    let latestCloudStatus = null;
    let isDirty = false;

    /** 生成设置项签名，避免轮询返回相同配置时覆盖用户正在编辑的草稿值 */
    function settingsSig(s) {
      if (!s) return '';
      return `${s.weeklyLimitMode}:${s.weeklyTokenBudget}:${s.weeklyCostBudget}:${Boolean(s.showUpstreamModel)}:${Boolean(s.autoUpdatePlugin)}`;
    }

    /** 将后端返回的最新设置同步至表单控件 */
    function renderSettings(settings) {
      if (!settings) return;
      const nextSig = settingsSig(settings);
      if (nextSig === lastSyncedSettingsSig) return;
      lastSyncedSettingsSig = nextSig;
      draftMode =
        settings.weeklyLimitMode === 'custom_tokens' ||
        settings.weeklyLimitMode === 'custom_cost'
          ? settings.weeklyLimitMode
          : 'official';
      draftTokens = Number(settings.weeklyTokenBudget || 150000000);
      draftCost = Number(settings.weeklyCostBudget || 100);
      draftShowUpstreamModel = Boolean(settings.showUpstreamModel);
      draftAutoUpdatePlugin = Boolean(settings.autoUpdatePlugin);
      modeSelect.setValue(draftMode);
      stepModelSelect.setValue(draftShowUpstreamModel ? 'upstream' : 'short');
      autoUpdateSelect.setValue(draftAutoUpdatePlugin ? 'auto' : 'manual');
      tokenBudgetInput.setValue(draftTokens);
      costBudgetInput.setValue(draftCost);
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

      const curVer = cs.currentPluginVersion || '1.4.1';
      const latVer = cs.latestPluginVersion || curVer;
      const modeTag = cs.installMode === 'git' ? 'Git' : 'ZIP';
      patchText(versionVal, `v${curVer}`);
      if (cs.updateAvailable) {
        patchText(versionSub, `可升级至 v${latVer} (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': true });
        patchText(updatePluginBtnText, `升级至 v${latVer}`);
        patchClasses(updatePluginBtn, { 'btn-primary': true, 'btn-secondary': false });
      } else {
        patchText(versionSub, `已是最新 (${modeTag})`);
        patchClasses(versionSub, { 'accent-ok': false });
        patchText(updatePluginBtnText, '检查更新');
        patchClasses(updatePluginBtn, { 'btn-primary': false, 'btn-secondary': true });
      }

      if (!cloudTimer && (cs.lastUpdateError || (cs.lastUpdateResult?.ok === false && cs.lastUpdateResult?.message))) {
        showCloudFeedback(cs.lastUpdateError || cs.lastUpdateResult.message, 5500);
      }
    }

    const unsub = telemetryStore.subscribe(
      (st) => ({
        settings: st.telemetry?.settings,
        cloudStatus: st.telemetry?.cloudStatus,
      }),
      (slice) => {
        latestSettings = slice.settings;
        latestCloudStatus = slice.cloudStatus;
        if (uiStore.getState().activeView !== 'settings') {
          isDirty = true;
          return;
        }
        isDirty = false;
        renderSettings(slice.settings);
        renderCloudStatus(slice.cloudStatus);
      }
    );

    const unsubView = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        if (activeView === 'settings' && isDirty) {
          isDirty = false;
          if (latestSettings) renderSettings(latestSettings);
          if (latestCloudStatus) renderCloudStatus(latestCloudStatus);
        }
      }
    );

    onCleanup(() => {
      if (statusTimer) clearTimeout(statusTimer);
      if (cloudTimer) clearTimeout(cloudTimer);
      unsub();
      unsubView();
      modeSelect.destroy();
      stepModelSelect.destroy();
      autoUpdateSelect.destroy();
      tokenBudgetInput.destroy();
      costBudgetInput.destroy();
    });

    return {
      el: rootEl,
      refs: { modeSelect, stepModelSelect, autoUpdateSelect, tokenBudgetInput, costBudgetInput },
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

    function syncStepsBadge() {
      const { scopedConv } = resolveScopedConversation(
        telemetryStore.getState().telemetry,
        uiStore.getState().selectedAgentScope,
        uiStore.getState().ctxInspectorAgentId
      );
      const stepCount = scopedConv?.stepCount ?? 0;
      topPillNav.setProps({
        items: VIEW_TABS.map((t) =>
          t.value === 'steps' ? { ...t, badge: stepCount > 0 ? stepCount : '' } : t
        ),
      });
    }

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
