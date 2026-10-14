import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ConnectJsonDecoder, StreamObservation, StreamDiagnostics, encodeConnectJson } from '../stream-diagnostics.mjs';

const ID = '12345678-1234-1234-1234-123456789abc';
const CREATED = '2026-10-15T01:00:00.000Z';
const FINISHED = '2026-10-15T01:00:08.000Z';
const event = (ms, batch = ms) => ({ elapsedMs: ms, receiveBatch: batch, receivedAt: CREATED });
const model = (p = {}, done = false, extra = {}) => ({
  type: 'CORTEX_STEP_TYPE_PLANNER_RESPONSE', status: done ? 'CORTEX_STEP_STATUS_DONE' : 'CORTEX_STEP_STATUS_STREAMING',
  metadata: { createdAt: CREATED, ...(done ? { finishedGeneratingAt: FINISHED, modelUsage: { outputTokens: '400' } } : {}) },
  plannerResponse: p, ...extra,
});
const update = (indices, steps, totalLength, more = {}) => ({ update: { conversationId: ID,
  mainTrajectoryUpdate: { stepsUpdate: { indices, steps, totalLength }, ...more } } });
function observer() {
  const records = [];
  const observation = new StreamObservation({ conversationId: ID, connectedWallMs: Date.parse(CREATED) - 1000, emit: r => records.push(r) });
  return { records, observation };
}

test('Connect decoder reconstructs fragmented headers/UTF-8 and keeps coalesced messages separate', () => {
  const a = { update: { text: '中文🙂' } };
  const b = { update: { text: 'second' } };
  const bytes = Buffer.concat([encodeConnectJson(a), encodeConnectJson(b)]);
  const decoder = new ConnectJsonDecoder();
  const messages = [];
  for (let i = 0; i < bytes.length; i += 3) messages.push(...decoder.push(bytes.subarray(i, i + 3)));
  decoder.finish();
  assert.deepEqual(messages.map(m => m.value), [a, b]);
  const end = encodeConnectJson({}); end[0] = 2;
  assert.equal(decoder.push(end)[0].end, true);
  assert.throws(() => decoder.push(encodeConnectJson(a)), /data_after_end/);
});

test('Connect decoder rejects oversized, compressed, malformed and truncated frames', () => {
  const huge = Buffer.from([0, 0, 0, 1, 0]);
  assert.throws(() => new ConnectJsonDecoder(100).push(huge), /frame_too_large/);
  const compressed = encodeConnectJson({}); compressed[0] = 1;
  assert.throws(() => new ConnectJsonDecoder().push(compressed), /unsupported_frame_flags/);
  assert.throws(() => new ConnectJsonDecoder().push(Buffer.from([0, 0, 0, 0, 1, 120])), /invalid_frame_json/);
  const decoder = new ConnectJsonDecoder(); decoder.push(Buffer.from([0, 0]));
  assert.throws(() => decoder.finish(), /truncated_frame/);
});

test('history, delayed rehydration and status-only notifications never become live output', () => {
  const { observation: o, records } = observer();
  o.accept({ update: { conversationId: ID, status: 'IDLE' } }, event(0));
  assert.equal(o.initialized, false);
  o.accept(update([9], [model({ response: 'old response' }, true)], 10), event(1));
  o.accept(update([4], [model({ response: 'late history' }, true)], 10), event(2));
  assert.equal(o.contentEvents, 0);
  assert.equal(o.recent.length, 0);
  assert.deepEqual(records.map(r => r.kind), ['baseline']);
});

test('tool arguments, thinking and text are counted independently; receive batches are not tokens', () => {
  const { observation: o, records } = observer();
  o.accept(update([], [], 10), event(0));
  o.accept(update([10], [model()], 11), event(10));
  o.accept(update([10], [model({ thinking: 'hidden-secret', response: '中', toolCalls: [{ argumentsJson: '{', name: 'secret-tool' }] })], 11), event(20, 2));
  o.accept(update([10], [model({ thinking: 'hidden-secret!', response: '中文', toolCalls: [{ argumentsJson: '{"secret":"' }] })], 11), event(20, 2));
  const full = model({ thinking: 'hidden-secret!', response: '中文', toolCalls: [{ argumentsJson: '{"secret":"argument-secret"}' }] }, true);
  o.accept(update([10], [full], 11), event(120, 3));
  o.accept(update([10], [full], 11), event(300, 4));
  o.accept(update([], [], 11, { generatorMetadatasUpdate: { generatorMetadatas: [{ stepIndices: [10], chatModel: {
    usage: { outputTokens: '400', thinkingOutputTokens: '50', responseHeader: { authorization: 'credential-secret' } },
    timeToFirstToken: '7.999s', streamingDuration: '0.001s', systemPrompt: 'prompt-secret',
  } }] } }), event(400, 5));
  const r = o.recent[0];
  assert.equal(r.contentEvents, 3);
  assert.equal(r.contentReceiveBatches, 2);
  assert.equal(r.toolArgumentEvents, 3);
  assert.equal(r.observedSpanMs, 100);
  assert.equal(r.channels.text.bytes, 6);
  assert.equal(r.channels.text.utf16Units, 2);
  assert.equal(r.usage.outputTokens, 400);
  assert.equal(r.nativeStreamSec, 0.001);
  assert.equal(r.partialCapture, false);
  const serialized = JSON.stringify([records, r]);
  for (const secret of ['hidden-secret', 'argument-secret', 'secret-tool', 'credential-secret', 'prompt-secret', '中文']) assert.ok(!serialized.includes(secret));
  assert.ok(!/tokPerSec|tps|firstTokenMs/i.test(serialized));
});

test('same-batch delivery is not reported as a timed stream, even with several updates', () => {
  const { observation: o } = observer();
  o.accept(update([], [], 0), event(0));
  o.accept(update([0], [model({ response: 'a' })], 1), event(5, 1));
  o.accept(update([0], [model({ response: 'ab' }, true)], 1), event(5, 1));
  assert.equal(o.recent[0].observation, 'single_receive_batch');
  assert.equal(o.recent[0].observedSpanMs, 0);
});

test('rewrites, shrinking output and tool-only updates are retained as revisions', () => {
  const { observation: o, records } = observer();
  o.accept(update([], [], 0), event(0));
  o.accept(update([0], [model({ toolCalls: [{ argumentsJson: 'abcd' }] })], 1), event(10));
  o.accept(update([0], [model({ toolCalls: [{ argumentsJson: 'wxyz' }] })], 1), event(20));
  o.accept(update([0], [model({ toolCalls: [{ argumentsJson: 'wx' }] }, true)], 1), event(30));
  assert.equal(o.recent[0].revisions, 2);
  assert.equal(o.recent[0].toolArgumentEvents, 3);
  assert.equal(records.at(-1).changes.toolArguments.deltaBytes, -2);
  assert.equal(records.at(-1).changes.toolArguments.appendOnly, false);
});

test('joining during generation marks partial capture and excludes initial content from updates', () => {
  const { observation: o } = observer();
  o.accept(update([2], [model({ response: 'already there' })], 3), event(10));
  o.accept(update([2], [model({ response: 'already there plus more' }, true)], 3), event(20));
  assert.equal(o.recent[0].partialCapture, true);
  assert.equal(o.recent[0].contentEvents, 1);
  assert.equal(o.recent[0].observation, 'partial_capture');
});

test('missing or earlier creation time never claims a complete observation', () => {
  const { observation: o } = observer();
  o.accept(update([], [], 0), event(0));
  o.accept(update([0], [model({ response: 'arrived' }, true, { metadata: { finishedGeneratingAt: FINISHED } })], 1), event(20));
  assert.equal(o.recent[0].partialCapture, true);
  assert.throws(() => o.accept(update([], [model()], 2), event(25)), /invalid_step_indices/);
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await sleep(10); }
  assert.fail('timed out');
}
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'usage-monitor-diag-test-'));
  t.after(() => {
    const absolute = resolve(dir);
    assert.equal(dirname(absolute), resolve(tmpdir()));
    assert.ok(absolute.startsWith(join(resolve(tmpdir()), 'usage-monitor-diag-test-')));
    rmSync(absolute, { recursive: true, force: true });
  });
  return dir;
}

test('collector only subscribes to read APIs, persists counters and stops without touching billing', async t => {
  const dir = temp(t);
  const calls = [];
  let streamController;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('GetAllCascadeTrajectories')) return new Response(JSON.stringify({ trajectorySummaries: { [ID]: { stepCount: 0, lastModifiedTime: CREATED } } }));
    assert.ok(url.endsWith('StreamAgentStateUpdates'));
    const request = new ConnectJsonDecoder().push(options.body)[0].value;
    assert.equal(request.trajectoryVerbosity, 'CLIENT_TRAJECTORY_VERBOSITY_FULL');
    const stream = new ReadableStream({ start(c) {
      streamController = c;
      c.enqueue(encodeConnectJson(update([], [], 0)));
      options.signal.addEventListener('abort', () => c.error(new Error('aborted')), { once: true });
    } });
    return new Response(stream, { headers: { 'Content-Type': 'application/connect+json' } });
  };
  const d = new StreamDiagnostics({ dataDir: dir, lsAddress: '127.0.0.1:1', csrfToken: 'secret-csrf', fetchImpl, pollMs: 60000 });
  t.after(() => d.stop());
  assert.equal(d.status().enabled, false);
  d.configure({ enabled: true });
  await until(() => d.status().phase === 'collecting');
  streamController.enqueue(encodeConnectJson(update([0], [model({ toolCalls: [{ argumentsJson: 'private-arguments' }] }, true)], 1)));
  await until(() => d.status().contentEvents === 1);
  assert.equal(d.status().affectsTps, false);
  d.configure({ enabled: false });
  await sleep(10);
  assert.equal(d.status().phase, 'disabled');
  assert.equal(d.current, null);
  const log = readFileSync(join(dir, 'stream-diagnostics', 'events.jsonl'), 'utf8');
  assert.ok(!log.includes('secret-csrf'));
  assert.ok(!log.includes('private-arguments'));
  assert.ok(log.includes('step_update'));
  assert.deepEqual(readdirSync(dir).sort(), ['stream-diagnostics', 'stream-diagnostics-config.json']);
  assert.equal(calls.length, 2);
});

test('failed subscriptions back off and never expose the server error body', async t => {
  const dir = temp(t);
  let calls = 0;
  const d = new StreamDiagnostics({ dataDir: dir, lsAddress: '127.0.0.1:1', csrfToken: 'csrf', pollMs: 10, retryMs: 5000,
    fetchImpl: async url => {
      calls++;
      if (url.endsWith('GetAllCascadeTrajectories')) return new Response(JSON.stringify({ trajectorySummaries: { [ID]: {} } }));
      return new Response('private server error with credentials', { status: 403 });
    } });
  t.after(() => d.stop());
  d.configure({ enabled: true });
  await until(() => d.status().error === 'stream_http_403');
  await sleep(40);
  assert.equal(calls, 2);
  assert.ok(!JSON.stringify(d.status()).includes('private'));
});
