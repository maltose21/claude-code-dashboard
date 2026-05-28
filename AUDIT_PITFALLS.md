# Dashboard 真实性审计 — 易错点清单

> 本文件记录所有在历次审计中发现的分歧点，每个点标注核实状态和官方来源。
> 唯一可信来源：https://code.claude.com/docs

## 第一轮审计修正（2026-05-28 数量级审计）

### 1. 「官方6层架构」
- **Dashboard 声称**：Harness 按官方 6 层架构（输入/知识/执行/集成/多智能体/可观测）可视化
- **官方事实**：官方使用「agentic harness」术语，但没有"6层"分类。6维度是 Dashboard 自己的归纳
- **官方来源**：https://code.claude.com/docs/en/how-claude-code-works
- **处理**：✅ 已修正 README，移除「官方」字样

### 2. 斜杠命令数量
- **Dashboard 声称**：89 个
- **官方事实**：官方 commands 页面 92 个表格行，其中 2 个已移除（/pr-comments, /vim），2 个为别名独立行（/cost, /stats）
- **官方来源**：https://code.claude.com/docs/en/commands
- **计数口径**：89 = 合并别名后的独立命令数（含 bundled skill），已在 UI 标注口径
- **处理**：✅ UI 已标注「别名合并计数，含 bundled skill」

### 3. 记忆 frontmatter 格式和 4 种类型
- **Dashboard 使用**：name/description/metadata.type 字段，user/feedback/project/reference 四种类型
- **官方事实**：公开文档只描述记忆为 plain markdown，没有提及 frontmatter 规范
- **实际情况**：这是 Claude Code 运行时行为（系统提示词定义），不是公开文档描述的
- **官方来源**：https://code.claude.com/docs/en/memory
- **处理**：✅ Dashboard 没有声称是官方规范，描述为「建议包含」

### 4. 环境变量 ANTHROPIC_MODEL 描述不准确
- **Dashboard 原始描述**：「覆盖默认模型（单次会话）」
- **官方事实**：Name of the model setting to use
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ 已修正为「设置使用的模型名称」

### 5. 环境变量 CLAUDE_CODE_MAX_TURNS 默认值不准确
- **Dashboard 声称**：默认值为 Infinity
- **官方事实**：官方文档未给出数字默认值，无 cap
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ 已修正默认值为「无上限」

### 6. 环境变量总数展示误导
- **Dashboard 声称**：UI 展示「23 个」环境变量，暗示完整列表
- **官方事实**：官方文档列出 200+ 个环境变量
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ UI 已改为「常用 23 个」，描述加注「完整列表含 200+ 个变量」并链接官方文档

---

## 第二轮审计修正（2026-05-28 逐字段描述审计）

### 7. PowerShell 工具描述不完整
- **Dashboard 原始描述**：「执行 PowerShell 命令（Windows）」
- **官方事实**：PowerShell 在 Windows 默认启用，Linux/macOS/WSL 上可选启用（需 PowerShell 7+）
- **官方来源**：https://code.claude.com/docs/en/tools#powershell-tool
- **处理**：✅ 修正为「执行 PowerShell 命令（Windows 默认，其他平台可选）」

### 8. TaskCreate 工具描述错误
- **Dashboard 原始描述**：「创建后台任务」
- **官方事实**：Creates a new task in the task list（任务列表管理，非后台任务）
- **官方来源**：https://code.claude.com/docs/en/tools — TaskCreate 行
- **处理**：✅ 修正为「创建任务（任务列表管理）」

### 9. ScheduleWakeup 工具描述错误
- **Dashboard 原始描述**：「安排一次性唤醒」
- **官方事实**：Reschedules the next iteration of a self-paced /loop（专为 /loop 自节奏模式设计，不是通用一次性唤醒）
- **官方来源**：https://code.claude.com/docs/en/tools — ScheduleWakeup 行
- **处理**：✅ 修正为「为自节奏 /loop 安排下次唤醒」

### 10. Explore/Plan 子代理工具列表描述不准确
- **Dashboard 原始描述**：「除 Agent/Edit/Write/NotebookEdit 外全部」
- **官方事实**：Read-only tools (denied access to Write and Edit tools)。官方用"只读工具"概括，未逐一列出排除项
- **官方来源**：https://code.claude.com/docs/en/sub-agents — Built-in subagents → Explore/Plan tabs
- **处理**：✅ 修正为「只读工具（无 Write/Edit）」，匹配官方措辞

### 11. ANTHROPIC_BASE_URL 默认值不准确
- **Dashboard 原始默认值**：「api.anthropic.com」
- **官方事实**：官方文档未列出默认值
- **官方来源**：https://code.claude.com/docs/en/env-vars — ANTHROPIC_BASE_URL 行
- **处理**：✅ 修正默认值为「—」

### 12. CLAUDE_CODE_MAX_TURNS 描述不准确
- **Dashboard 原始描述**：「非交互模式最大轮数」
- **官方事实**：Cap the number of agentic turns when no explicit limit is passed（不限于非交互模式）
- **官方来源**：https://code.claude.com/docs/en/env-vars — CLAUDE_CODE_MAX_TURNS 行
- **处理**：✅ 修正为「限制最大 agentic 轮数」

### 13. 多个环境变量默认值错误
- **涉及变量**：CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY、CLAUDE_CODE_DISABLE_THINKING、CLAUDE_CODE_DISABLE_AUTO_MEMORY、CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS、CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC、CLAUDE_CODE_FORK_SUBAGENT、CLAUDE_CODE_ENABLE_TELEMETRY、DISABLE_AUTOUPDATER
- **Dashboard 原始默认值**：「0」
- **官方事实**：官方文档标注为 "Not set"（未设置）。对于布尔型环境变量，"未设置"和"设为 0"语义不同——例如 CLAUDE_CODE_DISABLE_AUTO_MEMORY 设为 0 会**强制开启**自动记忆
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ 统一修正默认值为「未设置」

### 14. ANTHROPIC_API_KEY 描述不准确
- **Dashboard 原始描述**：「API 密钥（直连模式）」
- **官方事实**：API key sent as X-Api-Key header. When set, this key is used instead of your Claude Pro, Max, Team, or Enterprise subscription
- **官方来源**：https://code.claude.com/docs/en/env-vars — ANTHROPIC_API_KEY 行
- **处理**：✅ 修正为「API 密钥（设置后优先于订阅认证）」

### 15. ANTHROPIC_AUTH_TOKEN 描述不准确
- **Dashboard 原始描述**：「自定义 Authorization 头（第三方网关）」
- **官方事实**：Custom value for the Authorization header (the value you set here will be prefixed with Bearer). 无"第三方网关"限定
- **官方来源**：https://code.claude.com/docs/en/env-vars — ANTHROPIC_AUTH_TOKEN 行
- **处理**：✅ 修正为「自定义 Authorization 头（自动加 Bearer 前缀）」

### 16. CLAUDE_CODE_DISABLE_AUTO_MEMORY 描述不完整
- **Dashboard 原始描述**：「禁用自动记忆」
- **官方事实**：Set to 1 to disable auto memory. Set to 0 to force auto memory on even when --bare mode or autoMemoryEnabled: false would otherwise disable it
- **官方来源**：https://code.claude.com/docs/en/env-vars — CLAUDE_CODE_DISABLE_AUTO_MEMORY 行
- **处理**：✅ 修正为「设为 1 禁用自动记忆，设为 0 强制开启」

### 17. /fast 描述不准确
- **Dashboard 原始描述**：「切换 Opus 快速输出模式」
- **官方事实**：Toggle fast mode on or off（未限定为 Opus）
- **官方来源**：https://code.claude.com/docs/en/commands — /fast 行
- **处理**：✅ 修正为「切换 fast mode（快速输出模式）」

### 18. /review、/security-review、/ultraplan、/ultrareview 错误标记为 Bundled Skill
- **Dashboard 原始标记**：skill: true，放在「技能（Bundled Skills）」分组
- **官方事实**：官方 commands 页面中这 4 个命令**未标记** [Skill]，是内置命令而非 bundled skill
- **官方来源**：https://code.claude.com/docs/en/commands — 对应行均无 [Skill] 标记
- **处理**：✅ 移除 skill 标记，移至「工具与诊断」分组

---

## 第三轮审计修正（2026-05-28 功能描述准确性审计）

### 19. EnterPlanMode 描述不准确
- **Dashboard 原始描述**：「进入规划模式（只读探索代码库）」
- **官方事实**：Switches to plan mode to design an approach before coding
- **问题**：官方重点是「设计方案后再编码」，不是「只读探索」。规划模式的核心功能是设计实现方案
- **官方来源**：https://code.claude.com/docs/en/tools — EnterPlanMode 行
- **处理**：✅ 修正为「进入规划模式（设计方案后再编码）」

### 20. Monitor 描述不完整
- **Dashboard 原始描述**：「后台运行脚本并监控输出」
- **官方事实**：Runs a command in the background and feeds each output line back to Claude, so it can react to log entries, file changes, or polled status mid-conversation
- **问题**：缺少关键语义——输出回传给 Claude 以便 Claude 响应（react）。不是静默监控，是 Claude 收到输出后能主动反应
- **官方来源**：https://code.claude.com/docs/en/tools — Monitor 行
- **处理**：✅ 修正为「后台运行脚本并将输出回传给 Claude 响应」

### 21. SendMessage 描述不完整
- **Dashboard 原始描述**：「向子代理发送消息」
- **官方事实**：Sends a message to an agent team teammate, or resumes a subagent by its agent ID
- **问题**：遗漏了两个关键功能——(1) 面向 agent team teammate（团队代理），不只是子代理；(2) 恢复子代理（resumes a subagent）
- **官方来源**：https://code.claude.com/docs/en/tools — SendMessage 行
- **处理**：✅ 修正为「向团队代理发送消息或恢复子代理」

### 22. ToolSearch 描述不完整
- **Dashboard 原始描述**：「搜索可用工具」
- **官方事实**：Searches for and loads deferred tools when tool search is enabled
- **问题**：遗漏了核心功能——不仅搜索还会「加载延迟工具」（loads deferred tools）
- **官方来源**：https://code.claude.com/docs/en/tools — ToolSearch 行
- **处理**：✅ 修正为「搜索并加载延迟工具」

### 23. CronCreate 描述不完整
- **Dashboard 原始描述**：「创建定时任务」
- **官方事实**：Schedules a recurring or one-shot prompt within the current session. Tasks are session-scoped and restored on --resume or --continue if unexpired
- **问题**：遗漏了关键属性——支持周期和一次性、会话级作用域
- **官方来源**：https://code.claude.com/docs/en/tools — CronCreate 行
- **处理**：✅ 修正为「创建定时/周期任务（会话级）」

### 24. TaskUpdate 描述不完整
- **Dashboard 原始描述**：「更新任务状态」
- **官方事实**：Updates task status, dependencies, details, or deletes tasks
- **问题**：遗漏了可更新的维度——依赖、详情、删除操作
- **官方来源**：https://code.claude.com/docs/en/tools — TaskUpdate 行
- **处理**：✅ 修正为「更新任务状态/依赖/详情或删除任务」

### 25. PermissionDenied Hook 事件描述不准确
- **Dashboard 原始描述**：「权限请求被拒」
- **官方事实**：When a tool call is denied by the auto mode classifier
- **问题**：不是通用的「权限请求被拒」，而是特指「被 auto 模式分类器拒绝」
- **官方来源**：https://code.claude.com/docs/en/hooks — PermissionDenied 行
- **处理**：✅ 修正为「工具被 auto 模式分类器拒绝时」

### 26. /diff 命令描述不完整
- **Dashboard 原始描述**：「查看未提交变更的 diff」
- **官方事实**：Open an interactive diff viewer showing uncommitted changes and per-turn diffs. Use left/right arrows to switch between the current git diff and individual Claude turns
- **问题**：遗漏了核心功能——交互式查看 + 逐 turn diff（不只是 git diff）
- **官方来源**：https://code.claude.com/docs/en/commands — /diff 行
- **处理**：✅ 修正为「交互式查看未提交变更和逐 turn diff」

### 27. /autofix-pr 命令描述不准确
- **Dashboard 原始描述**：「自动修复 PR 的 CI 失败」
- **官方事实**：Spawn a Claude Code on the web session that watches the current branch's PR and pushes fixes when CI fails or reviewers leave comments
- **问题**：(1) 是启动云端会话（Claude Code on the web），不是本地操作；(2) 不只修 CI 失败，还修评审意见
- **官方来源**：https://code.claude.com/docs/en/commands — /autofix-pr 行
- **处理**：✅ 修正为「启动云端会话自动修复 PR 的 CI 失败和评审意见」

---

## 第四轮审计修正（2026-05-28 全量回归审计）

### 28. CLAUDE_CODE_EFFORT_LEVEL 默认值不准确
- **Dashboard 原始默认值**：「—」
- **官方事实**：默认值为 `auto`（uses the model default）
- **官方来源**：https://code.claude.com/docs/en/env-vars — CLAUDE_CODE_EFFORT_LEVEL 行
- **处理**：✅ 修正默认值为「auto」

---

## 全面核查通过项（2026-05-28）

### ✅ 40 个内置工具 — 名称 + 权限(perm)字段
- **核查方式**：逐个对比官方 tools 页面表格 "Permission Required" 列
- **结果**：40 个工具名精确匹配，40 个权限标记全部正确
- **官方来源**：https://code.claude.com/docs/en/tools

### ✅ 30 种 Hook 事件 — 名称 + 描述 + canBlock 字段
- **核查方式**：逐个对比官方 hooks 页面事件表 "Can Block" 列
- **结果**：30 个事件名精确匹配，所有 canBlock 标记正确
- **官方来源**：https://code.claude.com/docs/en/hooks

### ✅ 5 种 Hook 处理器类型
- **Dashboard 声称**：command / http / mcp_tool / prompt / agent
- **结果**：完全一致
- **官方来源**：https://code.claude.com/docs/en/hooks — "Hook handler types" 章节

### ✅ 5 种子代理 — 名称 + 模型
- **结果**：Explore(Haiku) / Plan(继承) / general-purpose(继承) / claude-code-guide(Haiku) / statusline-setup(Sonnet) 全部匹配
- **官方来源**：https://code.claude.com/docs/en/sub-agents — "Built-in subagents" 章节

### ✅ 89 个斜杠命令 — 名称 + 别名
- **结果**：命令名和别名全部匹配
- **官方来源**：https://code.claude.com/docs/en/commands

### ✅ MCP 传输类型
- **Dashboard/README 声称**：Stdio / HTTP / Streamable-HTTP / SSE
- **结果**：准确
- **官方来源**：https://code.claude.com/docs/en/mcp

---

## 审计方法论

### 数据来源约束
- 唯一可信来源：https://code.claude.com/docs
- 严禁使用 AI 训练数据/记忆进行"核实"
- 每个数据点必须通过 WebFetch 实时获取官方页面后比对

### 核查方式
- 数量类声称：通过 Python 脚本做集合对比（set difference），确保零差集
- 描述类声称：逐字段对比官方文档原文
- 权限/标记类声称：逐行对比官方表格对应列
- 结构类声称（如"6层架构"）：搜索官方文档确认是否使用对应术语

### 易错模式
1. **AI 臆想核查**：用训练数据"回忆"官方文档内容，而非实时获取 → 必须用 WebFetch
2. **近似数量**：用约数（"约 90 个"）代替精确计数 → 必须精确到个位并标注口径
3. **术语归属**：将 Dashboard 自己的归纳称为"官方"概念 → 必须明确区分
4. **选择性展示**：展示部分数据暗示完整性 → 必须标注"常用 X 个"并链接完整列表
5. **默认值臆想**：布尔型环境变量默认写"0" → 官方实际标注"Not set"，语义不同
6. **分类错误**：将内置命令标记为 bundled skill → 必须以官方 [Skill] 标记为准
7. **平台限定错误**：工具描述限定"仅 Windows" → 实际跨平台可用（如 PowerShell）
8. **功能范围错误**：将专用工具描述为通用工具 → 如 ScheduleWakeup 仅用于 /loop
9. **功能遗漏**：只描述工具的一半功能 → 如 SendMessage 既发消息又恢复子代理，ToolSearch 既搜索又加载
10. **触发条件模糊化**：将特定触发条件泛化 → 如 PermissionDenied 仅限 auto 模式分类器拒绝，不是通用权限拒绝
11. **执行环境缺失**：遗漏工具的执行环境属性 → 如 /autofix-pr 是云端会话（非本地），CronCreate 是会话级（非持久）
