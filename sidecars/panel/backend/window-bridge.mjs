/**
 * @fileoverview 双栖模式（Window Overlay）本地回环桥接服务与 CDP 多窗口自动挂载调度器。
 *
 * 职责边界：
 * 1. 在 Sidecar 进程内维护仅绑定 `127.0.0.1` 随机端口的受保护 HTTP 桥接端点，
 *    通过一次性 256-bit 随机令牌 (`X-Usage-Monitor-Token`)、严格 `Origin` 校验与 Private Network CORS 头，
 *    为主窗口 Shadow DOM 内的悬浮面板提供与辅助栏完全一致的 `/api/*` 遥测与控制接口；
 * 2. 周期性探测本机 `Antigravity/DevToolsActivePort`，发现所有打开的主聊天窗口（支持多窗口并存），
 *    按需将最新的 `styles.css` 与 `app.js` 热挂载至窗口顶栏，并在用户关闭双栖开关时立即清理卸载；
 * 3. 完全不触碰宿主 `app.asar` 文件，客户端升级或无调试端口时静默回退至右侧辅助栏。
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  DATA_DIR,
  computeRuntimeCodeVersion,
  loadJson,
  loadSettings,
  saveJson,
} from './config.mjs';

const BRIDGE_MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_BRIDGE_PATHS = new Set([
  '/api/telemetry',
  '/api/settings',
  '/api/cloud-sync',
  '/api/plugin-update',
]);

/**
 * 解析各操作系统下 Antigravity 写入 `DevToolsActivePort` 的候选路径列表。
 *
 * @param {Record<string, string|undefined>} [env=process.env]
 * @param {string} [platform=process.platform]
 * @param {string} [homeDir=homedir()]
 * @returns {string[]}
 */
export function resolveDevToolsPortCandidates(
  env = process.env,
  platform = process.platform,
  homeDir = homedir()
) {
  const explicitFile = String(env?.ANTIGRAVITY_DEVTOOLS_PORT_FILE || '').trim();
  if (explicitFile) {
    return [explicitFile];
  }
  if (platform === 'win32') {
    const appData = env?.APPDATA || join(homeDir, 'AppData', 'Roaming');
    const localAppData = env?.LOCALAPPDATA || join(homeDir, 'AppData', 'Local');
    return [
      join(appData, 'Antigravity', 'DevToolsActivePort'),
      join(localAppData, 'Antigravity', 'DevToolsActivePort'),
    ];
  }
  if (platform === 'darwin') {
    return [join(homeDir, 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort')];
  }
  const configHome = env?.XDG_CONFIG_HOME || join(homeDir, '.config');
  return [join(configHome, 'Antigravity', 'DevToolsActivePort')];
}

/**
 * 从 `DevToolsActivePort` 文件文本首行提取合法的本地调试端口号。
 *
 * @param {string} rawText
 * @returns {number|null}
 */
export function parseDevToolsPortFile(rawText) {
  if (typeof rawText !== 'string' || !rawText) return null;
  const firstLine = rawText.split(/\r?\n/)[0]?.trim() || '';
  if (!/^\d+$/.test(firstLine)) return null;
  const port = Number(firstLine);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

/**
 * 判断 CDP `/json/list` 返回的目标是否为 Antigravity 主聊天窗口页面，
 * 严格排除 `vscode-webview://` 子视图、DevTools 面板与非本机回环地址。
 *
 * @param {object} target
 * @returns {boolean}
 */
export function isAntigravityMainPageTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.type !== 'page') return false;
  const url = String(target.url || '').trim();
  const wsUrl = String(target.webSocketDebuggerUrl || '').trim();
  if (!/^https:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+(?:\/|$)/i.test(url)) {
    return false;
  }
  if (!/^ws:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\//i.test(wsUrl)) {
    return false;
  }
  return true;
}

/**
 * 校验桥接请求的 `Origin` 是否来自本机 Antigravity 主窗口 HTTPS 回环源。
 *
 * @param {unknown} origin
 * @returns {boolean}
 */
export function isAllowedBridgeOrigin(origin) {
  const text = String(origin || '').trim();
  return /^https:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+$/i.test(text);
}

/**
 * 固定时间比较两个等长 ASCII 令牌字符串，避免时序侧信道泄露。
 *
 * @param {string} actual
 * @param {string} expected
 * @param {typeof import('node:crypto').timingSafeEqual|null} [timingSafeEqualFn=null]
 * @returns {boolean}
 */
function verifyBridgeToken(actual, expected, timingSafeEqualFn = null) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || !expected) return false;
  if (actual.length !== expected.length) return false;
  if (typeof timingSafeEqualFn === 'function') {
    return timingSafeEqualFn(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'));
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 创建双栖模式桥接与 CDP 热挂载控制器实例。
 *
 * @param {{
 *   handleApiRequest: (pathname: string, method: string, data: Record<string, any>) => Promise<{ status: number, contentType?: string, headers?: Record<string, string>, body: string }>,
 *   readAssetFn: (relPath: string) => Promise<string>,
 *   getSettingsFn?: () => { enableWindowOverlay?: boolean },
 *   getBundleVersionFn?: () => string,
 *   env?: Record<string, string|undefined>,
 *   platform?: string,
 *   homeDir?: string,
 *   pollIntervalMs?: number,
 *   cdpTimeoutMs?: number,
 *   WebSocketImpl?: typeof WebSocket,
 * }} options
 */
export function createWindowBridgeController(options) {
  const {
    handleApiRequest,
    readAssetFn,
    getSettingsFn = loadSettings,
    getBundleVersionFn = computeRuntimeCodeVersion,
    env = process.env,
    platform = process.platform,
    homeDir = homedir(),
    pollIntervalMs = 3000,
    fastPollIntervalMs = 1500,
    cdpTimeoutMs = 3500,
    bootBundleVersion = '',
    onVersionDrift = null,
    leaseFilePath = '',
    WebSocketImpl = globalThis.WebSocket,
  } = options || {};

  function isPidAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    if (pid === process.pid) return true;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err?.code === 'EPERM';
    }
  }

  let server = null;
  let serverStartPromise = null;
  let bridgePort = 0;
  let bridgeToken = '';
  let pollTimer = null;
  let initialTimer = null;
  let stopped = false;
  let syncInFlight = null;
  let hadInjectedTargets = false;
  let cdpFallbackActive = false;
  let nodeDepsPromise = null;

  async function loadNodeDeps() {
    if (!nodeDepsPromise) {
      nodeDepsPromise = Promise.all([import('node:http'), import('node:crypto')]).then(
        ([httpMod, cryptoMod]) => ({
          http: httpMod.default || httpMod,
          crypto: cryptoMod.default || cryptoMod,
        })
      );
    }
    return nodeDepsPromise;
  }

  function applyCorsHeaders(res, origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Usage-Monitor-Token');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Cache-Control', 'no-store');
  }

  async function executeRpcBatch(rpcBatch) {
    const responses = [];
    for (const item of rpcBatch) {
      const reqId = String(item?.id || '');
      if (!reqId) continue;
      try {
        const parsedUrl = new URL(String(item.path || '/'), 'http://127.0.0.1');
        if (!ALLOWED_BRIDGE_PATHS.has(parsedUrl.pathname)) {
          responses.push({ id: reqId, ok: false, status: 404, error: 'Not found' });
          continue;
        }
        const method = String(item.method || 'GET').toUpperCase();
        const reqData =
          method === 'GET'
            ? Object.fromEntries(parsedUrl.searchParams.entries())
            : item.body && typeof item.body === 'object'
              ? item.body
              : {};
        const out = await handleApiRequest(parsedUrl.pathname, method, reqData);
        const status = Number(out?.status || 200);
        const parsedBody = out?.body ? JSON.parse(out.body) : {};
        if (status >= 200 && status < 300) {
          responses.push({ id: reqId, ok: true, status, data: parsedBody });
        } else {
          responses.push({
            id: reqId,
            ok: false,
            status,
            error: parsedBody?.error || `HTTP ${status}`,
          });
        }
      } catch (err) {
        responses.push({
          id: reqId,
          ok: false,
          status: 500,
          error: err?.message || 'Internal bridge error',
        });
      }
    }
    return responses;
  }

  async function ensureBridgeServer() {
    if (server && bridgePort > 0) {
      return { port: bridgePort, token: bridgeToken };
    }
    if (serverStartPromise) {
      return serverStartPromise;
    }
    serverStartPromise = (async () => {
      const { http, crypto } = await loadNodeDeps();
      if (!bridgeToken) {
        bridgeToken = crypto.randomBytes(32).toString('hex');
      }

      const srv = http.createServer((req, res) => {
        // 注意：主窗口为 https://127.0.0.1，桥接为 http://127.0.0.1，跨协议请求在 Chromium 中必然携带
        // Sec-Fetch-Site: cross-site；此处通过严格 Origin 白名单 + Host 校验 + 256-bit 随机令牌保障回环安全。
        const origin = String(req.headers.origin || '').trim();
        if (!isAllowedBridgeOrigin(origin)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden origin' }));
          return;
        }

        const hostHeader = String(req.headers.host || '').trim().toLowerCase();
        if (
          hostHeader &&
          hostHeader !== `127.0.0.1:${bridgePort}` &&
          hostHeader !== `localhost:${bridgePort}` &&
          hostHeader !== `[::1]:${bridgePort}`
        ) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden host' }));
          return;
        }

        applyCorsHeaders(res, origin);

        const method = String(req.method || 'GET').toUpperCase();
        if (method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        let parsedUrl;
        try {
          parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${bridgePort}`);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed URL' }));
          return;
        }

        if (!ALLOWED_BRIDGE_PATHS.has(parsedUrl.pathname)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }

        const headerToken = String(req.headers['x-usage-monitor-token'] || '');
        if (!verifyBridgeToken(headerToken, bridgeToken, crypto.timingSafeEqual)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid bridge token' }));
          return;
        }

        if (method === 'GET') {
          const queryData = Object.fromEntries(parsedUrl.searchParams.entries());
          Promise.resolve(handleApiRequest(parsedUrl.pathname, 'GET', queryData))
            .then((out) => {
              const hdrs = {
                'Content-Type': out.contentType || 'application/json',
                ...(out.headers || {}),
              };
              res.writeHead(out.status || 200, hdrs);
              res.end(out.body);
            })
            .catch(() => {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
              }
              res.end(JSON.stringify({ error: 'Internal bridge error' }));
            });
          return;
        }

        if (method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const chunks = [];
        let totalBytes = 0;
        let aborted = false;
        req.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > BRIDGE_MAX_BODY_BYTES) {
            aborted = true;
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', () => {
          if (aborted) return;
          let bodyObj = {};
          try {
            const raw = Buffer.concat(chunks).toString('utf8').trim();
            bodyObj = raw ? JSON.parse(raw) : {};
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
          }
          Promise.resolve(handleApiRequest(parsedUrl.pathname, 'POST', bodyObj))
            .then((out) => {
              const hdrs = {
                'Content-Type': out.contentType || 'application/json',
                ...(out.headers || {}),
              };
              res.writeHead(out.status || 200, hdrs);
              res.end(out.body);
            })
            .catch(() => {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
              }
              res.end(JSON.stringify({ error: 'Internal bridge error' }));
            });
        });
      });

      await new Promise((resolve, reject) => {
        srv.once('error', reject);
        srv.listen(0, '127.0.0.1', () => {
          srv.removeListener('error', reject);
          resolve();
        });
      });
      srv.unref?.();
      const addr = srv.address();
      bridgePort = typeof addr === 'object' && addr ? Number(addr.port || 0) : 0;
      server = srv;
      return { port: bridgePort, token: bridgeToken };
    })().finally(() => {
      serverStartPromise = null;
    });

    return serverStartPromise;
  }

  function findActiveDevToolsPort() {
    const candidates = resolveDevToolsPortCandidates(env, platform, homeDir);
    for (const filePath of candidates) {
      try {
        if (!existsSync(filePath)) continue;
        const port = parseDevToolsPortFile(readFileSync(filePath, 'utf8'));
        if (port) return port;
      } catch {
        // 忽略不可读候选文件
      }
    }
    return null;
  }

  async function listMainWindowTargets(cdpPort) {
    const { http } = await loadNodeDeps();
    const rawBody = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${cdpPort}/json/list`, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`CDP HTTP ${res.statusCode}`));
          return;
        }
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => resolve(text));
      });
      req.setTimeout(1500, () => req.destroy(new Error('CDP list timeout')));
      req.on('error', reject);
    });
    const parsed = JSON.parse(rawBody);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAntigravityMainPageTarget);
  }

  async function evaluateOnTarget(wsUrl, expression) {
    const WS = WebSocketImpl || globalThis.WebSocket;
    if (typeof WS !== 'function') {
      throw new Error('WebSocket runtime unavailable');
    }
    let ws = null;
    let timer = null;
    try {
      ws = new WS(wsUrl);
      const evalResult = await new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error('CDP Runtime.evaluate timeout'));
        }, cdpTimeoutMs);

        const onOpen = () => {
          try {
            ws.send(
              JSON.stringify({
                id: 1,
                method: 'Runtime.evaluate',
                params: {
                  expression,
                  returnByValue: true,
                  awaitPromise: true,
                },
              })
            );
          } catch (err) {
            reject(err);
          }
        };

        const onMessage = (ev) => {
          try {
            const raw = typeof ev?.data === 'string' ? ev.data : String(ev?.data || '');
            const msg = JSON.parse(raw);
            if (msg && msg.id === 1) {
              resolve(msg);
            }
          } catch {
            // 忽略无关事件帧
          }
        };

        const onError = (err) => {
          reject(err instanceof Error ? err : new Error('CDP WebSocket error'));
        };

        ws.addEventListener('open', onOpen, { once: true });
        ws.addEventListener('message', onMessage);
        ws.addEventListener('error', onError, { once: true });
      });
      return evalResult;
    } finally {
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {
          // 忽略关闭异常
        }
      }
    }
  }

  async function runSyncInternal({ forceReinject = false } = {}) {
    if (stopped) return { ok: false, reason: 'stopped' };
    const bundleVersion = String(getBundleVersionFn() || '');
    if (bootBundleVersion && bundleVersion && bundleVersion !== String(bootBundleVersion)) {
      onVersionDrift?.();
      return { ok: false, reason: 'version_drift_restarting', injected: 0 };
    }

    const enabled = Boolean(getSettingsFn()?.enableWindowOverlay !== false);
    if (enabled && leaseFilePath && !forceReinject) {
      const lease = loadJson(leaseFilePath, null);
      const leasePid = Number(lease?.pid || 0);
      const leaseAgeMs = Date.now() - Number(lease?.updatedAtMs || 0);
      if (leasePid > 0 && leasePid !== process.pid && leaseAgeMs >= 0 && leaseAgeMs < 9000 && isPidAlive(leasePid)) {
        const leaseVerNum = Number(lease?.bundleVersion) || 0;
        const myVerNum = Number(bundleVersion) || 0;
        if (leaseVerNum > myVerNum) {
          onVersionDrift?.();
          return { ok: false, enabled: true, reason: 'older_than_leader', injected: 0 };
        }
        if (leaseVerNum === myVerNum || String(lease?.bundleVersion || '') === bundleVersion) {
          return { ok: true, enabled: true, reason: 'follower_yield', leaderPid: leasePid, injected: 0 };
        }
      }
      saveJson(leaseFilePath, {
        pid: process.pid,
        bundleVersion,
        updatedAtMs: Date.now(),
      });
    }

    const cdpPort = findActiveDevToolsPort();
    if (!cdpPort) {
      return { ok: false, enabled, reason: 'no_devtools_port', injected: 0 };
    }

    let targets = [];
    try {
      targets = await listMainWindowTargets(cdpPort);
    } catch {
      return { ok: false, enabled, reason: 'cdp_unreachable', injected: 0 };
    }
    if (!targets.length) {
      return { ok: true, enabled, reason: 'no_targets', injected: 0 };
    }

    if (!enabled) {
      if (!hadInjectedTargets && !forceReinject) {
        return { ok: true, enabled: false, removed: 0 };
      }
      const disposeExpr = `(() => {
        try {
          const existed = Boolean(window.__AGUsageMonitorOverlay || window.__AGUsageMonitorBridge);
          window.__AGUsageMonitorOverlay?.dispose?.();
          delete window.__AGUsageMonitorOverlay;
          delete window.__AGUsageMonitorBridge;
          return existed;
        } catch {
          return false;
        }
      })()`;
      let removed = 0;
      for (const target of targets) {
        try {
          const res = await evaluateOnTarget(target.webSocketDebuggerUrl, disposeExpr);
          if (res?.result?.result?.value === true) removed += 1;
        } catch {
          // 单窗口不可达不阻塞其余窗口卸载
        }
      }
      hadInjectedTargets = false;
      return { ok: true, enabled: false, removed };
    }

    const { port, token } = await ensureBridgeServer();
    const probeExpr = `(() => {
      try {
        const ov = window.__AGUsageMonitorOverlay;
        const br = window.__AGUsageMonitorBridge;
        const alive = Boolean(ov && typeof ov.ensureAlive === 'function' && ov.ensureAlive());
        const rpcBatch = Array.isArray(br?.rpcQueue) && br.rpcQueue.length > 0
          ? br.rpcQueue.splice(0, 8)
          : [];
        return {
          alive,
          bundleVersion: String(ov?.bundleVersion || ''),
          bridgePort: Number(br?.port || 0),
          hasToken: Boolean(br?.token),
          transportMode: String(br?.transportMode || 'http'),
          rpcBatch,
        };
      } catch {
        return { alive: false, bundleVersion: '', bridgePort: 0, hasToken: false, transportMode: 'http', rpcBatch: [] };
      }
    })()`;

    let cachedAssets = null;
    let injected = 0;
    let aliveCount = 0;
    let relayedRpcCount = 0;
    let sawCdpTransport = false;

    for (const target of targets) {
      try {
        if (!forceReinject) {
          const probeRes = await evaluateOnTarget(target.webSocketDebuggerUrl, probeExpr);
          const snap = probeRes?.result?.result?.value;
          if (snap && snap.alive === true) {
            const snapVerNum = Number(snap.bundleVersion) || 0;
            const curVerNum = Number(bundleVersion) || 0;
            if (snapVerNum > 0 && curVerNum > 0 && snapVerNum > curVerNum) {
              onVersionDrift?.();
              aliveCount += 1;
              continue;
            }
            if (snap.bundleVersion === bundleVersion) {
              if (snap.bridgePort !== port || snap.hasToken !== true) {
                const rebindExpr = `window.__AGUsageMonitorOverlay?.updateBridge?.(${JSON.stringify({ port, token })})`;
                await evaluateOnTarget(target.webSocketDebuggerUrl, rebindExpr);
              }
              aliveCount += 1;
              hadInjectedTargets = true;
              if (snap.transportMode === 'cdp') {
                sawCdpTransport = true;
              }
              if (Array.isArray(snap.rpcBatch) && snap.rpcBatch.length > 0) {
                sawCdpTransport = true;
                const rpcResults = await executeRpcBatch(snap.rpcBatch);
                relayedRpcCount += rpcResults.length;
                const deliverExpr = `window.__AGUsageMonitorOverlay?.deliverRpc?.(${JSON.stringify(rpcResults)})`;
                await evaluateOnTarget(target.webSocketDebuggerUrl, deliverExpr);
              }
              continue;
            }
          }
        }

        if (!cachedAssets) {
          const [stylesCss, appJs] = await Promise.all([
            readAssetFn('styles.css'),
            readAssetFn('app.js'),
          ]);
          cachedAssets = { stylesCss, appJs };
        }

        let initialTelemetry = null;
        try {
          const routeMatch = String(target.url || '').match(/\/c\/([a-f0-9-]{36})(?:\/|$)/i);
          const targetConvId = routeMatch ? routeMatch[1] : '';
          const initOut = await handleApiRequest('/api/telemetry', 'GET', {
            conversationId: targetConvId,
            range: 'today',
          });
          if (Number(initOut?.status || 200) === 200 && initOut?.body) {
            initialTelemetry = JSON.parse(initOut.body);
          }
        } catch {
          // 预取首帧遥测异常不阻塞注入本身
        }

        const bridgeConfigJson = JSON.stringify({
          port,
          token,
          bundleVersion,
          stylesCss: cachedAssets.stylesCss,
          initialTelemetry,
        });
        const injectionScript = `(() => {\nwindow.__AGUsageMonitorBridge = ${bridgeConfigJson};\n})();\n${cachedAssets.appJs}\nBoolean(window.__AGUsageMonitorOverlay && window.__AGUsageMonitorOverlay.ensureAlive && window.__AGUsageMonitorOverlay.ensureAlive());`;

        const evalRes = await evaluateOnTarget(target.webSocketDebuggerUrl, injectionScript);
        if (
          evalRes &&
          !evalRes.error &&
          !evalRes.result?.exceptionDetails &&
          evalRes.result?.result?.value === true
        ) {
          injected += 1;
          aliveCount += 1;
          hadInjectedTargets = true;
        }
      } catch {
        // 单个窗口注入异常不阻断其他窗口
      }
    }

    cdpFallbackActive = sawCdpTransport;
    return {
      ok: true,
      enabled: true,
      port,
      targets: targets.length,
      injected,
      aliveCount,
      relayedRpcCount,
    };
  }

  function syncAllWindows(opts = {}) {
    if (syncInFlight) {
      return syncInFlight.then(() => runSyncInternal(opts));
    }
    syncInFlight = runSyncInternal(opts).finally(() => {
      syncInFlight = null;
    });
    return syncInFlight;
  }

  function scheduleNextPoll() {
    if (stopped) return;
    if (pollTimer) clearTimeout(pollTimer);
    const delayMs = cdpFallbackActive ? fastPollIntervalMs : pollIntervalMs;
    pollTimer = setTimeout(() => {
      pollTimer = null;
      syncAllWindows()
        .catch(() => {})
        .finally(() => {
          scheduleNextPoll();
        });
    }, delayMs);
    pollTimer.unref?.();
  }

  function start() {
    stopped = false;
    if (initialTimer) clearTimeout(initialTimer);
    if (pollTimer) clearTimeout(pollTimer);

    initialTimer = setTimeout(() => {
      initialTimer = null;
      syncAllWindows()
        .catch(() => {})
        .finally(() => {
          scheduleNextPoll();
        });
    }, 350);
    initialTimer.unref?.();
  }

  async function stop({ disposeWindows = false } = {}) {
    if (initialTimer) {
      clearTimeout(initialTimer);
      initialTimer = null;
    }
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (disposeWindows && hadInjectedTargets) {
      const prevStopped = stopped;
      stopped = false;
      try {
        const cdpPort = findActiveDevToolsPort();
        if (cdpPort) {
          const targets = await listMainWindowTargets(cdpPort).catch(() => []);
          const disposeExpr = `(() => { try { window.__AGUsageMonitorOverlay?.dispose?.(); delete window.__AGUsageMonitorOverlay; delete window.__AGUsageMonitorBridge; return true; } catch { return false; } })()`;
          for (const t of targets) {
            await evaluateOnTarget(t.webSocketDebuggerUrl, disposeExpr).catch(() => {});
          }
        }
      } finally {
        stopped = prevStopped;
      }
    }
    stopped = true;
    hadInjectedTargets = false;
    if (server) {
      const srv = server;
      server = null;
      bridgePort = 0;
      await new Promise((resolve) => srv.close(() => resolve()));
    }
  }

  function notifySettingChanged(enabled) {
    if (!enabled) {
      hadInjectedTargets = true;
    }
    return syncAllWindows({ forceReinject: false }).catch(() => ({ ok: false }));
  }

  return {
    ensureBridgeServer,
    syncAllWindows,
    notifySettingChanged,
    start,
    stop,
    getBridgeInfo: () => ({ port: bridgePort, token: bridgeToken, running: Boolean(server) }),
  };
}

let defaultBridgeController = null;

/**
 * 启动进程级默认的双栖窗口桥接控制器（幂等）。
 *
 * @param {Parameters<typeof createWindowBridgeController>[0]} options
 */
export function startDefaultWindowBridge(options) {
  if (!defaultBridgeController) {
    defaultBridgeController = createWindowBridgeController({
      leaseFilePath: join(DATA_DIR, 'window-bridge-lease.json'),
      ...options,
    });
    defaultBridgeController.start();
  }
  return defaultBridgeController;
}

/**
 * 在用户保存设置切换 `enableWindowOverlay` 时立即同步所有打开的主窗口挂载状态。
 *
 * @param {boolean} enabled
 */
export function notifyWindowOverlaySetting(enabled) {
  if (!defaultBridgeController) return Promise.resolve({ ok: false });
  return defaultBridgeController.notifySettingChanged(enabled);
}
