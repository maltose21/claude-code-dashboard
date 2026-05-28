import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { parseJsonl, getProjectDirs, parseFrontmatter } from '../utils/parser.js'

const router = Router()
const CLAUDE_DIR = path.join(process.env.HOME, '.claude')

router.get('/', (req, res) => {
  try {
    const projects = getProjectDirs()
    const conversations = []

    for (const project of projects) {
      const files = fs.readdirSync(project.fullPath)
        .filter(f => f.endsWith('.jsonl'))

      for (const file of files) {
        const filePath = path.join(project.fullPath, file)
        const sessionId = file.replace('.jsonl', '')
        const lines = parseJsonl(filePath)

        const userMessages = lines.filter(l => l.type === 'user')
        const firstUserMsg = userMessages[0]
        let summary = ''
        if (firstUserMsg?.message?.content) {
          const content = firstUserMsg.message.content
          if (Array.isArray(content)) {
            const textContent = content.find(c => c.type === 'text' && !c.text?.startsWith('<'))
            summary = textContent?.text?.slice(0, 100) || ''
          } else if (typeof content === 'string') {
            summary = content.slice(0, 100)
          }
        }

        const timestamps = lines.filter(l => l.timestamp).map(l => new Date(l.timestamp).getTime())
        const startTime = timestamps.length ? Math.min(...timestamps) : 0
        const endTime = timestamps.length ? Math.max(...timestamps) : 0

        conversations.push({
          id: sessionId,
          project: project.displayName,
          projectDir: project.dirName,
          messageCount: userMessages.length,
          totalLines: lines.length,
          summary,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          cwd: firstUserMsg?.cwd || '',
          version: firstUserMsg?.version || ''
        })
      }
    }

    conversations.sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''))
    res.json(conversations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const projects = getProjectDirs()

    for (const project of projects) {
      const filePath = path.join(project.fullPath, `${id}.jsonl`)
      if (fs.existsSync(filePath)) {
        const lines = parseJsonl(filePath)
        const messages = lines
          .filter(l => l.type === 'user' || l.type === 'assistant')
          .map(l => {
            const content = l.message?.content
            let text = ''
            let toolUse
            if (Array.isArray(content)) {
              text = content.filter(c => c.type === 'text').map(c => c.text).join('\n')
              if (l.type === 'assistant') {
                toolUse = content.filter(c => c.type === 'tool_use').map(c => ({ name: c.name, id: c.id }))
              }
            } else if (typeof content === 'string') {
              text = content
            }
            return { type: l.type, uuid: l.uuid, timestamp: l.timestamp, content: text, toolUse }
          })

        return res.json({
          id,
          project: project.displayName,
          projectDir: project.dirName,
          messages
        })
      }
    }
    res.status(404).json({ error: 'Conversation not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    const projects = getProjectDirs()

    for (const project of projects) {
      const filePath = path.join(project.fullPath, `${id}.jsonl`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return res.json({ success: true })
      }
    }
    res.status(404).json({ error: 'Conversation not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/export', (req, res) => {
  try {
    const { id } = req.params
    const projects = getProjectDirs()

    for (const project of projects) {
      const filePath = path.join(project.fullPath, `${id}.jsonl`)
      if (fs.existsSync(filePath)) {
        const lines = parseJsonl(filePath)
        const messages = lines
          .filter(l => l.type === 'user' || l.type === 'assistant')
          .map(l => {
            const content = l.message?.content
            let text = ''
            if (Array.isArray(content)) {
              text = content.filter(c => c.type === 'text').map(c => c.text).join('\n')
            } else if (typeof content === 'string') {
              text = content
            }
            return { type: l.type, timestamp: l.timestamp, content: text }
          })

        let md = `# 对话记录\n\n`
        md += `- 项目: ${project.displayName}\n`
        md += `- 会话ID: ${id}\n`
        md += `- 消息数: ${messages.length}\n`
        if (messages[0]?.timestamp) md += `- 时间: ${new Date(messages[0].timestamp).toLocaleString('zh-CN')}\n`
        md += `\n---\n\n`

        for (const msg of messages) {
          const role = msg.type === 'user' ? '👤 用户' : '🤖 助手'
          const time = msg.timestamp ? ` (${new Date(msg.timestamp).toLocaleTimeString('zh-CN')})` : ''
          md += `## ${role}${time}\n\n${msg.content || '(空)'}\n\n---\n\n`
        }

        return res.json({ markdown: md, filename: `conversation-${id.slice(0, 8)}.md` })
      }
    }
    res.status(404).json({ error: 'Conversation not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/save-memory', (req, res) => {
  try {
    const { id } = req.params
    const { content, name, projectDir } = req.body

    if (!content || !name) {
      return res.status(400).json({ error: '缺少 name 或 content' })
    }

    const targetProjectDir = projectDir
      ? path.join(CLAUDE_DIR, 'projects', projectDir, 'memory')
      : path.join(CLAUDE_DIR, 'projects', getProjectDirs()[0]?.dirName || 'default', 'memory')

    if (!fs.existsSync(targetProjectDir)) {
      fs.mkdirSync(targetProjectDir, { recursive: true })
    }

    const filename = name.replace(/[^a-zA-Z0-9_-]/g, '-') + '.md'
    const filePath = path.join(targetProjectDir, filename)
    fs.writeFileSync(filePath, content, 'utf-8')

    const indexPath = path.join(targetProjectDir, 'MEMORY.md')
    let indexContent = ''
    if (fs.existsSync(indexPath)) {
      indexContent = fs.readFileSync(indexPath, 'utf-8')
    }
    const entry = `- [${name}](${filename}) — 从对话 ${id.slice(0, 8)} 导出\n`
    if (!indexContent.includes(filename)) {
      fs.writeFileSync(indexPath, indexContent + entry, 'utf-8')
    }

    return res.json({ success: true, path: filePath })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
