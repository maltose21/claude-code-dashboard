import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()
const CLAUDE_JSON = path.join(process.env.HOME, '.claude.json')

function readClaudeJson() {
  if (!fs.existsSync(CLAUDE_JSON)) return {}
  return JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8'))
}

function writeClaudeJson(data) {
  fs.writeFileSync(CLAUDE_JSON, JSON.stringify(data, null, 2), 'utf-8')
}

function collectMcpServers() {
  const data = readClaudeJson()
  const servers = []

  if (data.mcpServers) {
    for (const [name, config] of Object.entries(data.mcpServers)) {
      servers.push({ name, scope: 'user', ...config })
    }
  }

  if (data.projects) {
    for (const [projectPath, projectConfig] of Object.entries(data.projects)) {
      if (projectConfig && typeof projectConfig === 'object' && projectConfig.mcpServers) {
        for (const [name, config] of Object.entries(projectConfig.mcpServers)) {
          servers.push({ name, scope: 'local', project: projectPath, ...config })
        }
      }
    }
  }

  return servers
}

router.get('/', (req, res) => {
  try {
    const servers = collectMcpServers()
    res.json(servers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { name, type, command, args, env, cwd, url, headers, scope, project } = req.body
    if (!name) return res.status(400).json({ error: '需要 name' })

    const data = readClaudeJson()

    const serverConfig = {}
    if (type === 'http' || type === 'streamable-http' || type === 'sse') {
      if (!url) return res.status(400).json({ error: 'HTTP/SSE 类型需要 url' })
      serverConfig.type = type
      serverConfig.url = url
      if (headers) serverConfig.headers = headers
    } else {
      if (!command) return res.status(400).json({ error: 'stdio 类型需要 command' })
      serverConfig.type = 'stdio'
      serverConfig.command = command
      if (args?.length) serverConfig.args = args
      if (cwd) serverConfig.cwd = cwd
    }
    if (env && Object.keys(env).length) serverConfig.env = env

    if (scope === 'local' && project) {
      if (!data.projects) data.projects = {}
      if (!data.projects[project]) data.projects[project] = {}
      if (!data.projects[project].mcpServers) data.projects[project].mcpServers = {}
      if (data.projects[project].mcpServers[name]) return res.status(409).json({ error: `MCP 服务器 "${name}" 已存在` })
      data.projects[project].mcpServers[name] = serverConfig
    } else {
      if (!data.mcpServers) data.mcpServers = {}
      if (data.mcpServers[name]) return res.status(409).json({ error: `MCP 服务器 "${name}" 已存在` })
      data.mcpServers[name] = serverConfig
    }

    writeClaudeJson(data)
    res.json({ success: true, server: serverConfig })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:name', (req, res) => {
  try {
    const serverName = decodeURIComponent(req.params.name)
    const { scope, project } = req.query
    const data = readClaudeJson()

    if (scope === 'local' && project && data.projects?.[project]?.mcpServers?.[serverName]) {
      delete data.projects[project].mcpServers[serverName]
    } else if (data.mcpServers?.[serverName]) {
      delete data.mcpServers[serverName]
    } else {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    writeClaudeJson(data)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
