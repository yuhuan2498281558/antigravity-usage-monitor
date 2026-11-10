/**
 * 客户端观测请求级吞吐率（TPS）、首字延迟（TTFT）、上下文构成拆解与模型身份归因计算模块。
 *
 * 核心设计原则：
 * 1. 采用客户端观测到的端到端请求耗时（包含排队等待、思考与工具调用生成），对纯文本生成与工具调用采用统一公式计算。
 * 2. 严禁基于速率上限裁剪异常值或动态篡改分母（如扣除思考时间或仅取流式片段耗时），保证统计口径客观一致。
 */

/** 速度测量口径版本号；当耗时或样本过滤算法变更时递增，用于触发旧版缓存测量字段失效重算 */
export const MEASUREMENT_VERSION = 4;

/** 模型身份归因版本号；当模型识别优先级或占位符清洗策略变更时递增 */
export const MODEL_IDENTITY_VERSION = 1;

/** 纳入有效测速的最小请求总耗时阈值（0.5 秒），过滤极短请求因时钟抖动导致的速率失真 */
export const MIN_SPEED_DURATION_SECONDS = 0.5;

/** 纳入平均吞吐率（Mean TPS）统计的最小输出 Token 数阈值（50 Tokens），避免短回复被首字延迟主导 */
export const MIN_MEAN_OUTPUT_TOKENS = 50;

/**
 * 解析 ISO-8601 时间戳字符串为亚毫秒精度的浮点毫秒时间戳。
 * 标准 `Date.parse` 仅保留到整数毫秒，本函数额外提取小数部分以保留亚毫秒精度。
 *
 * @param {unknown} value ISO-8601 时间戳字符串
 * @returns {number} 毫秒时间戳（含小数部分），解析失败时返回 0
 */
export function parseIsoMs(value) {
  if (typeof value !== 'string' || !value) {
    return 0;
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return 0;
  }
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/i);
  if (!fraction) {
    return ms;
  }
  return Math.floor(ms / 1000) * 1000 + Number(`0.${fraction[1]}`) * 1000;
}

/**
 * 解析 Protobuf Duration 格式字符串（如 `"0.85s"`）为非负秒数。
 *
 * @param {unknown} value 原始耗时字符串
 * @returns {number | null} 非负秒数（浮点数），无效时返回 null
 */
function duration(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?s$/.test(value)) {
    return null;
  }
  const n = Number(value.slice(0, -1));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 校验输入值是否为合法的非负安全整数计数值（支持数字或纯数字字符串）。
 *
 * @param {unknown} value 待校验的 Token 计数值
 * @returns {boolean} 是否为合法非负安全整数
 */
function validCount(value) {
  const isNumericType =
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+$/.test(value));
  if (!isNumericType) {
    return false;
  }
  const num = Number(value);
  return Number.isSafeInteger(num) && num >= 0;
}

/**
 * 将 ISO-8601 时间戳解析为纳秒级 `BigInt` 时间戳。
 *
 * 为什么必须使用 `BigInt` 纳秒而非 `Number` 浮点数：
 * Unix 纪元纳秒时间戳数量级约为 `1.7e18`，已超出 IEEE-754 双精度浮点数 `Number.MAX_SAFE_INTEGER`（`9e15`）的精确表示范围。
 * 若直接转为 `Number` 或在毫秒级做四舍五入，原本 `499,999,999 ns`（499.999999ms）的请求会被舍入为 `0.500s`，
 * 从而错误跨过 `MIN_SPEED_DURATION_SECONDS`（0.5s）的有效性阈值。先以 `BigInt` 精确存储纳秒并做差，再将小差值转为 `Number`，可彻底消除精度丢失。
 *
 * @param {unknown} value ISO-8601 时间戳字符串
 * @returns {bigint | null} 纳秒级 BigInt 时间戳，格式不合法时返回 null
 */
function timestampNs(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/
  );
  if (!match) {
    return null;
  }
  const ms = Date.parse(match[1] + match[3]);
  if (!Number.isFinite(ms)) {
    return null;
  }
  const nanosPart = BigInt((match[2] || '').padEnd(9, '0'));
  return BigInt(ms) * 1_000_000n + nanosPart;
}

/**
 * 计算请求开始与结束时间戳之间的精确秒数耗时。
 * 先在 `BigInt` 纳秒域内执行减法（`end - start`），再除以 `1e9` 转为浮点秒数，防止毫秒级舍入把 499.999ms 请求误判跨过 0.5s 阈值。
 *
 * @param {unknown} startValue 请求开始时间（`createdAt`）
 * @param {unknown} endValue 请求结束时间（`finishedGeneratingAt` 或 `completedAt`）
 * @returns {number | null} 精确到纳秒的请求耗时秒数，时间戳缺失或倒挂时返回 null
 */
function requestDuration(startValue, endValue) {
  const start = timestampNs(startValue);
  const end = timestampNs(endValue);
  if (start === null || end === null || start <= 0n || end < start) {
    return null;
  }
  return Number(end - start) / 1e9;
}

/**
 * 计算两个毫秒时间戳之间的経過秒数。
 *
 * @param {number} start 起始毫秒时间戳
 * @param {number} end 结束毫秒时间戳
 * @returns {number | null} 経過秒数，无效时返回 null
 */
function elapsed(start, end) {
  return start > 0 && end >= start ? (end - start) / 1000 : null;
}

/**
 * 基于 UTF-8 字节长度估算文本的 Token 数量（经验比例：约每 3 个 UTF-8 字节折合 1 个 Token，向上取整）。
 *
 * @param {unknown} text 待估算的原始文本
 * @returns {number} 估算的 Token 数量
 */
function estimateUtf8Tokens(text) {
  if (typeof text !== 'string' || !text) {
    return 0;
  }
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 3);
}

/**
 * 根据系统提示词分块（Prompt Section）的名称或标题将其归类到具体的上下文子桶。
 *
 * @param {unknown} name 分块名称或标题
 * @returns {'skills' | 'userRules' | 'mcpTools' | 'systemPrompt'} 归属的上下文分类键名
 */
function classifyPromptSection(name) {
  const key = String(name || '').trim().toLowerCase();
  if (key === 'skills' || key === 'skill') {
    return 'skills';
  }
  if (key === 'user_rules' || key === 'user_rule' || key === 'rules') {
    return 'userRules';
  }
  if (key === 'mcp_servers' || key === 'mcp' || key.startsWith('mcp_')) {
    return 'mcpTools';
  }
  return 'systemPrompt';
}

/**
 * 判断某个工具项是否属于 MCP（Model Context Protocol）扩展工具或资源调用工具。
 *
 * @param {unknown} name 工具名称
 * @param {unknown} [source=''] 工具来源标识
 * @param {unknown} [type=''] 工具类型标识
 * @returns {boolean} 是否归属于 MCP 工具分类
 */
function isMcpToolItem(name, source = '', type = '') {
  const n = String(name || '').trim().toLowerCase();
  const src = String(source || '').toUpperCase();
  const t = String(type || '').toUpperCase();
  return (
    src.includes('MCP') ||
    t.includes('MCP') ||
    n.startsWith('mcp_') ||
    n.startsWith('mcp-') ||
    n === 'call_mcp_tool' ||
    n === 'list_mcp_resources' ||
    n === 'read_mcp_resource'
  );
}

/**
 * 识别 `TOKEN_TYPE_CHAT_MESSAGES` 子项（如 `"391: CHECKPOINT"`、`"404: GENERIC"`）所属的对话细分类型。
 *
 * @param {object} child
 * @returns {'checkpoint'|'assistant'|'subagent'|'userInput'|'toolResults'}
 */
function classifyChatMessageChild(child) {
  const rawName = String(child?.name || child?.type || '').trim().toUpperCase();
  const stepType = rawName.replace(/^\d+:\s*/, '');
  if (stepType.includes('CHECKPOINT') || stepType.includes('SUMMARY')) {
    return 'checkpoint';
  }
  if (
    stepType.includes('PLANNER_RESPONSE') ||
    stepType.includes('ASSISTANT') ||
    stepType.includes('MODEL')
  ) {
    return 'assistant';
  }
  if (stepType.includes('SYSTEM_MESSAGE') || stepType.includes('SUBAGENT')) {
    return 'subagent';
  }
  if (stepType.includes('USER_INPUT') || stepType === 'USER') {
    return 'userInput';
  }
  // GENERIC, VIEW_FILE, RUN_COMMAND, CODE_ACTION 等均为工具调用返回结果
  return 'toolResults';
}

/**
 * 从 `chatModel` 元数据中提取并拆解 10 大上下文 Token 构成分类：
 * - `systemPromptTokens`：核心系统提示词
 * - `userRulesTokens`：用户自定义全局/工作区规则
 * - `skillsTokens`：已注入的 Skills 指令说明
 * - `systemToolsTokens`：内置系统工具定义
 * - `mcpToolsTokens`：MCP 外部服务器工具与资源定义
 * - `checkpointTokens`：上下文压缩摘要（Checkpoint）
 * - `userInputTokens`：用户输入消息
 * - `assistantTokens`：主代理回复与思考
 * - `subagentTokens`：子代理汇报消息
 * - `toolResultsTokens`：工具执行返回结果
 *
 * @param {object} chat `generatorMetadata.chatModel` 对象
 * @returns {object | null} 上下文 Token 构成明细，无任何可用元数据时返回 null
 */
export function extractContextBreakdown(chat) {
  if (!chat || typeof chat !== 'object') {
    return null;
  }
  const tb = chat?.chatStartMetadata?.contextWindowMetadata?.tokenBreakdown;
  const groups = Array.isArray(tb?.groups) ? tb.groups : [];
  const promptSections = Array.isArray(chat?.promptSections)
    ? chat.promptSections
    : [];
  const tools = Array.isArray(chat?.tools) ? chat.tools : [];
  const messagePrompts = Array.isArray(chat?.messagePrompts)
    ? chat.messagePrompts
    : [];

  if (
    !groups.length &&
    !promptSections.length &&
    !tools.length &&
    !messagePrompts.length
  ) {
    return null;
  }

  let userInputTokens = 0;
  let assistantTokens = 0;
  let toolResultsTokens = 0;
  let subagentTokens = 0;
  let checkpointTokens = 0;
  let systemToolsTokens = 0;
  let mcpToolsTokens = 0;
  let skillsTokens = 0;
  let systemPromptTokens = 0;
  let userRulesTokens = 0;

  let hasPromptGroup = false;
  let hasToolsGroup = false;
  let hasMessagesGroup = false;

  // 第一阶段：从原生 tokenBreakdown.groups 树状结构中提取并拆分 10 大上下文分类
  for (const g of groups) {
    const gType = String(g?.type || '').toUpperCase();
    const gName = String(g?.name || '').trim().toLowerCase();
    const gSource = String(g?.source || '').toUpperCase();
    const gTokens = Math.max(0, Number(g?.numTokens || 0));
    const children = Array.isArray(g?.children) ? g.children : [];

    if (gType === 'TOKEN_TYPE_SYSTEM_PROMPT' || gName === 'system prompt') {
      hasPromptGroup = true;
      if (children.length > 0) {
        let childSum = 0;
        for (const c of children) {
          const tok = Math.max(0, Number(c?.numTokens || 0));
          childSum += tok;
          const bucket = classifyPromptSection(c?.name ?? c?.title);
          if (bucket === 'skills') {
            skillsTokens += tok;
          } else if (bucket === 'userRules') {
            userRulesTokens += tok;
          } else if (bucket === 'mcpTools') {
            mcpToolsTokens += tok;
          } else {
            systemPromptTokens += tok;
          }
        }
        if (gTokens > childSum) {
          systemPromptTokens += gTokens - childSum;
        }
      } else {
        systemPromptTokens += gTokens;
      }
    } else if (
      gType === 'TOKEN_TYPE_TOOLS' ||
      gName === 'tools' ||
      gType.includes('MCP') ||
      gSource.includes('MCP')
    ) {
      hasToolsGroup = true;
      if (children.length > 0) {
        let childSum = 0;
        for (const c of children) {
          const tok = Math.max(0, Number(c?.numTokens || 0));
          childSum += tok;
          if (
            isMcpToolItem(c?.name, c?.source || g?.source, c?.type || g?.type)
          ) {
            mcpToolsTokens += tok;
          } else {
            systemToolsTokens += tok;
          }
        }
        if (gTokens > childSum) {
          if (isMcpToolItem(g?.name, g?.source, g?.type)) {
            mcpToolsTokens += gTokens - childSum;
          } else {
            systemToolsTokens += gTokens - childSum;
          }
        }
      } else if (isMcpToolItem(g?.name, g?.source, g?.type)) {
        mcpToolsTokens += gTokens;
      } else {
        systemToolsTokens += gTokens;
      }
    } else if (
      gType === 'TOKEN_TYPE_CHAT_MESSAGES' ||
      gName === 'chat messages' ||
      gName === 'messages'
    ) {
      hasMessagesGroup = true;
      if (children.length > 0) {
        let childSum = 0;
        for (const c of children) {
          const tok = Math.max(0, Number(c?.numTokens || 0));
          childSum += tok;
          const msgBucket = classifyChatMessageChild(c);
          if (msgBucket === 'checkpoint') {
            checkpointTokens += tok;
          } else if (msgBucket === 'assistant') {
            assistantTokens += tok;
          } else if (msgBucket === 'subagent') {
            subagentTokens += tok;
          } else if (msgBucket === 'userInput') {
            userInputTokens += tok;
          } else {
            toolResultsTokens += tok;
          }
        }
        if (gTokens > childSum) {
          userInputTokens += gTokens - childSum;
        }
      } else if (gTokens > 0) {
        userInputTokens += gTokens;
      }
    }
  }

  // 第二阶段（A）：当 groups 缺失系统提示词分组时，回退到 promptSections 按显式 token 或 UTF-8 字节数（byteLength / 3）估算
  if (!hasPromptGroup && promptSections.length > 0) {
    for (const s of promptSections) {
      const tok =
        Number.isFinite(Number(s?.numTokens)) && Number(s?.numTokens) >= 0
          ? Number(s.numTokens)
          : estimateUtf8Tokens(s?.content ?? s?.text ?? '');
      const bucket = classifyPromptSection(s?.title ?? s?.name);
      if (bucket === 'skills') {
        skillsTokens += tok;
      } else if (bucket === 'userRules') {
        userRulesTokens += tok;
      } else if (bucket === 'mcpTools') {
        mcpToolsTokens += tok;
      } else {
        systemPromptTokens += tok;
      }
    }
  }

  // 第二阶段（B）：当 groups 缺失工具分组时，回退到 tools 列表拼接名称、描述与 JSON Schema 估算
  if (!hasToolsGroup && tools.length > 0) {
    for (const t of tools) {
      const rawText = `${t?.name || ''}${t?.description || ''}${t?.jsonSchemaString || ''}`;
      const tok =
        Number.isFinite(Number(t?.numTokens)) && Number(t?.numTokens) >= 0
          ? Number(t.numTokens)
          : estimateUtf8Tokens(rawText);
      if (isMcpToolItem(t?.name, t?.source, t?.type)) {
        mcpToolsTokens += tok;
      } else {
        systemToolsTokens += tok;
      }
    }
  }

  // 第二阶段（C）：当 groups 缺失对话消息分组时，回退到 messagePrompts 列表按来源与内容特征分类估算
  if (!hasMessagesGroup && messagePrompts.length > 0) {
    for (const m of messagePrompts) {
      const text = String(m?.prompt ?? m?.content ?? '');
      const tok =
        Number.isFinite(Number(m?.numTokens)) && Number(m?.numTokens) >= 0
          ? Number(m.numTokens)
          : estimateUtf8Tokens(text);
      const src = String(m?.source || '').toUpperCase();
      if (src.includes('TOOL')) {
        toolResultsTokens += tok;
      } else if (src.includes('SYSTEM') || src.includes('ASSISTANT') || src.includes('MODEL')) {
        assistantTokens += tok;
      } else if (text.startsWith('<CONTEXT_SUMMARY>')) {
        checkpointTokens += tok;
      } else if (text.includes('<SYSTEM_MESSAGE>')) {
        subagentTokens += tok;
      } else {
        userInputTokens += tok;
      }
    }
  }

  const messagesTokens =
    userInputTokens +
    assistantTokens +
    toolResultsTokens +
    subagentTokens +
    checkpointTokens;

  const totalTokens =
    messagesTokens +
    systemToolsTokens +
    mcpToolsTokens +
    skillsTokens +
    systemPromptTokens +
    userRulesTokens;

  return {
    messagesTokens,
    userInputTokens,
    assistantTokens,
    toolResultsTokens,
    subagentTokens,
    checkpointTokens,
    systemToolsTokens,
    mcpToolsTokens,
    skillsTokens,
    systemPromptTokens,
    userRulesTokens,
    totalTokens,
  };
}

/**
 * 从原始轨迹步骤数组与生成器元数据中提取标准化模型步骤指标。
 *
 * 核心处理流程说明：
 * 1. **模型身份 5 级证据链优先级（由高到低）**：
 *    依次检查本请求自身的 5 个字段来源，取首个非空且非占位符（排除 `0`、`unknown`、`MODEL_UNSPECIFIED`、`MODEL_UNKNOWN`）的值：
 *    - 优先级 1：`usage.model`（步骤内 `modelUsage` 或 `retryInfos[0].usage` 记录的模型标识）
 *    - 优先级 2：`chat.usage.model`（关联 `generatorMetadata.chatModel.usage` 记录的模型标识）
 *    - 优先级 3：`chat.model`（`chatModel` 请求级模型标识）
 *    - 优先级 4：`metadata.generatorModel`（步骤 `metadata` 顶层记录的生成模型）
 *    - 优先级 5：`chat.responseModel`（上游返回的具体响应模型名）
 * 2. **5 种测速过滤与排除原因（`timingReason` / `speedReason`）**：
 *    - `'incomplete_or_invalid_timing'`：步骤状态未完成（非 `CORTEX_STEP_STATUS_DONE`）或总耗时 `totalDurationSec` 缺失/非正数；
 *    - `'invalid_output_tokens'`：`outputTokens` 不是合法的非负安全整数；
 *    - `'short_timing'`：请求总耗时低于 `MIN_SPEED_DURATION_SECONDS`（0.5s），易受计时器粒度噪声干扰；
 *    - `'inconsistent_timing'`：原生首字延迟 `nativeTtftSec` 大于请求总耗时 `totalDurationSec + 0.01s`（时钟或元数据自相矛盾）；
 *    - `'compaction'` / `'short_sample'`：单步吞吐率可计算，但属于上下文压缩检查点步骤（`CORTEX_STEP_TYPE_CHECKPOINT`）
 *      或输出不足 `MIN_MEAN_OUTPUT_TOKENS`（50 Tokens），因此从平均速度样本（`speedSampleEligible`）中剔除。
 * 3. **末尾步骤上下文回填逻辑**：
 *    若轨迹最后一个模型步骤本身未携带 `contextBreakdown`（例如末尾步骤为轻量更新或缺少内联 `chatModel`），
 *    但整条轨迹的 `generatorMetadata` 中存在最近的 `latestBreakdownChat`，则将该上下文构成与最大预算回填至末尾步骤，
 *    确保面板展示的当前会话上下文水位不丢失。
 *
 * @param {Array<object>} [rawSteps=[]] 原始 Cortex 步骤数组
 * @param {Array<object>} [generatorMetadata=[]] 轨迹级生成器元数据列表
 * @returns {Array<object>} 标准化并完成压缩步骤模型推断的步骤指标列表
 */
export function extractModelSteps(rawSteps = [], generatorMetadata = []) {
  const genByStep = new Map();
  let latestBreakdownChat = null;

  for (const gm of generatorMetadata || []) {
    if (!gm?.chatModel) {
      continue;
    }
    for (const index of gm?.stepIndices || []) {
      genByStep.set(Number(index), gm);
    }
    if (extractContextBreakdown(gm.chatModel)) {
      latestBreakdownChat = gm.chatModel;
    }
  }

  const result = [];

  rawSteps.forEach((s, index) => {
    const m = s?.metadata;
    const u = m?.modelUsage || m?.retryInfos?.[0]?.usage;
    if (!u) {
      return;
    }

    const stepIndex = m.sourceTrajectoryStepInfo?.stepIndex ?? index;
    const inlineChat = Array.isArray(m.generatorMetadata)
      ? m.generatorMetadata.find((g) => g?.chatModel)
      : null;
    const gm = inlineChat || genByStep.get(Number(stepIndex));
    const chat = gm?.chatModel;
    const p = s.plannerResponse || {};
    const isCompactionStep = s.type === 'CORTEX_STEP_TYPE_CHECKPOINT';

    const inputTokens = Number(u.inputTokens || 0);
    const cacheReadTokens = Number(u.cacheReadTokens || 0);
    const outputTokens = Number(u.outputTokens || 0);
    const thinkingTokens = Number(
      p.thinkingTokens ??
        u.thinkingOutputTokens ??
        chat?.usage?.thinkingOutputTokens ??
        0
    );
    const responseTokens = Number(
      p.responseTokens ??
        u.responseOutputTokens ??
        chat?.usage?.responseOutputTokens ??
        Math.max(0, outputTokens - thinkingTokens)
    );

    const start = parseIsoMs(m.createdAt);
    const measuredDuration = requestDuration(
      m.createdAt,
      m.finishedGeneratingAt || m.completedAt
    );
    const explicitlyIncomplete = Boolean(
      s.status && s.status !== 'CORTEX_STEP_STATUS_DONE'
    );
    const complete = !explicitlyIncomplete && measuredDuration !== null;
    const totalDurationSec = complete ? measuredDuration : null;
    const nativeTtftSec = duration(chat?.timeToFirstToken);

    // 阶段计时器（streamingDuration / thinkingDuration）仅作诊断展示：
    // 缓冲式工具调用会导致 streamingDuration 极小，因此绝不能将其作为速度分母或从总耗时中扣除
    const nativeStreamSec = duration(chat?.streamingDuration);
    const thinkingDurationSec = duration(p.thinkingDuration);

    // 5 种测速过滤原因判定：先校验耗时与 Token 合法性（timingReason），再判定压缩步与短样本（speedReason）
    let timingReason = null;
    if (!complete || !(totalDurationSec > 0)) {
      timingReason = 'incomplete_or_invalid_timing';
    } else if (!validCount(u.outputTokens)) {
      timingReason = 'invalid_output_tokens';
    } else if (totalDurationSec < MIN_SPEED_DURATION_SECONDS) {
      timingReason = 'short_timing';
    } else if (
      nativeTtftSec !== null &&
      nativeTtftSec > totalDurationSec + 0.01
    ) {
      timingReason = 'inconsistent_timing';
    }

    const totalTokPerSec =
      timingReason === null ? outputTokens / totalDurationSec : null;
    const shortOutputSample =
      totalTokPerSec !== null && outputTokens < MIN_MEAN_OUTPUT_TOKENS;
    const speedReason =
      timingReason ||
      (isCompactionStep
        ? 'compaction'
        : shortOutputSample
          ? 'short_sample'
          : null);

    const context = chat?.chatStartMetadata?.contextWindowMetadata;
    const contextBreakdown = extractContextBreakdown(chat);

    // 模型身份 5 级证据链优先级：仅采信当前请求自身的显式字段；
    // 若 Checkpoint 压缩步骤缺失模型字段，稍后由 inferCompactionStepModels 从同轨迹邻居步骤回退推断
    const isValidModelValue = (value) =>
      typeof value === 'string' &&
      value.trim() &&
      !/^(?:0|unknown|MODEL_(?:UNSPECIFIED|UNKNOWN))$/i.test(value.trim());

    const modelCandidates = [
      ['usage.model', u.model],
      ['chat.usage.model', chat?.usage?.model],
      ['chat.model', chat?.model],
      ['metadata.generatorModel', m.generatorModel],
      ['chat.responseModel', chat?.responseModel],
    ];
    const identity = modelCandidates.find(([, value]) =>
      isValidModelValue(value)
    );
    const rawResponseModel = [
      chat?.responseModel,
      u?.responseModel,
      m?.responseModel,
    ].find(isValidModelValue);

    result.push({
      stepIndex,
      isCompactionStep,
      modelKey: identity ? identity[1].trim() : 'unknown',
      modelSource: identity?.[0] || 'unavailable',
      responseModel: rawResponseModel ? rawResponseModel.trim() : '',
      modelIdentityVersion: MODEL_IDENTITY_VERSION,
      modelDisplayName: chat?.modelDisplayName || '',
      apiProvider: u.apiProvider || chat?.usage?.apiProvider || '',
      createdAt: m.createdAt || null,
      createdAtMs: Math.floor(start),
      hasVisibleText:
        String(p.modifiedResponse || p.response || '').trim().length > 0,
      hasToolCalls: Array.isArray(p.toolCalls) && p.toolCalls.length > 0,
      inputTokens,
      cacheReadTokens,
      outputTokens,
      thinkingTokens,
      responseTokens,
      estimatedContextTokens: Number(
        context?.estimatedTokensUsed || contextBreakdown?.totalTokens || 0
      ),
      maxContextBudgetTokens: Number(context?.maxContextTokens || 256000),
      contextBreakdown,
      measurementVersion: MEASUREMENT_VERSION,
      isComplete: complete,
      nativeTtftSec,
      nativeStreamSec,
      viewableDelaySec: elapsed(start, parseIsoMs(m.viewableAt)),
      ttftSec: nativeTtftSec,
      ttftSource: nativeTtftSec === null ? 'unavailable' : 'native',
      thinkingDurationSec,
      totalDurationSec,
      totalTokPerSec,
      speedBasis: totalTokPerSec === null ? 'unavailable' : 'request_total',
      speedSampleEligible:
        totalTokPerSec !== null && !shortOutputSample && !isCompactionStep,
      speedReason,
    });
  });

  // 末尾步骤上下文回填：若最后一个步骤缺少 contextBreakdown，则使用同轨迹最近一次有效的 generatorMetadata 补齐
  if (
    result.length > 0 &&
    !result[result.length - 1].contextBreakdown &&
    latestBreakdownChat
  ) {
    const lastStep = result[result.length - 1];
    const fallbackBreakdown = extractContextBreakdown(latestBreakdownChat);
    const fallbackCtx =
      latestBreakdownChat?.chatStartMetadata?.contextWindowMetadata;
    lastStep.contextBreakdown = fallbackBreakdown;
    if (!lastStep.estimatedContextTokens) {
      lastStep.estimatedContextTokens = Number(
        fallbackCtx?.estimatedTokensUsed || fallbackBreakdown?.totalTokens || 0
      );
    }
    if (fallbackCtx?.maxContextTokens) {
      lastStep.maxContextBudgetTokens = Number(fallbackCtx.maxContextTokens);
    }
  }

  return inferCompactionStepModels(result);
}

/**
 * 为缺失显式模型标识的上下文压缩步骤（`isCompactionStep`）推断归属模型。
 *
 * 4 轮前后向邻居回退推断规则（仅选取拥有真实显式模型身份 `isExplicitDonor` 的步骤作为捐赠者）：
 * - **第 1 轮（前向同 Provider 优先）**：从当前位置向前（`idx - 1 -> 0`）查找首个 `apiProvider` 兼容的显式模型步骤；
 * - **第 2 轮（后向同 Provider 次之）**：若前向未找到，从当前位置向后（`idx + 1 -> steps.length - 1`）查找首个 `apiProvider` 兼容的显式模型步骤；
 * - **第 3 轮（前向任意显式模型回退）**：若仍未找到，忽略 Provider 限制，向前查找最近的任意显式模型步骤；
 * - **第 4 轮（后向任意显式模型兜底）**：最后向后查找最近的任意显式模型步骤。
 *
 * 命中后将 `modelKey` 补齐并将 `modelSource` 标记为 `'inferred_compaction'`，同时补齐缺失的 `responseModel` 与 `modelDisplayName`。
 *
 * @param {Array<object>} steps 已提取的步骤列表
 * @returns {Array<object>} 补齐压缩步骤模型归属后的步骤列表
 */
export function inferCompactionStepModels(steps) {
  if (!Array.isArray(steps) || steps.length < 2) {
    return steps;
  }

  const isExplicitDonor = (step) =>
    Boolean(
      step &&
        step.modelKey &&
        step.modelKey !== 'unknown' &&
        step.modelSource !== 'inferred_compaction' &&
        step.modelSource !== 'legacy_unverified'
    );

  const isProviderCompatible = (target, donor) =>
    !target.apiProvider ||
    !donor.apiProvider ||
    target.apiProvider === donor.apiProvider;

  return steps.map((step, idx) => {
    if (!step?.isCompactionStep) {
      return step;
    }
    const needsModel = !step.modelKey || step.modelKey === 'unknown';
    const needsUpstream =
      step.modelSource === 'inferred_compaction' && !step.responseModel;
    if (!needsModel && !needsUpstream) {
      return step;
    }

    let donor = null;

    // 第 1 轮：前向查找同 API Provider 的最近显式模型步骤
    for (let j = idx - 1; j >= 0; j--) {
      if (isExplicitDonor(steps[j]) && isProviderCompatible(step, steps[j])) {
        donor = steps[j];
        break;
      }
    }
    // 第 2 轮：后向查找同 API Provider 的最近显式模型步骤
    if (!donor) {
      for (let j = idx + 1; j < steps.length; j++) {
        if (isExplicitDonor(steps[j]) && isProviderCompatible(step, steps[j])) {
          donor = steps[j];
          break;
        }
      }
    }
    // 第 3 轮：前向查找任意最近显式模型步骤
    if (!donor) {
      for (let j = idx - 1; j >= 0; j--) {
        if (isExplicitDonor(steps[j])) {
          donor = steps[j];
          break;
        }
      }
    }
    // 第 4 轮：后向查找任意最近显式模型步骤
    if (!donor) {
      for (let j = idx + 1; j < steps.length; j++) {
        if (isExplicitDonor(steps[j])) {
          donor = steps[j];
          break;
        }
      }
    }

    if (!donor) {
      return step;
    }

    return {
      ...step,
      modelKey: needsModel ? donor.modelKey : step.modelKey,
      modelSource: needsModel ? 'inferred_compaction' : step.modelSource,
      responseModel: step.responseModel || donor.responseModel || '',
      modelDisplayName: step.modelDisplayName || donor.modelDisplayName || '',
    };
  });
}

/**
 * 规范化并迁移从磁盘缓存加载的历史步骤对象。
 *
 * 迁移与歧义清理规则：
 * 1. **旧版 `v9` 缓存 `MODEL_PLACEHOLDER_M418` 歧义清理**：
 *    旧版 `v9` 缓存既把真实的 Argon 模型请求记为 `MODEL_PLACEHOLDER_M418`，又把缺失模型元数据的默认回退值硬编码为 `MODEL_PLACEHOLDER_M418`。
 *    在缺乏原始轨迹证据时两者无法区分，因此迁移时保留 Token 用量与时间信息，将 `MODEL_PLACEHOLDER_M418`（及空模型名）
 *    统一重置为 `modelKey: 'unknown'`、`modelSource: 'legacy_unverified'`，并把原值保存在 `legacyModelKey` 中，交由后续全量重载从原始轨迹恢复真实身份。
 * 2. **跨测量版本速度字段失效保护**：
 *    若缓存步骤的 `measurementVersion` 与当前 `MEASUREMENT_VERSION` 不一致，保留计费 Token 数据以防重载失败丢失账单，
 *    但将所有派生速度与阶段耗时字段清空并标记 `speedReason: 'legacy_cache'`，防止旧口径算出的失真速率混入当前统计。
 *
 * @param {object} step 缓存中的步骤对象
 * @returns {object} 迁移并清洗后的步骤对象
 */
export function normalizeCachedStep(step) {
  if (step.modelIdentityVersion !== MODEL_IDENTITY_VERSION) {
    const ambiguous =
      !step.modelKey || step.modelKey === 'MODEL_PLACEHOLDER_M418';
    step = {
      ...step,
      modelIdentityVersion: MODEL_IDENTITY_VERSION,
      ...(ambiguous
        ? {
            legacyModelKey: step.modelKey || null,
            modelKey: 'unknown',
            modelDisplayName: '',
            modelSource: 'legacy_unverified',
          }
        : { modelSource: 'legacy_explicit' }),
    };
  }

  const DEAD_V3_KEYS = [
    'phaseDurationSec',
    'phaseTokPerSec',
    'phaseReason',
    'answerStartDelaySec',
    'streamDurationSec',
    'streamTokens',
    'streamTokPerSec',
  ];
  const hasDeadV3Key = DEAD_V3_KEYS.some((k) => Object.prototype.hasOwnProperty.call(step, k));
  if (hasDeadV3Key) {
    step = { ...step };
    for (const k of DEAD_V3_KEYS) {
      delete step[k];
    }
  }

  if (step.measurementVersion === MEASUREMENT_VERSION) {
    return step;
  }

  return {
    ...step,
    measurementVersion: null,
    isComplete: false,
    nativeTtftSec: null,
    nativeStreamSec: null,
    viewableDelaySec: null,
    ttftSec: null,
    ttftSource: 'unavailable',
    thinkingDurationSec: null,
    totalDurationSec: null,
    totalTokPerSec: null,
    speedBasis: 'unavailable',
    speedSampleEligible: false,
    speedReason: 'legacy_cache',
  };
}

/**
 * 提取单个步骤的速度度量摘要及其是否具备纳入平均速度统计的资格。
 *
 * @param {object} step 标准化步骤对象
 * @returns {{ value: number | null, tokens: number, seconds: number, eligible: boolean, reason: string | null }}
 */
export function speedMetric(step) {
  const missing = (reason) => ({
    value: null,
    tokens: 0,
    seconds: 0,
    eligible: false,
    reason,
  });

  if (step.measurementVersion !== MEASUREMENT_VERSION) {
    return missing('legacy_cache');
  }
  if (
    !step.isComplete ||
    !Number.isFinite(step.totalTokPerSec) ||
    !(step.totalDurationSec >= MIN_SPEED_DURATION_SECONDS)
  ) {
    return missing(step.speedReason || 'incomplete_or_invalid_timing');
  }

  return {
    value: step.totalTokPerSec,
    tokens: step.outputTokens,
    seconds: step.totalDurationSec,
    eligible: step.speedSampleEligible === true && !step.isCompactionStep,
    reason: step.speedReason,
  };
}

/**
 * 创建用于聚合多步骤吞吐率的累加器初始状态。
 *
 * @returns {{ tokens: number, seconds: number, sampleCount: number, excludedCount: number, excludedReasons: Record<string, number> }}
 */
export function createSpeedAccumulator() {
  return {
    tokens: 0,
    seconds: 0,
    sampleCount: 0,
    excludedCount: 0,
    excludedReasons: {},
  };
}

/**
 * 将单个步骤的速度指标累加到汇总累加器中（自动跳过上下文压缩步骤）。
 *
 * @param {ReturnType<typeof createSpeedAccumulator>} acc 速度累加器
 * @param {object} step 标准化步骤对象
 */
export function accumulateSpeed(acc, step) {
  if (step.isCompactionStep) {
    return;
  }
  const metric = speedMetric(step);
  if (metric.eligible) {
    acc.tokens += metric.tokens;
    acc.seconds += metric.seconds;
    acc.sampleCount++;
  } else {
    acc.excludedCount++;
    acc.excludedReasons[metric.reason] =
      (acc.excludedReasons[metric.reason] || 0) + 1;
  }
}

/**
 * 完成速度累加并计算加权平均吞吐率（`总输出 Tokens / 总有效耗时秒数`）。
 *
 * @param {ReturnType<typeof createSpeedAccumulator>} acc 速度累加器
 * @returns {ReturnType<typeof createSpeedAccumulator> & { avgTokPerSec: number | null }}
 */
export function finishSpeed(acc) {
  return {
    ...acc,
    avgTokPerSec: acc.seconds > 0 ? acc.tokens / acc.seconds : null,
  };
}

/**
 * 一次性汇总一组步骤的整体吞吐率指标。
 *
 * @param {Array<object>} steps 步骤列表
 * @returns {ReturnType<typeof finishSpeed>}
 */
export function summarizeSpeed(steps) {
  const acc = createSpeedAccumulator();
  for (const step of steps) {
    accumulateSpeed(acc, step);
  }
  return finishSpeed(acc);
}

/**
 * 汇总一组步骤的平均原生首字延迟（TTFT）。
 * 仅纳入非压缩、当前测量版本、已完成且 `0 <= nativeTtftSec <= totalDurationSec + 0.01` 的有效样本。
 *
 * @param {Array<object>} steps 步骤列表
 * @returns {{ sampleCount: number, avgSec: number | null }}
 */
export function summarizeTtft(steps) {
  const values = steps
    .filter(
      (s) =>
        !s.isCompactionStep &&
        s.measurementVersion === MEASUREMENT_VERSION &&
        s.isComplete &&
        Number.isFinite(s.totalDurationSec) &&
        Number.isFinite(s.nativeTtftSec) &&
        s.nativeTtftSec >= 0 &&
        s.nativeTtftSec <= s.totalDurationSec + 0.01
    )
    .map((s) => s.nativeTtftSec);

  const avgSec = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;

  return {
    sampleCount: values.length,
    avgSec,
  };
}

/** 标志着原始轨迹步骤已进入终态的状态枚举集合（兼容 Connect RPC 与 transcript.jsonl） */
const LIVE_TERMINAL_STATUSES = new Set([
  'CORTEX_STEP_STATUS_DONE',
  'CORTEX_STEP_STATUS_ERROR',
  'CORTEX_STEP_STATUS_CANCELED',
  'CORTEX_STEP_STATUS_CANCELLED',
  'DONE',
  'ERROR',
  'CANCELED',
  'CANCELLED',
]);

/**
 * 判断原始步骤状态是否属于等待人工确认或审批状态。
 *
 * @param {unknown} status
 * @returns {boolean}
 */
function isWaitingStepStatus(status) {
  const s = String(status || '').toUpperCase();
  return (
    s.includes('WAIT') ||
    s.includes('CONFIRM') ||
    s.includes('APPROV') ||
    s.includes('BLOCKED')
  );
}

/**
 * 判断单个原始轨迹步骤是否已执行完毕。
 *
 * @param {object} step
 * @returns {boolean}
 */
function isRawStepComplete(step) {
  if (!step || typeof step !== 'object') return true;
  if (typeof step.status === 'string' && step.status.trim()) {
    return LIVE_TERMINAL_STATUSES.has(step.status.trim().toUpperCase());
  }
  return Boolean(
    step.metadata?.completedAt ||
      step.metadata?.finishedGeneratingAt ||
      step.completed_at ||
      step.completedAt
  );
}

function getRawStepStartMs(step) {
  const m = step?.metadata || {};
  return Math.floor(
    parseIsoMs(m.createdAt || m.viewableAt || step?.created_at || step?.createdAt) || 0
  );
}

function getRawStepFinishMs(step) {
  const m = step?.metadata || {};
  const explicitEnd = parseIsoMs(
    m.completedAt || m.finishedGeneratingAt || step?.completed_at || step?.completedAt
  );
  if (explicitEnd > 0) return Math.floor(explicitEnd);
  if (typeof step?.content === 'string') {
    const mCompleted = step.content.match(/^Completed At:\s*(\S+)/m);
    if (mCompleted && mCompleted[1]) {
      const parsed = parseIsoMs(mCompleted[1]);
      if (parsed > 0) return Math.floor(parsed);
    }
  }
  return 0;
}

function getRawStepEndMs(step) {
  const finishMs = getRawStepFinishMs(step);
  if (finishMs > 0) return finishMs;
  const m = step?.metadata || {};
  return Math.floor(
    parseIsoMs(m.viewableAt || m.createdAt || step?.created_at || step?.createdAt) || 0
  );
}

function getStepStableId(step, fallbackIdx) {
  const idx =
    step?.step_index ??
    step?.stepIndex ??
    step?.metadata?.sourceTrajectoryStepInfo?.stepIndex;
  return idx !== undefined && idx !== null ? idx : fallbackIdx;
}

/**
 * 反转义 `transcript.jsonl` 或工具参数中可能被二次 JSON 序列化的字段值。
 *
 * @param {unknown} val
 * @returns {unknown}
 */
function unwrapArgValue(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // 半流式或非标准 JSON 回退至正则反转义
    }
  }
  return trimmed
    .replace(/^"+|"+$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '');
}

function unwrapArgString(val) {
  const unwrapped = unwrapArgValue(val);
  if (typeof unwrapped === 'string') return unwrapped.trim();
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) return String(unwrapped);
  return '';
}

/**
 * 截取路径末尾的文件或目录基名（兼容 Windows 反斜杠、`file://` URI 及二次转义字符串）。
 *
 * @param {unknown} rawPath
 * @returns {string}
 */
function shortBasename(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return '';
  let cleaned = unwrapArgString(rawPath).replace(/^file:\/\/\/?/i, '');
  try {
    if (cleaned.includes('%')) {
      cleaned = decodeURIComponent(cleaned);
    }
  } catch {
    // 忽略 URI 解码异常
  }
  cleaned = cleaned.replace(/[\\/]+$/, '');
  const parts = cleaned.split(/[\\/]/);
  return parts[parts.length - 1] || cleaned;
}

/**
 * 将多行或含 Markdown 标记的文本清洗为紧凑的单行预览摘要。
 *
 * @param {unknown} rawText
 * @param {number} [maxLen=52]
 * @param {boolean} [takeLastLine=false]
 * @returns {string}
 */
function cleanSingleLineSnippet(rawText, maxLen = 52, takeLastLine = false) {
  if (typeof rawText !== 'string' || !rawText.trim()) return '';
  const lines = rawText
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^[#>*\-\d.\s]+/, '')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
  if (lines.length === 0) return '';
  const target = takeLastLine ? lines[lines.length - 1] : lines[0];
  return target.length > maxLen ? `${target.slice(0, maxLen - 1)}…` : target;
}

/**
 * 从可能尚未流式接收完毕的半截 JSON 字符串中按字段名提取字符串值。
 *
 * @param {string} rawJson
 * @param {string[]} keys
 * @returns {string}
 */
function extractPartialJsonStringField(rawJson, keys) {
  if (typeof rawJson !== 'string' || !rawJson) return '';
  for (const key of keys) {
    const re = new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`, 'i');
    const m = rawJson.match(re);
    if (m && m[1]) {
      return m[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .trim();
    }
  }
  return '';
}

function getStepPlannerToolCalls(step) {
  if (Array.isArray(step?.plannerResponse?.toolCalls)) {
    return step.plannerResponse.toolCalls;
  }
  if (Array.isArray(step?.tool_calls)) {
    return step.tool_calls;
  }
  if (Array.isArray(step?.toolCalls)) {
    return step.toolCalls;
  }
  return [];
}

function getStepResponseText(step) {
  const p = step?.plannerResponse || {};
  return String(p.modifiedResponse || p.response || step?.content || '').trim();
}

function getStepThinkingText(step) {
  const p = step?.plannerResponse || {};
  return String(p.rawThinking || p.thinking || step?.thinking || '').trim();
}

function isPlannerStep(step) {
  const t = String(step?.type || '').toUpperCase();
  return (
    t === 'CORTEX_STEP_TYPE_PLANNER_RESPONSE' ||
    t === 'PLANNER_RESPONSE' ||
    Boolean(step?.plannerResponse) ||
    Array.isArray(step?.tool_calls)
  );
}

function isCheckpointStep(step) {
  const t = String(step?.type || '').toUpperCase();
  return t === 'CORTEX_STEP_TYPE_CHECKPOINT' || t === 'CHECKPOINT';
}

/**
 * 解析工具调用对象或半流式 JSON 参数，返回适合界面单行展示的中文动作标签与详情描述。
 *
 * @param {object|null|undefined} rawToolCall
 * @param {object|null|undefined} [fallbackStep=null]
 * @returns {{ toolName: string, isAskUser: boolean, label: string, detail: string }}
 */
export function summarizeToolCall(rawToolCall, fallbackStep = null) {
  const stepToolCall = fallbackStep?.metadata?.toolCall || {};
  const stepType = String(fallbackStep?.type || '').toUpperCase();
  let rawName = String(
    rawToolCall?.name ||
      rawToolCall?.toolName ||
      rawToolCall?.function?.name ||
      stepToolCall?.name ||
      ''
  ).trim();

  if (!rawName) {
    if (
      stepType.includes('RUN_COMMAND') ||
      stepType.includes('COMMAND_STATUS') ||
      fallbackStep?.runCommand
    ) {
      rawName = 'run_command';
    } else if (stepType.includes('INVOKE_SUBAGENT') || fallbackStep?.invokeSubagent) {
      rawName = 'invoke_subagent';
    } else if (
      stepType.includes('VIEW_FILE') ||
      stepType.includes('READ_FILE') ||
      fallbackStep?.viewFile ||
      fallbackStep?.readFile
    ) {
      rawName = 'read_file';
    } else if (
      stepType.includes('CODE_ACTION') ||
      stepType.includes('EDIT_FILE') ||
      fallbackStep?.codeAction ||
      fallbackStep?.editFile
    ) {
      rawName = 'edit_file';
    } else if (stepType.includes('GREP_SEARCH') || fallbackStep?.grepSearch) {
      rawName = 'grep_search';
    } else if (stepType.includes('FIND_BY_NAME') || fallbackStep?.findByName) {
      rawName = 'find_by_name';
    } else if (stepType.includes('SEARCH_WEB') || fallbackStep?.searchWeb) {
      rawName = 'search_web';
    }
  }

  const nameLower = rawName.toLowerCase().replace(/^default_api:/, '');
  let args = {};
  let rawArgsStr = '';

  const candidateArgs =
    rawToolCall?.args ??
    rawToolCall?.arguments ??
    rawToolCall?.argumentsJson ??
    rawToolCall?.function?.arguments ??
    stepToolCall?.argumentsJson;

  if (candidateArgs && typeof candidateArgs === 'object') {
    args = candidateArgs;
  } else if (typeof candidateArgs === 'string' && candidateArgs.trim()) {
    rawArgsStr = candidateArgs.trim();
    try {
      const parsed = JSON.parse(rawArgsStr);
      if (parsed && typeof parsed === 'object') args = parsed;
    } catch {
      // 半流式 JSON 尚未闭合，后续通过正则提取关键字段
    }
  }

  const stepPayload =
    fallbackStep?.runCommand ||
    fallbackStep?.commandStatus ||
    fallbackStep?.viewFile ||
    fallbackStep?.readFile ||
    fallbackStep?.viewFileOutline ||
    fallbackStep?.viewCodeItem ||
    fallbackStep?.codeAction ||
    fallbackStep?.editFile ||
    fallbackStep?.replaceFileContent ||
    fallbackStep?.writeToFile ||
    fallbackStep?.grepSearch ||
    fallbackStep?.findByName ||
    fallbackStep?.listDir ||
    fallbackStep?.searchWeb ||
    fallbackStep?.readUrlContent ||
    null;

  const pickField = (keys) => {
    for (const k of keys) {
      const fromArgs = unwrapArgString(args?.[k]);
      if (fromArgs) return fromArgs;
      const camelKey = k.charAt(0).toLowerCase() + k.slice(1);
      const fromArgsCamel = unwrapArgString(args?.[camelKey]);
      if (fromArgsCamel) return fromArgsCamel;
      if (stepPayload && typeof stepPayload === 'object') {
        const fromStep = unwrapArgString(stepPayload[k] ?? stepPayload[camelKey]);
        if (fromStep) return fromStep;
      }
    }
    return extractPartialJsonStringField(rawArgsStr, keys);
  };

  if (
    nameLower === 'run_command' ||
    nameLower === 'command_status' ||
    nameLower === 'send_command_input'
  ) {
    const summary = pickField(['toolSummary', 'Description', 'Summary']);
    const cmd = pickField(['CommandLine', 'Command', 'command']);
    const cmdSnippet = cleanSingleLineSnippet(cmd, 48);
    const detail =
      summary && cmdSnippet && summary !== cmdSnippet
        ? `${summary} (${cmdSnippet})`
        : summary || cmdSnippet || '';
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '执行命令',
      detail,
    };
  }

  if (
    nameLower === 'read_file' ||
    nameLower === 'view_file' ||
    nameLower === 'view_file_outline' ||
    nameLower === 'view_code_item' ||
    nameLower === 'read_notebook'
  ) {
    const file = shortBasename(
      pickField(['Path', 'AbsolutePath', 'AbsolutePathUri', 'FilePath', 'File', 'Uri'])
    );
    const startLine = pickField(['StartLine', 'startLine']);
    const endLine = pickField(['EndLine', 'endLine']);
    const rangeSuffix =
      startLine && endLine
        ? `:${startLine}-${endLine}`
        : startLine
          ? `:${startLine}+`
          : '';
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '读取文件',
      detail: file ? `${file}${rangeSuffix}` : '',
    };
  }

  if (
    nameLower === 'edit_file' ||
    nameLower === 'replace_file_content' ||
    nameLower === 'multi_replace_file_content' ||
    nameLower === 'edit_notebook'
  ) {
    const file = shortBasename(
      pickField(['Path', 'TargetFile', 'AbsolutePath', 'AbsolutePathUri', 'FilePath', 'Uri'])
    );
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '修改文件',
      detail: file || '',
    };
  }

  if (nameLower === 'write_file' || nameLower === 'write_to_file') {
    const file = shortBasename(
      pickField(['Path', 'TargetFile', 'AbsolutePath', 'AbsolutePathUri', 'FilePath', 'Uri'])
    );
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '写入文件',
      detail: file || '',
    };
  }

  if (nameLower === 'grep_search' || nameLower === 'ripgrep') {
    const query = pickField(['Query', 'Pattern', 'query']);
    const searchPath = shortBasename(pickField(['SearchPath', 'DirectoryPath', 'Path']));
    const detail =
      query && searchPath
        ? `${cleanSingleLineSnippet(query, 32)} (${searchPath})`
        : cleanSingleLineSnippet(query, 48) || searchPath || '';
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '搜索代码',
      detail,
    };
  }

  if (nameLower === 'find_by_name' || nameLower === 'list_dir') {
    const pattern = pickField(['Pattern', 'Query']);
    const dir = shortBasename(pickField(['SearchDirectory', 'DirectoryPath', 'Path']));
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '查找文件',
      detail: pattern && dir ? `${pattern} (${dir})` : pattern || dir || '',
    };
  }

  if (nameLower === 'search_web' || nameLower === 'read_url_content' || nameLower === 'fetch_url') {
    const isUrl = nameLower.includes('url');
    const target = pickField(['query', 'Query', 'Url', 'url']);
    return {
      toolName: nameLower,
      isAskUser: false,
      label: isUrl ? '读取网页' : '网页搜索',
      detail: cleanSingleLineSnippet(target, 52) || '',
    };
  }

  if (nameLower === 'invoke_subagent') {
    const subSpec = fallbackStep?.invokeSubagent?.subagents?.[0] || {};
    const role =
      pickField(['Role', 'role']) ||
      String(subSpec.role || '').trim() ||
      pickField(['TypeName', 'typeName']) ||
      String(subSpec.typeName || '').trim();
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '调用子代理',
      detail: role || '',
    };
  }

  if (nameLower === 'send_message') {
    const recipient = pickField(['Recipient', 'recipient']);
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '通信子代理',
      detail: recipient ? recipient.slice(0, 8) : '',
    };
  }

  if (nameLower === 'manage_subagents' || nameLower === 'define_subagent') {
    const subName = pickField(['Name', 'Action', 'action']);
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '管理子代理',
      detail: subName || '',
    };
  }

  if (nameLower === 'manage_task') {
    const action = pickField(['Action', 'action']);
    const taskId = pickField(['TaskId', 'taskId']);
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '后台任务',
      detail: taskId ? `${action || 'status'} (${taskId})` : action || '',
    };
  }

  if (nameLower === 'schedule') {
    const dur = pickField(['DurationSeconds']);
    const cron = pickField(['CronExpression']);
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '定时任务',
      detail: dur ? `${dur}s` : cron || '',
    };
  }

  if (nameLower === 'ask_question') {
    const rawQuestions = unwrapArgValue(args?.questions);
    const qText =
      (Array.isArray(rawQuestions) ? rawQuestions[0]?.question : '') ||
      extractPartialJsonStringField(
        typeof args?.questions === 'string' ? args.questions : rawArgsStr,
        ['question']
      );
    return {
      toolName: nameLower,
      isAskUser: true,
      label: '等待用户选择',
      detail: cleanSingleLineSnippet(qText, 50) || '',
    };
  }

  if (nameLower === 'search_marketplace' || nameLower === 'list_plugin_accounts') {
    const rawQueries = unwrapArgValue(args?.queries);
    const q = Array.isArray(rawQueries) ? rawQueries.join(', ') : '';
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '查询插件',
      detail: cleanSingleLineSnippet(q, 48) || '',
    };
  }

  if (isMcpToolItem(nameLower)) {
    const mcpClean = nameLower.replace(/^mcp[_-]/i, '').replace(/_/g, ' · ');
    return {
      toolName: nameLower,
      isAskUser: false,
      label: '调用 MCP',
      detail: mcpClean || '',
    };
  }

  return {
    toolName: nameLower || 'tool',
    isAskUser: false,
    label: '调用工具',
    detail: nameLower || '',
  };
}

/**
 * 从当前正在运行的会话原始步骤数组 (`rawSteps`，兼容 `GetCascadeTrajectory` 与 `transcript.jsonl`) 中提取模型实时动作摘要。
 *
 * 状态判定覆盖完整 Agent 循环：
 * 1. 轨迹为空或刚创建：显示“准备推理”；
 * 2. 末尾步骤未完成 (`!isRawStepComplete(lastStep)`)：
 *    - 若为 `CHECKPOINT`：显示“上下文压缩”；
 *    - 若为 `PLANNER_RESPONSE`：按 `toolCalls -> response -> thinking -> 首字等待` 优先级提取当前流式动作；
 *    - 若为工具执行步骤：结合 `status` 判定是否处于“等待确认”，并回溯最近一次 `PLANNER_RESPONSE` 匹配对应的工具名与 `[m/n]` 批次进度；
 * 3. 末尾步骤已完成 (`DONE`) 但会话仍处于 `RUNNING`：
 *    - 若最近一次 `PLANNER_RESPONSE` 声明了 `N` 个工具调用，而其后仅有 `M < N` 个完成步骤，则判定第 `M + 1` 个工具正在执行中；
 *    - 若 `M >= N`（全部工具已返回结果）或末尾为 `USER_INPUT`，则判定模型正在汇总工具结果并准备下一轮推理。
 *
 * @param {Array<object>} [rawSteps=[]]
 * @param {boolean} [isRunning=false]
 * @param {number} [fallbackStartMs=0]
 * @returns {{
 *   phase: 'thinking' | 'responding' | 'tool' | 'waiting' | 'compacting',
 *   label: string,
 *   detail: string,
 *   stepProgress: string,
 *   startedAtMs: number,
 *   signature: string
 * } | null}
 */
export function extractLiveActivity(rawSteps = [], isRunning = false, fallbackStartMs = 0) {
  if (!isRunning) return null;
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    const startMs = Math.floor(fallbackStartMs || 0);
    return {
      phase: 'thinking',
      label: '推理中',
      detail: '',
      stepProgress: '',
      startedAtMs: startMs,
      signature: `init:0`,
    };
  }

  const hasBracketPrefix = (text) => /^\[\d+\s*\/\s*\d+\]/.test(String(text || '').trim());

  let lastPlannerIdx = -1;
  let lastUserIdx = -1;
  for (let i = rawSteps.length - 1; i >= 0; i--) {
    const st = rawSteps[i];
    const t = String(st?.type || '').toUpperCase();
    if (lastPlannerIdx === -1 && isPlannerStep(st)) {
      lastPlannerIdx = i;
    }
    if (lastUserIdx === -1 && t.includes('USER_INPUT')) {
      lastUserIdx = i;
    }
    if (lastPlannerIdx !== -1 && lastUserIdx !== -1) break;
  }

  const lastIdx = rawSteps.length - 1;
  const lastStep = rawSteps[lastIdx];
  const lastStepId = getStepStableId(lastStep, lastIdx);
  const lastComplete = isRawStepComplete(lastStep);

  // 情况 A：最后一个步骤本身尚未完成（正在流式生成或正在执行该步骤）
  if (!lastComplete) {
    const startMs = getRawStepStartMs(lastStep) || Math.floor(fallbackStartMs || 0);

    if (isCheckpointStep(lastStep)) {
      return {
        phase: 'compacting',
        label: '上下文压缩',
        detail: '',
        stepProgress: '',
        startedAtMs: startMs,
        signature: `compacting:${lastStepId}`,
      };
    }

    if (isPlannerStep(lastStep)) {
      const tools = getStepPlannerToolCalls(lastStep);
      const respText = getStepResponseText(lastStep);
      const thinkText = getStepThinkingText(lastStep);

      if (tools.length > 0) {
        const activeTool = tools[tools.length - 1];
        const info = summarizeToolCall(activeTool, lastStep);
        const stepProgress =
          tools.length > 1 && !hasBracketPrefix(info.detail) ? `${tools.length}/${tools.length}` : '';
        const phase = info.isAskUser ? 'waiting' : 'tool';
        return {
          phase,
          label: info.label,
          detail: info.detail,
          stepProgress,
          startedAtMs: startMs,
          signature: `planner-tool:${lastStepId}:${tools.length}:${info.label}:${info.detail}`,
        };
      }

      if (respText.length > 0) {
        const snippet = cleanSingleLineSnippet(respText, 52, true);
        return {
          phase: 'responding',
          label: '正在输出回复',
          detail: snippet,
          stepProgress: '',
          startedAtMs: startMs,
          signature: `responding:${lastStepId}:${snippet}`,
        };
      }

      if (thinkText.length > 0) {
        const snippet = cleanSingleLineSnippet(thinkText, 52, true);
        return {
          phase: 'thinking',
          label: '推理中',
          detail: snippet,
          stepProgress: '',
          startedAtMs: startMs,
          signature: `thinking:${lastStepId}:${snippet}`,
        };
      }

      return {
        phase: 'thinking',
        label: '推理中',
        detail: '',
        stepProgress: '',
        startedAtMs: startMs,
        signature: `waiting-ttft:${lastStepId}`,
      };
    }

    // 末尾是未完成的工具执行步骤
    let matchedPlannerTool = null;
    let stepProgress = '';
    if (lastPlannerIdx >= 0 && lastPlannerIdx > lastUserIdx) {
      const pTools = getStepPlannerToolCalls(rawSteps[lastPlannerIdx]);
      const toolStepsAfterPlanner = [];
      for (let k = lastPlannerIdx + 1; k <= lastIdx; k++) {
        const kt = String(rawSteps[k]?.type || '').toUpperCase();
        if (!kt.includes('CHECKPOINT') && !kt.includes('MEMENTO') && !kt.includes('EPHEMERAL')) {
          toolStepsAfterPlanner.push(rawSteps[k]);
        }
      }
      const toolIdx = toolStepsAfterPlanner.length - 1;
      if (toolIdx >= 0 && toolIdx < pTools.length) {
        matchedPlannerTool = pTools[toolIdx];
        if (pTools.length > 1) {
          stepProgress = `${toolIdx + 1}/${pTools.length}`;
        }
      }
    }

    const info = summarizeToolCall(matchedPlannerTool, lastStep);
    if (hasBracketPrefix(info.detail)) {
      stepProgress = '';
    }
    const waiting = isWaitingStepStatus(lastStep?.status) || info.isAskUser;
    const prevEndMs = lastIdx > 0 ? getRawStepFinishMs(rawSteps[lastIdx - 1]) : 0;
    const resolvedStartMs = startMs || prevEndMs || 0;
    const label = waiting && !info.isAskUser ? `等待确认 · ${info.label}` : info.label;

    return {
      phase: waiting ? 'waiting' : 'tool',
      label,
      detail: info.detail,
      stepProgress,
      startedAtMs: resolvedStartMs,
      signature: `step-run:${lastStepId}:${waiting}:${label}:${stepProgress}:${info.detail}`,
    };
  }

  // 情况 B：末尾步骤已是完成态 (DONE)，但整个会话仍处于 RUNNING 状态
  if (lastPlannerIdx >= 0 && lastPlannerIdx > lastUserIdx) {
    const plannerStep = rawSteps[lastPlannerIdx];
    const plannerStepId = getStepStableId(plannerStep, lastPlannerIdx);
    const pTools = getStepPlannerToolCalls(plannerStep);
    const toolStepsAfterPlanner = [];
    for (let k = lastPlannerIdx + 1; k <= lastIdx; k++) {
      const kt = String(rawSteps[k]?.type || '').toUpperCase();
      if (!kt.includes('CHECKPOINT') && !kt.includes('MEMENTO') && !kt.includes('EPHEMERAL')) {
        toolStepsAfterPlanner.push(rawSteps[k]);
      }
    }
    const completedAfterPlanner = toolStepsAfterPlanner.length;

    // B1：上一轮 PLANNER_RESPONSE 发出的 N 个工具调用尚有未落盘完成的项 (completedAfterPlanner < N)
    if (pTools.length > 0 && completedAfterPlanner < pTools.length) {
      const currentTool = pTools[completedAfterPlanner];
      const info = summarizeToolCall(currentTool, null);
      const stepProgress =
        pTools.length > 1 && !hasBracketPrefix(info.detail)
          ? `${completedAfterPlanner + 1}/${pTools.length}`
          : '';
      // 优先采用上一已完成步骤的真实完成时刻，若为 transcript.jsonl 无完成时间戳则回退至步骤创建时刻
      const startMs =
        getRawStepFinishMs(lastStep) ||
        getRawStepFinishMs(plannerStep) ||
        getRawStepEndMs(lastStep) ||
        getRawStepEndMs(plannerStep) ||
        0;
      const phase = info.isAskUser ? 'waiting' : 'tool';

      return {
        phase,
        label: info.label,
        detail: info.detail,
        stepProgress,
        startedAtMs: startMs,
        signature: `pending-tool:${plannerStepId}:${completedAfterPlanner}:${info.label}:${stepProgress}:${info.detail}`,
      };
    }

    // B2：上一轮发出的工具已全部执行完毕，按各自对应的工具完成步骤提取目标文件/命令
    if (pTools.length > 0 && completedAfterPlanner >= pTools.length) {
      const infos = pTools.map((t, idx) =>
        summarizeToolCall(t, toolStepsAfterPlanner[idx] || lastStep)
      );
      const lastToolInfo = infos[infos.length - 1];
      const allSameLabel = infos.every((x) => x.label === lastToolInfo.label);
      const detailsList = infos.map((x) => x.detail).filter(Boolean);
      const combinedDetail =
        infos.length > 1 && allSameLabel
          ? cleanSingleLineSnippet(detailsList.join(', '), 64)
          : lastToolInfo.detail || cleanSingleLineSnippet(detailsList.join(', '), 64);
      const stepProgress =
        pTools.length > 1 && !hasBracketPrefix(combinedDetail)
          ? `${pTools.length}/${pTools.length}`
          : '';
      const startMs = getRawStepFinishMs(lastStep) || getRawStepEndMs(lastStep) || 0;
      return {
        phase: 'thinking',
        label: lastToolInfo.label,
        detail: combinedDetail,
        stepProgress,
        startedAtMs: startMs,
        signature: `post-tool-think:${lastStepId}:${lastToolInfo.label}:${combinedDetail}`,
      };
    }

    // B2.5：Connect RPC 轨迹中工具作为独立步骤存在（plannerResponse.toolCalls 为空）时，直接提取最后一个工具步骤的目标文件/命令
    if (lastIdx > lastPlannerIdx) {
      const stepTypeUpper = String(lastStep?.type || '').toUpperCase();
      if (!stepTypeUpper.includes('USER_INPUT') && !stepTypeUpper.includes('GENERIC')) {
        const lastInfo = summarizeToolCall(null, lastStep);
        if (lastInfo.toolName !== 'tool' || lastInfo.detail) {
          const startMs = getRawStepFinishMs(lastStep) || getRawStepEndMs(lastStep) || 0;
          return {
            phase: 'thinking',
            label: lastInfo.label,
            detail: lastInfo.detail,
            stepProgress: '',
            startedAtMs: startMs,
            signature: `post-step-tool:${lastStepId}:${lastInfo.label}:${lastInfo.detail}`,
          };
        }
      }
    }

    // B3：末尾即为无工具调用的 PLANNER_RESPONSE（但会话仍处于 RUNNING），展示最新回复或思考摘要
    if (lastPlannerIdx === lastIdx) {
      const respText = getStepResponseText(plannerStep);
      const thinkText = getStepThinkingText(plannerStep);
      const startMs = getRawStepFinishMs(plannerStep) || getRawStepStartMs(plannerStep) || 0;
      if (respText.length > 0) {
        const snippet = cleanSingleLineSnippet(respText, 52, true);
        if (snippet) {
          return {
            phase: 'responding',
            label: '正在输出回复',
            detail: snippet,
            stepProgress: '',
            startedAtMs: startMs,
            signature: `responding-done:${lastStepId}:${snippet}`,
          };
        }
      }
      if (thinkText.length > 0) {
        const snippet = cleanSingleLineSnippet(thinkText, 52, true);
        if (snippet) {
          return {
            phase: 'thinking',
            label: '推理中',
            detail: snippet,
            stepProgress: '',
            startedAtMs: startMs,
            signature: `thinking-done:${lastStepId}:${snippet}`,
          };
        }
      }
    }
  }

  // B4：末尾是 USER_INPUT 或普通完成步骤
  const startMs = getRawStepFinishMs(lastStep) || getRawStepStartMs(lastStep) || 0;
  return {
    phase: 'thinking',
    label: '推理中',
    detail: '',
    stepProgress: '',
    startedAtMs: startMs,
    signature: `post-step-think:${lastStepId}`,
  };
}

