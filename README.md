# Antigravity Usage & Speed Monitor

Antigravity 侧边栏插件，用于查看当前会话的生成速度、上下文占用、官方配额余量以及本地历史 Token 消耗。

下载最新版本：[Releases](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases) · [usage-monitor.zip](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip)

## 功能概览

面板分为四个标签页，顶部可切换要查看的会话或手动刷新配额：

- **实时监控**
  - 核心指标：实时吞吐、首 Token 耗时、当前会话均速、单步与会话累计折算费用。
  - 上下文窗口构成：展示当前上下文占用，并拆分为消息、系统工具、MCP 工具、Skill、系统提示词、`user_rule` 六类来源。
  - 官方配额：同步展示 `Gemini` 与 `Claude & GPT` 两个模型池的 5 小时限额、每周限额及重置倒计时。
- **消耗统计**
  - 支持按今天、1天、7天、14天、30天、全部或自定义时间段过滤。
  - 汇总所选时段的总 Token、API 折算费用、缓存命中率与缓存节省金额。
  - 包含时段趋势曲线、各模型用量占比、客户端来源分布以及月度用量柱状图。
- **步骤明细**
  - 单步测速：列出当前会话全部步骤的模型、吞吐速度、首 Token 耗时、上下文/输出 Token、缓存命中率与单步费用。
  - 按模型汇总：按当前所选时间范围统计各模型的调用次数、均速、总 Token 与折算费用。
- **系统设置**
  - 选择每周限额进度条的计算基准：使用官方云端周限额，或按自定义每周 Token / 美元预算计算百分比。

## 模型识别与费用口径

模型取自当前步骤的原始用量或对应生成记录。自动压缩可能使用独立模型；记录未提供模型时显示“模型未知·压缩”，不会默认标为 Argon，也不会直接沿用相邻步骤的模型。

模型或价格未能确认时，单步费用显示“待定”，Token 仍计入统计。汇总费用显示“已知金额 + 待定”，消耗页注明未定价步数。模型明确且价格表已收录的步骤继续按本地 API 单价折算；这不代表订阅额度的美元换算关系。

升级时会重新读取旧缓存的原始记录。旧版默认填入的 Argon 标签无法与真实 Argon 区分；原始记录暂时无法读取时，该标签会暂记为未知，Token 和已有有效计时保留。压缩步骤可显示完整请求 TPS，但不进入会话均速。

## 安装

插件目录名需保持为 `usage-monitor`，无需运行 `npm install`。

### 方式一：通过 Git 克隆

**Windows**
```powershell
git clone https://github.com/yuhuan2498281558/antigravity-usage-monitor.git "$env:USERPROFILE\.gemini\config\plugins\usage-monitor"
```

**macOS / Linux**
```bash
git clone https://github.com/yuhuan2498281558/antigravity-usage-monitor.git ~/.gemini/config/plugins/usage-monitor
```

也可以直接在 Antigravity 对话框中让 AI 执行安装：
```text
把 https://github.com/yuhuan2498281558/antigravity-usage-monitor 克隆到 ~/.gemini/config/plugins/usage-monitor 并启用插件
```

### 方式二：下载压缩包解压

下载 [usage-monitor.zip](https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip)，解压到 `~/.gemini/config/plugins/` 目录下。

Windows PowerShell 命令：
```powershell
$pluginsDir = "$env:USERPROFILE\.gemini\config\plugins"
New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
Invoke-WebRequest -Uri "https://github.com/yuhuan2498281558/antigravity-usage-monitor/releases/latest/download/usage-monitor.zip" -OutFile "$env:TEMP\usage-monitor.zip"
Expand-Archive -Path "$env:TEMP\usage-monitor.zip" -DestinationPath $pluginsDir -Force
```

## 启用与打开面板

1. 打开左侧边栏的 **Customizations**，进入 **Installed** 标签页，找到 `usage-monitor` 并开启。
2. 点击对话窗口右上角 `⋮` -> **Extensions** -> **测速与额度监控**，在右侧辅助栏展开面板；或在对话中输入「打开测速与额度监控面板」通过快捷入口唤起。

## 更新

通过 Git 安装时，拉取最新代码后在 **Customizations -> Installed** 中重新开关一次插件即可：

```powershell
# Windows PowerShell
git -C "$env:USERPROFILE\.gemini\config\plugins\usage-monitor" pull --ff-only
```

```bash
# macOS / Linux
git -C ~/.gemini/config/plugins/usage-monitor pull --ff-only
```

通过压缩包安装时，下载新版 `usage-monitor.zip` 覆盖解压到原目录后重新开关插件即可。本地缓存与设置存放在 `~/.gemini/antigravity/sidecar_data/usage-monitor/`，更新插件不会清除历史数据。

## 本地构建

如果修改了 `sidecars/panel/src/` 下的前端源码，可在 `sidecars/panel` 目录下运行以下命令重新生成 `app.js` 与 `styles.css`：

```bash
npm run build
```

运行模型识别、缓存迁移与计时回归测试（无需额外安装依赖）：

```bash
npm test
```
