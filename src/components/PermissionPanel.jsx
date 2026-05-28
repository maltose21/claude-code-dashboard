import { useState, useEffect } from 'react'
import { useToast } from './ui/Toast'

const PERMISSION_EXAMPLES = [
  { rule: 'Bash(npm test)', desc: '允许/拒绝运行 npm test' },
  { rule: 'Bash(git *)', desc: '允许/拒绝所有 git 命令' },
  { rule: 'Read(~/secrets/**)', desc: '允许/拒绝读取 secrets 目录' },
  { rule: 'Edit(**/*.md)', desc: '允许/拒绝编辑所有 .md 文件' },
  { rule: 'Write(**/*.test.*)', desc: '允许/拒绝写入测试文件' },
  { rule: 'WebFetch(https://api.example.com/*)', desc: '允许/拒绝访问指定域名' },
]

export default function PermissionPanel() {
  const [permissions, setPermissions] = useState({ allow: [], deny: [] })
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState('')
  const [ruleType, setRuleType] = useState('allow')
  const [showHelp, setShowHelp] = useState(false)
  const toast = useToast()

  const load = () => {
    fetch('/api/permissions')
      .then(r => r.json())
      .then(d => { setPermissions(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addRule = async () => {
    if (!newRule.trim()) return
    const res = await fetch('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: ruleType, rule: newRule.trim() })
    })
    if (res.ok) {
      toast('规则已添加', 'success')
      setNewRule('')
      load()
    } else {
      toast('添加失败', 'error')
    }
  }

  const deleteRule = async (type, rule) => {
    const res = await fetch('/api/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, rule })
    })
    if (res.ok) {
      toast('规则已删除', 'success')
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">权限管理</h2>
        <p className="text-gray-500 text-sm mb-6">
          允许 {permissions.allow.length} 条规则 · 拒绝 {permissions.deny.length} 条规则
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-[13px] font-medium text-gray-700">规则语法帮助</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showHelp ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHelp && (
            <div className="mt-4 space-y-3">
              <div className="bg-blue-50/60 border border-blue-100/60 rounded-xl p-4">
                <p className="text-[12px] text-gray-600 leading-relaxed mb-3">
                  权限规则格式：<code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-blue-600 font-mono">ToolName(glob pattern)</code>
                </p>
                <p className="text-[11px] text-gray-500 mb-1">
                  <code className="font-mono">*</code> 匹配任意字符（不含路径分隔符），<code className="font-mono">**</code> 匹配任意层级路径
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-500 font-semibold mb-1.5">常用示例</p>
                {PERMISSION_EXAMPLES.map(ex => (
                  <div key={ex.rule} className="flex items-center gap-2 text-[12px] px-1">
                    <code className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 shrink-0">{ex.rule}</code>
                    <span className="text-gray-400">{ex.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex gap-2">
            <select
              value={ruleType}
              onChange={e => setRuleType(e.target.value)}
              className="bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="allow">允许</option>
              <option value="deny">拒绝</option>
            </select>
            <input
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRule()}
              className="flex-1 bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400"
              placeholder='例如: Bash(npm test), Read(/path/**)'
            />
            <button onClick={addRule} className="px-4 py-2 text-[13px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium">
              添加
            </button>
          </div>
        </div>

        {permissions.allow.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold text-green-600 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              允许规则 ({permissions.allow.length})
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {permissions.allow.map((rule, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 group">
                  <code className="flex-1 text-[13px] text-gray-600 truncate">{rule}</code>
                  <button
                    onClick={() => deleteRule('allow', rule)}
                    className="text-[12px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {permissions.deny.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-red-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              拒绝规则 ({permissions.deny.length})
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {permissions.deny.map((rule, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 group">
                  <code className="flex-1 text-[13px] text-gray-600 truncate">{rule}</code>
                  <button
                    onClick={() => deleteRule('deny', rule)}
                    className="text-[12px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
