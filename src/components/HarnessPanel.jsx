import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const LAYERS = [
  {
    id: 'input',
    num: 1,
    name: '输入层',
    en: 'Input',
    icon: '🔐',
    color: 'blue',
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    tagBg: 'bg-blue-100 text-blue-700',
    desc: '会话边界与权限门控 — 所有请求首先经过此层，决定哪些操作被允许执行',
  },
  {
    id: 'knowledge',
    num: 2,
    name: '知识层',
    en: 'Knowledge',
    icon: '📚',
    color: 'purple',
    border: 'border-l-purple-500',
    bg: 'bg-purple-50',
    tagBg: 'bg-purple-100 text-purple-700',
    desc: '持久化记忆与指令 — CLAUDE.md、技能、记忆在每次会话中自动加载，压缩后仍保留',
  },
  {
    id: 'execution',
    num: 3,
    name: '执行层',
    en: 'Execution (Agent Loop)',
    icon: '🔧',
    color: 'green',
    border: 'border-l-green-500',
    bg: 'bg-green-50',
    tagBg: 'bg-green-100 text-green-700',
    desc: '核心 Agent 循环 — 收集上下文 → 执行动作 → 验证结果，内置工具在此调度',
  },
  {
    id: 'integration',
    num: 4,
    name: '集成层',
    en: 'Integration',
    icon: '🔌',
    color: 'cyan',
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    tagBg: 'bg-cyan-100 text-cyan-700',
    desc: '外部系统连接 — MCP 服务器提供外部工具，插件打包技能+钩子+MCP 供团队复用',
  },
  {
    id: 'multiagent',
    num: 5,
    name: '多智能体层',
    en: 'Multi-Agent',
    icon: '🤖',
    color: 'orange',
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    tagBg: 'bg-orange-100 text-orange-700',
    desc: '任务委派与隔离 — 子代理在独立上下文窗口运行，返回摘要避免上下文膨胀',
  },
  {
    id: 'observability',
    num: 6,
    name: '可观测层',
    en: 'Observability',
    icon: '🔗',
    color: 'red',
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    tagBg: 'bg-red-100 text-red-700',
    desc: '确定性控制与审计 — 钩子在固定生命周期点触发，不消耗模型上下文',
  },
]

const BUILTIN_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'Agent', 'TodoWrite', 'NotebookEdit']
const BUILTIN_SUBAGENTS = [
  { name: 'Explore', desc: '快速只读搜索，用于定位代码符号和文件' },
  { name: 'Plan', desc: '设计实现方案，只读探索不修改文件' },
  { name: 'general-purpose', desc: '通用研究与多步骤任务执行' },
  { name: 'claude-code-guide', desc: 'Claude Code 使用问答与文档查询' },
]

const SKILL_CATEGORIES = {
  '代码质量': ['code-review', 'code-simplification', 'critical-code-reviewer', 'review-testing', 'tdd', 'test-driven'],
  '调试诊断': ['debugging', 'diagnose', 'postmortem', 'error-recovery', 'causal-inference'],
  '决策分析': ['decision-matrix', 'bayesian', 'expected-value', 'prioritization', 'evaluation-rubric', 'heuristics'],
  '创意思维': ['brainstorm', 'constraint-based-creativity', 'morphological', 'consciousness-council', 'synthesis-analogy'],
  '安全审计': ['security', 'hardening', 'ethics-safety', 'doubt-driven'],
  '架构设计': ['architecture', 'decomposition', 'systems-thinking', 'incremental-implementation', 'improve-codebase'],
  '研究学习': ['research', 'inspectional-reading', 'paper-three-pass', 'socratic', 'memory-retrieval'],
  '项目管理': ['planning', 'focus-timeboxing', 'kill-criteria', 'forecast-premortem', 'estimation-fermi'],
}

function classifySkills(skills) {
  const result = {}
  for (const [cat, keywords] of Object.entries(SKILL_CATEGORIES)) {
    const matched = skills.filter(s => {
      const nameDesc = (s.name + ' ' + s.description).toLowerCase()
      return keywords.some(kw => nameDesc.includes(kw))
    })
    if (matched.length > 0) result[cat] = matched.length
  }
  return result
}

function generateProfile(data) {
  const lines = []

  const skillCount = data.skills.length
  const memCount = data.memories.length
  const mdCount = data.claudeMd.length
  if (mdCount > 0 || skillCount > 0 || memCount > 0) {
    const parts = []
    if (mdCount > 0) parts.push(`${mdCount} 个 CLAUDE.md 指令文件`)
    if (skillCount > 0) parts.push(`${skillCount} 个技能`)
    if (memCount > 0) parts.push(`${memCount} 条跨会话记忆`)
    lines.push({ label: '知识武装', text: `已加载 ${parts.join('、')}，为 Agent 提供持久化的专业知识和行为指令。` })
  }

  const pluginEnabled = data.plugins.filter(p => p.enabled).length
  const mcpCount = data.mcp.length
  const parts2 = []
  if (data.plugins.length > 0) parts2.push(`${data.plugins.length} 个插件（${pluginEnabled} 个启用）`)
  if (mcpCount > 0) parts2.push(`${mcpCount} 个 MCP 外部服务器`)
  if (parts2.length > 0) {
    lines.push({ label: '工具集成', text: `配置了 ${parts2.join('，')}${mcpCount === 0 ? '，暂无 MCP 外部服务器连接' : ''}。` })
  } else {
    lines.push({ label: '工具集成', text: '尚未配置插件或 MCP 服务器，可在对应页面添加。' })
  }

  const allowCount = data.permissions.totalAllow
  const denyCount = data.permissions.totalDeny
  const hookCount = data.hooks.summary.length
  const permParts = []
  if (allowCount + denyCount > 0) permParts.push(`${allowCount + denyCount} 条权限规则（${allowCount} 允许 / ${denyCount} 拒绝）`)
  if (hookCount > 0) permParts.push(`${hookCount} 个钩子实现工具调用审计和自动化流程`)
  if (permParts.length > 0) {
    lines.push({ label: '安全管控', text: `共 ${permParts.join('，通过 ')}。` })
  }

  return lines
}

function LayerOverview({ layer, stats }) {
  const items = []
  switch (layer.id) {
    case 'input':
      items.push(`${stats.permissions.totalAllow + stats.permissions.totalDeny} 条权限规则`)
      items.push(`${stats.permissions.totalAllow} 允许 / ${stats.permissions.totalDeny} 拒绝`)
      break
    case 'knowledge':
      items.push(`CLAUDE.md ${stats.claudeMd.length} 个`)
      items.push(`技能 ${stats.skills.length} 个`)
      items.push(`记忆 ${stats.memories.length} 条`)
      break
    case 'execution':
      items.push(`${BUILTIN_TOOLS.length} 个内置工具`)
      items.push(`模型 ${stats.settings.model || '默认'}`)
      break
    case 'integration':
      items.push(`MCP ${stats.mcp.length} 个`)
      items.push(`插件 ${stats.plugins.length} 个 (${stats.plugins.filter(p => p.enabled).length} 启用)`)
      break
    case 'multiagent':
      items.push(`${BUILTIN_SUBAGENTS.length} 种内置子代理`)
      items.push('工作树隔离')
      break
    case 'observability':
      items.push(`${stats.hooks.events.length} 个事件`)
      items.push(`${stats.hooks.summary.length} 条钩子规则`)
      break
  }
  return items
}

function LayerDetail({ layer, data }) {
  switch (layer.id) {
    case 'input':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-green-600 font-semibold mb-2 uppercase">允许 ({data.permissions.totalAllow})</p>
            {data.permissions.allow.length === 0 ? (
              <p className="text-[12px] text-gray-400">无</p>
            ) : (
              <div className="space-y-1">
                {data.permissions.allow.slice(0, 8).map((r, i) => (
                  <code key={i} className="block text-[11px] text-gray-600 bg-green-50 px-2 py-1 rounded truncate">{r}</code>
                ))}
                {data.permissions.totalAllow > 8 && <p className="text-[11px] text-gray-400">+{data.permissions.totalAllow - 8} 条...</p>}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] text-red-600 font-semibold mb-2 uppercase">拒绝 ({data.permissions.totalDeny})</p>
            {data.permissions.deny.length === 0 ? (
              <p className="text-[12px] text-gray-400">无</p>
            ) : (
              <div className="space-y-1">
                {data.permissions.deny.slice(0, 8).map((r, i) => (
                  <code key={i} className="block text-[11px] text-gray-600 bg-red-50 px-2 py-1 rounded truncate">{r}</code>
                ))}
                {data.permissions.totalDeny > 8 && <p className="text-[11px] text-gray-400">+{data.permissions.totalDeny - 8} 条...</p>}
              </div>
            )}
          </div>
        </div>
      )

    case 'knowledge':
      return (
        <div className="space-y-4">
          {data.claudeMd.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">CLAUDE.md 文件</p>
              <div className="space-y-2">
                {data.claudeMd.map((md, i) => (
                  <div key={i} className="bg-purple-50/50 rounded-lg px-3 py-2">
                    <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">{md.label}</span>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{md.preview}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">技能 ({data.skills.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.slice(0, 20).map(s => (
                <span key={s.name} className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md">{s.name}</span>
              ))}
              {data.skills.length > 20 && <span className="text-[11px] text-gray-400 px-1">+{data.skills.length - 20}</span>}
            </div>
          </div>
          {data.memories.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">记忆 ({data.memories.length})</p>
              <div className="space-y-1">
                {data.memories.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="font-medium text-gray-700">{m.name}</span>
                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">{m.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )

    case 'execution':
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">内置工具</p>
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_TOOLS.map(t => (
                <span key={t} className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-mono">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">运行参数</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-gray-500">模型</span>
                <span className="text-gray-700 font-mono">{data.settings.model || '(默认)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">编辑器</span>
                <span className="text-gray-700">{data.settings.editorMode || 'normal'}</span>
              </div>
              {data.settings.effortLevel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">努力程度</span>
                  <span className="text-gray-700">{data.settings.effortLevel}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">自动记忆</span>
                <span className={data.settings.autoMemoryEnabled ? 'text-green-600' : 'text-gray-400'}>
                  {data.settings.autoMemoryEnabled ? '启用' : '禁用'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'integration':
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">MCP 服务器 ({data.mcp.length})</p>
            {data.mcp.length === 0 ? (
              <p className="text-[12px] text-gray-400">未配置 MCP 服务器 —— <Link to="/mcp" className="text-blue-500 hover:underline">前往添加</Link></p>
            ) : (
              <div className="space-y-1.5">
                {data.mcp.map(m => (
                  <div key={`${m.name}-${m.scope}`} className="flex items-center gap-2 text-[12px]">
                    <span className="font-medium text-gray-700">{m.name}</span>
                    <span className="text-[10px] bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">{m.type}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{m.scope === 'user' ? '全局' : '项目'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">插件 ({data.plugins.length})</p>
            {data.plugins.length === 0 ? (
              <p className="text-[12px] text-gray-400">未安装插件 —— <Link to="/plugins" className="text-blue-500 hover:underline">前往管理</Link></p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.plugins.map(p => (
                  <span key={p.name} className={`text-[11px] px-2 py-0.5 rounded-md ${p.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )

    case 'multiagent':
      return (
        <div>
          <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">内置子代理类型</p>
          <div className="space-y-2">
            {BUILTIN_SUBAGENTS.map(sa => (
              <div key={sa.name} className="flex items-start gap-3 text-[12px]">
                <span className="font-mono font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded shrink-0">{sa.name}</span>
                <span className="text-gray-500">{sa.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            子代理在独立上下文窗口中运行，完成后只返回摘要结果给主会话，有效防止上下文膨胀。支持 <code className="text-gray-500">-w</code> 标志使用 git worktree 进行文件隔离。
          </div>
        </div>
      )

    case 'observability':
      return (
        <div>
          <p className="text-[11px] text-gray-500 font-semibold mb-2 uppercase">钩子配置 ({data.hooks.summary.length} 条)</p>
          {data.hooks.summary.length === 0 ? (
            <p className="text-[12px] text-gray-400">未配置钩子 —— <Link to="/hooks" className="text-blue-500 hover:underline">前往添加</Link></p>
          ) : (
            <div className="space-y-1.5">
              {data.hooks.summary.slice(0, 10).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="text-red-600 font-medium shrink-0">{h.event}</span>
                  {h.matcher && <span className="text-gray-400 text-[11px]">({h.matcher})</span>}
                  <span className="text-gray-300">→</span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{h.type}</span>
                  <span className="text-gray-500 truncate text-[11px]">{h.command}</span>
                </div>
              ))}
              {data.hooks.summary.length > 10 && <p className="text-[11px] text-gray-400">+{data.hooks.summary.length - 10} 条...</p>}
            </div>
          )}
          <div className="mt-3 text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            钩子与技能不同：技能由模型自主选择调用，钩子在固定生命周期点<b className="text-gray-500">确定性触发</b>，不消耗模型 token。
          </div>
        </div>
      )
    default:
      return null
  }
}

const WORKFLOW_STEPS = [
  { skill: 'brainstorming', label: '头脑风暴', desc: '探索需求，验证设计' },
  { skill: 'writing-plans', label: '编写计划', desc: '分解为可执行的小任务' },
  { skill: 'executing-plans', label: '执行计划', desc: '逐步实现，检查点审查' },
  { skill: 'test-driven-development', label: 'TDD', desc: '红-绿-重构循环' },
  { skill: 'verification-before-completion', label: '验证完成', desc: '证据先于声明' },
]

function WorkflowSection({ skills }) {
  const installedNames = skills.map(s => s.name)
  const hasAny = WORKFLOW_STEPS.some(s => installedNames.includes(s.skill))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔄</span>
        <h3 className="text-[15px] font-semibold text-gray-900">推荐工作流</h3>
      </div>
      <p className="text-[12px] text-gray-400 mb-5">
        基于 <a href="https://github.com/obra/superpowers" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Superpowers</a> 方法论的最佳实践流程
      </p>

      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {WORKFLOW_STEPS.map((step, i) => {
          const installed = installedNames.includes(step.skill)
          return (
            <div key={step.skill} className="flex items-center shrink-0">
              <div className={`px-4 py-3 rounded-xl border-2 transition-all min-w-[120px] text-center ${
                installed
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <p className={`text-[13px] font-medium ${installed ? 'text-blue-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className={`text-[11px] mt-0.5 ${installed ? 'text-blue-500' : 'text-gray-300'}`}>
                  {step.desc}
                </p>
                {installed ? (
                  <span className="inline-block mt-1.5 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">已安装</span>
                ) : (
                  <span className="inline-block mt-1.5 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">未安装</span>
                )}
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <svg className="w-5 h-5 text-gray-300 mx-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {!hasAny && (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-[12px] text-amber-700">
          你尚未安装 Superpowers 技能包。前往 <Link to="/skills" className="text-blue-600 hover:underline font-medium">技能页面</Link> 点击安装，输入 https://github.com/obra/superpowers 即可获取完整方法论。
        </div>
      )}
    </div>
  )
}

export default function HarnessPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    fetch('/api/overview/harness')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const reload = () => {
    setLoading(true)
    fetch('/api/overview/harness')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-red-500">加载失败</div>

  const profile = generateProfile(data)
  const categories = classifySkills(data.skills)

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-semibold text-gray-900">Harness 架构</h2>
          <button
            onClick={reload}
            className="text-[13px] px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            刷新
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Claude Code 的 6 层运行时架构 — Harness 是模型之外的一切：配置、权限、工具、钩子共同决定 Agent 能做什么
        </p>

        {/* ===== 区域 A: 6 层架构全景图 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">架构全景</h3>
          <p className="text-[12px] text-gray-400 mb-5">请求从顶层输入，经过各层处理后执行 — 点击各层查看详情</p>

          <div className="space-y-0">
            {LAYERS.map((layer, idx) => {
              const items = LayerOverview({ layer, stats: data })
              return (
                <div key={layer.id}>
                  <button
                    onClick={() => toggle(layer.id)}
                    className={`w-full text-left border-l-4 ${layer.border} rounded-r-xl px-5 py-3.5 transition-all hover:shadow-sm ${
                      expanded[layer.id] ? layer.bg : 'bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{layer.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-gray-900">Layer {layer.num}</span>
                            <span className="text-[13px] font-semibold text-gray-900">{layer.name}</span>
                            <span className="text-[11px] text-gray-400 font-mono">{layer.en}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {items.map((item, i) => (
                            <span key={i} className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${layer.tagBg}`}>{item}</span>
                          ))}
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded[layer.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {expanded[layer.id] && (
                    <div className={`border-l-4 ${layer.border} ml-0 px-5 py-4 bg-white border-b border-gray-50`}>
                      <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">{layer.desc}</p>
                      <LayerDetail layer={layer} data={data} />
                    </div>
                  )}

                  {idx < LAYERS.length - 1 && (
                    <div className="flex justify-center py-1">
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== 区域 C: 能力画像 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎯</span>
            <h3 className="text-[15px] font-semibold text-gray-900">能力画像</h3>
          </div>
          <p className="text-[12px] text-gray-400 mb-5">根据当前 Harness 配置自动生成的能力评估</p>

          <div className="space-y-4">
            {profile.map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[12px] font-semibold text-gray-700 shrink-0 w-16 pt-0.5">{item.label}</span>
                <p className="text-[13px] text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {Object.keys(categories).length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[12px] text-gray-500 font-semibold mb-3">擅长领域（基于已安装技能分析）</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <span key={cat} className="text-[12px] bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-1 rounded-lg font-medium border border-blue-100/60">
                      {cat} <span className="text-blue-400 ml-0.5">({count})</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== 推荐工作流 ===== */}
        <WorkflowSection skills={data.skills} />

        {/* 快速导航 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-4">快速配置</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/skills', icon: '⚡', label: '管理技能', sublabel: `${data.skills.length} 个` },
              { to: '/hooks', icon: '🔗', label: '管理钩子', sublabel: `${data.hooks.summary.length} 条` },
              { to: '/plugins', icon: '🧩', label: '管理插件', sublabel: `${data.plugins.length} 个` },
              { to: '/mcp', icon: '🔌', label: 'MCP 服务器', sublabel: `${data.mcp.length} 个` },
              { to: '/permissions', icon: '🔐', label: '权限规则', sublabel: `${data.permissions.totalAllow + data.permissions.totalDeny} 条` },
              { to: '/config', icon: '📝', label: '配置文件', sublabel: 'CLAUDE.md' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <span className="text-[13px] text-gray-700 font-medium block">{item.label}</span>
                  <span className="text-[11px] text-gray-400">{item.sublabel}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
