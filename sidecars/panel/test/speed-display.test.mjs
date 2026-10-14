import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {summarizeSpeed} from '../speed-metrics.mjs';

const context = vm.createContext({window: {}});
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
assert.match(source, /\ninit\(\);\s*$/);
vm.runInContext(source.replace(/\ninit\(\);\s*$/, '\n'), context);
const show = (step, mode = 'stream') => context.stepSpeedDisplay(step, mode);
const tool = {measurementVersion: 1, isComplete: true, hasToolCalls: true,
  outputTokens: 300, totalDurationSec: 10, totalTokPerSec: 30,
  streamTokPerSec: null, responseSampleEligible: false,
  speedReason: 'tool_timing_unavailable'};
const answer = {measurementVersion: 1, isComplete: true, outputTokens: 600,
  totalDurationSec: 10, totalTokPerSec: 60, streamTokPerSec: 100,
  streamTokens: 500, streamDurationSec: 5, responseSampleEligible: true,
  responseTimingSource: 'post_thinking_estimate'};

test('completed tools have a labelled total TPS without contaminating the response mean', () => {
  const display = show(tool);
  assert.equal(display.value, 30);
  assert.equal(display.label, '整体吞吐');
  assert.equal(display.estimated, false);
  assert.match(display.explanation, /不计正文均速/);
  assert.equal(summarizeSpeed([tool, answer], 'stream').avgTokPerSec, 100);
  assert.equal(summarizeSpeed([tool, answer], 'total').avgTokPerSec, 45);
  assert.equal(tool.streamTokPerSec, null);
});
test('answer and total modes keep their distinct labels and formulas', () => {
  assert.equal(show(answer).value, 100);
  assert.equal(show(answer).label, '正文估算');
  assert.equal(show(answer).estimated, true);
  assert.equal(show(answer, 'total').value, 60);
  assert.equal(show(answer, 'total').label, '整体吞吐');
  assert.equal(show({...answer, responseShortSample: true}).detail, '正文估算 · 短样本');
});
test('missing answer start can display measured total TPS, including zero output', () => {
  assert.equal(show({...tool, hasToolCalls: false, speedReason: 'answer_start_unavailable'}).value, 30);
  assert.equal(show({...tool, outputTokens: 0, totalTokPerSec: 0}).value, 0);
});
test('incomplete and legacy rows never acquire a fabricated total TPS', () => {
  assert.equal(show({...tool, isComplete: false}).value, null);
  assert.equal(show({...tool, measurementVersion: null}).value, null);
  assert.equal(show({...tool, totalTokPerSec: null}).value, null);
  assert.equal(show({...tool, totalDurationSec: 0}).value, null);
  assert.equal(show().value, null);
});
test('compaction can show its measured rate while remaining excluded from means', () => {
  const step = {...tool, isCompactionStep: true, speedReason: 'compaction'};
  assert.equal(show(step).value, 30);
  assert.match(show(step).detail, /压缩/);
  assert.equal(summarizeSpeed([step], 'total').sampleCount, 0);
});
