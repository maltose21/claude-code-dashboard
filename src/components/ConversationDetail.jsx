import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Modal from './ui/Modal'
import { useToast } from './ui/Toast'

export default function ConversationDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMemory, setShowMemory] = useState(false)
  const [memoryName, setMemoryName] = useState('')
  const [memoryContent, setMemoryContent] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetch(`/api/conversations/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleExportMd = async () => {
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
        toast('已导出 Markdown 文件', 'success')
      }
    } catch {
      toast('导出失败', 'error')
    }
  }

  const handleSaveMemory = async () => {
    if (!memoryName.trim() || !memoryContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/conversations/${id}/save-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: memoryName.trim(), content: memoryContent })
      })
      if (res.ok) {
        toast('已保存为记忆', 'success')
        setShowMemory(false)
        setMemoryName('')
        setMemoryContent('')
      } else {
        const err = await res.json()
        toast(err.error || '保存失败', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    }
    setSaving(false)
  }

  const prepareMemoryContent = () => {
    if (!data) return
    const summary = data.messages
      .filter(m => m.type === 'user')
      .map(m => m.content)
      .filter(Boolean)
      .slice(0, 3)
      .map(t => t.slice(0, 200))
      .join('\n')

    setMemoryContent(`---\nname: conversation-${id.slice(0, 8)}\ndescription: 从对话导出的记忆\nmetadata:\n  type: project\n---\n\n## 对话摘要\n\n${summary}\n\n## 关键信息\n\n（请编辑此处，提取对话中值得记住的关键信息）\n`)
    setMemoryName(`conv-${id.slice(0, 8)}`)
    setShowMemory(true)
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-red-500 text-[15px]">未找到该对话</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/conversations" className="text-blue-600 text-[13px] hover:text-blue-700 mb-2 inline-flex items-center gap-1 font-medium">
              &larr; 返回列表
            </Link>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">对话详情</h2>
            <p className="text-[13px] text-gray-500 font-mono mb-0.5">{data.project} / {id}</p>
            <p className="text-[13px] text-gray-400">共 {data.messages.length} 条消息</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportMd}
              className="text-[13px] px-4 py-2 rounded-lg font-medium transition-all border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm"
            >
              📥 导出 Markdown
            </button>
            <button
              onClick={prepareMemoryContent}
              className="text-[13px] px-4 py-2 rounded-lg font-medium transition-all border bg-blue-50 text-blue-600 border-blue-200/60 hover:bg-blue-100"
            >
              🧠 保存为记忆
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {data.messages.map((msg, i) => (
            <div
              key={msg.uuid || i}
              className={`rounded-2xl p-5 ${
                msg.type === 'user'
                  ? 'bg-blue-50 border border-blue-100'
                  : 'bg-white border border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                  msg.type === 'user' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {msg.type === 'user' ? '用户' : '助手'}
                </span>
                {msg.timestamp && (
                  <span className="text-[11px] text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                  </span>
                )}
              </div>
              <div className="text-[13px] text-gray-700 whitespace-pre-wrap break-words leading-7">
                {msg.content || '(空)'}
              </div>
              {msg.toolUse?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.toolUse.map((tool, j) => (
                    <span key={j} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">
                      {tool.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={showMemory} onClose={() => setShowMemory(false)} title="保存为记忆" width="max-w-xl">
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500 leading-relaxed">
            从对话中提取关键信息保存为记忆文件，将写入项目的 <code className="text-gray-700 bg-gray-100 px-1 rounded">~/.claude/projects/{'{'} 项目 {'}'}/memory/</code> 目录。下次在该项目下启动 Claude Code 时会自动加载，相当于让未来的 Claude 记住这些信息（技术决策、用户偏好、踩过的坑等）。
          </p>
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">记忆名称</label>
            <input
              value={memoryName}
              onChange={e => setMemoryName(e.target.value)}
              placeholder="例如: conv-summary"
              className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">记忆内容（Markdown + Frontmatter）</label>
            <textarea
              value={memoryContent}
              onChange={e => setMemoryContent(e.target.value)}
              rows={14}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[13px] text-gray-700 font-mono leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-gray-400 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">请编辑内容，只保留对话中值得记住的关键信息（技术决策、用户偏好等）</p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setShowMemory(false)} className="px-4 py-2.5 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">取消</button>
            <button
              onClick={handleSaveMemory}
              disabled={saving || !memoryName.trim() || !memoryContent.trim()}
              className="px-5 py-2.5 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              {saving ? '保存中...' : '保存记忆'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
