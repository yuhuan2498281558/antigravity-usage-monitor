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
  const fraction = value.match(/\.(\d+)Z$/);
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
 * 从 `chatModel` 元数据中提取并拆解 6 大上下文 Token 构成分类：
 * - `messagesTokens`：对话历史消息
 * - `systemToolsTokens`：内置系统工具定义
 * - `mcpToolsTokens`：MCP 外部服务器工具与资源定义
 * - `skillsTokens`：已注入的 Skills 指令说明
 * - `systemPromptTokens`：核心系统提示词
 * - `userRulesTokens`：用户自定义全局/工作区规则
 *
 * 提取算法分为两个阶段：
 * 1. **第一阶段（优先采用原生 `contextWindowMetadata.tokenBreakdown.groups`）**：
 *    遍历服务端提供的精确 Token 分组树：
 *    - 针对 `TOKEN_TYPE_SYSTEM_PROMPT` 分组：遍历其 `children`，通过 `classifyPromptSection` 精细拆分为
 *      `skills`、`userRules`、`mcpTools` 与 `systemPrompt`；若父组 `gTokens` 大于子项之和，差额归入 `systemPromptTokens`。
 *    - 针对 `TOKEN_TYPE_TOOLS` 或含 `MCP` 标识的分组：遍历其 `children`，通过 `isMcpToolItem` 区分内置系统工具（`systemToolsTokens`）
 *      与 MCP 工具（`mcpToolsTokens`）；未拆分子项的余量同样按 `isMcpToolItem` 归属。
 *    - 针对 `TOKEN_TYPE_CHAT_MESSAGES` 分组：优先累加分组总 `gTokens`，若为 0 则累加其 `children` 的 Token 数至 `messagesTokens`。
 * 2. **第二阶段（缺失分组时的结构化字段回退估算）**：
 *    当第一阶段未覆盖某类分组（`!hasPromptGroup` / `!hasToolsGroup` / `!hasMessagesGroup`）时，
 *    分别回退遍历 `chat.promptSections`、`chat.tools`、`chat.messagePrompts`：
 *    优先读取条目自带的 `numTokens`，若缺失则按 UTF-8 字节长度除以 3（`byteLength / 3` 向上取整）进行估算。
 *
 * @param {object} chat `generatorMetadata.chatModel` 对象
 * @returns {{
 *   messagesTokens: number,
 *   systemToolsTokens: number,
 *   mcpToolsTokens: number,
 *   skillsTokens: number,
 *   systemPromptTokens: number,
 *   userRulesTokens: number,
 *   totalTokens: number
 * } | null} 上下文 Token 构成明细，无任何可用元数据时返回 null
 */
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
    phaseDurationSec: null,
    phaseTokPerSec: null,
    phaseReason: 'legacy_cache',
    answerStartDelaySec: null,
    streamDurationSec: null,
    streamTokens: null,
    streamTokPerSec: null,
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
