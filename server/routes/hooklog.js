import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from '../utils/parser.js'
import { readSettings, updateSettings } from '../utils/settings.js'

const router = Router()
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks')
const LOG_FILE = path.join(HOOKS_DIR, 'hook-log.jsonl')
const LOGGER_SCRIPT = path.join(HOOKS_DIR, 'hook-logger.sh')

const ALL_EVENTS = [
  'Setup', 'SessionStart', 'SessionEnd', 'UserPromptSubmit', 'UserPromptExpansion',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PostToolBatch',
  'PermissionRequest', 'PermissionDenied', 'Stop', 'StopFailure', 'MessageDisplay',
  'SubagentStart', 'SubagentStop', 'TaskCreated', 'TaskCompleted',
  'TeammateIdle', 'PreCompact', 'PostCompact', 'Elicitation', 'ElicitationResult',
  'InstructionsLoaded', 'ConfigChange', 'CwdChanged', 'FileChanged',
  'WorktreeCreate', 'WorktreeRemove', 'Notification'
]

const LOGGER_CONTENT = `#!/bin/sh
INPUT=$(cat 2>/dev/null || echo '{}')
# Extract event from stdin JSON (Claude Code passes hook_event_name in stdin payload)
EVENT=$(echo "$INPUT" | grep -o '"hook_event_name":"[^"]*"' | head -1 | cut -d'"' -f4)
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "{\\"timestamp\\":\\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\\",\\"event\\":\\"$EVENT\\",\\"tool\\":\\"$TOOL\\",\\"stdin\\":$INPUT}" >> "$HOME/.claude/hooks/hook-log.jsonl"
`

function ensureLoggerScript() {
  if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true })
  fs.writeFileSync(LOGGER_SCRIPT, LOGGER_CONTENT, { mode: 0o755 })
}

function isLoggerHook(hook) {
  return hook.type === 'command' && hook.command && hook.command.includes('hook-logger.sh')
}

// SSE stream — watches log file for new entries
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let fileSize = 0
  if (fs.existsSync(LOG_FILE)) {
    fileSize = fs.statSync(LOG_FILE).size
  }

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  let watcher = null
  let dirWatcher = null

  const readNewLines = () => {
    if (!fs.existsSync(LOG_FILE)) return
    const stat = fs.statSync(LOG_FILE)
    if (stat.size <= fileSize) {
      if (stat.size < fileSize) fileSize = 0
      return
    }

    const fd = fs.openSync(LOG_FILE, 'r')
    const buffer = Buffer.alloc(stat.size - fileSize)
    fs.readSync(fd, buffer, 0, buffer.length, fileSize)
    fs.closeSync(fd)
    fileSize = stat.size

    const lines = buffer.toString('utf-8').split('\n').filter(l => l.trim())
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        res.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`)
      } catch {}
    }
  }

  const startFileWatch = () => {
    if (watcher) return
    if (!fs.existsSync(LOG_FILE)) return
    try {
      watcher = fs.watch(LOG_FILE, () => readNewLines())
    } catch {}
  }

  startFileWatch()

  if (!watcher) {
    if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true })
    try {
      dirWatcher = fs.watch(HOOKS_DIR, (eventType, filename) => {
        if (filename === 'hook-log.jsonl') {
          startFileWatch()
          if (dirWatcher) { dirWatcher.close(); dirWatcher = null }
        }
      })
    } catch {}
  }

  req.on('close', () => {
    if (watcher) watcher.close()
    if (dirWatcher) dirWatcher.close()
  })
})

// Get recent log history
router.get('/history', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json([])

    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    const entries = []
    for (const line of lines.slice(-100)) {
      try { entries.push(JSON.parse(line)) } catch {}
    }
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Clear log file
router.post('/clear', (req, res) => {
  try {
    if (fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf-8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get current enable status
router.get('/status', (req, res) => {
  try {
    const settings = readSettings()
    const hooks = settings.hooks || {}
    const enabledEvents = []

    for (const [event, configs] of Object.entries(hooks)) {
      for (const config of configs) {
        if (config.hooks?.some(isLoggerHook)) {
          enabledEvents.push(event)
          break
        }
      }
    }

    res.json({ enabled: enabledEvents.length > 0, events: enabledEvents })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Enable logging for events
router.post('/enable', (req, res) => {
  try {
    const { events } = req.body
    const targetEvents = events === 'all' ? ALL_EVENTS : (events || ALL_EVENTS)

    ensureLoggerScript()

    updateSettings(settings => {
      if (!settings.hooks) settings.hooks = {}

      for (const event of targetEvents) {
        if (!settings.hooks[event]) settings.hooks[event] = []

        const alreadyHasLogger = settings.hooks[event].some(config =>
          config.hooks?.some(isLoggerHook)
        )
        if (alreadyHasLogger) continue

        settings.hooks[event].push({
          matcher: '',
          hooks: [{ type: 'command', command: LOGGER_SCRIPT }]
        })
      }
    })

    res.json({ success: true, events: targetEvents })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Disable logging — remove all logger hooks
router.post('/disable', (req, res) => {
  try {
    updateSettings(settings => {
      if (!settings.hooks) return

      for (const event of Object.keys(settings.hooks)) {
        settings.hooks[event] = settings.hooks[event].filter(config => {
          const remaining = (config.hooks || []).filter(h => !isLoggerHook(h))
          if (remaining.length === 0) return false
          config.hooks = remaining
          return true
        })
        if (settings.hooks[event].length === 0) delete settings.hooks[event]
      }
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
