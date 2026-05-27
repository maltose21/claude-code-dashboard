import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { CLAUDE_DIR } from '../utils/parser.js'
import { readSettings } from '../utils/settings.js'

const router = Router()
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills')
const CLAUDE_JSON = path.join(process.env.HOME, '.claude.json')

function commandExists(cmd) {
  try {
    execFileSync('/usr/bin/which', [cmd], { stdio: 'pipe', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

function checkSkillsIntegrity() {
  const result = { id: 'skills-integrity', label: '技能完整性', status: 'pass', message: '', details: [] }

  if (!fs.existsSync(SKILLS_DIR)) {
    result.status = 'pass'
    result.message = '技能目录不存在（无技能已安装）'
    return result
  }

  const dirs = fs.readdirSync(SKILLS_DIR).filter(f => {
    try { return fs.statSync(path.join(SKILLS_DIR, f)).isDirectory() } catch { return false }
  })

  const missing = dirs.filter(d => !fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))

  if (missing.length === 0) {
    result.message = `所有 ${dirs.length} 个技能目录均含 SKILL.md`
  } else {
    result.status = 'warn'
    result.message = `${missing.length} 个技能目录缺少 SKILL.md`
    result.details = missing.map(d => `${d}/: 缺少 SKILL.md`)
  }
  return result
}

function checkHooksCommands() {
  const result = { id: 'hooks-commands', label: 'Hook 命令', status: 'pass', message: '', details: [] }
  const settings = readSettings()
  const hooks = settings.hooks || {}

  const commands = []
  for (const configs of Object.values(hooks)) {
    for (const config of configs) {
      for (const hook of (config.hooks || [])) {
        if (hook.type === 'command' || (!hook.type && hook.command)) {
          const cmd = (hook.command || '').split(' ')[0]
          if (cmd) commands.push(cmd)
        }
      }
    }
  }

  if (commands.length === 0) {
    result.message = '未配置 command 类型的 Hook'
    return result
  }

  const notFound = [...new Set(commands)].filter(c => !commandExists(c))
  if (notFound.length === 0) {
    result.message = `所有 ${commands.length} 个 Hook 命令均可找到`
  } else {
    result.status = 'warn'
    result.message = `${notFound.length} 个命令未在 PATH 中找到`
    result.details = notFound.map(c => `${c}: not found in PATH`)
  }
  return result
}

function checkMcpCommands() {
  const result = { id: 'mcp-commands', label: 'MCP 服务器', status: 'pass', message: '', details: [] }

  if (!fs.existsSync(CLAUDE_JSON)) {
    result.message = '未配置 MCP 服务器'
    return result
  }

  let cj
  try { cj = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8')) } catch {
    result.status = 'error'
    result.message = '.claude.json 解析失败'
    return result
  }

  const servers = []
  for (const [name, cfg] of Object.entries(cj.mcpServers || {})) {
    if ((cfg.type || 'stdio') === 'stdio' && cfg.command) {
      servers.push({ name, command: cfg.command })
    }
  }
  for (const [, pc] of Object.entries(cj.projects || {})) {
    if (pc?.mcpServers) {
      for (const [name, cfg] of Object.entries(pc.mcpServers)) {
        if ((cfg.type || 'stdio') === 'stdio' && cfg.command) {
          servers.push({ name, command: cfg.command })
        }
      }
    }
  }

  if (servers.length === 0) {
    result.message = '无 stdio 类型 MCP 服务器需要检查'
    return result
  }

  const notFound = servers.filter(s => !commandExists(s.command))
  if (notFound.length === 0) {
    result.message = `所有 ${servers.length} 个 MCP 命令均可找到`
  } else {
    result.status = 'warn'
    result.message = `${notFound.length} 个 MCP 命令未找到`
    result.details = notFound.map(s => `${s.name}: "${s.command}" not found`)
  }
  return result
}

function checkClaudeMdFormat() {
  const result = { id: 'claude-md-format', label: 'CLAUDE.md 格式', status: 'pass', message: '', details: [] }

  const mdPath = path.join(CLAUDE_DIR, 'CLAUDE.md')
  if (!fs.existsSync(mdPath)) {
    result.status = 'warn'
    result.message = '全局 CLAUDE.md 不存在（建议创建以定义行为规则）'
    return result
  }

  const content = fs.readFileSync(mdPath, 'utf-8')
  const lines = content.split('\n')

  const sections = content.split(/^## /m).slice(1)
  const emptySections = sections.filter(s => {
    const body = s.slice(s.indexOf('\n') + 1).trim()
    return !body
  })

  const codeBlocks = (content.match(/```/g) || []).length
  if (codeBlocks % 2 !== 0) {
    result.details.push('存在未关闭的代码块（``` 数量为奇数）')
  }

  if (emptySections.length > 0) {
    result.details.push(`${emptySections.length} 个空的 ## section`)
  }

  if (result.details.length > 0) {
    result.status = 'warn'
    result.message = `发现 ${result.details.length} 个格式问题`
  } else {
    result.message = `CLAUDE.md 格式正常（${sections.length} 个 section, ${lines.length} 行）`
  }
  return result
}

function checkPermissionsConflict() {
  const result = { id: 'permissions-conflict', label: '权限规则', status: 'pass', message: '', details: [] }
  const settings = readSettings()
  const allow = settings.permissions?.allow || []
  const deny = settings.permissions?.deny || []

  if (allow.length === 0 && deny.length === 0) {
    result.message = '未配置权限规则'
    return result
  }

  const conflicts = []
  for (const a of allow) {
    for (const d of deny) {
      const aBase = typeof a === 'string' ? a : a.pattern || ''
      const dBase = typeof d === 'string' ? d : d.pattern || ''
      if (aBase && dBase && (aBase.includes(dBase) || dBase.includes(aBase))) {
        conflicts.push(`allow "${aBase}" 与 deny "${dBase}" 可能冲突`)
      }
    }
  }

  if (conflicts.length === 0) {
    result.message = `${allow.length} 条 allow + ${deny.length} 条 deny，无明显冲突`
  } else {
    result.status = 'warn'
    result.message = `检测到 ${conflicts.length} 对可能冲突的规则`
    result.details = conflicts
  }
  return result
}

router.get('/', (req, res) => {
  try {
    const checks = [
      checkSkillsIntegrity(),
      checkHooksCommands(),
      checkMcpCommands(),
      checkClaudeMdFormat(),
      checkPermissionsConflict(),
    ]

    const summary = {
      total: checks.length,
      pass: checks.filter(c => c.status === 'pass').length,
      warn: checks.filter(c => c.status === 'warn').length,
      error: checks.filter(c => c.status === 'error').length,
    }

    res.json({ checks, summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
