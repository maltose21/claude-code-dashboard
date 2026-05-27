import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

const TYPE_META = {
  stdio: { label: 'Stdio', icon: '⚙️', color: 'bg-blue-50 text-blue-600' },
  http: { label: 'HTTP', icon: '🌐', color: 'bg-green-50 text-green-600' },
  'streamable-http': { label: 'HTTP', icon: '🌐', color: 'bg-green-50 text-green-600' },
  sse: { label: 'SSE', icon: '📡', color: 'bg-yellow-50 text-yellow-600' },
}

const SCOPE_META = {
  user: { label: '全局', color: 'bg-purple-50 text-purple-600' },
  local: { label: '项目本地', color: 'bg-orange-50 text-orange-600' },
}

export default function McpPanel() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [serverType, setServerType] = useState('stdio')
  const [form, setForm] = useState({ name: '', command: '', args: '', env: '', cwd: '', url: '', headers: '' })
  const toast = useToast()

  const load = () => {
    fetch('/api/mcp')
      .then(r => r.json())
      .then(d => { setServers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const body = { name: form.name, type: serverType }

    if (serverType === 'stdio') {
      body.command = form.command
      body.args = form.args ? form.args.split(/\s+/) : []
      if (form.cwd) body.cwd = form.cwd
    } else {
      body.url = form.url
      if (form.headers) {
        try { body.headers = JSON.parse(form.headers) } catch {}
      }
    }
    if (form.env) {
      try { body.env = JSON.parse(form.env) } catch {}
    }

    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (res.ok) {
      toast('MCP 服务器已添加', 'success')
      setShowAdd(false)
      setForm({ name: '', command: '', args: '', env: '', cwd: '', url: '', headers: '' })
      load()
    } else {
      toast(data.error || '添加失败', 'error')
    }
  }

  const handleDelete = async (srv) => {
    const params = new URLSearchParams()
    if (srv.scope) params.set('scope', srv.scope)
    if (srv.project) params.set('project', srv.project)
    const qs = params.toString() ? `?${params}` : ''

    const res = await fetch(`/api/mcp/${encodeURIComponent(srv.name)}${qs}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已删除', 'success')
      if (selected?.name === srv.name) setSelected(null)
      load()
    } else {
      toast('删除失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="flex h-full">
      <div className="w-[300px] min-w-[260px] border-r border-gray-200/60 flex flex-col bg-white/60 backdrop-blur-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">MCP 服务器</h2>
            <button onClick={() => setShowAdd(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              + 添加
            </button>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-2">
            MCP (Model Context Protocol) 让 Claude 通过标准化协议调用外部工具和数据源。配置存储在 <code className="text-gray-500">~/.claude.json</code>。
          </p>
          <p className="text-[13px] text-gray-500">共 {servers.length} 个配置</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {servers.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-[13px]">暂无 MCP 服务器配置</div>
          ) : (
            <div className="space-y-0.5">
              {servers.map(srv => {
                const typeMeta = TYPE_META[srv.type] || TYPE_META.stdio
                const scopeMeta = SCOPE_META[srv.scope] || SCOPE_META.user
                return (
                  <button
                    key={`${srv.name}-${srv.scope}-${srv.project || ''}`}
                    onClick={() => setSelected(srv)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      selected?.name === srv.name && selected?.scope === srv.scope
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{typeMeta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[13px] truncate">{srv.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${scopeMeta.color}`}>{scopeMeta.label}</span>
                        </div>
                        <span className="block text-[11px] text-gray-400 truncate mt-0.5">{srv.command || srv.url || srv.type}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        {selected ? (
          <div className="p-8 max-w-3xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-xl">
                    {(TYPE_META[selected.type] || TYPE_META.stdio).icon}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">{selected.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(TYPE_META[selected.type] || TYPE_META.stdio).color}`}>
                        {(TYPE_META[selected.type] || TYPE_META.stdio).label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(SCOPE_META[selected.scope] || SCOPE_META.user).color}`}>
                        {(SCOPE_META[selected.scope] || SCOPE_META.user).label}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(selected)}
                  className="text-[13px] text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              {selected.type === 'stdio' ? (
                <>
                  <div>
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">命令</span>
                    <code className="block mt-1 text-[13px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{selected.command}</code>
                  </div>
                  {selected.args?.length > 0 && (
                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold">参数</span>
                      <code className="block mt-1 text-[13px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{selected.args.join(' ')}</code>
                    </div>
                  )}
                  {selected.cwd && (
                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold">工作目录</span>
                      <code className="block mt-1 text-[13px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{selected.cwd}</code>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">URL</span>
                    <code className="block mt-1 text-[13px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg break-all">{selected.url}</code>
                  </div>
                  {selected.headers && Object.keys(selected.headers).length > 0 && (
                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold">请求头</span>
                      <pre className="mt-1 text-[12px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{JSON.stringify(selected.headers, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
              {selected.env && Object.keys(selected.env).length > 0 && (
                <div>
                  <span className="text-[11px] text-gray-400 uppercase font-semibold">环境变量</span>
                  <pre className="mt-1 text-[12px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{JSON.stringify(selected.env, null, 2)}</pre>
                </div>
              )}
              {selected.project && (
                <div>
                  <span className="text-[11px] text-gray-400 uppercase font-semibold">关联项目</span>
                  <code className="block mt-1 text-[13px] text-gray-700 bg-gray-50 px-3 py-2 rounded-lg break-all">{selected.project}</code>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-sm">
              <div className="text-5xl mb-4 opacity-40">🔌</div>
              <p className="text-[15px] text-gray-600 font-medium mb-2">MCP 服务器</p>
              <p className="text-[13px] text-gray-400 leading-relaxed mb-4">
                通过 Model Context Protocol，Claude 可以调用外部工具（数据库查询、API 调用、文件系统访问等）。
              </p>
              <div className="text-left bg-gray-50 rounded-xl p-4">
                <p className="text-[12px] text-gray-500 font-medium mb-2">支持的传输类型：</p>
                <ul className="text-[12px] text-gray-500 space-y-1 leading-relaxed">
                  <li>• <b className="text-gray-600">Stdio</b> — 本地进程，通过标准输入输出通信</li>
                  <li>• <b className="text-gray-600">HTTP</b> — 远程服务器，通过 HTTP POST 通信</li>
                  <li>• <b className="text-gray-600">SSE</b> — 服务器推送事件（已弃用，推荐 HTTP）</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="添加 MCP 服务器">
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500 leading-relaxed">
            添加后将写入 <code className="text-gray-600 bg-gray-100 px-1 rounded">~/.claude.json</code>，Claude Code 下次启动时自动加载。
          </p>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">名称</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder="my-server" />
          </div>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">传输类型</label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {['stdio', 'http', 'sse'].map(t => (
                <button
                  key={t}
                  onClick={() => setServerType(t)}
                  className={`flex-1 px-3 py-2 text-[13px] rounded-md transition-all font-medium ${serverType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {serverType === 'stdio' ? (
            <>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">命令</label>
                <input value={form.command} onChange={e => setForm(f => ({...f, command: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder="npx" />
              </div>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">参数 (空格分隔)</label>
                <input value={form.args} onChange={e => setForm(f => ({...f, args: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder="-y @modelcontextprotocol/server-github" />
              </div>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">工作目录 (可选)</label>
                <input value={form.cwd} onChange={e => setForm(f => ({...f, cwd: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder="/path/to/project" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">URL</label>
                <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder="https://mcp.example.com/mcp" />
              </div>
              <div>
                <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">请求头 (JSON, 可选)</label>
                <input value={form.headers} onChange={e => setForm(f => ({...f, headers: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder='{"Authorization": "Bearer ${API_KEY}"}' />
              </div>
            </>
          )}
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5 font-medium">环境变量 (JSON, 可选)</label>
            <input value={form.env} onChange={e => setForm(f => ({...f, env: e.target.value}))} className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400" placeholder='{"GITHUB_TOKEN": "xxx"}' />
            <p className="text-[11px] text-gray-400 mt-1">支持 ${'${VAR}'} 语法引用已有环境变量</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 font-medium">取消</button>
            <button
              onClick={handleAdd}
              disabled={!form.name || (serverType === 'stdio' ? !form.command : !form.url)}
              className="px-4 py-2 text-[13px] bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors font-medium"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="删除 MCP 服务器"
        message={`确定要删除「${deleteTarget?.name}」吗？将从 ~/.claude.json 中移除。`}
        confirmText="删除"
        danger
      />
    </div>
  )
}
