import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'
import { installSkillFromGitHub } from '../utils/github.js'

const router = Router()
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills')

const RECOMMENDED_PACKS = [
  {
    id: 'superpowers',
    name: 'Superpowers',
    author: 'Jesse Vincent (obra)',
    description: '完整的软件开发方法论 — 包含 TDD、系统调试、头脑风暴、计划编写、代码审查、Git Worktree 等 14 个技能，覆盖从需求分析到代码交付的全流程',
    url: 'https://github.com/obra/superpowers',
    installUrl: 'https://github.com/obra/superpowers/tree/main/skills',
    skills: [
      'brainstorming', 'dispatching-parallel-agents', 'executing-plans',
      'finishing-a-development-branch', 'receiving-code-review', 'requesting-code-review',
      'subagent-driven-development', 'systematic-debugging', 'test-driven-development',
      'using-git-worktrees', 'using-superpowers', 'verification-before-completion',
      'writing-plans', 'writing-skills'
    ],
    tags: ['methodology', 'tdd', 'debugging', 'planning', 'code-review'],
    featured: true,
  },
  {
    id: 'karpathy-guidelines',
    name: 'Karpathy Guidelines',
    author: 'multica-ai',
    description: 'Andrej Karpathy 编码哲学 — 先思考再编码、极简优先、外科手术式修改、目标驱动执行，适合作为全局编码规范',
    url: 'https://github.com/multica-ai/andrej-karpathy-skills',
    skills: ['karpathy-guidelines'],
    tags: ['philosophy', 'coding-style', 'guidelines'],
    featured: true,
  },
  {
    id: 'claude-code-memory',
    name: 'Memory Management',
    author: 'anthropic',
    description: '记忆管理最佳实践 — 帮助 Claude 更好地利用跨会话记忆，自动整理和去重',
    url: 'https://github.com/anthropics/claude-code-memory-skills',
    skills: ['memory-management', 'neat-freak'],
    tags: ['memory', 'organization'],
    featured: false,
  },
]

function getInstalledSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return []
  return fs.readdirSync(SKILLS_DIR).filter(f => {
    try {
      return fs.statSync(path.join(SKILLS_DIR, f)).isDirectory()
    } catch { return false }
  })
}

router.get('/', (req, res) => {
  try {
    const installed = getInstalledSkills()

    const packs = RECOMMENDED_PACKS.map(pack => {
      const installedSkills = pack.skills.filter(s => installed.includes(s))
      let status = 'not_installed'
      if (installedSkills.length === pack.skills.length) status = 'installed'
      else if (installedSkills.length > 0) status = 'partial'

      return {
        ...pack,
        installStatus: status,
        installedCount: installedSkills.length,
        totalCount: pack.skills.length,
      }
    })

    res.json(packs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/install', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: '需要提供 url' })

    const result = await installSkillFromGitHub(url)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
