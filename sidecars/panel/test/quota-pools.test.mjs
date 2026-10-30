import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { backendHarness } from './backend-harness.mjs';

const FLASH = 'MODEL_PLACEHOLDER_M318';
const ARGON = 'MODEL_PLACEHOLDER_M417';
const createdAtMs = Date.now() - 20_000;

function makeStep(index, model) {
  return {
    type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
    status: 'CORTEX_STEP_STATUS_DONE',
    metadata: {
      sourceTrajectoryStepInfo: { stepIndex: index },
      createdAt: new Date(createdAtMs).toISOString(),
      completedAt: new Date(createdAtMs + 5_000).toISOString(),
      modelUsage: {
        model,
        apiProvider: 'API_PROVIDER_GOOGLE_GEMINI',
        inputTokens: '1000',
        cacheReadTokens: '4000',
        outputTokens: '500',
      },
    },
  };
}

test('Ultra user: Argon and Flash sharing Gemini Models remain a single Gemini pool', async () => {
  const sharedReset = new Date(Date.now() + 18 * 3600_000).toISOString();
  const fiveHourReset = new Date(Date.now() + 2 * 3600_000).toISOString();
  const h = backendHarness({
    summaries: { conv1: { stepCount: 1 } },
    trajectories: { conv1: { trajectory: { steps: [makeStep(1, ARGON)] } } },
    userStatus: {
      userTier: { id: 'g1-ultra-lite-tier', name: 'Google AI Ultra' },
      planStatus: { planInfo: { planName: 'Pro' } },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: 'Gemini 4 Argon (High)',
            modelId: 'gemini-4-argon-high',
            modelOrAlias: { model: ARGON },
            quotaInfo: { remainingFraction: 0.087, resetTime: sharedReset },
          },
          {
            label: 'Gemini 3.8 Flash (High)',
            modelId: 'gemini-3.8-flash-high',
            modelOrAlias: { model: FLASH },
            quotaInfo: { remainingFraction: 0.087, resetTime: sharedReset },
          },
        ],
      },
    },
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini Models',
          description: 'Models within this group: Gemini Flash, Gemini Pro',
          buckets: [
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.99, resetTime: fiveHourReset },
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.0868, resetTime: sharedReset },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          buckets: [
            { bucketId: '3p-5h', window: '5h', remainingFraction: 1, resetTime: fiveHourReset },
            { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 1, resetTime: sharedReset },
          ],
        },
      ],
    },
  });

  const p = await h.buildTelemetryPayloadInternal('conv1');
  assert.deepEqual(
    Array.from(p.quotas.pools, (pool) => pool.poolKey),
    ['Gemini', 'Claude & GPT']
  );
  assert.equal(p.quotas.activePool.family, 'Gemini');
  assert.equal(p.quotas.activePool.weeklyRemainingPct, 8.7);
  assert.equal(p.quotas.weekly.poolFamily, 'Gemini');
  assert.equal(p.quotas.weekly.title, '每周限额 (Gemini)');
});

test('Pro user Shape 1: dedicated weekly-only Argon group in RetrieveUserQuotaSummary', async () => {
  const geminiWkReset = new Date(Date.now() + 48 * 3600_000).toISOString();
  const argonWkReset = new Date(Date.now() + 72 * 3600_000).toISOString();
  const fiveHourReset = new Date(Date.now() + 3 * 3600_000).toISOString();

  const h = backendHarness({
    summaries: { argonConv: { stepCount: 1 }, flashConv: { stepCount: 1 } },
    trajectories: {
      argonConv: { trajectory: { steps: [makeStep(1, ARGON)] } },
      flashConv: { trajectory: { steps: [makeStep(1, FLASH)] } },
    },
    userStatus: {
      userTier: { id: 'g1-pro-tier', name: 'Google AI Pro' },
      planStatus: { planInfo: { planName: 'Pro' } },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: 'Gemini 4 Argon (High)',
            modelId: 'gemini-4-argon-high',
            modelOrAlias: { model: ARGON },
            quotaInfo: { remainingFraction: 0.35, resetTime: argonWkReset },
          },
          {
            label: 'Gemini 3.8 Flash (High)',
            modelId: 'gemini-3.8-flash-high',
            modelOrAlias: { model: FLASH },
            quotaInfo: { remainingFraction: 0.9, resetTime: geminiWkReset },
          },
        ],
      },
    },
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini Models',
          description: 'Models within this group: Gemini Flash, Gemini Pro',
          buckets: [
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.95, resetTime: fiveHourReset },
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.9, resetTime: geminiWkReset },
          ],
        },
        {
          displayName: 'Gemini 4 Argon',
          description:
            'For paid Pro plans, Argon quota is separate. Higher Argon quota (included as part of the larger Gemini quota bucket) is available on Ultra plans.',
          buckets: [
            {
              bucketId: 'gemini-argon-wtu-weekly',
              displayName: 'Gemini 4 Argon Weekly Limit',
              description: 'You have used some of your weekly limit, it will fully refresh in 3 days, 22 hours.',
              window: 'weekly',
              remainingFraction: 0.35,
              resetTime: argonWkReset,
            },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          buckets: [
            { bucketId: '3p-5h', window: '5h', remainingFraction: 1, resetTime: fiveHourReset },
            { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 0.8, resetTime: geminiWkReset },
          ],
        },
      ],
    },
  });

  const argonPayload = await h.buildTelemetryPayloadInternal('argonConv');
  assert.deepEqual(
    Array.from(argonPayload.quotas.pools, (pool) => pool.poolKey),
    ['Gemini', 'Argon', 'Claude & GPT']
  );

  const argonPool = argonPayload.quotas.pools.find((pool) => pool.poolKey === 'Argon');
  assert.equal(argonPool.poolLabel, 'Gemini 4 Argon');
  assert.equal(argonPool.isAvailable, true);
  assert.equal(argonPool.has5h, false);
  assert.equal(argonPool.hasWeekly, true);
  assert.equal(argonPool.remainingPct, null);
  assert.equal(argonPool.weeklyRemainingPct, 35);
  assert.equal(argonPool.weeklyUsedPct, 65);
  assert.deepEqual(Array.from(argonPool.models), ['Gemini 4 Argon (High)']);

  // Active Argon conversation binds to Argon pool
  assert.equal(argonPayload.quotas.activePool.family, 'Argon');
  assert.equal(argonPayload.quotas.weekly.poolFamily, 'Argon');
  assert.equal(argonPayload.quotas.weekly.title, '每周限额 (Gemini 4 Argon)');
  assert.equal(argonPayload.quotas.weekly.remainingPct, 35);

  // Active Flash conversation binds to Gemini pool
  const flashPayload = await h.buildTelemetryPayloadInternal('flashConv');
  assert.equal(flashPayload.quotas.activePool.family, 'Gemini');
  assert.equal(flashPayload.quotas.weekly.poolFamily, 'Gemini');
  assert.equal(flashPayload.quotas.weekly.title, '每周限额 (Gemini)');
  assert.equal(flashPayload.quotas.weekly.remainingPct, 90);
});

test('Pro user Shape 2: argon-weekly bucket nested inside Gemini Models group splits into Argon pool', async () => {
  const wkReset = new Date(Date.now() + 60 * 3600_000).toISOString();
  const h = backendHarness({
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 1, resetTime: wkReset },
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.88, resetTime: wkReset },
            { bucketId: 'argon-weekly', window: 'weekly', remainingFraction: 0.42, resetTime: wkReset },
          ],
        },
      ],
    },
  });

  const p = await h.buildTelemetryPayloadInternal('none');
  const argonPool = p.quotas.pools.find((pool) => pool.poolKey === 'Argon');
  const geminiPool = p.quotas.pools.find((pool) => pool.poolKey === 'Gemini');
  assert.ok(argonPool);
  assert.equal(argonPool.weeklyRemainingPct, 42);
  assert.equal(argonPool.has5h, false);
  assert.equal(geminiPool.weeklyRemainingPct, 88);
  assert.equal(geminiPool.has5h, true);
});

test('Pro user Shape 3: divergent Argon quotaInfo in GetUserStatus synthesizes Argon pool when absent from summary', async () => {
  const geminiWkReset = new Date(Date.now() + 50 * 3600_000).toISOString();
  const argonWkReset = new Date(Date.now() + 90 * 3600_000).toISOString();
  const fiveHourReset = new Date(Date.now() + 2 * 3600_000).toISOString();

  const h = backendHarness({
    summaries: { argonConv: { stepCount: 1 } },
    trajectories: { argonConv: { trajectory: { steps: [makeStep(1, ARGON)] } } },
    userStatus: {
      userTier: { id: 'g1-pro-tier', name: 'Google AI Pro' },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: 'Gemini 4 Argon (High)',
            modelId: 'gemini-4-argon-high',
            modelOrAlias: { model: ARGON },
            quotaInfo: { remainingFraction: 0.25, resetTime: argonWkReset },
          },
          {
            label: 'Gemini 3.8 Flash (High)',
            modelId: 'gemini-3.8-flash-high',
            modelOrAlias: { model: FLASH },
            quotaInfo: { remainingFraction: 0.85, resetTime: geminiWkReset },
          },
        ],
      },
    },
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.95, resetTime: fiveHourReset },
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.85, resetTime: geminiWkReset },
          ],
        },
      ],
    },
  });

  const p = await h.buildTelemetryPayloadInternal('argonConv');
  const argonPool = p.quotas.pools.find((pool) => pool.poolKey === 'Argon');
  assert.ok(argonPool, 'synthesizes Argon pool from divergent clientModelConfigs.quotaInfo');
  assert.equal(argonPool.has5h, false);
  assert.equal(argonPool.hasWeekly, true);
  assert.equal(argonPool.weeklyRemainingPct, 25);
  assert.equal(argonPool.weeklyUsedPct, 75);
  assert.equal(p.quotas.activePool.family, 'Argon');
  assert.equal(p.quotas.weekly.remainingPct, 25);
});

test('exhausted 0% bucket omitting remainingFraction in proto3 is reported as 100% used, not unavailable', async () => {
  const argonWkReset = new Date(Date.now() + 30 * 3600_000).toISOString();
  const h = backendHarness({
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini 4 Argon',
          buckets: [
            // Proto3 omits remainingFraction when it equals 0
            { bucketId: 'argon-weekly', window: 'weekly', resetTime: argonWkReset },
          ],
        },
      ],
    },
  });

  const p = await h.buildTelemetryPayloadInternal('none');
  const argonPool = p.quotas.pools.find((pool) => pool.poolKey === 'Argon');
  assert.ok(argonPool);
  assert.equal(argonPool.isAvailable, true);
  assert.equal(argonPool.weeklyRemainingPct, 0);
  assert.equal(argonPool.weeklyUsedPct, 100);
});

test('telemetryStore isEquivalentTelemetry detects quota changes in non-active pools', () => {
  const source = fs.readFileSync(new URL('../src/store/telemetryStore.js', import.meta.url), 'utf8');
  const fn = source.slice(
    source.indexOf('function isEquivalentTelemetry'),
    source.indexOf('export async function fetchTelemetry')
  );
  const ctx = {};
  vm.runInNewContext(fn + '\nglobalThis.compare=isEquivalentTelemetry;', ctx);

  const a = {
    account: { tierName: 'Google AI Pro', planName: 'Pro' },
    quotas: {
      activePool: { family: 'Gemini', usedPct: 10, remainingPct: 90, weeklyUsedPct: 20 },
      weekly: { usedPct: 20, remainingPct: 80 },
      pools: [
        { poolKey: 'Gemini', poolLabel: 'Gemini', usedPct: 10, remainingPct: 90, weeklyUsedPct: 20, weeklyRemainingPct: 80 },
        { poolKey: 'Argon', poolLabel: 'Gemini 4 Argon', usedPct: null, remainingPct: null, weeklyUsedPct: 40, weeklyRemainingPct: 60 },
      ],
    },
  };
  const b = structuredClone(a);
  b.quotas.pools[1].weeklyUsedPct = 55;
  b.quotas.pools[1].weeklyRemainingPct = 45;
  assert.equal(ctx.compare(a, b), false);
  assert.equal(ctx.compare(a, structuredClone(a)), true);
});

test('switching accounts within 10s immediately invalidates quotaSummaryCache', async () => {
  const proReset = '2026-11-03T10:24:10Z';
  const ultraReset = '2026-11-05T16:02:44Z';
  const h = backendHarness({
    userStatus: {
      email: 'pro-user@example.com',
      userTier: { id: 'g1-pro-tier', name: 'Google AI Pro' },
    },
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini Models',
          description: 'Models within this group: Gemini Flash, Gemini Pro',
          buckets: [
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.9990884, resetTime: ultraReset },
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 1, resetTime: '2026-10-30T17:21:07Z' },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          description: 'Models within this group: Claude Opus, Claude Sonnet, GPT-OSS',
          buckets: [
            { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 1, resetTime: '2026-11-06T03:55:10Z' },
            { bucketId: '3p-5h', window: '5h', remainingFraction: 1, resetTime: '2026-10-30T17:21:07Z' },
          ],
        },
        {
          displayName: 'Gemini 4 Argon',
          description:
            'For paid Pro plans, Argon quota is separate. Higher Argon quota (included as part of the larger Gemini quota bucket) is available on Ultra plans.',
          buckets: [
            {
              bucketId: 'gemini-argon-wtu-weekly',
              displayName: 'Gemini 4 Argon Weekly Limit',
              window: 'weekly',
              remainingFraction: 0.6623139,
              resetTime: proReset,
            },
          ],
        },
      ],
    },
  });

  const first = await h.buildTelemetryPayloadInternal('none');
  assert.deepEqual(
    Array.from(first.quotas.pools, (pool) => pool.poolKey),
    ['Gemini', 'Argon', 'Claude & GPT']
  );
  const argonPool = first.quotas.pools.find((pool) => pool.poolKey === 'Argon');
  assert.equal(argonPool.weeklyRemainingPct, 66.2);
  assert.equal(argonPool.weeklyUsedPct, 33.8);

  // Switch account to Ultra immediately (within the 10-second local cache window)
  h.state.userStatus = {
    email: 'ultra-user@example.com',
    userTier: { id: 'g1-ultra-lite-tier', name: 'Google AI Ultra' },
  };
  h.state.quotaSummary = {
    groups: [
      {
        displayName: 'Gemini Models',
        buckets: [
          { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.087, resetTime: ultraReset },
          { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.99, resetTime: '2026-10-30T17:21:07Z' },
        ],
      },
      {
        displayName: 'Claude and GPT models',
        buckets: [
          { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 1, resetTime: '2026-11-06T03:55:10Z' },
          { bucketId: '3p-5h', window: '5h', remainingFraction: 1, resetTime: '2026-10-30T17:21:07Z' },
        ],
      },
    ],
  };

  const second = await h.buildTelemetryPayloadInternal('none');
  assert.deepEqual(
    Array.from(second.quotas.pools, (pool) => pool.poolKey),
    ['Gemini', 'Claude & GPT']
  );
  assert.equal(second.quotas.pools[0].weeklyRemainingPct, 8.7);
});
