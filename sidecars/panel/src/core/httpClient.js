/**
 * @fileoverview Async HTTP client with AbortController cancellation for stale
 * polling requests and concurrent GET deduplication.
 */

const inFlightGets = new Map();
const activeControllers = new Map();

export async function callSidecarApi(path, { method = 'GET', body, abortKey = '' } = {}) {
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
