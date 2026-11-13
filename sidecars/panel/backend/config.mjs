/**
 * @fileoverview 后端全局路径常量、默认配置、JSON 持久化工具与运行时共享状态容器。
 *
 * 负责统一管理：
 * 1. 插件根目录 (`PLUGIN_ROOT`)、面板目录 (`HERE`) 与持久化数据目录 (`DATA_DIR`) 的路径解析；
 * 2. Language Server RPC 连接参数 (`LS_ADDR` / `LS_BASE_URL` / `CSRF_TOKEN`) 与 GitHub 云端价格表地址；
 * 3. 安全的 JSON 读写封装 (`loadJson` / `saveJson`) 与用户设置合并 (`loadSettings`)；
 * 4. 跨子系统共享的内存态缓存容器（采用对象属性就地更新设计，兼容 ES Module 与 VM 沙箱）。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferCompactionStepModels, normalizeCachedStep } from '../speed-metrics.mjs';

/**
 * 自适应解析 `sidecars/panel` 目录路径：
 * - 在真实 Node ESM 运行时中，本文件位于 `sidecars/panel/backend/config.mjs`，向上取一级即为 `sidecars/panel`；
 * - 在 `backend-harness.mjs` 单元测试沙箱中，`fileURLToPath` 返回 `.../sidecars/panel/main.mjs`，当前目录即为 `sidecars/panel`。
 */
const rawModuleDir = dirname(fileURLToPath(import.meta.url));
export const HERE = /[\\/]backend$/i.test(rawModuleDir) ? dirname(rawModuleDir) : rawModuleDir;
export const PLUGIN_ROOT = dirname(dirname(HERE));
export const PLUGIN_MANIFEST_FILE = join(PLUGIN_ROOT, 'plugin.json');
export const LOCAL_CATALOG_FILE = join(PLUGIN_ROOT, 'pricing-catalog.json');

/**
 * 插件持久化数据目录（默认由 Antigravity 宿主注入 `~/.gemini/antigravity/sidecar_data/usage-monitor`）。
 * 存放用户偏好设置、历史轨迹缓存及云端价格表缓存，插件升级不会清除此目录。
 */
export const DATA_DIR = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR || join(HERE, '.data');
export const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
export const CACHE_FILE = join(DATA_DIR, 'trajectory_usage_cache.json');
export const REMOTE_CATALOG_CACHE_FILE = join(DATA_DIR, 'remote_pricing_cache.json');

/**
 * 本地对话记录目录与跨端深层统计缓存路径候选列表。
 */
export const CONVERSATIONS_DIR = join(homedir(), '.gemini', 'antigravity', 'conversations');
export const BRAIN_DIR = join(homedir(), '.gemini', 'antigravity', 'brain');
export const DEEP_STATS_CACHE_CANDIDATES = [
  join(homedir(), '.gemini', 'antigravity-ide', 'brain', '.deep_stats_cache.json'),
  join(homedir(), '.gemini', 'antigravity', 'brain', '.deep_stats_cache.json'),
  join(homedir(), '.gemini', 'antigravity-idea', 'brain', '.deep_stats_cache.json'),
];

/**
 * Antigravity 本地 Language Server Connect RPC 端点与鉴权 Token（自动剥离重复协议前缀与尾部斜杠）。
 */
const rawLsAddr = String(process.env.ANTIGRAVITY_LS_ADDRESS || '').trim();
const LS_PROTOCOL = /^https:\/\//i.test(rawLsAddr) ? 'https' : 'http';
export const LS_ADDR = rawLsAddr.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
export const LS_BASE_URL = LS_ADDR ? `${LS_PROTOCOL}://${LS_ADDR}` : '';
export const CSRF_TOKEN = process.env.ANTIGRAVITY_CSRF_TOKEN;

/**
 * GitHub 官方云端价格目录与插件发布包地址配置。
 */
export const OFFICIAL_GITHUB_REPO = 'yuhuan-dev/antigravity-usage-monitor';
export const LEGACY_GITHUB_REPOS = Object.freeze([
  'yuhuan2498281558/antigravity-usage-monitor',
]);
export const CLOUD_CATALOG_URLS = [
  `https://raw.githubusercontent.com/${OFFICIAL_GITHUB_REPO}/main/pricing-catalog.json`,
];
export const DEFAULT_RELEASE_URL =
  `https://github.com/${OFFICIAL_GITHUB_REPO}/releases/latest`;
export const DEFAULT_DOWNLOAD_URL =
  `https://github.com/${OFFICIAL_GITHUB_REPO}/releases/latest/download/usage-monitor.zip`;
export const DEFAULT_ARCHIVE_FALLBACK_URL =
  `https://codeload.github.com/${OFFICIAL_GITHUB_REPO}/zip/refs/heads/main`;

/** 云端目录常规自动检查间隔（6 小时）与失败冷却时间（5 分钟）。 */
export const CLOUD_SYNC_TTL_MS = 6 * 3600 * 1000;
export const CLOUD_SYNC_RETRY_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * 顶栏右侧精简胶囊三槽位允许配置的指标枚举与默认顺序。
 */
export const TOPBAR_SLOT_KEYS = Object.freeze([
  'context',
  'tps',
  'ttft',
  'cost',
  'quota_auto',
  'gemini_5h',
  'gemini_weekly',
  'claude_5h',
  'claude_weekly',
  'none',
]);

export const DEFAULT_TOPBAR_SLOTS = Object.freeze(['context', 'tps', 'quota_auto']);

export const PLUGIN_UPDATE_MODES = Object.freeze(['off', 'manual', 'auto']);

export const ORCHESTRATOR_ID_MODES = Object.freeze(['compact', 'full']);

/**
 * 归一化 Orchestrator 系列模型 ID 显示风格（`'compact'` 精简代号 vs `'full'` 完整模型 ID，默认 `'compact'`）。
 *
 * @param {unknown} mode
 * @returns {'compact'|'full'}
 */
export function normalizeOrchestratorIdMode(mode) {
  const m = String(mode ?? '').trim().toLowerCase();
  return m === 'full' ? 'full' : 'compact';
}

/**
 * 归一化插件更新策略枚举（兼容历史 `autoUpdatePlugin` 布尔开关，默认 `'manual'`）。
 *
 * @param {unknown} mode
 * @param {unknown} [legacyAutoUpdate]
 * @returns {'off'|'manual'|'auto'}
 */
export function normalizePluginUpdateMode(mode, legacyAutoUpdate) {
  const m = String(mode ?? '').trim().toLowerCase();
  if (m === 'off' || m === 'manual' || m === 'auto') return m;
  if (legacyAutoUpdate === true) return 'auto';
  return 'manual';
}

/**
 * 归一化顶栏三槽位配置数组，兜底非法枚举值并保证至少保留一个可见槽位。
 *
 * @param {unknown} raw
 * @returns {[string, string, string]}
 */
export function normalizeTopbarCapsuleSlots(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const slots = [0, 1, 2].map((idx) => {
    const val = String(arr[idx] ?? '').trim();
    return TOPBAR_SLOT_KEYS.includes(val) ? val : DEFAULT_TOPBAR_SLOTS[idx];
  });
  if (slots.every((s) => s === 'none')) {
    slots[0] = 'context';
  }
  return /** @type {[string, string, string]} */ (slots);
}

/**
 * 用户可配置项的默认值。
 */
const DEFAULT_SETTINGS = {
  weeklyTokenBudget: 150000000, // 自定义每周 Token 预算默认值 (150M，保留底层兼容)
  weeklyCostBudget: 100,        // 自定义每周美元费用预算默认值 ($100，保留底层兼容)
  weeklyLimitMode: 'official',  // 'official' | 'custom_tokens' | 'custom_cost'
  showUpstreamModel: false,     // 是否显示上游真实 responseModel 名称
  orchestratorIdMode: 'compact', // 'compact' | 'full'（Orchestrator 系列显示精简 ID 或完整 ID）
  pluginUpdateMode: 'manual',   // 'off' | 'manual' | 'auto'（默认仅提示新版本，手动更新）
  autoUpdatePlugin: false,      // 派生自 pluginUpdateMode === 'auto'，保留底层兼容
  enableWindowOverlay: true,    // 是否启用双栖模式（自动通过 CDP 在主窗口顶栏挂载胶囊与悬浮面板）
  showTopbarMultiSession: true, // 是否在顶栏左侧显示实时运行会话入口
  topbarCapsuleSlots: [...DEFAULT_TOPBAR_SLOTS], // 顶栏右侧胶囊三槽位指标与顺序
};

/** 历史轨迹缓存 Schema 版本号，升级时触发旧缓存字段迁移校验。 */
export const CACHE_SCHEMA_VERSION = 'v10-model-identity';

/**
 * 判断输入值是否为非数组普通对象（Plain Object）。
 *
 * @param {unknown} v
 * @returns {boolean}
 */
export function isPlainObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 安全读取并解析本地 JSON 文件；文件不存在或解析失败时返回 `fallback`。
 *
 * @param {string} filePath 目标文件绝对路径
 * @param {*} fallback 失败时的回退值
 * @returns {*}
 */
export function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * 将数据序列化为格式化 JSON 并写入 `DATA_DIR` 下的指定文件。
 *
 * @param {string} filePath 目标文件绝对路径
 * @param {*} data 待写入的数据对象
 * @returns {boolean} 是否写入成功
 */
export function saveJson(filePath, data) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const serialized =
      filePath === CACHE_FILE ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    writeFileSync(filePath, serialized, 'utf8');
    return true;
  } catch (err) {
    console.error(`Failed writing ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * 归一化每周额度统计模式枚举（兼容历史简写 `'tokens'` / `'cost'` 与标准枚举 `'custom_tokens'` / `'custom_cost'`）。
 *
 * @param {unknown} mode
 * @returns {'official'|'custom_tokens'|'custom_cost'}
 */
export function normalizeWeeklyLimitMode(mode) {
  const m = String(mode || '').trim().toLowerCase();
  if (m === 'custom_tokens' || m === 'tokens') return 'custom_tokens';
  if (m === 'custom_cost' || m === 'cost') return 'custom_cost';
  return 'official';
}

function sanitizeSettingNumber(val, fallback) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

/**
 * 读取用户设置并与默认设置合并，同时剔除已废弃的历史字段并兜底非法数值。
 *
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadSettings() {
  const raw = loadJson(SETTINGS_FILE, {});
  const safeRaw = isPlainObject(raw) ? raw : {};
  const merged = { ...DEFAULT_SETTINGS, ...safeRaw };
  const pluginUpdateMode = normalizePluginUpdateMode(
    safeRaw.pluginUpdateMode,
    safeRaw.autoUpdatePlugin
  );
  return {
    weeklyTokenBudget: sanitizeSettingNumber(
      safeRaw.weeklyTokenBudget ?? safeRaw.weeklyTokenLimit ?? merged.weeklyTokenBudget,
      DEFAULT_SETTINGS.weeklyTokenBudget
    ),
    weeklyCostBudget: sanitizeSettingNumber(
      merged.weeklyCostBudget,
      DEFAULT_SETTINGS.weeklyCostBudget
    ),
    weeklyLimitMode: normalizeWeeklyLimitMode(merged.weeklyLimitMode),
    showUpstreamModel: merged.showUpstreamModel === true,
    orchestratorIdMode: normalizeOrchestratorIdMode(merged.orchestratorIdMode),
    pluginUpdateMode,
    autoUpdatePlugin: pluginUpdateMode === 'auto',
    enableWindowOverlay: merged.enableWindowOverlay !== false,
    showTopbarMultiSession: merged.showTopbarMultiSession !== false,
    topbarCapsuleSlots: normalizeTopbarCapsuleSlots(safeRaw.topbarCapsuleSlots),
  };
}

/**
 * 将浮点指标保留 1 位小数；非有限数值返回 `null`。
 *
 * @param {number} value
 * @returns {number|null}
 */
export function roundMetric(value) {
  return Number.isFinite(value) ? +value.toFixed(1) : null;
}

/**
 * 计算前端产物与后端源码文件的最大修改时间戳，用于插件热更新后触发客户端重载。
 *
 * @returns {string}
 */
export function computeRuntimeCodeVersion() {
  let maxMtime = 0;
  const candidates = [
    join(HERE, 'app.js'),
    join(HERE, 'styles.css'),
    join(HERE, 'main.mjs'),
    join(HERE, 'speed-metrics.mjs'),
    LOCAL_CATALOG_FILE,
  ];
  const backendDir = join(HERE, 'backend');
  try {
    if (existsSync(backendDir)) {
      for (const name of readdirSync(backendDir)) {
        if (name.endsWith('.mjs') || name.endsWith('.js')) {
          candidates.push(join(backendDir, name));
        }
      }
    }
  } catch {
    // 忽略目录列举异常
  }
  for (const file of candidates) {
    try {
      if (existsSync(file)) {
        const mtime = Math.floor(statSync(file).mtimeMs || 0);
        if (mtime > maxMtime) maxMtime = mtime;
      }
    } catch {
      // 忽略单文件 stat 异常
    }
  }
  return String(maxMtime || Date.now());
}

// ---------------------------------------------------------------------------
// 跨模块共享运行时状态容器（启动时自动完成历史轨迹缓存迁移与损坏结构防御）
// ---------------------------------------------------------------------------

const loadedTrajectoryCache = loadJson(CACHE_FILE, {});
let initialCacheMigrated =
  loadedTrajectoryCache !== null &&
  loadedTrajectoryCache !== undefined &&
  !isPlainObject(loadedTrajectoryCache);

const safeCacheEntries = [];
if (isPlainObject(loadedTrajectoryCache)) {
  for (const [id, entry] of Object.entries(loadedTrajectoryCache)) {
    if (!id || !isPlainObject(entry)) {
      initialCacheMigrated = true;
      continue;
    }
    const rawSteps = Array.isArray(entry.steps) ? entry.steps : [];
    if (!Array.isArray(entry.steps)) {
      initialCacheMigrated = true;
    }
    const objectSteps = rawSteps.filter((s) => isPlainObject(s));
    if (objectSteps.length !== rawSteps.length) {
      initialCacheMigrated = true;
    }
    const normalizedSteps = objectSteps.map((s) => {
      const norm = normalizeCachedStep(s);
      if (norm !== s) initialCacheMigrated = true;
      return norm;
    });
    const finalSteps = inferCompactionStepModels(normalizedSteps);
    for (let i = 0; i < finalSteps.length; i++) {
      if (finalSteps[i] !== normalizedSteps[i]) {
        initialCacheMigrated = true;
        break;
      }
    }
    safeCacheEntries.push([
      id,
      {
        ...entry,
        steps: finalSteps,
      },
    ]);
  }
}

/**
 * 内存中的会话轨迹步骤缓存：`cascadeId -> { signature, accountName, title, lastModifiedMs, diskMtimeMs, wasRunning, steps }`
 */
export const trajectoryCache = Object.fromEntries(safeCacheEntries);

/**
 * 缓存状态与外部深层统计缓存 Memo。
 */
export const cacheState = {
  needsSave: initialCacheMigrated,
};

export const externalDeepStatsMemo = {
  sig: '',
  convos: new Map(),
};

/** 并发请求去重表（防止同一参数并发重复拉取）。 */
export const inFlightRequests = new Map();

/** 官方配额摘要 10 秒短期缓存与失败退避冷却记录。 */
export const quotaSummaryCache = {
  ts: 0,
  lastAttemptTs: 0,
  accountName: '',
  data: null,
  error: null,
};

/** 云端价格与版本目录同步状态。 */
export const cloudSyncState = {
  catalogVersion: 'builtin',
  updatedAt: null,
  fetchedAtMs: 0,
  lastAttemptMs: 0,
  source: 'builtin', // 'builtin' | 'local' | 'remote'
  sourceUrl: '',
  latestPluginVersion: null,
  releaseUrl: DEFAULT_RELEASE_URL,
  downloadUrl: DEFAULT_DOWNLOAD_URL,
  archiveFallbackUrl: DEFAULT_ARCHIVE_FALLBACK_URL,
  isSyncing: false,
  lastError: null,
  inFlight: null,
};

/** 插件自更新执行状态。 */
export const pluginUpdateState = {
  isUpdating: false,
  inFlightIsAuto: false,
  lastAutoAttemptVersion: '',
  lastResult: null,
  lastError: null,
  inFlight: null,
};
