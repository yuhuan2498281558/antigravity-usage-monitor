# Antigravity Usage & Speed Monitor (`usage-monitor`)

Antigravity 实时测速与官方额度监控侧边栏插件（UI Extension Sidecar）。无需安装任何第三方 `npm` 依赖，开箱即用，实时展示当前会话的 `tok/s` 生成速度、首字耗时（TTFT）、上下文窗口四色分段占用，以及与官方 `Models & Usage` 100% 同步的 **5 小时限额** 与 **每周限额**。

---

## ✨ 核心功能

- **⚡ 实时 `tok/s` 测速与会话均速**
  - 保留一个 TPS 列。正文、工具和混合输出统一采用总输出 Token（含思考）/ 完整请求耗时，包含等待与思考，不减首 Token 时间，不显示阶段估算或 `≈`。
  - 会话及模型均速均为有效样本的总输出 Token 合计 / 请求时长合计，显示有效步数；不平均单步 TPS，不混合不同时间口径。
- **⏱️ 首字耗时 (TTFT) & 缓存命中率**
  - 显示原始 `timeToFirstToken`（可能先返回思考内容，非必然为答案首字）；缺失显示 `—`，不再按思考 Token 比例推算。悬停可见会话平均 TTFT。同时显示 Prompt 缓存读取命中率（`cacheReadTokens` 占比）。
- **📊 上下文窗口四色分段监控（默认对齐 `256k` 自动压缩阈值）**
  - 5 格平行四边形紧凑指示器（`▰▱▱▱▱`）+ 可展开的四色分段进度条：**缓存读取（蓝）** / **新增输入（橙）** / **思考输出（绿）** / **正文输出（青）**，默认以官方 `256k` 自动压缩水位线为基准，支持一键切换 `256k(压缩)` / `200k` / `1M` / `2M`。
- **🔋 官方 5h 限额 & 每周限额零延迟同步（`{"forceRefresh": true}`）**
  - 直连官方 `RetrieveUserQuotaSummary`（携带 `{"forceRefresh": true}` 绕过本地 Language Server 内部 3 分钟缓存）与 `GetUserStatus` 接口，实时展示 **`Gemini 模型池`** 与 **`Claude & GPT 模型池`** 各自独立的 5 小时限额与每周限额（精确到 `0.1%`，同时显示 `已用 X.X%` 与 `余 Y.Y%` 及重置倒计时）。
- **💰 本对话消耗 & 本机累计消耗（含后台自动压缩步 `CHECKPOINT` 账单）**
  - 自动扫描本地全量历史会话并聚合统计 **💬 本对话消耗** 与 **👤 本机累计消耗**（总 Token、精确官方 API 美元费用、输入/缓存/输出明细、Gemini 与 Claude/GPT 模型池分账），同时完整捕获 `CORTEX_STEP_TYPE_CHECKPOINT` 后台自动压缩步骤写入 `metadata.retryInfos[0].usage` 的隐藏 Token 消耗。
  - 支持 **`全部` / `近5h` / `今日` / `本周` / `30天` / `自定义起止时间`** 一键切换筛选，底部「按模型汇总」表也会同步按所选时间段过滤。
- **📋 全量步骤测速与计费明细表 & 按模型汇总表**
  - 提供当前会话**全量历史步骤**（无 15 步截断限制，支持吸顶表头平滑滚动）的单步测速与**按 API 价表估算的单步美元费用 (`$0.XXX`)** 明细（悬停可查看输入/缓存/输出费用拆解及请求耗时），以及所选时间段内按模型分类的调用次数、均速、总 Token 与 API 费用统计。

---

## 🚀 安装教程（3 种方式任选其一）

> **注意**：安装目录名称请保持为 `usage-monitor`，无需执行 `npm install`（Antigravity 内置运行时已自带所需 SDK）。

### 方式一：让 Antigravity AI 助手自动安装（推荐，零命令行）

直接在 Antigravity 聊天框中发送以下指令，AI 会自动完成克隆与启用：

```text
帮我把 https://github.com/yuhuan2498281558/antigravity-usage-monitor 克隆安装到全局插件目录 ~/.gemini/config/plugins/usage-monitor 并启用该插件
```

### 方式二：命令行一键安装

- **Windows (PowerShell)**：
  ```powershell
  git clone https://github.com/yuhuan2498281558/antigravity-usage-monitor.git "$env:USERPROFILE\.gemini\config\plugins\usage-monitor"
  ```

- **macOS / Linux (Terminal)**：
  ```bash
  git clone https://github.com/yuhuan2498281558/antigravity-usage-monitor.git ~/.gemini/config/plugins/usage-monitor
  ```

### 方式三：直接下载 Release 安装包 (`usage-monitor.zip`)

1. 直接点击下载打包好的安装包：**[📦 下载 usage-monitor.zip (Latest Release)](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip)**（也可在仓库右侧 **[Releases](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases)** 页面下载）。
2. 将压缩包解压到全局插件目录 `~/.gemini/config/plugins/` 下（压缩包内已自带 `usage-monitor/` 顶层文件夹）：
   - **Windows PowerShell 一键下载并解压**：
     ```powershell
     $pluginsDir = "$env:USERPROFILE\.gemini\config\plugins"
     New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
     Invoke-WebRequest -Uri "https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip" -OutFile "$env:TEMP\usage-monitor.zip"
     Expand-Archive -Path "$env:TEMP\usage-monitor.zip" -DestinationPath $pluginsDir -Force
     ```
   - 解压后的目录结构如下：
     ```text
     ~/.gemini/config/plugins/usage-monitor/
     ├── plugin.json
     ├── README.md
     ├── assets/
     │   └── logo.svg
     └── sidecars/
         └── panel/
             ├── sidecar.json
             ├── package.json
             ├── main.mjs
             ├── index.html
             ├── app.js
             └── styles.css
     ```

---

## 📖 启用与打开面板流程

### 第一步：在 Antigravity 中启用插件
1. 点击 Antigravity 界面左侧边栏的 **Customizations（自定义 / 插件图标）**。
2. 切换到顶部的 **Installed（已安装）** 标签页。
3. 找到 **`usage-monitor`（测速与额度监控）**，将右侧开关切换为 **开启（Enabled）**。启用后后台 Sidecar 服务会自动启动。

### 第二步：在右侧边栏打开监控面板（2 种方式）
- **方法 A（通过右上角扩展菜单打开）**：
  在任意对话界面右上角点击 **`⋮`（三点菜单）** $\rightarrow$ 选择 **Extensions（扩展）** $\rightarrow$ 点击 **「测速与额度监控」**，面板即会在右侧辅助栏（Side Pane）展开。
- **方法 B（通过对话胶囊按钮一键唤起）**：
  在对话框中对 AI 说：
  > `打开测速与额度监控面板`
  
  AI 会在回复中生成一个可点击的 **`[测速与额度监控]`** 快捷入口，点击即可直接展开或收起右侧面板。

---

## 💡 面板交互技巧

| 操作位置 | 功能说明 |
| :--- | :--- |
| **顶部会话下拉框** | 默认选中 `⚡ 自动跟随`，自动监控当前最新活跃的对话；也可手动切换到任意历史会话（自动扫描 `~/.gemini/antigravity/conversations/` 全量历史记录）查看当时的测速与消耗。 |
| **顶部 `↻` 按钮** | 点击带旋转动画与 `同步中…` $\rightarrow$ `✓ 已刷新` 状态反馈，向 Language Server 发送 `{"forceRefresh": true}` 绕过内部配额缓存，实时拉取云端最新配额与轨迹数据。 |
| **点击 `0.0 tok/s` 速度数字** | 一键在 **「正文估算」**（仅有效纯文本样本）与 **「整体吞吐」**（含等待与思考的请求吞吐）之间切换。 |
| **点击 `上下文` 或 `上下文窗口 ›`** | 展开/收起四色 Token 构成细分（缓存读取、新增输入、思考输出、正文输出），并可切换 `256k(压缩)` / `200k` / `1M` / `2M` 窗口上限基准。 |
| **消耗额度统计 & 时间筛选栏** | 实时对比 **💬 本对话消耗** 与 **👤 本机累计消耗（本机全会话）**；点击右侧 `全部` / `近5h` / `今日` / `本周` / `30天` 可 **0 延迟瞬时切换**统计时间段，点击 `自定义` 可按任意精确到分钟的起止时间段过滤。 |
| **点击 `查看详细明细`** | 展开底部数据表，可切换查看 **「当前会话步骤测速」**（悬停某步可看思考、输出耗时与单步精确美元费用）和 **「按模型汇总 (跟随当前所选时间范围)」**。 |
| **点击 `参数设置`** | 自定义测速口径，或将周进度条在「官方云端周限额」、「自定义每周 Token 预算」、「自定义每周美元预算」之间切换。 |

---

## 📊 数据精度与官方额度精确对账说明

1. **官方 `5h 限额` 与 `每周限额` 进度条（100% 官方云端实时原值）**
   - 直接调用 Language Server 的 `RetrieveUserQuotaSummary` 接口并传入 `{"forceRefresh": true}`，与官方 `Models & Usage` 面板完全同源且无本地缓存滞后，精确到小数点后一位（`0.1%`）。
   - `Gemini 模型池` 与 `Claude & GPT 模型池` 在云端拥有各自独立的 5h 限额与每周限额，切换对话模型时面板会自动展示对应模型池的 5h 与周限额。
2. **本对话消耗 & 本机累计消耗 Token 统计（精确到 1 Token）**
   - 直接汇总本机所有会话步骤底层写入的 `metadata.modelUsage` 账单字段（`inputTokens`、`cacheReadTokens`、`thinkingOutputTokens`、`responseOutputTokens`）以及后台自动压缩步骤（`CORTEX_STEP_TYPE_CHECKPOINT`）写入 `metadata.retryInfos[0].usage` 的账单字段。
   - 仅统计**当前这台电脑（本机）**产生的真实调用，不会混入共享账号其他成员在其他设备上的消耗。
3. **官方 API 定价与额度池容量（小数点后 6 位零误差验证）**
   - **`Gemini 4 Argon` 官方 API 定价**（现行标准，截至 2026-11-30）：
     - **非缓存输入 (`inputTokens`)**：**`$2.00 / 1M Tokens`**
     - **缓存输入 (`cacheReadTokens`)**：**`$0.10 / 1M Tokens`**（仅为非缓存输入的 **1/20**）
     - **输出，含思考 Token (`outputTokens`)**：**`$10.00 / 1M Tokens`**
   - **官方额度池精确容量（Google AI Ultra 实测对账至小数点后 6 位）**：
     - **单次 `5h 限额池 (100%)` = 精确 `$25.00 USD`**（每消耗 `$0.25` 扣减 `1.0%` 的 5h 限额）
     - **单次 `每周限额池 (100%)` = 精确 `$100.00 USD`**（每消耗 `$1.00` 扣减 `1.0%` 的每周限额）
     - **周限额池严格等于 $4 \times$ 单次 5h 限额池**：
       $$\Delta\text{Weekly Fraction} = \frac{\text{Cost}_{\text{USD}}}{\$100.00}, \qquad \Delta\text{5h Fraction} = \frac{\text{Cost}_{\text{USD}}}{\$25.00} = 4 \times \Delta\text{Weekly Fraction}$$
   - **重要机制提示**：
     - **5 分钟 Prompt 缓存过期机制**：当对话停顿超过 **5 分钟**时，云端 KV Cache 会过期，下一步的整段历史上下文（如 `150k~250k`）会从 `$0.10/1M` 的缓存读取退化为 `$2.00/1M` 的非缓存重新写入（单步成本相差 **20 倍**，约 `$0.35~$0.50` / 步，单步即可扣掉 `1.5%~2.0%` 的 5h 限额）。
     - **`256k` 自动压缩机制**：上下文超过 `256,000` Token 时会在后台异步触发 `CORTEX_STEP_TYPE_CHECKPOINT` 生成浓缩摘要；若连续快问快答或后台工具密集调用，上下文可能会短暂冲高至 `260k~280k`，待后台压缩步完成后回落。

---

## 🔄 如何获取后续更新

若通过 `git clone` 安装，后续只需在插件目录下执行 `git pull`，然后在 **Customizations -> Installed** 页面将插件关闭再重新打开即可生效：

```powershell
# Windows PowerShell
git -C "$env:USERPROFILE\.gemini\config\plugins\usage-monitor" pull
```

```bash
# macOS / Linux
git -C ~/.gemini/config/plugins/usage-monitor pull
```

---

## 🛡️ 隐私与性能说明

- **0 额度消耗**：所有测速与配额查询均通过本地 Language Server 的状态与轨迹接口完成，**不调用大模型推理，不消耗任何 Token、5h 额度或积分**。
- **极低资源占用**：会话空闲时不触发重复轨迹解析或磁盘写入，CPU 占用接近 `0%`。
- **纯本地运行**：所有统计缓存仅保存在本机 `~/.gemini/antigravity/sidecar_data/usage-monitor/` 目录下，不向任何第三方服务器发送数据。


## 测速试用分支说明

本地试用分支：`codex/tps-metrics-trial`。

- **TPS**：统一使用总输出 Token（含思考、正文及工具参数）/ 已完成请求的总时长。使用 `createdAt` 到 `finishedGeneratingAt`，缺失生成结束字段时以 `completedAt` 作为步骤完成边界；不另加相邻工具步骤的执行耗时或请求间空闲。不扣首 Token 或 thinkingDuration，不再估算阶段 TPS。
- **计时保护**：完整请求至少 0.5 秒，起止时间有效且步骤已完成；原生 TTFT 不应超过完整请求时长（允许 10 ms 打点误差）。输出计数必须是有效非负整数。纳秒时间戳先相减再转换，避免临界值舍入；无效样本显示原因，不修改分母或设置 TPS 上限。
- **均速**：有效步骤总输出 Token 合计 / 请求时长合计，所有输出类型同口径。少于 50 个输出 Token 的请求保留单步速率，但不计均速；覆盖步数会显示。自动压缩仍计费，不计速度或 TTFT 均值。
- **首 Token**：保留原生 TTFT，包括真实零值；缺失显示未知，不按 Token 比例推算。元数据按源步骤索引匹配，忽略非模型元数据，避免分页时错配。平均 TTFT 只包含已完成且计时一致的普通模型步骤。
- **缓存**：`v9-unified-throughput` / measurementVersion 4。旧缓存重新读取原始轨迹；失败时保留 Token 和费用，不沿用旧派生速率。表中缓存百分比是本次请求的缓存命中率，原始记录为零时保留 0%，不沿用上一请求的高命中率。
- **验证**：在 `sidecars/panel` 执行 `npm test`。测试使用本地合成数据，不触发模型生成。
- **退回原版**：保存本地改动后执行 `git switch main`，关闭再开启插件；主分支没有诊断采集器。

### 实时诊断采集（试用）

在面板的「参数设置 → 测速诊断（试用）」中开启或停止。默认关闭；开启后后台自动跟随最近更新的会话，面板关闭后也可继续采集。仅查询本地会话摘要并订阅 `StreamAgentStateUpdates`，不会发送对话或执行工具。

诊断使用完整状态流，因为当前版本的普通界面模式会省略工具参数。它记录单调时钟下的接收时间、接收批次、正文／思考／工具参数的字节与 UTF-16 长度变化，以及匹配到的原生 Token 用量和计时。字节数、字符数、更新次数都不是 Token 数；这些观测暂不参与 TPS 或 TTFT 计算。

- 初次连接的历史快照不会计作实时输出；中途接入的步骤标记为部分采集。
- 重复快照不重复计数；同一网络读取中的多个消息保留同一接收时间和批次，避免伪造时间间隔。
- 内容重写、缩短、断线重新连接分别保留诊断依据；多个更新也不能证明上游没有缓冲。
- 新建会话最多约 2 秒才会被发现，可能错过第一步；部分采集的步骤不能用来判断完整生成速度。
- 日志不保存正文、思考内容、工具名称／参数内容、提示词、响应头或凭据。只写入标识、计数和时间字段。
- 配置独立保存为后台数据目录下的 `stream-diagnostics-config.json`；日志位于 `stream-diagnostics/events.jsonl`，每份约 5 MiB，保留当前和上一份。用户统计缓存与周限额设置不受影响。
- 连接失败退避重试；「采集中」只证明实时接口已连接，仍需新对话样本确认工具参数是逐段到达还是一次返回。
