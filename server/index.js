import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import conversationsRouter from './routes/conversations.js'
import memoriesRouter from './routes/memories.js'
import skillsRouter from './routes/skills.js'
import hooksRouter from './routes/hooks.js'
import pluginsRouter from './routes/plugins.js'
import mcpRouter from './routes/mcp.js'
import configRouter from './routes/config.js'
import permissionsRouter from './routes/permissions.js'
import overviewRouter from './routes/overview.js'
import rulesRouter from './routes/rules.js'
import diagnosticsRouter from './routes/diagnostics.js'
import hooklogRouter from './routes/hooklog.js'
import agentsRouter from './routes/agents.js'
import plansRouter from './routes/plans.js'
import sessionsRouter from './routes/sessions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3456

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.use('/api/conversations', conversationsRouter)
app.use('/api/memories', memoriesRouter)
app.use('/api/skills', skillsRouter)
app.use('/api/hooks', hooksRouter)
app.use('/api/plugins', pluginsRouter)
app.use('/api/mcp', mcpRouter)
app.use('/api/config', configRouter)
app.use('/api/permissions', permissionsRouter)
app.use('/api/overview', overviewRouter)
app.use('/api/rules', rulesRouter)
app.use('/api/diagnostics', diagnosticsRouter)
app.use('/api/hooklog', hooklogRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/plans', plansRouter)
app.use('/api/sessions', sessionsRouter)

const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(distDir, 'index.html'))
})

app.use((err, req, res, next) => {
  console.error('[API Error]', err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`Claude Code Dashboard running on http://127.0.0.1:${PORT}`)
})
