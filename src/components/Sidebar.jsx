import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/overview', label: '总览', sublabel: 'Overview', icon: '📊' },
  { path: '/skills', label: '技能', sublabel: 'Skills', icon: '⚡' },
  { path: '/agents', label: '子代理', sublabel: 'Agents', icon: '🤖' },
  { path: '/hooks', label: '钩子', sublabel: 'Hooks', icon: '🔗' },
  { path: '/hooklog', label: '日志', sublabel: 'Hook Log', icon: '📋' },
  { path: '/plugins', label: '插件', sublabel: 'Plugins', icon: '🧩' },
  { path: '/memories', label: '记忆', sublabel: 'Memories', icon: '🧠' },
  { path: '/mcp', label: 'MCP', sublabel: 'MCP Servers', icon: '🔌' },
  { path: '/conversations', label: '对话', sublabel: 'Conversations', icon: '💬' },
  { path: '/plans', label: '计划', sublabel: 'Plans', icon: '📋' },
  { path: '/rules', label: '规则', sublabel: 'Rules', icon: '📏' },
  { path: '/config', label: '配置', sublabel: 'Config', icon: '📝' },
  { path: '/permissions', label: '权限', sublabel: 'Permissions', icon: '🔐' },
  { path: '/diagnostics', label: '诊断', sublabel: 'Diagnostics', icon: '🩺' },
  { path: '/sessions', label: '会话', sublabel: 'Sessions', icon: '🖥️' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col">
      <div className="p-5 pb-4">
        <h1 className="text-[17px] font-semibold text-gray-900">Claude Code</h1>
        <p className="text-xs text-gray-400 mt-0.5">管理后台</p>
      </div>
      <nav className="flex-1 px-3 pb-3 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
