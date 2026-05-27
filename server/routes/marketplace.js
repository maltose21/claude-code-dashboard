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
    tags: ['methodology', 'tdd', 'debugging', 'planning', 'code-review', 'test'],
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
    id: 'tdd-strict',
    name: 'TDD Strict Mode',
    author: 'community',
    description: '严格测试驱动开发 — 强制红-绿-重构循环，禁止在没有失败测试的情况下编写生产代码，包含测试反模式检查清单',
    url: 'https://github.com/obra/superpowers/tree/main/skills/test-driven-development',
    skills: ['test-driven-development'],
    tags: ['test', 'tdd', 'methodology'],
    featured: false,
  },
  {
    id: 'systematic-debugging',
    name: 'Systematic Debugging',
    author: 'obra',
    description: '系统化调试方法 — 4 阶段根因分析流程（调查 → 模式 → 假设 → 实现），杜绝猜测式修复，含防御性编程和条件等待技术',
    url: 'https://github.com/obra/superpowers/tree/main/skills/systematic-debugging',
    skills: ['systematic-debugging'],
    tags: ['debugging', 'methodology'],
    featured: false,
  },
  {
    id: 'code-review-pack',
    name: 'Code Review Workflow',
    author: 'obra',
    description: '代码审查全流程 — 包含发起审查前的自检清单、接收审查反馈的响应规范，确保 PR 质量一致性',
    url: 'https://github.com/obra/superpowers/tree/main/skills/requesting-code-review',
    skills: ['requesting-code-review', 'receiving-code-review'],
    tags: ['code-review', 'collaboration', 'quality'],
    featured: false,
  },
  {
    id: 'git-worktree-flow',
    name: 'Git Worktree Flow',
    author: 'obra',
    description: '基于 Git Worktree 的隔离开发流程 — 为每个功能创建独立工作树，确保测试基线干净，支持并行开发',
    url: 'https://github.com/obra/superpowers/tree/main/skills/using-git-worktrees',
    skills: ['using-git-worktrees', 'finishing-a-development-branch'],
    tags: ['git', 'workflow', 'isolation'],
    featured: false,
  },
  {
    id: 'planning-execution',
    name: 'Plan & Execute',
    author: 'obra',
    description: '计划编写与执行 — 将需求分解为 2-5 分钟的小任务，附带完整代码、精确路径和验证步骤，支持子代理并行执行',
    url: 'https://github.com/obra/superpowers/tree/main/skills/writing-plans',
    skills: ['writing-plans', 'executing-plans', 'dispatching-parallel-agents', 'subagent-driven-development'],
    tags: ['planning', 'execution', 'multi-agent'],
    featured: false,
  },
  {
    id: 'verification-completion',
    name: 'Verification Gate',
    author: 'obra',
    description: '完成前验证门控 — 禁止在没有运行验证命令的情况下声称任务完成，要求证据先于声明，消灭「应该可以了」式交付',
    url: 'https://github.com/obra/superpowers/tree/main/skills/verification-before-completion',
    skills: ['verification-before-completion'],
    tags: ['test', 'verification', 'quality'],
    featured: false,
  },
  {
    id: 'brainstorming-design',
    name: 'Brainstorming & Design',
    author: 'obra',
    description: '头脑风暴设计流程 — 苏格拉底式提问逐步深入，每次只问一个问题，提出 2-3 种方案对比，确保动手前需求清晰',
    url: 'https://github.com/obra/superpowers/tree/main/skills/brainstorming',
    skills: ['brainstorming'],
    tags: ['design', 'collaboration', 'planning'],
    featured: false,
  },
  {
    id: 'security-hardening',
    name: 'Security & Hardening',
    author: 'community',
    description: '安全加固技能 — OWASP Top 10 检查、依赖漏洞扫描、敏感信息泄露检测，适合安全敏感项目',
    url: 'https://github.com/anthropics/claude-code-security-skills',
    skills: ['security-and-hardening'],
    tags: ['security', 'hardening', 'audit'],
    featured: false,
  },
  {
    id: 'testing-quality',
    name: 'Testing & Quality',
    author: 'community',
    description: '测试与质量保障 — 包含测试策略设计、覆盖率分析、集成测试最佳实践，确保代码变更有充分的测试覆盖',
    url: 'https://github.com/anthropics/claude-code-testing-skills',
    skills: ['review-testing', 'tdd'],
    tags: ['test', 'quality', 'coverage'],
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
