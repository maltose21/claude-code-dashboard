import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'

const router = Router()
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions')

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const ENTRYPOINT_LABEL = {
  'claude-vscode': 'VS Code',
  'claude-cli': 'Terminal',
  'claude-desktop': 'Desktop',
  'claude-web': 'Web',
}

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return res.json([])

    const sessions = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'))
          return {
            pid: data.pid,
            sessionId: data.sessionId || '',
            cwd: data.cwd || '',
            project: data.cwd ? path.basename(data.cwd) : '',
            startedAt: data.startedAt ? new Date(data.startedAt).toISOString() : null,
            version: data.version || '',
            kind: data.kind || '',
            entrypoint: data.entrypoint || '',
            entrypointLabel: ENTRYPOINT_LABEL[data.entrypoint] || data.entrypoint || '',
            alive: isProcessAlive(data.pid)
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    sessions.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
