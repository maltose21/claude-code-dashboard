import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

const TIME_FILTERS = [
  { key: 'all', label: '全部' },
  { key: '24h', label: '24小时', ms: 86400000 },
  { key: '7d', label: '7天', ms: 604800000 },
  { key: '30d', label: '30天', ms: 2592000000 },
]

export default function ConversationList() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const toast = useToast()

  const load = () => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(data => { setConversations(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast('对话已删除', 'success')
        load()
      } else {
        toast('删除失败', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    }
  }

  const handleExport = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`/api/conversations/${id}/export`)
      const result = await res.json()
      if (res.ok) {
        const blob = new Blob([result.markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast('已导出', 'success')
      }
    } catch {
      toast('导出失败', 'error')
    }
  }

  const filtered = useMemo(() => {
    let result = conversations
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.summary?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.project?.toLowerCase().includes(q)
      )
    }
    if (timeFilter !== 'all') {
      const tf = TIME_FILTERS.find(t => t.key === timeFilter)
      if (tf?.ms) {
        const cutoff = Date.now() - tf.ms
        result = result.filter(c => c.startTime && new Date(c.startTime).getTime() > cutoff)
      }
    }
    return result
  }, [conversations, search, timeFilter])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  const grouped = filtered.reduce((acc, conv) => {
    const key = conv.project || '未知项目'
    if (!acc[key]) acc[key] = []
    acc[key].push(conv)
    return acc
  }, {})

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">对话</h2>
        <p className="text-gray-500 text-sm mb-6">共 {conversations.length} 条对话，分布于 {new Set(conversations.map(c => c.project)).size} 个项目</p>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索对话内容、项目名..."
              className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            {TIME_FILTERS.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeFilter(tf.key)}
                className={`px-3 py-2.5 text-[12px] font-medium transition-colors ${
                  timeFilter === tf.key
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count when filtering */}
        {(search || timeFilter !== 'all') && (
          <p className="text-[12px] text-gray-400 mb-4">
            找到 {filtered.length} 条结果
            {search && <span>，关键词: "{search}"</span>}
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search || timeFilter !== 'all' ? '没有匹配的对话' : '暂无对话记录'}
          </div>
        ) : (
          Object.entries(grouped).map(([project, convs]) => (
            <div key={project} className="mb-8">
              <h3 className="text-[13px] font-medium text-gray-500 mb-3 font-mono flex items-center gap-2">
                <span className="text-gray-400">📁</span>
                {project}
                <span className="text-gray-300 text-[11px]">({convs.length})</span>
              </h3>
              <div className="space-y-2">
                {convs.map(conv => (
                  <div key={conv.id} className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <Link
                      to={`/conversations/${conv.id}`}
                      className="block p-5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-gray-400">{conv.id.slice(0, 8)}...</span>
                        <span className="text-xs text-gray-400">
                          {conv.startTime ? new Date(conv.startTime).toLocaleString('zh-CN') : '无时间'}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 truncate font-medium pr-24">{conv.summary || '(无摘要)'}</p>
                      <div className="flex gap-5 mt-2 text-xs text-gray-400">
                        <span>{conv.messageCount} 条消息</span>
                        <span>{conv.totalLines} 行</span>
                        {conv.version && <span>v{conv.version}</span>}
                      </div>
                    </Link>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                      <button
                        onClick={(e) => handleExport(conv.id, e)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                        title="导出 Markdown"
                      >
                        📥
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(conv.id) }}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors"
                        title="删除对话"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="删除对话"
        message="确定要删除此对话记录吗？删除的是 .jsonl 历史文件。如果该对话对应当前正在运行的 Claude Code 窗口，删除后上下文压缩时将无法恢复之前的对话内容。已结束的对话可安全删除，此操作不可撤销。"
        confirmText="删除"
        danger
      />
    </div>
  )
}
