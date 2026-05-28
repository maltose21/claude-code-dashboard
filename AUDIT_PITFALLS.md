# Dashboard 真实性审计 — 易错点清单

> 本文件记录所有在历次审计中发现的分歧点，每个点标注核实状态和官方来源。
> 唯一可信来源：https://code.claude.com/docs

## 历史分歧点（已修正）

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
- **Dashboard 声称**：「覆盖默认模型（单次会话）」
- **官方事实**：Overridden by --model and /model，无"单次会话"限制
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ 已修正为「覆盖默认模型（可被 --model 和 /model 覆盖）」

### 5. 环境变量 CLAUDE_CODE_MAX_TURNS 默认值不准确
- **Dashboard 声称**：默认值为 Infinity
- **官方事实**：官方文档未给出数字默认值，描述为"no cap"
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ 已修正为「无上限」

### 6. 环境变量总数展示误导
- **Dashboard 声称**：UI 展示「23 个」环境变量，暗示完整列表
- **官方事实**：官方文档列出 200+ 个环境变量
- **官方来源**：https://code.claude.com/docs/en/env-vars
- **处理**：✅ UI 已改为「常用 23 个」，描述加注「完整列表含 200+ 个变量」并链接官方文档

---

## 全面核查结果（2026-05-28）

### ✅ 40 个内置工具
- **Dashboard 数量**：40 个
- **核查方式**：通过 Python 集合对比 Dashboard 工具名与 Claude Code 运行时系统提示中的工具名
- **结果**：精确匹配，40 个工具名一一对应
- **官方来源**：https://code.claude.com/docs/en/tools （工具列表参考）
- **工具分类**：文件操作(7) / 执行(3) / 网络(2) / 规划与工作树(4) / 任务管理(7) / 代理与团队(4) / 调度(4) / MCP(4) / UI与其他(5)

### ✅ 30 种 Hook 事件
- **Dashboard 数量**：30 个事件
- **核查方式**：通过 Python 集合对比 Dashboard 事件名与官方文档列出的事件名
- **结果**：精确匹配，30 个事件名一一对应
- **官方来源**：https://code.claude.com/docs/en/hooks
- **官方段落**：Hooks 页面 "Hook events" 章节，列出全部 30 个事件（SessionStart 到 SessionEnd）

### ✅ 5 种 Hook 处理器类型
- **Dashboard 声称**：command / http / mcp_tool / prompt / agent
- **官方事实**：完全一致，5 种处理器类型
- **官方来源**：https://code.claude.com/docs/en/hooks
- **官方段落**：Hooks 页面 "Hook handler types" 章节明确列出 command, http, mcp_tool, prompt, agent

### ✅ 5 种子代理
- **Dashboard 声称**：Explore(Haiku) / Plan(继承) / general-purpose(继承) / claude-code-guide(Haiku) / statusline-setup(Sonnet)
- **官方事实**：完全一致
- **官方来源**：https://code.claude.com/docs/en/sub-agents
- **官方段落**：Sub-agents 页面 "Built-in subagents" 章节 Tabs 中分别描述了 Explore(Haiku)、Plan(Inherits)、General-purpose(Inherits)、claude-code-guide(Haiku)、statusline-setup(Sonnet)

### ✅ 89 个斜杠命令
- **Dashboard 数量**：89 个
- **核查方式**：逐一对比官方 commands 页面表格
- **计数说明**：官方 92 行 - 2 已移除(/pr-comments, /vim) - 2 别名独立行(/cost, /stats) + 1 bundled skill(/simplify 不在表格但可用) = 89
- **官方来源**：https://code.claude.com/docs/en/commands
- **处理**：UI 已标注计数口径

### ✅ 23 个常用环境变量
- **Dashboard 数量**：23 个（标注为"常用"）
- **核查方式**：逐个比对变量名、描述、默认值与官方文档
- **结果**：23 个变量名均存在于官方文档，描述和默认值均已修正至准确
- **官方来源**：https://code.claude.com/docs/en/env-vars

### ✅ MCP 传输类型
- **Dashboard/README 声称**：Stdio / HTTP / Streamable-HTTP / SSE
- **官方事实**：stdio（默认）、http（含 streamable-http 别名）、sse（已弃用）
- **官方来源**：https://code.claude.com/docs/en/mcp
- **说明**：Dashboard 列出的 4 种类型准确，其中 Streamable-HTTP 是 HTTP 的别名（JSON 配置中 type 字段可设为 "streamable-http"，等同于 "http"），SSE 为已弃用但仍支持的传输方式

---

## 审计方法论

### 数据来源约束
- 唯一可信来源：https://code.claude.com/docs
- 严禁使用 AI 训练数据/记忆进行"核实"
- 每个数据点必须通过 WebFetch 实时获取官方页面后比对

### 核查方式
- 数量类声称：通过 Python 脚本做集合对比（set difference），确保零差集
- 描述类声称：逐字段对比官方文档原文
- 结构类声称（如"6层架构"）：搜索官方文档确认是否使用对应术语

### 易错模式
1. **AI 臆想核查**：用训练数据"回忆"官方文档内容，而非实时获取 → 必须用 WebFetch
2. **近似数量**：用约数（"约 90 个"）代替精确计数 → 必须精确到个位并标注口径
3. **术语归属**：将 Dashboard 自己的归纳称为"官方"概念 → 必须明确区分
4. **选择性展示**：展示部分数据暗示完整性 → 必须标注"常用 X 个"并链接完整列表
