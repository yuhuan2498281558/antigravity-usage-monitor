// Diagnostic observation of Anti's local state stream, NOT a model token stream.
// Persist only allowlisted counters/timestamps. Never persist response bodies.
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const SERVICE = '/exa.language_server_pb.LanguageServerService/';
const MAX_FRAME = 32 * 1024 * 1024;
const MAX_LOG = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const END = new Set(['CORTEX_STEP_STATUS_DONE', 'CORTEX_STEP_STATUS_ERROR', 'CORTEX_STEP_STATUS_CANCELED', 'CORTEX_STEP_STATUS_CANCELLED']);
const number = value => value !== undefined && value !== null && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const digest = value => createHash('sha256').update(value).digest('hex');
const duration = value => typeof value === 'string' && /^\d+(\.\d+)?s$/.test(value) ? Number(value.slice(0, -1)) : null;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
const rounded = value => Math.round(value * 1000) / 1000;

export function encodeConnectJson(value) {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(5);
  header.writeUInt32BE(body.length, 1);
  return Buffer.concat([header, body]);
}

// HTTP chunks and Connect messages are different boundaries. Every message
// completed in one HTTP read keeps that read's timestamp and receiveBatch.
export class ConnectJsonDecoder {
  constructor(maxFrame = MAX_FRAME) { this.pending = Buffer.alloc(0); this.maxFrame = maxFrame; this.ended = false; }
  push(chunk) {
    if (this.ended) throw new Error('data_after_end');
    this.pending = Buffer.concat([this.pending, chunk]);
    const messages = [];
    while (this.pending.length >= 5) {
      const flags = this.pending[0];
      const length = this.pending.readUInt32BE(1);
      if (length > this.maxFrame) throw new Error('frame_too_large');
      if (flags !== 0 && flags !== 2) throw new Error('unsupported_frame_flags');
      if (this.pending.length < length + 5) break;
      const payload = this.pending.subarray(5, length + 5);
      this.pending = this.pending.subarray(length + 5);
      let value;
      try { value = JSON.parse(payload.toString('utf8')); } catch { throw new Error('invalid_frame_json'); }
      messages.push({ end: flags === 2, value });
      if (flags === 2) {
        this.ended = true;
        if (this.pending.length) throw new Error('data_after_end');
        break;
      }
    }
    return messages;
  }
  finish() { if (this.pending.length) throw new Error('truncated_frame'); }
}

function content(step) {
  const p = step.plannerResponse || {};
  const tools = Array.isArray(p.toolCalls) ? p.toolCalls : [];
  return {
    text: typeof (p.modifiedResponse || p.response) === 'string' ? (p.modifiedResponse || p.response) : '',
    thinking: typeof (p.rawThinking || p.thinking) === 'string' ? (p.rawThinking || p.thinking) : '',
    // Separators are excluded from counters. Per-tool parts avoid treating a
    // change in the first of several tool arguments as a pure suffix append.
    toolArguments: tools.map(t => typeof t.argumentsJson === 'string' ? t.argumentsJson : ''),
    toolCount: tools.length,
  };
}

function fingerprint(parts) {
  return parts.map(s => ({ hash: digest(s), bytes: Buffer.byteLength(s), units: s.length }));
}

function compareParts(parts, previous = []) {
  const next = fingerprint(parts);
  let changed = next.length !== previous.length;
  let appendOnly = next.length >= previous.length;
  for (let i = 0; i < Math.max(parts.length, previous.length); i++) {
    const old = previous[i];
    const now = next[i];
    if (!old) { changed ||= Boolean(now?.bytes); continue; }
    if (!now) { changed = true; appendOnly = false; continue; }
    if (now.hash !== old.hash) {
      changed = true;
      if (now.units < old.units || digest(parts[i].slice(0, old.units)) !== old.hash) appendOnly = false;
    }
  }
  const bytes = next.reduce((n, p) => n + p.bytes, 0);
  const units = next.reduce((n, p) => n + p.units, 0);
  const deltaBytes = bytes - previous.reduce((n, p) => n + p.bytes, 0);
  return { next, changed, appendOnly, bytes, utf16Units: units, deltaBytes };
}

function tokenUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const result = {};
  for (const key of ['outputTokens', 'thinkingOutputTokens', 'responseOutputTokens']) {
    const n = number(usage[key]);
    if (n !== null) result[key] = n;
  }
  return Object.keys(result).length ? result : null;
}

function timing(metadata = {}) {
  const result = {};
  for (const key of ['createdAt', 'viewableAt', 'finishedGeneratingAt', 'completedAt']) {
    const value = timestamp(metadata[key]);
    if (value) result[key] = value;
  }
  return result;
}

export class StreamObservation {
  constructor({ conversationId, connectionId = randomUUID(), emit, connectedWallMs = Date.now() }) {
    this.conversationId = conversationId;
    this.connectionId = connectionId;
    this.emit = emit;
    this.connectedWallMs = connectedWallMs;
    this.initialized = false;
    this.baselineLength = 0;
    this.states = new Map();
    this.messages = 0;
    this.contentEvents = 0;
    this.baselineSteps = 0;
    this.recent = [];
  }

  record(kind, event, data) {
    this.emit({ version: 1, kind, conversationId: this.conversationId, connectionId: this.connectionId,
      receivedAt: event.receivedAt, elapsedMs: rounded(event.elapsedMs), receiveBatch: event.receiveBatch, ...data });
  }

  accept(message, event) {
    const update = message?.update;
    if (!update || update.conversationId !== this.conversationId) return;
    this.messages++;
    const trajectory = update.mainTrajectoryUpdate;
    const page = trajectory?.stepsUpdate;
    const isInitial = !this.initialized;
    if (isInitial && !page) return;
    if (isInitial) {
      this.initialized = true;
      this.baselineLength = number(page?.totalLength) ?? 0;
      this.baselineSteps = Array.isArray(page?.steps) ? page.steps.length : 0;
      this.record('baseline', event, { totalSteps: this.baselineLength, receivedSteps: this.baselineSteps, historical: true });
    }
    if (page) {
      const steps = Array.isArray(page.steps) ? page.steps : [];
      const indices = Array.isArray(page.indices) ? page.indices : [];
      if (steps.length !== indices.length) throw new Error('invalid_step_indices');
      for (let i = 0; i < steps.length; i++) {
        const index = number(indices[i]);
        if (index === null) throw new Error('invalid_step_index');
        this.observeStep(index, steps[i], event, isInitial);
      }
    }
    const generators = trajectory?.generatorMetadatasUpdate?.generatorMetadatas;
    if (Array.isArray(generators)) for (const gen of generators) {
      const cm = gen.chatModel;
      if (!cm) continue;
      const data = { usage: tokenUsage(cm.usage), nativeTtftSec: duration(cm.timeToFirstToken), nativeStreamSec: duration(cm.streamingDuration) };
      for (const index of gen.stepIndices || []) {
        const state = this.states.get(index);
        if (!state || state.historical) continue;
        const signature = JSON.stringify(data);
        if (signature === state.generatorSignature) continue;
        state.generatorSignature = signature;
        state.nativeTtftSec = data.nativeTtftSec;
        state.nativeStreamSec = data.nativeStreamSec;
        if (data.usage) state.usage = data.usage;
        this.record('model_timing', event, { stepIndex: index, ...data });
        this.refreshRecent(state);
      }
    }
  }

  observeStep(index, step, event, initial) {
    if (!step || (step.type !== 'CORTEX_STEP_TYPE_PLANNER_RESPONSE' && !step.plannerResponse)) return;
    const sourceTiming = timing(step.metadata);
    const complete = Boolean(sourceTiming.finishedGeneratingAt) || END.has(step.status);
    let state = this.states.get(index);
    if (!state) {
      const historical = initial && complete;
      // Earlier indices can be rehydrated later. They are never fresh output.
      if (historical || (index < this.baselineLength && complete)) return;
      state = { index, historical, partialCapture: initial || index < this.baselineLength ||
        !sourceTiming.createdAt || Date.parse(sourceTiming.createdAt) < this.connectedWallMs,
        channels: {}, events: 0, toolEvents: 0, revisions: 0, firstContentMs: null, lastContentMs: null,
        contentBatches: new Set(), observedCompletion: false, toolCount: 0, usage: null };
      this.states.set(index, state);
      if (this.states.size > 512) {
        const finished = [...this.states].find(([, s]) => s.observedCompletion);
        if (!finished) throw new Error('too_many_active_steps');
        this.states.delete(finished[0]);
      }
    }
    const c = content(step);
    const changes = {};
    let contentChanged = false;
    for (const key of ['text', 'thinking', 'toolArguments']) {
      const parts = key === 'toolArguments' ? c[key] : [c[key]];
      const previous = state.channels[key];
      const diff = compareParts(parts, previous?.parts);
      const channel = previous || { events: 0, firstMs: null, lastMs: null };
      channel.parts = diff.next;
      channel.bytes = diff.bytes;
      channel.utf16Units = diff.utf16Units;
      // Empty initial snapshots establish a baseline, never a content event.
      const changed = diff.changed && (diff.bytes > 0 || (previous && diff.deltaBytes !== 0));
      if (changed && !initial) {
        channel.events++;
        channel.firstMs ??= event.elapsedMs;
        channel.lastMs = event.elapsedMs;
        changes[key] = { bytes: diff.bytes, utf16Units: diff.utf16Units, deltaBytes: diff.deltaBytes, appendOnly: diff.appendOnly };
        contentChanged = true;
        if (!diff.appendOnly) state.revisions++;
        if (key === 'toolArguments') state.toolEvents++;
      }
      state.channels[key] = channel;
    }
    if (contentChanged) {
      state.events++;
      this.contentEvents++;
      state.firstContentMs ??= event.elapsedMs;
      state.lastContentMs = event.elapsedMs;
      state.contentBatches.add(event.receiveBatch);
    }
    const usage = tokenUsage(step.metadata?.modelUsage) || state.usage;
    const status = typeof step.status === 'string' && /^CORTEX_STEP_STATUS_[A-Z_]+$/.test(step.status) ? step.status : 'UNKNOWN';
    const signature = JSON.stringify({ status, complete, sourceTiming, usage, toolCount: c.toolCount });
    const changed = state.signature !== signature;
    state.signature = signature;
    state.status = status;
    state.observedCompletion ||= !initial && complete;
    state.toolCount = c.toolCount;
    state.usage = usage;
    if (!initial && (contentChanged || changed)) {
      this.record('step_update', event, { stepIndex: index, status, complete, partialCapture: state.partialCapture,
        toolCount: c.toolCount, changes, usage, sourceTiming });
      this.refreshRecent(state);
    }
  }

  refreshRecent(state) {
    const channels = Object.fromEntries(Object.entries(state.channels).map(([key, ch]) => [key, {
      events: ch.events, bytes: ch.bytes, utf16Units: ch.utf16Units,
      observedSpanMs: ch.firstMs === null ? null : rounded(ch.lastMs - ch.firstMs),
    }]));
    const item = { stepIndex: state.index, complete: state.observedCompletion, partialCapture: state.partialCapture,
      contentEvents: state.events, contentReceiveBatches: state.contentBatches.size, toolArgumentEvents: state.toolEvents,
      toolCount: state.toolCount, revisions: state.revisions,
      observation: state.partialCapture ? 'partial_capture' : state.events === 0 ? 'no_content_observed' :
        state.contentBatches.size < 2 ? 'single_receive_batch' : 'multiple_receive_batches',
      observedSpanMs: state.firstContentMs === null ? null : rounded(state.lastContentMs - state.firstContentMs),
      usage: state.usage, nativeTtftSec: state.nativeTtftSec ?? null, nativeStreamSec: state.nativeStreamSec ?? null, channels };
    this.recent = [item, ...this.recent.filter(r => r.stepIndex !== state.index)].slice(0, 30);
  }

  status() {
    return { initialized: this.initialized, baselineSteps: this.baselineSteps, messages: this.messages,
      contentEvents: this.contentEvents, recentSteps: this.recent };
  }
}

class DiagnosticLog {
  constructor(directory) { this.directory = directory; this.path = join(directory, 'events.jsonl'); this.size = null; }
  write(record) {
    if (this.size === null) {
      mkdirSync(this.directory, { recursive: true });
      this.size = existsSync(this.path) ? statSync(this.path).size : 0;
    }
    const line = JSON.stringify(record) + '\n';
    const bytes = Buffer.byteLength(line);
    if (this.size + bytes > MAX_LOG) {
      const previous = this.path + '.1';
      if (existsSync(previous)) unlinkSync(previous);
      if (existsSync(this.path)) renameSync(this.path, previous);
      this.size = 0;
    }
    appendFileSync(this.path, line, 'utf8');
    this.size += bytes;
  }
}

export class StreamDiagnostics {
  constructor({ dataDir, lsAddress, csrfToken, fetchImpl = fetch, pollMs = 2000, retryMs = 5000 }) {
    this.dataDir = dataDir;
    this.lsAddress = lsAddress;
    this.csrfToken = csrfToken;
    this.fetch = fetchImpl;
    this.pollMs = pollMs;
    this.retryMs = retryMs;
    this.configPath = join(dataDir, 'stream-diagnostics-config.json');
    this.log = new DiagnosticLog(join(dataDir, 'stream-diagnostics'));
    this.config = { enabled: false, conversationId: '' };
    try {
      const config = JSON.parse(readFileSync(this.configPath, 'utf8'));
      this.config = { enabled: config.enabled === true, conversationId: UUID.test(config.conversationId) ? config.conversationId : '' };
    } catch { /* Diagnostic capture is opt-in and independent of billing. */ }
    this.phase = 'disabled';
    this.error = null;
    this.current = null;
    this.lastObservation = null;
    this.nextRetryAt = 0;
    this.timer = null;
    this.discoveryController = null;
    this.discovering = false;
  }

  start() {
    if (this.timer || !this.config.enabled) return;
    this.phase = 'waiting';
    this.tick();
    this.timer = setInterval(() => this.tick(), this.pollMs);
    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.discoveryController?.abort();
    this.current?.controller.abort();
    this.current = null;
    this.phase = 'disabled';
  }

  configure({ enabled, conversationId = '' }) {
    if (typeof enabled !== 'boolean' || (conversationId !== '' && !UUID.test(conversationId))) throw new Error('invalid_diagnostic_config');
    const config = { enabled, conversationId };
    mkdirSync(this.dataDir, { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    this.stop();
    this.config = config;
    this.error = null;
    this.nextRetryAt = 0;
    this.start();
    return this.status();
  }

  status() {
    return { enabled: this.config.enabled, phase: this.phase, error: this.error,
      targetMode: this.config.conversationId ? 'fixed' : 'latest',
      conversationId: this.current?.id || this.lastObservation?.conversationId || '',
      connectedAt: this.current?.connectedAt || null,
      ...(this.current?.observation || this.lastObservation)?.status(),
      source: 'antigravity_state_stream', affectsTps: false };
  }

  async tick() {
    if (!this.config.enabled || this.discovering || Date.now() < this.nextRetryAt) return;
    this.discovering = true;
    const controller = new AbortController();
    this.discoveryController = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await this.fetch(`http://${this.lsAddress}${SERVICE}GetAllCascadeTrajectories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-codeium-csrf-token': this.csrfToken },
        body: '{}', signal: controller.signal,
      });
      if (!res.ok) throw new Error('discovery_http_' + res.status);
      const body = await res.json();
      if (controller.signal.aborted || !this.config.enabled) return;
      const entries = Object.entries(body?.trajectorySummaries || {}).filter(([id]) => UUID.test(id));
      entries.sort((a, b) => (Date.parse(b[1].lastModifiedTime || b[1].createdTime) || 0) - (Date.parse(a[1].lastModifiedTime || a[1].createdTime) || 0));
      const selected = this.config.conversationId ? entries.find(([id]) => id === this.config.conversationId) : entries[0];
      if (!selected) { if (!this.current) this.phase = 'waiting'; return; }
      const [id, summary] = selected;
      if (this.current?.id === id) return;
      this.current?.controller.abort();
      const session = { id, controller: new AbortController(), observation: null, connectedAt: null };
      this.current = session;
      this.consume(session, number(summary.stepCount) || 0);
    } catch (error) {
      if (!this.config.enabled || controller.signal.aborted && this.discoveryController !== controller) return;
      if (!this.current) this.phase = 'error';
      this.error = /^discovery_http_\d+$/.test(error.message) ? error.message : 'discovery_failed';
      this.nextRetryAt = Date.now() + this.retryMs;
    } finally {
      clearTimeout(timeout);
      if (this.discoveryController === controller) this.discoveryController = null;
      this.discovering = false;
    }
  }

  async consume(session, stepCount) {
    let reader;
    let firstTimer;
    this.phase = 'connecting';
    const started = performance.now();
    const connectedWallMs = Date.now();
    const connectionId = randomUUID();
    let receiveBatch = 0;
    try {
      firstTimer = setTimeout(() => session.controller.abort(), 15000);
      const res = await this.fetch(`http://${this.lsAddress}${SERVICE}StreamAgentStateUpdates`, {
        method: 'POST', headers: { 'Content-Type': 'application/connect+json', 'Connect-Protocol-Version': '1',
          'Connect-Accept-Encoding': 'identity', 'x-codeium-csrf-token': this.csrfToken },
        body: encodeConnectJson({ conversationId: session.id, subscriberId: 'usage-monitor-' + connectionId,
          initialStepsPageBounds: { startIndex: Math.max(0, stepCount - 16), endIndexExclusive: 2147483647 },
          initialGeneratorMetadatasPageBounds: { startIndex: 0, endIndexExclusive: 2147483647 },
          initialExecutorMetadatasPageBounds: { startIndex: 2147483647, endIndexExclusive: 2147483647 },
          trajectoryVerbosity: 'CLIENT_TRAJECTORY_VERBOSITY_FULL' }),
        signal: session.controller.signal,
      });
      if (!res.ok) throw new Error('stream_http_' + res.status);
      if (!res.headers.get('content-type')?.startsWith('application/connect+json') || !res.body) throw new Error('unsupported_stream_content_type');
      const observation = new StreamObservation({ conversationId: session.id, connectionId, connectedWallMs,
        emit: record => this.log.write(record) });
      session.observation = observation;
      this.lastObservation = observation;
      session.connectedAt = new Date(connectedWallMs).toISOString();
      this.log.write({ version: 1, kind: 'connection', conversationId: session.id, connectionId,
        receivedAt: session.connectedAt, elapsedMs: 0, source: 'antigravity_state_stream' });
      const decoder = new ConnectJsonDecoder();
      reader = res.body.getReader();
      while (!session.controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        const event = { elapsedMs: performance.now() - started, receivedAt: new Date().toISOString(), receiveBatch: ++receiveBatch };
        for (const message of decoder.push(value)) {
          if (message.end) {
            if (message.value?.error) throw new Error('stream_rpc_error');
            continue;
          }
          observation.accept(message.value, event);
          if (observation.initialized) {
            clearTimeout(firstTimer);
            if (this.current === session) { this.phase = 'collecting'; this.error = null; }
          }
        }
        if (decoder.ended) break;
      }
      decoder.finish();
      if (!session.controller.signal.aborted) throw new Error('stream_ended');
    } catch (error) {
      if (this.current === session && this.config.enabled) {
        this.phase = 'error';
        // Never expose error bodies: they may contain model text or credentials.
        this.error = /^(stream_http_\d+|unsupported_stream_content_type|frame_too_large|unsupported_frame_flags|invalid_frame_json|truncated_frame|invalid_step_indices|invalid_step_index|too_many_active_steps|stream_rpc_error|stream_ended|data_after_end)$/.test(error.message)
          ? error.message : session.controller.signal.aborted ? 'stream_timeout' : 'stream_failed';
        this.nextRetryAt = Date.now() + this.retryMs;
      }
    } finally {
      clearTimeout(firstTimer);
      session.controller.abort();
      try { await reader?.cancel(); } catch { /* socket already closed */ }
      if (this.current === session) this.current = null;
    }
  }
}
