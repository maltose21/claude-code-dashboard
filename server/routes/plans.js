import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'

const router = Router()
const PLANS_DIR = path.join(CLAUDE_DIR, 'plans')

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(PLANS_DIR)) return res.json([])

    const plans = fs.readdirSync(PLANS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(PLANS_DIR, f)
        const content = fs.readFileSync(filePath, 'utf-8')
        const stat = fs.statSync(filePath)
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const lines = content.split('\n').filter(l => l.trim())
        return {
          filename: f,
          title: titleMatch ? titleMatch[1] : f.replace('.md', ''),
          preview: lines.slice(0, 3).join(' ').slice(0, 150),
          size: stat.size,
          mtime: stat.mtime.toISOString()
        }
      })

    plans.sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    res.json(plans)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:filename', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, req.params.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '计划不存在' })

    const content = fs.readFileSync(filePath, 'utf-8')
    const stat = fs.statSync(filePath)
    const titleMatch = content.match(/^#\s+(.+)$/m)

    res.json({
      filename: req.params.filename,
      title: titleMatch ? titleMatch[1] : req.params.filename.replace('.md', ''),
      content,
      size: stat.size,
      mtime: stat.mtime.toISOString()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:filename', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, req.params.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '计划不存在' })

    fs.unlinkSync(filePath)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
