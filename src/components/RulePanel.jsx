import { useState, useEffect } from 'react'

const SCOPE_COLORS = {
  user: { bg: 'bg-purple-50', border: 'border-l-purple-400', badge: 'bg-purple-100 text-purple-700', label: '全局' },
  'user-rule': { bg: 'bg-purple-50', border: 'border-l-purple-400', badge: 'bg-purple-100 text-purple-700', label: '全局规则' },
  project: { bg: 'bg-green-50', border: 'border-l-green-400', badge: 'bg-green-100 text-green-700', label: '项目' },
  'project-rule': { bg: 'bg-green-50', border: 'border-l-green-400', badge: 'bg-green-100 text-green-700', label: '项目规则' },
  local: { bg: 'bg-orange-50', border: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700', label: '本地' },
}

export default function RulePanel() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then(data => { setRules(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">规则 Rules</h2>
        <p className="text-sm text-gray-500 mt-1">
          当前生效的全局和项目级规则，来源于 CLAUDE.md 及 rules/ 目录。共 {rules.length} 条规则。
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">暂无规则。可通过编辑 CLAUDE.md 或在 rules/ 目录添加规则文件。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => {
            const scope = SCOPE_COLORS[rule.scope] || SCOPE_COLORS.user
            return (
              <div
                key={rule.id + rule.source}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4 ${scope.border}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-medium text-gray-900">{rule.title}</h3>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${scope.badge}`}>
                          {scope.label}
                        </span>
                        {rule.alwaysActive && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            始终生效
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5">{rule.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1">来源: {rule.source}</p>
                    </div>
                    <button
                      onClick={() => toggle(rule.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors shrink-0"
                    >
                      {expanded[rule.id] ? '收起' : '展开'}
                    </button>
                  </div>

                  {rule.items.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {rule.items.map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-blue-500 font-medium shrink-0">{i + 1}.</span>
                          <span>
                            <span className="font-medium text-gray-800">{item.name}</span>
                            <span className="text-gray-500"> — {item.desc}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rule.reference && (
                    <div className="mt-3">
                      <a
                        href={rule.reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        参考: {rule.reference}
                      </a>
                    </div>
                  )}
                </div>

                {expanded[rule.id] && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                      {rule.content}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
