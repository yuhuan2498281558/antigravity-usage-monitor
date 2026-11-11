/**
 * @fileoverview Antigravity Language Server Connect RPC 客户端与官方配额摘要缓存。
 *
 * 负责：
 * 1. 向本地 Language Server 发起带 CSRF 鉴权与超时保护的 Connect RPC 调用 (`callLsRpc`)；
 * 2. 拉取并缓存 `RetrieveUserQuotaSummary` 官方实时配额摘要（常规轮询使用 10 秒短期缓存与失败退避冷却，
 *    并在缓存过期或强制刷新时穿透 `language_server.exe` 内部 3 分钟陈旧缓存）。
 */

import { CSRF_TOKEN, LS_BASE_URL, quotaSummaryCache } from './config.mjs';

const QUOTA_CACHE_TTL_MS = 10_000;
const QUOTA_RETRY_COOLDOWN_MS = 5_000;

/**
 * 调用本地 `LanguageServerService` 的指定 RPC 方法。
 *
 * @param {string} method RPC 方法名（如 `'GetUserStatus'`、`'GetCascadeTrajectory'`）
 * @param {object} [body={}] 请求 JSON 载荷
 * @param {number} [timeoutMs=5000] 超时时间（毫秒）
 * @returns {Promise<object>}
 */
export async function callLsRpc(method, body = {}, timeoutMs = 5000) {
  if (!LS_BASE_URL) {
    throw new Error('Language Server address (ANTIGRAVITY_LS_ADDRESS) is not configured');
  }
  const res = await fetch(
    `${LS_BASE_URL}/exa.language_server_pb.LanguageServerService/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': CSRF_TOKEN || '',
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
 * - 常规轮询发生网络失败或空载荷时进入 5 秒冷却退避，避免每 2 秒重复超时阻塞；
 * - 当超过 TTL 或传入 `forceRefresh = true`（如手动刷新或检测到账号切换）时，
 *   向 LS 传递 `{ forceRefresh: true }`，绕过 `language_server.exe` 自身的 3 分钟缓存。
 *
 * @param {boolean} [forceRefresh=false] 是否强制穿透本地缓存与失败冷却
 * @returns {Promise<{data: object|null, fetchedAtMs: number, isStale: boolean, refreshFailed: boolean, error: string|null, fromCache: boolean}>}
 */
export async function getOfficialQuotaSummary(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && quotaSummaryCache.data && now - quotaSummaryCache.ts < QUOTA_CACHE_TTL_MS) {
    return {
      data: quotaSummaryCache.data,
      fetchedAtMs: quotaSummaryCache.ts,
      isStale: false,
      refreshFailed: false,
      error: null,
      fromCache: true,
    };
  }
  if (
    !forceRefresh &&
    quotaSummaryCache.lastAttemptTs > 0 &&
    now - quotaSummaryCache.lastAttemptTs < QUOTA_RETRY_COOLDOWN_MS &&
    quotaSummaryCache.error
  ) {
    return {
      data: quotaSummaryCache.data,
      fetchedAtMs: quotaSummaryCache.ts || 0,
      isStale: Boolean(quotaSummaryCache.data),
      refreshFailed: true,
      error: quotaSummaryCache.error,
      fromCache: true,
    };
  }

  quotaSummaryCache.lastAttemptTs = now;
  try {
    const res = await callLsRpc('RetrieveUserQuotaSummary', { forceRefresh: true }, 6000);
    const payload = res?.response !== undefined ? res.response : res;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const normalized =
        Array.isArray(payload.groups) || Array.isArray(payload.buckets)
          ? payload
          : { ...payload, groups: [] };
      quotaSummaryCache.ts = now;
      quotaSummaryCache.data = normalized;
      quotaSummaryCache.error = null;
      return {
        data: normalized,
        fetchedAtMs: now,
        isStale: false,
        refreshFailed: false,
        error: null,
        fromCache: false,
      };
    }
    quotaSummaryCache.error = 'Quota summary empty';
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
    fromCache: false,
  };
}
