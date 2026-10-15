/**
 * @fileoverview Fine-grained reactive store with async microtask batching
 * and structural slice comparison to prevent full-page re-renders.
 */

const pendingJobs = new Set();
let isFlushPending = false;

export function scheduleAsyncJob(job) {
  pendingJobs.add(job);
  if (!isFlushPending) {
    isFlushPending = true;
    queueMicrotask(flushAsyncJobs);
  }
}

export function flushAsyncJobs() {
  isFlushPending = false;
  const jobs = Array.from(pendingJobs);
  pendingJobs.clear();
  for (const job of jobs) {
    job();
  }
}

export function isShallowEqual(a, b) {
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

export function createReactiveStore(initialState) {
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
