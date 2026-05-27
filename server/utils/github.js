import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { CLAUDE_DIR } from './parser.js'

export function parseGitHubUrl(url) {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/,
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/,
    /github\.com\/([^/]+)\/([^/]+)\/?$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      const [, owner, repo, branch, subPath] = match
      return {
        owner,
        repo: repo.replace(/\.git$/, ''),
        branch: branch || 'main',
        subPath: subPath || ''
      }
    }
  }
  return null
}

export async function installSkillFromGitHub(url) {
  const parsed = parseGitHubUrl(url)
  if (!parsed) throw new Error('无法解析 GitHub URL')

  const { owner, repo, branch, subPath } = parsed
  const tmpDir = path.join(os.tmpdir(), `claude-skill-${Date.now()}`)
  const skillsDir = path.join(CLAUDE_DIR, 'skills')

  try {
    const cloneUrl = `https://github.com/${owner}/${repo}.git`
    execSync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${tmpDir}`, {
      stdio: 'pipe',
      timeout: 30000
    })

    let sourceDir = tmpDir
    if (subPath) {
      sourceDir = path.join(tmpDir, subPath)
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`路径不存在: ${subPath}`)
      }
    }

    const skillMd = path.join(sourceDir, 'SKILL.md')
    if (!fs.existsSync(skillMd)) {
      const subDirs = fs.readdirSync(sourceDir).filter(f =>
        fs.statSync(path.join(sourceDir, f)).isDirectory() &&
        fs.existsSync(path.join(sourceDir, f, 'SKILL.md'))
      )
      if (subDirs.length === 0) {
        throw new Error('未找到 SKILL.md 文件')
      }

      if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true })
      const installed = []
      for (const dir of subDirs) {
        const dest = path.join(skillsDir, dir)
        if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true })
        copyDirSync(path.join(sourceDir, dir), dest)
        installed.push(dir)
      }
      return { installed, count: installed.length }
    }

    const skillName = subPath ? path.basename(subPath) : repo
    if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true })
    const dest = path.join(skillsDir, skillName)
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true })
    copyDirSync(sourceDir, dest)

    return { installed: [skillName], count: 1 }
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true })
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    if (entry === '.git') continue
    const srcPath = path.join(src, entry)
    const destPath = path.join(dest, entry)
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
