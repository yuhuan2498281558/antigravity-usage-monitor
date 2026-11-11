/**
 * @fileoverview 模型价格与占位符目录加载、Schema 安全清洗及本地/云端目录合并。
 *
 * 价格口径与安全原则：
 * - 所有单价单位均为 USD / 1M Tokens（`input`: 未命中缓存输入, `cache`: 缓存读取, `output`: 输出与思考）；
 * - 价格仅用于本地 API 等效成本折算，不代表订阅配额的扣减比例；
 * - 离线基准统一从随包发布的 `pricing-catalog.json` 读取，避免在 JS 源码中重复维护双份硬编码字典；
 * - 未收录或身份未知的模型严格保持未定价状态（`null`），绝不借用其他模型价格，也绝不允许 `null`/`0` 伪价格混入；
 * - 版本号（遵循 SemVer 2.0）与更新包 URL 均经过严格格式与可信 GitHub 域名白名单校验。
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
 * 当前生效的模型价格表与占位符映射表（通过就地更新属性保持跨模块引用一致）。
 */
export const MODEL_PRICING = {};
export const PLACEHOLDER_MAP = {};

/**
 * 校验字符串是否为合法的 SemVer 2.0 语义化版本号格式（支持 `-prerelease` 与 `+build` 元数据）。
 *
 * @param {*} v
 * @returns {boolean}
 */
export function isValidSemver(v) {
  return (
    typeof v === 'string' &&
    /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(v.trim())
  );
}

const OFFICIAL_REPO_PATH_PREFIX = '/yuhuan2498281558/antigravity-usage-monitor';

/**
 * 校验更新/下载链接是否属于可信的 GitHub 官方仓库与 HTTPS 域名白名单。
 *
 * @param {*} rawUrl
 * @param {string} fallbackUrl
 * @returns {string}
 */
function sanitizeTrustedGithubUrl(rawUrl, fallbackUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return fallbackUrl;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return fallbackUrl;
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    if (
      host === 'github.com' ||
      host === 'raw.githubusercontent.com' ||
      host === 'codeload.github.com'
    ) {
      const hasRepoPrefix =
        pathname === OFFICIAL_REPO_PATH_PREFIX ||
        pathname.startsWith(`${OFFICIAL_REPO_PATH_PREFIX}/`);
      return hasRepoPrefix ? parsed.toString() : fallbackUrl;
    }
    return fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

/**
 * 按 SemVer 2.0 规范（§10 忽略 `+build` 元数据，§11.4 按 ASCII 码序与纯数字段逐级比较预发布标签）比较两个版本号。
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} `1` 表示 `a > b`，`-1` 表示 `a < b`，`0` 表示相等
 */
export function compareSemver(a, b) {
  if (!isValidSemver(a) || !isValidSemver(b)) return 0;
  const parse = (v) => {
    const cleaned = String(v || '')
      .trim()
      .replace(/^v/i, '')
      .replace(/\+.*$/, '');
    const dashIdx = cleaned.indexOf('-');
    const coreStr = dashIdx >= 0 ? cleaned.slice(0, dashIdx) : cleaned;
    const preStr = dashIdx >= 0 ? cleaned.slice(dashIdx + 1) : '';
    const core = coreStr.split('.').map((n) => {
      const parsed = parseInt(n, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    });
    return { core, pre: preStr };
  };
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.core.length, pb.core.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa.core[i] || 0;
    const vb = pb.core[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  if (!pa.pre && !pb.pre) return 0;
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && !pb.pre) return -1;

  const idsA = pa.pre.split('.');
  const idsB = pb.pre.split('.');
  const minLen = Math.min(idsA.length, idsB.length);
  for (let i = 0; i < minLen; i++) {
    const idA = idsA[i];
    const idB = idsB[i];
    if (idA === idB) continue;
    const numA = /^\d+$/.test(idA);
    const numB = /^\d+$/.test(idB);
    if (numA && numB) {
      const bigA = BigInt(idA);
      const bigB = BigInt(idB);
      if (bigA !== bigB) return bigA > bigB ? 1 : -1;
      continue;
    }
    // SemVer 2.0 §11.4.1：纯数字标识符的优先级始终低于含字母标识符
    if (numA && !numB) return -1;
    if (!numA && numB) return 1;
    // SemVer 2.0 §11.4.2：含字母标识符按 ASCII 字节序比较
    return idA < idB ? -1 : 1;
  }
  if (idsA.length === idsB.length) return 0;
  return idsA.length > idsB.length ? 1 : -1;
}

/**
 * 读取当前已安装插件的 `plugin.json` 版本号。
 *
 * @returns {string}
 */
export function readInstalledPluginVersion() {
  const manifest = loadJson(PLUGIN_MANIFEST_FILE, null);
  const ver = typeof manifest?.version === 'string' ? manifest.version.trim() : '';
  return isValidSemver(ver) ? ver.replace(/^v/i, '') : '1.4.3';
}

function normalizeModelFamily(rawFamily) {
  const f = String(rawFamily || '').trim();
  const lower = f.toLowerCase();
  if (lower === 'gemini' || lower === 'google') return 'Gemini';
  if (lower === 'claude' || lower === 'anthropic') return 'Claude';
  if (lower === 'gpt' || lower === 'openai') return 'GPT';
  if (lower === 'other') return 'Other';
  return f;
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
        family: normalizeModelFamily(v.family),
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

  const explicitReleaseUrl = sanitizeTrustedGithubUrl(raw.releaseUrl, '');
  const explicitDownloadUrl = sanitizeTrustedGithubUrl(raw.downloadUrl, '');
  const explicitArchiveUrl = sanitizeTrustedGithubUrl(raw.archiveFallbackUrl, '');

  return {
    schemaVersion: Number(raw.schemaVersion || 1),
    catalogVersion:
      typeof raw.catalogVersion === 'string' && raw.catalogVersion.trim()
        ? raw.catalogVersion.trim()
        : null,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : null,
    latestPluginVersion,
    releaseUrl: explicitReleaseUrl || DEFAULT_RELEASE_URL,
    downloadUrl: explicitDownloadUrl || DEFAULT_DOWNLOAD_URL,
    archiveFallbackUrl: explicitArchiveUrl || DEFAULT_ARCHIVE_FALLBACK_URL,
    hasReleaseUrl: Boolean(explicitReleaseUrl),
    hasDownloadUrl: Boolean(explicitDownloadUrl),
    hasArchiveFallbackUrl: Boolean(explicitArchiveUrl),
    fetchedAtMs: Number(raw.fetchedAtMs || 0),
    sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : '',
    pricing,
    placeholders,
  };
}

/**
 * 按「随包本地目录 -> 云端缓存（按 `updatedAt` 新旧自动裁决优先级）」合并重建内存价格表。
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

  const nextPricing = {};
  const nextPlaceholders = {};
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
    if (kind === 'remote' || cat.catalogVersion || cat.updatedAt) {
      activeSource = kind;
    }
    if (cat.catalogVersion) catalogVersion = cat.catalogVersion;
    if (cat.updatedAt) updatedAt = cat.updatedAt;
    if (cat.latestPluginVersion) {
      // 以当前更高优先级层的 latestPluginVersion 为准，但永不低于本地已安装版本
      latestPluginVersion =
        compareSemver(cat.latestPluginVersion, installedVersion) > 0
          ? cat.latestPluginVersion
          : installedVersion;
    }
    if (cat.hasReleaseUrl) releaseUrl = cat.releaseUrl;
    if (cat.hasDownloadUrl) downloadUrl = cat.downloadUrl;
    if (cat.hasArchiveFallbackUrl) archiveFallbackUrl = cat.archiveFallbackUrl;
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
