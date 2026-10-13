# Usage & Speed Monitor (`usage-monitor`)

Antigravity 实时测速与额度监控面板插件（UI Extension Sidecar），提供紧凑测速状态栏与官方配额监控卡片：

- **实时 `tok/s` 与均速**：基于 `GetCascadeTrajectory` 纳秒级时间戳与 `plannerResponse.thinkingDuration` 精确计算纯输出流速度（扣除思考耗时）与含思考整体速度（点击 `tok/s` 可一键切换口径），自动过滤纯工具调用步骤的缓冲尖峰。
- **首字耗时 (TTFT)**：精确计算 `viewableAt - createdAt` 端到端首包响应时间。
- **缓存命中率 & 上下文进度格**：显示 `cacheReadTokens` 占比、5 格平行四边形进度指示（`▰▱▱▱▱`），以及四色分段上下文窗口进度条（缓存读取 / 新增输入 / 思考输出 / 正文输出，支持 `200k` / `1M` / `2M` 切换）。
- **5h 会话限额 & 官方每周限额**：直连 Language Server `RetrieveUserQuotaSummary` 与 `GetUserStatus` 接口，实时同步展示 `Gemini 模型池` 与 `Claude & GPT 模型池` 的 5 小时限额及官方每周限额（精确到小数点后一位，显示已用与剩余百分比及重置倒计时）。
- **今日与每周累计消耗**：跨会话统计本机今日与本周所有模型的累计 Token、调用步数与折算美元费用，并提供单步测速明细表（悬停查看思考/输出细分）与按模型汇总表。
