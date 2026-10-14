# Antigravity Usage & Speed Monitor (`usage-monitor`)

Antigravity 实时测速与额度监控侧边栏插件（UI Extension Sidecar）。无需安装第三方 `npm` 依赖，展示当前会话的请求整体吞吐（`tok/s`）、原生首 Token 延迟（TTFT）、上下文窗口占用，以及来自官方接口的 **5 小时限额** 与 **每周限额**。

当前版本：**[v1.1.0](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/tag/v1.1.0)** · [下载安装包](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip)

### v1.1.0 更新

- TPS 统一为「总输出 Token ÷ 完整请求耗时」，含等待与思考；移除阶段估算、约等号和测速模式切换。
- 首 Token 改为原生 TTFT，修正元数据错配，保留零值，缺失时显示未知。
- 修正短计时、未完成请求和不一致计时的处理；均速按有效 Token 与时长加权，避免缓冲时间造成假峰值。
- 升级旧测速缓存，保留用量与费用；明确缓存 0% 表示本次请求的原始命中率。
- 加入默认关闭的实时诊断采集，用于检查更新批次与缓冲；不影响 TPS 计算。

---

## ✨ 核心功能

- **⚡ 实时 `tok/s` 测速与会话均速**
  - 保留一个 TPS 列。正文、工具和混合输出统一采用总输出 Token（含思考）/ 完整请求耗时，包含等待与思考，不减首 Token 时间，不显示阶段估算或 `≈`。
  - 会话及模型均速均为有效样本的总输出 Token 合计 / 请求时长合计，显示有效步数；不平均单步 TPS，不混合不同时间口径。
- **⏱️ 首字耗时 (TTFT) & 缓存命中率**
  - 显示原始 `timeToFirstToken`（可能先返回思考内容，非必然为答案首字）；缺失显示 `—`，不再按思考 Token 比例推算。悬停可见会话平均 TTFT。同时显示 Prompt 缓存读取命中率（`cacheReadTokens` 占比）。
- **📊 上下文窗口四色分段监控（默认显示基准 `256k`）**
  - 5 格平行四边形紧凑指示器（`▰▱▱▱▱`）+ 可展开的四色分段进度条：**缓存读取（蓝）** / **新增输入（橙）** / **思考输出（绿）** / **正文输出（青）**，支持一键切换 `256k(压缩)` / `200k` / `1M` / `2M` 显示基准。
- **🔋 官方 5h 限额 & 每周限额同步（`{"forceRefresh": true}`）**
  - 通过本地 Language Server 的 `RetrieveUserQuotaSummary` 与 `GetUserStatus` 接口，展示 **`Gemini 模型池`** 与 **`Claude & GPT 模型池`** 各自的 5 小时限额、每周限额及重置倒计时。常规轮询使用 10 秒本地配额缓存，点击刷新会请求强制更新；显示结果仍取决于接口返回。
- **💰 本对话消耗 & 本机累计消耗（含后台自动压缩步 `CHECKPOINT` 账单）**
  - 扫描本地历史会话并聚合统计 **💬 本对话消耗** 与 **👤 本机累计消耗**（总 Token、按内置 API 价表估算的美元费用、输入/缓存/输出明细、Gemini 与 Claude/GPT 模型池分账），同时统计 `CORTEX_STEP_TYPE_CHECKPOINT` 后台自动压缩步骤写入 `metadata.retryInfos[0].usage` 的 Token 消耗。
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
             ├── speed-metrics.mjs
             ├── stream-diagnostics.mjs
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
| **顶部 TPS 与会话均速** | 统一显示含等待与思考的请求整体吞吐；有效步数标明均速覆盖范围，悬停可查看说明。 |
| **首 Token 与缓存百分比** | 悬停首 Token 可看原生 TTFT 说明及会话均值；缓存百分比反映本次请求的缓存读取占比。 |
| **点击 `上下文` 或 `上下文窗口 ›`** | 展开/收起四色 Token 构成细分（缓存读取、新增输入、思考输出、正文输出），并可切换 `256k(压缩)` / `200k` / `1M` / `2M` 窗口上限基准。 |
| **消耗额度统计 & 时间筛选栏** | 实时对比 **💬 本对话消耗** 与 **👤 本机累计消耗（本机全会话）**；点击右侧 `全部` / `近5h` / `今日` / `本周` / `30天` 可 **0 延迟瞬时切换**统计时间段，点击 `自定义` 可按任意精确到分钟的起止时间段过滤。 |
| **点击 `查看详细明细`** | 展开底部数据表，可切换查看 **「当前会话步骤测速」**（悬停可看请求耗时与费用估算拆解）和 **「按模型汇总 (跟随当前所选时间范围)」**。 |
| **点击 `参数设置`** | 设置官方周限额或自定义 Token / 美元预算，开启或停止测速诊断。 |

---

## 📊 数据来源与统计口径

1. **官方额度**：5h 与每周进度条使用 Language Server 返回的配额比例，并显示到 `0.1%`。插件的美元估算不用于反推官方剩余额度。
2. **本机 Token**：汇总本机可读取的步骤 `metadata.modelUsage` 与压缩步骤的 `metadata.retryInfos[0].usage`。这是本机记录的统计，不代表整个账号在其他设备上的用量。
3. **费用估算**：美元数值由 Token 用量乘以内置 `MODEL_PRICING` 价表得到，方便比较请求成本，不等同于订阅实际扣费。当前 Argon 配置为非缓存输入 `$2.00/1M`、缓存读取 `$0.10/1M`、输出（含思考）`$10.00/1M`；价表不会从云端自动更新。自定义每周美元预算默认 `$100`，可在设置中修改。
4. **缓存命中率**：`cacheReadTokens / (inputTokens + cacheReadTokens)`。某一步显示 0% 表示该步记录的缓存读取量为零；不能据此确定是缓存失效、上游计量变化或其他原因，也不能据此断言固定的缓存过期时间。
5. **上下文窗口**：`256k` 是面板默认显示基准，可手动切换。实际可用窗口和压缩行为取决于模型与宿主；后台压缩用量仍计入消耗。

---

## 🔄 如何获取后续更新

`main` 为默认版本。若通过 `git clone` 安装并使用 `main`，执行以下命令更新，然后在 **Customizations -> Installed** 页面将插件关闭再重新打开，或重启 Antigravity：

```powershell
# Windows PowerShell
git -C "$env:USERPROFILE\.gemini\config\plugins\usage-monitor" pull --ff-only
```

```bash
# macOS / Linux
git -C ~/.gemini/config/plugins/usage-monitor pull --ff-only
```

若通过 ZIP 安装，下载最新 `usage-monitor.zip` 并覆盖解压到同一插件目录，再关闭并重新开启插件。统计缓存与设置通常位于独立的 sidecar 数据目录，安装包不包含这些用户数据。

---

## 🛡️ 隐私与性能说明

- **0 额度消耗**：所有测速与配额查询均通过本地 Language Server 的状态与轨迹接口完成，**不调用大模型推理，不消耗任何 Token、5h 额度或积分**。
- **极低资源占用**：会话空闲时不触发重复轨迹解析或磁盘写入，CPU 占用接近 `0%`。
- **纯本地运行**：所有统计缓存仅保存在本机 `~/.gemini/antigravity/sidecar_data/usage-monitor/` 目录下，不向任何第三方服务器发送数据。


## 测速算法与有效样本

以下为 `v1.1.0` / `main` 默认算法。

- **TPS**：统一使用总输出 Token（含思考、正文及工具参数）/ 已完成请求的总时长。使用 `createdAt` 到 `finishedGeneratingAt`，缺失生成结束字段时以 `completedAt` 作为步骤完成边界；不另加相邻工具步骤的执行耗时或请求间空闲。不扣首 Token 或 thinkingDuration，不再估算阶段 TPS。
- **计时保护**：完整请求至少 0.5 秒，起止时间有效且步骤已完成；原生 TTFT 不应超过完整请求时长（允许 10 ms 打点误差）。输出计数必须是有效非负整数。纳秒时间戳先相减再转换，避免临界值舍入；无效样本显示原因，不修改分母或设置 TPS 上限。
- **均速**：有效步骤总输出 Token 合计 / 请求时长合计，所有输出类型同口径。少于 50 个输出 Token 的请求保留单步速率，但不计均速；覆盖步数会显示。自动压缩仍计费，不计速度或 TTFT 均值。
- **首 Token**：保留原生 TTFT，包括真实零值；缺失显示未知，不按 Token 比例推算。元数据按源步骤索引匹配，忽略非模型元数据，避免分页时错配。平均 TTFT 只包含已完成且计时一致的普通模型步骤。
- **缓存**：`v9-unified-throughput` / measurementVersion 4。旧缓存重新读取原始轨迹；失败时保留 Token 和费用，不沿用旧派生速率。表中缓存百分比是本次请求的缓存命中率，原始记录为零时保留 0%，不沿用上一请求的高命中率。
- **验证**：在 `sidecars/panel` 执行 `npm test`。测试使用本地合成数据，不触发模型生成。

发布前验证：40 项自动化测试通过；另以本地 5 个会话的 372 条历史记录回放复算，Token、费用与原生 TTFT 保持一致，369 条普通模型步骤均可展示 TPS。页面经过历史回放与窄屏检查。样本验证不代表能消除真实请求中的等待或上游缓冲。

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
