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

test('text, tools and mixed output all use total output / full request duration',()=>{
  for(const tools of [false,true])for(const text of [false,true]){
    const step=parse({tools,text});
    assert.equal(speedMetric(step).value,1100/12);
    assert.equal(step.speedBasis,'request_total');
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
  assert.equal(summarizeSpeed([short,parse()]).avgTokPerSec,1100/12);
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
  const a=parse({total:10,output:2590,tools:true}),b=parse({total:10,output:2610,tools:true});
  assert.equal(a.totalTokPerSec,259);assert.equal(b.totalTokPerSec,261);
  assert.equal(a.speedBasis,b.speedBasis);
});
test('legacy cache retains billing but cannot masquerade as current measurements',()=>{
  for(const measurementVersion of [undefined,1]){
    const old={measurementVersion,inputTokens:500,cacheReadTokens:2000,outputTokens:1100,ttftSec:0.4,totalTokPerSec:55};
    const migrated=normalizeCachedStep(old);
    assert.equal(migrated.outputTokens,1100);assert.equal(migrated.inputTokens,500);
    assert.equal(migrated.ttftSec,null);assert.equal(speedMetric(migrated).value,null);
    assert.equal(speedMetric(migrated).reason,'legacy_cache');
  }
});
test('compaction displays a valid rate and retains billing but is excluded from speed/TTFT means',()=>{
  const {s,gm}=sample();s.type='CORTEX_STEP_TYPE_CHECKPOINT';
  const step=extractModelSteps([s],[gm])[0];
  assert.equal(step.outputTokens,1100);assert.equal(speedMetric(step).value,1100/12);
  assert.equal(summarizeSpeed([step]).sampleCount,0);
  assert.equal(summarizeTtft([step]).sampleCount,0);
});
