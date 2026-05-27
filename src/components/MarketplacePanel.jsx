import { useState, useEffect } from 'react'
import { useToast } from './ui/Toast'

const TAG_COLORS = {
  methodology: 'bg-indigo-50 text-indigo-600',
  tdd: 'bg-green-50 text-green-600',
  debugging: 'bg-red-50 text-red-600',
  planning: 'bg-blue-50 text-blue-600',
  'code-review': 'bg-purple-50 text-purple-600',
  philosophy: 'bg-amber-50 text-amber-600',
  'coding-style': 'bg-orange-50 text-orange-600',
  guidelines: 'bg-teal-50 text-teal-600',
  memory: 'bg-cyan-50 text-cyan-600',
  organization: 'bg-slate-50 text-slate-600',
}

const STATUS_MAP = {
  installed: { label: '已安装', color: 'text-green-600 bg-green-50 border-green-200' },
  partial: { label: '部分安装', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  not_installed: { label: '未安装', color: 'text-gray-500 bg-gray-50 border-gray-200' },
}

export default function MarketplacePanel() {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const toast = useToast()

  const load = () => {
    fetch('/api/marketplace')
      .then(r => r.json())
      .then(d => { setPacks(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleInstall = async (pack) => {
    setInstalling(pack.id)
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pack.installUrl || pack.url })
      })
      const data = await res.json()
      if (res.ok) {
        toast(`成功安装 ${data.count} 个技能: ${data.installed.join(', ')}`, 'success')
        load()
      } else {
        toast(data.error || '安装失败', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    }
    setInstalling(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">加载中...</div>
  }

  const allTags = [...new Set(packs.flatMap(p => p.tags))].sort()
  const filtered = activeTag ? packs.filter(p => p.tags.includes(activeTag)) : packs
  const featured = filtered.filter(p => p.featured)
  const others = filtered.filter(p => !p.featured)

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">技能市场</h2>
          <p className="text-sm text-gray-500 mt-1">发现并安装高质量技能包，增强 Claude Code 的能力</p>
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-[12px] px-3 py-1.5 rounded-full font-medium transition-colors border ${
              !activeTag ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-[12px] px-3 py-1.5 rounded-full font-medium transition-colors border ${
                activeTag === tag ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-4">精选推荐</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {featured.map(pack => (
                <PackCard key={pack.id} pack={pack} installing={installing} onInstall={handleInstall} large />
              ))}
            </div>
          </div>
        )}

        {/* Others */}
        {others.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-4">更多技能包</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {others.map(pack => (
                <PackCard key={pack.id} pack={pack} installing={installing} onInstall={handleInstall} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">暂无推荐技能包</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PackCard({ pack, installing, onInstall, large }) {
  const status = STATUS_MAP[pack.installStatus]
  const isInstalling = installing === pack.id

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-md ${large ? 'shadow-sm' : ''}`}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold text-gray-900 ${large ? 'text-[17px]' : 'text-[15px]'}`}>{pack.name}</h4>
              {pack.featured && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-semibold uppercase">Featured</span>
              )}
            </div>
            <p className="text-[12px] text-gray-400 mt-0.5">by {pack.author}</p>
          </div>
          <span className={`text-[11px] px-2 py-1 rounded-full border font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        <p className={`text-gray-600 leading-relaxed mb-4 ${large ? 'text-[14px]' : 'text-[13px]'}`}>
          {pack.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {pack.tags.map(tag => (
            <span key={tag} className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${TAG_COLORS[tag] || 'bg-gray-50 text-gray-600'}`}>
              {tag}
            </span>
          ))}
        </div>

        {/* Skills count + Install */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-[12px] text-gray-400">
            {pack.installStatus === 'partial'
              ? `${pack.installedCount}/${pack.totalCount} 个技能已安装`
              : `${pack.totalCount} 个技能`
            }
          </span>

          {pack.installStatus !== 'installed' ? (
            <button
              onClick={() => onInstall(pack)}
              disabled={isInstalling}
              className="text-[13px] px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {isInstalling ? '安装中...' : (pack.installStatus === 'partial' ? '补全安装' : '一键安装')}
            </button>
          ) : (
            <span className="text-[12px] text-green-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              全部已安装
            </span>
          )}
        </div>
      </div>

      {/* GitHub link */}
      <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
        <a
          href={pack.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          {pack.url.replace('https://github.com/', '')}
        </a>
      </div>
    </div>
  )
}
