import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

const EVENT_META = {
  Setup:              { desc: '初始化/维护时触发', detail: '使用 --init-only 或 -p 模式的 --init/--maintenance 时触发。可用于初始化环境、安装依赖。', icon: '🔧', group: '会话生命周期', matcher: 'init | maintenance' },
  SessionStart:       { desc: '会话开始或恢复时触发', detail: '当用户启动新会话、恢复会话、清除上下文或压缩上下文时触发。可用于初始化环境、加载项目配置。支持 reloadSkills: true 动态加载技能、sessionTitle 设置会话标题、initialUserMessage 注入首条消息、watchPaths 监视文件变更。', icon: '▶️', group: '会话生命周期', matcher: 'startup | resume | clear | compact' },
  SessionEnd:         { desc: '会话结束时触发', detail: '当 Claude Code 会话正常退出时触发。支持匹配退出原因。可用于清理临时文件、保存会话摘要。', icon: '⏹️', group: '会话生命周期', matcher: 'clear | resume | logout | ...' },
  UserPromptSubmit:   { desc: '用户提交提示词时触发', detail: '在用户输入内容并按回车发送给 Claude 之前触发。可用于对输入做预处理、添加上下文或拦截特定指令。支持 exit 2 阻止发送。', icon: '💬', group: '用户输入', canBlock: true },
  UserPromptExpansion:{ desc: '斜杠命令展开时触发', detail: '当用户使用 / 命令（Skill）时，在命令展开前触发。可用于修改或拦截 Skill 调用。支持 exit 2 阻止。', icon: '⚡', group: '用户输入', canBlock: true },
  PreToolUse:         { desc: '工具执行前触发', detail: '在 Claude 调用任何工具（Bash、Read、Edit 等）之前运行。可用于拦截危险操作、添加审批流程。支持 exit 2 阻止执行。', icon: '⚠️', group: '工具生命周期', matcher: '工具名称', canBlock: true },
  PostToolUse:        { desc: '工具执行成功后触发', detail: '在工具执行完成并返回结果后运行。可用于记录输出、发送通知，或根据结果做后续处理。', icon: '✅', group: '工具生命周期', matcher: '工具名称' },
  PostToolUseFailure: { desc: '工具执行失败后触发', detail: '当工具执行出错时触发。可用于记录错误、触发备用方案或通知用户。', icon: '❌', group: '工具生命周期', matcher: '工具名称' },
  PostToolBatch:      { desc: '批量工具调用完成后触发', detail: '当一批并行工具调用全部完成后触发。可用于汇总批量结果或做批后校验。支持 exit 2 阻止。', icon: '📦', group: '工具生命周期', canBlock: true },
  PermissionRequest:  { desc: '请求权限时触发', detail: '当 Claude 需要获取用户授权才能执行操作时触发。可用于自动批准特定操作或添加额外安全检查。支持 exit 2 阻止。', icon: '🔐', group: '权限', matcher: '工具名称', canBlock: true },
  PermissionDenied:   { desc: '权限被拒绝时触发', detail: '当工具调用被 auto mode 自动拒绝时触发（注意：非用户手动拒绝）。可用于记录日志或触发替代方案。', icon: '🚫', group: '权限', matcher: '工具名称' },
  Stop:               { desc: 'Claude 停止生成时触发', detail: '当 Claude 完成一轮回复、停止生成时触发。常用于在每次对话结束后执行检查清单、自动保存进度或发送通知。支持 exit 2 阻止。', icon: '🛑', group: '回复生命周期', canBlock: true },
  StopFailure:        { desc: '回复因 API 错误终止时触发', detail: '当 Claude 的回复因 API 错误（速率限制、网络等）而终止时触发。可用于错误监控和告警。', icon: '💥', group: '回复生命周期', matcher: '错误类型' },
  MessageDisplay:     { desc: '消息显示到终端时触发（仅展示层）', detail: '当 Claude 的文本消息显示到终端时触发。通过 displayContent 替换显示内容，但不影响 transcript 和模型上下文。不可阻止（cannot block）。可用于消息转发或格式化处理。', icon: '📺', group: '回复生命周期' },
  SubagentStart:      { desc: '子代理启动时触发', detail: '当 Claude 创建子代理（Agent tool）去并行处理任务时触发。可用于跟踪子代理活动或限制并发数。', icon: '🤖', group: '子代理', matcher: '代理类型' },
  SubagentStop:       { desc: '子代理完成时触发', detail: '当子代理完成任务并返回结果时触发。可用于汇总子代理的工作结果或发送完成通知。支持 exit 2 阻止。', icon: '🏁', group: '子代理', matcher: '代理类型', canBlock: true },
  TaskCreated:        { desc: '任务创建时触发', detail: '当通过 TaskCreate 创建后台任务时触发。支持 exit 2 阻止。', icon: '📝', group: '任务', canBlock: true },
  TaskCompleted:      { desc: '任务完成时触发', detail: '当后台任务标记为完成时触发。支持 exit 2 阻止。', icon: '✔️', group: '任务', canBlock: true },
  TeammateIdle:       { desc: '团队代理即将空闲时触发', detail: '当 Agent 团队中的某个代理即将进入空闲状态时触发。支持 exit 2 阻止。', icon: '💤', group: '团队', canBlock: true },
  PreCompact:         { desc: '上下文压缩前触发', detail: '在对话上下文即将被压缩（因超出 token 限制）前触发。可用于在压缩前保存关键信息或更新记忆文件。支持 exit 2 阻止。', icon: '🗜️', group: '上下文', canBlock: true },
  PostCompact:        { desc: '上下文压缩后触发', detail: '在上下文压缩完成后触发。可用于验证压缩结果或补充丢失的关键上下文。', icon: '📐', group: '上下文' },
  Elicitation:        { desc: 'MCP 请求用户输入时触发', detail: '当 MCP 服务器通过 elicitation 请求用户输入时触发。支持 exit 2 阻止。', icon: '❓', group: 'MCP', canBlock: true },
  ElicitationResult:  { desc: '用户响应 MCP 输入后触发', detail: '当用户响应 MCP elicitation 请求后触发。支持 exit 2 阻止。', icon: '💡', group: 'MCP', canBlock: true },
  InstructionsLoaded: { desc: 'CLAUDE.md/规则文件加载时触发', detail: '当 CLAUDE.md 或 .claude/rules/*.md 文件被加载到上下文时触发。可用于动态注入额外指令。', icon: '📖', group: '配置', matcher: '加载原因' },
  ConfigChange:       { desc: '配置文件变更时触发', detail: '当 settings.json、CLAUDE.md 等配置文件在磁盘上发生变化时触发。支持 exit 2 阻止。', icon: '⚙️', group: '配置', matcher: '配置来源', canBlock: true },
  CwdChanged:         { desc: '工作目录变更时触发', detail: '当 Claude Code 的当前工作目录发生变化时触发。可用于自动加载新目录的配置。', icon: '📂', group: '配置' },
  FileChanged:        { desc: '被监视的文件变更时触发', detail: '当被监视的文件在磁盘上发生变化时触发。matcher 指定要监视的文件名（字面值）。', icon: '👁️', group: '配置', matcher: '文件名（字面值）' },
  WorktreeCreate:     { desc: 'Worktree 创建时触发', detail: '当 Claude 创建 git worktree 时触发。可用于在非 git 仓库中实现自定义隔离。支持 exit 2 阻止。', icon: '🌳', group: 'Git', canBlock: true },
  WorktreeRemove:     { desc: 'Worktree 移除时触发', detail: '当 git worktree 被移除时触发。可用于清理关联资源。', icon: '🪓', group: 'Git' },
  Notification:       { desc: '通知事件触发', detail: '在系统发送通知时触发（如后台任务完成）。可用于将通知转发到其他渠道（Slack、邮件）或自定义通知行为。', icon: '🔔', group: '事件', matcher: '通知类型' },
}

const ALL_EVENTS = Object.keys(EVENT_META)
const HOOK_TYPES = [
  { value: 'command', label: 'command — 执行 Shell 命令', desc: '运行本地 Shell 命令或脚本' },
  { value: 'http', label: 'http — 发送 HTTP 请求', desc: '向指定 URL 发 POST 请求' },
  { value: 'mcp_tool', label: 'mcp_tool — 调用 MCP 工具', desc: '调用已配置的 MCP 服务器工具' },
  { value: 'prompt', label: 'prompt — 提示词评估', desc: '用小模型评估提示词并返回结果' },
  { value: 'agent', label: 'agent — 子代理执行', desc: '启动子代理处理任务（可用 Read/Grep/Glob）' },
]

function extractCommandName(hook) {
  if (hook.type === 'http') return hook.url || 'HTTP'
  if (hook.type === 'mcp_tool') return `${hook.server}/${hook.tool}`
  if (hook.type === 'prompt' || hook.type === 'agent') return (hook.prompt || '').slice(0, 40) || hook.type
  const cmd = hook.command || ''
  if (cmd.includes('vibe-island-bridge')) return 'vibe-island-bridge'
  if (cmd.includes('stop-checklist')) return 'stop-checklist.sh'
  const match = cmd.match(/(?:\/([^\/\s"]+))\s*$/) || cmd.match(/\/([^\/\s"]+)["']?\s*$/)
  if (match) return match[1]
  return cmd.length > 50 ? cmd.slice(0, 47) + '...' : cmd
}

function hookTypeLabel(type) {
  const map = { command: '执行命令', http: 'HTTP 请求', mcp_tool: 'MCP 工具', prompt: '提示词', agent: '子代理' }
  return map[type] || type
}

export default function HookPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ event: 'PreToolUse', matcher: '', type: 'command', command: '', url: '', server: '', tool: '', prompt: '', timeout: '' })
  const toast = useToast()

  const load = () => {
    fetch('/api/hooks')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const hook = { type: form.type }
    if (form.type === 'command') {
      if (!form.command.trim()) return
      hook.command = form.command
    } else if (form.type === 'http') {
      if (!form.url.trim()) return
      hook.url = form.url
    } else if (form.type === 'mcp_tool') {
      if (!form.server.trim() || !form.tool.trim()) return
      hook.server = form.server
      hook.tool = form.tool
    } else if (form.type === 'prompt' || form.type === 'agent') {
      if (!form.prompt.trim()) return
      hook.prompt = form.prompt
    }
    if (form.timeout) hook.timeout = parseInt(form.timeout, 10)

    const res = await fetch('/api/hooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: form.event,
        matcher: form.matcher || undefined,
        hooks: [hook]
      })
    })
    if (res.ok) {
      toast('Hook 已添加', 'success')
      setShowAdd(false)
      setForm({ event: 'PreToolUse', matcher: '', type: 'command', command: '', url: '', server: '', tool: '', prompt: '', timeout: '' })
      load()
    } else {
      toast('添加失败', 'error')
    }
  }

  const handleDelete = async (event, index) => {
    const res = await fetch(`/api/hooks/${event}/${index}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已删除', 'success')
      setSelectedEvent(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  const handleDeleteScript = async (name) => {
    const res = await fetch(`/api/hooks/scripts/${name}`, { method: 'DELETE' })
    if (res.ok) {
      toast('脚本已删除', 'success')
      setSelectedEvent(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-gray-500">暂无钩子数据</div>

  const hookGroups = {}
  Object.entries(data.hooks).forEach(([event, configs]) => {
    const group = EVENT_META[event]?.group || '其他'
    if (!hookGroups[group]) hookGroups[group] = []
    hookGroups[group].push({ event, configs })
  })

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[300px] min-w-[260px] border-r border-gray-200/60 flex flex-col bg-white/60 backdrop-blur-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">钩子</h2>
            <button onClick={() => setShowAdd(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              + 新增
            </button>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-2">
            钩子在 Claude Code 生命周期事件中自动执行，可拦截工具调用、添加自动化流程或集成外部系统。
          </p>
          <div className="flex gap-4 text-[13px] text-gray-500">
            <span><b className="text-gray-700">{Object.keys(data.hooks).length}</b> 事件</span>
            <span><b className="text-gray-700">{data.hookScripts?.length || 0}</b> 脚本</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(hookGroups).map(([group, events]) => (
            <div key={group} className="mb-2">
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{group}</div>
              <div className="space-y-0.5">
                {events.map(({ event, configs }) => {
                  const meta = EVENT_META[event] || {}
                  const hookCount = configs.reduce((sum, c) => sum + (c.hooks?.length || 0), 0)
                  return (
                    <button
                      key={event}
                      onClick={() => setSelectedEvent({ type: 'hook', event, configs, meta })}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
                        selectedEvent?.event === event && selectedEvent?.type === 'hook'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100/80'
                      }`}
                    >
                      <span className="text-base leading-none">{meta.icon || '🔗'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-[13px]">{event}</span>
                        <span className={`block text-[11px] mt-0.5 truncate ${
                          selectedEvent?.event === event && selectedEvent?.type === 'hook' ? 'text-blue-100' : 'text-gray-400'
                        }`}>{meta.desc}</span>
                      </div>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        selectedEvent?.event === event && selectedEvent?.type === 'hook' ? 'bg-blue-400/30 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{hookCount}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {data.hookScripts?.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">钩子脚本</div>
              {data.hookScripts.map(script => (
                <button
                  key={script.name}
                  onClick={() => setSelectedEvent({ type: 'script', ...script })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
                    selectedEvent?.type === 'script' && selectedEvent?.name === script.name
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">📜</span>
                  <span className="truncate font-medium text-[13px]">{script.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        {selectedEvent ? (
          <div className="p-8 max-w-4xl">
            {selectedEvent.type === 'hook' && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">{selectedEvent.meta.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-gray-900">{selectedEvent.event}</h3>
                        {selectedEvent.meta.canBlock && (
                          <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">可阻止 (exit 2)</span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 mt-0.5">{selectedEvent.meta.desc}</p>
                      {selectedEvent.meta.detail && (
                        <p className="text-[13px] text-gray-600 mt-2 leading-relaxed bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100/60">{selectedEvent.meta.detail}</p>
                      )}
                      {selectedEvent.meta.matcher && (
                        <p className="text-[12px] text-gray-400 mt-2">Matcher 匹配: <code className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{selectedEvent.meta.matcher}</code></p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedEvent.configs.map((config, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        {config.matcher && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase text-gray-400 font-semibold">匹配器</span>
                            <code className="text-[13px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{config.matcher}</code>
                          </div>
                        )}
                        {!config.matcher && <div />}
                        <button
                          onClick={() => setDeleteTarget({ event: selectedEvent.event, index: i })}
                          className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                        >
                          删除
                        </button>
                      </div>
                      <div className="space-y-3">
                        {config.hooks?.map((hook, j) => (
                          <div key={j} className="flex items-start gap-3 pl-4 border-l-2 border-blue-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{hookTypeLabel(hook.type)}</span>
                                <span className="text-[14px] text-gray-800 font-medium">{extractCommandName(hook)}</span>
                                {hook.timeout && <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">超时 {hook.timeout}s</span>}
                                {hook.async && <span className="text-[11px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">异步</span>}
                              </div>
                              <code className="text-[12px] text-gray-500 block break-all leading-relaxed bg-gray-50 rounded-lg px-3 py-2 mt-1">
                                {hook.command || hook.url || (hook.server ? `${hook.server} → ${hook.tool}` : hook.prompt) || ''}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedEvent.type === 'script' && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">📜</div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">{selectedEvent.name}</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">钩子脚本文件</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteScript(selectedEvent.name)}
                      className="text-[13px] text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-[13px] text-gray-400 font-mono">~/.claude/hooks/{selectedEvent.name}</span>
                  </div>
                  <pre className="text-[13px] text-gray-700 whitespace-pre-wrap p-5 leading-7 font-mono">{selectedEvent.content}</pre>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4 opacity-40">🔗</div>
              <p className="text-[15px] text-gray-600 font-medium mb-2">Claude Code 钩子系统</p>
              <p className="text-[13px] text-gray-400 leading-relaxed mb-4">
                钩子配置在 <code className="text-gray-500 bg-gray-100 px-1 rounded">~/.claude/settings.json</code> 的 hooks 字段中。
                支持 {ALL_EVENTS.length} 种生命周期事件，可执行 Shell 命令、HTTP 请求、MCP 工具调用等。
              </p>
              <div className="text-left bg-gray-50 rounded-xl p-4">
                <p className="text-[12px] text-gray-500 font-medium mb-2">退出码含义：</p>
                <ul className="text-[12px] text-gray-500 space-y-1 leading-relaxed">
                  <li>• <b className="text-gray-600">exit 0</b> — 成功，stdout 作为 JSON 输出解析</li>
                  <li>• <b className="text-gray-600">exit 2</b> — 阻止操作，stderr 反馈为错误信息</li>
                  <li>• <b className="text-gray-600">其他</b> — 非阻塞错误，仅记录日志</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Hook Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增钩子">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">事件类型</label>
            <select
              value={form.event}
              onChange={e => setForm(f => ({...f, event: e.target.value}))}
              className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {ALL_EVENTS.map(ev => (
                <option key={ev} value={ev}>{ev} — {EVENT_META[ev].desc}</option>
              ))}
            </select>
            {EVENT_META[form.event]?.canBlock && (
              <p className="text-[11px] text-orange-600 mt-1">此事件支持 exit 2 阻止操作</p>
            )}
          </div>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">匹配器 (可选)</label>
            <input
              value={form.matcher}
              onChange={e => setForm(f => ({...f, matcher: e.target.value}))}
              className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
              placeholder={EVENT_META[form.event]?.matcher || '留空匹配全部'}
            />
            <p className="text-[11px] text-gray-400 mt-1">支持精确值、竖线分隔 (Bash|Edit) 或正则表达式</p>
          </div>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">钩子类型</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({...f, type: e.target.value}))}
              className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {HOOK_TYPES.map(ht => (
                <option key={ht.value} value={ht.value}>{ht.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">{HOOK_TYPES.find(h => h.value === form.type)?.desc}</p>
          </div>

          {form.type === 'command' && (
            <div>
              <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">Shell 命令</label>
              <textarea
                value={form.command}
                onChange={e => setForm(f => ({...f, command: e.target.value}))}
                rows={3}
                className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder:text-gray-400"
                placeholder='bash ~/.claude/hooks/my-hook.sh "$TOOL_INPUT"'
              />
            </div>
          )}
          {form.type === 'http' && (
            <div>
              <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">URL</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({...f, url: e.target.value}))}
                className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
                placeholder="https://hooks.example.com/claude"
              />
            </div>
          )}
          {form.type === 'mcp_tool' && (
            <>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">MCP 服务器名称</label>
                <input
                  value={form.server}
                  onChange={e => setForm(f => ({...f, server: e.target.value}))}
                  className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
                  placeholder="my-mcp-server"
                />
              </div>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">工具名称</label>
                <input
                  value={form.tool}
                  onChange={e => setForm(f => ({...f, tool: e.target.value}))}
                  className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
                  placeholder="validate_code"
                />
              </div>
            </>
          )}
          {(form.type === 'prompt' || form.type === 'agent') && (
            <div>
              <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">提示词</label>
              <textarea
                value={form.prompt}
                onChange={e => setForm(f => ({...f, prompt: e.target.value}))}
                rows={3}
                className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder:text-gray-400"
                placeholder="检查工具调用是否符合安全策略..."
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">超时 (秒，可选)</label>
            <input
              value={form.timeout}
              onChange={e => setForm(f => ({...f, timeout: e.target.value}))}
              type="number"
              className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
              placeholder={form.type === 'command' ? '默认 600' : form.type === 'prompt' ? '默认 30' : '默认 60'}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium">取消</button>
            <button
              onClick={handleAdd}
              disabled={
                (form.type === 'command' && !form.command.trim()) ||
                (form.type === 'http' && !form.url.trim()) ||
                (form.type === 'mcp_tool' && (!form.server.trim() || !form.tool.trim())) ||
                ((form.type === 'prompt' || form.type === 'agent') && !form.prompt.trim())
              }
              className="px-4 py-2 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget?.event, deleteTarget?.index)}
        title="删除 Hook 配置"
        message="确定要删除此 Hook 配置吗？将从 settings.json 中移除对应条目。"
        confirmText="删除"
        danger
      />
    </div>
  )
}
