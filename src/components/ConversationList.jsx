import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

export default function ConversationList() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
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

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  const grouped = conversations.reduce((acc, conv) => {
    const key = conv.project || '未知项目'
    if (!acc[key]) acc[key] = []
    acc[key].push(conv)
    return acc
  }, {})

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">对话</h2>
        <p className="text-gray-500 text-sm mb-6">共 {conversations.length} 条对话，分布于 {Object.keys(grouped).length} 个项目</p>

        {Object.entries(grouped).map(([project, convs]) => (
          <div key={project} className="mb-8">
            <h3 className="text-[13px] font-medium text-gray-500 mb-3 font-mono flex items-center gap-2">
              <span className="text-gray-400">📁</span>
              {project}
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
        ))}
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
