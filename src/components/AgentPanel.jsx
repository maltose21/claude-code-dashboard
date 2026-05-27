import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import ConfirmDialog from './ui/ConfirmDialog'
import CodeEditor from './ui/CodeEditor'
import { useToast } from './ui/Toast'

const SCOPE_META = {
  user: { label: '用户级', color: 'bg-purple-50 text-purple-600', desc: '全局可用' },
  project: { label: '项目级', color: 'bg-green-50 text-green-600', desc: '仅当前项目' },
}

const AGENT_TEMPLATE = `---
name: my-agent
description: 描述这个代理的专长
model: sonnet
tools: Bash, Read, Write, Edit, Grep, Glob
---

你是一个专门负责 X 的代理。

## 职责

- 具体职责 1
- 具体职责 2

## 约束

- 约束 1
`

export default function AgentPanel() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addScope, setAddScope] = useState('user')
  const [addFilename, setAddFilename] = useState('')
  const [addContent, setAddContent] = useState(AGENT_TEMPLATE)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const load = () => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(d => { setAgents(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? agents : agents.filter(a => a.scope === filter)

  const handleSelect = (agent) => {
    setSelected(agent)
    setEditing(false)
    setEditContent(agent.rawContent)
  }

  const handleSave = async () => {
    if (!selected) return
    const res = await fetch(`/api/agents/${selected.scope}/${encodeURIComponent(selected.filename)}`, {
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

  const handleCreate = async () => {
    if (!addFilename.trim() || !addContent.trim()) return
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: addScope, filename: addFilename.trim(), content: addContent })
    })
    if (res.ok) {
      toast('代理已创建', 'success')
      setShowAdd(false)
      setAddFilename('')
      setAddContent(AGENT_TEMPLATE)
      load()
    } else {
      const err = await res.json()
      toast(err.error || '创建失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/agents/${deleteTarget.scope}/${encodeURIComponent(deleteTarget.filename)}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      toast('代理已删除', 'success')
      if (selected?.filename === deleteTarget.filename) setSelected(null)
      setDeleteTarget(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">子代理管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">共 {agents.length} 个自定义代理</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[13px] px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            + 新建代理
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5">
          {[{ key: 'all', label: '全部' }, { key: 'user', label: '用户级' }, { key: 'project', label: '项目级' }].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f.key ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Agent list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {agents.length === 0 ? '暂无自定义代理，点击「新建代理」创建' : '当前筛选无结果'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {filtered.map(agent => {
              const scope = SCOPE_META[agent.scope] || SCOPE_META.user
              return (
                <div
                  key={`${agent.scope}/${agent.filename}`}
                  className={`bg-white rounded-2xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${
                    selected?.filename === agent.filename ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                  }`}
                  onClick={() => handleSelect(agent)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <span className="text-[14px] font-semibold text-gray-900">{agent.name}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${scope.color}`}>
                      {scope.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3 line-clamp-2">{agent.description || '(无描述)'}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    {agent.model && <span className="bg-gray-100 px-2 py-0.5 rounded">{agent.model}</span>}
                    <span className="font-mono">{agent.filename}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-gray-900">
                🤖 {selected.name}
              </h3>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="text-[12px] px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">取消</button>
                    <button onClick={handleSave} className="text-[12px] px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditing(true); setEditContent(selected.rawContent) }} className="text-[12px] px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">编辑</button>
                    <button onClick={() => setDeleteTarget(selected)} className="text-[12px] px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">删除</button>
                  </>
                )}
              </div>
            </div>
            {editing ? (
              <CodeEditor value={editContent} onChange={setEditContent} language="markdown" />
            ) : (
              <pre className="text-[12px] text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto font-mono">
                {selected.rawContent}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新建子代理">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] text-gray-500 mb-1 block">文件名</label>
              <input
                type="text"
                value={addFilename}
                onChange={e => setAddFilename(e.target.value)}
                placeholder="my-agent"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">范围</label>
              <select
                value={addScope}
                onChange={e => setAddScope(e.target.value)}
                className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg"
              >
                <option value="user">用户级（全局）</option>
                <option value="project">项目级</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[12px] text-gray-500 mb-1 block">内容（Markdown + YAML frontmatter）</label>
            <CodeEditor value={addContent} onChange={setAddContent} language="markdown" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="text-[13px] px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">取消</button>
            <button onClick={handleCreate} className="text-[13px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">创建</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除子代理"
        message={`确定要删除代理「${deleteTarget?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        danger
      />
    </div>
  )
}
