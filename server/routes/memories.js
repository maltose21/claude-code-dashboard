import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { getProjectDirs, parseFrontmatter } from '../utils/parser.js'

const router = Router()
const CLAUDE_DIR = path.join(process.env.HOME, '.claude')

router.get('/', (req, res) => {
  try {
    const projects = getProjectDirs()
    const memories = []

    for (const project of projects) {
      const memoryDir = path.join(project.fullPath, 'memory')
      if (!fs.existsSync(memoryDir)) continue

      const memoryIndex = path.join(memoryDir, 'MEMORY.md')
      let indexContent = ''
      if (fs.existsSync(memoryIndex)) {
        indexContent = fs.readFileSync(memoryIndex, 'utf-8')
      }

      const memoryFiles = fs.readdirSync(memoryDir)
        .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
        .map(f => {
          const content = fs.readFileSync(path.join(memoryDir, f), 'utf-8')
          const { metadata, body } = parseFrontmatter(content)
          return {
            filename: f,
            name: metadata.name || f.replace('.md', ''),
            description: metadata.description || '',
            type: metadata.metadata_nested?.type || metadata.type || 'unknown',
            body,
            rawContent: content
          }
        })

      memories.push({
        project: project.displayName,
        projectDir: project.dirName,
        indexContent,
        files: memoryFiles
      })
    }

    res.json(memories)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:projectDir/:filename', (req, res) => {
  try {
    const { projectDir, filename } = req.params
    const { content } = req.body
    if (!content) return res.status(400).json({ error: '缺少 content' })

    const memoryDir = path.join(CLAUDE_DIR, 'projects', projectDir, 'memory')
    const filePath = path.join(memoryDir, filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '记忆文件不存在' })

    fs.writeFileSync(filePath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:projectDir/:filename', (req, res) => {
  try {
    const { projectDir, filename } = req.params
    const memoryDir = path.join(CLAUDE_DIR, 'projects', projectDir, 'memory')
    const filePath = path.join(memoryDir, filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '记忆文件不存在' })

    fs.unlinkSync(filePath)

    const indexPath = path.join(memoryDir, 'MEMORY.md')
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf-8')
      const lines = indexContent.split('\n').filter(line => !line.includes(filename))
      fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { projectDir, filename, content } = req.body
    if (!projectDir || !filename || !content) {
      return res.status(400).json({ error: '缺少 projectDir, filename 或 content' })
    }

    const memoryDir = path.join(CLAUDE_DIR, 'projects', projectDir, 'memory')
    if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true })

    const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/\.md$/, '') + '.md'
    const filePath = path.join(memoryDir, safeName)
    fs.writeFileSync(filePath, content, 'utf-8')

    const indexPath = path.join(memoryDir, 'MEMORY.md')
    let indexContent = ''
    if (fs.existsSync(indexPath)) {
      indexContent = fs.readFileSync(indexPath, 'utf-8')
    }
    if (!indexContent.includes(safeName)) {
      const { metadata } = parseFrontmatter(content)
      const entry = `- [${metadata.name || safeName}](${safeName}) — ${metadata.description || '手动创建'}\n`
      fs.writeFileSync(indexPath, indexContent + entry, 'utf-8')
    }

    res.json({ success: true, filename: safeName })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
