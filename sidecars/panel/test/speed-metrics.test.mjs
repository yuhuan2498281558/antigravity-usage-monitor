import test from 'node:test';
import assert from 'node:assert/strict';
import {extractModelSteps, normalizeCachedStep, speedMetric, summarizeSpeed, summarizeTtft} from '../speed-metrics.mjs';

function sample({total=12,ttft='2s',stream='10s',output=1100,thinking=100,response=1000,
  thinkingDuration='4s',tools=false,text=true,status='CORTEX_STEP_STATUS_DONE'}={}) {
  const s={status,type:'CORTEX_STEP_TYPE_PLANNER_RESPONSE',metadata:{
    createdAt:'2026-01-01T00:00:00Z',viewableAt:'2026-01-01T00:00:02Z',
    finishedGeneratingAt:new Date(Date.parse('2026-01-01T00:00:00Z')+total*1000).toISOString(),
    modelUsage:{inputTokens:'500',cacheReadTokens:'2000',outputTokens:String(output),thinkingOutputTokens:String(thinking),responseOutputTokens:String(response)},
  },plannerResponse:{response:text?'answer':'',thinkingDuration,toolCalls:tools?[{}]:[]}};
  const gm={stepIndices:[0],chatModel:{timeToFirstToken:ttft,streamingDuration:stream}};
  return {s,gm};
}
function parse(options) {const {s,gm}=sample(options);return extractModelSteps([s],[gm])[0];}

test('text and mixed output estimate the combined response phase; pure tools retain total time',()=>{
  for(const tools of [false,true])for(const text of [false,true]){
    const step=parse({tools,text});
    assert.equal(speedMetric(step).value,text ? 1000/8 : 1100/12);
    assert.equal(step.speedBasis,text ? 'response_phase_estimate' : 'request_total');
    assert.equal(step.speedSampleEligible,true);
  }
});
test('buffered JSON cannot create a burst peak by shortening native or thinking phase timers',()=>{
  for(const stream of ['0.001s','0.01s','1s','10s',undefined]){
    for(const thinkingDuration of ['0.01s','9.999s',undefined]){
      const step=parse({total:10,ttft:'9.999s',stream,thinkingDuration,output:300,tools:true,text:false});
      assert.equal(step.totalTokPerSec,30);
      assert.equal(step.ttftSec,9.999);
    }
  }
});
test('TTFT is the exact native value, never a token-ratio guess or viewable-event substitute',()=>{
  assert.equal(parse({total:20,ttft:'19.9s',thinkingDuration:'19.95s',tools:true,text:false}).ttftSec,19.9);
  const {s,gm}=sample();delete gm.chatModel.timeToFirstToken;
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.ttftSec,null);assert.equal(step.viewableDelaySec,2);
  assert.deepEqual(summarizeTtft([step]),{sampleCount:0,avgSec:null});
});
test('zero TTFT is preserved and malformed or negative durations remain unknown',()=>{
  const zero=parse({ttft:'0s'});
  assert.equal(zero.ttftSec,0);
  assert.equal(summarizeTtft([zero]).avgSec,0);
  for(const ttft of ['-1s','12garbage','NaNs','Infinitys',''])assert.equal(parse({ttft}).ttftSec,null);
});
test('short output keeps the same formula but does not bias the mean',()=>{
  const short=parse({output:13,response:13,thinking:0,total:5.015,stream:'0.118s'});
  assert.equal(short.totalTokPerSec,13/5.015);
  assert.equal(short.speedReason,'short_sample');
  assert.equal(summarizeSpeed([short,parse()]).avgTokPerSec,1000/8);
  assert.equal(summarizeSpeed([short]).avgTokPerSec,null);
  assert.equal(parse({output:50}).speedSampleEligible,true);
});
test('sub-half-second whole requests are withheld, never divided by a tiny interval',()=>{
  const tiny=parse({total:.05,output:1000});
  assert.equal(tiny.totalTokPerSec,null);assert.equal(tiny.speedReason,'short_timing');
  assert.equal(speedMetric(tiny).value,null);
  assert.equal(summarizeSpeed([tiny]).sampleCount,0);
  assert.equal(parse({total:.5,output:100}).totalTokPerSec,200);
});
test('weighted mean matches token/time totals and does not average step rates',()=>{
  const a=parse({output:1000,total:10}),b=parse({output:1000,total:20,tools:true});
  const mean=summarizeSpeed([a,b]);
  assert.equal(mean.tokens,2000);assert.equal(mean.seconds,30);
  assert.equal(mean.avgTokPerSec,2000/30);assert.equal(mean.sampleCount,2);
});
test('unfinished, missing-completion and reversed-time requests cannot fabricate speed',()=>{
  const {s,gm}=sample();delete s.metadata.finishedGeneratingAt;
  assert.equal(extractModelSteps([s],[gm])[0].totalTokPerSec,null);
  assert.equal(parse({total:-1}).totalTokPerSec,null);
  assert.equal(parse({total:0}).totalTokPerSec,null);
  assert.equal(parse({status:'CORTEX_STEP_STATUS_GENERATING'}).totalTokPerSec,null);
});
test('zero output is a real zero; malformed or missing output counts cannot produce rates',()=>{
  const zero=parse({output:0,response:0,thinking:0});
  assert.equal(zero.totalTokPerSec,0);assert.equal(zero.responseTokens,0);
  for(const output of [-1,1.5,NaN,Infinity])assert.equal(parse({output}).totalTokPerSec,null);
  const {s,gm}=sample();delete s.metadata.modelUsage.outputTokens;
  assert.equal(extractModelSteps([s],[gm])[0].totalTokPerSec,null);
});
test('missing phase/token breakdown cannot change a valid full-request rate',()=>{
  const {s,gm}=sample();delete s.plannerResponse.thinkingDuration;
  delete s.metadata.modelUsage.thinkingOutputTokens;delete s.metadata.modelUsage.responseOutputTokens;
  delete gm.chatModel.streamingDuration;
  assert.equal(extractModelSteps([s],[gm])[0].totalTokPerSec,1100/12);
});
test('no rate-dependent cap or formula switch at the former 260 TPS boundary',()=>{
  const opts={total:10,thinking:0,thinkingDuration:'0s',ttft:'0s',stream:'10s',tools:true};
  const a=parse({...opts,output:2590,response:2590}),b=parse({...opts,output:2610,response:2610});
  assert.equal(a.totalTokPerSec,259);assert.equal(b.totalTokPerSec,261);
  assert.equal(speedMetric(a).value,259);assert.equal(speedMetric(b).value,261);
  assert.equal(a.speedBasis,'response_phase_estimate');
  assert.equal(a.speedBasis,b.speedBasis);
});
test('legacy cache retains billing but cannot masquerade as current measurements',()=>{
  for(const measurementVersion of [undefined,1,2]){
    const old={measurementVersion,inputTokens:500,cacheReadTokens:2000,outputTokens:1100,ttftSec:0.4,totalTokPerSec:55};
    const migrated=normalizeCachedStep(old);
    assert.equal(migrated.outputTokens,1100);assert.equal(migrated.inputTokens,500);
    assert.equal(migrated.ttftSec,null);assert.equal(speedMetric(migrated).value,null);
    assert.equal(speedMetric(migrated).reason,'legacy_cache');
  }
});

test('afternoon visible-text counterexample #284 uses full time instead of a 6751 TPS tail',()=>{
  const {s,gm}=sample({output:64,thinking:33,response:31,ttft:'7.0108593s',stream:'0.0045919s'});
  s.metadata.finishedGeneratingAt='2026-01-01T00:00:07.015451200Z';
  delete s.plannerResponse.thinkingDuration;
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.hasVisibleText,true);assert.equal(step.phaseReason,'short_phase');
  assert.equal(step.speedBasis,'request_total');assert(speedMetric(step).value<10);
});
test('phase and overall means never mix denominators, regardless of step order',()=>{
  const phase=parse(),tools=parse({tools:true,text:false,total:100,output:10000});
  for(const rows of [[phase,tools],[tools,phase]]){
    const mean=summarizeSpeed(rows);
    assert.equal(mean.avgTokPerSec,125);assert.equal(mean.basis,'response_phase_estimate');
    assert.equal(mean.sampleCount,1);assert.equal(mean.excludedCount,1);
    assert.equal(mean.overall.avgTokPerSec,11100/112);
    assert.equal(speedMetric(tools).value,100);
  }
  const fallback=summarizeSpeed([tools]);
  assert.equal(fallback.avgTokPerSec,100);assert.equal(fallback.basis,'request_total');
});
test('short response phases, inconsistent counts and invalid phase clocks retain the request rate',()=>{
  for(const opts of [
    {thinkingDuration:'11.99s'}, {thinkingDuration:'12s'}, {thinkingDuration:'13s'},
    {thinkingDuration:'-1s'}, {thinkingDuration:'1s'}, {stream:'0.01s'},
    {response:999}, {output:1100,thinking:1080,response:20},
  ]){
    const step=parse(opts);
    assert.equal(step.speedBasis,'request_total');assert.equal(speedMetric(step).value,1100/12);
  }
});
test('missing thinking duration can use native TTFT, but missing native breakdown cannot be guessed',()=>{
  const {s,gm}=sample();delete s.plannerResponse.thinkingDuration;
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.phaseTokPerSec,100);assert.equal(step.answerStartDelaySec,2);
  delete s.metadata.modelUsage.responseOutputTokens;
  const missing=extractModelSteps([s],[gm])[0];
  assert.equal(missing.phaseReason,'invalid_phase_tokens');assert.equal(missing.phaseTokPerSec,null);
  assert.equal(speedMetric(missing).value,1100/12);
});
test('completedAt remains a total-time fallback but cannot substitute for generation end in phase estimates',()=>{
  const {s,gm}=sample();s.metadata.completedAt=s.metadata.finishedGeneratingAt;delete s.metadata.finishedGeneratingAt;
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.totalTokPerSec,1100/12);assert.equal(step.phaseReason,'invalid_phase_timing');
});
test('compaction displays a valid rate and retains billing but is excluded from speed/TTFT means',()=>{
  const {s,gm}=sample();s.type='CORTEX_STEP_TYPE_CHECKPOINT';
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.outputTokens,1100);assert.equal(speedMetric(step).value,1100/12);
  assert.equal(summarizeSpeed([step]).sampleCount,0);
  assert.equal(summarizeTtft([step]).sampleCount,0);
});
