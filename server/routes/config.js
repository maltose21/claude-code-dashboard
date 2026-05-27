import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'
import { readSettings, updateSettings } from '../utils/settings.js'

const router = Router()

function findClaudeMdFiles() {
  const results = []

  const globalMd = path.join(CLAUDE_DIR, 'CLAUDE.md')
  if (fs.existsSync(globalMd)) {
    results.push({ label: '全局 (所有项目生效)', scope: 'user', path: globalMd, content: fs.readFileSync(globalMd, 'utf-8') })
  }

  const globalRulesDir = path.join(CLAUDE_DIR, 'rules')
  if (fs.existsSync(globalRulesDir)) {
    fs.readdirSync(globalRulesDir).filter(f => f.endsWith('.md')).forEach(f => {
      const p = path.join(globalRulesDir, f)
      results.push({ label: `全局规则: ${f}`, scope: 'user-rule', path: p, content: fs.readFileSync(p, 'utf-8') })
    })
  }

  const cwd = process.cwd()

  const projectMd = path.join(cwd, 'CLAUDE.md')
  if (fs.existsSync(projectMd)) {
    results.push({ label: '项目级 (团队共享)', scope: 'project', path: projectMd, content: fs.readFileSync(projectMd, 'utf-8') })
  }

  const projectDotMd = path.join(cwd, '.claude', 'CLAUDE.md')
  if (fs.existsSync(projectDotMd)) {
    results.push({ label: '项目级 .claude/ (团队共享)', scope: 'project', path: projectDotMd, content: fs.readFileSync(projectDotMd, 'utf-8') })
  }

  const localMd = path.join(cwd, 'CLAUDE.local.md')
  if (fs.existsSync(localMd)) {
    results.push({ label: '本地个人 (不提交)', scope: 'local', path: localMd, content: fs.readFileSync(localMd, 'utf-8') })
  }

  const projectRulesDir = path.join(cwd, '.claude', 'rules')
  if (fs.existsSync(projectRulesDir)) {
    fs.readdirSync(projectRulesDir).filter(f => f.endsWith('.md')).forEach(f => {
      const p = path.join(projectRulesDir, f)
      results.push({ label: `项目规则: ${f}`, scope: 'project-rule', path: p, content: fs.readFileSync(p, 'utf-8') })
    })
  }

  return results
}

router.get('/claude-md', (req, res) => {
  try {
    res.json(findClaudeMdFiles())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/claude-md', (req, res) => {
  try {
    const { path: filePath, content } = req.body
    if (!filePath || content === undefined) return res.status(400).json({ error: '需要 path 和 content' })

    if (!filePath.includes('CLAUDE') && !filePath.includes('rules/')) {
      return res.status(403).json({ error: '只能编辑 CLAUDE.md 或规则文件' })
    }

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(filePath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/settings', (req, res) => {
  try {
    const settings = readSettings()
    const safe = { ...settings }
    if (safe.env) {
      safe.env = Object.fromEntries(
        Object.entries(safe.env).map(([k, v]) => [k, v.length > 8 ? v.slice(0, 4) + '****' : '****'])
      )
    }
    res.json(safe)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/settings', (req, res) => {
  try {
    const { fields } = req.body
    if (!fields || typeof fields !== 'object') return res.status(400).json({ error: '需要 fields 对象' })

    const forbidden = ['env']
    const keys = Object.keys(fields)
    const blocked = keys.filter(k => forbidden.includes(k))
    if (blocked.length) return res.status(403).json({ error: `不允许修改: ${blocked.join(', ')}` })

    const data = updateSettings(settings => {
      Object.assign(settings, fields)
    })

    res.json({ success: true, settings: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
