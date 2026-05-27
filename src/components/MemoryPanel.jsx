import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import ConfirmDialog from './ui/ConfirmDialog'
import CodeEditor from './ui/CodeEditor'
import { useToast } from './ui/Toast'

const TYPE_META = {
  user: { label: '用户画像', icon: '👤', color: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50' },
  feedback: { label: '行为反馈', icon: '💡', color: 'text-yellow-600', dot: 'bg-yellow-500', bg: 'bg-yellow-50' },
  project: { label: '项目信息', icon: '📋', color: 'text-green-600', dot: 'bg-green-500', bg: 'bg-green-50' },
  reference: { label: '外部引用', icon: '🔗', color: 'text-purple-600', dot: 'bg-purple-500', bg: 'bg-purple-50' },
  unknown: { label: '未分类', icon: '📝', color: 'text-gray-600', dot: 'bg-gray-400', bg: 'bg-gray-50' }
}

const MEMORY_TEMPLATE = `---
name: my-memory
description: 一句话描述这条记忆
metadata:
  type: project
---

## 关键信息

（在此编写记忆内容）
`

export default function MemoryPanel() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addProject, setAddProject] = useState('')
  const [addFilename, setAddFilename] = useState('')
  const [addContent, setAddContent] = useState(MEMORY_TEMPLATE)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const load = () => {
    fetch('/api/memories')
      .then(r => r.json())
      .then(data => { setMemories(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!selected || selected.type !== 'file') return
    const res = await fetch(`/api/memories/${encodeURIComponent(selected.projectDir)}/${encodeURIComponent(selected.filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    })
    if (res.ok) {
      toast('已保存', 'success')
      setEditing(false)
      load()
    } else {
      toast('保存失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/memories/${encodeURIComponent(deleteTarget.projectDir)}/${encodeURIComponent(deleteTarget.filename)}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      toast('已删除', 'success')
      if (selected?.filename === deleteTarget.filename) setSelected(null)
      setDeleteTarget(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  const handleAdd = async () => {
    if (!addProject || !addFilename.trim() || !addContent.trim()) return
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir: addProject, filename: addFilename.trim(), content: addContent })
    })
    if (res.ok) {
      toast('记忆已创建', 'success')
      setShowAdd(false)
      setAddFilename('')
      setAddContent(MEMORY_TEMPLATE)
      load()
    } else {
      const err = await res.json()
      toast(err.error || '创建失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  const allFiles = memories.flatMap(p => p.files.map(f => ({ ...f, project: p.project, projectDir: p.projectDir, indexContent: p.indexContent })))
  const types = [...new Set(allFiles.map(f => f.type))]
  const filteredFiles = filter === 'all' ? allFiles : allFiles.filter(f => f.type === filter)
  const projectDirs = memories.map(p => ({ dir: p.projectDir, name: p.project }))

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[300px] min-w-[260px] border-r border-gray-200/60 flex flex-col bg-white/60 backdrop-blur-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">记忆</h2>
            <button onClick={() => setShowAdd(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              + 新增
            </button>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
            记忆是 Claude Code 的持久化上下文。每次启动新会话时自动加载，让 Claude 记住你的偏好、项目约束和关键决策，无需重复交代。
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{allFiles.length} 条</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`text-[12px] px-2.5 py-1 rounded-md transition-colors font-medium ${
                filter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {types.map(t => {
              const meta = TYPE_META[t] || TYPE_META.unknown
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md transition-colors font-medium ${
                    filter === t ? `${meta.bg} ${meta.color}` : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {memories.some(p => p.indexContent) && (
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              onClick={() => { setSelected({ type: 'index', content: memories.map(p => `## ${p.project}\n${p.indexContent}`).join('\n\n') }); setEditing(false) }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
                selected?.type === 'index' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">📑</span>
              <span className="font-medium text-[13px]">MEMORY.md 索引</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {(() => {
            const byProject = {}
            filteredFiles.forEach(f => {
              if (!byProject[f.project]) byProject[f.project] = []
              byProject[f.project].push(f)
            })

            return Object.entries(byProject).map(([project, files]) => (
              <div key={project} className="mb-2">
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide truncate">
                  {project.split('/').slice(-2).join('/')}
                </div>
                <div className="space-y-0.5">
                  {files.map(file => {
                    const meta = TYPE_META[file.type] || TYPE_META.unknown
                    return (
                      <button
                        key={`${file.projectDir}/${file.filename}`}
                        onClick={() => { setSelected({ type: 'file', ...file }); setEditing(false) }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                          selected?.type === 'file' && selected?.filename === file.filename && selected?.projectDir === file.projectDir
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                          <span className="truncate font-medium text-[13px]">{file.name}</span>
                          <span className={`text-[11px] shrink-0 ${meta.color}`}>{meta.label}</span>
                        </div>
                        {file.description && (
                          <p className="text-[11px] text-gray-400 mt-0.5 pl-[14px] line-clamp-1">{file.description}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        {selected ? (
          <div className="p-8 max-w-4xl">
            {selected.type === 'index' ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">📑</div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">MEMORY.md 索引</h3>
                      <p className="text-[13px] text-gray-500 mt-0.5">所有项目的记忆索引汇总</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <pre className="text-[13px] text-gray-700 whitespace-pre-wrap leading-7">{selected.content}</pre>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${(TYPE_META[selected.type] || TYPE_META.unknown).bg}`}>
                        {(TYPE_META[selected.type] || TYPE_META.unknown).icon}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">{selected.name}</h3>
                        {selected.description && (
                          <p className="text-[13px] text-gray-500 mt-0.5">{selected.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { setEditContent(selected.rawContent); setEditing(!editing) }}
                        className={`text-[13px] px-4 py-2 rounded-lg font-medium transition-all border ${
                          editing
                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                            : 'bg-blue-50 text-blue-600 border-blue-200/60 hover:bg-blue-100'
                        }`}
                      >
                        {editing ? '取消' : '编辑'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(selected)}
                        className="text-[13px] px-4 py-2 rounded-lg font-medium transition-all border bg-red-50 text-red-600 border-red-200/60 hover:bg-red-100"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-5 text-[13px] text-gray-500 mt-3 pt-3 border-t border-gray-50">
                    <span>类型: <span className={(TYPE_META[selected.type] || TYPE_META.unknown).color}>{(TYPE_META[selected.type] || TYPE_META.unknown).label}</span></span>
                    <span>文件: <code className="text-gray-500">{selected.filename}</code></span>
                  </div>
                </div>

                {editing ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-blue-200/60 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-[13px] text-blue-600 font-medium">正在编辑: {selected.filename}</span>
                      <span className="text-[11px] text-gray-400 ml-2">（包含 frontmatter 和正文）</span>
                    </div>
                    <CodeEditor value={editContent} onChange={setEditContent} rows={18} />
                    <div className="flex justify-end mt-5">
                      <button onClick={handleSave} className="px-5 py-2.5 text-[14px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm">
                        保存修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <pre className="text-[13px] text-gray-700 whitespace-pre-wrap leading-7">{selected.body}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-sm">
              <div className="text-5xl mb-4 opacity-40">🧠</div>
              <p className="text-[15px] text-gray-600 font-medium mb-2">Claude Code 记忆系统</p>
              <p className="text-[13px] text-gray-400 leading-relaxed mb-4">
                记忆文件存储在 <code className="text-gray-500 bg-gray-100 px-1 rounded">~/.claude/projects/*/memory/</code> 目录下。每次启动 Claude Code 时会自动读取 MEMORY.md 索引，让 Claude 在新会话中延续对你和项目的了解。
              </p>
              <div className="text-left bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-[12px] text-gray-500 font-medium mb-2">适合保存为记忆的内容：</p>
                <ul className="text-[12px] text-gray-500 space-y-1.5 leading-relaxed">
                  <li>• <b className="text-gray-600">用户画像</b> — 你的角色、技术栈偏好、沟通风格</li>
                  <li>• <b className="text-gray-600">行为反馈</b> — "不要 mock 数据库"、"用中文注释"</li>
                  <li>• <b className="text-gray-600">项目信息</b> — 架构决策、部署约束、合规要求</li>
                  <li>• <b className="text-gray-600">外部引用</b> — 相关文档/看板/Slack 频道的位置</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                {Object.entries(TYPE_META).filter(([k]) => k !== 'unknown').map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <span>{meta.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增记忆" width="max-w-xl">
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500 leading-relaxed">
            创建一条新的记忆文件。记忆会在下次启动 Claude Code 时自动加载，让 Claude 记住关键信息（技术决策、用户偏好、项目约束等）。
          </p>
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">所属项目</label>
            <select
              value={addProject}
              onChange={e => setAddProject(e.target.value)}
              className="w-full bg-gray-100/80 border-none rounded-lg px-3 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">选择项目...</option>
              {projectDirs.map(p => (
                <option key={p.dir} value={p.dir}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">文件名</label>
            <input
              value={addFilename}
              onChange={e => setAddFilename(e.target.value)}
              placeholder="例如: project-architecture"
              className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">将自动添加 .md 后缀</p>
          </div>
          <div>
            <label className="block text-[13px] text-gray-700 mb-1.5 font-medium">内容（Markdown + Frontmatter）</label>
            <textarea
              value={addContent}
              onChange={e => setAddContent(e.target.value)}
              rows={12}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[13px] text-gray-700 font-mono leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-gray-400 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">取消</button>
            <button
              onClick={handleAdd}
              disabled={!addProject || !addFilename.trim() || !addContent.trim()}
              className="px-5 py-2.5 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除记忆"
        message={`确定要删除「${deleteTarget?.name}」吗？将同时从 MEMORY.md 索引中移除。下次 Claude Code 启动后将不再加载此记忆。`}
        confirmText="删除"
        danger
      />
    </div>
  )
}
