import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'
import { readSettings, updateSettings } from '../utils/settings.js'

const router = Router()
const PLUGINS_FILE = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json')

router.get('/', (req, res) => {
  try {
    const settings = readSettings()
    const enabledPlugins = settings.enabledPlugins || {}

    let plugins = []
    if (fs.existsSync(PLUGINS_FILE)) {
      const pluginData = JSON.parse(fs.readFileSync(PLUGINS_FILE, 'utf-8'))
      plugins = Object.entries(pluginData.plugins || {}).map(([name, entries]) => ({
        name,
        scope: entries[0]?.scope,
        version: entries[0]?.version,
        installedAt: entries[0]?.installedAt,
        enabled: !!enabledPlugins[name]
      }))
    }

    res.json(plugins)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:name/toggle', (req, res) => {
  try {
    const pluginName = decodeURIComponent(req.params.name)
    const { enabled } = req.body

    const data = updateSettings(settings => {
      if (!settings.enabledPlugins) settings.enabledPlugins = {}
      if (enabled) {
        settings.enabledPlugins[pluginName] = true
      } else {
        delete settings.enabledPlugins[pluginName]
      }
    })

    res.json({ success: true, enabledPlugins: data.enabledPlugins })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:name', (req, res) => {
  try {
    const pluginName = decodeURIComponent(req.params.name)

    if (fs.existsSync(PLUGINS_FILE)) {
      const pluginData = JSON.parse(fs.readFileSync(PLUGINS_FILE, 'utf-8'))
      if (pluginData.plugins?.[pluginName]) {
        delete pluginData.plugins[pluginName]
        fs.writeFileSync(PLUGINS_FILE, JSON.stringify(pluginData, null, 2) + '\n', 'utf-8')
      }
    }

    updateSettings(settings => {
      if (settings.enabledPlugins) {
        delete settings.enabledPlugins[pluginName]
      }
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
