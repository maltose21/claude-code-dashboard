import fs from 'fs'
import path from 'path'

const CLAUDE_DIR = path.join(process.env.HOME, '.claude')

export function parseJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line) }
      catch { return null }
    })
    .filter(Boolean)
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { metadata: {}, body: content }
  const lines = match[1].split('\n')
  const metadata = {}
  let currentKey = null
  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      metadata[currentKey] = kvMatch[2]
    } else if (currentKey && line.startsWith('  ')) {
      if (!metadata[currentKey + '_nested']) metadata[currentKey + '_nested'] = {}
      const nestedMatch = line.match(/^\s+(\w+):\s*(.*)$/)
      if (nestedMatch) metadata[currentKey + '_nested'][nestedMatch[1]] = nestedMatch[2]
    }
  }
  return { metadata, body: match[2] }
}

export function getProjectDirs() {
  const projectsDir = path.join(CLAUDE_DIR, 'projects')
  if (!fs.existsSync(projectsDir)) return []
  return fs.readdirSync(projectsDir)
    .filter(name => {
      const full = path.join(projectsDir, name)
      return fs.statSync(full).isDirectory()
    })
    .map(name => ({
      dirName: name,
      displayName: name.replace(/-/g, '/'),
      fullPath: path.join(projectsDir, name)
    }))
}

export { CLAUDE_DIR }
