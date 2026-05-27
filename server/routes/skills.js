import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { CLAUDE_DIR, parseFrontmatter } from '../utils/parser.js'
import { installSkillFromGitHub } from '../utils/github.js'

const router = Router()
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills')

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return res.json([])

    const skills = fs.readdirSync(SKILLS_DIR)
      .filter(name => {
        const full = path.join(SKILLS_DIR, name)
        return fs.statSync(full).isDirectory()
      })
      .map(name => {
        const skillFile = path.join(SKILLS_DIR, name, 'SKILL.md')
        if (!fs.existsSync(skillFile)) return null

        const content = fs.readFileSync(skillFile, 'utf-8')
        const { metadata, body } = parseFrontmatter(content)

        return {
          name: metadata.name || name,
          dirName: name,
          description: metadata.description || '',
          license: metadata.license || '',
          body
        }
      })
      .filter(Boolean)

    res.json(skills)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:name', (req, res) => {
  try {
    const skillDir = path.join(SKILLS_DIR, req.params.name)
    const skillFile = path.join(skillDir, 'SKILL.md')
    if (!fs.existsSync(skillFile)) return res.status(404).json({ error: '技能不存在' })

    const rawContent = fs.readFileSync(skillFile, 'utf-8')
    const { metadata, body } = parseFrontmatter(rawContent)

    const files = fs.readdirSync(skillDir).map(f => {
      const stat = fs.statSync(path.join(skillDir, f))
      return {
        name: f,
        size: stat.size,
        isDir: stat.isDirectory()
      }
    })

    res.json({
      name: metadata.name || req.params.name,
      dirName: req.params.name,
      dirPath: skillDir,
      description: metadata.description || '',
      license: metadata.license || '',
      metadata,
      body,
      rawContent,
      files
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/install', async (req, res) => {
  try {
    const { url, name, content } = req.body

    if (url) {
      const result = await installSkillFromGitHub(url)
      return res.json({ success: true, ...result })
    }

    if (name && content) {
      if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true })
      const skillDir = path.join(SKILLS_DIR, name)
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
      return res.json({ success: true, installed: [name], count: 1 })
    }

    res.status(400).json({ error: '需要提供 url 或 name+content' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:name', (req, res) => {
  try {
    const skillFile = path.join(SKILLS_DIR, req.params.name, 'SKILL.md')
    if (!fs.existsSync(skillFile)) return res.status(404).json({ error: '技能不存在' })

    const { content } = req.body
    if (!content) return res.status(400).json({ error: '缺少 content 字段' })

    fs.writeFileSync(skillFile, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:name/open', (req, res) => {
  try {
    const skillDir = path.join(SKILLS_DIR, req.params.name)
    if (!fs.existsSync(skillDir)) return res.status(404).json({ error: '技能不存在' })

    execFile('open', [skillDir], (err) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ success: true })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:name', (req, res) => {
  try {
    const skillDir = path.join(SKILLS_DIR, req.params.name)
    if (!fs.existsSync(skillDir)) return res.status(404).json({ error: '技能不存在' })

    fs.rmSync(skillDir, { recursive: true })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
