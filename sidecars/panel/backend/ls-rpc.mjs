/**
 * @fileoverview Antigravity Language Server Connect RPC 客户端与官方配额摘要缓存。
 *
 * 负责：
 * 1. 向本地 Language Server 发起带 CSRF 鉴权与超时保护的 Connect RPC 调用 (`callLsRpc`)；
 * 2. 拉取并缓存 `RetrieveUserQuotaSummary` 官方实时配额摘要（常规轮询使用 10 秒短期缓存，
 *    并在缓存过期或强制刷新时穿透 `language_server.exe` 内部 3 分钟陈旧缓存）；
 * 3. 维护全局 `StreamDiagnostics` 实例以采样流式事件时序。
 */

import { StreamDiagnostics } from '../stream-diagnostics.mjs';
import { CSRF_TOKEN, DATA_DIR, LS_ADDR, quotaSummaryCache } from './config.mjs';

/**
 * 全局流式传输诊断采样器实例。
 */
export const diagnostics = new StreamDiagnostics({
  dataDir: DATA_DIR,
  lsAddress: LS_ADDR,
  csrfToken: CSRF_TOKEN,
});

/**
 * 调用本地 `LanguageServerService` 的指定 RPC 方法。
 *
 * @param {string} method RPC 方法名（如 `'GetUserStatus'`、`'GetCascadeTrajectory'`）
 * @param {object} [body={}] 请求 JSON 载荷
 * @param {number} [timeoutMs=5000] 超时时间（毫秒）
 * @returns {Promise<object>}
 */
export async function callLsRpc(method, body = {}, timeoutMs = 5000) {
  const res = await fetch(
    `http://${LS_ADDR}/exa.language_server_pb.LanguageServerService/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': CSRF_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RPC ${method} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * 获取官方实时配额摘要（`RetrieveUserQuotaSummary`）。
 *
 * 缓存策略：
 * - 常规轮询在 10 秒内直接复用内存缓存，避免高频打满上游接口；
 * - 当超过 10 秒或传入 `forceRefresh = true`（如手动刷新或检测到账号切换）时，
 *   向 LS 传递 `{ forceRefresh: true }`，绕过 `language_server.exe` 自身的 3 分钟缓存。
 *
 * @param {boolean} [forceRefresh=false] 是否强制穿透本地 10 秒缓存
 * @returns {Promise<{data: object|null, fetchedAtMs: number, isStale: boolean, refreshFailed: boolean, error: string|null}>}
 */
export async function getOfficialQuotaSummary(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && quotaSummaryCache.data && now - quotaSummaryCache.ts < 10000) {
    return {
      data: quotaSummaryCache.data,
      fetchedAtMs: quotaSummaryCache.ts,
      isStale: false,
      refreshFailed: false,
      error: null,
    };
  }
  try {
    const res = await callLsRpc('RetrieveUserQuotaSummary', { forceRefresh: true }, 6000);
    const payload = res?.response || res;
    if (Array.isArray(payload?.groups) || Array.isArray(payload?.buckets)) {
      quotaSummaryCache.ts = now;
      quotaSummaryCache.data = payload;
      quotaSummaryCache.error = null;
      return {
        data: payload,
        fetchedAtMs: now,
        isStale: false,
        refreshFailed: false,
        error: null,
      };
    }
  } catch (err) {
    console.error(`RetrieveUserQuotaSummary failed: ${err.message}`);
    quotaSummaryCache.error = err.message;
  }
  return {
    data: quotaSummaryCache.data,
    fetchedAtMs: quotaSummaryCache.ts || 0,
    isStale: Boolean(quotaSummaryCache.data),
    refreshFailed: true,
    error: quotaSummaryCache.error || 'Quota RPC unavailable',
  };
}
