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
export function getWindowBridgeConfig() {
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
export function isWindowOverlayMode() {
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
export function deliverCdpBridgeResponses(responses) {
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

export async function callSidecarApi(path, { method = 'GET', body, abortKey = '' } = {}) {
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
