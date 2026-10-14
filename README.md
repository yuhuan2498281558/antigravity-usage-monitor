# Antigravity Usage & Speed Monitor (`usage-monitor`)

Antigravity 实时测速与官方额度监控侧边栏插件（UI Extension Sidecar）。无需安装任何第三方 `npm` 依赖，开箱即用，实时展示当前会话的 `tok/s` 生成速度、首字耗时（TTFT）、上下文窗口四色分段占用，以及与官方 `Models & Usage` 100% 同步的 **5 小时限额** 与 **每周限额**。

---

## ✨ 核心功能

- **⚡ 实时 `tok/s` 测速与会话均速**
  - 基于 Language Server `GetCascadeTrajectory` 纳秒级时间戳与 `plannerResponse.thinkingDuration` 思考耗时字段，精确剥离思考阶段，计算真实的**纯输出流速度 (`stream tok/s`)** 与 **含思考整体速度 (`total tok/s`)**。
  - 自动识别纯工具调用（Tool Call）步骤的缓冲机制，消除虚高脉冲尖峰。
- **⏱️ 首字耗时 (TTFT) & 缓存命中率**
  - 实时显示每一步从发起请求到收到首个流式分块的响应时间（`TTFT`），以及 Prompt 缓存读取命中率（`cacheReadTokens` 占比）。
- **📊 上下文窗口四色分段监控（默认对齐 `256k` 自动压缩阈值）**
  - 5 格平行四边形紧凑指示器（`▰▱▱▱▱`）+ 可展开的四色分段进度条：**缓存读取（蓝）** / **新增输入（橙）** / **思考输出（绿）** / **正文输出（青）**，默认以官方 `256k` 自动压缩水位线为基准，支持一键切换 `256k(压缩)` / `200k` / `1M` / `2M`。
- **🔋 官方 5h 限额 & 每周限额零延迟同步（`{"forceRefresh": true}`）**
  - 直连官方 `RetrieveUserQuotaSummary`（携带 `{"forceRefresh": true}` 绕过本地 Language Server 内部 3 分钟缓存）与 `GetUserStatus` 接口，实时展示 **`Gemini 模型池`** 与 **`Claude & GPT 模型池`** 各自独立的 5 小时限额与每周限额（精确到 `0.1%`，同时显示 `已用 X.X%` 与 `余 Y.Y%` 及重置倒计时）。
- **💰 本对话消耗 & 本机累计消耗（含后台自动压缩步 `CHECKPOINT` 账单）**
  - 自动扫描本地全量历史会话并聚合统计 **💬 本对话消耗** 与 **👤 本机累计消耗**（总 Token、精确官方 API 美元费用、输入/缓存/输出明细、Gemini 与 Claude/GPT 模型池分账），同时完整捕获 `CORTEX_STEP_TYPE_CHECKPOINT` 后台自动压缩步骤写入 `metadata.retryInfos[0].usage` 的隐藏 Token 消耗。
  - 支持 **`全部` / `近5h` / `今日` / `本周` / `30天` / `自定义起止时间`** 一键切换筛选，底部「按模型汇总」表也会同步按所选时间段过滤。
- **📋 步骤测速明细表 & 按模型汇总表**
  - 提供当前会话最近 15 步的单步测速明细（鼠标悬停可查看每步的思考 Token/耗时、正文输出流耗时及单步精确美元消耗）以及所选时间段内按模型分类的调用次数、均速、总 Token 与 API 费用统计。

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
| **点击 `0.0 tok/s` 速度数字** | 一键在 **「输出流测速」**（扣除思考耗时的纯解码速度）与 **「整体测速(含思考)」**（端到端整体吞吐速度）之间切换。 |
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
