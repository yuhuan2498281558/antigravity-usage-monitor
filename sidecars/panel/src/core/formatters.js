/**
 * @fileoverview Pure formatting utilities for speed metrics, token counts,
 * USD estimates, countdown timers, and custom datetime displays.
 */

export function formatMetric(value, unit = '') {
  return Number.isFinite(value) ? `${value.toFixed(1)}${unit}` : '—';
}

export function formatTokens(num) {
  const n = Number(num || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatTokensPrecise(num) {
  const n = Number(num || 0);
  if (n <= 0) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatCnyApprox(usdAmount, rate = 7.2) {
  const rmb = Number(usdAmount || 0) * rate;
  if (rmb <= 0) return '≈ ¥0';
  if (rmb >= 10) return `≈ ¥${Math.round(rmb)}`;
  return `≈ ¥${rmb.toFixed(1)}`;
}

export function formatDateSpanBadge(startMs, endMs) {
  const s = startMs && Number.isFinite(startMs) ? new Date(startMs) : new Date();
  const e = endMs && Number.isFinite(endMs) ? new Date(endMs) : new Date();
  return `${s.getMonth() + 1}月${s.getDate()}日 ~ ${e.getMonth() + 1}月${e.getDate()}日`;
}

export function formatUsd(amount, { precise = false, estimated = false } = {}) {
  const val = Number(amount || 0);
  const prefix = estimated ? '≈$' : '$';
  if (precise) {
    return val >= 1 ? `${prefix}${val.toFixed(2)}` : `${prefix}${val.toFixed(3)}`;
  }
  return `${prefix}${val.toFixed(2)}`;
}

export function speedReasonText(reason) {
  return ({
    compaction: '自动压缩不计测速',
    incomplete_or_invalid_timing: '未完成或计时缺失',
    invalid_output_tokens: '输出 Token 计数无效',
    inconsistent_timing: '原生首响应与总计时不一致',
    short_timing: '计时过短，暂不测速',
    short_sample: '短样本，不计均速',
    legacy_cache: '旧缓存，等待重新读取',
  })[reason] || '';
}

export function sampleSummary(summary) {
  const valid = summary?.sampleCount || 0;
  const excluded = summary?.excludedCount || 0;
  return `${valid}/${valid + excluded} 步`;
}

export function formatCountdown(isoTime, nowMs = Date.now()) {
  if (!isoTime) return '未知重置时间';
  const targetMs = Date.parse(isoTime);
  if (!targetMs || Number.isNaN(targetMs)) return '未知重置时间';
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return '即将重置';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}天 ${hours}小时后重置`;
  if (hours > 0) return `${hours}小时 ${minutes}分后重置`;
  return `${minutes}分钟后重置`;
}

export function formatCompactDateTime(ms) {
  if (!ms || !Number.isFinite(ms)) return '选择时间';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
