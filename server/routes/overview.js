import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR, getProjectDirs, parseFrontmatter } from '../utils/parser.js'
import { readSettings } from '../utils/settings.js'

const router = Router()
const CLAUDE_JSON = path.join(process.env.HOME, '.claude.json')

router.get('/', (req, res) => {
  try {
    const stats = {}

    const skillsDir = path.join(CLAUDE_DIR, 'skills')
    stats.skills = fs.existsSync(skillsDir)
      ? fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory()).length
      : 0

    const settings = readSettings()
    stats.hooks = Object.keys(settings.hooks || {}).length

    let mcpCount = 0
    try {
      if (fs.existsSync(CLAUDE_JSON)) {
        const cj = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8'))
        mcpCount += Object.keys(cj.mcpServers || {}).length
        for (const [, pc] of Object.entries(cj.projects || {})) {
          if (pc && typeof pc === 'object') mcpCount += Object.keys(pc.mcpServers || {}).length
        }
      }
    } catch {}
    stats.mcpServers = mcpCount

    const pluginsPath = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json')
    if (fs.existsSync(pluginsPath)) {
      const pluginData = JSON.parse(fs.readFileSync(pluginsPath, 'utf-8'))
      stats.plugins = Object.keys(pluginData.plugins || {}).length
    } else {
      stats.plugins = 0
    }

    const ep = settings.enabledPlugins || {}
    stats.enabledPlugins = typeof ep === 'object' && !Array.isArray(ep)
      ? Object.values(ep).filter(Boolean).length
      : 0

    const projectDirs = getProjectDirs()
    let memoryCount = 0
    let conversationCount = 0
    for (const dir of projectDirs) {
      const memDir = path.join(dir.fullPath, 'memory')
      if (fs.existsSync(memDir)) {
        memoryCount += fs.readdirSync(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md').length
      }
      conversationCount += fs.readdirSync(dir.fullPath).filter(f => f.endsWith('.jsonl')).length
    }
    stats.memories = memoryCount
    stats.conversations = conversationCount

    stats.permissions = (settings.permissions?.allow || []).length + (settings.permissions?.deny || []).length

    const plansDir = path.join(CLAUDE_DIR, 'plans')
    stats.plans = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter(f => f.endsWith('.md')).length
      : 0

    const claudeMdPath = path.join(CLAUDE_DIR, 'CLAUDE.md')
    stats.hasClaudeMd = fs.existsSync(claudeMdPath)

    stats.extraMarketplaces = (settings.extraKnownMarketplaces || []).length

    const agentsDir = path.join(CLAUDE_DIR, 'agents')
    let agentCount = 0
    if (fs.existsSync(agentsDir)) {
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          if (e.isDirectory()) walk(path.join(d, e.name))
          else if (e.name.endsWith('.md')) agentCount++
        }
      }
      walk(agentsDir)
    }
    stats.agents = agentCount

    const sessionsDir = path.join(CLAUDE_DIR, 'sessions')
    stats.sessions = fs.existsSync(sessionsDir)
      ? fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json')).length
      : 0

    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/activity', (req, res) => {
  try {
    const activities = []
    const projectDirs = getProjectDirs()

    // Recent conversations (by file mtime)
    for (const dir of projectDirs) {
      const files = fs.readdirSync(dir.fullPath).filter(f => f.endsWith('.jsonl'))
      for (const f of files) {
        const stat = fs.statSync(path.join(dir.fullPath, f))
        activities.push({
          type: 'conversation',
          name: f.replace('.jsonl', '').slice(0, 8),
          project: dir.displayName,
          time: stat.mtime.toISOString()
        })
      }
    }

    // Recent memory changes
    for (const dir of projectDirs) {
      const memDir = path.join(dir.fullPath, 'memory')
      if (!fs.existsSync(memDir)) continue
      const files = fs.readdirSync(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      for (const f of files) {
        const stat = fs.statSync(path.join(memDir, f))
        activities.push({
          type: 'memory',
          name: f.replace('.md', ''),
          project: dir.displayName,
          time: stat.mtime.toISOString()
        })
      }
    }

    // Recent skill changes
    const skillsDir = path.join(CLAUDE_DIR, 'skills')
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir).filter(f => {
        try { return fs.statSync(path.join(skillsDir, f)).isDirectory() } catch { return false }
      })
      for (const name of dirs) {
        const skillFile = path.join(skillsDir, name, 'SKILL.md')
        if (!fs.existsSync(skillFile)) continue
        const stat = fs.statSync(skillFile)
        activities.push({
          type: 'skill',
          name,
          time: stat.mtime.toISOString()
        })
      }
    }

    // Sort by time descending, take top 20
    activities.sort((a, b) => new Date(b.time) - new Date(a.time))
    res.json(activities.slice(0, 20))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/harness', (req, res) => {
  try {
    const result = {}

    // Skills
    const skillsDir = path.join(CLAUDE_DIR, 'skills')
    result.skills = []
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir).filter(f => {
        try { return fs.statSync(path.join(skillsDir, f)).isDirectory() } catch { return false }
      })
      for (const name of dirs) {
        const skillFile = path.join(skillsDir, name, 'SKILL.md')
        if (!fs.existsSync(skillFile)) continue
        const { metadata } = parseFrontmatter(fs.readFileSync(skillFile, 'utf-8'))
        result.skills.push({
          name: metadata.name || name,
          description: (metadata.description || '').slice(0, 120)
        })
      }
    }

    // Hooks
    const settings = readSettings()
    const hooks = settings.hooks || {}
    const hookSummary = []
    for (const [event, configs] of Object.entries(hooks)) {
      for (const config of configs) {
        for (const hook of (config.hooks || [])) {
          hookSummary.push({
            event,
            matcher: config.matcher || '',
            type: hook.type || 'command',
            command: (hook.command || hook.url || hook.prompt || '').slice(0, 80)
          })
        }
      }
    }
    const eventCounts = {}
    for (const h of hookSummary) {
      eventCounts[h.event] = (eventCounts[h.event] || 0) + 1
    }
    result.hooks = { events: Object.keys(hooks), summary: hookSummary, eventCounts }

    // Plugins
    const pluginsPath = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json')
    result.plugins = []
    if (fs.existsSync(pluginsPath)) {
      const pluginData = JSON.parse(fs.readFileSync(pluginsPath, 'utf-8'))
      const enabledPlugins = settings.enabledPlugins || {}
      for (const [name, entries] of Object.entries(pluginData.plugins || {})) {
        result.plugins.push({
          name,
          version: entries[0]?.version || '',
          enabled: !!enabledPlugins[name]
        })
      }
    }

    // MCP Servers
    result.mcp = []
    try {
      if (fs.existsSync(CLAUDE_JSON)) {
        const cj = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8'))
        for (const [name, cfg] of Object.entries(cj.mcpServers || {})) {
          result.mcp.push({ name, type: cfg.type || 'stdio', scope: 'user' })
        }
        for (const [projPath, pc] of Object.entries(cj.projects || {})) {
          if (pc && typeof pc === 'object' && pc.mcpServers) {
            for (const [name, cfg] of Object.entries(pc.mcpServers)) {
              result.mcp.push({ name, type: cfg.type || 'stdio', scope: 'local', project: projPath })
            }
          }
        }
      }
    } catch {}

    // Permissions
    result.permissions = {
      allow: (settings.permissions?.allow || []).slice(0, 10),
      deny: (settings.permissions?.deny || []).slice(0, 10),
      totalAllow: (settings.permissions?.allow || []).length,
      totalDeny: (settings.permissions?.deny || []).length
    }

    // CLAUDE.md files
    result.claudeMd = []
    const mdLocations = [
      { label: '全局', scope: 'user', p: path.join(CLAUDE_DIR, 'CLAUDE.md') },
      { label: '项目级', scope: 'project', p: path.join(process.cwd(), 'CLAUDE.md') },
      { label: '项目 .claude/', scope: 'project', p: path.join(process.cwd(), '.claude', 'CLAUDE.md') },
      { label: '本地个人', scope: 'local', p: path.join(process.cwd(), 'CLAUDE.local.md') },
    ]
    for (const loc of mdLocations) {
      if (fs.existsSync(loc.p)) {
        const content = fs.readFileSync(loc.p, 'utf-8')
        result.claudeMd.push({
          scope: loc.scope,
          label: loc.label,
          preview: content.slice(0, 200).replace(/\n/g, ' ')
        })
      }
    }

    // Memories
    result.memories = []
    const projectDirs = getProjectDirs()
    for (const dir of projectDirs) {
      const memDir = path.join(dir.fullPath, 'memory')
      if (!fs.existsSync(memDir)) continue
      const files = fs.readdirSync(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      for (const f of files) {
        const content = fs.readFileSync(path.join(memDir, f), 'utf-8')
        const { metadata } = parseFrontmatter(content)
        result.memories.push({
          name: metadata.name || f.replace('.md', ''),
          type: metadata.metadata_nested?.type || metadata.type || 'unknown',
          description: (metadata.description || '').slice(0, 100)
        })
      }
    }

    // Key settings
    result.settings = {
      model: settings.model || '(默认)',
      language: settings.language || '',
      theme: settings.theme || 'auto',
      autoMemoryEnabled: settings.autoMemoryEnabled !== false,
      effortLevel: settings.effortLevel || '',
      editorMode: settings.editorMode || 'normal',
    }

    // Agents
    const userAgentsDir = path.join(CLAUDE_DIR, 'agents')
    const projAgentsDir = path.join(process.cwd(), '.claude', 'agents')
    let userAgentCount = 0, projAgentCount = 0
    const countMd = (d) => {
      if (!fs.existsSync(d)) return 0
      let c = 0
      const walkDir = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) walkDir(path.join(dir, e.name))
          else if (e.name.endsWith('.md')) c++
        }
      }
      walkDir(d)
      return c
    }
    userAgentCount = countMd(userAgentsDir)
    projAgentCount = countMd(projAgentsDir)
    result.agents = { user: userAgentCount, project: projAgentCount, total: userAgentCount + projAgentCount }

    // Sessions
    const sessionsDir = path.join(CLAUDE_DIR, 'sessions')
    let sessTotal = 0, sessAlive = 0
    if (fs.existsSync(sessionsDir)) {
      const sessFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'))
      sessTotal = sessFiles.length
      for (const f of sessFiles) {
        try {
          const s = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf-8'))
          if (s.pid) { try { process.kill(s.pid, 0); sessAlive++ } catch {} }
        } catch {}
      }
    }
    result.sessions = { total: sessTotal, alive: sessAlive }

    // Plans
    const plansDir = path.join(CLAUDE_DIR, 'plans')
    result.plans = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter(f => f.endsWith('.md')).length
      : 0

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/tokens', (req, res) => {
  try {
    const projectDirs = getProjectDirs()
    const byModel = {}
    const daily = {}
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600000

    for (const dir of projectDirs) {
      const files = fs.readdirSync(dir.fullPath).filter(f => f.endsWith('.jsonl'))
      for (const file of files) {
        const filePath = path.join(dir.fullPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const seenConv = {}

        for (const line of content.split('\n')) {
          if (!line.includes('"assistant"') || !line.includes('"usage"')) continue
          let d
          try { d = JSON.parse(line) } catch { continue }
          if (d.type !== 'assistant' || !d.message?.usage) continue

          const model = d.message.model || 'unknown'
          if (model === '<synthetic>') continue
          const u = d.message.usage

          if (!byModel[model]) byModel[model] = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, messageCount: 0, conversationCount: 0 }
          const m = byModel[model]
          m.input += u.input_tokens || 0
          m.output += u.output_tokens || 0
          m.cacheCreation += u.cache_creation_input_tokens || 0
          m.cacheRead += u.cache_read_input_tokens || 0
          m.messageCount++
          if (!seenConv[model]) seenConv[model] = new Set()
          seenConv[model].add(file)

          if (d.timestamp) {
            const ts = new Date(d.timestamp).getTime()
            if (ts >= sevenDaysAgo) {
              const date = new Date(d.timestamp).toISOString().slice(0, 10)
              if (!daily[date]) daily[date] = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }
              daily[date].input += u.input_tokens || 0
              daily[date].output += u.output_tokens || 0
              daily[date].cacheCreation += u.cache_creation_input_tokens || 0
              daily[date].cacheRead += u.cache_read_input_tokens || 0
            }
          }
        }

        for (const [model, convSet] of Object.entries(seenConv)) {
          byModel[model].conversationCount += convSet.size
        }
      }
    }

    const total = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, messageCount: 0, conversationCount: 0 }
    for (const m of Object.values(byModel)) {
      total.input += m.input
      total.output += m.output
      total.cacheCreation += m.cacheCreation
      total.cacheRead += m.cacheRead
      total.messageCount += m.messageCount
      total.conversationCount += m.conversationCount
    }

    const recent = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))

    res.json({ byModel, total, recent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
