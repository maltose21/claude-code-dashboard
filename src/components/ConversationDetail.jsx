import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Modal from './ui/Modal'
import { useToast } from './ui/Toast'

const MEMORY_TYPES = [
  { value: 'project', label: '项目信息', icon: '📋', desc: '架构决策、部署约束、合规要求' },
  { value: 'feedback', label: '行为反馈', icon: '💡', desc: '对 Claude 的行为纠正或确认' },
  { value: 'user', label: '用户画像', icon: '👤', desc: '你的角色、技术栈偏好、沟通风格' },
  { value: 'reference', label: '外部引用', icon: '🔗', desc: '相关文档、看板、Slack 频道位置' },
]

function buildFrontmatter(name, description, type) {
  return `---\nname: ${name}\ndescription: ${description}\nmetadata:\n  type: ${type}\n---\n\n`
}

export default function ConversationDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])

  const [showMemory, setShowMemory] = useState(false)
  const [memoryName, setMemoryName] = useState('')
  const [memoryDesc, setMemoryDesc] = useState('')
  const [memoryType, setMemoryType] = useState('project')
  const [memoryProject, setMemoryProject] = useState('')
  const [memoryBody, setMemoryBody] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetch(`/api/conversations/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/memories')
      .then(r => r.json())
      .then(mems => {
        const dirs = mems.map(p => ({ dir: p.projectDir, name: p.project }))
        setProjects(dirs)
      })
      .catch(() => {})
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
    if (!memoryName.trim() || !memoryBody.trim() || !memoryProject) return
    setSaving(true)
    try {
      const content = buildFrontmatter(memoryName.trim(), memoryDesc.trim(), memoryType) + memoryBody.trim() + '\n'
      const res = await fetch(`/api/conversations/${id}/save-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: memoryName.trim(), content, projectDir: memoryProject })
      })
      if (res.ok) {
        toast('已保存为记忆', 'success')
        setShowMemory(false)
        resetMemoryForm()
      } else {
        const err = await res.json()
        toast(err.error || '保存失败', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    }
    setSaving(false)
  }

  const resetMemoryForm = () => {
    setMemoryName('')
    setMemoryDesc('')
    setMemoryType('project')
    setMemoryBody('')
  }

  const prepareMemoryContent = () => {
    if (!data) return
    const summary = data.messages
      .filter(m => m.type === 'user')
      .map(m => m.content)
      .filter(Boolean)
      .slice(0, 3)
      .map(t => t.slice(0, 200))
      .join('\n\n')

    const defaultName = `conv-${id.slice(0, 8)}`
    setMemoryName(defaultName)
    setMemoryDesc(`从对话 ${id.slice(0, 8)} 提取的关键信息`)
    setMemoryType('project')
    setMemoryBody(`## 对话摘要\n\n${summary}\n\n## 关键信息\n\n（请编辑此处，提取对话中值得记住的关键信息）`)

    if (data.projectDir && projects.some(p => p.dir === data.projectDir)) {
      setMemoryProject(data.projectDir)
    } else if (projects.length > 0) {
      setMemoryProject(projects[0].dir)
    }
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
              导出 Markdown
            </button>
            <button
              onClick={prepareMemoryContent}
              className="text-[13px] px-4 py-2 rounded-lg font-medium transition-all border bg-blue-50 text-blue-600 border-blue-200/60 hover:bg-blue-100"
            >
              保存为记忆
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

      <Modal open={showMemory} onClose={() => setShowMemory(false)} title="保存为记忆" width="max-w-2xl">
        <div className="space-y-5">
          {/* 规则说明 */}
          <div className="bg-blue-50/60 border border-blue-100/60 rounded-xl p-4">
            <p className="text-[13px] text-gray-700 font-medium mb-2">关于记忆</p>
            <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
              记忆是 Claude Code 的持久化上下文。保存后，<b className="text-gray-700">该项目下所有未来对话</b>都会自动加载此记忆，无需重复交代。
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              <div>
                <p className="text-green-600 font-medium mb-1">适合保存</p>
                <ul className="text-gray-500 space-y-0.5">
                  <li>- 技术决策和架构约束</li>
                  <li>- 踩过的坑和解决方案</li>
                  <li>- 对 Claude 的行为纠正</li>
                  <li>- 项目特有的规范和约定</li>
                </ul>
              </div>
              <div>
                <p className="text-red-500 font-medium mb-1">不适合保存</p>
                <ul className="text-gray-500 space-y-0.5">
                  <li>- 代码片段（会过时）</li>
                  <li>- 临时调试信息</li>
                  <li>- git 能查到的历史</li>
                  <li>- 已写入 CLAUDE.md 的内容</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 目标项目 */}
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">目标项目</label>
            <select
              value={memoryProject}
              onChange={e => setMemoryProject(e.target.value)}
              className="w-full bg-gray-100/80 border-none rounded-lg px-3 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">选择项目...</option>
              {projects.map(p => (
                <option key={p.dir} value={p.dir}>{p.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">记忆保存到 <code className="bg-gray-100 px-1 rounded">~/.claude/projects/{'{'}项目{'}'}/memory/</code></p>
          </div>

          {/* 记忆类型 */}
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">记忆类型</label>
            <div className="grid grid-cols-2 gap-2">
              {MEMORY_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setMemoryType(t.value)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    memoryType === t.value
                      ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200'
                      : 'border-gray-150 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base mt-0.5">{t.icon}</span>
                  <div>
                    <span className="text-[12px] font-medium text-gray-800 block">{t.label}</span>
                    <span className="text-[11px] text-gray-400">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 名称和描述 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">记忆名称</label>
              <input
                value={memoryName}
                onChange={e => setMemoryName(e.target.value)}
                placeholder="例如: conv-summary"
                className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">一句话描述</label>
              <input
                value={memoryDesc}
                onChange={e => setMemoryDesc(e.target.value)}
                placeholder="例如: 认证模块踩的坑"
                className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* 记忆正文 */}
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">记忆正文</label>
            <textarea
              value={memoryBody}
              onChange={e => setMemoryBody(e.target.value)}
              rows={10}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[13px] text-gray-700 font-mono leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-gray-400 transition-colors"
              placeholder="从对话中提取值得记住的关键信息..."
            />
            <p className="text-[11px] text-gray-400 mt-1">Frontmatter（name/description/type）会根据上方表单自动生成，此处只需编写正文</p>
          </div>

          {/* 确认警告 */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-sm mt-0.5">!</span>
            <p className="text-[12px] text-amber-700 leading-relaxed">
              保存后，<b>该项目下的所有未来 Claude Code 对话</b>都将自动加载此记忆。请确认内容准确且有长期价值，避免保存过时信息。
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowMemory(false)} className="px-4 py-2.5 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">取消</button>
            <button
              onClick={handleSaveMemory}
              disabled={saving || !memoryName.trim() || !memoryBody.trim() || !memoryProject}
              className="px-5 py-2.5 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              {saving ? '保存中...' : '确认保存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
