/**
 * @fileoverview Antigravity Usage Monitor 面板 Sidecar HTTP 服务入口。
 *
 * 职责边界：
 * - 提供前端静态资产路由（`/`、`/app.js`、`/styles.css`）；
 * - 提供严格同端口 Loopback 受保护的 JSON API 路由：
 *   - `GET /api/telemetry`：获取实时配额、当前会话指标与历史聚合遥测数据；
 *   - `POST /api/settings`：保存用户偏好设置（写入失败时返回 HTTP 500）；
 *   - `POST /api/cloud-sync`：立即从 GitHub 同步最新云端价格目录与版本信息；
 *   - `POST /api/plugin-update`：一键执行插件自更新（Git / Release ZIP 双通道）；
 * - 所有核心业务逻辑均已模块化拆分至 `./backend/*.mjs`。
 */

import { readFileSync, promises as fsPromises } from 'node:fs';
import { join } from 'node:path';
import { Response, SidecarApp } from 'sidecar_sdk';
import {
  HERE,
  LS_ADDR,
  SETTINGS_FILE,
  cloudSyncState,
  computeRuntimeCodeVersion,
  isPlainObject,
  loadSettings,
  normalizeOrchestratorIdMode,
  normalizePluginUpdateMode,
  normalizeTopbarCapsuleSlots,
  normalizeWeeklyLimitMode,
  saveJson,
} from './backend/config.mjs';
import {
  performPluginUpdate,
  scheduleSidecarRestart,
  syncCloudCatalog,
} from './backend/plugin-updater.mjs';
import { getCloudStatus } from './backend/pricing-catalog.mjs';
import { buildTelemetryPayload } from './backend/telemetry-builder.mjs';
import {
  notifyWindowOverlaySetting,
  startDefaultWindowBridge,
} from './backend/window-bridge.mjs';

const app = new SidecarApp();

const bootBundleVersion = computeRuntimeCodeVersion();

/**
 * 异步读取 `sidecars/panel` 目录下的静态资源文件（兼容单元测试同步沙箱）。
 *
 * @param {string} relPath 相对路径
 * @returns {Promise<string>}
 */
const readLocalAsync = async (relPath) => {
  const fullPath = join(HERE, relPath);
  if (typeof fsPromises !== 'undefined' && fsPromises?.readFile) {
    return fsPromises.readFile(fullPath, 'utf8');
  }
  return readFileSync(fullPath, 'utf8');
};

/**
 * 校验请求是否来自本机回环同端口地址 (`127.0.0.1` / `localhost` / `[::1]`) 或受信 Webview Origin，
 * 阻止跨端口本地服务（如本地其他端口的开发服务器）或跨站 DNS Rebinding 访问 API。
 *
 * @param {object} req
 * @returns {boolean}
 */
export function isLocalHostRequest(req) {
  if (!req?.headers) return true;
  const host = String(req.headers.host || '').trim().toLowerCase();
  const hostMatch = host.match(/^(127\.0\.0\.1|localhost|\[::1\])(?::(\d+))?$/);
  if (host && !hostMatch) {
    return false;
  }
  const origin = String(req.headers.origin || '').trim().toLowerCase();
  if (origin && /^vscode-webview:\/\/[a-z0-9._-]+$/.test(origin)) {
    return true;
  }
  const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite === 'cross-site') {
    return false;
  }
  if (origin) {
    const originMatch = origin.match(
      /^(https?):\/\/(127\.0\.0\.1|localhost|\[::1\])(?::(\d+))?$/
    );
    if (!originMatch) {
      return false;
    }
    if (hostMatch) {
      const defaultPort = originMatch[1] === 'https' ? '443' : '80';
      const originPort = originMatch[3] || defaultPort;
      const hostPort = hostMatch[2] || defaultPort;
      if (originPort !== hostPort) {
        return false;
      }
    }
  }
  return true;
}

const MAX_SAFE_DATE_MS = 8_640_000_000_000_000;

function sanitizePositiveFiniteMs(val) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num <= MAX_SAFE_DATE_MS ? Math.floor(num) : 0;
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// ---------------------------------------------------------------------------
// 静态页面与前端资产路由
// ---------------------------------------------------------------------------

app.page(
  '/',
  async () =>
    new Response(await readLocalAsync('index.html'), {
      contentType: 'text/html; charset=utf-8',
      headers: NO_STORE_HEADERS,
    })
);

app.page(
  '/app.js',
  async () =>
    new Response(await readLocalAsync('app.js'), {
      contentType: 'application/javascript; charset=utf-8',
      headers: NO_STORE_HEADERS,
    })
);

app.page(
  '/styles.css',
  async () =>
    new Response(await readLocalAsync('styles.css'), {
      contentType: 'text/css; charset=utf-8',
      headers: NO_STORE_HEADERS,
    })
);

// ---------------------------------------------------------------------------
// 业务数据与控制 API 路由（辅助栏 Sidecar Webview 与主窗口双栖桥接共享同一套处理函数）
// ---------------------------------------------------------------------------

async function executeTelemetryAction(data) {
  const rawConvId = String(
    data?.conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID || ''
  ).trim();
  const convId = rawConvId && !/[\\/]|\.\./.test(rawConvId) ? rawConvId : '';
  const force = data?.force === '1' || data?.force === true;
  if (LS_ADDR && LS_ADDR !== 'test.invalid') {
    if (force && Date.now() - cloudSyncState.lastAttemptMs > 15_000) {
      await Promise.race([
        syncCloudCatalog({ force: true }).catch(() => {}),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
    } else {
      syncCloudCatalog({ force: false }).catch(() => {});
    }
  }
  const filterOpts = {
    range: data?.range || 'all',
    startMs: sanitizePositiveFiniteMs(data?.startMs),
    endMs: sanitizePositiveFiniteMs(data?.endMs),
  };
  const payload = await buildTelemetryPayload(convId, force, filterOpts);
  if (
    bootBundleVersion &&
    payload.uiBundleVersion &&
    String(payload.uiBundleVersion) !== String(bootBundleVersion)
  ) {
    scheduleSidecarRestart(150);
  }
  return {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body: JSON.stringify(payload),
  };
}

function sanitizePositiveSettingNumber(val, fallback) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function executeSettingsAction(data) {
  const current = loadSettings();
  const payload = isPlainObject(data) ? data : {};
  const nextPluginUpdateMode =
    payload.pluginUpdateMode !== undefined
      ? normalizePluginUpdateMode(payload.pluginUpdateMode)
      : typeof payload.autoUpdatePlugin === 'boolean'
        ? payload.autoUpdatePlugin
          ? 'auto'
          : 'manual'
        : normalizePluginUpdateMode(current.pluginUpdateMode, current.autoUpdatePlugin);
  const updated = {
    weeklyTokenBudget: sanitizePositiveSettingNumber(
      payload.weeklyTokenBudget ?? payload.weeklyTokenLimit,
      current.weeklyTokenBudget
    ),
    weeklyCostBudget: sanitizePositiveSettingNumber(
      payload.weeklyCostBudget,
      current.weeklyCostBudget
    ),
    weeklyLimitMode:
      payload.weeklyLimitMode !== undefined
        ? normalizeWeeklyLimitMode(payload.weeklyLimitMode)
        : current.weeklyLimitMode,
    showUpstreamModel:
      typeof payload.showUpstreamModel === 'boolean'
        ? payload.showUpstreamModel
        : Boolean(current.showUpstreamModel),
    orchestratorIdMode:
      payload.orchestratorIdMode !== undefined
        ? normalizeOrchestratorIdMode(payload.orchestratorIdMode)
        : normalizeOrchestratorIdMode(current.orchestratorIdMode),
    pluginUpdateMode: nextPluginUpdateMode,
    autoUpdatePlugin: nextPluginUpdateMode === 'auto',
    enableWindowOverlay:
      typeof payload.enableWindowOverlay === 'boolean'
        ? payload.enableWindowOverlay
        : current.enableWindowOverlay !== false,
    showTopbarMultiSession:
      typeof payload.showTopbarMultiSession === 'boolean'
        ? payload.showTopbarMultiSession
        : current.showTopbarMultiSession !== false,
    topbarCapsuleSlots:
      payload.topbarCapsuleSlots !== undefined
        ? normalizeTopbarCapsuleSlots(payload.topbarCapsuleSlots)
        : normalizeTopbarCapsuleSlots(current.topbarCapsuleSlots),
  };
  if (!saveJson(SETTINGS_FILE, updated)) {
    return {
      ok: false,
      status: 500,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: false, error: 'Failed to persist settings' }),
    };
  }
  if (updated.enableWindowOverlay !== (current.enableWindowOverlay !== false)) {
    void notifyWindowOverlaySetting(updated.enableWindowOverlay);
  }
  return {
    ok: true,
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    updated,
    body: JSON.stringify(updated),
  };
}

async function executeCloudSyncAction() {
  const cloudStatus = await syncCloudCatalog({ force: true });
  return {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body: JSON.stringify({ ok: !cloudStatus.lastSyncError, cloudStatus }),
  };
}

async function executePluginUpdateAction() {
  const result = await performPluginUpdate({ isAuto: false });
  return {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body: JSON.stringify({ ...result, cloudStatus: getCloudStatus() }),
  };
}

async function dispatchBridgeApiRequest(pathname, method, data) {
  if (pathname === '/api/telemetry' && method === 'GET') {
    return executeTelemetryAction(data);
  }
  if (pathname === '/api/settings' && method === 'POST') {
    return executeSettingsAction(data);
  }
  if (pathname === '/api/cloud-sync' && method === 'POST') {
    return executeCloudSyncAction();
  }
  if (pathname === '/api/plugin-update' && method === 'POST') {
    return executePluginUpdateAction();
  }
  return {
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not found' }),
  };
}

app.api(
  '/api/telemetry',
  async (data, req) => {
    if (!isLocalHostRequest(req)) {
      return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
        status: 403,
        contentType: 'application/json',
      });
    }
    const out = await executeTelemetryAction(data);
    return new Response(out.body, {
      status: out.status,
      contentType: out.contentType,
      headers: out.headers,
    });
  },
  'GET'
);

app.api('/api/settings', (data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const out = executeSettingsAction(data);
  if (!out.ok) {
    return new Response(out.body, {
      status: out.status,
      contentType: out.contentType,
      headers: out.headers,
    });
  }
  return out.updated;
});

app.api('/api/cloud-sync', async (_data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const out = await executeCloudSyncAction();
  return new Response(out.body, {
    status: out.status,
    contentType: out.contentType,
    headers: out.headers,
  });
});

app.api('/api/plugin-update', async (_data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const out = await executePluginUpdateAction();
  return new Response(out.body, {
    status: out.status,
    contentType: out.contentType,
    headers: out.headers,
  });
});

app.run();
if (LS_ADDR && LS_ADDR !== 'test.invalid') {
  syncCloudCatalog({ force: false }).catch(() => {});
  startDefaultWindowBridge({
    handleApiRequest: dispatchBridgeApiRequest,
    readAssetFn: readLocalAsync,
    bootBundleVersion,
    onVersionDrift: () => scheduleSidecarRestart(150),
  });
}
