/**
 * @fileoverview 内置模型价格与占位符字典、Schema 安全清洗及三级目录合并（内置 + 本地 + 云端）。
 *
 * 价格口径与安全原则：
 * - 所有单价单位均为 USD / 1M Tokens（`input`: 未命中缓存输入, `cache`: 缓存读取, `output`: 输出与思考）；
 * - 价格仅用于本地 API 等效成本折算，不代表订阅配额的扣减比例；
 * - 未收录或身份未知的模型严格保持未定价状态（`null`），绝不借用其他模型价格，也绝不允许 `null`/`0` 伪价格混入；
 * - 版本号与更新包 URL 均经过严格格式与可信 GitHub 域名白名单校验。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseIsoMs } from '../speed-metrics.mjs';
import {
  DEFAULT_ARCHIVE_FALLBACK_URL,
  DEFAULT_DOWNLOAD_URL,
  DEFAULT_RELEASE_URL,
  LOCAL_CATALOG_FILE,
  PLUGIN_MANIFEST_FILE,
  PLUGIN_ROOT,
  REMOTE_CATALOG_CACHE_FILE,
  cloudSyncState,
  loadJson,
  pluginUpdateState,
} from './config.mjs';

/**
 * 代码内置兜底模型价格字典（当本地与云端目录均不可用时的离线基准）。
 */
export const BUILTIN_MODEL_PRICING = {
  // Gemini 4 & 3.x & 2.5 官方目录价格 (USD / 1M tokens)
  'gemini-4-argon-high': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-high', family: 'Gemini' },
  'gemini-4-argon-medium': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4', family: 'Gemini' },
  'gemini-4-argon-low': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4-low', family: 'Gemini' },
  'gemini-4-argon': { input: 2.00, cache: 0.10, output: 10.0, short: 'argon-4', family: 'Gemini' },
  'gemini-3.8-flash-high': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8-high', family: 'Gemini' },
  'gemini-3.8-flash-medium': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.8-flash-low': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-3.8-low', family: 'Gemini' },
  'gemini-3.8-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.8', family: 'Gemini' },
  'gemini-3.7-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.7', family: 'Gemini' },
  'gemini-3.6-flash': { input: 0.75, cache: 0.075, output: 3.75, short: 'flash-3.6', family: 'Gemini' },
  'gemini-3.5-flash': { input: 1.50, cache: 0.15, output: 9.00, short: 'flash-3.5', family: 'Gemini' },
  'gemini-3.5-flash-lite': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-3.5-lite', family: 'Gemini' },
  'gemini-3.1-pro': { input: 2.00, cache: 0.20, output: 12.0, short: 'pro-3.1', family: 'Gemini' },
  'gemini-3.1-flash-lite': { input: 0.25, cache: 0.025, output: 1.50, short: 'flash-3.1-lite', family: 'Gemini' },
  'gemini-3-flash': { input: 0.50, cache: 0.05, output: 3.00, short: 'flash-3', family: 'Gemini' },
  'gemini-2.5-pro': { input: 1.25, cache: 0.125, output: 10.0, short: 'pro-2.5', family: 'Gemini' },
  'gemini-2.5-flash': { input: 0.30, cache: 0.03, output: 2.50, short: 'flash-2.5', family: 'Gemini' },
  'gemini-2.5-flash-lite': { input: 0.10, cache: 0.01, output: 0.40, short: 'flash-2.5-lite', family: 'Gemini' },

  // Claude 4.5 / 4.6 / 4.7 / 4.8 / 5.x 官方目录价格
  'claude-fable-5-1': { input: 10.0, cache: 0.25, output: 50.0, short: 'fable-5.1', family: 'Claude' },
  'claude-fable-5': { input: 10.0, cache: 1.00, output: 50.0, short: 'fable-5', family: 'Claude' },
  'claude-opus-5-5': { input: 4.00, cache: 0.20, output: 20.0, short: 'opus-5.5', family: 'Claude' },
  'claude-opus-5': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-5', family: 'Claude' },
  'claude-opus-4-8': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.8', family: 'Claude' },
  'claude-opus-4-7': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.7', family: 'Claude' },
  'claude-opus-4-6-thinking': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus', family: 'Claude' },
  'claude-opus-4-6': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.6', family: 'Claude' },
  'claude-opus-4-5': { input: 5.00, cache: 0.50, output: 25.0, short: 'opus-4.5', family: 'Claude' },
  'claude-sonnet-5-5': { input: 2.00, cache: 0.10, output: 10.0, short: 'sonnet-5.5', family: 'Claude' },
  'claude-sonnet-5': { input: 2.00, cache: 0.20, output: 10.0, short: 'sonnet-5', family: 'Claude' },
  'claude-sonnet-4-6': { input: 3.00, cache: 0.30, output: 15.0, short: 'sonnet', family: 'Claude' },
  'claude-sonnet-4-5': { input: 3.00, cache: 0.30, output: 15.0, short: 'sonnet-4.5', family: 'Claude' },
  'claude-haiku-5-5': { input: 0.10, cache: 0.01, output: 0.50, short: 'haiku-5.5', family: 'Claude' },
  'claude-haiku-4-5': { input: 1.00, cache: 0.10, output: 5.00, short: 'haiku-4.5', family: 'Claude' },

  // OpenAI / GPT 官方目录价格
  'gpt-6-astra': { input: 10.0, cache: 1.00, output: 50.0, short: 'gpt-6-astra', family: 'GPT' },
  'gpt-6.1-sol': { input: 2.00, cache: 0.10, output: 10.0, short: 'gpt-6.1-sol', family: 'GPT' },
  'gpt-6-sol': { input: 2.00, cache: 0.20, output: 10.0, short: 'gpt-6-sol', family: 'GPT' },
  'gpt-6-luna': { input: 0.10, cache: 0.01, output: 0.50, short: 'gpt-6-luna', family: 'GPT' },
  'gpt-5.6': { input: 4.00, cache: 0.40, output: 20.0, short: 'gpt-5.6', family: 'GPT' },
  'gpt-5.6-sol': { input: 4.00, cache: 0.40, output: 20.0, short: 'gpt-5.6-sol', family: 'GPT' },
  'gpt-5.6-terra': { input: 2.00, cache: 0.20, output: 12.0, short: 'gpt-5.6-terra', family: 'GPT' },
  'gpt-5.6-luna': { input: 0.20, cache: 0.02, output: 1.20, short: 'gpt-5.6-luna', family: 'GPT' },
  'gpt-5.5': { input: 5.00, cache: 0.50, output: 30.0, short: 'gpt-5.5', family: 'GPT' },
  'gpt-5.4': { input: 2.50, cache: 0.25, output: 15.0, short: 'gpt-5.4', family: 'GPT' },
  'gpt-5.4-mini': { input: 0.75, cache: 0.075, output: 4.50, short: 'gpt-5.4-mini', family: 'GPT' },
  'gpt-5.4-nano': { input: 0.20, cache: 0.02, output: 1.25, short: 'gpt-5.4-nano', family: 'GPT' },
  'gpt-5.3-codex': { input: 1.75, cache: 0.175, output: 14.0, short: 'gpt-5.3-codex', family: 'GPT' },
  'gpt-5.2': { input: 1.75, cache: 0.175, output: 14.0, short: 'gpt-5.2', family: 'GPT' },
  'gpt-5.1': { input: 1.25, cache: 0.125, output: 10.0, short: 'gpt-5.1', family: 'GPT' },
  'gpt-5': { input: 1.25, cache: 0.125, output: 10.0, short: 'gpt-5', family: 'GPT' },
  'gpt-5-mini': { input: 0.25, cache: 0.025, output: 2.00, short: 'gpt-5-mini', family: 'GPT' },
  'gpt-5-nano': { input: 0.05, cache: 0.005, output: 0.40, short: 'gpt-5-nano', family: 'GPT' },
  'gpt-4.1': { input: 2.00, cache: 0.50, output: 8.00, short: 'gpt-4.1', family: 'GPT' },
  'gpt-4.1-mini': { input: 0.40, cache: 0.10, output: 1.60, short: 'gpt-4.1-mini', family: 'GPT' },
  'gpt-4o': { input: 2.50, cache: 1.25, output: 10.0, short: 'gpt-4o', family: 'GPT' },
  'gpt-4o-mini': { input: 0.15, cache: 0.075, output: 0.60, short: 'gpt-4o-mini', family: 'GPT' },
  'o4-mini': { input: 1.10, cache: 0.275, output: 4.40, short: 'o4-mini', family: 'GPT' },
  'o3': { input: 2.00, cache: 0.50, output: 8.00, short: 'o3', family: 'GPT' },
  'o3-mini': { input: 1.10, cache: 0.55, output: 4.40, short: 'o3-mini', family: 'GPT' },
  'gpt-oss-120b-medium': { input: 0.80, cache: 0.10, output: 2.40, short: 'gpt-oss', family: 'GPT' },
};

/**
 * 代码内置兜底枚举占位符映射表（`MODEL_PLACEHOLDER_Mxxx` -> `modelId` & `label`）。
 */
export const BUILTIN_PLACEHOLDER_MAP = {
  MODEL_PLACEHOLDER_M417: { modelId: 'gemini-4-argon-high', label: 'Gemini 4 Argon (High)' },
  MODEL_PLACEHOLDER_M418: { modelId: 'gemini-4-argon-medium', label: 'Gemini 4 Argon (Medium)' },
  MODEL_PLACEHOLDER_M419: { modelId: 'gemini-4-argon-low', label: 'Gemini 4 Argon (Low)' },
  MODEL_PLACEHOLDER_M318: { modelId: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
  MODEL_PLACEHOLDER_M319: { modelId: 'gemini-3.8-flash-medium', label: 'Gemini 3.8 Flash (Medium)' },
  MODEL_PLACEHOLDER_M320: { modelId: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (Low)' },
  MODEL_PLACEHOLDER_M322: { modelId: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Tiered)' },
  MODEL_PLACEHOLDER_M198: { modelId: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  MODEL_PLACEHOLDER_M50: { modelId: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  MODEL_PLACEHOLDER_M18: { modelId: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE: { modelId: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  MODEL_GOOGLE_GEMINI_2_5_FLASH: { modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  MODEL_GOOGLE_GEMINI_2_5_PRO: { modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  MODEL_PLACEHOLDER_M26: { modelId: 'claude-opus-4-6-thinking', label: 'Claude Opus 4.6 (Thinking)' },
  MODEL_PLACEHOLDER_M35: { modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' },
  MODEL_OPENAI_GPT_OSS_120B_MEDIUM: { modelId: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B (Medium)' },
};

/**
 * 当前生效的模型价格表与占位符映射表（通过就地更新属性保持跨模块引用一致）。
 */
export const MODEL_PRICING = { ...BUILTIN_MODEL_PRICING };
export const PLACEHOLDER_MAP = { ...BUILTIN_PLACEHOLDER_MAP };

/**
 * 校验字符串是否为合法的 `X.Y.Z` 语义化版本号格式。
 *
 * @param {*} v
 * @returns {boolean}
 */
export function isValidSemver(v) {
  return typeof v === 'string' && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(v.trim());
}

/**
 * 校验更新/下载链接是否属于可信的 GitHub 官方 HTTPS 域名白名单。
 *
 * @param {*} rawUrl
 * @param {string} fallbackUrl
 * @returns {string}
 */
export function sanitizeTrustedGithubUrl(rawUrl, fallbackUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return fallbackUrl;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return fallbackUrl;
    const host = parsed.hostname.toLowerCase();
    const isTrustedHost =
      host === 'github.com' ||
      host === 'raw.githubusercontent.com' ||
      host === 'codeload.github.com' ||
      host === 'objects.githubusercontent.com';
    return isTrustedHost ? parsed.toString() : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

/**
 * 比较两个语义化版本号（如 `'1.5.0'` vs `'1.4.0'`）。
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} `1` 表示 `a > b`，`-1` 表示 `a < b`，`0` 表示相等
 */
export function compareSemver(a, b) {
  if (!isValidSemver(a) || !isValidSemver(b)) return 0;
  const parse = (v) =>
    String(v || '')
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => {
        const parsed = parseInt(n, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * 读取当前已安装插件的 `plugin.json` 版本号。
 *
 * @returns {string}
 */
export function readInstalledPluginVersion() {
  const manifest = loadJson(PLUGIN_MANIFEST_FILE, null);
  const ver = typeof manifest?.version === 'string' ? manifest.version.trim() : '';
  return isValidSemver(ver) ? ver.replace(/^v/i, '') : '1.4.0';
}

/**
 * 校验单条模型价格配置是否合法：
 * - `input`/`cache`/`output` 必须为原生 `number` 类型（阻止 `Number(null) === 0` 或 `Number("") === 0` 的隐式转换漏洞）；
 * - 数值必须非负且 `<= 10000`，且至少 `input > 0` 或 `output > 0`（拒绝全 0 伪价格将未定价模型篡改为 $0.00）；
 * - `short`/`family` 必须为非空字符串。
 */
function isValidPricingEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (
    typeof entry.input !== 'number' ||
    typeof entry.cache !== 'number' ||
    typeof entry.output !== 'number'
  ) {
    return false;
  }
  const { input, cache, output } = entry;
  if (!Number.isFinite(input) || input < 0 || input > 10000) return false;
  if (!Number.isFinite(cache) || cache < 0 || cache > 10000) return false;
  if (!Number.isFinite(output) || output < 0 || output > 10000) return false;
  if (input === 0 && output === 0) return false;
  if (typeof entry.short !== 'string' || !entry.short.trim()) return false;
  if (typeof entry.family !== 'string' || !entry.family.trim()) return false;
  return true;
}

/**
 * 校验单条枚举占位符映射是否合法。
 */
function isValidPlaceholderEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.modelId !== 'string' || !entry.modelId.trim()) return false;
  if (typeof entry.label !== 'string' || !entry.label.trim()) return false;
  return true;
}

/**
 * 清洗并校验来自本地或云端的 `pricing-catalog.json` 原始对象。
 * 任何格式不合法的单条记录会被自动过滤，防止异常数据污染内存价格表。
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function sanitizeCatalogPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pricing = {};
  let validPricingCount = 0;
  if (raw.pricing && typeof raw.pricing === 'object') {
    for (const [k, v] of Object.entries(raw.pricing)) {
      const key = String(k || '').trim();
      if (!key || !isValidPricingEntry(v)) continue;
      pricing[key] = {
        input: v.input,
        cache: v.cache,
        output: v.output,
        short: String(v.short).trim(),
        family: String(v.family).trim(),
      };
      validPricingCount++;
    }
  }

  const placeholders = {};
  let validPlaceholderCount = 0;
  if (raw.placeholders && typeof raw.placeholders === 'object') {
    for (const [k, v] of Object.entries(raw.placeholders)) {
      const key = String(k || '').trim();
      if (!key || !isValidPlaceholderEntry(v)) continue;
      placeholders[key] = {
        modelId: String(v.modelId).trim(),
        label: String(v.label).trim(),
      };
      validPlaceholderCount++;
    }
  }

  const rawLatestVer =
    typeof raw.latestPluginVersion === 'string' ? raw.latestPluginVersion.trim() : '';
  const latestPluginVersion = isValidSemver(rawLatestVer)
    ? rawLatestVer.replace(/^v/i, '')
    : null;
  if (validPricingCount === 0 && validPlaceholderCount === 0 && !latestPluginVersion) {
    return null;
  }

  return {
    schemaVersion: Number(raw.schemaVersion || 1),
    catalogVersion:
      typeof raw.catalogVersion === 'string' && raw.catalogVersion.trim()
        ? raw.catalogVersion.trim()
        : null,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : null,
    latestPluginVersion,
    releaseUrl: sanitizeTrustedGithubUrl(raw.releaseUrl, DEFAULT_RELEASE_URL),
    downloadUrl: sanitizeTrustedGithubUrl(raw.downloadUrl, DEFAULT_DOWNLOAD_URL),
    archiveFallbackUrl: sanitizeTrustedGithubUrl(
      raw.archiveFallbackUrl,
      DEFAULT_ARCHIVE_FALLBACK_URL
    ),
    fetchedAtMs: Number(raw.fetchedAtMs || 0),
    sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : '',
    pricing,
    placeholders,
  };
}

/**
 * 按「内置保底 -> 本地目录 -> 云端缓存（按 `updatedAt` 新旧自动裁决优先级）」三级合并重建内存价格表。
 */
export function rebuildActiveCatalog() {
  const localRaw = loadJson(LOCAL_CATALOG_FILE, null);
  const remoteRaw = loadJson(REMOTE_CATALOG_CACHE_FILE, null);
  const localCat = sanitizeCatalogPayload(localRaw);
  const remoteCat = sanitizeCatalogPayload(remoteRaw);

  const localUpdatedMs = parseIsoMs(localCat?.updatedAt);
  const remoteUpdatedMs = parseIsoMs(remoteCat?.updatedAt);

  const layers = [];
  if (localCat && remoteCat) {
    if (localUpdatedMs > remoteUpdatedMs) {
      layers.push({ kind: 'remote', cat: remoteCat }, { kind: 'local', cat: localCat });
    } else {
      layers.push({ kind: 'local', cat: localCat }, { kind: 'remote', cat: remoteCat });
    }
  } else if (remoteCat) {
    layers.push({ kind: 'remote', cat: remoteCat });
  } else if (localCat) {
    layers.push({ kind: 'local', cat: localCat });
  }

  const nextPricing = { ...BUILTIN_MODEL_PRICING };
  const nextPlaceholders = { ...BUILTIN_PLACEHOLDER_MAP };
  let activeSource = 'builtin';
  let catalogVersion = 'builtin';
  let updatedAt = null;
  const installedVersion = readInstalledPluginVersion();
  let latestPluginVersion = installedVersion;
  let releaseUrl = DEFAULT_RELEASE_URL;
  let downloadUrl = DEFAULT_DOWNLOAD_URL;
  let archiveFallbackUrl = DEFAULT_ARCHIVE_FALLBACK_URL;

  for (const { kind, cat } of layers) {
    Object.assign(nextPricing, cat.pricing);
    Object.assign(nextPlaceholders, cat.placeholders);
    activeSource = kind;
    if (cat.catalogVersion) catalogVersion = cat.catalogVersion;
    if (cat.updatedAt) updatedAt = cat.updatedAt;
    if (cat.latestPluginVersion) {
      // 以当前更高优先级层的 latestPluginVersion 为准，但永不低于本地已安装版本
      latestPluginVersion =
        compareSemver(cat.latestPluginVersion, installedVersion) > 0
          ? cat.latestPluginVersion
          : installedVersion;
    }
    if (cat.releaseUrl) releaseUrl = cat.releaseUrl;
    if (cat.downloadUrl) downloadUrl = cat.downloadUrl;
    if (cat.archiveFallbackUrl) archiveFallbackUrl = cat.archiveFallbackUrl;
  }

  for (const k of Object.keys(MODEL_PRICING)) delete MODEL_PRICING[k];
  Object.assign(MODEL_PRICING, nextPricing);

  for (const k of Object.keys(PLACEHOLDER_MAP)) delete PLACEHOLDER_MAP[k];
  Object.assign(PLACEHOLDER_MAP, nextPlaceholders);

  cloudSyncState.source = activeSource;
  cloudSyncState.catalogVersion = catalogVersion;
  cloudSyncState.updatedAt = updatedAt;
  cloudSyncState.fetchedAtMs = remoteCat?.fetchedAtMs || cloudSyncState.fetchedAtMs || 0;
  cloudSyncState.sourceUrl = remoteCat?.sourceUrl || cloudSyncState.sourceUrl || '';
  cloudSyncState.latestPluginVersion = latestPluginVersion;
  cloudSyncState.releaseUrl = releaseUrl;
  cloudSyncState.downloadUrl = downloadUrl;
  cloudSyncState.archiveFallbackUrl = archiveFallbackUrl;
}

// 模块初始化时立即构建一次当前生效的价格目录
rebuildActiveCatalog();

/**
 * 获取供前端展示的云端价格目录状态与插件更新状态快照。
 */
export function getCloudStatus() {
  const currentPluginVersion = readInstalledPluginVersion();
  const rawLatest = cloudSyncState.latestPluginVersion || currentPluginVersion;
  const latestPluginVersion =
    compareSemver(rawLatest, currentPluginVersion) > 0 ? rawLatest : currentPluginVersion;
  const updateAvailable = compareSemver(latestPluginVersion, currentPluginVersion) > 0;
  return {
    currentPluginVersion,
    latestPluginVersion,
    updateAvailable,
    installMode: existsSync(join(PLUGIN_ROOT, '.git')) ? 'git' : 'zip',
    releaseUrl: cloudSyncState.releaseUrl || DEFAULT_RELEASE_URL,
    downloadUrl: cloudSyncState.downloadUrl || DEFAULT_DOWNLOAD_URL,
    catalogVersion: cloudSyncState.catalogVersion || 'builtin',
    catalogUpdatedAt: cloudSyncState.updatedAt || null,
    lastSyncedAtMs: cloudSyncState.fetchedAtMs || 0,
    source: cloudSyncState.source || 'builtin',
    modelCount: Object.keys(MODEL_PRICING).length,
    placeholderCount: Object.keys(PLACEHOLDER_MAP).length,
    isSyncing: Boolean(cloudSyncState.isSyncing),
    lastSyncError: cloudSyncState.lastError || null,
    isUpdating: Boolean(pluginUpdateState.isUpdating),
    lastUpdateResult: pluginUpdateState.lastResult || null,
    lastUpdateError: pluginUpdateState.lastError || null,
  };
}
