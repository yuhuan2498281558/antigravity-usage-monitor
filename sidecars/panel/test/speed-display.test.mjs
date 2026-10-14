import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function page() {
  function element(){return {children:[],_html:'',textContent:'',title:'',scrollTop:0,
    get innerHTML(){return this._html;},set innerHTML(s){this._html=s;this.children=[];},
    appendChild(child){if(child.fragment)this.children.push(...child.children);else this.children.push(child);},
    closest(){return null;}};}
  const elements=Object.fromEntries(['tab-steps-btn','steps-tbody','models-tbody'].map(id=>[id,element()]));
  const document={getElementById:id=>elements[id],createElement:element,createDocumentFragment:()=>({...element(),fragment:true})};
  const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(source,/\ninit\(\);\s*$/);
  const ctx=vm.createContext({window:{},document});
  vm.runInContext(source.replace(/\ninit\(\);\s*$/,'\n'),ctx);
  return {ctx,elements};
}
const step={stepIndex:1,modelShort:'test',outputTokens:300,responseTokens:200,thinkingTokens:100,
  totalDurationSec:10,tokPerSec:30,ttftSec:2,costUsd:.01};
test('tools and text render one TPS column without per-row speed categories',()=>{
  const {ctx,elements}=page();
  ctx.renderTables({recentSteps:[{...step,hasToolCalls:true}]},[]);
  const row=elements['steps-tbody'].children[0];
  assert.match(row.innerHTML,/30\.0 tok\/s/);
  assert.doesNotMatch(row.innerHTML,/正文估算|整体吞吐|≈/);
  assert.match(row.title,/含等待与思考/);
});
test('unknown and zero are distinct, and insufficient timing explains the missing rate',()=>{
  const {ctx,elements}=page();
  ctx.renderTables({recentSteps:[{...step,tokPerSec:null,ttftSec:null,selectedSpeedReason:'short_timing'}]},[]);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/计时过短/);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/<td>—<\/td>/);
  ctx.renderTables({recentSteps:[{...step,tokPerSec:0,ttftSec:0}]},[]);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/0\.0 tok\/s/);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/<td>0\.0s<\/td>/);
});
test('a TTFT-only correction refreshes the table even when TPS and step count do not change',()=>{
  const {ctx,elements}=page();
  ctx.renderTables({recentSteps:[step]},[]);
  ctx.renderTables({recentSteps:[{...step,ttftSec:12.974}]},[]);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/<td>13\.0s<\/td>/);
});

test('one TPS column marks estimates and explains full-time fallbacks in the tooltip',()=>{
  const {ctx,elements}=page();
  ctx.renderTables({recentSteps:[{...step,speedBasis:'response_phase_estimate',phaseDurationSec:2,answerStartDelaySec:8,tokPerSec:100}]},[]);
  assert.match(elements['steps-tbody'].children[0].innerHTML,/≈100\.0 tok\/s/);
  assert.match(elements['steps-tbody'].children[0].title,/非服务端精确解码速度/);
  ctx.renderTables({recentSteps:[{...step,speedBasis:'request_total',phaseReason:'short_phase'}]},[]);
  assert.doesNotMatch(elements['steps-tbody'].children[0].innerHTML,/≈/);
  assert.match(elements['steps-tbody'].children[0].title,/阶段不足 0.5 秒/);
});
