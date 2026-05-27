import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import ConfirmDialog from './ui/ConfirmDialog'
import CodeEditor from './ui/CodeEditor'
import { useToast } from './ui/Toast'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileIcon(name, isDir) {
  if (isDir) return '📁'
  if (name.endsWith('.md')) return '📄'
  if (name.endsWith('.sh')) return '📜'
  if (name.endsWith('.js') || name.endsWith('.ts')) return '⚙️'
  if (name.endsWith('.json')) return '📋'
  return '📎'
}

export default function SkillPanel() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [showInstall, setShowInstall] = useState(false)
  const [installTab, setInstallTab] = useState('github')
  const [installUrl, setInstallUrl] = useState('')
  const [localName, setLocalName] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [installing, setInstalling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [showBody, setShowBody] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const load = () => {
    fetch('/api/skills')
      .then(r => r.json())
      .then(d => { setSkills(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const loadDetail = (dirName) => {
    fetch(`/api/skills/${dirName}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
  }

  const handleSelect = (skill) => {
    setSelected(skill)
    setEditing(false)
    setShowBody(false)
    loadDetail(skill.dirName)
  }

  const handleOpenFolder = async (dirName) => {
    try {
      await fetch(`/api/skills/${dirName}/open`, { method: 'POST' })
    } catch {}
  }

  const handleInstall = async () => {
    if (installTab === 'github') {
      if (!installUrl.trim()) return
      setInstalling(true)
      try {
        const res = await fetch('/api/skills/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: installUrl.trim() })
        })
        const data = await res.json()
        if (res.ok) {
          toast(`成功安装 ${data.count} 个技能: ${data.installed.join(', ')}`, 'success')
          setShowInstall(false)
          setInstallUrl('')
          load()
        } else {
          toast(data.error || '安装失败', 'error')
        }
      } catch {
        toast('网络错误', 'error')
      }
      setInstalling(false)
    } else {
      if (!localName.trim() || !localContent.trim()) return
      setInstalling(true)
      try {
        const res = await fetch('/api/skills/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: localName.trim(), content: localContent })
        })
        const data = await res.json()
        if (res.ok) {
          toast(`成功创建技能: ${data.installed.join(', ')}`, 'success')
          setShowInstall(false)
          setLocalName('')
          setLocalContent('')
          load()
        } else {
          toast(data.error || '创建失败', 'error')
        }
      } catch {
        toast('网络错误', 'error')
      }
      setInstalling(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLocalContent(ev.target.result)
      if (!localName) {
        const nameFromFile = file.name.replace(/\.md$/i, '').replace(/\s+/g, '-').toLowerCase()
        setLocalName(nameFromFile)
      }
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    const res = await fetch(`/api/skills/${selected.dirName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    })
    if (res.ok) {
      toast('已保存', 'success')
      setEditing(false)
      loadDetail(selected.dirName)
      load()
    } else {
      toast('保存失败', 'error')
    }
  }

  const handleDelete = async (dirName) => {
    const res = await fetch(`/api/skills/${dirName}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已删除', 'success')
      if (selected?.dirName === dirName) { setSelected(null); setDetail(null) }
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  const filtered = skills.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">加载中...</div>

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[220px] min-w-[200px] border-r border-gray-200/60 flex flex-col bg-white/60 backdrop-blur-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">技能</h2>
            <button onClick={() => setShowInstall(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              + 安装
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索..."
            className="w-full bg-gray-100/80 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
          />
          <p className="text-[11px] text-gray-400 mt-2">共 {skills.length} 个</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1.5">
          <div className="space-y-0">
            {filtered.map(skill => (
              <button
                key={skill.dirName}
                onClick={() => handleSelect(skill)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[13px] truncate ${
                  selected?.dirName === skill.dirName
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        {selected && detail ? (
          <div className="p-8 max-w-4xl">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-lg shadow-sm shrink-0">⚡</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-semibold text-gray-900 leading-tight">{detail.name}</h3>
                    {detail.description && <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{detail.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setEditContent(detail.rawContent); setEditing(!editing) }}
                    className={`text-[13px] px-4 py-2 rounded-lg font-medium transition-all border ${
                      editing
                        ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-150'
                        : 'bg-blue-50 text-blue-600 border-blue-200/60 hover:bg-blue-100'
                    }`}
                  >
                    {editing ? '取消' : '编辑'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selected.dirName)}
                    className="text-[13px] px-4 py-2 rounded-lg font-medium transition-all border bg-red-50 text-red-600 border-red-200/60 hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-gray-400 mt-4 pt-3 border-t border-gray-100">
                <span
                  onClick={() => handleOpenFolder(detail.dirName)}
                  className="cursor-pointer hover:text-blue-600 transition-colors group"
                  title="点击在 Finder 中打开"
                >
                  📂 <span className="text-gray-600 group-hover:text-blue-600 underline decoration-dashed underline-offset-2">{detail.dirPath}</span>
                </span>
                {detail.license && <span>许可: <code className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{detail.license}</code></span>}
              </div>
            </div>

            {/* Files + Metadata compact */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">文件结构</h4>
                <button
                  onClick={() => handleOpenFolder(detail.dirName)}
                  className="text-[12px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  在 Finder 中打开
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.files?.map((f, i) => (
                  <span key={i} className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 ${f.name === 'SKILL.md' ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                    <span className="text-xs">{fileIcon(f.name, f.isDir)}</span>
                    {f.name}
                    {!f.isDir && <span className="text-gray-400 ml-0.5">{formatSize(f.size)}</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Frontmatter metadata */}
            {!editing && detail.metadata && Object.keys(detail.metadata).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 mb-5">
                <h4 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide mb-3">Frontmatter</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {Object.entries(detail.metadata).map(([key, val]) => (
                    <div key={key} className="flex items-baseline gap-2 text-[12px]">
                      <span className="text-gray-400 font-mono shrink-0">{key}:</span>
                      <span className="text-gray-700 break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Card */}
            {editing ? (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200/60 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[13px] text-blue-600 font-medium">正在编辑: SKILL.md</span>
                </div>
                <CodeEditor value={editContent} onChange={setEditContent} rows={22} />
                <div className="flex justify-end mt-5">
                  <button onClick={handleSave} className="px-5 py-2.5 text-[14px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm">
                    保存修改
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60">
                <button
                  onClick={() => setShowBody(!showBody)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors rounded-2xl"
                >
                  <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">SKILL.md 正文</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showBody ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showBody && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                    <pre className="text-[13px] text-gray-700 whitespace-pre-wrap leading-[1.8] font-[inherit] mt-4">{detail.body}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">⚡</div>
              <p className="text-[15px] text-gray-600 font-medium">选择左侧技能查看详情</p>
              <p className="text-[13px] text-gray-400 mt-1.5">或点击「+ 安装」添加新技能</p>
            </div>
          </div>
        )}
      </div>

      {/* Install Modal */}
      <Modal open={showInstall} onClose={() => setShowInstall(false)} title="安装技能" width="max-w-xl">
        <div className="space-y-5">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setInstallTab('github')}
              className={`flex-1 px-3 py-2.5 text-[13px] rounded-md transition-all font-medium ${installTab === 'github' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              从 GitHub 安装
            </button>
            <button
              onClick={() => setInstallTab('local')}
              className={`flex-1 px-3 py-2.5 text-[13px] rounded-md transition-all font-medium ${installTab === 'local' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              本地上传
            </button>
          </div>

          {installTab === 'github' ? (
            <>
              <p className="text-[13px] text-gray-500 leading-relaxed">粘贴 GitHub 仓库 URL，支持整个仓库或子目录路径。</p>
              <input
                value={installUrl}
                onChange={e => setInstallUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInstall()}
                placeholder="https://github.com/user/repo 或 .../tree/main/skills/xxx"
                className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-3 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
              />
              {installUrl && (
                <div className="text-[12px] text-gray-600 bg-blue-50 rounded-lg px-4 py-2.5 border border-blue-100">
                  将从此 URL 克隆并安装到 <code className="text-blue-600 font-medium">~/.claude/skills/</code>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-[13px] text-gray-500 leading-relaxed">上传 SKILL.md 文件或直接粘贴内容创建技能。</p>
              <div>
                <label className="block text-[13px] text-gray-700 mb-2 font-medium">技能名称</label>
                <input
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  placeholder="my-skill (将作为目录名)"
                  className="w-full bg-gray-100/80 border-none rounded-lg px-4 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder:text-gray-400 transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] text-gray-700 font-medium">SKILL.md 内容</label>
                  <label className="text-[12px] text-blue-600 hover:text-blue-700 cursor-pointer font-medium transition-colors bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100">
                    上传文件
                    <input type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  value={localContent}
                  onChange={e => setLocalContent(e.target.value)}
                  rows={10}
                  placeholder={"---\nname: my-skill\ndescription: 技能描述\n---\n\n技能内容..."}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[13px] text-gray-700 font-mono leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-gray-400 transition-colors"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setShowInstall(false)} className="px-4 py-2.5 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">取消</button>
            <button
              onClick={handleInstall}
              disabled={installing || (installTab === 'github' ? !installUrl.trim() : (!localName.trim() || !localContent.trim()))}
              className="px-5 py-2.5 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              {installing ? '处理中...' : (installTab === 'github' ? '安装' : '创建')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="删除技能"
        message={`确定要删除「${deleteTarget}」吗？整个技能目录将被永久移除，此操作不可撤销。`}
        confirmText="删除"
        danger
      />
    </div>
  )
}
