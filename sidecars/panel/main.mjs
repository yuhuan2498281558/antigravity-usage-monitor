/**
 * @fileoverview Antigravity Usage Monitor 面板 Sidecar HTTP 服务入口。
 *
 * 职责边界：
 * - 提供前端静态资产路由（`/`、`/app.js`、`/styles.css`）；
 * - 提供本地 Loopback 受保护的 JSON API 路由：
 *   - `GET /api/telemetry`：获取实时配额、当前会话指标与历史聚合遥测数据；
 *   - `POST /api/settings`：保存用户偏好设置；
 *   - `POST /api/cloud-sync`：立即从 GitHub 同步最新云端价格目录与版本信息；
 *   - `POST /api/plugin-update`：一键执行插件自更新（Git / Release ZIP 双通道）；
 *   - `GET / POST /api/diagnostics`：查询或配置流式传输诊断采样器；
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
  loadSettings,
  saveJson,
} from './backend/config.mjs';
import { diagnostics } from './backend/ls-rpc.mjs';
import { performPluginUpdate, syncCloudCatalog } from './backend/plugin-updater.mjs';
import { getCloudStatus } from './backend/pricing-catalog.mjs';
import { buildTelemetryPayload } from './backend/telemetry-builder.mjs';

const app = new SidecarApp();

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
 * 校验请求是否来自本机回环地址 (`127.0.0.1` / `localhost` / `[::1]`) 或受信 Webview Origin，
 * 防止跨站 DNS Rebinding 或局域网未授权访问。
 *
 * @param {object} req
 * @returns {boolean}
 */
function isLocalHostRequest(req) {
  if (!req?.headers) return true;
  const host = String(req.headers.host || '').toLowerCase();
  if (host && !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) {
    return false;
  }
  const origin = String(req.headers.origin || '').toLowerCase();
  if (
    origin &&
    !/^(https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?|vscode-webview:\/\/)/.test(origin)
  ) {
    return false;
  }
  return true;
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

app.api(
  '/styles.css',
  async () =>
    new Response(await readLocalAsync('styles.css'), {
      contentType: 'text/css; charset=utf-8',
      headers: NO_STORE_HEADERS,
    }),
  'GET'
);

// ---------------------------------------------------------------------------
// 业务数据与控制 API 路由
// ---------------------------------------------------------------------------

app.api(
  '/api/telemetry',
  async (data, req) => {
    if (!isLocalHostRequest(req)) {
      return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
        status: 403,
        contentType: 'application/json',
      });
    }
    const convId = data?.conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID || '';
    const force = data?.force === '1' || data?.force === true;
    if (LS_ADDR !== 'test.invalid') {
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
      startMs: data?.startMs ? Number(data.startMs) : 0,
      endMs: data?.endMs ? Number(data.endMs) : 0,
    };
    const payload = await buildTelemetryPayload(convId, force, filterOpts);
    return new Response(JSON.stringify(payload), {
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
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
  const current = loadSettings();
  const updated = {
    ...current,
    contextWindowLimit: Number(data.contextWindowLimit || current.contextWindowLimit),
    weeklyTokenBudget: Number(data.weeklyTokenBudget || current.weeklyTokenBudget),
    weeklyCostBudget: Number(data.weeklyCostBudget || current.weeklyCostBudget),
    weeklyLimitMode: data.weeklyLimitMode || current.weeklyLimitMode,
    showUpstreamModel:
      typeof data.showUpstreamModel === 'boolean'
        ? data.showUpstreamModel
        : Boolean(current.showUpstreamModel),
    autoUpdatePlugin:
      typeof data.autoUpdatePlugin === 'boolean'
        ? data.autoUpdatePlugin
        : Boolean(current.autoUpdatePlugin),
  };
  saveJson(SETTINGS_FILE, updated);
  return updated;
});

app.api('/api/cloud-sync', async (_data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const cloudStatus = await syncCloudCatalog({ force: true });
  return new Response(JSON.stringify({ ok: !cloudStatus.lastSyncError, cloudStatus }), {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
  });
});

app.api('/api/plugin-update', async (_data, req) => {
  if (!isLocalHostRequest(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden host or origin' }), {
      status: 403,
      contentType: 'application/json',
    });
  }
  const result = await performPluginUpdate({ isAuto: false });
  return new Response(JSON.stringify({ ...result, cloudStatus: getCloudStatus() }), {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
  });
});

app.api(
  '/api/diagnostics',
  (_data, req) => {
    if (!isLocalHostRequest(req)) return new Response('Forbidden host or origin', { status: 403 });
    return new Response(JSON.stringify(diagnostics.status()), {
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  'GET'
);

app.api('/api/diagnostics', (data, req) => {
  if (!isLocalHostRequest(req)) return new Response('Forbidden host or origin', { status: 403 });
  try {
    return diagnostics.configure({
      enabled: data?.enabled,
      conversationId: data?.conversationId || '',
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error.message === 'invalid_diagnostic_config'
            ? 'Invalid diagnostic settings'
            : 'Could not save diagnostic settings',
      }),
      {
        status: error.message === 'invalid_diagnostic_config' ? 400 : 500,
        contentType: 'application/json',
      }
    );
  }
});

app.run();
diagnostics.start();
if (LS_ADDR !== 'test.invalid') {
  syncCloudCatalog({ force: false }).catch(() => {});
}
