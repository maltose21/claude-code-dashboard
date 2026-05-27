import { useState, useEffect } from 'react'
import CodeEditor from './ui/CodeEditor'
import { useToast } from './ui/Toast'

const SCOPE_META = {
  'user':         { label: '全局', color: 'bg-purple-50 text-purple-600', desc: '对所有项目生效' },
  'user-rule':    { label: '全局规则', color: 'bg-purple-50 text-purple-600', desc: '全局 rules/ 目录下的规则文件' },
  'project':      { label: '项目级', color: 'bg-green-50 text-green-600', desc: '团队共享，可提交到 Git' },
  'project-rule': { label: '项目规则', color: 'bg-green-50 text-green-600', desc: '项目 .claude/rules/ 下的规则文件' },
  'local':        { label: '本地', color: 'bg-orange-50 text-orange-600', desc: '仅你可见，应加入 .gitignore' },
}

const SETTINGS_META = {
  model: { label: '默认模型', desc: '会话启动时读取的默认模型（仅启动时生效）' },
  language: { label: '响应语言', desc: '偏好的响应语言（如 chinese、japanese）' },
  theme: { label: '主题', desc: '界面主题' },
  editorMode: { label: '编辑器模式', desc: 'normal 或 vim 按键绑定' },
  viewMode: { label: '显示模式', desc: 'default / verbose / focus' },
  effortLevel: { label: '努力程度', desc: 'low / medium / high / xhigh' },
  defaultShell: { label: '默认 Shell', desc: 'bash（默认）或 powershell' },
  preferredNotifChannel: { label: '通知渠道', desc: '首选通知方式（terminal_bell / iterm2 等）' },
  autoUpdatesChannel: { label: '更新渠道', desc: 'stable 或 latest' },
  cleanupPeriodDays: { label: '会话清理周期', desc: '自动清理多少天前的会话（默认 30）' },
  autoMemoryEnabled: { label: '自动记忆', desc: '是否启用自动记忆读写' },
  alwaysThinkingEnabled: { label: '始终深度思考', desc: '默认启用扩展思考' },
  verbose: { label: '详细模式', desc: '是否显示详细日志输出' },
  includeGitInstructions: { label: 'Git 工作流指令', desc: '是否在提示中包含 git 工作流指令' },
  respectGitignore: { label: '遵循 .gitignore', desc: '文件选择器是否遵循 .gitignore' },
  enabledPlugins: { label: '已启用插件', desc: '格式: "插件名@市场名": true/false' },
  permissions: { label: '权限规则', desc: 'allow/deny/ask 规则列表（在「权限」页管理）' },
  hooks: { label: '钩子', desc: '生命周期钩子配置（在「钩子」页管理）' },
  env: { label: '环境变量', desc: '注入到会话和子进程的环境变量（已脱敏，不可在此修改）' },
}

export default function ConfigPanel() {
  const [tab, setTab] = useState('claude-md')
  const [claudeMdList, setClaudeMdList] = useState([])
  const [settings, setSettings] = useState(null)
  const [selectedMd, setSelectedMd] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editField, setEditField] = useState(null)
  const [editFieldValue, setEditFieldValue] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = () => {
    Promise.all([
      fetch('/api/config/claude-md').then(r => r.json()),
      fetch('/api/config/settings').then(r => r.json())
    ]).then(([md, s]) => {
      setClaudeMdList(md)
      setSettings(s)
      if (md.length > 0 && !selectedMd) {
        setSelectedMd(md[0])
        setEditContent(md[0].content)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectMd = (md) => {
    setSelectedMd(md)
    setEditContent(md.content)
  }

  const saveClaudeMd = async () => {
    if (!selectedMd) return
    const res = await fetch('/api/config/claude-md', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedMd.path, content: editContent })
    })
    if (res.ok) {
      toast('已保存', 'success')
      load()
    } else toast('保存失败', 'error')
  }

  const saveField = async (key, value) => {
    let parsed = value
    try { parsed = JSON.parse(value) } catch {}

    const res = await fetch('/api/config/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { [key]: parsed } })
    })
    if (res.ok) {
      toast(`${key} 已更新`, 'success')
      setEditField(null)
      load()
    } else {
      const err = await res.json()
      toast(err.error || '保存失败', 'error')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-[15px]">加载中...</div>

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">配置</h2>
        <p className="text-gray-500 text-sm mb-6">管理 Claude Code 的全局指令和运行参数</p>

        <div className="flex gap-1 mb-6 bg-gray-200/60 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setTab('claude-md')}
            className={`px-4 py-2 text-[13px] rounded-md transition-colors font-medium ${tab === 'claude-md' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            CLAUDE.md
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 text-[13px] rounded-md transition-colors font-medium ${tab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Settings
          </button>
        </div>

        {tab === 'claude-md' && (
          <>
            <div className="bg-blue-50/60 border border-blue-100/60 rounded-xl px-5 py-3 mb-5">
              <p className="text-[13px] text-blue-700 leading-relaxed">
                <b>CLAUDE.md</b> 是 Claude Code 的指令文件，内容在每次会话中自动加载。支持多个层级：全局（所有项目）、项目级（团队共享）、本地（仅自己）。
                还支持 <code className="bg-blue-100/80 px-1 rounded">.claude/rules/*.md</code> 规则文件，可按文件路径条件加载。加载顺序从全局到本地，内容合并（不覆盖）。
              </p>
            </div>

            {claudeMdList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3 opacity-30">📝</div>
                <p className="text-[14px] text-gray-500 mb-2">未找到 CLAUDE.md 文件</p>
                <p className="text-[12px] text-gray-400">可在以下位置创建：</p>
                <div className="text-[12px] text-gray-500 mt-2 space-y-1 font-mono">
                  <p>~/.claude/CLAUDE.md (全局)</p>
                  <p>./CLAUDE.md (项目级)</p>
                  <p>./CLAUDE.local.md (本地个人)</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-5">
                {/* File list */}
                <div className="w-64 shrink-0 space-y-1">
                  {claudeMdList.map((md, i) => {
                    const scope = SCOPE_META[md.scope] || { label: md.scope, color: 'bg-gray-50 text-gray-600' }
                    return (
                      <button
                        key={i}
                        onClick={() => selectMd(md)}
                        className={`w-full text-left px-3.5 py-3 rounded-xl transition-all ${
                          selectedMd?.path === md.path
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            selectedMd?.path === md.path ? 'bg-blue-400/30 text-white' : scope.color
                          }`}>{scope.label}</span>
                        </div>
                        <span className={`block text-[12px] font-mono truncate ${
                          selectedMd?.path === md.path ? 'text-blue-100' : 'text-gray-400'
                        }`}>{md.path.replace(/^\/Users\/[^/]+/, '~')}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Editor */}
                {selectedMd && (
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${(SCOPE_META[selectedMd.scope] || {}).color || 'bg-gray-50 text-gray-600'}`}>
                          {(SCOPE_META[selectedMd.scope] || {}).label || selectedMd.scope}
                        </span>
                        <span className="text-[12px] text-gray-400 font-mono ml-2">{selectedMd.label}</span>
                      </div>
                      <button onClick={saveClaudeMd} className="px-4 py-2 text-[13px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium">
                        保存
                      </button>
                    </div>
                    <CodeEditor value={editContent} onChange={setEditContent} rows={20} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'settings' && settings && (
          <>
            <div className="bg-blue-50/60 border border-blue-100/60 rounded-xl px-5 py-3 mb-5">
              <p className="text-[13px] text-blue-700 leading-relaxed">
                <b>Settings</b> 来自 <code className="bg-blue-100/80 px-1 rounded">~/.claude/settings.json</code>，控制 Claude Code 的运行参数。
                设置有优先级：托管策略 {'>'} 命令行 {'>'} 本地 {'>'} 项目 {'>'} 用户。权限规则跨层级合并。点击「编辑」修改字段值。
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="space-y-0">
                {Object.entries(settings).map(([key, value]) => {
                  const meta = SETTINGS_META[key]
                  const isObj = typeof value === 'object'
                  const displayValue = isObj ? JSON.stringify(value, null, 2) : String(value)
                  const readOnly = ['env', 'permissions', 'hooks'].includes(key)

                  return (
                    <div key={key} className="py-3.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-start gap-4">
                        <div className="w-48 shrink-0">
                          <span className="text-[13px] text-gray-800 font-mono font-medium">{key}</span>
                          {meta?.desc && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{meta.desc}</p>}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editField === key ? (
                            <div className="space-y-2">
                              <textarea
                                value={editFieldValue}
                                onChange={e => setEditFieldValue(e.target.value)}
                                rows={isObj ? 6 : 1}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-y"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveField(key, editFieldValue)} className="text-[12px] px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium">保存</button>
                                <button onClick={() => setEditField(null)} className="text-[12px] px-3 py-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 font-medium">取消</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              {isObj ? (
                                <pre className="text-[12px] bg-gray-50 px-3 py-2 rounded-lg overflow-x-auto text-gray-600 flex-1">{displayValue}</pre>
                              ) : (
                                <span className="text-[13px] text-gray-700 break-all flex-1">{displayValue}</span>
                              )}
                              {!readOnly && (
                                <button
                                  onClick={() => { setEditField(key); setEditFieldValue(displayValue) }}
                                  className="text-[12px] text-blue-600 hover:text-blue-700 font-medium shrink-0 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                >
                                  编辑
                                </button>
                              )}
                              {readOnly && key !== 'env' && (
                                <span className="text-[11px] text-gray-400 shrink-0">在专属页面管理</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
