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


export default function Overview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])


  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>
  if (!stats) return <div className="flex items-center justify-center h-full text-red-500">加载失败</div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[15px] font-semibold mb-4 text-gray-900">快捷操作</h3>
            <div className="space-y-3">
              <Link to="/harness" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-base">🏗️</span>
                查看 Harness 架构
              </Link>
              <Link to="/skills" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-base">⚡</span>
                安装新技能 (从 GitHub)
              </Link>
              <Link to="/hooks" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base">🔗</span>
                添加新钩子
              </Link>
              <Link to="/mcp" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center text-base">🔌</span>
                配置 MCP 服务器
              </Link>
              <Link to="/config" className="flex items-center gap-3 text-[13px] text-gray-600 hover:text-blue-600 transition-colors">
                <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-base">📝</span>
                编辑 CLAUDE.md
              </Link>
            </div>
          </div>

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
      </div>
    </div>
  )
}
