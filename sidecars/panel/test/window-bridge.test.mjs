import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {
  createWindowBridgeController,
  isAllowedBridgeOrigin,
  isAntigravityMainPageTarget,
  parseDevToolsPortFile,
  resolveDevToolsPortCandidates,
} from '../backend/window-bridge.mjs';
import { computeCapsuleLayoutMode } from '../src/components/layout/WindowOverlayShell.js';
import { backendHarness } from './backend-harness.mjs';

test('DevToolsActivePort parsing, cross-platform discovery, and strict target/origin filtering', () => {
  assert.equal(parseDevToolsPortFile('9222\n/devtools/browser/abc-123\n'), 9222);
  assert.equal(parseDevToolsPortFile('54321\r\n/devtools/browser/win'), 54321);
  assert.equal(parseDevToolsPortFile('0\n/devtools'), null);
  assert.equal(parseDevToolsPortFile('70000\n/devtools'), null);
  assert.equal(parseDevToolsPortFile('not-a-port'), null);

  const explicit = resolveDevToolsPortCandidates(
    { ANTIGRAVITY_DEVTOOLS_PORT_FILE: '/tmp/custom-port' },
    'win32',
    'C:\\Users\\Dev'
  );
  assert.deepEqual(explicit, ['/tmp/custom-port']);

  const winPaths = resolveDevToolsPortCandidates(
    { APPDATA: 'C:\\Roaming', LOCALAPPDATA: 'C:\\Local' },
    'win32',
    'C:\\Users\\Dev'
  );
  assert.equal(winPaths.length, 2);
  assert.ok(winPaths[0].includes('Roaming'));
  assert.ok(winPaths[1].includes('Local'));

  const macPaths = resolveDevToolsPortCandidates({}, 'darwin', '/Users/dev');
  assert.equal(macPaths[0], path.join('/Users/dev', 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort'));

  assert.equal(
    isAntigravityMainPageTarget({
      type: 'page',
      url: 'https://127.0.0.1:51234/c/12345678-1234-1234-1234-123456789abc',
      webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/main1',
    }),
    true
  );
  // Reject auxiliary webviews, non-HTTPS pages, and non-loopback debugger sockets
  assert.equal(
    isAntigravityMainPageTarget({
      type: 'iframe',
      url: 'vscode-webview://panel/index.html',
      webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/wv1',
    }),
    false
  );
  assert.equal(
    isAntigravityMainPageTarget({
      type: 'page',
      url: 'http://127.0.0.1:51234/',
      webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/http1',
    }),
    false
  );
  assert.equal(
    isAntigravityMainPageTarget({
      type: 'page',
      url: 'https://127.0.0.1:51234/',
      webSocketDebuggerUrl: 'ws://evil.example.com:9222/devtools/page/remote',
    }),
    false
  );

  assert.equal(isAllowedBridgeOrigin('https://127.0.0.1:58123'), true);
  assert.equal(isAllowedBridgeOrigin('https://localhost:58123'), true);
  assert.equal(isAllowedBridgeOrigin('http://127.0.0.1:58123'), false);
  assert.equal(isAllowedBridgeOrigin('https://example.com:58123'), false);
  assert.equal(isAllowedBridgeOrigin('vscode-webview://panel'), false);
});

test('Loopback HTTP bridge enforces Origin, Private Network CORS, token auth, and body limits', async () => {
  const receivedCalls = [];
  const controller = createWindowBridgeController({
    handleApiRequest: async (pathname, method, data) => {
      receivedCalls.push({ pathname, method, data });
      return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, echoPath: pathname, echoData: data }),
      };
    },
    readAssetFn: async () => '',
    getSettingsFn: () => ({ enableWindowOverlay: true }),
    getBundleVersionFn: () => 'v1',
  });

  try {
    const { port, token } = await controller.ensureBridgeServer();
    assert.ok(port > 0);
    assert.equal(token.length, 64);

    const validOrigin = 'https://127.0.0.1:60123';

    // 1. Disallowed origin -> 403
    const badOriginRes = await fetch(`http://127.0.0.1:${port}/api/telemetry`, {
      headers: { Origin: 'https://evil.example', 'X-Usage-Monitor-Token': token },
    });
    assert.equal(badOriginRes.status, 403);

    // 2. OPTIONS preflight -> 204 with Private Network header (including Chromium cross-scheme Sec-Fetch-Site: cross-site)
    const rawCrossSchemePreflight = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/telemetry',
          method: 'OPTIONS',
          headers: {
            Origin: validOrigin,
            'Sec-Fetch-Site': 'cross-site',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'x-usage-monitor-token',
          },
        },
        (res) => {
          res.resume();
          resolve({ status: res.statusCode, headers: res.headers });
        }
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(rawCrossSchemePreflight.status, 204);
    assert.equal(rawCrossSchemePreflight.headers['access-control-allow-origin'], validOrigin);
    assert.equal(rawCrossSchemePreflight.headers['access-control-allow-private-network'], 'true');

    const rawCrossSchemeGetStatus = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/telemetry?conversationId=conv-sec&range=today',
          method: 'GET',
          headers: {
            Origin: validOrigin,
            'Sec-Fetch-Site': 'cross-site',
            'X-Usage-Monitor-Token': token,
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        }
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(rawCrossSchemeGetStatus, 200);

    // 3. Invalid token -> 403
    const badTokenRes = await fetch(`http://127.0.0.1:${port}/api/telemetry`, {
      headers: { Origin: validOrigin, 'X-Usage-Monitor-Token': 'wrong-token' },
    });
    assert.equal(badTokenRes.status, 403);

    // 4. Valid GET /api/telemetry -> 200
    const okGetRes = await fetch(
      `http://127.0.0.1:${port}/api/telemetry?conversationId=conv-1&range=today`,
      {
        headers: { Origin: validOrigin, 'X-Usage-Monitor-Token': token },
      }
    );
    assert.equal(okGetRes.status, 200);
    const getBody = await okGetRes.json();
    assert.equal(getBody.ok, true);
    assert.equal(getBody.echoData.conversationId, 'conv-1');
    assert.equal(getBody.echoData.range, 'today');

    // 5. Valid POST /api/settings -> 200
    const okPostRes = await fetch(`http://127.0.0.1:${port}/api/settings`, {
      method: 'POST',
      headers: {
        Origin: validOrigin,
        'Content-Type': 'application/json',
        'X-Usage-Monitor-Token': token,
      },
      body: JSON.stringify({ enableWindowOverlay: false }),
    });
    assert.equal(okPostRes.status, 200);
    const postBody = await okPostRes.json();
    assert.equal(postBody.echoData.enableWindowOverlay, false);
    assert.equal(receivedCalls.length, 3);

    // 6. Oversized POST body -> 413
    const hugePayload = JSON.stringify({ pad: 'x'.repeat(70 * 1024) });
    const hugeRes = await fetch(`http://127.0.0.1:${port}/api/settings`, {
      method: 'POST',
      headers: {
        Origin: validOrigin,
        'Content-Type': 'application/json',
        'X-Usage-Monitor-Token': token,
      },
      body: hugePayload,
    }).catch(() => ({ status: 413 }));
    assert.equal(hugeRes.status, 413);
  } finally {
    await controller.stop();
  }
});

test('CDP multi-window sync injects, skips healthy windows, hot-upgrades on version bump, and cleans up on disable', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-wm-cdp-test-'));
  const portFile = path.join(tmpDir, 'DevToolsActivePort');

  // Simulated VM contexts for two open Antigravity windows
  const windowContexts = new Map();
  for (const id of ['win1', 'win2']) {
    const winObj = {};
    winObj.window = winObj;
    winObj.globalThis = winObj;
    windowContexts.set(id, vm.createContext(winObj));
  }

  let injectEvalCount = 0;

  class MockCdpWebSocket {
    constructor(url) {
      this.url = url;
      this.targetId = url.split('/').pop();
      this.listeners = new Map();
      queueMicrotask(() => this._emit('open', {}));
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    send(raw) {
      const msg = JSON.parse(raw);
      if (msg.method === 'Runtime.evaluate') {
        const expr = msg.params.expression;
        if (expr.includes('__AGUsageMonitorBridge =')) {
          injectEvalCount += 1;
        }
        const ctx = windowContexts.get(this.targetId);
        const value = vm.runInContext(expr, ctx);
        queueMicrotask(() =>
          this._emit('message', {
            data: JSON.stringify({ id: msg.id, result: { result: { value } } }),
          })
        );
      }
    }
    close() {}
    _emit(type, ev) {
      for (const fn of this.listeners.get(type) || []) fn(ev);
    }
  }

  const cdpHttpServer = http.createServer((req, res) => {
    if (req.url === '/json/list') {
      const cdpPort = cdpHttpServer.address().port;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify([
          {
            type: 'page',
            url: 'https://127.0.0.1:61001/c/11111111-1111-1111-1111-111111111111',
            webSocketDebuggerUrl: `ws://127.0.0.1:${cdpPort}/devtools/page/win1`,
          },
          {
            type: 'page',
            url: 'https://127.0.0.1:61002/c/22222222-2222-2222-2222-222222222222',
            webSocketDebuggerUrl: `ws://127.0.0.1:${cdpPort}/devtools/page/win2`,
          },
          {
            type: 'iframe',
            url: 'vscode-webview://aux-pane/index.html',
            webSocketDebuggerUrl: `ws://127.0.0.1:${cdpPort}/devtools/page/ignored`,
          },
        ])
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => cdpHttpServer.listen(0, '127.0.0.1', resolve));
  fs.writeFileSync(portFile, `${cdpHttpServer.address().port}\n/devtools/browser/mock`, 'utf8');

  let overlayEnabled = true;
  let currentVer = 'bundle-v1';

  const mockAppJs = `
    (() => {
      window.__AGUsageMonitorOverlay?.dispose?.();
      const br = window.__AGUsageMonitorBridge;
      let alive = true;
      window.__AGUsageMonitorOverlay = {
        bundleVersion: br.bundleVersion,
        ensureAlive: () => alive,
        dispose: () => { alive = false; },
      };
    })();
  `;

  const controller = createWindowBridgeController({
    handleApiRequest: async () => ({ status: 200, body: '{}' }),
    readAssetFn: async (rel) => (rel === 'styles.css' ? ':host{}' : mockAppJs),
    getSettingsFn: () => ({ enableWindowOverlay: overlayEnabled }),
    getBundleVersionFn: () => currentVer,
    env: { ANTIGRAVITY_DEVTOOLS_PORT_FILE: portFile },
    WebSocketImpl: MockCdpWebSocket,
  });

  try {
    // 1. Initial sync mounts onto both main windows and ignores the webview
    const first = await controller.syncAllWindows();
    assert.equal(first.ok, true);
    assert.equal(first.targets, 2);
    assert.equal(first.injected, 2);
    assert.equal(first.aliveCount, 2);
    assert.equal(injectEvalCount, 2);

    // 2. Subsequent poll sees matching bundleVersion & port -> 0 re-injections
    const second = await controller.syncAllWindows();
    assert.equal(second.injected, 0);
    assert.equal(second.aliveCount, 2);
    assert.equal(injectEvalCount, 2);

    // 3. Hot bundle update triggers seamless re-injection on both windows
    currentVer = 'bundle-v2';
    const upgraded = await controller.syncAllWindows();
    assert.equal(upgraded.injected, 2);
    assert.equal(upgraded.aliveCount, 2);
    assert.equal(windowContexts.get('win1').__AGUsageMonitorOverlay.bundleVersion, 'bundle-v2');
    assert.equal(windowContexts.get('win2').__AGUsageMonitorOverlay.bundleVersion, 'bundle-v2');

    // 4. Disabling enableWindowOverlay disposes and removes globals from all windows
    overlayEnabled = false;
    const disabled = await controller.notifySettingChanged(false);
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.removed, 2);
    assert.equal(windowContexts.get('win1').__AGUsageMonitorOverlay, undefined);
    assert.equal(windowContexts.get('win1').__AGUsageMonitorBridge, undefined);
  } finally {
    await controller.stop();
    await new Promise((resolve) => cdpHttpServer.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Capsule 4-stage responsive hysteresis and backend settings default/override', async () => {
  // Hysteresis stability check for dual-capsule topbar layout (multiBtn + capsuleBtn)
  let mode = computeCapsuleLayoutMode(300, 'wide');
  assert.equal(mode, 'wide');
  mode = computeCapsuleLayoutMode(240, mode);
  assert.equal(mode, 'compact');
  // At 265px (< 272px restore threshold), stays compact instead of flickering back to wide
  mode = computeCapsuleLayoutMode(265, mode);
  assert.equal(mode, 'compact');
  mode = computeCapsuleLayoutMode(280, mode);
  assert.equal(mode, 'wide');
  mode = computeCapsuleLayoutMode(150, mode);
  assert.equal(mode, 'minimal');
  mode = computeCapsuleLayoutMode(70, mode);
  assert.equal(mode, 'ring-only');
  mode = computeCapsuleLayoutMode(85, mode);
  assert.equal(mode, 'ring-only');
  mode = computeCapsuleLayoutMode(96, mode);
  assert.equal(mode, 'minimal');

  // Single-capsule mode (showMulti: false) grants ~76px extra breathing room before collapsing
  assert.equal(computeCapsuleLayoutMode(200, 'wide', { showMulti: false }), 'wide');
  assert.equal(computeCapsuleLayoutMode(150, 'wide', { showMulti: false }), 'compact');

  // Backend harness verifies enableWindowOverlay, showTopbarMultiSession, and topbarCapsuleSlots defaults & normalization
  const defaultEnv = backendHarness({ settings: {} });
  const defaultPayload = await defaultEnv.buildTelemetryPayloadInternal('', false, {});
  assert.equal(defaultPayload.settings.enableWindowOverlay, true);
  assert.equal(defaultPayload.settings.showTopbarMultiSession, true);
  assert.deepEqual(Array.from(defaultPayload.settings.topbarCapsuleSlots), [
    'context',
    'tps',
    'quota_auto',
  ]);

  const disabledEnv = backendHarness({
    settings: {
      enableWindowOverlay: false,
      showTopbarMultiSession: false,
      topbarCapsuleSlots: ['gemini_5h', 'ttft', 'claude_weekly'],
    },
  });
  const disabledPayload = await disabledEnv.buildTelemetryPayloadInternal('', false, {});
  assert.equal(disabledPayload.settings.enableWindowOverlay, false);
  assert.equal(disabledPayload.settings.showTopbarMultiSession, false);
  assert.deepEqual(Array.from(disabledPayload.settings.topbarCapsuleSlots), [
    'gemini_5h',
    'ttft',
    'claude_weekly',
  ]);

  const allNoneEnv = backendHarness({
    settings: { topbarCapsuleSlots: ['none', 'none', 'none'] },
  });
  const allNonePayload = await allNoneEnv.buildTelemetryPayloadInternal('', false, {});
  assert.deepEqual(Array.from(allNonePayload.settings.topbarCapsuleSlots), [
    'context',
    'none',
    'none',
  ]);
});

test('Compiled app.js mounts dual Shadow DOM hosts, tracks /c/<uuid> routes, protects host reload, and supports composedPath()', async () => {
  const appJsPath = new URL('../app.js', import.meta.url);
  const stylesCssPath = new URL('../styles.css', import.meta.url);
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

  // Minimal DOM mock supporting ShadowRoot, querySelector, attributes, classes, and composedPath
  class MockNode {
    constructor(tag = 'div') {
      this.tagName = String(tag).toUpperCase();
      this.id = '';
      this.className = '';
      this.textContent = '';
      this.style = {
        _vars: new Map(),
        setProperty(k, v) { this._vars.set(k, String(v)); },
        getPropertyValue(k) { return this._vars.get(k) || ''; },
      };
      this.dataset = {};
      this.attributes = new Map();
      this.children = [];
      this.parentNode = null;
      this.shadowRoot = null;
      this._listeners = new Map();
      const self = this;
      this.classList = {
        _set() {
          return new Set(String(self.className || '').split(/\s+/).filter(Boolean));
        },
        add(...tokens) {
          const s = this._set();
          for (const t of tokens) if (t) s.add(t);
          self.className = Array.from(s).join(' ');
        },
        contains(tok) {
          return this._set().has(tok);
        },
        toggle(tok, force) {
          const s = this._set();
          const should = force === undefined ? !s.has(tok) : Boolean(force);
          if (should) s.add(tok);
          else s.delete(tok);
          self.className = Array.from(s).join(' ');
        },
      };
    }
    get parentElement() { return this.parentNode; }
    get firstChild() { return this.children[0] || null; }
    get firstElementChild() { return this.children[0] || null; }
    get lastElementChild() { return this.children[this.children.length - 1] || null; }
    get isConnected() {
      let cur = this;
      while (cur) {
        if (cur.isDocumentRoot) return true;
        cur = cur.parentNode || cur.host || null;
      }
      return false;
    }
    setAttribute(k, v) {
      const s = String(v);
      this.attributes.set(k, s);
      if (k === 'id') this.id = s;
      if (k === 'class') this.className = s;
    }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    insertBefore(node, refNode) {
      if (!refNode) return this.appendChild(node);
      if (node.parentNode) node.parentNode.removeChild(node);
      const idx = this.children.indexOf(refNode);
      node.parentNode = this;
      if (idx < 0) this.children.push(node);
      else this.children.splice(idx, 0, node);
      return node;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    }
    attachShadow() {
      const sr = new MockNode('#shadow-root');
      sr.host = this;
      this.shadowRoot = sr;
      return sr;
    }
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(fn);
    }
    removeEventListener(type, fn) {
      const arr = this._listeners.get(type);
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    }
    dispatchEvent(ev) {
      for (const fn of [...(this._listeners.get(ev.type) || [])]) fn(ev);
    }
    getBoundingClientRect() {
      return { left: 900, right: 1080, top: 6, bottom: 32, width: 180, height: 26 };
    }
    querySelector(sel) {
      if (sel === ':scope > div.shrink-0') {
        return this.children.find((c) => c.classList.contains('shrink-0')) || null;
      }
      return this._find((n) => {
        if (sel === '[class*="@container/titlebar"]') {
          return String(n.className || '').includes('@container/titlebar');
        }
        if (sel.startsWith('.')) {
          return n.classList.contains(sel.slice(1));
        }
        return false;
      });
    }
    querySelectorAll(sel) {
      const s = String(sel || '').trim();
      if (!s || s.includes(',')) return [];
      if (s.includes(' ')) {
        const [first, ...rest] = s.split(/\s+/);
        const roots = this.querySelectorAll(first);
        const out = [];
        for (const r of roots) {
          for (const item of r.querySelectorAll(rest.join(' '))) {
            if (!out.includes(item)) out.push(item);
          }
        }
        return out;
      }
      if (!s.startsWith('.')) return [];
      const cls = s.slice(1);
      const out = [];
      const walk = (node) => {
        for (const c of node.children) {
          if (c.classList.contains(cls)) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    }
    _find(pred) {
      for (const c of this.children) {
        if (pred(c)) return c;
        const hit = c._find(pred);
        if (hit) return hit;
      }
      return null;
    }
  }

  const docRoot = new MockNode('html');
  docRoot.isDocumentRoot = true;
  const body = new MockNode('body');
  docRoot.appendChild(body);

  // Build simulated Antigravity titlebar
  const titlebar = new MockNode('div');
  titlebar.className = 'flex items-center @container/titlebar';
  const titleLeft = new MockNode('div');
  titleLeft.textContent = 'Chat Title';
  const titleRight = new MockNode('div');
  titleRight.className = 'shrink-0 flex items-center';
  const nativeBtn = new MockNode('button');
  titleRight.appendChild(nativeBtn);
  titlebar.appendChild(titleLeft);
  titlebar.appendChild(titleRight);
  body.appendChild(titlebar);

  let reloadCalled = false;
  let currentBundleVer = 'ver-100';
  const fetchedUrls = [];
  const fetchedHeaders = [];

  const docListeners = new Map();
  const winListeners = new Map();

  const mockDocument = {
    readyState: 'complete',
    hidden: false,
    documentElement: docRoot,
    body,
    createElement: (tag) => new MockNode(tag),
    createElementNS: (_ns, tag) => new MockNode(tag),
    createTextNode: (txt) => {
      const t = new MockNode('#text');
      t.textContent = String(txt);
      return t;
    },
    getElementById: (id) => docRoot._find((n) => n.id === id),
    querySelector: (sel) => docRoot.querySelector(sel),
    querySelectorAll: () => [],
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = docListeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
  };

  const mockLocation = {
    pathname: '/c/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    reload() {
      reloadCalled = true;
    },
  };

  const mockSettings = {
    weeklyLimitMode: 'official',
    weeklyTokenBudget: 150000000,
    weeklyCostBudget: 100,
    showUpstreamModel: false,
    autoUpdatePlugin: false,
    enableWindowOverlay: true,
    showTopbarMultiSession: true,
    topbarCapsuleSlots: ['context', 'tps', 'quota_auto'],
  };

  const mockWindow = {
    innerWidth: 1440,
    innerHeight: 900,
    location: mockLocation,
    document: mockDocument,
    __AGUsageMonitorBridge: {
      port: 49152,
      token: 'secret-bridge-token-123',
      bundleVersion: 'ver-100',
      stylesCss,
    },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = winListeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    getComputedStyle: () => ({ paddingRight: '8px', getPropertyValue: () => '' }),
    fetch: async (url, opts = {}) => {
      const urlStr = String(url);
      fetchedUrls.push(urlStr);
      fetchedHeaders.push(opts.headers || {});
      if (urlStr.includes('/api/settings') && String(opts.method || '').toUpperCase() === 'POST') {
        const patch = opts.body ? JSON.parse(opts.body) : {};
        Object.assign(mockSettings, patch);
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...mockSettings }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          uiBundleVersion: currentBundleVer,
          settings: { ...mockSettings },
          cloudStatus: { updateAvailable: true, currentPluginVersion: '1.4.2', latestPluginVersion: '1.5.0' },
          account: { tierName: 'Google AI Ultra', planName: 'Pro', totalConversations: 5 },
          runningConversations: [
            {
              cascadeId: 'bbbbbbbb-2222-3333-4444-cccccccccccc',
              title: 'Background Security Audit',
              isCurrentSelected: false,
              isMainRunning: true,
              isRunning: true,
              stepCount: 24,
              totalStepCount: 38,
              latestTokPerSec: 64.2,
              contextUsedPct: 48.4,
              mainActivity: {
                phase: 'tool',
                label: '执行命令',
                detail: 'rg -n ProtectedURLFilter',
                stepProgress: '1/2',
                startedAtMs: Date.now() - 12000,
                signature: 'tool:rg:1',
              },
              subagentCount: 1,
              runningSubagentCount: 1,
              subagents: [
                {
                  cascadeId: 'bbbbbbbb-2222-3333-4444-cccccccccccc:sub1',
                  index: 1,
                  badgeText: '子1',
                  shortLabel: '子代理 #1',
                  role: 'Auth Researcher',
                  isRunning: true,
                  stepCount: 14,
                  lastModifiedMs: Date.now() - 8000,
                  liveActivity: {
                    phase: 'thinking',
                    label: '读取文件',
                    detail: 'MastLoginFilter.java',
                    stepProgress: '',
                    startedAtMs: Date.now() - 8000,
                    signature: 'sub1:read',
                  },
                },
              ],
            },
            {
              cascadeId: 'eeeeeeee-5555-6666-7777-ffffffffffff',
              title: 'Solo Refactor Task',
              isCurrentSelected: false,
              isMainRunning: true,
              isRunning: true,
              stepCount: 9,
              totalStepCount: 9,
              latestTokPerSec: 72.1,
              contextUsedPct: 21.0,
              mainActivity: {
                phase: 'thinking',
                label: '推理中',
                detail: '',
                stepProgress: '',
                startedAtMs: Date.now() - 4000,
                signature: 'solo:think',
              },
              subagentCount: 0,
              runningSubagentCount: 0,
              subagents: [],
            },
          ],
          conversations: [
            {
              cascadeId: 'bbbbbbbb-2222-3333-4444-cccccccccccc',
              title: 'Background Security Audit',
              stepCount: 24,
              subagentCount: 1,
              runningSubagentCount: 1,
              totalStepCount: 38,
              isRunning: true,
              contextUsedPct: 48.4,
              sessionCostUsd: 1.85,
              lastModifiedMs: Date.now() - 2000,
            },
            {
              cascadeId: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
              title: 'Dual Mode Session',
              stepCount: 6,
              subagentCount: 0,
              totalStepCount: 6,
              isRunning: false,
              contextUsedPct: 50,
              sessionCostUsd: 7.3,
              lastModifiedMs: Date.now() - 180000,
            },
          ],
          activeConversation: {
            cascadeId: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
            title: 'Dual Mode Session',
            isRunning: false,
            stepCount: 6,
            latestTokPerSec: 92.4,
            latestTtftSec: 0.85,
            avgTokPerSec: 88.2,
            latestStepCostUsd: 0.04,
            latestCacheHitPct: 98.7,
            sessionCostUsd: 7.3,
            activeModelShort: 'carbon-high',
            context: {
              totalTokens: 128000,
              compactionLimitTokens: 256000,
              limitTokens: 256000,
              toolResultsTokens: 76000,
              assistantTokens: 42000,
              userRulesTokens: 10000,
            },
            recentSteps: [],
          },
          consumption: {
            selectedRange: { key: 'today', label: '今天', startMs: 1, endMs: 2 },
            session: { totalTokens: 128000, costUsd: 0.42, unpricedCalls: 12 },
            account: { totalTokens: 500000, costUsd: 1.5, unpricedCalls: 3993 },
            trendSeries: [],
            monthlySeries: [],
          },
          quotas: {
            meta: { hasOfficialData: true },
            activePool: { family: 'Carbon', poolLabel: 'Carbon', remainingPct: 68, weeklyRemainingPct: 81 },
            pools: [
              {
                poolKey: 'Gemini',
                poolLabel: 'Gemini',
                remainingPct: 44,
                weeklyRemainingPct: 26,
              },
              {
                poolKey: 'Claude & GPT',
                poolLabel: 'Claude & GPT',
                remainingPct: 100,
                weeklyRemainingPct: 91,
              },
            ],
            weekly: { remainingPct: 81 },
          },
          modelBreakdown: [],
        }),
      };
    },
  };
  mockWindow.window = mockWindow;
  mockWindow.globalThis = mockWindow;

  const sandbox = vm.createContext({
    window: mockWindow,
    globalThis: mockWindow,
    document: mockDocument,
    location: mockLocation,
    navigator: {},
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    fetch: mockWindow.fetch,
    console,
  });

  vm.runInContext(appJs, sandbox);
  await new Promise((r) => setTimeout(r, 40));

  try {
    const ov = mockWindow.__AGUsageMonitorOverlay;
    assert.ok(ov, 'Overlay handle should be registered on window');
    assert.equal(ov.ensureAlive(), true);

    const capsuleHost = mockDocument.getElementById('ag-usage-monitor-capsule');
    const portalHost = mockDocument.getElementById('ag-usage-monitor-portal');
    assert.ok(capsuleHost, 'Capsule host mounted');
    assert.ok(portalHost, 'Portal host mounted');
    assert.equal(capsuleHost.getAttribute('data-dock'), 'flow');
    assert.equal(capsuleHost.parentNode, titleRight);
    assert.equal(titleRight.firstChild, capsuleHost, 'Capsule inserted before native right buttons');

    // Verify authenticated bridge call & automatic /c/<uuid> route tracking
    assert.ok(fetchedUrls.length >= 1);
    assert.ok(fetchedUrls[0].startsWith('http://127.0.0.1:49152/api/telemetry?'));
    assert.ok(fetchedUrls[0].includes('conversationId=aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb'));
    assert.equal(fetchedHeaders[0]['X-Usage-Monitor-Token'], 'secret-bridge-token-123');

    // Verify dual topbar buttons: left multi-session button (.wm-multi-btn) before right telemetry capsule (.wm-capsule-btn)
    const multiBtn = capsuleHost.shadowRoot.querySelector('.wm-multi-btn');
    const capsuleBtn = capsuleHost.shadowRoot.querySelector('.wm-capsule-btn');
    assert.ok(multiBtn, 'Left multi-session button mounted');
    assert.ok(capsuleBtn, 'Right telemetry capsule button mounted');
    assert.ok(
      capsuleHost.shadowRoot.children.indexOf(multiBtn) <
        capsuleHost.shadowRoot.children.indexOf(capsuleBtn),
      'Multi-session button sits immediately to the left of telemetry capsule'
    );
    assert.equal(multiBtn.querySelector('.svg-icon'), null, 'Multi-session button has zero SVG clutter');
    assert.equal(multiBtn.classList.contains('is-running'), true);
    const multiLabelEl = multiBtn.querySelector('.wm-multi-label');
    assert.equal(multiLabelEl.textContent, '2 运行 · 1 子');

    // Verify capsule reactive text (50% context, 92.4 t/s without bolt SVG, 余 68%)
    const ctxPctEl = capsuleHost.shadowRoot.querySelector('.wm-ctx-pct');
    const speedSegEl = capsuleHost.shadowRoot.querySelector('.wm-seg-speed');
    const quotaSegEl = capsuleHost.shadowRoot.querySelector('.wm-seg-quota');
    assert.equal(ctxPctEl.textContent, '50%');
    assert.equal(speedSegEl.children.length, 1, 'Speed segment has no lightning bolt SVG');
    assert.equal(speedSegEl.querySelector('.svg-icon'), null);
    assert.ok(speedSegEl.children[0].textContent.includes('92.4 t/s'));
    assert.equal(quotaSegEl.children[0].textContent, '余 68%');

    // Verify hovering left multi-session button opens .wm-multi-panel with live tasks, subagents, and recent sessions
    const multiPanelEl = portalHost.shadowRoot.querySelector('.wm-multi-panel');
    const hoverTipEl = portalHost.shadowRoot.querySelector('.wm-hover-tip');
    assert.ok(multiPanelEl, 'Multi-session floating panel mounted in portal shadow root');
    assert.equal(multiPanelEl.children.length, 3, 'Single-layer online sessions panel (header + empty state + running list)');

    multiBtn.dispatchEvent({ type: 'mouseenter', clientX: 930, clientY: 18 });
    assert.equal(ov.isMultiOpen(), true);
    assert.equal(ov.isMultiHoverOpen(), true);
    assert.equal(multiPanelEl.hasAttribute('hidden'), false);

    // Stationary pointer inside multiBtn prevents synthetic mouseleave blink
    multiBtn.dispatchEvent({ type: 'mouseleave', clientX: 930, clientY: 18 });
    await new Promise((r) => setTimeout(r, 110));
    assert.equal(ov.isMultiOpen(), true, 'Stationary pointer inside multi button prevents synthetic mouseleave blink');

    const runningListEl = multiPanelEl.querySelector('.live-activity-list');
    assert.equal(runningListEl.children.length, 2, 'Both running session cards rendered');
    const liveTaskCard = runningListEl.children[0];
    const soloTaskCard = runningListEl.children[1];
    assert.equal(liveTaskCard.querySelector('.live-task-title').textContent, 'Background Security Audit');
    assert.equal(liveTaskCard.querySelector('.badge-main').hasAttribute('hidden'), false, 'Session with subagents shows 主 badge');
    assert.equal(liveTaskCard.querySelector('.live-activity-phase').textContent, '执行命令');
    assert.equal(liveTaskCard.querySelector('.live-sub-list').hasAttribute('hidden'), false, 'Active subagents auto-expanded');
    assert.equal(liveTaskCard.querySelector('.live-sub-role').textContent, 'Auth Researcher');
    assert.equal(soloTaskCard.querySelector('.live-task-title').textContent, 'Solo Refactor Task');
    assert.equal(soloTaskCard.querySelector('.badge-main').hasAttribute('hidden'), true, 'Session without subagents hides 主 badge');
    const liveDotSvg = liveTaskCard.querySelector('.live-activity-dot').children[0];
    assert.equal(liveDotSvg.attributes.get('width'), '11', 'Enlarged live activity SVG dot size is 11');
    assert.equal(liveDotSvg.children[0].attributes.get('r'), '5', 'Enlarged dot circle radius is 5');
    assert.match(stylesCss, /\.wm-multi-dot\s*\{\s*width:\s*8px;\s*height:\s*8px;/, 'Topbar multi-session dot enlarged to 8px');
    assert.equal(multiPanelEl.querySelector('.wm-recent-list'), null, 'Recent sessions list removed so panel shows online sessions only');
    assert.equal(multiPanelEl.querySelector('.panel'), null, 'Single-layer multi-session panel without nested .panel box');

    // Verify hovering right capsule closes unpinned multi-session panel and opens rich 3-card hover overview HUD (.wm-hover-tip)
    assert.ok(hoverTipEl, 'Hover overview HUD mounted in portal shadow root');
    assert.equal(
      hoverTipEl.children.length,
      4,
      'Hover HUD has optional update banner + 3 signature cards (matrix + context + quotas)'
    );
    assert.equal(
      multiPanelEl.querySelector('.wm-multi-empty-hint'),
      null,
      'Redundant hover/pin hint copy removed from multi-session empty state'
    );

    capsuleBtn.dispatchEvent({ type: 'mouseenter', clientX: 960, clientY: 18 });
    assert.equal(ov.isMultiOpen(), false, 'Mutual exclusion closes unpinned multi-session panel');
    assert.equal(ov.isHoverOpen(), true);
    assert.equal(hoverTipEl.hasAttribute('hidden'), false);

    // Transient mouseleave while pointer remains inside capsule rect (900..1080 x 6..32) must NOT close hover HUD
    capsuleBtn.dispatchEvent({ type: 'mouseleave', clientX: 960, clientY: 18 });
    await new Promise((r) => setTimeout(r, 55));
    assert.equal(ov.isHoverOpen(), true, 'Stationary pointer inside capsule prevents synthetic mouseleave blink');

    const hoverMatrix = hoverTipEl.querySelector('.telemetry-matrix');
    const hoverLegendGrid = hoverTipEl.querySelector('.ctx-legend-grid');
    const hoverQuotaPools = hoverTipEl.querySelector('.wm-hover-quota-pools');
    assert.equal(hoverMatrix.children.length, 4);
    assert.equal(hoverMatrix.children[0].children[1].textContent, '92.4 tok/s');
    assert.equal(hoverMatrix.children[3].children[1].textContent, '$0.040');
    assert.equal(hoverLegendGrid.children.length, 10, 'All 10 context legend slots pre-reserved');
    const firstLegendSlotBefore = hoverLegendGrid.children[0];
    assert.equal(firstLegendSlotBefore.children[0].children[1].textContent, '工具结果');
    assert.equal(firstLegendSlotBefore.children[1].textContent, '76.0k');
    assert.equal(hoverQuotaPools.children.length, 2, 'Default Gemini & Claude/GPT quota pools pre-reserved');

    // Verify clicking multi-session button pins open multi-session panel, and clicking capsule switches to 4-tab panel
    multiBtn.dispatchEvent({ type: 'click', stopPropagation() {} });
    assert.equal(ov.isMultiPinnedOpen(), true);
    assert.equal(ov.isHoverOpen(), false);
    assert.equal(multiBtn.classList.contains('is-open'), true);

    ov.open();
    assert.equal(ov.isMultiOpen(), false);
    assert.equal(ov.isHoverOpen(), false);
    assert.equal(hoverTipEl.hasAttribute('hidden'), true);
    assert.equal(ov.isOpen(), true);
    const popoverEl = portalHost.shadowRoot.querySelector('.wm-popover-panel');
    assert.equal(popoverEl.hasAttribute('hidden'), false);

    // Verify Shadow DOM retargeted click inside CustomSelect does NOT close select or popover
    const selectRoot = portalHost.shadowRoot.querySelector('.custom-select');
    const selectTrigger = selectRoot.querySelector('.select-trigger');
    selectTrigger.dispatchEvent({ type: 'click', stopPropagation() {} });
    assert.equal(selectRoot.classList.contains('is-open'), true);

    // Simulate document capture-phase click retargeted to portalHost while composedPath includes selectRoot
    for (const fn of docListeners.get('click') || []) {
      fn({
        target: portalHost,
        composedPath: () => [selectTrigger, selectRoot, popoverEl, portalHost.shadowRoot, portalHost, body, docRoot],
      });
    }
    assert.equal(selectRoot.classList.contains('is-open'), true, 'CustomSelect stays open via composedPath');
    selectTrigger.dispatchEvent({ type: 'click', stopPropagation() {} });

    // Verify SettingsView: weekly budget UI removed; topbar multi-session switch & 3-slot customization work live
    const pillTabs = popoverEl.querySelectorAll('.pill-tab');
    pillTabs[pillTabs.length - 1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 15));

    const allPanes = popoverEl.querySelectorAll('.view-pane');
    const settingsPane = allPanes[allPanes.length - 1];
    assert.equal(settingsPane.querySelectorAll('.number-input').length, 0, 'Obsolete weekly budget number inputs removed');
    const settingsSelects = settingsPane.querySelectorAll('.custom-select');
    assert.equal(
      settingsSelects.length,
      6,
      'SettingsView renders 6 CustomSelect controls (mount, modelFormat, 3 topbar slots, autoUpdate)'
    );
    const mountSelectEl = settingsSelects[0];
    const modelFormatSelectEl = settingsSelects[1];
    const slot0SelectEl = settingsSelects[2];
    const slot1SelectEl = settingsSelects[3];
    const slot2SelectEl = settingsSelects[4];

    // Toggle windowMountSelect: dual -> sidebar -> dual
    assert.ok(mountSelectEl.querySelector('.select-label').textContent.includes('顶部栏 + 侧边栏'));
    mountSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    mountSelectEl.querySelectorAll('.select-option')[1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.enableWindowOverlay, false, 'enableWindowOverlay persisted as false');
    assert.ok(mountSelectEl.querySelector('.select-label').textContent.includes('仅侧边栏'), 'UI reflects sidebar mode');

    mountSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    mountSelectEl.querySelectorAll('.select-option')[0].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.enableWindowOverlay, true, 'enableWindowOverlay persisted back to true');
    assert.ok(mountSelectEl.querySelector('.select-label').textContent.includes('顶部栏 + 侧边栏'), 'UI reflects dual mode');

    // Toggle stepModelSelect: short -> upstream -> short
    assert.ok(modelFormatSelectEl.querySelector('.select-label').textContent.includes('精简代号'));
    modelFormatSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    modelFormatSelectEl.querySelectorAll('.select-option')[1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.showUpstreamModel, true);
    assert.ok(modelFormatSelectEl.querySelector('.select-label').textContent.includes('原始模型 ID'));

    modelFormatSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    modelFormatSelectEl.querySelectorAll('.select-option')[0].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.showUpstreamModel, false);
    assert.ok(modelFormatSelectEl.querySelector('.select-label').textContent.includes('精简代号'));

    // Toggle topbar multi-session switch: show -> hide -> show
    const topbarSegBtns = settingsPane.querySelectorAll('.seg-btn');
    assert.equal(topbarSegBtns.length, 2, 'Topbar multi-session toggle has 显示 / 隐藏 buttons');
    topbarSegBtns[1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.showTopbarMultiSession, false);
    assert.equal(multiBtn.hasAttribute('hidden'), true, 'Topbar multi-session button hidden immediately');
    assert.equal(capsuleHost.getAttribute('data-multi'), 'off');

    topbarSegBtns[0].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.showTopbarMultiSession, true);
    assert.equal(multiBtn.hasAttribute('hidden'), false, 'Topbar multi-session button restored immediately');

    // Customize 3 topbar capsule slots: [gemini_5h, ttft, cost], then swap order, test claude_weekly + none, then reset default
    const capSlots = capsuleHost.shadowRoot.querySelectorAll('.wm-cap-slot');
    const capSeps = capsuleHost.shadowRoot.querySelectorAll('.wm-sep');
    assert.equal(capSlots.length, 3);
    assert.equal(capSeps.length, 2);

    // Slot 0 -> Gemini 5h (option index 5)
    slot0SelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    slot0SelectEl.querySelectorAll('.select-option')[5].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(capSlots[0].getAttribute('data-metric'), 'gemini_5h');
    assert.equal(capSlots[0].children.length, 1, 'Ring SVG detached cleanly when slot leaves context');
    assert.equal(capSlots[0].children[0].textContent, '余 44%');

    // Slot 1 -> TTFT (option index 2)
    slot1SelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    slot1SelectEl.querySelectorAll('.select-option')[2].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(capSlots[1].getAttribute('data-metric'), 'ttft');
    assert.equal(capSlots[1].children[0].textContent, '0.85s');

    // Slot 2 -> Cost (option index 3)
    slot2SelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    slot2SelectEl.querySelectorAll('.select-option')[3].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(capSlots[2].getAttribute('data-metric'), 'cost');
    assert.equal(capSlots[2].children[0].textContent, '$0.040');
    assert.deepEqual(mockSettings.topbarCapsuleSlots, ['gemini_5h', 'ttft', 'cost']);

    // Swap Slot 1 up (left) so order becomes ['ttft', 'gemini_5h', 'cost']
    const slotMoveBtns = settingsPane.querySelectorAll('.slot-move-btn');
    // Row 1 up button is index 2 ([row0Up, row0Down, row1Up, row1Down, row2Up, row2Down])
    slotMoveBtns[2].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.deepEqual(mockSettings.topbarCapsuleSlots, ['ttft', 'gemini_5h', 'cost']);
    assert.equal(capSlots[0].children[0].textContent, '0.85s');
    assert.equal(capSlots[1].children[0].textContent, '余 44%');

    // Test hiding middle slot ('none', option index 9) and setting Slot 2 to Claude Weekly (option index 8)
    slot1SelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    slot1SelectEl.querySelectorAll('.select-option')[9].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    slot2SelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    slot2SelectEl.querySelectorAll('.select-option')[8].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(capSlots[1].hasAttribute('hidden'), true, 'Middle slot hidden when set to none');
    assert.equal(capSeps[0].hasAttribute('hidden'), true, 'Separator before hidden middle slot collapses');
    assert.equal(capSeps[1].hasAttribute('hidden'), false, 'Single separator remains between Slot 0 and Slot 2');
    assert.equal(capSeps[1].getAttribute('data-sep-for-rank'), '2');
    assert.equal(capSlots[2].getAttribute('data-vis-rank'), '2');
    assert.equal(capSlots[2].children[0].textContent, '余 91%');

    // Reset default restores ['context', 'tps', 'quota_auto'] with ring SVG re-attached on Slot 0
    const resetTopbarBtn = settingsPane.querySelector('.btn-ghost-sm');
    resetTopbarBtn.dispatchEvent({ type: 'click' });
    await new Promise((r) => setTimeout(r, 260));
    assert.deepEqual(mockSettings.topbarCapsuleSlots, ['context', 'tps', 'quota_auto']);
    assert.equal(capSlots[0].getAttribute('data-metric'), 'context');
    assert.equal(capSlots[0].children.length, 2, 'Ring SVG re-attached on Slot 0');
    assert.equal(capSlots[0].querySelector('.wm-ctx-pct').textContent, '50%');

    // Verify 3-tier update mode select (manual default -> off hides topbar/hover prompts -> auto -> manual)
    const topbarUpdateBtn = capsuleHost.shadowRoot.querySelector('.wm-update-btn');
    const hoverUpdateBar = hoverTipEl.querySelector('.wm-hover-update-bar');
    const headerUpdateBtn = popoverEl.querySelector('.update-badge-btn');
    assert.ok(topbarUpdateBtn, 'Topbar subtle update pill button mounted');
    assert.ok(hoverUpdateBar, 'Hover card update banner mounted');
    assert.equal(topbarUpdateBtn.hasAttribute('hidden'), false, 'Update pill visible in default manual mode');
    assert.equal(topbarUpdateBtn.querySelector('.wm-update-label').textContent, 'v1.5.0');
    assert.ok(
      topbarUpdateBtn.children[0].children[0].getAttribute('d').includes('13.2l3.8-3.8'),
      'Topbar update pill uses downward arrow matching panel & settings design language'
    );
    assert.equal(hoverUpdateBar.hasAttribute('hidden'), false, 'Hover update bar visible in default manual mode');
    assert.ok(
      hoverUpdateBar
        .querySelector('.wm-hover-update-left')
        .children[0].children[0].getAttribute('d')
        .includes('13.2l3.8-3.8'),
      'Hover update bar uses downward arrow matching panel & settings design language'
    );
    assert.equal(
      hoverUpdateBar.querySelector('.wm-hover-update-left').children[1].textContent,
      '发现新版本 v1.5.0'
    );
    assert.equal(
      hoverUpdateBar.querySelector('.wm-hover-update-hint').textContent,
      '点击顶栏 v1.5.0 即可更新'
    );
    assert.equal(headerUpdateBtn.hasAttribute('hidden'), false);

    const updateModeSelectEl = settingsSelects[5];
    assert.equal(updateModeSelectEl.querySelector('.select-label').textContent, '仅提示新版本，手动更新');
    updateModeSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    const updateOpts = updateModeSelectEl.querySelectorAll('.select-option');
    assert.equal(updateOpts.length, 3, '3 update modes rendered (manual, auto, off)');
    assert.equal(updateOpts[0].querySelector('.select-option-text').textContent, '仅提示新版本，手动更新');
    assert.equal(updateOpts[1].querySelector('.select-option-text').textContent, '自动更新');
    assert.equal(updateOpts[2].querySelector('.select-option-text').textContent, '关闭更新');

    updateOpts[2].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.pluginUpdateMode, 'off');
    assert.equal(mockSettings.autoUpdatePlugin, false);
    assert.equal(topbarUpdateBtn.hasAttribute('hidden'), true, 'Topbar update pill hidden when mode=off');
    assert.equal(hoverUpdateBar.hasAttribute('hidden'), true, 'Hover update bar hidden when mode=off');
    assert.equal(headerUpdateBtn.hasAttribute('hidden'), true, 'Header update button hidden when mode=off');

    updateModeSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    updateModeSelectEl.querySelectorAll('.select-option')[1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mockSettings.pluginUpdateMode, 'auto');
    assert.equal(mockSettings.autoUpdatePlugin, true);
    assert.equal(topbarUpdateBtn.hasAttribute('hidden'), false, 'Topbar update pill restored when mode=auto');

    updateModeSelectEl.querySelector('.select-trigger').dispatchEvent({ type: 'click', stopPropagation() {} });
    updateModeSelectEl.querySelectorAll('.select-option')[0].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 260));
    assert.equal(mockSettings.pluginUpdateMode, 'manual');
    assert.equal(mockSettings.autoUpdatePlugin, false);
    assert.equal(topbarUpdateBtn.hasAttribute('hidden'), false, 'Topbar update pill visible when mode=manual');

    // Verify ConsumptionView omits "+ 待定" / "3993 步费用待定" and StepsDetailView protects header title
    pillTabs[1].dispatchEvent({ type: 'click', stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 15));
    const heroCostEl = popoverEl.querySelector('.cons-hero-cost');
    assert.equal(heroCostEl.textContent, '$1.50', 'Consumption hero cost omits + 待定');
    const heroCostBaseline = heroCostEl.parentElement;
    assert.equal(
      heroCostBaseline.children[1].textContent,
      '≈ ¥11',
      'Consumption sub-label renders CNY approx instead of 步费用待定'
    );
    assert.ok(popoverEl.querySelector('.steps-panel-header'), 'Steps header flex wrapper present');
    assert.ok(popoverEl.querySelector('.steps-panel-title'), 'Steps title non-shrinking class present');

    // Verify bundle version bump NEVER calls window.location.reload() in overlay mode
    currentBundleVer = 'ver-200';
    mockLocation.pathname = '/c/cccccccc-4444-5555-6666-dddddddddddd';
    for (const fn of winListeners.get('popstate') || []) fn({});
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(reloadCalled, false, 'Host window must never reload on bundle version change');
    assert.ok(
      fetchedUrls.some((u) => u.includes('conversationId=cccccccc-4444-5555-6666-dddddddddddd')),
      'Navigated host route immediately tracked'
    );
    // Verify fallback to CDP RPC relay when browser fetch fails (e.g. CSP connect-src or proxy block)
    let fetchShouldFail = true;
    const origFetch = mockWindow.fetch;
    mockWindow.fetch = async (url, opts) => {
      if (fetchShouldFail) {
        throw new TypeError('Failed to fetch');
      }
      return origFetch(url, opts);
    };
    mockLocation.pathname = '/c/dddddddd-7777-8888-9999-eeeeeeeeeeee';
    for (const fn of winListeners.get('popstate') || []) fn({});
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(mockWindow.__AGUsageMonitorBridge.transportMode, 'cdp');
    assert.equal(Array.isArray(mockWindow.__AGUsageMonitorBridge.rpcQueue), true);
    assert.equal(mockWindow.__AGUsageMonitorBridge.rpcQueue.length, 1);
    const queuedItem = mockWindow.__AGUsageMonitorBridge.rpcQueue.shift();
    const delivered = ov.deliverRpc([
      {
        id: queuedItem.id,
        ok: true,
        status: 200,
        data: {
          uiBundleVersion: 'ver-200',
          settings: { weeklyLimitMode: 'official', weeklyTokenBudget: 150000000, weeklyCostBudget: 100, enableWindowOverlay: true },
          activeConversation: {
            cascadeId: 'dddddddd-7777-8888-9999-eeeeeeeeeeee',
            title: 'CDP Relay Session',
            isRunning: false,
            stepCount: 8,
            latestTokPerSec: 120.5,
            context: { totalTokens: 64000, compactionLimitTokens: 256000, limitTokens: 256000 },
            recentSteps: [],
          },
          consumption: { selectedRange: { key: 'today', label: '今天', startMs: 1, endMs: 2 }, session: {}, account: {}, trendSeries: [], monthlySeries: [] },
          quotas: null,
          modelBreakdown: [],
        },
      },
    ]);
    assert.equal(delivered, 1);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(ctxPctEl.textContent, '25%', 'CDP relay delivered live telemetry without HTTP');
    assert.equal(speedSegEl.children[0].textContent, '121 t/s');
    assert.equal(quotaSegEl.hasAttribute('hidden'), false, 'Quota slot stays pre-reserved even when quotas=null');
    assert.equal(quotaSegEl.children[0].textContent, '余 --%');
    assert.equal(
      hoverLegendGrid.children[0],
      firstLegendSlotBefore,
      'Hover legend updates strictly in-place without DOM node replacement or appendChild'
    );

    // Verify in-place bridge port rotation preserves exact DOM host nodes without remount
    fetchShouldFail = false;
    assert.equal(ov.updateBridge({ port: 51234, token: 'rotated-token-456' }), true);
    assert.equal(mockWindow.__AGUsageMonitorBridge.port, 51234);
    assert.equal(mockDocument.getElementById('ag-usage-monitor-capsule'), capsuleHost);
  } finally {
    mockWindow.__AGUsageMonitorOverlay?.dispose?.();
    assert.equal(mockDocument.getElementById('ag-usage-monitor-capsule'), null);
    assert.equal(mockDocument.getElementById('ag-usage-monitor-portal'), null);
  }
});
