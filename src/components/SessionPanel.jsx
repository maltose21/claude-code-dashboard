import { useState, useEffect } from 'react'

const ENTRYPOINT_ICON = {
  'VS Code': '💻',
  'Terminal': '⌨️',
  'Desktop': '🖥️',
  'Web': '🌐',
}

function formatTime(isoStr) {
  if (!isoStr) return '--'
  return new Date(isoStr).toLocaleString('zh-CN')
}

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.floor(diff / 60000)} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export default function SessionPanel() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  const alive = sessions.filter(s => s.alive)
  const dead = sessions.filter(s => !s.alive)

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">会话进程</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {alive.length} 个活跃 · {dead.length} 个已结束
            </p>
          </div>
          <button
            onClick={load}
            className="text-[13px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
          >
            刷新
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">暂无会话记录</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.pid}
                className={`bg-white rounded-2xl shadow-sm border p-5 ${
                  session.alive ? 'border-green-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${session.alive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    <span className="text-[14px] font-semibold text-gray-900">{session.project || '未知项目'}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      session.alive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {session.alive ? '运行中' : '已结束'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">{timeAgo(session.startedAt)}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <span className="text-gray-400 block">PID</span>
                    <span className="text-gray-700 font-mono">{session.pid}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">入口</span>
                    <span className="text-gray-700">
                      {ENTRYPOINT_ICON[session.entrypointLabel] || '📌'} {session.entrypointLabel || session.entrypoint}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">版本</span>
                    <span className="text-gray-700">{session.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">启动时间</span>
                    <span className="text-gray-700">{formatTime(session.startedAt)}</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-400 font-mono truncate">
                  {session.cwd}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
