import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const CARDS = [
  { key: 'skills', label: '技能', icon: '⚡', gradient: 'from-orange-400 to-orange-500', link: '/skills' },
  { key: 'hooks', label: '钩子事件', icon: '🔗', gradient: 'from-blue-400 to-blue-500', link: '/hooks' },
  { key: 'plugins', label: '插件', icon: '🧩', gradient: 'from-purple-400 to-purple-500', link: '/plugins' },
  { key: 'memories', label: '记忆', icon: '🧠', gradient: 'from-green-400 to-green-500', link: '/memories' },
  { key: 'mcpServers', label: 'MCP 服务器', icon: '🔌', gradient: 'from-cyan-400 to-cyan-500', link: '/mcp' },
  { key: 'conversations', label: '对话', icon: '💬', gradient: 'from-yellow-400 to-yellow-500', link: '/conversations' },
  { key: 'permissions', label: '权限规则', icon: '🔐', gradient: 'from-red-400 to-red-500', link: '/permissions' },
  { key: 'plans', label: '计划', icon: '📋', gradient: 'from-indigo-400 to-indigo-500', link: null },
]

const ACTIVITY_ICON = {
  conversation: { icon: '💬', bg: 'bg-yellow-50', text: 'text-yellow-600', label: '对话' },
  memory: { icon: '🧠', bg: 'bg-green-50', text: 'text-green-600', label: '记忆' },
  skill: { icon: '⚡', bg: 'bg-orange-50', text: 'text-orange-600', label: '技能' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 月前`
}

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/overview').then(r => r.json()),
      fetch('/api/diagnostics').then(r => r.json()).catch(() => null),
      fetch('/api/overview/activity').then(r => r.json()).catch(() => []),
    ]).then(([s, d, a]) => {
      setStats(s)
      setDiagnostics(d)
      setActivity(a)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!stats) return <div className="flex items-center justify-center h-full text-red-500">加载失败</div>

  const score = diagnostics?.summary
    ? Math.round((diagnostics.summary.pass / diagnostics.summary.total) * 100)
    : null

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">总览</h2>
        <p className="text-gray-500 text-sm mb-8">Claude Code 本地资源一览</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {CARDS.map(card => {
            const value = stats[card.key] ?? 0
            const inner = (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white text-lg shadow-sm`}>
                    {card.icon}
                  </div>
                  <span className="text-3xl font-semibold text-gray-900">{value}</span>
                </div>
                <span className="text-[13px] text-gray-500">{card.label}</span>
              </div>
            )
            return card.link ? (
              <Link key={card.key} to={card.link}>{inner}</Link>
            ) : (
              <div key={card.key}>{inner}</div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Diagnostics Summary */}
          {diagnostics && (
            <Link to="/diagnostics" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke={score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${score * 0.975} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                    {score}
                  </span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">配置健康</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {score === 100 ? '一切正常' : score >= 60 ? '部分需注意' : '存在问题'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  {diagnostics.summary.pass} 通过
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  {diagnostics.summary.warn} 警告
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  {diagnostics.summary.error} 错误
                </span>
              </div>
            </Link>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[15px] font-semibold mb-4 text-gray-900">快捷操作</h3>
            <div className="space-y-3">
              <Link to="/harness" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-base">🏗️</span>
                查看 Harness 架构
              </Link>
              <Link to="/skills" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-base">⚡</span>
                安装新技能
              </Link>
              <Link to="/hooks" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base">🔗</span>
                添加新钩子
              </Link>
              <Link to="/config" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-base">📝</span>
                编辑 CLAUDE.md
              </Link>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[15px] font-semibold mb-4 text-gray-900">系统信息</h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">CLAUDE.md</span>
                <span className={stats.hasClaudeMd ? 'text-green-600 font-medium' : 'text-gray-400'}>{stats.hasClaudeMd ? '已配置' : '未配置'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">已启用插件</span>
                <span className="text-gray-700">{stats.enabledPlugins ?? 0} / {stats.plugins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">额外市场</span>
                <span className="text-gray-700">{stats.extraMarketplaces ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">配置目录</span>
                <span className="text-gray-400 font-mono text-xs">~/.claude/</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[15px] font-semibold mb-4 text-gray-900">最近活动</h3>
            <div className="space-y-1">
              {activity.slice(0, 10).map((item, i) => {
                const meta = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.conversation
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50/60 transition-colors">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${meta.bg}`}>
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-gray-800 font-medium truncate block">{item.name}</span>
                      <span className="text-[11px] text-gray-400">
                        {meta.label}
                        {item.project && ` · ${item.project.split('/').pop()}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(item.time)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
