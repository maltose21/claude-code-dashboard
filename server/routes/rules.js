import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'

const router = Router()

const DESCRIPTION_MAP = {
  'karpathy': '基于 Andrej Karpathy 编码哲学的核心原则：先思考再编码、极简优先、外科手术式修改、目标驱动执行',
  'neat-freak': '完成重大开发任务后自动触发 neat-freak 技能，对项目文档和记忆进行洁癖级审查与同步',
  'auto-trigger': '自动触发规则 — 在特定条件满足时自动执行指定技能或操作',
  'security': '安全相关规则 — 防止引入安全漏洞，遵循 OWASP 最佳实践',
  'testing': '测试相关规则 — 确保代码变更有充分的测试覆盖',
  'commit': '提交规范 — Git 提交消息和工作流相关的规则',
  'style': '代码风格 — 命名、格式化、注释等编码规范',
}

function generateDescription(title, content) {
  const lowerTitle = title.toLowerCase()
  for (const [key, desc] of Object.entries(DESCRIPTION_MAP)) {
    if (lowerTitle.includes(key)) return desc
  }
  const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('Reference'))
  return firstLine ? firstLine.trim().slice(0, 120) : '自定义规则'
}

function extractItems(content) {
  const items = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)/)
    if (match) {
      items.push({ name: match[1], desc: match[2].trim() })
    }
  }
  return items
}

function extractReference(content) {
  const match = content.match(/Reference:\s*(https?:\/\/\S+)/i)
  return match ? match[1] : null
}

function parseClaudeMdRules(content, scope, source) {
  const rules = []
  const sections = content.split(/^## /m).slice(1)

  for (const section of sections) {
    const titleEnd = section.indexOf('\n')
    const title = section.slice(0, titleEnd).trim()
    const body = section.slice(titleEnd + 1).trim()

    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    const items = extractItems(body)
    const reference = extractReference(body)
    const description = generateDescription(title, body)

    rules.push({
      id,
      title,
      scope,
      source,
      description,
      content: body,
      items,
      reference,
      alwaysActive: true,
    })
  }

  return rules
}

function parseRuleFile(filePath, scope) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath)
  const displaySource = filePath.replace(process.env.HOME, '~')

  const titleMatch = content.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '')
  const body = titleMatch ? content.slice(content.indexOf('\n', content.indexOf(titleMatch[0])) + 1).trim() : content

  const id = filename.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const items = extractItems(body)
  const reference = extractReference(body)
  const description = generateDescription(title, body)

  return {
    id,
    title,
    scope,
    source: displaySource,
    description,
    content: body,
    items,
    reference,
    alwaysActive: true,
  }
}

router.get('/', (req, res) => {
  try {
    const rules = []

    const globalMd = path.join(CLAUDE_DIR, 'CLAUDE.md')
    if (fs.existsSync(globalMd)) {
      const content = fs.readFileSync(globalMd, 'utf-8')
      rules.push(...parseClaudeMdRules(content, 'user', '~/.claude/CLAUDE.md'))
    }

    const globalRulesDir = path.join(CLAUDE_DIR, 'rules')
    if (fs.existsSync(globalRulesDir)) {
      fs.readdirSync(globalRulesDir).filter(f => f.endsWith('.md')).forEach(f => {
        rules.push(parseRuleFile(path.join(globalRulesDir, f), 'user-rule'))
      })
    }

    const cwd = process.cwd()
    const projectMd = path.join(cwd, 'CLAUDE.md')
    if (fs.existsSync(projectMd)) {
      const content = fs.readFileSync(projectMd, 'utf-8')
      rules.push(...parseClaudeMdRules(content, 'project', './CLAUDE.md'))
    }

    const projectDotMd = path.join(cwd, '.claude', 'CLAUDE.md')
    if (fs.existsSync(projectDotMd)) {
      const content = fs.readFileSync(projectDotMd, 'utf-8')
      rules.push(...parseClaudeMdRules(content, 'project', './.claude/CLAUDE.md'))
    }

    const localMd = path.join(cwd, 'CLAUDE.local.md')
    if (fs.existsSync(localMd)) {
      const content = fs.readFileSync(localMd, 'utf-8')
      rules.push(...parseClaudeMdRules(content, 'local', './CLAUDE.local.md'))
    }

    const projectRulesDir = path.join(cwd, '.claude', 'rules')
    if (fs.existsSync(projectRulesDir)) {
      fs.readdirSync(projectRulesDir).filter(f => f.endsWith('.md')).forEach(f => {
        rules.push(parseRuleFile(path.join(projectRulesDir, f), 'project-rule'))
      })
    }

    res.json(rules)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
