import { useState, useEffect } from 'react'
import { useToast } from './ui/Toast'

export default function PermissionPanel() {
  const [permissions, setPermissions] = useState({ allow: [], deny: [] })
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState('')
  const [ruleType, setRuleType] = useState('allow')
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
