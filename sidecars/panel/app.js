// Frontend controller for Antigravity Usage & Speed Monitor.
const sidecar = window.sidecar;
const $ = (id) => document.getElementById(id);

let selectedConversationId = sidecar?.conversationId || '';
let selectedTimeRange = 'all';
let customStartMs = 0;
let customEndMs = 0;
let latestTelemetry = null;
let showAllPools = true;
let lastConvSelectSig = '';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMetric(value, unit = '', estimated = false) {
  return Number.isFinite(value) ? `${estimated ? '≈' : ''}${value.toFixed(1)}${unit}` : '—';
}

function speedReasonText(reason) {
  return ({
    compaction: '自动压缩不计测速',
    incomplete_or_invalid_timing: '未完成或计时缺失',
    tool_timing_unavailable: '工具输出无法独立计时',
    no_answer_text: '无正文',
    token_breakdown_unavailable: '输出 Token 构成不明',
    answer_start_unavailable: '缺少正文起点',
    short_sample: '短样本，不计均速',
    legacy_cache: '旧缓存，等待重新读取',
  })[reason] || '';
}

function sampleSummary(summary) {
  return `${summary?.sampleCount || 0}/${(summary?.sampleCount || 0) + (summary?.excludedCount || 0)} 步`;
}

function formatTokens(num) {
  const n = Number(num || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCountdown(isoTime) {
  if (!isoTime) return '未知重置时间';
  const targetMs = Date.parse(isoTime);
  if (!targetMs || Number.isNaN(targetMs)) return '未知重置时间';
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return '即将重置';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} 天 ${hours} 小时后重置`;
  }
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟后重置`;
  }
  return `${minutes} 分钟后重置`;
}

function renderParallelograms(usedPct) {
  const container = $('ctx-parallelograms');
  container.innerHTML = '';
  // 5 blocks, each representing 20% context usage (at least 1 filled when > 0%)
  const filledCount = usedPct <= 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(usedPct / 20)));
  const toneClass = usedPct >= 80 ? 'danger' : usedPct >= 55 ? 'warn' : '';

  for (let i = 0; i < 5; i++) {
    const blk = document.createElement('span');
    blk.className = `para-block ${toneClass} ${i < filledCount ? 'filled' : ''}`.trim();
    container.appendChild(blk);
  }
}

async function callApi(path, { method = 'GET', body } = {}) {
  const fetchFn = sidecar?.fetch ? sidecar.fetch.bind(sidecar) : window.fetch.bind(window);
  const res = await fetchFn(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${res.status}`);
  }
  return data;
}

function renderConversationsSelect(conversations, activeId) {
  const sel = $('conv-select');
  // Avoid resetting dropdown DOM while user is actively interacting with it
  if (document.activeElement === sel) return;

  const sig = `${selectedConversationId}::${activeId}::${conversations
    .map((c) => `${c.cascadeId}:${c.stepCount}:${c.title}`)
    .join('|')}`;
  if (sig === lastConvSelectSig) return;
  lastConvSelectSig = sig;

  sel.innerHTML = '';

  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  const latestConv = conversations[0];
  autoOpt.textContent = latestConv
    ? `⚡ 自动跟随 (${latestConv.title})`
    : '⚡ 自动跟随最新会话';
  if (!selectedConversationId) autoOpt.selected = true;
  sel.appendChild(autoOpt);

  for (const c of conversations) {
    const opt = document.createElement('option');
    opt.value = c.cascadeId;
    opt.textContent = `${c.title} (${c.stepCount}步)`;
    if (selectedConversationId && c.cascadeId === selectedConversationId) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  }
}

function renderAllPools(pools, activeFamily) {
  const box = $('all-pools-container');
  box.hidden = !showAllPools;
  if (!showAllPools) return;

  box.innerHTML = '';
  for (const p of pools) {
    const row = document.createElement('div');
    row.className = 'pool-mini-row';
    const isCurrent = p.family === activeFamily;
    const has5h = p.usedPct != null && p.remainingPct != null;
    const used5h = has5h ? `${Number(p.usedPct).toFixed(1)}%` : '--';
    const rem5h = has5h ? `${Number(p.remainingPct).toFixed(1)}%` : '--';
    const wkPart =
      p.weeklyUsedPct != null && p.weeklyRemainingPct != null
        ? ` · 周已用 <strong>${Number(p.weeklyUsedPct).toFixed(1)}%</strong> (余 ${Number(p.weeklyRemainingPct).toFixed(1)}%)`
        : '';
    row.innerHTML = `
      <span class="pool-mini-name">${isCurrent ? '● ' : ''}${escapeHtml(p.poolName)}</span>
      <span class="pool-mini-meta">5h已用 <strong>${used5h}</strong> (余 ${rem5h})${wkPart}</span>
    `;
    box.appendChild(row);
  }
}

let lastStepsRenderSig = '';
let lastModelsRenderSig = '';

function renderTables(activeConv, modelBreakdown, speedMode = 'stream') {
  const estimated = speedMode !== 'total';
  const steps = activeConv.recentSteps || [];
  const tabStepsBtn = $('tab-steps-btn');
  if (tabStepsBtn) {
    tabStepsBtn.textContent = `当前会话步骤测速与计费 (${steps.length}步)`;
  }

  const stepsSig = `${activeConv.cascadeId || ''}:${speedMode}:${JSON.stringify(steps)}`;
  if (stepsSig !== lastStepsRenderSig) {
    lastStepsRenderSig = stepsSig;
    const stepsTbody = $('steps-tbody');
    const scrollParent = stepsTbody.closest('.table-scroll');
    const prevScrollTop = scrollParent ? scrollParent.scrollTop : 0;

    const frag = document.createDocumentFragment();
    for (const st of steps) {
      const tr = document.createElement('tr');
      const thinkInfo = st.thinkingTokens
        ? `思考: ${st.thinkingTokens} tok${st.thinkingDurationSec ? ` (${st.thinkingDurationSec}s)` : ''} | `
        : '';
      const compTag = st.isCompactionStep ? ' [压缩汇总步]' : '';
      const reason = speedReasonText(st.selectedSpeedReason);
      const timingSource = st.responseTimingSource === 'post_thinking_estimate' ? '总时长减记录的思考阶段（估算）' : st.responseTimingSource === 'native_text_stream' ? '无思考正文的原始流时长（估算）' : '不可用';
      const stepCostVal = Number(st.costUsd || 0);
      const stepCostDisplay = stepCostVal >= 1 ? `$${stepCostVal.toFixed(2)}` : `$${stepCostVal.toFixed(3)}`;
      const costStyle =
        stepCostVal >= 0.15
          ? 'color: var(--speed-accent); font-weight: 700;'
          : 'color: var(--foreground); font-weight: 600;';
      const pct5h = (stepCostVal / 0.25).toFixed(2);
      const pctWk = stepCostVal.toFixed(3);
      tr.title = `单步消费: $${stepCostVal.toFixed(4)} (入 $${Number(st.inCostUsd || 0).toFixed(4)} + 缓 $${Number(st.cacheCostUsd || 0).toFixed(4)} + 出 $${Number(st.outCostUsd || 0).toFixed(4)} | 约合 5h ${pct5h}% / 周限 ${pctWk}%) | ${thinkInfo}正文/工具输出: ${st.responseTokens} tok | 正文阶段: ${formatMetric(st.streamDurationSec, 's')} (${timingSource}) | 请求总耗时: ${formatMetric(st.totalDurationSec, 's')} | 整体吞吐: ${formatMetric(st.totalTokPerSec, ' tok/s')} | ${reason}`;
      tr.innerHTML = `
        <td>#${Number(st.stepIndex)}${compTag ? '<span class="muted">⚡</span>' : ''}</td>
        <td>${escapeHtml(st.modelShort)}</td>
        <td><strong style="color: var(--speed-accent)">${formatMetric(st.tokPerSec, ' tok/s', estimated)}</strong><div class="speed-detail muted">${escapeHtml(reason)}</div></td>
        <td>${formatMetric(st.ttftSec, 's')}</td>
        <td>${formatTokens(st.contextTokens)} / +${Number(st.outputTokens)}</td>
        <td style="color: var(--cache-green)">${Number(st.cacheHitPct)}%</td>
        <td style="${costStyle}">${stepCostDisplay}</td>
      `;
      frag.appendChild(tr);
    }
    stepsTbody.innerHTML = '';
    stepsTbody.appendChild(frag);
    if (scrollParent && prevScrollTop > 0) {
      scrollParent.scrollTop = prevScrollTop;
    }
  }

  const models = modelBreakdown || [];
  const modelsSig = `${speedMode}:${JSON.stringify(models)}`;
  if (modelsSig !== lastModelsRenderSig) {
    lastModelsRenderSig = modelsSig;
    const modelsTbody = $('models-tbody');
    modelsTbody.innerHTML = '';
    for (const m of models) {
      const tr = document.createElement('tr');
      const pricePrefix = m.isEstimatedPrice ? '≈$' : '$';
      tr.innerHTML = `
        <td><strong>${escapeHtml(m.shortName)}</strong> <span class="muted">(${Number(m.calls)})</span></td>
        <td>${Number(m.calls)}</td>
        <td>${formatMetric(m.avgTokPerSec, ' tok/s', estimated)}<div class="speed-detail muted">有效 ${sampleSummary(m.speedSummary)}</div></td>
        <td>${formatTokens(m.totalTokens)}</td>
        <td>${pricePrefix}${Number(m.costUsd).toFixed(2)}</td>
      `;
      modelsTbody.appendChild(tr);
    }
  }
}

function toLocalDateTimeInputValue(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderConsumptionCards(data) {
  const cons = data?.consumption || {};
  const preset =
    selectedTimeRange !== 'custom' && cons.presets?.[selectedTimeRange]
      ? cons.presets[selectedTimeRange]
      : null;

  const sess = preset?.session || cons.session || {};
  const acct = preset?.account || cons.account || {};
  const sessAll = cons.sessionAllTime || sess;
  const rangeLabel = preset?.label || cons.selectedRange?.label || '全部时间';

  document.querySelectorAll('[data-time-range]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.timeRange === selectedTimeRange);
  });

  const sessPrefix = sess.hasEstimatedPricing ? '≈$' : '$';
  const acctPrefix = acct.hasEstimatedPricing ? '≈$' : '$';

  // 1. Current conversation consumption card
  $('cons-session-steps').textContent = `${sess.calls || 0} 步`;
  $('cons-session-tokens').textContent = formatTokens(sess.totalTokens || 0);
  $('cons-session-cost').textContent = `${sessPrefix}${Number(sess.costUsd || 0).toFixed(2)}`;
  $('cons-session-breakdown').textContent = `入 ${formatTokens(sess.inputTokens)} · 缓 ${formatTokens(sess.cacheReadTokens)} · 出 ${formatTokens(sess.outputTokens)}`;
  $('cons-session-breakdown').title = `新增输入: ${sess.inputTokens || 0} | 缓存读取: ${sess.cacheReadTokens || 0} (${sess.cacheHitPct || 0}%) | 思考输出: ${sess.thinkingTokens || 0} | 正文输出: ${sess.responseTokens || 0}`;

  const sharePct =
    acct.totalTokens > 0
      ? Math.min(100, +((sess.totalTokens / acct.totalTokens) * 100).toFixed(1))
      : 0;
  if (selectedTimeRange !== 'all' && (sessAll.totalTokens || 0) > (sess.totalTokens || 0)) {
    $('cons-session-pool').textContent = `占同期 ${sharePct}% · 全对话 ${formatTokens(sessAll.totalTokens)} ($${Number(sessAll.costUsd || 0).toFixed(2)})`;
  } else {
    $('cons-session-pool').textContent = `占同期本机 ${sharePct}% · 缓存命中 ${sess.cacheHitPct ?? 0}%`;
  }

  // 2. Account total consumption card (local machine)
  $('cons-account-meta').textContent = `${acct.conversationsCount || 0} 会话 · ${acct.calls || 0} 步`;
  $('cons-account-tokens').textContent = formatTokens(acct.totalTokens || 0);
  $('cons-account-cost').textContent = `${acctPrefix}${Number(acct.costUsd || 0).toFixed(2)}`;
  $('cons-account-breakdown').textContent = `入 ${formatTokens(acct.inputTokens)} · 缓 ${formatTokens(acct.cacheReadTokens)} · 出 ${formatTokens(acct.outputTokens)}`;
  $('cons-account-breakdown').title = `筛选范围: ${rangeLabel} (本机全会话) | 新增输入: ${acct.inputTokens || 0} | 缓存读取: ${acct.cacheReadTokens || 0} (${acct.cacheHitPct || 0}%) | 思考输出: ${acct.thinkingTokens || 0} | 正文输出: ${acct.responseTokens || 0}`;
  $('cons-account-pool').textContent = `Gemini $${Number(acct.geminiCostUsd || 0).toFixed(2)} · Claude/GPT $${Number(acct.claudeGptCostUsd || 0).toFixed(2)}`;
  $('cons-account-pool').title = `Gemini: ${formatTokens(acct.geminiTokens)} (${acct.geminiCalls || 0}步) | Claude & GPT: ${formatTokens(acct.claudeGptTokens)} (${acct.claudeGptCalls || 0}步)`;

  const tabModelsBtn = $('tab-models-btn');
  if (tabModelsBtn) {
    tabModelsBtn.textContent = `按模型汇总 (${rangeLabel})`;
  }
}

function applyTelemetryToDom(data) {
  latestTelemetry = data;
  const active = data.activeConversation || {};
  const ctx = active.context || {};
  const quotas = data.quotas || {};
  const quotaMeta = quotas.meta || {};
  const settings = data.settings || {};

  // 1. Top session bar
  $('conv-title').textContent = active.title || '当前会话';
  renderConversationsSelect(data.conversations || [], active.cascadeId);

  const livePill = $('live-status-pill');
  const speedDot = $('speed-dot');
  if (active.isRunning) {
    speedDot.classList.add('pulsing');
  } else {
    speedDot.classList.remove('pulsing');
  }
  if (!manualRefreshFeedbackTimer) {
    if (active.isRunning) {
      livePill.textContent = '生成中…';
      livePill.classList.add('running');
    } else if (quotaMeta.refreshFailed || quotaMeta.isStale) {
      livePill.textContent = quotaMeta.hasOfficialData ? '⚠ 额度缓存' : '⚠ 额度离线';
      livePill.classList.remove('running');
      livePill.title = quotaMeta.errorMessage || '配额接口响应滞后，当前显示最近一次缓存数据';
    } else {
      livePill.textContent = '实时 2s';
      livePill.classList.remove('running');
      livePill.title = '';
    }
  }

  // 2. Status strip metrics
  const estimatedSpeed = settings.speedMode !== 'total';
  $('tok-per-sec').textContent = formatMetric(active.latestTokPerSec, ' tok/s', estimatedSpeed);
  $('speed-mode-toggle').title = `最新一步：${speedReasonText(active.latestSpeedReason) || (estimatedSpeed ? '正文阶段估算' : '请求整体吞吐')}；点击切换口径`;
  $('ttft-value').textContent = formatMetric(active.latestTtftSec, 's');
  $('ttft-value').title = `原始首 Token 延迟，可能先返回思考内容；会话平均 ${formatMetric(active.ttftSummary?.avgSec, 's')}（${active.ttftSummary?.sampleCount || 0} 步）`;
  $('avg-speed-value').textContent = formatMetric(active.avgTokPerSec, '', estimatedSpeed);
  $('speed-sample-count').textContent = `有效 ${sampleSummary(active.speedSummary)}`;
  $('speed-sample-count').title = Object.entries(active.speedSummary?.excludedReasons || {}).map(([reason, count]) => `${speedReasonText(reason)}：${count} 步`).join('；') || '全部有效；自动压缩单独排除';
  $('speed-method-note').textContent = estimatedSpeed
    ? '正文阶段估算；工具混合输出和起点不明的步骤不计均速，短样本单列。'
    : '含思考的输出 Token ÷ 请求总耗时；不含调用之间的空闲和外部工具执行时间。';
  const latestStepCost = Number(active.latestStepCostUsd ?? active.recentSteps?.[0]?.costUsd ?? 0);
  if ($('step-cost-value')) {
    $('step-cost-value').textContent = `$${latestStepCost.toFixed(3)}`;
  }
  $('session-cost-value').textContent = `$${Number(active.sessionCostUsd || 0).toFixed(2)}`;
  $('cache-hit-value').textContent = `${active.latestCacheHitPct ?? 0}%`;
  renderParallelograms(ctx.usedPct || 0);

  $('active-model-short').textContent = active.activeModelShort || 'argon-4';
  $('active-model-short').title = active.activeModelLabel || '';
  $('today-tokens').textContent = formatTokens(quotas.today?.tokens || 0);
  $('today-cost').textContent = `$${Number(quotas.today?.costUsd || 0).toFixed(2)}`;
  $('speed-mode-badge').textContent = settings.speedMode === 'total' ? '整体吞吐' : '正文估算';

  // 3. Context Window Popover Section
  const limitTokens = ctx.limitTokens || 256000;
  const limitLabel = formatTokens(limitTokens);
  $('ctx-summary-text').textContent = `${formatTokens(ctx.totalTokens || 0)} / ${limitLabel} (${ctx.usedPct || 0}%)`;
  $('ctx-summary-text').title = `距离 256k 自动压缩阈值: ${formatTokens(ctx.totalTokens || 0)} / 256.0k (${ctx.compactionUsedPct ?? 0}%)`;

  const limit = Math.max(1, limitTokens);
  $('bar-ctx-cached').style.width = `${Math.min(100, (ctx.cachedTokens / limit) * 100)}%`;
  $('bar-ctx-input').style.width = `${Math.min(100, (ctx.freshInputTokens / limit) * 100)}%`;
  $('bar-ctx-thinking').style.width = `${Math.min(100, (ctx.thinkingTokens / limit) * 100)}%`;
  $('bar-ctx-output').style.width = `${Math.min(100, (ctx.responseTokens / limit) * 100)}%`;

  $('bd-cached').textContent = formatTokens(ctx.cachedTokens);
  $('bd-input').textContent = formatTokens(ctx.freshInputTokens);
  $('bd-thinking').textContent = formatTokens(ctx.thinkingTokens);
  $('bd-output').textContent = formatTokens(ctx.responseTokens);

  document.querySelectorAll('[data-ctx-limit]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.ctxLimit) === Number(limitTokens));
  });

  // 3.5 Session & Account Consumption Cards
  renderConsumptionCards(data);

  // 4. Quotas Section
  $('account-tier-label').textContent = `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`;
  const activePool = quotas.activePool || {};
  const has5h = activePool.usedPct != null && activePool.remainingPct != null;
  const used5hVal = has5h ? Number(activePool.usedPct) : 0;
  $('session-quota-title').textContent = `5h 限额 (${activePool.family || '当前'})`;
  $('session-reset-text').textContent = formatCountdown(activePool.resetTime);
  $('session-used-pct').textContent = has5h
    ? `已用 ${used5hVal.toFixed(1)}% (余 ${Number(activePool.remainingPct).toFixed(1)}%)`
    : '获取失败 (--%)';

  const sessionBar = $('bar-session-quota');
  sessionBar.style.width = `${Math.min(100, used5hVal)}%`;
  sessionBar.className = `bar-fill ${used5hVal >= 85 ? 'danger' : used5hVal >= 60 ? 'warn' : ''}`;

  renderAllPools(quotas.pools || [], activePool.family);

  const weekly = quotas.weekly || {};
  const wkTitleEl = $('weekly-quota-title');
  if (wkTitleEl) {
    wkTitleEl.textContent = weekly.title || `每周限额 (${activePool.family || '当前'})`;
  }
  const hasWk = weekly.usedPct != null && weekly.remainingPct != null;
  const usedWkVal = hasWk ? Number(weekly.usedPct) : 0;
  $('weekly-reset-text').textContent = formatCountdown(weekly.resetTime);
  $('weekly-used-pct').textContent = hasWk
    ? `已用 ${usedWkVal.toFixed(1)}% (余 ${Number(weekly.remainingPct).toFixed(1)}%)`
    : '获取失败 (--%)';
  const weeklyBar = $('bar-weekly-quota');
  weeklyBar.style.width = `${Math.min(100, usedWkVal)}%`;
  weeklyBar.className = `bar-fill ${usedWkVal >= 85 ? 'danger' : usedWkVal >= 60 ? 'warn' : ''}`;

  $('weekly-tokens-text').textContent = formatTokens(weekly.tokens || 0);
  $('weekly-cost-text').textContent = `$${Number(weekly.costUsd || 0).toFixed(2)}`;

  if (data.account?.aiCredits != null && data.account.aiCredits > 0) {
    $('credits-badge').textContent = `AI 积分: ${data.account.aiCredits}`;
  } else if (weekly.calls != null) {
    $('credits-badge').textContent = `本机调用: ${weekly.calls} 步`;
  } else {
    $('credits-badge').textContent = '';
  }

  // Sync settings inputs
  const wkMode =
    settings.weeklyLimitMode === 'custom_tokens' || settings.weeklyLimitMode === 'custom_cost'
      ? settings.weeklyLimitMode
      : 'official';
  $('setting-speed-mode').value = settings.speedMode || 'stream';
  $('setting-weekly-mode').value = wkMode;
  $('setting-weekly-tokens').value = settings.weeklyTokenBudget || 150000000;
  $('setting-weekly-cost').value = settings.weeklyCostBudget || 100;

  renderTables(active, data.modelBreakdown, settings.speedMode);
}

let manualRefreshFeedbackTimer = null;

async function refreshTelemetry(force = false) {
  const btn = $('refresh-btn');
  const livePill = $('live-status-pill');
  const startMs = Date.now();

  if (force && btn) {
    btn.classList.add('refreshing');
    if (livePill) {
      livePill.textContent = '同步中…';
      livePill.classList.remove('running');
      livePill.classList.add('synced');
    }
  }

  try {
    const params = new URLSearchParams();
    if (selectedConversationId) params.set('conversationId', selectedConversationId);
    if (selectedTimeRange) params.set('range', selectedTimeRange);
    if (selectedTimeRange === 'custom') {
      if (customStartMs > 0) params.set('startMs', String(customStartMs));
      if (customEndMs > 0) params.set('endMs', String(customEndMs));
    }
    if (force === true) params.set('force', '1');
    const qs = params.toString();
    const data = await callApi(`/api/telemetry${qs ? `?${qs}` : ''}`);

    if (force) {
      const elapsed = Date.now() - startMs;
      if (elapsed < 320) {
        await new Promise((r) => setTimeout(r, 320 - elapsed));
      }
    }

    applyTelemetryToDom(data);

    if (force && livePill) {
      if (manualRefreshFeedbackTimer) clearTimeout(manualRefreshFeedbackTimer);
      livePill.textContent = '✓ 已刷新';
      livePill.classList.remove('running');
      livePill.classList.add('synced');
      manualRefreshFeedbackTimer = setTimeout(() => {
        manualRefreshFeedbackTimer = null;
        livePill.classList.remove('synced');
        if (latestTelemetry?.activeConversation?.isRunning) {
          livePill.textContent = '生成中…';
          livePill.classList.add('running');
        } else {
          livePill.textContent = '实时 2s';
        }
      }, 1200);
    }
  } catch (err) {
    console.error('Telemetry refresh failed:', err);
    if (livePill) {
      livePill.classList.remove('synced');
      livePill.textContent = '连接重试中';
    }
  } finally {
    if (force && btn) {
      btn.classList.remove('refreshing');
    }
  }
}

async function updateSettings(patch) {
  try {
    await callApi('/api/settings', { method: 'POST', body: patch });
    await refreshTelemetry(true);
  } catch (err) {
    console.error('Failed saving settings:', err);
  }
}

function bindEvents() {
  $('refresh-btn').addEventListener('click', () => refreshTelemetry(true));

  $('conv-select').addEventListener('change', (e) => {
    selectedConversationId = e.target.value;
    refreshTelemetry();
  });

  // Time filter buttons
  document.querySelectorAll('[data-time-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextRange = btn.dataset.timeRange || 'all';
      selectedTimeRange = nextRange;
      const customBox = $('custom-time-box');
      if (customBox) {
        customBox.hidden = nextRange !== 'custom';
      }
      if (nextRange === 'custom') {
        const now = Date.now();
        if (!customStartMs) customStartMs = now - 24 * 3600 * 1000;
        if (!customEndMs) customEndMs = now;
        if (!$('custom-start-input').value) {
          $('custom-start-input').value = toLocalDateTimeInputValue(customStartMs);
        }
        if (!$('custom-end-input').value) {
          $('custom-end-input').value = toLocalDateTimeInputValue(customEndMs);
        }
      }
      if (latestTelemetry && nextRange !== 'custom') {
        renderConsumptionCards(latestTelemetry);
      }
      refreshTelemetry();
    });
  });

  const applyCustomBtn = $('apply-custom-time-btn');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      const sVal = $('custom-start-input').value;
      const eVal = $('custom-end-input').value;
      const sMs = sVal ? Date.parse(sVal) : 0;
      const eMs = eVal ? Date.parse(eVal) : Date.now();
      if (sMs > 0) customStartMs = sMs;
      if (eMs > 0) customEndMs = eMs;
      selectedTimeRange = 'custom';
      refreshTelemetry(true);
    });
  }

  // Toggle context breakdown
  const toggleCtx = () => {
    const box = $('ctx-breakdown-box');
    box.hidden = !box.hidden;
    $('ctx-chevron').textContent = box.hidden ? '›' : '⌄';
  };
  $('ctx-detail-toggle').addEventListener('click', toggleCtx);
  $('ctx-inline-trigger').addEventListener('click', toggleCtx);

  // Switch context window limit (200k / 1M / 2M)
  document.querySelectorAll('[data-ctx-limit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateSettings({ contextWindowLimit: Number(btn.dataset.ctxLimit) });
    });
  });

  // Toggle speed mode by clicking tok/s
  $('speed-mode-toggle').addEventListener('click', () => {
    const current = latestTelemetry?.settings?.speedMode || 'stream';
    const next = current === 'stream' ? 'total' : 'stream';
    updateSettings({ speedMode: next });
  });

  // Toggle all model pools
  $('pool-switch-toggle').addEventListener('click', () => {
    showAllPools = !showAllPools;
    if (latestTelemetry) {
      renderAllPools(
        latestTelemetry.quotas?.pools || [],
        latestTelemetry.quotas?.activePool?.family
      );
    }
  });

  // Toggle details panel
  $('toggle-details-btn').addEventListener('click', () => {
    const card = $('details-card');
    card.hidden = !card.hidden;
    $('toggle-details-btn').textContent = card.hidden ? '查看详细明细' : '收起详细明细';
  });

  // Switch tabs inside details panel
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('tab-steps').hidden = tab !== 'steps';
      $('tab-models').hidden = tab !== 'models';
    });
  });

  // Toggle settings panel
  $('toggle-settings-btn').addEventListener('click', () => {
    const card = $('settings-card');
    card.hidden = !card.hidden;
  });

  $('save-settings-btn').addEventListener('click', () => {
    updateSettings({
      speedMode: $('setting-speed-mode').value,
      weeklyLimitMode: $('setting-weekly-mode').value,
      weeklyTokenBudget: Number($('setting-weekly-tokens').value),
      weeklyCostBudget: Number($('setting-weekly-cost').value),
    });
    $('settings-card').hidden = true;
  });
}

function init() {
  bindEvents();
  refreshTelemetry();
  setInterval(refreshTelemetry, 2000);
}

init();
