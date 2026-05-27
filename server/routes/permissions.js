import { Router } from 'express'
import { readSettings, updateSettings } from '../utils/settings.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const settings = readSettings()
    const allow = settings.permissions?.allow || []
    const deny = settings.permissions?.deny || []
    res.json({ allow, deny })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { type, rule } = req.body
    if (!rule) return res.status(400).json({ error: '需要 rule 字段' })
    const listKey = type === 'deny' ? 'deny' : 'allow'

    const data = updateSettings(settings => {
      if (!settings.permissions) settings.permissions = {}
      if (!settings.permissions[listKey]) settings.permissions[listKey] = []
      if (!settings.permissions[listKey].includes(rule)) {
        settings.permissions[listKey].push(rule)
      }
    })

    res.json({ success: true, permissions: data.permissions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/', (req, res) => {
  try {
    const { type, rule } = req.body
    if (!rule) return res.status(400).json({ error: '需要 rule 字段' })
    const listKey = type === 'deny' ? 'deny' : 'allow'

    const data = updateSettings(settings => {
      if (!settings.permissions?.[listKey]) return
      const idx = settings.permissions[listKey].indexOf(rule)
      if (idx !== -1) settings.permissions[listKey].splice(idx, 1)
    })

    res.json({ success: true, permissions: data.permissions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
