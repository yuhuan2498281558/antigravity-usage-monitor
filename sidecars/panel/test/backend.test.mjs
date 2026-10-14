import test from 'node:test';
import assert from 'node:assert/strict';
import {backendHarness} from './backend-harness.mjs';

const raw={trajectory:{steps:[{status:'CORTEX_STEP_STATUS_DONE',metadata:{
  createdAt:'2026-01-01T00:00:00Z',finishedGeneratingAt:'2026-01-01T00:00:10Z',
  modelUsage:{inputTokens:'100',cacheReadTokens:'200',outputTokens:'600',thinkingOutputTokens:'100',responseOutputTokens:'500'},
},plannerResponse:{response:'answer',thinkingDuration:'5s'}}],generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'3s',streamingDuration:'7s'}}]}};
const old={signature:'v5:old',title:'test',steps:[{stepIndex:0,modelKey:'MODEL_PLACEHOLDER_M418',inputTokens:100,cacheReadTokens:200,outputTokens:600,thinkingTokens:100,responseTokens:500,createdAtMs:1767225600000,ttftSec:0.4,streamTokPerSec:200,streamTokens:500,streamDurationSec:2.5,totalDurationSec:10,totalTokPerSec:60}]};

test('failed migration retains all accounting, makes legacy speed and TTFT unavailable',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:new Error('offline')}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,null);
  assert.equal(p.activeConversation.latestTtftSec,null);
  assert.equal(p.activeConversation.avgTokPerSec,null);
  assert.equal(p.activeConversation.recentSteps[0].outputTokens,600);
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,null);
  assert.equal(h.state.saves.length,0);
});
test('successful migration rebuilds measurements and uses the same mean in both tables',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,100);
  assert.equal(p.activeConversation.latestTtftSec,3);
  assert.equal(p.activeConversation.avgTokPerSec,100);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,100);
  assert.equal(p.modelBreakdown[0].speedSummary.sampleCount,1);
  assert.equal(p.consumption.session.totalTokens,900);
  assert.match(h.state.saves[0].data.test.signature,/^v8-guarded-phase:/);
});
test('a legacy stream setting cannot re-enable mixed speed formulas',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw},settings:{speedMode:'stream'}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,100);
  assert.equal(p.activeConversation.avgTokPerSec,100);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,100);
  assert.equal(p.settings.speedMode,undefined);
});
test('a malformed successful RPC cannot erase previously recorded usage',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:{}}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(p.activeConversation.latestTtftSec,null);
  assert.equal(h.state.saves.length,0);
});
test('a partial trajectory cannot replace a complete historical cache',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:{trajectory:{steps:[]},numTotalSteps:3}}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(h.state.saves.length,0);
  assert.match(h.state.errors[0],/Incomplete trajectory/);
});

test('a TTFT-only correction is persisted even when usage, duration and signature match',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw},summaries:{test:{
    stepCount:1,lastModifiedTime:'2026-01-01T00:00:10Z',status:'CASCADE_RUN_STATUS_RUNNING',
  }}});
  await h.buildTelemetryPayloadInternal('test');
  h.state.trajectories.test=structuredClone(raw);
  h.state.trajectories.test.trajectory.generatorMetadata[0].chatModel.timeToFirstToken='9s';
  const next=await h.buildTelemetryPayloadInternal('test');
  assert.equal(next.activeConversation.latestTtftSec,9);
  assert.equal(h.state.saves.length,2);
  assert.equal(h.state.saves[1].data.test.steps[0].ttftSec,9);
});
