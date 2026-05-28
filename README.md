# Claude Code Dashboard

> Claude Code 本地资源一站式管理后台 — 可视化管理 Skills、Hooks、Plugins、MCP、Memories、Permissions 等所有 Harness 组件。

[English](#english) | [中文](#中文)

---

## 中文

### 这是什么？

Claude Code Dashboard 是一个运行在本地的 Web 管理界面，让你通过浏览器直观地查看和管理 Claude Code 的所有配置资源。

Claude Code 的强大不仅来自模型本身，更来自包裹在模型之外的 **Harness（运行时架构）**——技能、钩子、插件、MCP 服务器、权限规则、记忆等共同决定了 Agent 能做什么。这个 Dashboard 帮你一目了然地掌控这一切。

### 功能一览

| 页面 | 功能 |
|------|------|
| **总览 (Overview)** | 统计卡片、40 种内置工具速查、30 种 Hook 事件速查、5 种子代理速查、环境变量速查、斜杠命令速查、Token 用量统计、活动时间线 |
| **Harness 架构** | 按官方 6 层架构（输入/知识/执行/集成/多智能体/可观测）可视化展示当前配置，生成能力画像 |
| **技能 (Skills)** | 浏览、搜索、安装（GitHub / 本地）、编辑、删除技能 |
| **钩子 (Hooks)** | 管理生命周期钩子，支持 30 种事件类型 × 5 种处理器（command/http/mcp_tool/prompt/agent） |
| **钩子日志 (Hook Log)** | 实时 SSE 推送钩子触发日志，支持状态筛选和回放 |
| **插件 (Plugins)** | 查看已安装插件，启用/禁用/卸载 |
| **MCP 服务器** | 管理 MCP 连接（Stdio/HTTP/Streamable-HTTP/SSE），支持全局和项目级配置 |
| **记忆 (Memories)** | 查看/创建/编辑/删除跨会话记忆文件，支持导入 MD 文件（粘贴或拖拽上传） |
| **对话 (Conversations)** | 浏览会话记录，导出 Markdown，保存为记忆（支持项目选择、类型选择、frontmatter 自动生成） |
| **规则 (Rules)** | 查看多层级规则文件（全局/项目/本地 CLAUDE.md） |
| **配置 (Config)** | 编辑多层级 CLAUDE.md（全局/项目/本地），修改 settings.json |
| **权限 (Permissions)** | 管理 allow/deny 权限规则，含语法帮助 |
| **诊断 (Diagnostics)** | 环境检测（Claude Code 安装、Node 版本、配置文件完整性） |
| **子代理 (Agents)** | 管理自定义子代理定义文件（CRUD） |
| **计划 (Plans)** | 浏览活跃的实现计划文件 |
| **会话 (Sessions)** | 查看 Claude Code 活跃会话信息 |

### 技术栈

- **前端**：React 19 + Vite 6 + TailwindCSS v4
- **后端**：Node.js + Express（读取本地 `~/.claude/` 目录和 `~/.claude.json`）
- **设计风格**：Apple 风格轻量 UI（白底卡片、圆角、系统字体）

### 快速开始

**前置条件**：已安装 [Node.js](https://nodejs.org/) 18+ 和 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)。

```bash
# 1. 克隆仓库
git clone https://github.com/maltose21/claude-code-dashboard.git
cd claude-code-dashboard

# 2. 安装依赖
npm install

# 3. 一键启动（构建前端 + 启动服务器）
npm start
```

打开浏览器访问 **http://127.0.0.1:3456**

#### 开发模式

```bash
# 前后端同时启动（热重载）
npm run dev
```

- 前端：http://127.0.0.1:5173（Vite dev server，自动代理 API）
- 后端：http://127.0.0.1:3456（Express API）

### 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | `3456` | 服务器端口 |

Dashboard 读取的数据来源：

| 路径 | 内容 |
|------|------|
| `~/.claude/` | Skills、Memories、Plugins、Plans、CLAUDE.md |
| `~/.claude/settings.json` | Hooks、Permissions、Settings |
| `~/.claude.json` | MCP 服务器配置 |
| `~/.claude/projects/` | 项目级记忆和会话日志 |

### 安全说明

- Dashboard 仅在本地运行，**不会**向外部发送任何数据
- 所有操作直接读写本地 Claude Code 配置文件
- 后端 API 对所有文件路径参数做目录穿越防护
- 环境变量在展示时已脱敏
- settings.json 修改仅允许白名单字段
- 建议仅在个人开发机上使用

### 项目结构

```
claude-code-dashboard/
├── server/                  # Express 后端
│   ├── index.js             # 入口，API 路由 + 静态文件服务
│   ├── routes/              # 各资源的 REST API
│   │   ├── overview.js      # 统计 + 活动 + Harness + Token
│   │   ├── skills.js
│   │   ├── hooks.js
│   │   ├── hooklog.js       # SSE 钩子日志推送
│   │   ├── plugins.js
│   │   ├── mcp.js
│   │   ├── memories.js
│   │   ├── conversations.js
│   │   ├── config.js
│   │   ├── permissions.js
│   │   ├── rules.js
│   │   ├── diagnostics.js
│   │   ├── agents.js
│   │   ├── plans.js
│   │   └── sessions.js
│   └── utils/               # 工具函数
│       ├── parser.js        # JSONL / Frontmatter 解析
│       ├── settings.js      # settings.json 读写
│       ├── security.js      # 路径穿越防护
│       └── github.js        # GitHub URL 解析
├── src/                     # React 前端
│   ├── App.jsx              # 路由配置（17 个页面路由）
│   ├── main.jsx             # 入口
│   ├── index.css            # 全局样式（TailwindCSS v4）
│   └── components/          # 页面组件
│       ├── Layout.jsx       # 侧边栏布局容器
│       ├── Sidebar.jsx      # 导航侧边栏
│       ├── Overview.jsx     # 总览（含 Harness 架构）
│       ├── SkillPanel.jsx
│       ├── HookPanel.jsx
│       ├── HookLogPanel.jsx
│       ├── PluginPanel.jsx
│       ├── McpPanel.jsx
│       ├── MemoryPanel.jsx
│       ├── ConversationList.jsx
│       ├── ConversationDetail.jsx
│       ├── RulePanel.jsx
│       ├── ConfigPanel.jsx
│       ├── PermissionPanel.jsx
│       ├── DiagnosticsPanel.jsx
│       ├── AgentPanel.jsx
│       ├── PlanPanel.jsx
│       ├── SessionPanel.jsx
│       └── ui/              # 通用 UI 组件
│           ├── Modal.jsx
│           ├── ConfirmDialog.jsx
│           ├── CodeEditor.jsx
│           └── Toast.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## English

### What is this?

Claude Code Dashboard is a locally-hosted web UI for browsing and managing all your Claude Code configuration resources through a browser.

Claude Code's power comes not just from the model, but from the **Harness** — the runtime architecture wrapping it: skills, hooks, plugins, MCP servers, permissions, memories, and more. This dashboard lets you visualize and manage it all.

### Features

- **Overview** — Resource counts, 40 built-in tools reference, 30 hook events reference, 5 subagents reference, environment variables reference, slash commands reference, token usage stats, activity timeline
- **Harness Architecture** — Visualize your config across the official 6-layer harness model (Input → Knowledge → Execution → Integration → Multi-Agent → Observability), with auto-generated capability profile
- **Skills** — Browse, search, install (from GitHub or local), edit, delete
- **Hooks** — Manage lifecycle hooks across 30 event types and 5 handler types (command/http/mcp_tool/prompt/agent)
- **Hook Log** — Real-time SSE streaming of hook trigger logs with status filtering
- **Plugins** — View installed plugins, enable/disable/uninstall
- **MCP Servers** — Manage Model Context Protocol connections (Stdio/HTTP/Streamable-HTTP/SSE)
- **Memories** — Full CRUD for cross-session memory files, with MD file import (paste or drag-and-drop)
- **Conversations** — Browse session logs, export as Markdown, save to memory (with project selector, type selector, auto-generated frontmatter)
- **Rules** — View multi-level rule files (global/project/local CLAUDE.md)
- **Config** — Edit multi-level CLAUDE.md files, modify settings.json inline
- **Permissions** — Manage allow/deny permission rules with syntax help
- **Diagnostics** — Environment checks (Claude Code install, Node version, config file integrity)
- **Agents** — Manage custom subagent definition files (CRUD)
- **Plans** — Browse active implementation plan files
- **Sessions** — View Claude Code active session info

### Quick Start

**Prerequisites**: [Node.js](https://nodejs.org/) 18+ and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed.

```bash
git clone https://github.com/maltose21/claude-code-dashboard.git
cd claude-code-dashboard
npm install
npm start
```

Open **http://127.0.0.1:3456** in your browser.

#### Development

```bash
npm run dev    # Starts both Vite (port 5173) and Express (port 3456)
```

### How it works

The Express backend reads Claude Code's local config files (`~/.claude/`, `~/.claude.json`, `~/.claude/settings.json`) and exposes REST APIs. The React frontend provides a visual interface. All data stays on your machine — nothing is sent externally.

### License

MIT
