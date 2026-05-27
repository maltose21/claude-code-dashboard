import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'
import { readSettings, updateSettings } from '../utils/settings.js'

const router = Router()
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks')

router.get('/', (req, res) => {
  try {
    const settings = readSettings()
    const hooks = settings.hooks || {}

    const pluginsPath = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json')
    let plugins = []
    if (fs.existsSync(pluginsPath)) {
      const pluginData = JSON.parse(fs.readFileSync(pluginsPath, 'utf-8'))
      plugins = Object.entries(pluginData.plugins || {}).map(([name, entries]) => ({
        name,
        scope: entries[0]?.scope,
        version: entries[0]?.version,
        installedAt: entries[0]?.installedAt
      }))
    }

    let hookScripts = []
    if (fs.existsSync(HOOKS_DIR)) {
      hookScripts = fs.readdirSync(HOOKS_DIR)
        .filter(f => f.endsWith('.sh'))
        .map(f => ({
          name: f,
          content: fs.readFileSync(path.join(HOOKS_DIR, f), 'utf-8')
        }))
    }

    res.json({ hooks, plugins, hookScripts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { event, matcher, hooks: hookList } = req.body
    if (!event || !hookList) return res.status(400).json({ error: '需要 event 和 hooks 字段' })

    const data = updateSettings(settings => {
      if (!settings.hooks) settings.hooks = {}
      if (!settings.hooks[event]) settings.hooks[event] = []
      const entry = { hooks: hookList }
      if (matcher) entry.matcher = matcher
      settings.hooks[event].push(entry)
    })

    res.json({ success: true, hooks: data.hooks[event] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:event/:index', (req, res) => {
  try {
    const { event, index } = req.params
    const idx = parseInt(index, 10)
    const { matcher, hooks: hookList } = req.body

    const data = updateSettings(settings => {
      if (!settings.hooks?.[event]?.[idx]) throw new Error('Hook 配置不存在')
      if (matcher !== undefined) settings.hooks[event][idx].matcher = matcher || undefined
      if (hookList) settings.hooks[event][idx].hooks = hookList
    })

    res.json({ success: true, config: data.hooks[event][idx] })
  } catch (err) {
    res.status(err.message.includes('不存在') ? 404 : 500).json({ error: err.message })
  }
})

router.delete('/:event/:index', (req, res) => {
  try {
    const { event, index } = req.params
    const idx = parseInt(index, 10)

    updateSettings(settings => {
      if (!settings.hooks?.[event]?.[idx]) throw new Error('Hook 配置不存在')
      settings.hooks[event].splice(idx, 1)
      if (settings.hooks[event].length === 0) delete settings.hooks[event]
    })

    res.json({ success: true })
  } catch (err) {
    res.status(err.message.includes('不存在') ? 404 : 500).json({ error: err.message })
  }
})

router.post('/scripts', (req, res) => {
  try {
    const { name, content } = req.body
    if (!name || !content) return res.status(400).json({ error: '需要 name 和 content' })

    if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true })
    const filePath = path.join(HOOKS_DIR, name.endsWith('.sh') ? name : name + '.sh')
    fs.writeFileSync(filePath, content, 'utf-8')
    fs.chmodSync(filePath, '755')

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/scripts/:name', (req, res) => {
  try {
    const filePath = path.join(HOOKS_DIR, req.params.name)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '脚本不存在' })

    fs.unlinkSync(filePath)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
