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

    res.json(stats)
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
    result.hooks = { events: Object.keys(hooks), summary: hookSummary }

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

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
