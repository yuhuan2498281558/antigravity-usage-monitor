/**
 * @fileoverview 模型身份识别、展示名称规范化与单步 API 等效成本计算。
 *
 * 核心原则：
 * 1. 优先信任服务端下发的动态模型目录 (`dynamicModelMap`) 与真实响应模型 (`responseModel`)，
 *    其次匹配本地/云端 `PLACEHOLDER_MAP` 与 `MODEL_PRICING`；
 * 2. 价格未知或模型身份无法确认时，严格返回 `pricing: null` 与 `costUsd: null`，
 *    绝不借用其他模型单价伪造费用。
 */

import { MODEL_PRICING, PLACEHOLDER_MAP } from './pricing-catalog.mjs';

/**
 * 根据 API 提供商枚举或模型标识符推断所属模型家族（`'Gemini'` | `'Claude'` | `'GPT'` | `'Other'`）。
 *
 * @param {string} [rawModelKey=''] 原始模型键名或占位符
 * @param {string} [modelId=''] 规范化模型 ID
 * @param {string} [apiProvider=''] 上游 API 提供商枚举字符串
 * @returns {'Gemini'|'Claude'|'GPT'|'Other'}
 */
export function inferFamilyFromProviderOrKey(rawModelKey = '', modelId = '', apiProvider = '') {
  const prov = String(apiProvider || '').toUpperCase();
  if (prov.includes('GEMINI') || prov.includes('GOOGLE')) return 'Gemini';
  if (prov.includes('ANTHROPIC') || prov.includes('CLAUDE')) return 'Claude';
  if (prov.includes('OPENAI') || prov.includes('GPT')) return 'GPT';

  const combined = `${rawModelKey} ${modelId}`.toUpperCase();
  if (
    combined.includes('GEMINI') ||
    combined.includes('CARBON') ||
    combined.includes('ARGON') ||
    combined.includes('FLASH') ||
    combined.includes('GOOGLE')
  ) {
    return 'Gemini';
  }
  if (
    combined.includes('CLAUDE') ||
    combined.includes('FABLE') ||
    combined.includes('SONNET') ||
    combined.includes('OPUS') ||
    combined.includes('HAIKU')
  ) {
    return 'Claude';
  }
  if (combined.includes('GPT') || combined.includes('OPENAI')) {
    return 'GPT';
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
 * 判断一组模型标识字段是否指向 Gemini 4 Carbon 系列模型。
 *
 * @param {...string} parts 待检测的标识片段
 * @returns {boolean}
 */
export function isCarbonModelIdentifier(...parts) {
  return /\bcarbon\b|gemini-4-carbon/i.test(parts.filter(Boolean).join(' '));
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
 * 将形如 `gemini-3.1-pro`、`gemini-3.5-flash-lite` 或 `gemini-4-carbon` 的通用模型 Slug 转为人类可读标签。
 *
 * @param {string} [slug='']
 * @returns {string}
 */
export function formatGenericModelSlug(slug = '') {
  const s = String(slug || '')
    .trim()
    .replace(/^session-display:/i, '');
  if (!s || /^MODEL_PLACEHOLDER_/i.test(s)) return '';
  const m = s.match(/^gemini-(\d+(?:\.\d+)?)-(pro|flash|argon|carbon)(?:-(lite))?/i);
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
 * @param {string} rawModelKey 步骤记录的原始模型键（如 `MODEL_PLACEHOLDER_M318`）
 * @param {Map<string, {modelId: string, label: string, quotaInfo?: object}>} dynamicModelMap 从 `GetUserStatus` 提取的动态模型表
 * @param {string} [apiProvider=''] API 提供商枚举
 * @param {string} [modelDisplayName=''] 已知的模型展示名称
 * @param {string} [responseModel=''] 实际响应的上游模型 ID（如 `gemini-3.8-flash-n`）
 * @returns {{
 *   rawModel: string,
 *   modelId: string,
 *   label: string,
 *   baseLabel: string,
 *   shortName: string,
 *   family: string,
 *   pricing: {input: number, cache: number, output: number, short: string, family: string} | null,
 *   isEstimatedPrice: boolean
 * }}
 */
export function resolveModelInfo(
  rawModelKey,
  dynamicModelMap,
  apiProvider = '',
  modelDisplayName = '',
  responseModel = ''
) {
  const dyn = dynamicModelMap.get(rawModelKey) || PLACEHOLDER_MAP[rawModelKey];
  const cleanResponseModel =
    responseModel && responseModel !== 'unknown' ? String(responseModel).trim() : '';
  const cleanRawFallback =
    rawModelKey && rawModelKey !== 'unknown' ? rawModelKey : cleanResponseModel;
  const derivedDisplay =
    modelDisplayName ||
    dyn?.label ||
    formatGenericModelSlug(rawModelKey) ||
    formatGenericModelSlug(cleanResponseModel) ||
    cleanRawFallback ||
    '模型未知';
  const baseLabel = getBaseModelLabel(derivedDisplay);
  const canonicalSlug = baseLabel.toLowerCase().replace(/\s+/g, '-');
  const dashedSlug = canonicalSlug.replace(/\./g, '-');
  const modelId =
    dyn?.modelId ||
    (rawModelKey && rawModelKey !== 'unknown' ? rawModelKey : cleanResponseModel) ||
    'unknown';
  const explicitPricing =
    MODEL_PRICING[modelId] ||
    MODEL_PRICING[rawModelKey] ||
    (cleanResponseModel ? MODEL_PRICING[cleanResponseModel] : null) ||
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
    baseLabel: getBaseModelLabel(derivedDisplay),
    shortName: derivedDisplay,
    family: inferredFamily,
    pricing: null,
    isEstimatedPrice: true,
  };
}

/**
 * 计算单个步骤的 API 等效美元成本；若模型未定价（`pricing === null`）则返回 `null`。
 *
 * @param {{ inputTokens: number, cacheReadTokens: number, outputTokens: number }} step
 * @param {{ input: number, cache: number, output: number } | null} pricing
 * @returns {number|null}
 */
export function computeStepCost(step, pricing) {
  if (!pricing) return null;
  const inCost = (step.inputTokens / 1_000_000) * pricing.input;
  const cacheCost = (step.cacheReadTokens / 1_000_000) * pricing.cache;
  const outCost = (step.outputTokens / 1_000_000) * pricing.output;
  return inCost + cacheCost + outCost;
}
