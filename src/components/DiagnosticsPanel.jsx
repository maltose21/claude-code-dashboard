import { useState, useEffect } from 'react'

const STATUS_ICON = {
  pass: { icon: '✓', bg: 'bg-green-100 text-green-600', border: 'border-l-green-400' },
  warn: { icon: '!', bg: 'bg-amber-100 text-amber-600', border: 'border-l-amber-400' },
  error: { icon: '✗', bg: 'bg-red-100 text-red-600', border: 'border-l-red-400' },
}

export default function DiagnosticsPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  const load = () => {
    setLoading(true)
    fetch('/api/diagnostics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">检查中...</div>
  }

  if (!data) {
    return <div className="flex items-center justify-center h-full text-red-500 text-sm">加载失败</div>
  }

  const { checks, summary } = data
  const score = summary.total > 0 ? Math.round((summary.pass / summary.total) * 100) : 100

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">配置诊断</h2>
            <p className="text-sm text-gray-500 mt-1">检查 Claude Code 配置的完整性和正确性</p>
          </div>
          <button
            onClick={load}
            className="text-[13px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
          >
            重新检查
          </button>
        </div>

        {/* Score summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${score * 0.975} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
              {score}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
              {score === 100 ? '配置健康' : score >= 60 ? '部分问题' : '需要关注'}
            </h3>
            <div className="flex gap-4 text-[13px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                通过 {summary.pass}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                警告 {summary.warn}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                错误 {summary.error}
              </span>
            </div>
          </div>
        </div>

        {/* Check results */}
        <div className="space-y-3">
          {checks.map(check => {
            const st = STATUS_ICON[check.status]
            const hasDetails = check.details && check.details.length > 0
            return (
              <div
                key={check.id}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 ${st.border} overflow-hidden`}
              >
                <div
                  className={`flex items-center gap-3 p-4 ${hasDetails ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
                  onClick={() => hasDetails && toggle(check.id)}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${st.bg}`}>
                    {st.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-gray-900">{check.label}</span>
                    <p className="text-[12px] text-gray-500 mt-0.5">{check.message}</p>
                  </div>
                  {hasDetails && (
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded[check.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
                {expanded[check.id] && hasDetails && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <ul className="mt-3 space-y-1.5">
                      {check.details.map((d, i) => (
                        <li key={i} className="text-[12px] text-gray-600 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="font-mono">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
