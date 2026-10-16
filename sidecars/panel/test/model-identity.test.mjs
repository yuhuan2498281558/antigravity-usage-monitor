import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { extractModelSteps, normalizeCachedStep, MODEL_IDENTITY_VERSION } from '../speed-metrics.mjs';
import { formatUsd } from '../src/core/formatters.js';
import { backendHarness } from './backend-harness.mjs';

const FLASH = 'MODEL_PLACEHOLDER_M318', ARGON = 'MODEL_PLACEHOLDER_M418';
const createdAtMs = Date.now() - 20_000;
function step(index, model, checkpoint = false) {
  return { type: checkpoint ? 'CORTEX_STEP_TYPE_CHECKPOINT' : 'CORTEX_STEP_TYPE_PLANNER_RESPONSE',
    status: 'CORTEX_STEP_STATUS_DONE', metadata: {
      sourceTrajectoryStepInfo: { stepIndex: index },
      createdAt: new Date(createdAtMs).toISOString(), completedAt: new Date(createdAtMs + 10_000).toISOString(),
      modelUsage: { ...(model === undefined ? {} : { model }), apiProvider: 'API_PROVIDER_GOOGLE_GEMINI',
        inputTokens: '1000', cacheReadTokens: '9000', outputTokens: '1000' },
    } };
}
async function payload(steps, options = {}) {
  return backendHarness({ summaries: { test: { stepCount: steps.length } },
    trajectories: { test: { trajectory: { steps } } }, ...options }).buildTelemetryPayloadInternal('test');
}

test('missing checkpoint identity stays unknown between Flash steps; its token totals survive', async () => {
  const rows = [step(209, FLASH), step(211, undefined, true), step(212, FLASH)];
  const p = await payload(rows);
  const cp = p.activeConversation.recentSteps.find(s => s.stepIndex === 211);
  assert.equal(cp.modelKey, 'unknown'); assert.equal(cp.modelShort, '模型未知·压缩');
  assert.equal(cp.costUsd, null); assert.equal(cp.inCostUsd, null);
  assert.equal(cp.contextTokens, 11000); assert.equal(cp.tokPerSec, 100);
  assert.equal(p.activeConversation.speedSummary.sampleCount, 2);
  assert.equal(p.consumption.account.totalTokens, 33000);
  assert.equal(p.consumption.account.unpricedCalls, 1);
  assert.equal(p.modelBreakdown.find(m => m.label === '模型未知').unpricedCalls, 1);
  assert.equal(p.modelBreakdown.find(m => m.shortName === 'flash-3.8-high').calls, 2);
  assert(!p.modelBreakdown.some(m => /argon/i.test(m.label)));
  assert.equal(p.consumption.trendSeries.reduce((n,s) => n+(s.unpricedCalls || 0),0), 1);
  assert.equal(p.consumption.sourcesBreakdown[0].unpricedCalls, 1);
  assert.equal(p.consumption.monthlySeries.reduce((n,s) => n+(s.unpricedCalls || 0),0), 1);
});

test('checkpoint can explicitly use a different model; no neighbour-based overwrite', async () => {
  const p = await payload([step(209, FLASH), step(211, ARGON, true), step(212, FLASH)]);
  const cp = p.activeConversation.recentSteps.find(s => s.stepIndex === 211);
  assert.equal(cp.modelShort, 'argon-4·压缩'); assert.equal(cp.modelSource, 'usage.model');
  assert.equal(cp.costUsd, 0.0129); assert.equal(p.consumption.account.unpricedCalls, 0);
});

test('ordinary calls with missing model are unknown too', () => {
  const [s] = extractModelSteps([step(1)]);
  assert.equal(s.modelKey, 'unknown'); assert.equal(s.modelSource, 'unavailable');
  assert.equal(s.totalTokPerSec, 100);
});

test('retry usage preserves its own model and counters', () => {
  const row = step(211, FLASH, true);
  row.metadata.retryInfos = [{ usage: row.metadata.modelUsage }]; delete row.metadata.modelUsage;
  const [s] = extractModelSteps([row]);
  assert.equal(s.modelKey, FLASH); assert.equal(s.inputTokens, 1000);
});

test('matching generator usage supplies model and wins over requested generator model', () => {
  const [s] = extractModelSteps([step(211)], [{stepIndices: [211], chatModel: {
    usage: { model: FLASH }, model: ARGON,
  }}]);
  assert.equal(s.modelKey, FLASH); assert.equal(s.modelSource, 'chat.usage.model');
});

test('unrelated generator metadata never supplies the missing model', () => {
  const [s] = extractModelSteps([step(211)], [{stepIndices: [0], chatModel: {model: FLASH}}]);
  assert.equal(s.modelKey, 'unknown');
});

test('unspecified enum values fall through to actual step model evidence', () => {
  for (const missing of ['', ' ', 'unknown', 'MODEL_UNSPECIFIED', 'MODEL_UNKNOWN', '0', 0, null]) {
    const row = step(211, missing); row.metadata.generatorModel = FLASH;
    const [s] = extractModelSteps([row]); assert.equal(s.modelKey, FLASH);
  }
});

test('response model and display name are preserved when enum model is absent', async () => {
  const row = step(211);
  const raw = {trajectory: { steps: [row], generatorMetadata: [{stepIndices:[211],chatModel:{
    responseModel:'gemini-3.8-flash-high',modelDisplayName:'Gemini 3.8 Flash (High)',
  }}]}};
  const p = await payload([], {trajectories: {test:raw}});
  assert.equal(p.activeConversation.activeModelShort,'flash-3.8-high');
});

test('server model catalog overrides static placeholder mapping', () => {
  const {resolveModelInfo} = backendHarness();
  const result = resolveModelInfo(ARGON, new Map([[ARGON, {modelId:'gemini-3.8-flash-high', label:'Gemini 3.8 Flash (High)'}]]));
  assert.equal(result.shortName,'flash-3.8-high'); assert.equal(result.pricing.input,0.75);
});

test('uncatalogued model keeps identity and does not borrow another model price', async () => {
  const p = await payload([step(211, 'MODEL_PLACEHOLDER_M999')]);
  assert.equal(p.activeConversation.activeModelShort,'MODEL_PLACEHOLDER_M999');
  assert.equal(p.activeConversation.latestStepCostUsd,null);
  assert.equal(p.consumption.account.unpricedCalls,1);
});

test('old ambiguous Argon cache is persisted as unresolved while retaining modern measurements', async () => {
  const original = extractModelSteps([step(211, ARGON, true)])[0];
  delete original.modelIdentityVersion; delete original.modelSource;
  const old = {signature:'v9-unified-throughput:old',steps:[original]};
  const h = backendHarness({cache:{test:old},trajectories:{test:new Error('offline')}});
  const p = await h.buildTelemetryPayloadInternal('test');
  const s = p.activeConversation.recentSteps[0];
  assert.equal(s.modelKey,'unknown'); assert.equal(s.legacyModelKey,ARGON);
  assert.equal(s.modelSource,'legacy_unverified'); assert.equal(s.totalTokPerSec,100);
  assert.equal(p.consumption.account.totalTokens,11000);
  assert.equal(p.consumption.account.unpricedCalls,1);
  assert.equal(h.state.saves.length,1);
  await h.buildTelemetryPayloadInternal('test');
  assert.equal(h.state.saves.length,1,'do not rewrite identical migrated cache every poll');
  h.state.trajectories.test = {trajectory:{steps:[step(211,FLASH,true)]}};
  const restored = await h.buildTelemetryPayloadInternal('test');
  assert.equal(restored.activeConversation.activeModelShort,'flash-3.8-high·压缩');
  assert.equal(restored.consumption.account.unpricedCalls,0);
});

test('explicit historical models and verified real Argon identities survive cache load', () => {
  const known = extractModelSteps([step(211, ARGON)])[0];
  assert.equal(normalizeCachedStep(known).modelKey,ARGON);
  const flash = {...known,modelKey:FLASH}; delete flash.modelIdentityVersion;
  assert.equal(normalizeCachedStep(flash).modelKey,FLASH);
  assert.equal(normalizeCachedStep(flash).modelIdentityVersion, MODEL_IDENTITY_VERSION);
});

test('empty session does not invent an Argon model or a model quota pool', async () => {
  const p = await backendHarness().buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.activeModelShort,'模型未知');
  assert.equal(p.quotas.activePool.isAvailable,false); assert.equal(p.quotas.activePool.family,'Unknown');
});

test('unknown cost renders as pending, known subtotals disclose missing calls', () => {
  assert.equal(formatUsd(null),'待定'); assert.equal(formatUsd(0),'$0.00');
  assert.equal(formatUsd(0.1,{unpricedCalls:1}),'$0.10 + 待定');
});

test('custom cost budget cannot claim a complete remaining percentage when prices are missing', async () => {
  const p = await payload([step(211)], {settings:{weeklyLimitMode:'custom_cost'}});
  assert.equal(p.quotas.weekly.usedPct,null); assert.equal(p.quotas.weekly.remainingPct,null);
});

test('frontend considers a model-only correction a real telemetry update', () => {
  const source = fs.readFileSync(new URL('../src/store/telemetryStore.js',import.meta.url),'utf8');
  const fn = source.slice(source.indexOf('function isEquivalentTelemetry'),source.indexOf('export async function fetchTelemetry'));
  const ctx = {}; vm.runInNewContext(fn+'\nglobalThis.compare=isEquivalentTelemetry;',ctx);
  const a={activeConversation:{recentSteps:[{modelKey:'unknown',modelShort:'模型未知',costUsd:null}]}};
  const b=structuredClone(a); b.activeConversation.recentSteps[0].modelShort='new-model';
  assert.equal(ctx.compare(a,b),false); assert.equal(ctx.compare(a,structuredClone(a)),true);
});
