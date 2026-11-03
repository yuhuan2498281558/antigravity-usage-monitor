/**
 * Antigravity 本地状态流（State Stream）诊断观测模块。
 *
 * 设计原则与隐私边界：
 * 1. 本模块观测的是 LanguageServer 的本地状态同步流（`StreamAgentStateUpdates`），而非底层大模型原始 Token 流。
 * 2. 严格隐私保护：仅在内存中计算文本片段的 UTF-8 字节数、UTF-16 码元长度与 SHA-256 摘要（`digest`）以检测增量变化；
 *    落盘日志（`events.jsonl`）只记录白名单内的数值计数器与时间戳，绝不落盘任何对话明文、思维链或工具参数内容。
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

/** LanguageServer Connect RPC 服务路径前缀 */
const SERVICE = '/exa.language_server_pb.LanguageServerService/';

/** 单个 Connect 协议帧的最大允许负载字节数（32 MiB），防止异常帧导致进程 OOM */
const MAX_FRAME = 32 * 1024 * 1024;

/** 诊断事件日志文件最大字节数（5 MiB），超出后触发单文件滚动备份 */
const MAX_LOG = 5 * 1024 * 1024;

/** 会话 UUID 格式校验正则 */
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** 标志着 Cortex 步骤已进入终态的状态枚举集合 */
const END = new Set([
  'CORTEX_STEP_STATUS_DONE',
  'CORTEX_STEP_STATUS_ERROR',
  'CORTEX_STEP_STATUS_CANCELED',
  'CORTEX_STEP_STATUS_CANCELLED',
]);

/** 允许直接透传的流式诊断可预期错误码正则（避免泄露可能包含敏感文本的底层异常消息） */
const KNOWN_STREAM_ERROR_RE = new RegExp(
  '^(?:' +
    [
      'stream_http_\\d+',
      'unsupported_stream_content_type',
      'frame_too_large',
      'unsupported_frame_flags',
      'invalid_frame_json',
      'truncated_frame',
      'invalid_step_indices',
      'invalid_step_index',
      'too_many_active_steps',
      'stream_rpc_error',
      'stream_ended',
      'data_after_end',
    ].join('|') +
    ')$'
);

/**
 * 将输入值校验并转换为非负安全整数。
 *
 * @param {unknown} value 待校验的原始计数值或索引值
 * @returns {number | null} 合法的非负安全整数，不合法时返回 null
 */
function number(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isSafeInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  return null;
}

/**
 * 计算字符串的 SHA-256 十六进制摘要。
 * 用于在不保存对话明文的前提下比对流式文本片段是否发生变化或是否为纯尾部追加。
 *
 * @param {string} value 待计算摘要的文本内容
 * @returns {string} 64 位十六进制 SHA-256 摘要
 */
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * 解析 Protobuf Duration 格式字符串（如 `"1.25s"`）为秒数。
 *
 * @param {unknown} value 原始耗时字符串
 * @returns {number | null} 解析后的秒数（浮点数），格式不匹配时返回 null
 */
function duration(value) {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?s$/.test(value)) {
    return null;
  }
  return Number(value.slice(0, -1));
}

/**
 * 校验 ISO-8601 UTC 时间戳字符串是否合法且可解析。
 *
 * @param {unknown} value 原始时间戳字符串
 * @returns {string | null} 合法的原时间戳字符串，不合法时返回 null
 */
function timestamp(value) {
  if (typeof value !== 'string') {
    return null;
  }
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value)) {
    return null;
  }
  if (!Number.isFinite(Date.parse(value))) {
    return null;
  }
  return value;
}

/**
 * 将浮点数四舍五入保留 3 位小数（常用于毫秒耗时格式化）。
 *
 * @param {number} value 原始数值
 * @returns {number} 保留 3 位小数后的数值
 */
function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * 将请求对象编码为 Connect 协议流式帧（`application/connect+json`）。
 *
 * Connect 帧头固定为 5 字节：
 * - Byte 0: 标志位（`0x00` 表示常规数据帧）
 * - Bytes 1–4: 无符号 32 位大端整数（`UInt32BE`），表示后续 JSON 负载的 UTF-8 字节长度
 *
 * @param {unknown} value 待序列化的 JSON 负载对象
 * @returns {Buffer} 拼接好 5 字节帧头与 JSON 负载的二进制 Buffer
 */
export function encodeConnectJson(value) {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(5);
  header.writeUInt32BE(body.length, 1);
  return Buffer.concat([header, body]);
}

/**
 * Connect 流式协议（`application/connect+json`）增量帧解码器。
 *
 * 协议帧格式与粘包/半包处理机制：
 * 1. **5 字节定长帧头**：
 *    - `Byte 0` (`flags`)：帧类型标志位。`0x00` 代表标准数据帧（Data Frame），`0x02` 代表流结束尾帧（EndStream Frame，可携带 Trailer / RPC Error）。
 *    - `Bytes 1..4` (`length`)：`UInt32BE`（大端序 32 位无符号整数），代表紧随帧头之后的 JSON 负载字节数。
 * 2. **HTTP 分块与协议帧边界解耦**：
 *    底层 HTTP `ReadableStream` 的单次 `read()` 可能包含半个帧（半包）或连续多个帧（粘包）。
 *    解码器通过 `this.pending` 缓冲区累积未处理的字节，循环切分出完整帧；同一次 HTTP 读取中解码出的所有消息共享该批次的 `receiveBatch` 与接收时间戳。
 * 3. **防 OOM 保护（`MAX_FRAME`）**：
 *    在读取负载前先校验帧头声明的 `length` 是否超过 `this.maxFrame`（默认 32 MiB），超限立即抛出 `'frame_too_large'` 中断连接。
 */
export class ConnectJsonDecoder {
  /**
   * @param {number} [maxFrame=MAX_FRAME] 单帧允许的最大负载字节数上限
   */
  constructor(maxFrame = MAX_FRAME) {
    this.pending = Buffer.alloc(0);
    this.maxFrame = maxFrame;
    this.ended = false;
  }

  /**
   * 推入一段新接收到的二进制数据块，并解析出所有已完整到达的 Connect 消息帧。
   *
   * @param {Buffer | Uint8Array} chunk 新接收到的字节块
   * @returns {Array<{ end: boolean, value: any }>} 本次解析出的完整帧列表
   */
  push(chunk) {
    if (this.ended) {
      throw new Error('data_after_end');
    }
    this.pending = Buffer.concat([this.pending, chunk]);
    const messages = [];

    // 只要缓冲区达到至少 5 字节帧头长度，就尝试读取帧头并检查完整负载是否就绪
    while (this.pending.length >= 5) {
      const flags = this.pending[0];
      const length = this.pending.readUInt32BE(1);

      if (length > this.maxFrame) {
        throw new Error('frame_too_large');
      }
      if (flags !== 0 && flags !== 2) {
        throw new Error('unsupported_frame_flags');
      }
      // 半包等待：当前缓冲区尚不足以容纳完整帧（5 字节头 + length 字节负载），留待下次 push
      if (this.pending.length < length + 5) {
        break;
      }

      const payload = this.pending.subarray(5, length + 5);
      this.pending = this.pending.subarray(length + 5);

      let value;
      try {
        value = JSON.parse(payload.toString('utf8'));
      } catch {
        throw new Error('invalid_frame_json');
      }

      messages.push({
        end: flags === 2,
        value,
      });

      // 遇到 0x02 结束帧后，流正式终结；若尾帧之后仍残留未消费字节则视为协议违规
      if (flags === 2) {
        this.ended = true;
        if (this.pending.length) {
          throw new Error('data_after_end');
        }
        break;
      }
    }

    return messages;
  }

  /**
   * 在底层传输流正常关闭时调用，校验是否仍有未拼完的半包残留。
   */
  finish() {
    if (this.pending.length) {
      throw new Error('truncated_frame');
    }
  }
}

/**
 * 从单个步骤对象中提取正文文本、思维链文本与工具调用参数数组。
 *
 * @param {object} step Cortex 轨迹步骤对象
 * @returns {{ text: string, thinking: string, toolArguments: string[], toolCount: number }}
 */
function content(step) {
  const p = step.plannerResponse || {};
  const tools = Array.isArray(p.toolCalls) ? p.toolCalls : [];
  const rawText = p.modifiedResponse || p.response;
  const rawThinking = p.rawThinking || p.thinking;

  return {
    text: typeof rawText === 'string' ? rawText : '',
    thinking: typeof rawThinking === 'string' ? rawThinking : '',
    // 不拼接分隔符，而是按每个工具独立保存参数字符串，防止第一个工具参数被修改时被误判为尾部追加
    toolArguments: tools.map((t) => {
      return typeof t.argumentsJson === 'string' ? t.argumentsJson : '';
    }),
    toolCount: tools.length,
  };
}

/**
 * 为一组字符串片段生成脱敏指纹（仅保留 SHA-256 摘要、UTF-8 字节数与 UTF-16 码元长度）。
 *
 * @param {string[]} parts 字符串片段列表
 * @returns {Array<{ hash: string, bytes: number, units: number }>} 脱敏指纹列表
 */
function fingerprint(parts) {
  return parts.map((s) => ({
    hash: digest(s),
    bytes: Buffer.byteLength(s),
    units: s.length,
  }));
}

/**
 * 对比当前文本片段数组与上一帧指纹，判定内容是否发生变化以及是否属于纯尾部追加（append-only）。
 *
 * @param {string[]} parts 当前帧的原始字符串数组
 * @param {Array<{ hash: string, bytes: number, units: number }>} [previous=[]] 上一帧的脱敏指纹数组
 * @returns {{
 *   next: Array<{ hash: string, bytes: number, units: number }>,
 *   changed: boolean,
 *   appendOnly: boolean,
 *   bytes: number,
 *   utf16Units: number,
 *   deltaBytes: number
 * }}
 */
function compareParts(parts, previous = []) {
  const next = fingerprint(parts);
  let changed = next.length !== previous.length;
  let appendOnly = next.length >= previous.length;
  const maxLen = Math.max(parts.length, previous.length);

  for (let i = 0; i < maxLen; i++) {
    const old = previous[i];
    const now = next[i];

    if (!old) {
      changed ||= Boolean(now?.bytes);
      continue;
    }
    if (!now) {
      changed = true;
      appendOnly = false;
      continue;
    }
    if (now.hash !== old.hash) {
      changed = true;
      // 若新字符串长度反而缩短，或截取旧长度前缀后的 SHA-256 与旧摘要不一致，则说明发生了回写/覆写而非纯追加
      const prefixChanged =
        now.units < old.units ||
        digest(parts[i].slice(0, old.units)) !== old.hash;
      if (prefixChanged) {
        appendOnly = false;
      }
    }
  }

  const bytes = next.reduce((n, p) => n + p.bytes, 0);
  const units = next.reduce((n, p) => n + p.units, 0);
  const previousBytes = previous.reduce((n, p) => n + p.bytes, 0);
  const deltaBytes = bytes - previousBytes;

  return {
    next,
    changed,
    appendOnly,
    bytes,
    utf16Units: units,
    deltaBytes,
  };
}

/**
 * 提取并清洗模型输出 Token 用量统计。
 *
 * @param {object} usage 原始用量对象
 * @returns {object | null} 包含合法非负整数 Token 字段的对象，全部缺失时返回 null
 */
function tokenUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return null;
  }
  const result = {};
  const keys = ['outputTokens', 'thinkingOutputTokens', 'responseOutputTokens'];
  for (const key of keys) {
    const n = number(usage[key]);
    if (n !== null) {
      result[key] = n;
    }
  }
  return Object.keys(result).length ? result : null;
}

/**
 * 提取并校验步骤元数据中的关键生命周期时间戳。
 *
 * @param {object} [metadata={}] 步骤元数据对象
 * @returns {Record<string, string>} 合法的阶段时间戳键值对
 */
function timing(metadata = {}) {
  const result = {};
  const keys = ['createdAt', 'viewableAt', 'finishedGeneratingAt', 'completedAt'];
  for (const key of keys) {
    const value = timestamp(metadata[key]);
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 单个会话连接周期内的状态流诊断观测器。
 *
 * 核心设计机制说明：
 * 1. **隐私保护设计（零明文落盘）**：
 *    观测器在 `observeStep` 中仅提取 `text`、`thinking`、`toolArguments` 的 UTF-8 字节长度（`bytes`）、
 *    UTF-16 长度（`utf16Units`）和 SHA-256 摘要（`digest`）用于前后帧差分计算，随即便丢弃明文引用；
 *    写入 `emit` 的日志仅包含增量字节数、事件计数与时间戳，从根本上杜绝对话内容与敏感凭据泄露。
 * 2. **半途捕获（`partialCapture`）判定逻辑**：
 *    当监控器在会话中途建立连接时，首帧（`initial`）或早于连接建立时刻（`Date.parse(createdAt) < this.connectedWallMs`）
 *    以及索引落在初始基线内（`index < this.baselineLength`）的步骤，可能在订阅前就已经生成了部分内容。
 *    此类步骤会被标记为 `partialCapture = true`，避免将“建连前的历史存量 + 建连后的尾帧”误当作完整的流式生成跨度。
 * 3. **多批次流式跨度判定（`contentBatches.size >= 2`）**：
 *    只有当同一个步骤的内容更新横跨至少 2 个独立的 HTTP 读取批次（`contentBatches.size >= 2`）时，
 *    其状态才会被归类为 `'multiple_receive_batches'`。若所有内容变更均在同一个 HTTP 读取批次内到达
 *    （`contentBatches.size < 2`），则归类为 `'single_receive_batch'`，防止因服务端合并推送或一次性快照返回而计算出虚假的极高流速。
 * 4. **活跃步骤状态表容量保护（`states.size > 512` 淘汰策略）**：
 *    `this.states` 维护步骤级观测状态。当条目数超过 512 时，优先查找并淘汰首个已观测到完成状态（`observedCompletion === true`）的步骤；
 *    若超过 512 个步骤全部处于未完成活跃态，则抛出 `'too_many_active_steps'` 主动熔断，防止内存无限增长。
 */
export class StreamObservation {
  /**
   * @param {object} options
   * @param {string} options.conversationId 目标会话 UUID
   * @param {string} [options.connectionId] 本次流式订阅连接 UUID
   * @param {(record: object) => void} options.emit 诊断事件落盘回调
   * @param {number} [options.connectedWallMs] 建立连接时的本地墙钟毫秒时间戳
   */
  constructor({
    conversationId,
    connectionId = randomUUID(),
    emit,
    connectedWallMs = Date.now(),
  }) {
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

  /**
   * 封装公共元数据并向日志回调发射一条诊断记录。
   *
   * @param {string} kind 事件类型标识（`baseline` | `step_update` | `model_timing`）
   * @param {{ receivedAt: string, elapsedMs: number, receiveBatch: number }} event HTTP 接收批次上下文
   * @param {object} data 事件附加字段
   */
  record(kind, event, data) {
    this.emit({
      version: 1,
      kind,
      conversationId: this.conversationId,
      connectionId: this.connectionId,
      receivedAt: event.receivedAt,
      elapsedMs: rounded(event.elapsedMs),
      receiveBatch: event.receiveBatch,
      ...data,
    });
  }

  /**
   * 消费一条解码后的 `StreamAgentStateUpdates` 增量消息。
   *
   * @param {object} message Connect 数据帧解码后的 JSON 对象
   * @param {{ receivedAt: string, elapsedMs: number, receiveBatch: number }} event 接收批次上下文
   */
  accept(message, event) {
    const update = message?.update;
    if (!update || update.conversationId !== this.conversationId) {
      return;
    }
    this.messages++;

    const trajectory = update.mainTrajectoryUpdate;
    const page = trajectory?.stepsUpdate;
    const isInitial = !this.initialized;

    // 首个有效快照必须包含 stepsUpdate 基线页，否则忽略等待
    if (isInitial && !page) {
      return;
    }
    if (isInitial) {
      this.initialized = true;
      this.baselineLength = number(page?.totalLength) ?? 0;
      this.baselineSteps = Array.isArray(page?.steps) ? page.steps.length : 0;
      this.record('baseline', event, {
        totalSteps: this.baselineLength,
        receivedSteps: this.baselineSteps,
        historical: true,
      });
    }

    if (page) {
      const steps = Array.isArray(page.steps) ? page.steps : [];
      const indices = Array.isArray(page.indices) ? page.indices : [];
      if (steps.length !== indices.length) {
        throw new Error('invalid_step_indices');
      }
      for (let i = 0; i < steps.length; i++) {
        const index = number(indices[i]);
        if (index === null) {
          throw new Error('invalid_step_index');
        }
        this.observeStep(index, steps[i], event, isInitial);
      }
    }

    // 处理模型生成元数据更新（包含服务端原生统计的 TTFT、流式耗时与 Token 用量）
    const generators = trajectory?.generatorMetadatasUpdate?.generatorMetadatas;
    if (Array.isArray(generators)) {
      for (const gen of generators) {
        const cm = gen.chatModel;
        if (!cm) {
          continue;
        }
        const data = {
          usage: tokenUsage(cm.usage),
          nativeTtftSec: duration(cm.timeToFirstToken),
          nativeStreamSec: duration(cm.streamingDuration),
        };
        for (const index of gen.stepIndices || []) {
          const state = this.states.get(index);
          if (!state || state.historical) {
            continue;
          }
          const signature = JSON.stringify(data);
          if (signature === state.generatorSignature) {
            continue;
          }
          state.generatorSignature = signature;
          state.nativeTtftSec = data.nativeTtftSec;
          state.nativeStreamSec = data.nativeStreamSec;
          if (data.usage) {
            state.usage = data.usage;
          }
          this.record('model_timing', event, {
            stepIndex: index,
            ...data,
          });
          this.refreshRecent(state);
        }
      }
    }
  }

  /**
   * 观测单个规划步骤（`PLANNER_RESPONSE`）的状态与内容增量。
   *
   * @param {number} index 步骤在轨迹中的索引
   * @param {object} step 步骤原始数据
   * @param {{ receivedAt: string, elapsedMs: number, receiveBatch: number }} event 接收批次上下文
   * @param {boolean} initial 是否为建连后的首帧基线快照
   */
  observeStep(index, step, event, initial) {
    if (
      !step ||
      (step.type !== 'CORTEX_STEP_TYPE_PLANNER_RESPONSE' && !step.plannerResponse)
    ) {
      return;
    }

    const sourceTiming = timing(step.metadata);
    const complete =
      Boolean(sourceTiming.finishedGeneratingAt) || END.has(step.status);
    let state = this.states.get(index);

    if (!state) {
      const historical = initial && complete;
      // 建连前已完成的旧步骤即使后续被重新分页加载，也绝不属于新产生的流式输出，直接忽略
      if (historical || (index < this.baselineLength && complete)) {
        return;
      }

      // 判定是否为半途加入捕获：首帧即存在、索引早于基线总长、缺少创建时间或创建时间早于建连时刻
      const partialCapture =
        initial ||
        index < this.baselineLength ||
        !sourceTiming.createdAt ||
        Date.parse(sourceTiming.createdAt) < this.connectedWallMs;

      state = {
        index,
        historical,
        partialCapture,
        channels: {},
        events: 0,
        toolEvents: 0,
        revisions: 0,
        firstContentMs: null,
        lastContentMs: null,
        contentBatches: new Set(),
        observedCompletion: false,
        toolCount: 0,
        usage: null,
      };
      this.states.set(index, state);

      // 状态表上限淘汰保护：超出 512 条时移除最早一条已观测完成的步骤，若全部未完成则抛错防泄漏
      if (this.states.size > 512) {
        const finished = [...this.states].find(([, s]) => s.observedCompletion);
        if (!finished) {
          throw new Error('too_many_active_steps');
        }
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
      const channel = previous || {
        events: 0,
        firstMs: null,
        lastMs: null,
      };
      channel.parts = diff.next;
      channel.bytes = diff.bytes;
      channel.utf16Units = diff.utf16Units;

      // 初始空快照仅用于建立基准，不计为内容变更事件
      const changed =
        diff.changed && (diff.bytes > 0 || (previous && diff.deltaBytes !== 0));
      if (changed && !initial) {
        channel.events++;
        channel.firstMs ??= event.elapsedMs;
        channel.lastMs = event.elapsedMs;
        changes[key] = {
          bytes: diff.bytes,
          utf16Units: diff.utf16Units,
          deltaBytes: diff.deltaBytes,
          appendOnly: diff.appendOnly,
        };
        contentChanged = true;
        if (!diff.appendOnly) {
          state.revisions++;
        }
        if (key === 'toolArguments') {
          state.toolEvents++;
        }
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
    const status =
      typeof step.status === 'string' &&
      /^CORTEX_STEP_STATUS_[A-Z_]+$/.test(step.status)
        ? step.status
        : 'UNKNOWN';
    const signature = JSON.stringify({
      status,
      complete,
      sourceTiming,
      usage,
      toolCount: c.toolCount,
    });
    const changed = state.signature !== signature;

    state.signature = signature;
    state.status = status;
    state.observedCompletion ||= !initial && complete;
    state.toolCount = c.toolCount;
    state.usage = usage;

    if (!initial && (contentChanged || changed)) {
      this.record('step_update', event, {
        stepIndex: index,
        status,
        complete,
        partialCapture: state.partialCapture,
        toolCount: c.toolCount,
        changes,
        usage,
        sourceTiming,
      });
      this.refreshRecent(state);
    }
  }

  /**
   * 刷新最近观测步骤摘要列表（最多保留最近更新的 30 个步骤）。
   *
   * @param {object} state 步骤内部状态对象
   */
  refreshRecent(state) {
    const channels = Object.fromEntries(
      Object.entries(state.channels).map(([key, ch]) => [
        key,
        {
          events: ch.events,
          bytes: ch.bytes,
          utf16Units: ch.utf16Units,
          observedSpanMs:
            ch.firstMs === null ? null : rounded(ch.lastMs - ch.firstMs),
        },
      ])
    );

    // 区分单批次到达与跨多批次流式到达：仅当 contentBatches.size >= 2 时才代表观测到了跨批次增量流
    let observationKind;
    if (state.partialCapture) {
      observationKind = 'partial_capture';
    } else if (state.events === 0) {
      observationKind = 'no_content_observed';
    } else if (state.contentBatches.size < 2) {
      observationKind = 'single_receive_batch';
    } else {
      observationKind = 'multiple_receive_batches';
    }

    const observedSpanMs =
      state.firstContentMs === null
        ? null
        : rounded(state.lastContentMs - state.firstContentMs);

    const item = {
      stepIndex: state.index,
      complete: state.observedCompletion,
      partialCapture: state.partialCapture,
      contentEvents: state.events,
      contentReceiveBatches: state.contentBatches.size,
      toolArgumentEvents: state.toolEvents,
      toolCount: state.toolCount,
      revisions: state.revisions,
      observation: observationKind,
      observedSpanMs,
      usage: state.usage,
      nativeTtftSec: state.nativeTtftSec ?? null,
      nativeStreamSec: state.nativeStreamSec ?? null,
      channels,
    };

    this.recent = [
      item,
      ...this.recent.filter((r) => r.stepIndex !== state.index),
    ].slice(0, 30);
  }

  /**
   * 返回当前连接观测器的实时汇总状态。
   */
  status() {
    return {
      initialized: this.initialized,
      baselineSteps: this.baselineSteps,
      messages: this.messages,
      contentEvents: this.contentEvents,
      recentSteps: this.recent,
    };
  }
}

/**
 * 诊断事件 JSONL 循环日志写入器。
 * 当单文件体积超过 `MAX_LOG`（5 MiB）时，自动将当前文件轮转为 `events.jsonl.1` 并创建新文件。
 */
class DiagnosticLog {
  /**
   * @param {string} directory 日志存储目录路径
   */
  constructor(directory) {
    this.directory = directory;
    this.path = join(directory, 'events.jsonl');
    this.size = null;
  }

  /**
   * 追加写入一条 JSONL 诊断记录。
   *
   * @param {object} record 待写入的诊断事件对象
   */
  write(record) {
    if (this.size === null) {
      mkdirSync(this.directory, { recursive: true });
      this.size = existsSync(this.path) ? statSync(this.path).size : 0;
    }
    const line = JSON.stringify(record) + '\n';
    const bytes = Buffer.byteLength(line);
    if (this.size + bytes > MAX_LOG) {
      const previous = this.path + '.1';
      if (existsSync(previous)) {
        unlinkSync(previous);
      }
      if (existsSync(this.path)) {
        renameSync(this.path, previous);
      }
      this.size = 0;
    }
    appendFileSync(this.path, line, 'utf8');
    this.size += bytes;
  }
}

/**
 * 后台状态流诊断管理器。
 *
 * 职责与工作机制：
 * 1. **配置持久化**：
 *    将启用状态（`enabled`）与目标会话 ID（`conversationId`，留空代表自动追踪最新活跃会话）
 *    持久化至 `<dataDir>/stream-diagnostics-config.json`；默认关闭（opt-in），与计费和主面板测速完全独立。
 * 2. **会话发现与自动切换（`tick`）**：
 *    开启后按 `pollMs`（默认 2000ms）周期轮询 `GetAllCascadeTrajectories`，按最后修改时间降序挑选目标会话；
 *    若最新活跃会话发生切换，自动中止旧流并无缝切换到新会话。
 * 3. **后台订阅 `StreamAgentStateUpdates` 与退避重连（`consume`）**：
 *    通过 Connect 流式协议建立长连接，设置 15 秒首帧超时保护；当遇到网络断开、流意外结束或 RPC 错误时，
 *    对错误码进行白名单脱敏并记录 `nextRetryAt = Date.now() + this.retryMs`，在冷却期过后由 `tick` 自动发起重连。
 */
export class StreamDiagnostics {
  /**
   * @param {object} options
   * @param {string} options.dataDir 持久化配置与日志根目录
   * @param {string} options.lsAddress LanguageServer 监听地址（`host:port`）
   * @param {string} options.csrfToken LanguageServer CSRF 校验令牌
   * @param {typeof fetch} [options.fetchImpl=fetch] 自定义 fetch 实现（便于单测注入）
   * @param {number} [options.pollMs=2000] 会话发现轮询间隔毫秒数
   * @param {number} [options.retryMs=5000] 异常断开后的重连退避等待毫秒数
   */
  constructor({
    dataDir,
    lsAddress,
    csrfToken,
    fetchImpl = fetch,
    pollMs = 2000,
    retryMs = 5000,
  }) {
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
      this.config = {
        enabled: config.enabled === true,
        conversationId: UUID.test(config.conversationId)
          ? config.conversationId
          : '',
      };
    } catch {
      /* 诊断捕获属于可选特性（opt-in），配置文件不存在或损坏时保持默认关闭，不影响主流程 */
    }

    this.phase = 'disabled';
    this.error = null;
    this.current = null;
    this.lastObservation = null;
    this.nextRetryAt = 0;
    this.timer = null;
    this.discoveryController = null;
    this.discovering = false;
  }

  /**
   * 启动后台轮询与流式订阅定时器。
   */
  start() {
    if (this.timer || !this.config.enabled) {
      return;
    }
    this.phase = 'waiting';
    this.tick();
    this.timer = setInterval(() => this.tick(), this.pollMs);
    this.timer.unref?.();
  }

  /**
   * 停止后台定时器并中止所有正在进行的发现请求与流式连接。
   */
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.discoveryController?.abort();
    this.current?.controller.abort();
    this.current = null;
    this.phase = 'disabled';
  }

  /**
   * 更新并持久化诊断配置，随后重启订阅状态机。
   *
   * @param {{ enabled: boolean, conversationId?: string }} options 新配置项
   */
  configure({ enabled, conversationId = '' }) {
    if (
      typeof enabled !== 'boolean' ||
      (conversationId !== '' && !UUID.test(conversationId))
    ) {
      throw new Error('invalid_diagnostic_config');
    }
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

  /**
   * 获取当前流诊断模块的工作状态快照。
   */
  status() {
    const activeObservation = this.current?.observation || this.lastObservation;
    return {
      enabled: this.config.enabled,
      phase: this.phase,
      error: this.error,
      targetMode: this.config.conversationId ? 'fixed' : 'latest',
      conversationId:
        this.current?.id || this.lastObservation?.conversationId || '',
      connectedAt: this.current?.connectedAt || null,
      ...activeObservation?.status(),
      source: 'antigravity_state_stream',
      affectsTps: false,
    };
  }

  /**
   * 定期轮询 `GetAllCascadeTrajectories` 以发现目标会话并在必要时发起或切换流式订阅。
   */
  async tick() {
    if (
      !this.config.enabled ||
      this.discovering ||
      Date.now() < this.nextRetryAt
    ) {
      return;
    }
    this.discovering = true;
    const controller = new AbortController();
    this.discoveryController = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await this.fetch(
        `http://${this.lsAddress}${SERVICE}GetAllCascadeTrajectories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-codeium-csrf-token': this.csrfToken,
          },
          body: '{}',
          signal: controller.signal,
        }
      );
      if (!res.ok) {
        throw new Error('discovery_http_' + res.status);
      }

      const body = await res.json();
      if (controller.signal.aborted || !this.config.enabled) {
        return;
      }

      const entries = Object.entries(body?.trajectorySummaries || {}).filter(
        ([id]) => UUID.test(id)
      );
      entries.sort((a, b) => {
        const timeB =
          Date.parse(b[1].lastModifiedTime || b[1].createdTime) || 0;
        const timeA =
          Date.parse(a[1].lastModifiedTime || a[1].createdTime) || 0;
        return timeB - timeA;
      });

      const selected = this.config.conversationId
        ? entries.find(([id]) => id === this.config.conversationId)
        : entries[0];

      if (!selected) {
        if (!this.current) {
          this.phase = 'waiting';
        }
        return;
      }

      const [id, summary] = selected;
      if (this.current?.id === id) {
        return;
      }

      this.current?.controller.abort();
      const session = {
        id,
        controller: new AbortController(),
        observation: null,
        connectedAt: null,
      };
      this.current = session;
      this.consume(session, number(summary.stepCount) || 0);
    } catch (error) {
      if (
        !this.config.enabled ||
        (controller.signal.aborted && this.discoveryController !== controller)
      ) {
        return;
      }
      if (!this.current) {
        this.phase = 'error';
      }
      this.error = /^discovery_http_\d+$/.test(error.message)
        ? error.message
        : 'discovery_failed';
      this.nextRetryAt = Date.now() + this.retryMs;
    } finally {
      clearTimeout(timeout);
      if (this.discoveryController === controller) {
        this.discoveryController = null;
      }
      this.discovering = false;
    }
  }

  /**
   * 订阅指定会话的 `StreamAgentStateUpdates` Connect 流并持续消费增量帧。
   *
   * @param {{ id: string, controller: AbortController, observation: StreamObservation | null, connectedAt: string | null }} session 当前订阅会话上下文
   * @param {number} stepCount 会话发现阶段获知的当前步骤总数（用于计算初始分页窗口起点）
   */
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
      const requestPayload = {
        conversationId: session.id,
        subscriberId: 'usage-monitor-' + connectionId,
        initialStepsPageBounds: {
          startIndex: Math.max(0, stepCount - 16),
          endIndexExclusive: 2147483647,
        },
        initialGeneratorMetadatasPageBounds: {
          startIndex: 0,
          endIndexExclusive: 2147483647,
        },
        initialExecutorMetadatasPageBounds: {
          startIndex: 2147483647,
          endIndexExclusive: 2147483647,
        },
        trajectoryVerbosity: 'CLIENT_TRAJECTORY_VERBOSITY_FULL',
      };

      const res = await this.fetch(
        `http://${this.lsAddress}${SERVICE}StreamAgentStateUpdates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/connect+json',
            'Connect-Protocol-Version': '1',
            'Connect-Accept-Encoding': 'identity',
            'x-codeium-csrf-token': this.csrfToken,
          },
          body: encodeConnectJson(requestPayload),
          signal: session.controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error('stream_http_' + res.status);
      }
      const contentType = res.headers.get('content-type');
      if (
        !contentType?.startsWith('application/connect+json') ||
        !res.body
      ) {
        throw new Error('unsupported_stream_content_type');
      }

      const observation = new StreamObservation({
        conversationId: session.id,
        connectionId,
        connectedWallMs,
        emit: (record) => this.log.write(record),
      });
      session.observation = observation;
      this.lastObservation = observation;
      session.connectedAt = new Date(connectedWallMs).toISOString();

      this.log.write({
        version: 1,
        kind: 'connection',
        conversationId: session.id,
        connectionId,
        receivedAt: session.connectedAt,
        elapsedMs: 0,
        source: 'antigravity_state_stream',
      });

      const decoder = new ConnectJsonDecoder();
      reader = res.body.getReader();

      while (!session.controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const event = {
          elapsedMs: performance.now() - started,
          receivedAt: new Date().toISOString(),
          receiveBatch: ++receiveBatch,
        };
        for (const message of decoder.push(value)) {
          if (message.end) {
            if (message.value?.error) {
              throw new Error('stream_rpc_error');
            }
            continue;
          }
          observation.accept(message.value, event);
          if (observation.initialized) {
            clearTimeout(firstTimer);
            if (this.current === session) {
              this.phase = 'collecting';
              this.error = null;
            }
          }
        }
        if (decoder.ended) {
          break;
        }
      }

      decoder.finish();
      if (!session.controller.signal.aborted) {
        throw new Error('stream_ended');
      }
    } catch (error) {
      if (this.current === session && this.config.enabled) {
        this.phase = 'error';
        // 严禁直接暴露未知异常的原始 message，因为底层解析异常可能夹带模型输出正文或认证凭据
        if (KNOWN_STREAM_ERROR_RE.test(error.message)) {
          this.error = error.message;
        } else if (session.controller.signal.aborted) {
          this.error = 'stream_timeout';
        } else {
          this.error = 'stream_failed';
        }
        this.nextRetryAt = Date.now() + this.retryMs;
      }
    } finally {
      clearTimeout(firstTimer);
      session.controller.abort();
      try {
        await reader?.cancel();
      } catch {
        /* 底层套接字已关闭时忽略取消异常 */
      }
      if (this.current === session) {
        this.current = null;
      }
    }
  }
}
