import { useState, useEffect } from 'react'
import { useToast } from './ui/Toast'
import ConfirmDialog from './ui/ConfirmDialog'

export default function PluginPanel() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const loadPlugins = () => {
    fetch('/api/plugins')
      .then(r => r.json())
      .then(data => { setPlugins(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadPlugins() }, [])

  const togglePlugin = async (name, enabled) => {
    const res = await fetch(`/api/plugins/${encodeURIComponent(name)}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    if (res.ok) {
      toast(enabled ? '已启用' : '已禁用', 'success')
      loadPlugins()
    } else {
      toast('操作失败', 'error')
    }
  }

  const deletePlugin = async (name) => {
    const res = await fetch(`/api/plugins/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已卸载插件', 'success')
      loadPlugins()
    } else {
      toast('卸载失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">插件管理</h2>
        <p className="text-gray-500 text-sm mb-6">共 {plugins.length} 个已安装插件</p>

        {plugins.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">暂无已安装插件</div>
        ) : (
        <div className="space-y-3">
          {plugins.map(plugin => (
            <div key={plugin.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl">🧩</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-[13px] text-gray-900">{plugin.name.split('@')[0]}</span>
                  <span className="text-xs text-gray-400">@{plugin.name.split('@')[1]}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  {plugin.version && plugin.version !== 'unknown' && <span>v{plugin.version}</span>}
                  <span>{plugin.scope}</span>
                  {plugin.installedAt && <span>{new Date(plugin.installedAt).toLocaleDateString('zh-CN')}</span>}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={plugin.enabled}
                  onChange={e => togglePlugin(plugin.name, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-[42px] h-[25px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[17px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[21px] after:w-[21px] after:transition-all after:shadow-sm peer-checked:bg-green-500"></div>
              </label>
              <button
                onClick={() => setDeleteTarget(plugin.name)}
                className="text-[13px] text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                卸载
              </button>
            </div>
          ))}
        </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deletePlugin(deleteTarget)}
        title="卸载插件"
        message={`确定要卸载「${deleteTarget?.split('@')[0]}」吗？此操作不可撤销。`}
        confirmText="卸载"
        danger
      />
    </div>
  )
}
