import { useState, useEffect, useRef, useMemo } from 'react'
import { useToast } from './ui/Toast'

const EVENT_META = {
  Setup:              { icon: '🔧', desc: '初始化' },
  SessionStart:       { icon: '▶️', desc: '会话开始' },
  SessionEnd:         { icon: '⏹️', desc: '会话结束' },
  UserPromptSubmit:   { icon: '💬', desc: '用户提交' },
  UserPromptExpansion:{ icon: '⚡', desc: '命令展开' },
  PreToolUse:         { icon: '⚠️', desc: '工具执行前' },
  PostToolUse:        { icon: '✅', desc: '工具完成' },
  PostToolUseFailure: { icon: '❌', desc: '工具失败' },
  PostToolBatch:      { icon: '📦', desc: '批量完成' },
  PermissionRequest:  { icon: '🔐', desc: '请求权限' },
  PermissionDenied:   { icon: '🚫', desc: '权限拒绝' },
  Stop:               { icon: '🛑', desc: '生成停止' },
  StopFailure:        { icon: '💥', desc: '错误终止' },
  SubagentStart:      { icon: '🤖', desc: '子代理启动' },
  SubagentStop:       { icon: '🏁', desc: '子代理完成' },
  TaskCreated:        { icon: '📝', desc: '任务创建' },
  TaskCompleted:      { icon: '✔️', desc: '任务完成' },
  TeammateIdle:       { icon: '💤', desc: '代理空闲' },
  PreCompact:         { icon: '🗜️', desc: '压缩前' },
  PostCompact:        { icon: '📐', desc: '压缩后' },
  Elicitation:        { icon: '❓', desc: 'MCP 输入' },
  ElicitationResult:  { icon: '💡', desc: 'MCP 响应' },
  InstructionsLoaded: { icon: '📖', desc: '指令加载' },
  ConfigChange:       { icon: '⚙️', desc: '配置变更' },
  CwdChanged:         { icon: '📂', desc: '目录变更' },
  FileChanged:        { icon: '👁️', desc: '文件变更' },
  WorktreeCreate:     { icon: '🌳', desc: 'Worktree 创建' },
  WorktreeRemove:     { icon: '🪓', desc: 'Worktree 移除' },
  Notification:       { icon: '🔔', desc: '通知' },
}

function formatTime(ts) {
  if (!ts) return '--:--:--'
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

function getEvent(entry) {
  return entry.event || entry.stdin?.hook_event_name || ''
}

function stdinSummary(entry) {
  const stdin = entry.stdin
  if (!stdin || typeof stdin !== 'object') return ''
  const tool = entry.tool || stdin.tool_name || ''
  const detail = stdin.tool_input?.command?.slice(0, 60)
    || stdin.tool_input?.file_path
    || stdin.query?.slice(0, 60)
    || ''
  if (tool && detail) return `${tool} → ${detail}`
  return tool || detail
}

export default function HookLogPanel() {
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState({ enabled: false, events: [] })
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})
  const [autoScroll, setAutoScroll] = useState(true)
  const [connected, setConnected] = useState(false)
  const logRef = useRef(null)
  const eventSourceRef = useRef(null)
  const toast = useToast()

  const loadStatus = () => {
    fetch('/api/hooklog/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }

  const loadHistory = () => {
    fetch('/api/hooklog/history')
      .then(r => r.json())
      .then(data => setLogs(data.map((e, i) => ({ ...e, _id: i }))))
      .catch(() => {})
  }

  useEffect(() => {
    loadStatus()
    loadHistory()
  }, [])

  // SSE connection
  useEffect(() => {
    const es = new EventSource('/api/hooklog/stream')
    eventSourceRef.current = es
    let nextId = 10000

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'connected') {
          setConnected(true)
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, { ...data.entry, _id: nextId++ }])
        }
      } catch {}
    }

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleEnable = async () => {
    const res = await fetch('/api/hooklog/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: 'all' })
    })
    if (res.ok) {
      toast('已启用全部事件日志', 'success')
      loadStatus()
    } else {
      toast('启用失败', 'error')
    }
  }

  const handleDisable = async () => {
    const res = await fetch('/api/hooklog/disable', { method: 'POST' })
    if (res.ok) {
      toast('已禁用日志记录', 'success')
      loadStatus()
    } else {
      toast('禁用失败', 'error')
    }
  }

  const handleClear = async () => {
    const res = await fetch('/api/hooklog/clear', { method: 'POST' })
    if (res.ok) {
      setLogs([])
      toast('日志已清空', 'success')
    }
  }

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const eventTypes = useMemo(() => {
    const types = new Set(logs.map(l => getEvent(l)).filter(Boolean))
    return Array.from(types).sort()
  }, [logs])

  const filtered = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter(l => getEvent(l) === filter)
  }, [logs, filter])

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7]">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Hook 触发日志</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                实时监控 hook 事件触发情况
                <span className={`inline-flex items-center gap-1 ml-3 text-[11px] font-medium ${connected ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                  {connected ? '已连接' : '未连接'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="text-[12px] px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              >
                清空
              </button>
              {status.enabled ? (
                <button
                  onClick={handleDisable}
                  className="text-[12px] px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 font-medium transition-colors"
                >
                  停止记录
                </button>
              ) : (
                <button
                  onClick={handleEnable}
                  className="text-[12px] px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                >
                  启用全部事件
                </button>
              )}
            </div>
          </div>

          {/* Status bar */}
          {status.enabled && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[12px] text-green-700">
                正在记录 {status.events.length} 个事件
              </span>
              <span className="text-[11px] text-green-500 ml-auto">
                已捕获 {logs.length} 条日志
              </span>
            </div>
          )}

          {/* Filter chips */}
          {eventTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setFilter('all')}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  filter === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                全部 ({logs.length})
              </button>
              {eventTypes.map(ev => {
                const meta = EVENT_META[ev] || { icon: '📌', desc: ev }
                const count = logs.filter(l => getEvent(l) === ev).length
                return (
                  <button
                    key={ev}
                    onClick={() => setFilter(filter === ev ? 'all' : ev)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      filter === ev ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {meta.icon} {ev} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log stream */}
      <div className="flex-1 overflow-hidden px-8 pb-8">
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          <div
            ref={logRef}
            className="flex-1 bg-[#1e1e1e] rounded-2xl overflow-y-auto font-mono text-[12px] shadow-inner"
            onScroll={() => {
              if (!logRef.current) return
              const { scrollTop, scrollHeight, clientHeight } = logRef.current
              setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
            }}
          >
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-[13px] font-sans">
                {status.enabled
                  ? '等待 hook 触发...'
                  : '点击「启用全部事件」开始记录'}
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {filtered.map(entry => {
                  const ev = getEvent(entry)
                  const meta = EVENT_META[ev] || { icon: '📌', desc: ev || '?' }
                  const summary = stdinSummary(entry)
                  const isExpanded = expanded[entry._id]
                  return (
                    <div key={entry._id}>
                      <div
                        className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => entry.stdin && toggleExpand(entry._id)}
                      >
                        <span className="text-gray-500 whitespace-nowrap">{formatTime(entry.timestamp)}</span>
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-blue-400 font-medium whitespace-nowrap">{ev || 'unknown'}</span>
                        {entry.matcher && (
                          <span className="text-purple-400">[{entry.matcher}]</span>
                        )}
                        {summary && (
                          <span className="text-gray-400 truncate">{summary}</span>
                        )}
                        {entry.stdin && (
                          <span className="text-gray-600 ml-auto flex-shrink-0">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                      </div>
                      {isExpanded && entry.stdin && (
                        <div className="ml-16 mb-2 bg-white/5 rounded-lg p-3 text-[11px] text-gray-400 overflow-x-auto">
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(entry.stdin, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Auto-scroll indicator */}
          {!autoScroll && filtered.length > 0 && (
            <button
              onClick={() => {
                setAutoScroll(true)
                if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
              }}
              className="mt-2 text-[11px] text-center text-blue-500 hover:text-blue-600"
            >
              ↓ 跳到最新
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
