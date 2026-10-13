// Frontend controller for Antigravity Usage & Speed Monitor.
const sidecar = window.sidecar;
const $ = (id) => document.getElementById(id);

let selectedConversationId = sidecar?.conversationId || '';
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
    const used5h = Number(p.usedPct ?? 0).toFixed(1);
    const rem5h = Number(p.remainingPct ?? 100).toFixed(1);
    const wkPart =
      p.weeklyUsedPct != null
        ? ` · 周已用 <strong>${Number(p.weeklyUsedPct).toFixed(1)}%</strong> (余 ${Number(p.weeklyRemainingPct ?? 100).toFixed(1)}%)`
        : '';
    row.innerHTML = `
      <span class="pool-mini-name">${isCurrent ? '● ' : ''}${escapeHtml(p.poolName)}</span>
      <span class="pool-mini-meta">5h已用 <strong>${used5h}%</strong> (余 ${rem5h}%)${wkPart}</span>
    `;
    box.appendChild(row);
  }
}

function renderTables(activeConv, modelBreakdown) {
  const stepsTbody = $('steps-tbody');
  stepsTbody.innerHTML = '';
  for (const st of activeConv.recentSteps || []) {
    const tr = document.createElement('tr');
    const thinkInfo = st.thinkingTokens
      ? `思考: ${st.thinkingTokens} tok${st.thinkingDurationSec ? ` (${st.thinkingDurationSec}s)` : ''} | `
      : '';
    tr.title = `${thinkInfo}正文/工具输出: ${st.responseTokens} tok | 流耗时: ${st.streamDurationSec}s | 总耗时: ${st.totalDurationSec}s`;
    tr.innerHTML = `
      <td>#${Number(st.stepIndex)}</td>
      <td>${escapeHtml(st.modelShort)}</td>
      <td><strong style="color: var(--speed-accent)">${Number(st.tokPerSec).toFixed(1)}</strong> tok/s</td>
      <td>${Number(st.ttftSec).toFixed(1)}s</td>
      <td>${formatTokens(st.contextTokens)} / +${Number(st.outputTokens)}</td>
      <td style="color: var(--cache-green)">${Number(st.cacheHitPct)}%</td>
    `;
    stepsTbody.appendChild(tr);
  }

  const modelsTbody = $('models-tbody');
  modelsTbody.innerHTML = '';
  for (const m of modelBreakdown || []) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.shortName)}</strong> <span class="muted">(${Number(m.calls)})</span></td>
      <td>${Number(m.calls)}</td>
      <td>${Number(m.avgTokPerSec).toFixed(1)} tok/s</td>
      <td>${formatTokens(m.totalTokens)}</td>
      <td>≈$${Number(m.costUsd).toFixed(2)}</td>
    `;
    modelsTbody.appendChild(tr);
  }
}

function applyTelemetryToDom(data) {
  latestTelemetry = data;
  const active = data.activeConversation || {};
  const ctx = active.context || {};
  const quotas = data.quotas || {};
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
    } else {
      livePill.textContent = '实时 2s';
      livePill.classList.remove('running');
    }
  }

  // 2. Status strip metrics
  $('tok-per-sec').textContent = `${Number(active.latestTokPerSec || 0).toFixed(1)} tok/s`;
  $('ttft-value').textContent = `${Number(active.latestTtftSec || 0).toFixed(1)}s`;
  $('avg-speed-value').textContent = `${Number(active.avgTokPerSec || 0).toFixed(1)}`;
  $('session-cost-value').textContent = `$${Number(active.sessionCostUsd || 0).toFixed(2)}`;
  $('cache-hit-value').textContent = `${active.latestCacheHitPct ?? 0}%`;
  renderParallelograms(ctx.usedPct || 0);

  $('active-model-short').textContent = active.activeModelShort || 'argon-4';
  $('active-model-short').title = active.activeModelLabel || '';
  $('today-tokens').textContent = formatTokens(quotas.today?.tokens || 0);
  $('today-cost').textContent = `$${Number(quotas.today?.costUsd || 0).toFixed(2)}`;
  $('speed-mode-badge').textContent = settings.speedMode === 'total' ? '整体测速(含思考)' : '输出流测速';

  // 3. Context Window Popover Section
  const limitLabel = formatTokens(ctx.limitTokens || 1000000);
  $('ctx-summary-text').textContent = `${formatTokens(ctx.totalTokens || 0)} / ${limitLabel} (${ctx.usedPct || 0}%)`;

  const limit = Math.max(1, ctx.limitTokens || 1000000);
  $('bar-ctx-cached').style.width = `${Math.min(100, (ctx.cachedTokens / limit) * 100)}%`;
  $('bar-ctx-input').style.width = `${Math.min(100, (ctx.freshInputTokens / limit) * 100)}%`;
  $('bar-ctx-thinking').style.width = `${Math.min(100, (ctx.thinkingTokens / limit) * 100)}%`;
  $('bar-ctx-output').style.width = `${Math.min(100, (ctx.responseTokens / limit) * 100)}%`;

  $('bd-cached').textContent = formatTokens(ctx.cachedTokens);
  $('bd-input').textContent = formatTokens(ctx.freshInputTokens);
  $('bd-thinking').textContent = formatTokens(ctx.thinkingTokens);
  $('bd-output').textContent = formatTokens(ctx.responseTokens);

  document.querySelectorAll('[data-ctx-limit]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.ctxLimit) === Number(ctx.limitTokens));
  });

  // 4. Quotas Section
  $('account-tier-label').textContent = `${data.account?.tierName || 'Google AI'} · ${data.account?.planName || 'Pro'}`;
  const activePool = quotas.activePool || {};
  const used5hStr = Number(activePool.usedPct ?? 0).toFixed(1);
  const rem5hStr = Number(activePool.remainingPct ?? 100).toFixed(1);
  $('session-quota-title').textContent = `5h 限额 (${activePool.family || '当前'})`;
  $('session-reset-text').textContent = formatCountdown(activePool.resetTime);
  $('session-used-pct').textContent = `已用 ${used5hStr}% (余 ${rem5hStr}%)`;

  const sessionBar = $('bar-session-quota');
  sessionBar.style.width = `${Math.min(100, activePool.usedPct || 0)}%`;
  sessionBar.className = `bar-fill ${activePool.usedPct >= 85 ? 'danger' : activePool.usedPct >= 60 ? 'warn' : ''}`;

  renderAllPools(quotas.pools || [], activePool.family);

  const weekly = quotas.weekly || {};
  const usedWkStr = Number(weekly.usedPct ?? 0).toFixed(1);
  const remWkStr = Number(weekly.remainingPct ?? 100).toFixed(1);
  $('weekly-reset-text').textContent = formatCountdown(weekly.resetTime);
  $('weekly-used-pct').textContent = `已用 ${usedWkStr}% (余 ${remWkStr}%)`;
  const weeklyBar = $('bar-weekly-quota');
  weeklyBar.style.width = `${Math.min(100, weekly.usedPct || 0)}%`;
  weeklyBar.className = `bar-fill ${weekly.usedPct >= 85 ? 'danger' : weekly.usedPct >= 60 ? 'warn' : ''}`;

  $('weekly-tokens-text').textContent = formatTokens(weekly.tokens || 0);
  $('weekly-cost-text').textContent = `≈$${Number(weekly.costUsd || 0).toFixed(2)}`;

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
  $('setting-weekly-tokens').value = settings.weeklyTokenBudget || 80000000;
  $('setting-weekly-cost').value = settings.weeklyCostBudget || 35;

  renderTables(active, data.modelBreakdown);
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
