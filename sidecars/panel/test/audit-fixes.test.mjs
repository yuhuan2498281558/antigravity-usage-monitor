import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { backendHarness } from './backend-harness.mjs';
import {
  extractContextBreakdown,
  extractModelSteps,
  normalizeCachedStep,
} from '../speed-metrics.mjs';
import {
  formatCountdown,
  formatUsd,
  speedReasonText,
} from '../src/core/formatters.js';
import { createReactiveStore } from '../src/core/reactive.js';
import { stripModuleSyntax } from '../scripts/build-bundle.mjs';

const nowMs = Date.now();
const nowIso = new Date(nowMs - 5_000).toISOString();
const doneIso = new Date(nowMs - 3_000).toISOString();

test('BUG-01 & INCON-01: Google-proxied Claude/GPT/o-series never misclassify as Gemini, and M429/M322/M149/M20 resolve accurately', () => {
  const h = backendHarness({
    userStatus: {
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            modelOrAlias: { model: 'MODEL_CLAUDE_PROXY' },
            label: 'Claude Opus 4.6 (Google Vertex)',
            quotaInfo: { remainingFraction: 0.75, resetTime: new Date(nowMs + 3600_000).toISOString() },
          },
        ],
      },
    },
  });

  const infoClaude = h.resolveModelInfo('claude-opus-4-6', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(infoClaude.family, 'Claude');
  const infoO3 = h.resolveModelInfo('o3-mini', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(infoO3.family, 'GPT');

  // Calling resolveModelInfo with omitted dynamicModelMap must not throw (BUG-03)
  const infoDefaultMap = h.resolveModelInfo('MODEL_PLACEHOLDER_M320');
  assert.equal(infoDefaultMap.modelId, 'gemini-3.8-flash-low');
  assert.equal(infoDefaultMap.pricing?.input, 0.3);

  const m429 = h.resolveModelInfo('MODEL_PLACEHOLDER_M429', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(m429.modelId, 'gemini-4-carbon-high');
  assert.equal(m429.shortName, 'carbon-4-high');

  const m322 = h.resolveModelInfo('MODEL_PLACEHOLDER_M322', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(m322.modelId, 'gemini-3.8-flash-tiered');
  assert.equal(
    h.computeStepCost(
      {
        modelKey: 'MODEL_PLACEHOLDER_M322',
        inputTokens: 1_000_000,
        cacheReadTokens: 0,
        outputTokens: 0,
      },
      m322.pricing
    ),
    0.75
  );

  const m149 = h.resolveModelInfo('MODEL_PLACEHOLDER_M149', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(m149.modelId, 'gemini-3.5-flash-high');

  const m20 = h.resolveModelInfo('MODEL_PLACEHOLDER_M20', new Map(), 'API_PROVIDER_GOOGLE_GEMINI');
  assert.equal(m20.modelId, 'gemini-3.5-flash');
});

test('BUG-02 & BUG-11: ide:<uuid> external sessions do not double-count live conversations, cross-account entries are isolated, and orphan subagents never leak to top-level list', async () => {
  const stepObj = {
    status: 'CORTEX_STEP_STATUS_DONE',
    metadata: {
      sourceTrajectoryStepInfo: { stepIndex: 1 },
      createdAt: nowIso,
      completedAt: doneIso,
      modelUsage: {
        model: 'MODEL_PLACEHOLDER_M318',
        inputTokens: '10000',
        cacheReadTokens: '20000',
        outputTokens: '5000',
      },
    },
  };
  const h = backendHarness({
    userStatus: { email: 'alice@example.com' },
    deepStats: {
      accountName: 'alice@example.com',
      perConvo: {
        // Same conversation ID as live 'abcd-1234' (case-insensitive, prefixed with 'ide:') -> must deduplicate!
        'ide:AbCd-1234': {
          accountName: 'alice@example.com',
          appSource: 'ide',
          entries: [
            { ts: nowIso, model: 'MODEL_PLACEHOLDER_M318', inp: 10000, cache: 20000, out: 5000, reasoning: 0 },
            { ts: doneIso, model: 'MODEL_PLACEHOLDER_M318', inp: 10000, cache: 20000, out: 5000, reasoning: 0 },
          ],
        },
        // Different account -> must be excluded when logged in as alice@example.com!
        'ide:bob-conv': {
          accountName: 'bob@example.com',
          appSource: 'ide',
          entries: [
            { ts: nowIso, model: 'MODEL_PLACEHOLDER_M318', inp: 99000, cache: 0, out: 1000, reasoning: 0 },
          ],
        },
      },
    },
    cache: {
      'orphan-sub': {
        accountName: 'bob@example.com',
        isSubagent: true,
        parentCascadeId: 'deleted-parent',
        signature: 'v10-model-identity:sub',
        steps: extractModelSteps([stepObj]),
      },
    },
    summaries: {
      'abcd-1234': { stepCount: 1, lastModifiedTime: doneIso, status: 'IDLE' },
    },
    trajectories: {
      'abcd-1234': { trajectory: { steps: [stepObj] } },
    },
  });

  const p = await h.buildTelemetryPayloadInternal('abcd-1234', false, { range: 'all' });
  // ide:AbCd-1234 has 2 entries vs live abcd-1234's 1 step -> deduplicated (no 1 + 2 = 3 double counting!), bob excluded!
  assert.equal(p.consumption.account.conversationsCount, 1);
  assert.equal(p.consumption.account.calls, 2);
  assert.equal(p.consumption.account.totalTokens, 70_000);
  assert.equal(
    p.conversations.some((c) => c.cascadeId === 'orphan-sub'),
    false,
    'orphan subagent must not appear in top-level conversation dropdown'
  );
});

test('BUG-03, BUG-12 & BUG-16: negative/NaN token sanitization, deferred costUsd rounding, and dynamicModelMap default', async () => {
  const badStep = {
    status: 'CORTEX_STEP_STATUS_DONE',
    metadata: {
      sourceTrajectoryStepInfo: { stepIndex: 1 },
      createdAt: nowIso,
      completedAt: doneIso,
      modelUsage: {
        model: 'MODEL_PLACEHOLDER_M318',
        inputTokens: '-5000',
        cacheReadTokens: 'NaN',
        outputTokens: '1000',
        thinkingOutputTokens: '2500',
      },
    },
  };
  const extracted = extractModelSteps([badStep]);
  assert.equal(extracted[0].inputTokens, 0);
  assert.equal(extracted[0].cacheReadTokens, 0);
  assert.equal(extracted[0].outputTokens, 1000);
  assert.equal(extracted[0].thinkingTokens, 1000);
  assert.equal(extracted[0].responseTokens, 0);
  assert.equal(normalizeCachedStep({ ...extracted[0], inputTokens: -99 }).inputTokens, 0);
  assert.equal(normalizeCachedStep(null), null);

  // Micro-steps: 100 steps * (1067 output * $3.75 / 1M = $0.00400125) = $0.40 (previously rounded per-step to $0.00 -> $0.00!)
  const microSteps = Array.from({ length: 100 }, (_, idx) => ({
    status: 'CORTEX_STEP_STATUS_DONE',
    metadata: {
      sourceTrajectoryStepInfo: { stepIndex: idx + 1 },
      createdAt: nowIso,
      completedAt: doneIso,
      modelUsage: {
        model: 'MODEL_PLACEHOLDER_M318', // gemini-3.8-flash-high: $0.75/1M input, $3.75/1M output
        inputTokens: '0',
        cacheReadTokens: '0',
        outputTokens: '1067',
      },
    },
  }));
  const h = backendHarness({
    summaries: { micro: { stepCount: 100, lastModifiedTime: doneIso, status: 'IDLE' } },
    trajectories: { micro: { trajectory: { steps: microSteps } } },
  });
  const p = await h.buildTelemetryPayloadInternal('micro', false, { range: 'today' });
  assert.equal(p.consumption.account.costUsd, 0.4);
});

test('BUG-04 & BUG-10: failed RUNNING trajectory fetch enters cooldown instead of hammering RPC every poll, cleared by forceRefresh', async () => {
  const h = backendHarness({
    summaries: { run1: { stepCount: 2, lastModifiedTime: doneIso, status: 'CASCADE_RUN_STATUS_RUNNING' } },
    trajectories: { run1: new Error('LS timeout') },
    quotaSummary: new Error('Quota RPC down'),
  });

  await h.buildTelemetryPayloadInternal('run1', false);
  const callsAfterFirst = h.state.calls.filter((c) => c.method === 'GetCascadeTrajectory').length;
  const quotaCallsAfterFirst = h.state.calls.filter((c) => c.method === 'RetrieveUserQuotaSummary').length;
  assert.equal(callsAfterFirst, 1);
  assert.equal(quotaCallsAfterFirst, 1);

  // Immediate second background poll must respect cooldown for both trajectory and quota RPC
  await h.buildTelemetryPayloadInternal('run1', false);
  assert.equal(h.state.calls.filter((c) => c.method === 'GetCascadeTrajectory').length, 1);
  assert.equal(h.state.calls.filter((c) => c.method === 'RetrieveUserQuotaSummary').length, 1);

  // Manual forceRefresh=true bypasses cooldown immediately
  await h.buildTelemetryPayloadInternal('run1', true);
  assert.equal(h.state.calls.filter((c) => c.method === 'GetCascadeTrajectory').length, 2);
  assert.equal(h.state.calls.filter((c) => c.method === 'RetrieveUserQuotaSummary').length, 2);
});

test('BUG-09, BUG-14 & BUG-15: SemVer 2.0 prerelease/build ordering, future-only exhausted quota inference, and <6h dual-bucket classification', async () => {
  const h = backendHarness({
    quotaSummary: {
      groups: [
        {
          displayName: 'Gemini',
          buckets: [
            {
              // Omitted remainingFraction with epoch-0 resetTime must NOT falsely report 0% remaining!
              resetTime: '1970-01-01T00:00:00Z',
            },
          ],
        },
        {
          displayName: 'Claude & GPT',
          buckets: [
            {
              remainingFraction: 0.4,
              resetTime: new Date(nowMs + 2 * 3600_000).toISOString(),
            },
            {
              remainingFraction: 0.8,
              // Weekly bucket that happens to be 4h away from resetting!
              resetTime: new Date(nowMs + 4 * 3600_000).toISOString(),
            },
          ],
        },
      ],
    },
  });

  assert.equal(h.compareSemver('1.4.2+20261110', '1.4.2'), 0);
  assert.equal(h.compareSemver('1.5.0-beta.2', '1.5.0-alpha.10'), 1);
  assert.equal(h.compareSemver('1.5.0-alpha.1', '1.5.0-alpha.beta'), -1);

  const p = await h.buildTelemetryPayloadInternal('');
  const geminiPool = p.quotas.pools.find((x) => x.poolKey === 'Gemini');
  assert.ok(geminiPool);
  assert.equal(geminiPool.isAvailable, false, 'epoch-0 omitted remainingFraction must not create fake 0% exhausted pool');
  assert.equal(geminiPool.remainingPct, null);
  assert.equal(geminiPool.usedPct, null);

  const claudePool = p.quotas.pools.find((x) => x.poolKey === 'Claude & GPT');
  assert.ok(claudePool);
  assert.equal(claudePool.remainingPct, 40);
  assert.equal(claudePool.weeklyRemainingPct, 80);

  assert.equal(formatCountdown(new Date(nowMs + 30_000).toISOString(), nowMs), '<1分钟后重置');
  assert.equal(formatCountdown('1969-12-31T23:59:59Z', nowMs), '未知重置时间');
  assert.equal(formatUsd(0.0004, { precise: true }), '<$0.001');
  assert.equal(formatUsd(12.34, { unpricedCalls: 1, compactPending: true }), '$12.34+');
  assert.equal(speedReasonText('short_timing'), '耗时过短 (<0.5s)');
});

test('BUG-17 & CANCEL-06: extractContextBreakdown classifies messagePrompts when children are empty and blocks post-compaction carryover', () => {
  const ctx = extractContextBreakdown({
    chatStartMetadata: {
      contextWindowMetadata: {
        estimatedTokensUsed: 10000,
        tokenBreakdown: {
          groups: [
            { type: 'TOKEN_TYPE_SYSTEM_PROMPT', numTokens: 2000 },
            { type: 'TOKEN_TYPE_CHAT_MESSAGES', numTokens: 8000, children: [] },
          ],
        },
      },
    },
    messagePrompts: [
      { source: 'CHAT_MESSAGE_SOURCE_USER', prompt: '<USER_REQUEST>hello world</USER_REQUEST>' },
      { source: 'CHAT_MESSAGE_SOURCE_MODEL', prompt: 'Assistant reply content here!' },
    ],
  });
  assert.ok(ctx);
  assert.equal(ctx.systemPromptTokens, 2000);
  assert.ok(ctx.userInputTokens > 0);
  assert.ok(ctx.assistantTokens > 0);
  assert.equal(ctx.userInputTokens + ctx.assistantTokens, 8000);

  const stepsWithTrailingCheckpoint = extractModelSteps(
    [
      {
        status: 'CORTEX_STEP_STATUS_DONE',
        metadata: {
          sourceTrajectoryStepInfo: { stepIndex: 1 },
          createdAt: nowIso,
          completedAt: doneIso,
          modelUsage: { model: 'MODEL_PLACEHOLDER_M318', inputTokens: '180000', outputTokens: '500' },
        },
      },
      {
        type: 'CORTEX_STEP_TYPE_CHECKPOINT',
        status: 'CORTEX_STEP_STATUS_DONE',
        metadata: {
          sourceTrajectoryStepInfo: { stepIndex: 2 },
          createdAt: nowIso,
          completedAt: doneIso,
          modelUsage: { model: 'MODEL_PLACEHOLDER_M318', inputTokens: '180000', outputTokens: '1200' },
        },
      },
    ],
    [
      {
        stepIndices: [1],
        chatModel: {
          chatStartMetadata: {
            contextWindowMetadata: {
              estimatedTokensUsed: 180_000,
              tokenBreakdown: {
                groups: [{ type: 'TOKEN_TYPE_CHAT_MESSAGES', numTokens: 180_000 }],
              },
            },
          },
        },
      },
    ]
  );
  assert.equal(stepsWithTrailingCheckpoint.length, 2);
  assert.equal(stepsWithTrailingCheckpoint[1].isCompactionStep, true);
  assert.equal(
    stepsWithTrailingCheckpoint[1].contextBreakdown,
    null,
    'compaction checkpoint must not inherit pre-compaction 180k contextBreakdown'
  );
});

test('BUG-20 & BUG-24: reactive store microtask deduplication, stripModuleSyntax safety, and IIFE bundle isolation', async () => {
  const store = createReactiveStore({ a: 1, b: 2 });
  let calls = 0;
  store.subscribe((s) => s.a + s.b, () => {
    calls += 1;
  }, { immediate: false });

  store.setState({ a: 10 });
  store.setState({ b: 20 });
  await new Promise((r) => queueMicrotask(r));
  assert.equal(calls, 1, 'multiple setState calls in same microtask must batch into 1 subscriber flush');

  const trickyModule = [
    "import './side-effect.js';",
    "import { foo,\n  bar } from './multi.js';",
    'const tpl = `\nimport { keepMe } from "tpl";\nexport const KEEP_ME = 42;\n`;',
    'export async function runTask() { return tpl; }',
    'export { runTask };',
  ].join('\n');

  const stripped = stripModuleSyntax(trickyModule);
  assert.ok(stripped.includes('import { keepMe } from "tpl"'));
  assert.ok(stripped.includes('export const KEEP_ME = 42'));
  assert.equal(/^\s*import\s/m.test(stripped.replace(/`[\s\S]*?`/g, '')), false);
  assert.doesNotThrow(() => new vm.Script(stripped));

  const appBundle = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appBundle.startsWith('(() => {\n\'use strict\';'));
  assert.ok(appBundle.trimEnd().endsWith('})();'));
});

test('Compaction liveActivity: detects in-progress & completed CHECKPOINT over pre-compaction tool operations across RPC and transcript.jsonl', async () => {
  const convId = '4432b724-3e1e-4421-a375-c6855a7b7b37';

  // Pre-compaction steps (matching real-world step 0..2: planner edit_file x2 + 2 completed tool results)
  const rpcPreCompactionSteps = [
    {
      type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
      status: 'CORTEX_STEP_STATUS_DONE',
      metadata: {
        createdAt: '2026-11-11T02:18:21Z',
        finishedGeneratingAt: '2026-11-11T02:18:35Z',
        modelUsage: {
          model: 'MODEL_PLACEHOLDER_M318',
          inputTokens: '2918',
          cacheReadTokens: '252465',
          outputTokens: '814',
        },
      },
      plannerResponse: {
        toolCalls: [
          { name: 'edit_file', argumentsJson: JSON.stringify({ Path: 'f:/repo/backend-harness.mjs' }) },
          { name: 'edit_file', argumentsJson: JSON.stringify({ Path: 'f:/repo/04-post-fix-verify.mjs' }) },
        ],
      },
    },
    {
      type: 'CORTEX_STEP_TYPE_CODE_ACTION',
      status: 'CORTEX_STEP_STATUS_DONE',
      metadata: { createdAt: '2026-11-11T02:18:35Z', completedAt: '2026-11-11T02:18:38Z' },
    },
    {
      type: 'CORTEX_STEP_TYPE_CODE_ACTION',
      status: 'CORTEX_STEP_STATUS_DONE',
      metadata: { createdAt: '2026-11-11T02:18:35Z', completedAt: '2026-11-11T02:18:40Z' },
    },
  ];

  // transcript.jsonl still ends at step_index 2 (since CHECKPOINT only flushes to transcript.jsonl when DONE)
  const transcriptPreFlush = [
    {
      step_index: 0,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: '2026-11-11T02:18:21Z',
      tool_calls: [
        { name: 'edit_file', args: { Path: '"f:\\\\repo\\\\backend-harness.mjs"' } },
        { name: 'edit_file', args: { Path: '"f:\\\\repo\\\\04-post-fix-verify.mjs"' } },
      ],
    },
    {
      step_index: 1,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: '2026-11-11T02:18:35Z',
      content: 'Created At: 2026-11-11T11:18:35+09:00\nCompleted At: 2026-11-11T11:18:38+09:00\nMade 1 replacement',
    },
    {
      step_index: 2,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: '2026-11-11T02:18:35Z',
      content: 'Created At: 2026-11-11T11:18:35+09:00\nCompleted At: 2026-11-11T11:18:40+09:00\nMade 1 replacement',
    },
  ];

  // Phase 1: In-progress CORTEX_STEP_TYPE_CHECKPOINT in RPC WITHOUT metadata.createdAt yet + trailing MEMENTO
  const h = backendHarness({
    summaries: {
      [convId]: {
        stepCount: 4,
        lastModifiedTime: '2026-11-11T02:18:35Z',
        status: 'CASCADE_RUN_STATUS_RUNNING',
        annotations: { title: 'Audit & Fix Session' },
      },
    },
    trajectories: {
      [convId]: {
        trajectory: {
          steps: [
            ...rpcPreCompactionSteps,
            {
              type: 'CORTEX_STEP_TYPE_CHECKPOINT',
              status: 'CORTEX_STEP_STATUS_RUNNING',
              metadata: {},
            },
            {
              type: 'CORTEX_STEP_TYPE_MEMENTO',
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: { createdAt: '2026-11-11T02:18:40Z' },
            },
          ],
        },
      },
    },
    transcripts: {
      [convId]: transcriptPreFlush,
    },
  });

  const pCompacting = await h.buildTelemetryPayloadInternal(convId);
  assert.equal(pCompacting.activeConversation.liveActivity.phase, 'compacting');
  assert.equal(pCompacting.activeConversation.liveActivity.label, '上下文压缩');
  assert.equal(
    pCompacting.activeConversation.liveActivity.startedAtMs,
    Date.parse('2026-11-11T02:18:40Z'),
    'uses previous tool completion timestamp when in-progress CHECKPOINT lacks createdAt'
  );
  assert.equal(pCompacting.runningConversations[0].mainActivity.phase, 'compacting');
  assert.equal(pCompacting.runningConversations[0].mainActivity.label, '上下文压缩');

  // Phase 2: CHECKPOINT finishes (status=DONE in both RPC & transcript.jsonl) while resuming before next PLANNER_RESPONSE
  h.state.trajectories[convId] = {
    trajectory: {
      steps: [
        ...rpcPreCompactionSteps,
        {
          type: 'CORTEX_STEP_TYPE_CHECKPOINT',
          status: 'CORTEX_STEP_STATUS_DONE',
          metadata: {
            createdAt: '2026-11-11T02:18:40Z',
            finishedGeneratingAt: '2026-11-11T02:19:33Z',
            modelUsage: {
              model: 'MODEL_PLACEHOLDER_M318',
              inputTokens: '3082',
              cacheReadTokens: '254224',
              outputTokens: '4627',
            },
          },
        },
      ],
    },
  };
  h.state.transcripts[convId] = [
    ...transcriptPreFlush,
    {
      step_index: 3,
      source: 'SYSTEM',
      type: 'CHECKPOINT',
      status: 'DONE',
      created_at: '2026-11-11T02:18:40Z',
      content: '# Resuming from a compaction\n...',
    },
  ];
  h.state.transcriptMtimeMs = 2;

  const pResuming = await h.buildTelemetryPayloadInternal(convId);
  assert.equal(pResuming.activeConversation.liveActivity.phase, 'compacting');
  assert.equal(pResuming.activeConversation.liveActivity.label, '上下文压缩');
  assert.equal(pResuming.activeConversation.liveActivity.detail, '已完成压缩，正在恢复推理');
  assert.equal(
    pResuming.activeConversation.liveActivity.startedAtMs,
    Date.parse('2026-11-11T02:19:33Z')
  );

  // Phase 3: Even when RPC fails/cools down and ONLY transcript.jsonl (with status="DONE" CHECKPOINT) is available,
  // it STILL detects compaction instead of regressing to pre-compaction "修改文件"
  h.state.trajectories[convId] = new Error('temporary RPC timeout');
  const pTranscriptOnly = await h.buildTelemetryPayloadInternal(convId, true);
  assert.equal(pTranscriptOnly.activeConversation.liveActivity.phase, 'compacting');
  assert.equal(pTranscriptOnly.activeConversation.liveActivity.label, '上下文压缩');
});
