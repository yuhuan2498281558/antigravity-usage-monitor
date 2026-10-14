import test from 'node:test';
import assert from 'node:assert/strict';
import { extractModelSteps, normalizeCachedStep, speedMetric, summarizeSpeed, summarizeTtft } from '../speed-metrics.mjs';

function sample({ total = 12, ttft = '2s', stream = '10s', output = 1100, thinking = 100, response = 1000, thinkingDuration = '4s', tools = false, text = true, status = 'CORTEX_STEP_STATUS_DONE' } = {}) {
  const createdAt = '2026-01-01T00:00:00Z';
  const s = { status, type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE', metadata: {
    createdAt, viewableAt: '2026-01-01T00:00:02Z',
    finishedGeneratingAt: new Date(Date.parse(createdAt) + total * 1000).toISOString(),
    modelUsage: { inputTokens: '500', cacheReadTokens: '2000', outputTokens: String(output), thinkingOutputTokens: String(thinking), responseOutputTokens: String(response) },
  }, plannerResponse: { response: text ? 'answer' : '', thinkingDuration, toolCalls: tools ? [{}] : [] } };
  const gm = { stepIndices: [0], chatModel: { timeToFirstToken: ttft, streamingDuration: stream } };
  return { s, gm };
}
function parse(options) { const {s,gm}=sample(options); return extractModelSteps([s],[gm])[0]; }

test('raw TTFT is not replaced by a thinking-token ratio, even for buffered tools', () => {
  const s=parse({total:20,ttft:'19.9s',stream:'0.1s',thinkingDuration:'19.95s',tools:true,text:false});
  assert.equal(s.ttftSec,19.9);
  assert.equal(s.streamTokPerSec,null);
  assert.equal(s.totalTokPerSec,55);
});
test('missing TTFT stays unknown; separately preserve the viewable-event delay', () => {
  const raw=sample(); delete raw.gm.chatModel.timeToFirstToken;
  const measured=extractModelSteps([raw.s],[raw.gm])[0];
  assert.equal(measured.ttftSec,null);
  assert.equal(measured.viewableDelaySec,2);
});
test('a reported zero TTFT is valid and missing data is not zero', () => {
  const s=parse({ttft:'0s'});
  assert.equal(s.ttftSec,0);
  assert.deepEqual(summarizeTtft([s]),{sampleCount:1,avgSec:0});
});
test('pure-text thinking phases are explicitly estimates', () => {
  const s=parse();
  assert.equal(s.streamTokPerSec,125);
  assert.equal(s.totalTokPerSec,1100/12);
  assert.equal(s.speedBasis,'response_estimate');
  assert.equal(s.responseTimingSource,'post_thinking_estimate');
});
test('a native stream spanning reasoning does not become a pure-answer timer', () => {
  const raw=sample(); delete raw.s.plannerResponse.thinkingDuration;
  const unknown=extractModelSteps([raw.s],[raw.gm])[0];
  assert.equal(unknown.streamTokPerSec,null);
  assert.equal(unknown.speedReason,'answer_start_unavailable');
});
test('mixed text/tool and tool-only output never enter the answer mean', () => {
  for (const text of [true,false]) {
    const s=parse({tools:true,text});
    assert.equal(s.streamTokPerSec,null);
    assert.equal(summarizeSpeed([s],'stream').sampleCount,0);
    assert.equal(summarizeSpeed([s],'total').sampleCount,1);
  }
});
test('short greeting keeps its phase estimate without falling back to whole-call speed', () => {
  const s=parse({output:13,thinking:0,response:13,total:5.015,ttft:'4.897s',stream:'0.118s',thinkingDuration:undefined});
  assert.equal(s.streamTokPerSec,13/.118);
  assert.equal(s.responseShortSample,true);
  assert.equal(summarizeSpeed([s],'stream').avgTokPerSec,null);
  assert.equal(speedMetric(s,'total').value,13/5.015);
});
test('mean uses summed tokens/time of eligible samples, not an arithmetic mean or fallback', () => {
  const a=parse(); // 1000 / 8
  const b=parse({output:600,response:500}); // 500 / 8
  const tool=parse({tools:true});
  const result=summarizeSpeed([a,b,tool],'stream');
  assert.equal(result.avgTokPerSec,1500/16);
  assert.equal(result.sampleCount,2);
  assert.equal(result.excludedCount,1);
});
test('unfinished and invalid-order requests do not invent completion from viewableAt', () => {
  const raw=sample(); delete raw.s.metadata.finishedGeneratingAt;
  assert.equal(extractModelSteps([raw.s],[raw.gm])[0].totalTokPerSec,null);
  assert.equal(parse({total:-1}).totalTokPerSec,null);
  assert.equal(parse({status:'CORTEX_STEP_STATUS_GENERATING'}).totalTokPerSec,null);
});
test('zero response token count and invalid breakdowns are not overwritten', () => {
  assert.equal(parse({response:0}).responseTokens,0);
  assert.equal(parse({response:0}).streamTokPerSec,null);
  assert.equal(parse({response:2000}).streamTokPerSec,null);
});
test('there is no rate-based clipping or method switch around 260 TPS', () => {
  const below=parse({output:2172,response:2072});
  const above=parse({output:2188,response:2088});
  assert.equal(below.streamTokPerSec,259);
  assert.equal(above.streamTokPerSec,261);
  assert.equal(above.speedBasis,below.speedBasis);
});
test('old cache keeps accounting but drops all derived timing, including manipulated TTFT', () => {
  const old={inputTokens:500,cacheReadTokens:2000,outputTokens:1100,ttftSec:0.4,streamTokPerSec:99,totalTokPerSec:55};
  const migrated=normalizeCachedStep(old);
  assert.equal(migrated.outputTokens,1100);
  assert.equal(migrated.inputTokens,500);
  assert.equal(migrated.cacheReadTokens,2000);
  assert.equal(migrated.ttftSec,null);
  assert.equal(speedMetric(migrated,'total').value,null);
  assert.equal(speedMetric(migrated,'stream').reason,'legacy_cache');
});
test('compaction retains its billed tokens but is excluded from both speed aggregates', () => {
  const {s,gm}=sample(); s.type='CORTEX_STEP_TYPE_CHECKPOINT';
  const parsed=extractModelSteps([s],[gm])[0];
  assert.equal(parsed.outputTokens,1100);
  for(const mode of ['stream','total']) assert.equal(summarizeSpeed([parsed],mode).sampleCount,0);
});
