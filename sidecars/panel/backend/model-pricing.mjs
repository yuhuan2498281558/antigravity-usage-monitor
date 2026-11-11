/**
 * @fileoverview 模型身份识别、展示名称规范化与单步 API 等效成本计算。
 *
 * 核心原则：
 * 1. 优先融合服务端下发的动态模型目录 (`dynamicModelMap`)、静态占位符表 (`PLACEHOLDER_MAP`)
 *    与真实响应模型 (`responseModel`)，并优先匹配含档位后缀的精确价格条目；
 * 2. 价格未知或模型身份无法确认时，严格返回 `pricing: null` 与 `costUsd: null`，
 *    绝不借用其他模型单价伪造费用。
 */

import { MODEL_PRICING, PLACEHOLDER_MAP } from './pricing-catalog.mjs';

/**
 * 根据 API 提供商枚举或模型标识符推断所属模型家族（`'Gemini'` | `'Claude'` | `'GPT'` | `'Other'`）。
 * 注意：先匹配更具体的 `ANTHROPIC`/`CLAUDE` 与 `OPENAI`/`GPT`（含 `o1`/`o3`/`o4` 系列），
 * 防止 `API_PROVIDER_GOOGLE_VERTEX_ANTHROPIC` 被宽泛的 `GOOGLE` 子串抢先误判为 `'Gemini'`。
 *
 * @param {string} [rawModelKey=''] 原始模型键名或占位符
 * @param {string} [modelId=''] 规范化模型 ID
 * @param {string} [apiProvider=''] 上游 API 提供商枚举字符串
 * @returns {'Gemini'|'Claude'|'GPT'|'Other'}
 */
function inferFamilyFromProviderOrKey(rawModelKey = '', modelId = '', apiProvider = '') {
  const prov = String(apiProvider || '').toUpperCase();
  if (prov.includes('ANTHROPIC') || prov.includes('CLAUDE')) return 'Claude';
  if (prov.includes('OPENAI') || prov.includes('GPT')) return 'GPT';
  if (prov.includes('GEMINI') || prov.includes('GOOGLE')) return 'Gemini';

  const combined = `${rawModelKey} ${modelId}`.toUpperCase();
  if (
    combined.includes('ANTHROPIC') ||
    combined.includes('CLAUDE') ||
    combined.includes('FABLE') ||
    combined.includes('SONNET') ||
    combined.includes('OPUS') ||
    combined.includes('HAIKU')
  ) {
    return 'Claude';
  }
  if (
    combined.includes('GPT') ||
    combined.includes('OPENAI') ||
    /\bO[134](?:[-_\s]|$)/.test(combined)
  ) {
    return 'GPT';
  }
  if (
    combined.includes('GEMINI') ||
    combined.includes('CARBON') ||
    combined.includes('ARGON') ||
    combined.includes('FLASH') ||
    combined.includes('GOOGLE')
  ) {
    return 'Gemini';
  }
  return 'Other';
}

/**
 * 判断一组模型标识字段是否指向 Gemini 4 Argon 系列模型（含 M417/M418/M419 枚举）。
 *
 * @param {...string} parts 待检测的标识片段
 * @returns {boolean}
 */
export function isArgonModelIdentifier(...parts) {
  return /argon|MODEL_PLACEHOLDER_M41[789]\b/i.test(parts.filter(Boolean).join(' '));
}

/**
 * 判断一组模型标识字段是否指向 Gemini 4 Carbon 系列模型（含 M429 枚举）。
 *
 * @param {...string} parts 待检测的标识片段
 * @returns {boolean}
 */
export function isCarbonModelIdentifier(...parts) {
  return /\bcarbon\b|gemini-4-carbon|MODEL_PLACEHOLDER_M429\b/i.test(
    parts.filter(Boolean).join(' ')
  );
}

/**
 * 剥离模型展示名称末尾的思考档位后缀（如 `(High)`、`(Medium)`、`(Thinking)`），提取基础模型族名。
 *
 * @param {string} [label='']
 * @returns {string}
 */
export function getBaseModelLabel(label = '') {
  return (
    String(label || '')
      .replace(/\s*\((?:Max|High|Medium|Low|Thinking|Extra Low|Tiered)\)\s*$/i, '')
      .trim() || String(label || 'Unknown Model')
  );
}

/**
 * 将严格匹配的 `gemini-3.1-pro`、`gemini-3.5-flash-lite` 或 `gemini-4-carbon` 通用模型 Slug 转为人类可读标签。
 * 使用行尾锚点 `$` 防止未收录新后缀（如 `gemini-3.1-pro-ultra-v2`）被静默截断伪装成旧模型获取错误定价。
 *
 * @param {string} [slug='']
 * @returns {string}
 */
export function formatGenericModelSlug(slug = '') {
  const s = String(slug || '')
    .trim()
    .replace(/^session-display:/i, '');
  if (!s || /^MODEL_PLACEHOLDER_/i.test(s)) return '';
  const m = s.match(/^gemini-(\d+(?:\.\d+)?)-(pro|flash|argon|carbon)(?:-(lite))?$/i);
  if (m) {
    const ver = m[1];
    const tier = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const lite = m[3] ? ' Lite' : '';
    return `Gemini ${ver} ${tier}${lite}`;
  }
  return '';
}

/**
 * 综合动态模型目录、占位符字典与价格表，解析步骤对应的模型元数据与单价配置。
 *
 * @param {string} rawModelKey 步骤记录的原始模型键（如 `MODEL_PLACEHOLDER_M320`）
 * @param {Map<string, {modelId: string, label: string, quotaInfo?: object}>} [dynamicModelMap=new Map()] 从 `GetUserStatus` 提取的动态模型表
 * @param {string} [apiProvider=''] API 提供商枚举
 * @param {string} [modelDisplayName=''] 已知的模型展示名称
 * @param {string} [responseModel=''] 实际响应的上游模型 ID（如 `gemini-3.8-flash-n`）
 */
export function resolveModelInfo(
  rawModelKey,
  dynamicModelMap = new Map(),
  apiProvider = '',
  modelDisplayName = '',
  responseModel = ''
) {
  const dynEntry =
    dynamicModelMap && typeof dynamicModelMap.get === 'function'
      ? dynamicModelMap.get(rawModelKey)
      : null;
  const staticPh = PLACEHOLDER_MAP[rawModelKey] || null;

  // 若 GetUserStatus 仅下发了 label 而未下发真实 modelId（或被填成占位符自身），继续合并静态 PLACEHOLDER_MAP 的精确 modelId
  const dynValidModelId =
    dynEntry?.modelId && dynEntry.modelId !== rawModelKey ? dynEntry.modelId : '';
  const mergedModelId = dynValidModelId || staticPh?.modelId || dynEntry?.modelId || '';
  const mergedLabel = dynEntry?.label || staticPh?.label || '';

  const cleanResponseModel =
    responseModel && responseModel !== 'unknown' ? String(responseModel).trim() : '';
  const cleanRawFallback =
    rawModelKey && rawModelKey !== 'unknown' ? rawModelKey : cleanResponseModel;
  const derivedDisplay =
    modelDisplayName ||
    mergedLabel ||
    formatGenericModelSlug(rawModelKey) ||
    formatGenericModelSlug(cleanResponseModel) ||
    cleanRawFallback ||
    '模型未知';

  // 先生成保留档位后缀的精确 Slug（如 "Gemini 3.8 Flash (Low)" -> "gemini-3.8-flash-low"），防止被基础族名定价覆盖
  const tieredSlug = derivedDisplay
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const tieredDashedSlug = tieredSlug.replace(/\./g, '-');

  const baseLabel = getBaseModelLabel(derivedDisplay);
  const canonicalSlug = baseLabel.toLowerCase().replace(/\s+/g, '-');
  const dashedSlug = canonicalSlug.replace(/\./g, '-');
  const modelId =
    mergedModelId ||
    (rawModelKey && rawModelKey !== 'unknown' ? rawModelKey : cleanResponseModel) ||
    'unknown';

  const explicitPricing =
    MODEL_PRICING[modelId] ||
    MODEL_PRICING[rawModelKey] ||
    (cleanResponseModel ? MODEL_PRICING[cleanResponseModel] : null) ||
    MODEL_PRICING[tieredSlug] ||
    MODEL_PRICING[tieredDashedSlug] ||
    MODEL_PRICING[canonicalSlug] ||
    MODEL_PRICING[dashedSlug];

  if (explicitPricing) {
    return {
      rawModel: rawModelKey,
      modelId,
      label: derivedDisplay,
      baseLabel,
      shortName: explicitPricing.short,
      family: explicitPricing.family,
      pricing: explicitPricing,
      isEstimatedPrice: false,
    };
  }

  const inferredFamily = inferFamilyFromProviderOrKey(rawModelKey, modelId, apiProvider);
  return {
    rawModel: rawModelKey,
    modelId,
    label: derivedDisplay,
    baseLabel,
    shortName: derivedDisplay,
    family: inferredFamily,
    pricing: null,
    isEstimatedPrice: true,
  };
}

/**
 * 计算单个步骤的 API 等效美元成本；若模型未定价（`pricing === null`）则返回 `null`。
 * 对负数、NaN 或非有限数值统一安全钳制为 0。
 *
 * @param {{ inputTokens: number, cacheReadTokens: number, outputTokens: number }} step
 * @param {{ input: number, cache: number, output: number } | null} pricing
 * @returns {number|null}
 */
export function computeStepCost(step, pricing) {
  if (!pricing) return null;
  const safeTok = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const inCost = (safeTok(step?.inputTokens) / 1_000_000) * pricing.input;
  const cacheCost = (safeTok(step?.cacheReadTokens) / 1_000_000) * pricing.cache;
  const outCost = (safeTok(step?.outputTokens) / 1_000_000) * pricing.output;
  return inCost + cacheCost + outCost;
}
