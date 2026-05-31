import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

const BUILTIN_TOOL_CATEGORIES = {
  '文件操作': [
    { name: 'Read', desc: '读取文件内容', perm: false },
    { name: 'Edit', desc: '精确字符串替换编辑', perm: true },
    { name: 'Write', desc: '创建或覆盖文件', perm: true },
    { name: 'Glob', desc: '按模式匹配查找文件', perm: false },
    { name: 'Grep', desc: '搜索文件内容（基于 ripgrep）', perm: false },
    { name: 'NotebookEdit', desc: '编辑 Jupyter notebook 单元格', perm: true },
    { name: 'LSP', desc: '语言服务器：跳转定义、引用、类型检查', perm: false },
  ],
  '执行': [
    { name: 'Bash', desc: '执行 Shell 命令', perm: true },
    { name: 'Monitor', desc: '后台运行脚本并将输出回传给 Claude 响应', perm: true },
    { name: 'PowerShell', desc: '执行 PowerShell 命令（Windows 默认，其他平台可选）', perm: true },
  ],
  '网络': [
    { name: 'WebFetch', desc: '抓取网页并提取信息', perm: true },
    { name: 'WebSearch', desc: '网络搜索', perm: true },
  ],
  '规划与工作树': [
    { name: 'EnterPlanMode', desc: '进入规划模式（设计方案后再编码）', perm: false },
    { name: 'ExitPlanMode', desc: '提交计划并退出规划模式', perm: true },
    { name: 'EnterWorktree', desc: '创建/进入 git worktree', perm: false },
    { name: 'ExitWorktree', desc: '退出 git worktree', perm: false },
  ],
  '任务管理': [
    { name: 'TaskCreate', desc: '创建任务（任务列表管理）', perm: false },
    { name: 'TaskGet', desc: '获取任务详情', perm: false },
    { name: 'TaskList', desc: '列出所有任务', perm: false },
    { name: 'TaskUpdate', desc: '更新任务状态/依赖/详情或删除任务', perm: false },
    { name: 'TaskStop', desc: '停止后台任务', perm: false },
    { name: 'TaskOutput', desc: '获取后台任务输出（已弃用，改用 Read）', perm: false, deprecated: true },
    { name: 'TodoWrite', desc: '管理会话待办列表', perm: false },
  ],
  '代理与团队': [
    { name: 'Agent', desc: '启动子代理处理任务', perm: false },
    { name: 'SendMessage', desc: '向团队代理发送消息或恢复子代理', perm: false },
    { name: 'TeamCreate', desc: '创建代理团队', perm: false },
    { name: 'TeamDelete', desc: '删除代理团队', perm: false },
  ],
  '调度': [
    { name: 'CronCreate', desc: '创建定时/周期任务（会话级）', perm: false },
    { name: 'CronDelete', desc: '取消定时任务', perm: false },
    { name: 'CronList', desc: '列出定时任务', perm: false },
    { name: 'ScheduleWakeup', desc: '为自节奏 /loop 安排下次唤醒', perm: false },
  ],
  'MCP': [
    { name: 'ListMcpResourcesTool', desc: '列出 MCP 服务器资源', perm: false },
    { name: 'ReadMcpResourceTool', desc: '读取 MCP 资源', perm: false },
    { name: 'ToolSearch', desc: '搜索并加载延迟工具', perm: false },
    { name: 'WaitForMcpServers', desc: '等待 MCP 服务器就绪', perm: false },
  ],
  'UI 与其他': [
    { name: 'AskUserQuestion', desc: '向用户提问收集需求', perm: false },
    { name: 'PushNotification', desc: '发送桌面/手机通知', perm: false },
    { name: 'Skill', desc: '调用已安装的技能', perm: true },
    { name: 'RemoteTrigger', desc: '管理 claude.ai Routines', perm: false },
    { name: 'ShareOnboardingGuide', desc: '分享 onboarding 指南', perm: true },
  ],
}

const TOTAL_TOOLS = Object.values(BUILTIN_TOOL_CATEGORIES).reduce((s, a) => s + a.length, 0)

const BUILTIN_SUBAGENTS = [
  { name: 'Explore', model: 'Haiku', desc: '快速只读代码搜索与探索', tools: '只读工具（无 Write/Edit）' },
  { name: 'Plan', model: '继承主会话', desc: '规划模式下的代码库研究', tools: '只读工具（无 Write/Edit）' },
  { name: 'general-purpose', model: '继承主会话', desc: '通用研究与多步骤任务执行', tools: '全部工具' },
  { name: 'claude-code-guide', model: 'Haiku', desc: 'Claude Code 使用问答', tools: 'Bash/Read/WebFetch/WebSearch' },
  { name: 'statusline-setup', model: 'Sonnet', desc: '配置终端状态栏', tools: 'Read/Edit' },
]

const HOOK_EVENT_GROUPS = {
  '会话生命周期': [
    { name: 'SessionStart', desc: '会话开始/恢复' },
    { name: 'SessionEnd', desc: '会话结束' },
    { name: 'Setup', desc: '初始化/维护模式' },
  ],
  '用户输入': [
    { name: 'UserPromptSubmit', desc: '提交提示词前', canBlock: true },
    { name: 'UserPromptExpansion', desc: '命令展开前', canBlock: true },
  ],
  '工具生命周期': [
    { name: 'PreToolUse', desc: '工具执行前', canBlock: true },
    { name: 'PostToolUse', desc: '工具执行成功后' },
    { name: 'PostToolUseFailure', desc: '工具执行失败后' },
    { name: 'PostToolBatch', desc: '批量工具调用完成后', canBlock: true },
    { name: 'PermissionRequest', desc: '请求权限时', canBlock: true },
    { name: 'PermissionDenied', desc: '工具被 auto 模式分类器拒绝时' },
  ],
  '代理与任务': [
    { name: 'SubagentStart', desc: '子代理启动' },
    { name: 'SubagentStop', desc: '子代理完成', canBlock: true },
    { name: 'TaskCreated', desc: '任务创建', canBlock: true },
    { name: 'TaskCompleted', desc: '任务完成', canBlock: true },
    { name: 'TeammateIdle', desc: '团队代理空闲', canBlock: true },
  ],
  '回复': [
    { name: 'Stop', desc: 'Claude 停止生成', canBlock: true },
    { name: 'StopFailure', desc: 'API 错误终止' },
    { name: 'MessageDisplay', desc: '消息显示到终端（仅展示层，不可阻止）' },
  ],
  '配置': [
    { name: 'InstructionsLoaded', desc: 'CLAUDE.md/规则加载' },
    { name: 'ConfigChange', desc: '配置文件变更', canBlock: true },
    { name: 'CwdChanged', desc: '工作目录变更' },
    { name: 'FileChanged', desc: '文件变更监视' },
  ],
  'Git Worktree': [
    { name: 'WorktreeCreate', desc: 'Worktree 创建', canBlock: true },
    { name: 'WorktreeRemove', desc: 'Worktree 移除' },
  ],
  '上下文': [
    { name: 'PreCompact', desc: '上下文压缩前', canBlock: true },
    { name: 'PostCompact', desc: '上下文压缩后' },
  ],
  'MCP': [
    { name: 'Elicitation', desc: 'MCP 请求用户输入', canBlock: true },
    { name: 'ElicitationResult', desc: '用户响应 MCP', canBlock: true },
  ],
  '通知': [
    { name: 'Notification', desc: '通知事件' },
  ],
}

const TOTAL_EVENTS = Object.values(HOOK_EVENT_GROUPS).reduce((s, a) => s + a.length, 0)

const ENV_VARS = {
  '模型与后端': [
    { name: 'ANTHROPIC_API_KEY', desc: 'API 密钥（设置后优先于订阅认证）', default: '—' },
    { name: 'ANTHROPIC_AUTH_TOKEN', desc: '自定义 Authorization 头（自动加 Bearer 前缀）', default: '—' },
    { name: 'ANTHROPIC_MODEL', desc: '设置使用的模型名称', default: '—' },
    { name: 'ANTHROPIC_BASE_URL', desc: '自定义 API 端点（代理/网关）', default: '—' },
    { name: 'CLAUDE_CODE_USE_BEDROCK', desc: '使用 AWS Bedrock 后端', default: '未设置' },
    { name: 'CLAUDE_CODE_USE_VERTEX', desc: '使用 Google Vertex AI 后端', default: '未设置' },
    { name: 'CLAUDE_CODE_USE_FOUNDRY', desc: '使用 Microsoft Foundry 后端', default: '未设置' },
    { name: 'CLAUDE_CODE_API_KEY_HELPER_TTL_MS', desc: '密钥刷新间隔（毫秒，配合 settings.json 的 apiKeyHelper 使用）', default: '—' },
  ],
  '行为控制': [
    { name: 'CLAUDE_CODE_MAX_TURNS', desc: '限制最大 agentic 轮数', default: '无上限' },
    { name: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS', desc: '单回复最大 Token 数', default: '模型默认' },
    { name: 'CLAUDE_CODE_EFFORT_LEVEL', desc: '推理力度（low/medium/high/xhigh/max/auto）', default: 'auto' },
    { name: 'CLAUDE_CODE_DISABLE_THINKING', desc: '设为 1 禁用扩展思考', default: '未设置' },
    { name: 'CLAUDE_CODE_DISABLE_AUTO_MEMORY', desc: '设为 1 禁用自动记忆，设为 0 强制开启', default: '未设置' },
    { name: 'CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS', desc: '设为 1 移除内置 Git 系统提示', default: '未设置' },
    { name: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', desc: '等效禁用更新/反馈/错误报告/遥测', default: '未设置' },
    { name: 'CLAUDE_CODE_FORK_SUBAGENT', desc: '设为 1 启用 fork 子代理继承对话上下文', default: '未设置' },
  ],
  '网络与遥测': [
    { name: 'HTTP_PROXY', desc: 'HTTP 代理地址', default: '—' },
    { name: 'HTTPS_PROXY', desc: 'HTTPS 代理地址', default: '—' },
    { name: 'CLAUDE_CODE_ENABLE_TELEMETRY', desc: '设为 1 启用 OpenTelemetry 数据收集', default: '未设置' },
    { name: 'DISABLE_AUTOUPDATER', desc: '禁用自动更新', default: '未设置' },
    { name: 'BASH_DEFAULT_TIMEOUT_MS', desc: 'Bash 默认超时（毫秒）', default: '120000' },
    { name: 'BASH_MAX_TIMEOUT_MS', desc: 'Bash 最大超时上限（毫秒）', default: '600000' },
  ],
}

const SLASH_COMMANDS = {
  '会话控制': [
    { name: '/compact', desc: '压缩上下文（可带聚焦指示）' },
    { name: '/clear', desc: '新对话（保留历史可 /resume）', alias: '/reset, /new' },
    { name: '/resume', desc: '恢复之前的对话（支持后台会话）', alias: '/continue' },
    { name: '/branch', desc: '分叉当前对话为新分支', alias: '/fork' },
    { name: '/goal', desc: '设定持续目标直到达成' },
    { name: '/context', desc: '可视化上下文窗口使用情况' },
    { name: '/rewind', desc: '回退对话和/或代码到检查点', alias: '/checkpoint, /undo' },
    { name: '/btw', desc: '快速旁问（不计入对话历史）' },
    { name: '/recap', desc: '生成当前会话的一行摘要' },
    { name: '/rename', desc: '重命名当前会话' },
    { name: '/exit', desc: '退出 CLI（后台会话中为分离）', alias: '/quit' },
    { name: '/stop', desc: '停止当前后台会话' },
  ],
  '模型与模式': [
    { name: '/model', desc: '切换 AI 模型' },
    { name: '/effort', desc: '调整推理力度（low~max）' },
    { name: '/fast', desc: '切换 fast mode（快速输出模式）' },
    { name: '/plan', desc: '进入规划模式' },
    { name: '/focus', desc: '切换精简视图（全屏模式）' },
    { name: '/diff', desc: '交互式查看未提交变更和逐 turn diff' },
    { name: '/sandbox', desc: '切换沙盒模式' },
    { name: '/tui', desc: '设置终端 UI 渲染器（default/fullscreen）' },
  ],
  '配置与记忆': [
    { name: '/memory', desc: '编辑 CLAUDE.md 和自动记忆' },
    { name: '/config', desc: '打开配置面板', alias: '/settings' },
    { name: '/permissions', desc: '管理权限规则', alias: '/allowed-tools' },
    { name: '/hooks', desc: '查看 Hook 配置' },
    { name: '/mcp', desc: '管理 MCP 服务器与 OAuth' },
    { name: '/init', desc: '初始化项目 CLAUDE.md' },
    { name: '/skills', desc: '列出可用技能' },
    { name: '/reload-skills', desc: '重新扫描技能目录（无需重启）' },
    { name: '/reload-plugins', desc: '重新加载所有活跃插件' },
    { name: '/plugin', desc: '管理 Claude Code 插件' },
    { name: '/theme', desc: '切换颜色主题（含深色/浅色/无障碍）' },
    { name: '/color', desc: '设置提示栏颜色' },
    { name: '/keybindings', desc: '打开/创建键绑定配置' },
    { name: '/terminal-setup', desc: '配置终端快捷键（Shift+Enter 等）' },
    { name: '/statusline', desc: '配置 Claude Code 状态栏' },
    { name: '/scroll-speed', desc: '调整鼠标滚轮速度（全屏模式）' },
    { name: '/privacy-settings', desc: '查看和更新隐私设置' },
  ],
  '工具与诊断': [
    { name: '/doctor', desc: '诊断安装与环境问题' },
    { name: '/help', desc: '显示帮助和命令列表' },
    { name: '/add-dir', desc: '添加额外工作目录' },
    { name: '/export', desc: '导出对话为文本' },
    { name: '/copy', desc: '复制最近回复到剪贴板' },
    { name: '/usage', desc: '查看会话费用与用量统计', alias: '/cost, /stats' },
    { name: '/agents', desc: '管理子代理配置' },
    { name: '/tasks', desc: '列出后台任务', alias: '/bashes' },
    { name: '/background', desc: '将当前会话分离为后台代理', alias: '/bg' },
    { name: '/heapdump', desc: '导出堆快照诊断内存问题' },
    { name: '/insights', desc: '分析会话生成使用报告' },
    { name: '/feedback', desc: '提交反馈或报告 Bug', alias: '/bug, /share' },
    { name: '/status', desc: '查看版本、模型、连接等状态' },
    { name: '/release-notes', desc: '查看更新日志' },
    { name: '/review', desc: '本地审查 Pull Request' },
    { name: '/security-review', desc: '分析当前分支的安全漏洞' },
    { name: '/ultraplan', desc: '云端深度规划' },
    { name: '/ultrareview', desc: '云端多代理深度代码审查' },
    { name: '/workflows', desc: '查看/管理工作流进度（暂停/恢复/保存）' },
  ],
  '账号与平台': [
    { name: '/login', desc: '登录 Anthropic 账号' },
    { name: '/logout', desc: '退出 Anthropic 账号' },
    { name: '/upgrade', desc: '升级到更高计划' },
    { name: '/usage-credits', desc: '配置额外用量额度' },
    { name: '/passes', desc: '分享 Claude Code 免费体验周' },
    { name: '/desktop', desc: '在桌面应用中继续会话', alias: '/app' },
    { name: '/chrome', desc: '配置 Chrome 集成' },
    { name: '/ide', desc: '管理 IDE 集成状态' },
    { name: '/mobile', desc: '显示移动端下载二维码', alias: '/ios, /android' },
    { name: '/stickers', desc: '订购 Claude Code 贴纸' },
    { name: '/radio', desc: '打开 Claude FM lo-fi 电台' },
    { name: '/powerup', desc: '通过互动课程发现新功能' },
    { name: '/voice', desc: '切换语音输入模式（hold/tap/off）' },
  ],
  '远程与协作': [
    { name: '/remote-control', desc: '通过 claude.ai 远程控制本地会话', alias: '/rc' },
    { name: '/teleport', desc: '将网页会话拉入终端', alias: '/tp' },
    { name: '/web-setup', desc: '连接 GitHub 到 Claude Code 网页版' },
    { name: '/remote-env', desc: '配置远程环境' },
    { name: '/autofix-pr', desc: '启动云端会话自动修复 PR 的 CI 失败和评审意见' },
    { name: '/install-github-app', desc: '安装 Claude GitHub Actions 应用' },
    { name: '/install-slack-app', desc: '安装 Claude Slack 应用' },
    { name: '/team-onboarding', desc: '生成团队 onboarding 指南' },
    { name: '/schedule', desc: '创建/管理云端定时 Routines', alias: '/routines' },
    { name: '/setup-bedrock', desc: '配置 AWS Bedrock 后端' },
    { name: '/setup-vertex', desc: '配置 Google Vertex AI 后端' },
  ],
  '技能（Bundled Skills）': [
    { name: '/code-review', desc: '代码审查 diff（--fix/--comment/ultra 云端深度审查）', skill: true },
    { name: '/simplify', desc: '等价 /code-review --fix，自动优化代码', skill: true },
    { name: '/batch', desc: '大规模并行代码变更（worktree 隔离）', skill: true },
    { name: '/run', desc: '启动并驱动应用以验证变更', skill: true },
    { name: '/run-skill-generator', desc: '为 /run 和 /verify 生成项目技能', skill: true },
    { name: '/verify', desc: '构建并运行应用确认代码行为正确', skill: true },
    { name: '/debug', desc: '调试日志与问题排查', skill: true },
    { name: '/loop', desc: '循环执行任务（可自定间隔或自动节奏）', skill: true, alias: '/proactive' },
    { name: '/claude-api', desc: '加载 Claude API 参考（migrate/managed-agents-onboard）', skill: true },
    { name: '/fewer-permission-prompts', desc: '扫描历史自动添加权限白名单', skill: true },
    { name: '/deep-research', desc: '多源网络搜索与交叉验证生成引用报告', skill: true },
  ],
}

const CONFIG_ITEMS = [
  { key: 'claudeMd', icon: '📏', label: 'CLAUDE.md', link: '/rules', getValue: d => d.claudeMd.length, getDetail: d => d.claudeMd.map(m => m.label).join(' · ') || null },
  { key: 'permissions', icon: '🔐', label: '权限规则', link: '/permissions', getValue: d => d.permissions.totalAllow + d.permissions.totalDeny, getDetail: d => `${d.permissions.totalAllow} 允许 / ${d.permissions.totalDeny} 拒绝` },
  { key: 'hooks', icon: '🔗', label: '钩子', link: '/hooks', getValue: d => d.hooks.summary.length, getDetail: d => `${d.hooks.events.length} 个事件类型` },
  { key: 'mcp', icon: '🔌', label: 'MCP 服务器', link: '/mcp', getValue: d => d.mcp.length },
  { key: 'plugins', icon: '🧩', label: '插件', link: '/plugins', getValue: d => d.plugins.length, getDetail: d => `${d.plugins.filter(p => p.enabled).length} 个启用` },
  { key: 'skills', icon: '⚡', label: '技能', link: '/skills', getValue: d => d.skills.length },
  { key: 'agents', icon: '🤖', label: '子代理', link: '/agents', getValue: d => d.agents?.total || 0, getDetail: d => d.agents ? `${d.agents.user} 用户 / ${d.agents.project} 项目` : null },
  { key: 'memories', icon: '🧠', label: '记忆', link: '/memories', getValue: d => d.memories.length },
]

const ACTIVITY_ICON = {
  conversation: { icon: '💬', bg: 'bg-yellow-50', text: 'text-yellow-600', label: '对话' },
  memory: { icon: '🧠', bg: 'bg-green-50', text: 'text-green-600', label: '记忆' },
  skill: { icon: '⚡', bg: 'bg-orange-50', text: 'text-orange-600', label: '技能' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 月前`
}

function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

export default function Overview() {
  const [harness, setHarness] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [activity, setActivity] = useState([])
  const [tokens, setTokens] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState({})
  const [versionInfo, setVersionInfo] = useState(null)
  const [showRelease, setShowRelease] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/overview/harness').then(r => r.json()),
      fetch('/api/diagnostics').then(r => r.json()).catch(() => null),
      fetch('/api/overview/activity').then(r => r.json()).catch(() => []),
    ]).then(([h, d, a]) => {
      setHarness(h)
      setDiagnostics(d)
      setActivity(a)
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch('/api/overview/tokens').then(r => r.json()).then(setTokens).catch(() => {})
    fetch('/api/overview/version').then(r => r.json()).then(setVersionInfo).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!harness) return <div className="flex items-center justify-center h-full text-red-500">加载失败</div>

  const score = diagnostics?.summary
    ? Math.round((diagnostics.summary.pass / diagnostics.summary.total) * 100)
    : null

  const eventCounts = harness.hooks?.eventCounts || {}

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-semibold text-gray-900">总览</h2>
          <button onClick={load} className="text-[13px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors">
            刷新
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-8">Claude Code Harness 配置、用量与工具一览</p>

        {/* Version Card */}
        {versionInfo && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">🚀</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-gray-900">
                      Claude Code {versionInfo.current ? `v${versionInfo.current}` : '未安装'}
                    </span>
                    {versionInfo.hasUpdate ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        有更新 → v{versionInfo.latest}
                      </span>
                    ) : versionInfo.current ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">已是最新</span>
                    ) : null}
                  </div>
                  {versionInfo.publishedAt && (
                    <p className="text-[11px] text-gray-400 mt-0.5">发布于 {new Date(versionInfo.publishedAt).toLocaleDateString('zh-CN')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {versionInfo.releaseNotes && (
                  <button
                    onClick={() => setShowRelease(v => !v)}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                  >
                    {showRelease ? '收起' : '查看更新日志'}
                  </button>
                )}
                <a href={versionInfo.releaseUrl || 'https://github.com/anthropics/claude-code/releases'} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors">
                  {versionInfo.releaseNotes ? 'GitHub →' : '查看更新日志 →'}
                </a>
              </div>
            </div>

            {showRelease && versionInfo.releaseNotes && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto prose prose-sm prose-gray max-w-none text-[13px] [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:text-[13px] [&_li]:text-[13px] [&_code]:text-[12px] [&_pre]:text-[12px]">
                  <ReactMarkdown>{versionInfo.releaseNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {versionInfo.hasUpdate && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-[13px] text-gray-500">
                <span>更新命令：</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-[12px] font-mono select-all text-gray-700">npm install -g @anthropic-ai/claude-code@latest</code>
                <button
                  className="text-[11px] text-blue-500 hover:text-blue-600 underline"
                  onClick={() => navigator.clipboard.writeText('npm install -g @anthropic-ai/claude-code@latest')}
                >复制</button>
              </div>
            )}
          </div>
        )}

        {/* Section 1: 配置状态 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-4">配置状态</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CONFIG_ITEMS.map(item => {
              const value = item.getValue(harness)
              const configured = value > 0
              const detail = item.getDetail?.(harness)
              return (
                <Link
                  key={item.key}
                  to={item.link}
                  className={`rounded-xl border-l-4 px-4 py-3 transition-all hover:shadow-sm ${
                    configured ? 'border-l-green-400 bg-green-50/30' : 'border-l-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[13px] font-medium text-gray-800">{item.label}</span>
                  </div>
                  <span className={`text-xl font-semibold ${configured ? 'text-gray-900' : 'text-gray-300'}`}>{value}</span>
                  {detail && <p className="text-[11px] text-gray-400 mt-0.5">{detail}</p>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Section 2: Token 用量统计 */}
        {tokens && tokens.total.messageCount > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Token 用量</h3>
            <p className="text-[12px] text-gray-400 mb-5">累计所有对话的模型 token 消耗</p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: '总消息数', value: fmtNum(tokens.total.messageCount), sub: `${tokens.total.conversationCount} 个对话`, color: 'text-blue-600' },
                { label: '输入 Token', value: fmtNum(tokens.total.input), color: 'text-green-600' },
                { label: '输出 Token', value: fmtNum(tokens.total.output), color: 'text-orange-600' },
                {
                  label: '缓存命中率',
                  value: tokens.total.cacheRead + tokens.total.cacheCreation + tokens.total.input > 0
                    ? Math.round(tokens.total.cacheRead / (tokens.total.cacheRead + tokens.total.cacheCreation + tokens.total.input) * 100) + '%'
                    : '0%',
                  sub: `创建 ${fmtNum(tokens.total.cacheCreation)} / 读取 ${fmtNum(tokens.total.cacheRead)}`,
                  color: 'text-purple-600',
                },
              ].map(c => (
                <div key={c.label} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
                  {c.sub && <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>}
                </div>
              ))}
            </div>

            {/* By model table */}
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">模型</th>
                    <th className="pb-2 font-medium text-right">消息数</th>
                    <th className="pb-2 font-medium text-right">输入</th>
                    <th className="pb-2 font-medium text-right">输出</th>
                    <th className="pb-2 font-medium text-right">缓存创建</th>
                    <th className="pb-2 font-medium text-right">缓存读取</th>
                    <th className="pb-2 font-medium text-right">合计</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(tokens.byModel)
                    .sort(([, a], [, b]) => (b.input + b.output + b.cacheCreation + b.cacheRead) - (a.input + a.output + a.cacheCreation + a.cacheRead))
                    .map(([model, m]) => (
                    <tr key={model} className="border-b border-gray-50 text-gray-700">
                      <td className="py-2 font-mono font-medium">{model}</td>
                      <td className="py-2 text-right">{m.messageCount.toLocaleString()}</td>
                      <td className="py-2 text-right text-green-600">{fmtNum(m.input)}</td>
                      <td className="py-2 text-right text-orange-600">{fmtNum(m.output)}</td>
                      <td className="py-2 text-right text-purple-500">{fmtNum(m.cacheCreation)}</td>
                      <td className="py-2 text-right text-blue-500">{fmtNum(m.cacheRead)}</td>
                      <td className="py-2 text-right font-semibold">{fmtNum(m.input + m.output + m.cacheCreation + m.cacheRead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 7-day trend */}
            {tokens.recent.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-2">近 7 天趋势</p>
                <div className="flex items-end gap-1 h-20">
                  {(() => {
                    const maxVal = Math.max(...tokens.recent.map(d => d.input + d.output + d.cacheCreation + d.cacheRead), 1)
                    return tokens.recent.map(day => {
                      const total = day.input + day.output + day.cacheCreation + day.cacheRead
                      const pct = Math.max((total / maxVal) * 100, 2)
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full bg-blue-400 rounded-t opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${pct}%` }} />
                          <span className="text-[9px] text-gray-400">{day.date.slice(5)}</span>
                          <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {fmtNum(total)} tokens
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: 诊断 + 运行参数 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {diagnostics && (
            <Link to="/diagnostics" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none"
                      stroke={score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3" strokeDasharray={`${score * 0.975} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{score}</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">配置健康</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {score === 100 ? '一切正常' : score >= 60 ? '部分需注意' : '存在问题'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400"></span>{diagnostics.summary.pass} 通过</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>{diagnostics.summary.warn} 警告</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"></span>{diagnostics.summary.error} 错误</span>
              </div>
            </Link>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-4">运行参数</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-gray-500">模型</span><span className="text-gray-700 font-mono">{harness.settings.model}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">编辑器模式</span><span className="text-gray-700">{harness.settings.editorMode}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">自动记忆</span><span className={harness.settings.autoMemoryEnabled ? 'text-green-600' : 'text-gray-400'}>{harness.settings.autoMemoryEnabled ? '启用' : '禁用'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">活跃会话</span><span className="text-gray-700">{harness.sessions?.alive || 0} / {harness.sessions?.total || 0}</span></div>
              {harness.settings.effortLevel && <div className="flex justify-between"><span className="text-gray-500">推理力度</span><span className="text-gray-700">{harness.settings.effortLevel}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">计划文件</span><span className="text-gray-700">{harness.plans ?? 0}</span></div>
            </div>
          </div>
        </div>

        {/* Section 4: 内置工具清单 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-gray-900">内置工具</h3>
            <span className="text-[12px] text-gray-400">{TOTAL_TOOLS} 个</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            Claude Code 的全部内置工具 — <a href="https://code.claude.com/docs/en/tools-reference" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">官方文档</a>
          </p>
          <div className="space-y-0">
            {Object.entries(BUILTIN_TOOL_CATEGORIES).map(([cat, tools]) => (
              <div key={cat}>
                <button onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-800">{cat}</span>
                    <span className="text-[11px] text-gray-400">({tools.length})</span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCats[cat] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedCats[cat] && (
                  <div className="px-3 pb-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                      {tools.map(tool => (
                        <div key={tool.name} className="flex items-center gap-2 text-[12px]">
                          <code className="font-mono font-medium text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-100 shrink-0">{tool.name}</code>
                          <span className="text-gray-500 truncate">{tool.desc}</span>
                          {tool.perm && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shrink-0">需授权</span>}
                          {tool.deprecated && <span className="text-[10px] bg-red-50 text-red-400 px-1.5 py-0.5 rounded shrink-0">已弃用</span>}
                          {tool.disabled && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded shrink-0">默认禁用</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {harness.mcp.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[12px] text-gray-500 font-medium mb-2">MCP 提供的额外工具</p>
              <div className="flex flex-wrap gap-1.5">
                {harness.mcp.map(m => (
                  <span key={`${m.name}-${m.scope}`} className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md">
                    {m.name} <span className="text-cyan-400">({m.scope === 'user' ? '全局' : '项目'})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Hook 生命周期事件 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-gray-900">Hook 生命周期事件</h3>
            <span className="text-[12px] text-gray-400">{TOTAL_EVENTS} 个事件</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            所有可配置钩子的事件点 — 已配置的以绿色标记 — <a href="https://code.claude.com/docs/en/hooks" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">官方文档</a>
          </p>
          <div className="space-y-3">
            {Object.entries(HOOK_EVENT_GROUPS).map(([group, events]) => (
              <div key={group}>
                <p className="text-[11px] text-gray-500 font-semibold mb-1.5 uppercase">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {events.map(evt => {
                    const count = eventCounts[evt.name] || 0
                    const active = count > 0
                    return (
                      <span key={evt.name} className={`text-[11px] px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`} title={evt.desc}>
                        <span className="font-mono font-medium">{evt.name}</span>
                        {active && <span className="bg-green-200 text-green-800 text-[10px] px-1 rounded font-semibold">{count}</span>}
                        {evt.canBlock && <span className="text-[9px] text-amber-500" title="可阻止操作">⛔</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">已配置 {harness.hooks.summary.length} 个钩子，覆盖 {harness.hooks.events.length} 个事件</span>
            <Link to="/hooks" className="text-[11px] text-blue-500 hover:underline">管理钩子 →</Link>
          </div>
        </div>

        {/* Section 6: 内置子代理 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-gray-900">内置子代理</h3>
            <span className="text-[12px] text-gray-400">
              {BUILTIN_SUBAGENTS.length} 内置{(harness.agents?.total || 0) > 0 ? ` + ${harness.agents.total} 自定义` : ''}
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            子代理在独立上下文窗口中运行，完成后只返回摘要 — <a href="https://code.claude.com/docs/en/sub-agents" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">官方文档</a>
          </p>
          <div className="space-y-2">
            {BUILTIN_SUBAGENTS.map(sa => (
              <div key={sa.name} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5">
                <code className="font-mono text-[12px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-gray-100 shrink-0">{sa.name}</code>
                <span className="text-[12px] text-gray-600 flex-1">{sa.desc}</span>
                <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded shrink-0">{sa.model}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{sa.tools}</span>
              </div>
            ))}
          </div>
          {(harness.agents?.total || 0) > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">自定义代理：{harness.agents.user} 用户级 · {harness.agents.project} 项目级</span>
              <Link to="/agents" className="text-[11px] text-blue-500 hover:underline">管理子代理 →</Link>
            </div>
          )}
        </div>

        {/* Section 7: 环境变量速查 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-gray-900">环境变量</h3>
            <span className="text-[12px] text-gray-400">常用 {Object.values(ENV_VARS).reduce((s, a) => s + a.length, 0)} 个</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            常用环境变量速查 — <a href="https://code.claude.com/docs/en/env-vars" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">查看完整列表</a>
          </p>
          <div className="space-y-0">
            {Object.entries(ENV_VARS).map(([cat, vars]) => (
              <div key={cat}>
                <button onClick={() => toggleCat(`env_${cat}`)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-800">{cat}</span>
                    <span className="text-[11px] text-gray-400">({vars.length})</span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCats[`env_${cat}`] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedCats[`env_${cat}`] && (
                  <div className="px-3 pb-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                      {vars.map(v => (
                        <div key={v.name} className="flex items-center gap-2 text-[12px]">
                          <code className="font-mono font-medium text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-100 shrink-0">{v.name}</code>
                          <span className="text-gray-500 flex-1 truncate">{v.desc}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0 font-mono">{v.default}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 8: 斜杠命令速查 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-gray-900">斜杠命令</h3>
            <span className="text-[12px] text-gray-400">{Object.values(SLASH_COMMANDS).reduce((s, a) => s + a.length, 0)} 个</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            在 Claude Code 中输入 / 触发的快捷命令（别名合并计数，含 bundled skill）— <a href="https://code.claude.com/docs/en/commands" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">官方文档</a>
          </p>
          <div className="space-y-0">
            {Object.entries(SLASH_COMMANDS).map(([cat, cmds]) => (
              <div key={cat}>
                <button onClick={() => toggleCat(`cmd_${cat}`)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-800">{cat}</span>
                    <span className="text-[11px] text-gray-400">({cmds.length})</span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCats[`cmd_${cat}`] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedCats[`cmd_${cat}`] && (
                  <div className="px-3 pb-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                      {cmds.map(cmd => (
                        <div key={cmd.name} className="flex items-center gap-2 text-[12px]">
                          <code className="font-mono font-medium text-blue-600 bg-white px-1.5 py-0.5 rounded border border-gray-100 shrink-0">{cmd.name}</code>
                          <span className="text-gray-500 flex-1 truncate">{cmd.desc}</span>
                          {cmd.skill && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded shrink-0">技能</span>}
                          {cmd.alias && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded shrink-0">{cmd.alias}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 9: 最近活动 */}
        {activity.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-[15px] font-semibold mb-4 text-gray-900">最近活动</h3>
            <div className="space-y-1">
              {activity.slice(0, 10).map((item, i) => {
                const meta = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.conversation
                const linkTo = item.type === 'conversation' && item.id
                  ? `/conversations/${item.id}`
                  : item.type === 'memory' ? '/memories'
                  : item.type === 'skill' ? '/skills' : null
                const displayName = item.type === 'conversation'
                  ? (item.summary?.replace(/<[^>]+>/g, '') || '(无摘要)')
                  : item.name
                const subtitle = item.type === 'conversation'
                  ? `${item.messageCount || 0} 条消息${item.project ? ` · ${item.project.split('/').pop()}` : ''}`
                  : `${meta.label}${item.project ? ` · ${item.project.split('/').pop()}` : ''}`
                const content = (
                  <div className={`flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50/60 transition-colors ${linkTo ? 'cursor-pointer' : ''}`}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${meta.bg}`}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-gray-800 font-medium truncate block">{displayName}</span>
                      <span className="text-[11px] text-gray-400">{subtitle}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(item.time)}</span>
                  </div>
                )
                return linkTo
                  ? <Link key={i} to={linkTo} className="block">{content}</Link>
                  : <div key={i}>{content}</div>
              })}
            </div>
          </div>
        )}

        {/* Section 10: 快速导航 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-4">快速导航</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { to: '/skills', icon: '⚡', label: '技能', count: harness.skills.length },
              { to: '/hooks', icon: '🔗', label: '钩子', count: harness.hooks.summary.length },
              { to: '/plugins', icon: '🧩', label: '插件', count: harness.plugins.length },
              { to: '/mcp', icon: '🔌', label: 'MCP', count: harness.mcp.length },
              { to: '/permissions', icon: '🔐', label: '权限', count: harness.permissions.totalAllow + harness.permissions.totalDeny },
              { to: '/rules', icon: '📏', label: '规则', count: harness.claudeMd.length },
              { to: '/agents', icon: '🤖', label: '子代理', count: harness.agents?.total || 0 },
              { to: '/plans', icon: '📋', label: '计划', count: harness.plans ?? 0 },
              { to: '/sessions', icon: '🖥️', label: '会话', count: harness.sessions?.total || 0 },
              { to: '/diagnostics', icon: '🩺', label: '诊断' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <span className="text-base">{item.icon}</span>
                <div>
                  <span className="text-[12px] text-gray-700 font-medium block">{item.label}</span>
                  {item.count !== undefined && <span className="text-[11px] text-gray-400">{item.count}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
