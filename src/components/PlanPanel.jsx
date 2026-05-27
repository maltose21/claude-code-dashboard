import { useState, useEffect } from 'react'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

export default function PlanPanel() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const load = () => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(d => { setPlans(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const loadDetail = (filename) => {
    fetch(`/api/plans/${encodeURIComponent(filename)}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setSelected(filename) })
      .catch(() => setDetail(null))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/plans/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' })
    if (res.ok) {
      toast('计划已删除', 'success')
      if (selected === deleteTarget) { setSelected(null); setDetail(null) }
      setDeleteTarget(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">执行计划</h2>
        <p className="text-sm text-gray-500 mb-6">共 {plans.length} 个计划文件</p>

        {plans.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">暂无计划文件</div>
        ) : (
          <div className="space-y-3 mb-6">
            {plans.map(plan => (
              <div
                key={plan.filename}
                className={`bg-white rounded-2xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${
                  selected === plan.filename ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                }`}
                onClick={() => loadDetail(plan.filename)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <span className="text-[14px] font-semibold text-gray-900">{plan.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">{timeAgo(plan.mtime)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(plan.filename) }}
                      className="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 truncate">{plan.preview}</p>
                <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
                  <span>{(plan.size / 1024).toFixed(1)} KB</span>
                  <span className="font-mono">{plan.filename}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail view */}
        {detail && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-gray-900">{detail.title}</h3>
              <button
                onClick={() => setDeleteTarget(detail.filename)}
                className="text-[12px] px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
              >
                删除
              </button>
            </div>
            <pre className="text-[12px] text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 max-h-[500px] overflow-y-auto font-mono">
              {detail.content}
            </pre>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除计划"
        message="确定要删除此计划文件吗？此操作不可撤销。"
        confirmText="删除"
        danger
      />
    </div>
  )
}
