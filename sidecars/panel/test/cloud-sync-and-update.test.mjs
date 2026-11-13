import test from 'node:test';
import assert from 'node:assert/strict';
import { backendHarness } from './backend-harness.mjs';

const createdAtMs = Date.now() - 20_000;
function makeStep(index, modelKey, responseModel = '') {
  return {
    type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
    status: 'CORTEX_STEP_STATUS_DONE',
    metadata: {
      sourceTrajectoryStepInfo: { stepIndex: index },
      createdAt: new Date(createdAtMs).toISOString(),
      completedAt: new Date(createdAtMs + 5_000).toISOString(),
      modelUsage: {
        model: modelKey,
        ...(responseModel ? { responseModel } : {}),
        apiProvider: 'API_PROVIDER_GOOGLE_GEMINI',
        inputTokens: '100000',
        cacheReadTokens: '400000',
        outputTokens: '50000',
      },
    },
  };
}

test('sanitizeCatalogPayload filters malformed/null/zero entries, untrusted URLs, and preserves valid pricing', () => {
  const { sanitizeCatalogPayload } = backendHarness();
  assert.equal(sanitizeCatalogPayload(null), null);
  assert.equal(sanitizeCatalogPayload({ pricing: {} }), null);

  const sanitized = sanitizeCatalogPayload({
    schemaVersion: 1,
    catalogVersion: '2026.11.03.9',
    updatedAt: '2026-11-03T15:00:00Z',
    latestPluginVersion: '1.5.0',
    downloadUrl: 'https://evil.example.com/malware.zip',
    pricing: {
      'gemini-4.5-ultra': { input: 3.5, cache: 0.35, output: 15.0, short: 'ultra-4.5', family: 'Gemini' },
      'broken-negative': { input: -1, cache: 0.1, output: 5, short: 'bad', family: 'Gemini' },
      'broken-nan': { input: 'NaN', cache: 0.1, output: 5, short: 'bad', family: 'Gemini' },
      'broken-null': { input: null, cache: null, output: null, short: 'bad', family: 'Gemini' },
      'broken-zero': { input: 0, cache: 0, output: 0, short: 'bad', family: 'Gemini' },
      'broken-string-num': { input: '1.5', cache: 0.1, output: 5, short: 'bad', family: 'Gemini' },
      'broken-missing-short': { input: 1, cache: 0.1, output: 5, short: '', family: 'Gemini' },
    },
    placeholders: {
      MODEL_PLACEHOLDER_M999: { modelId: 'gemini-4.5-ultra', label: 'Gemini 4.5 Ultra' },
      MODEL_BROKEN: { modelId: '', label: 'Broken' },
    },
  });

  assert.ok(sanitized);
  assert.equal(sanitized.catalogVersion, '2026.11.03.9');
  assert.equal(sanitized.latestPluginVersion, '1.5.0');
  assert.ok(sanitized.downloadUrl.startsWith('https://github.com/yuhuan-dev/'));
  assert.deepEqual(Object.keys(sanitized.pricing), ['gemini-4.5-ultra']);
  assert.deepEqual(Object.keys(sanitized.placeholders), ['MODEL_PLACEHOLDER_M999']);
});

test('cloud catalog sync fetches from GitHub raw URL and dynamically prices newly pushed models', async () => {
  const step = makeStep(1, 'MODEL_PLACEHOLDER_M888');
  let fetchedUrl = '';

  const h = backendHarness({
    pluginManifest: { name: 'usage-monitor', version: '1.4.0' },
    summaries: { conv1: { stepCount: 1 } },
    trajectories: { conv1: { trajectory: { steps: [step] } } },
    remoteFetch: async (url) => {
      fetchedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          catalogVersion: '2026.11.03.2',
          updatedAt: '2026-11-03T16:00:00Z',
          latestPluginVersion: '1.5.0',
          pricing: {
            'gemini-5-nova': { input: 4.0, cache: 0.4, output: 20.0, short: 'nova-5', family: 'Gemini' },
          },
          placeholders: {
            MODEL_PLACEHOLDER_M888: { modelId: 'gemini-5-nova', label: 'Gemini 5 Nova' },
          },
        }),
      };
    },
  });

  // Before cloud sync: M888 is unknown and unpriced
  const before = await h.buildTelemetryPayloadInternal('conv1');
  assert.equal(before.activeConversation.activeModelShort, 'MODEL_PLACEHOLDER_M888');
  assert.equal(before.activeConversation.latestStepCostUsd, null);
  assert.equal(before.consumption.account.unpricedCalls, 1);
  assert.equal(before.cloudStatus.updateAvailable, false);

  // Sync cloud catalog from GitHub
  const syncStatus = await h.syncCloudCatalog({ force: true });
  assert.ok(fetchedUrl.startsWith('https://raw.githubusercontent.com/yuhuan-dev/antigravity-usage-monitor/main/pricing-catalog.json'));
  assert.equal(syncStatus.source, 'remote');
  assert.equal(syncStatus.catalogVersion, '2026.11.03.2');
  assert.equal(syncStatus.latestPluginVersion, '1.5.0');
  assert.equal(syncStatus.updateAvailable, true);

  // Immediately re-evaluate payload: M888 is now resolved and priced without clearing trajectoryCache
  const after = await h.buildTelemetryPayloadInternal('conv1');
  assert.equal(after.activeConversation.activeModelShort, 'nova-5');
  assert.equal(after.activeConversation.activeModelLabel, 'Gemini 5 Nova');
  // Cost = 0.1M * $4.0 + 0.4M * $0.4 + 0.05M * $20.0 = 0.4 + 0.16 + 1.0 = $1.56
  assert.equal(after.activeConversation.latestStepCostUsd, 1.56);
  assert.equal(after.consumption.account.unpricedCalls, 0);
  assert.equal(after.consumption.account.costUsd, 1.56);
});

test('resolveModelInfo falls back to responseModel when placeholder enum is unmapped', async () => {
  const step = makeStep(1, 'MODEL_PLACEHOLDER_M777', 'gemini-4-argon-high');
  const h = backendHarness({
    summaries: { conv1: { stepCount: 1 } },
    trajectories: { conv1: { trajectory: { steps: [step] } } },
  });
  const p = await h.buildTelemetryPayloadInternal('conv1');
  assert.equal(p.activeConversation.activeModelShort, 'argon-4-high');
  assert.equal(p.consumption.account.unpricedCalls, 0);
  assert.ok(p.activeConversation.latestStepCostUsd > 0);
});

test('performPluginUpdate blocks overwriting dirty worktrees (including untracked ?? files) without stashing', async () => {
  for (const [rootPath, porcelainOutput] of [
    ['/workspace/antigravity-usage-monitor', ' M sidecars/panel/main.mjs\n'],
    ['/Users/test/.gemini/config/plugins/usage-monitor', '?? sidecars/panel/backend/config.mjs\n'],
  ]) {
    const gitCalls = [];
    const h = backendHarness({
      hasGitDir: true,
      pluginRootPath: rootPath,
      pluginManifest: { name: 'usage-monitor', version: '1.4.0' },
      execFileImpl: (_cmd, args, opts, cb) => {
        const fn = typeof opts === 'function' ? opts : cb;
        gitCalls.push(args);
        if (args.includes('status')) {
          assert(!args.includes('--untracked-files=no'), 'must inspect untracked files too');
          fn(null, porcelainOutput, '');
          return;
        }
        fn(null, '', '');
      },
    });

    const res = await h.performPluginUpdate({ isAuto: false });
    assert.equal(res.ok, false);
    assert.equal(res.skipped, true);
    assert.equal(res.reason, 'dirty_worktree');
    assert.equal(gitCalls.length, 1);
    assert(!gitCalls.some((args) => args.includes('stash')));
  }
});

test('performPluginUpdate blocks non-main branches and diverged git history', async () => {
  const branchH = backendHarness({
    hasGitDir: true,
    pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
    pluginManifest: { name: 'usage-monitor', version: '1.4.0' },
    execFileImpl: (_cmd, args, opts, cb) => {
      const fn = typeof opts === 'function' ? opts : cb;
      if (args.includes('rev-parse')) {
        fn(null, 'fix/humanize-copy-strings\n', '');
        return;
      }
      fn(null, '', '');
    },
  });
  const branchRes = await branchH.performPluginUpdate({ isAuto: false });
  assert.equal(branchRes.ok, false);
  assert.equal(branchRes.reason, 'not_on_main_branch');

  const divergedH = backendHarness({
    hasGitDir: true,
    pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
    pluginManifest: { name: 'usage-monitor', version: '1.3.0' },
    execFileImpl: (_cmd, args, opts, cb) => {
      const fn = typeof opts === 'function' ? opts : cb;
      if (args.includes('rev-parse')) {
        fn(null, 'main\n', '');
        return;
      }
      if (args.includes('show')) {
        fn(null, JSON.stringify({ name: 'usage-monitor', version: '1.4.0' }), '');
        return;
      }
      if (args.includes('merge-base')) {
        fn(new Error('not ancestor'));
        return;
      }
      fn(null, '', '');
    },
  });
  const divRes = await divergedH.performPluginUpdate({ isAuto: false });
  assert.equal(divRes.ok, false);
  assert.equal(divRes.reason, 'diverged_worktree');
});

test('performPluginUpdate refuses to downgrade or pull when remote version is older, equal, or unreadable', async () => {
  for (const showOutput of [
    JSON.stringify({ name: 'usage-monitor', version: '1.2.0' }),
    JSON.stringify({ name: 'usage-monitor', version: '1.4.0' }),
    '', // git show failed or empty — must NOT fall back to cloudSyncState.latestPluginVersion
  ]) {
    const gitCalls = [];
    const h = backendHarness({
      hasGitDir: true,
      pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
      pluginManifest: { name: 'usage-monitor', version: '1.4.0' },
      remoteCatalog: {
        schemaVersion: 1,
        catalogVersion: '2026.11.03.9',
        updatedAt: '2026-11-03T18:00:00Z',
        latestPluginVersion: '1.9.0',
        pricing: { 'gemini-4-argon': { input: 2, cache: 0.1, output: 10, short: 'argon-4', family: 'Gemini' } },
      },
      execFileImpl: (_cmd, args, opts, cb) => {
        const fn = typeof opts === 'function' ? opts : cb;
        gitCalls.push(args);
        if (args.includes('rev-parse')) {
          fn(null, 'main\n', '');
          return;
        }
        if (args.includes('show')) {
          if (!showOutput) {
            fn(new Error('fatal: Path plugin.json does not exist'));
            return;
          }
          fn(null, showOutput, '');
          return;
        }
        fn(null, '', '');
      },
    });

    const res = await h.performPluginUpdate({ isAuto: false });
    assert.equal(res.ok, false);
    assert.equal(res.skipped, true);
    assert.equal(res.upToDate, true);
    assert.equal(res.reason, 'already_up_to_date');
    assert.equal(res.currentVersion, '1.4.0');
    assert(!gitCalls.some((args) => args.includes('pull')));
  }
});

test('performPluginUpdate pulls fast-forward when git worktree is clean, on main, ancestor, and remote version is newer', async () => {
  const gitCalls = [];
  const h = backendHarness({
    hasGitDir: true,
    pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
    pluginManifest: { name: 'usage-monitor', version: '1.3.1' },
    execFileImpl: (_cmd, args, opts, cb) => {
      const fn = typeof opts === 'function' ? opts : cb;
      gitCalls.push(args);
      if (args.includes('rev-parse')) {
        fn(null, 'main\n', '');
        return;
      }
      if (args.includes('show')) {
        fn(null, JSON.stringify({ name: 'usage-monitor', version: '1.4.0' }), '');
        return;
      }
      if (args.includes('pull')) {
        h.state.pluginManifest = { name: 'usage-monitor', version: '1.4.0' };
      }
      fn(null, '', '');
    },
  });

  const res = await h.performPluginUpdate({ isAuto: false });
  assert.equal(res.ok, true);
  assert.equal(res.mode, 'git');
  assert.equal(res.previousVersion, '1.3.1');
  assert.equal(res.currentVersion, '1.4.0');
  assert.equal(gitCalls.length, 7); // status, rev-parse, remote get-url, fetch, show, merge-base, pull
});

test('repository migration: scrubs legacy yuhuan2498281558 cache URLs/TTL and migrates git origin remote to yuhuan-dev', async () => {
  let fetchedNewRepoUrl = '';
  const cacheH = backendHarness({
    pluginManifest: { name: 'usage-monitor', version: '1.4.4' },
    remoteCatalog: {
      schemaVersion: 1,
      catalogVersion: '2026.11.11.4',
      updatedAt: '2026-11-11T23:20:00+09:00',
      latestPluginVersion: '1.4.4',
      releaseUrl: 'https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest',
      downloadUrl: 'https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip',
      archiveFallbackUrl: 'https://codeload.github.com/yuhuan2498281558/antigravity-usage-monitor/zip/refs/heads/main',
      sourceUrl: 'https://raw.githubusercontent.com/yuhuan2498281558/antigravity-usage-monitor/main/pricing-catalog.json',
      fetchedAtMs: Date.now() - 60_000, // 1 min ago from old repo -> must NOT block non-forced sync to yuhuan-dev
      pricing: {
        'gemini-4-carbon-high': { input: 2.0, cache: 0.1, output: 10.0, short: 'carbon-4-high', family: 'Gemini' },
      },
    },
    remoteFetch: async (url) => {
      fetchedNewRepoUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          catalogVersion: '2026.11.12.1',
          updatedAt: '2026-11-12T10:00:00+09:00',
          latestPluginVersion: '1.4.5',
          pricing: {
            'gemini-4-carbon-high': { input: 2.0, cache: 0.1, output: 10.0, short: 'carbon-4-high', family: 'Gemini' },
          },
        }),
      };
    },
  });

  const initialStatus = cacheH.getCloudStatus();
  assert.equal(initialStatus.releaseUrl, 'https://github.com/yuhuan-dev/antigravity-usage-monitor/releases/latest');
  assert.equal(initialStatus.downloadUrl, 'https://github.com/yuhuan-dev/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip');
  assert.equal(initialStatus.lastSyncedAtMs, 0, 'legacy repo cache TTL must be invalidated so new repo syncs immediately');

  const synced = await cacheH.syncCloudCatalog({ force: false });
  assert.equal(
    fetchedNewRepoUrl,
    'https://raw.githubusercontent.com/yuhuan-dev/antigravity-usage-monitor/main/pricing-catalog.json'
  );
  assert.equal(synced.catalogVersion, '2026.11.12.1');
  assert.equal(synced.latestPluginVersion, '1.4.5');

  assert.equal(
    cacheH.resolveMigratedGitRemoteUrl('https://github.com/yuhuan2498281558/antigravity-usage-monitor.git'),
    'https://github.com/yuhuan-dev/antigravity-usage-monitor.git'
  );
  assert.equal(
    cacheH.resolveMigratedGitRemoteUrl('git@github.com:yuhuan2498281558/antigravity-usage-monitor.git'),
    'git@github.com:yuhuan-dev/antigravity-usage-monitor.git'
  );
  assert.equal(
    cacheH.resolveMigratedGitRemoteUrl('https://github.com/custom-fork/antigravity-usage-monitor.git'),
    ''
  );

  const gitCalls = [];
  const migrateH = backendHarness({
    hasGitDir: true,
    pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
    pluginManifest: { name: 'usage-monitor', version: '1.4.3' },
    execFileImpl: (_cmd, args, opts, cb) => {
      const fn = typeof opts === 'function' ? opts : cb;
      gitCalls.push(args);
      if (args.includes('rev-parse')) {
        fn(null, 'main\n', '');
        return;
      }
      if (args.includes('remote') && args.includes('get-url')) {
        fn(null, 'https://github.com/yuhuan2498281558/antigravity-usage-monitor.git\n', '');
        return;
      }
      if (args.includes('show')) {
        fn(null, JSON.stringify({ name: 'usage-monitor', version: '1.4.4' }), '');
        return;
      }
      if (args.includes('pull')) {
        migrateH.state.pluginManifest = { name: 'usage-monitor', version: '1.4.4' };
      }
      fn(null, '', '');
    },
  });

  const updRes = await migrateH.performPluginUpdate({ isAuto: false });
  assert.equal(updRes.ok, true);
  assert.equal(updRes.currentVersion, '1.4.4');
  const setUrlCall = gitCalls.find((args) => args.includes('remote') && args.includes('set-url'));
  assert.ok(setUrlCall, 'must run git remote set-url origin before fetching');
  assert.equal(setUrlCall[setUrlCall.length - 1], 'https://github.com/yuhuan-dev/antigravity-usage-monitor.git');
});

test('pluginUpdateMode supports manual (default), auto, and off with legacy autoUpdatePlugin compatibility', async () => {
  const defaultH = backendHarness();
  assert.equal(defaultH.loadSettings().pluginUpdateMode, 'manual');
  assert.equal(defaultH.loadSettings().autoUpdatePlugin, false);

  const legacyAutoH = backendHarness({ settings: { autoUpdatePlugin: true } });
  assert.equal(legacyAutoH.loadSettings().pluginUpdateMode, 'auto');
  assert.equal(legacyAutoH.loadSettings().autoUpdatePlugin, true);

  const offSettings = {};
  let gitTriggered = false;
  const offH = backendHarness({
    settings: offSettings,
    hasGitDir: true,
    pluginRootPath: '/Users/test/.gemini/config/plugins/usage-monitor',
    pluginManifest: { name: 'usage-monitor', version: '1.4.0' },
    remoteFetch: async () => ({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        catalogVersion: '2026.11.11.9',
        updatedAt: '2026-11-11T22:00:00+09:00',
        latestPluginVersion: '1.5.0',
        pricing: {
          'gemini-4-argon': { input: 2.0, cache: 0.1, output: 10.0, short: 'argon-4', family: 'Gemini' },
        },
      }),
    }),
    execFileImpl: (_cmd, _args, opts, cb) => {
      gitTriggered = true;
      const fn = typeof opts === 'function' ? opts : cb;
      fn(null, '', '');
    },
  });

  const saveOff = offH.executeSettingsAction({ pluginUpdateMode: 'off' }).updated;
  assert.equal(saveOff.pluginUpdateMode, 'off');
  assert.equal(saveOff.autoUpdatePlugin, false);
  Object.assign(offSettings, saveOff);

  await offH.syncCloudCatalog({ force: true });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(gitTriggered, false, 'pluginUpdateMode=off must never trigger auto update');

  const saveAuto = offH.executeSettingsAction({ pluginUpdateMode: 'auto' }).updated;
  assert.equal(saveAuto.pluginUpdateMode, 'auto');
  assert.equal(saveAuto.autoUpdatePlugin, true);
  Object.assign(offSettings, saveAuto);

  await offH.syncCloudCatalog({ force: true });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(gitTriggered, true, 'pluginUpdateMode=auto triggers background update check');
});
