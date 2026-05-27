import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR, parseFrontmatter } from '../utils/parser.js'

const router = Router()
const USER_AGENTS_DIR = path.join(CLAUDE_DIR, 'agents')

function getProjectAgentsDir() {
  return path.join(process.cwd(), '.claude', 'agents')
}

function scanAgentsDir(dir, scope) {
  if (!fs.existsSync(dir)) return []
  const results = []

  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(d, entry.name))
      } else if (entry.name.endsWith('.md')) {
        const filePath = path.join(d, entry.name)
        const content = fs.readFileSync(filePath, 'utf-8')
        const { metadata, body } = parseFrontmatter(content)
        const relPath = path.relative(dir, filePath)
        results.push({
          name: metadata.name || entry.name.replace('.md', ''),
          filename: relPath,
          scope,
          description: metadata.description || '',
          model: metadata.model || '',
          tools: metadata.tools || '',
          disallowedTools: metadata.disallowedTools || '',
          permissionMode: metadata.permissionMode || '',
          prompt: body.trim().slice(0, 200),
          rawContent: content
        })
      }
    }
  }

  walk(dir)
  return results
}

router.get('/', (req, res) => {
  try {
    const userAgents = scanAgentsDir(USER_AGENTS_DIR, 'user')
    const projectAgents = scanAgentsDir(getProjectAgentsDir(), 'project')
    res.json([...userAgents, ...projectAgents])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:scope/:filename', (req, res) => {
  try {
    const { scope, filename } = req.params
    const dir = scope === 'project' ? getProjectAgentsDir() : USER_AGENTS_DIR
    const filePath = path.join(dir, filename.endsWith('.md') ? filename : filename + '.md')

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '代理不存在' })

    const content = fs.readFileSync(filePath, 'utf-8')
    const { metadata, body } = parseFrontmatter(content)
    res.json({
      name: metadata.name || path.basename(filePath, '.md'),
      filename: path.basename(filePath),
      scope,
      description: metadata.description || '',
      model: metadata.model || '',
      tools: metadata.tools || '',
      disallowedTools: metadata.disallowedTools || '',
      permissionMode: metadata.permissionMode || '',
      body,
      rawContent: content
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { scope, filename, content } = req.body
    if (!filename || !content) return res.status(400).json({ error: '缺少 filename 或 content' })

    const dir = scope === 'project' ? getProjectAgentsDir() : USER_AGENTS_DIR
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const safeName = (filename.endsWith('.md') ? filename : filename + '.md').replace(/[^a-zA-Z0-9_\-\.\/]/g, '-')
    const filePath = path.join(dir, safeName)

    const fileDir = path.dirname(filePath)
    if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true })

    fs.writeFileSync(filePath, content, 'utf-8')
    res.json({ success: true, filename: safeName })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:scope/:filename', (req, res) => {
  try {
    const { scope, filename } = req.params
    const { content } = req.body
    if (!content) return res.status(400).json({ error: '缺少 content' })

    const dir = scope === 'project' ? getProjectAgentsDir() : USER_AGENTS_DIR
    const filePath = path.join(dir, filename.endsWith('.md') ? filename : filename + '.md')

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '代理不存在' })

    fs.writeFileSync(filePath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:scope/:filename', (req, res) => {
  try {
    const { scope, filename } = req.params
    const dir = scope === 'project' ? getProjectAgentsDir() : USER_AGENTS_DIR
    const filePath = path.join(dir, filename.endsWith('.md') ? filename : filename + '.md')

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '代理不存在' })

    fs.unlinkSync(filePath)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
