import fs from 'fs'
import path from 'path'
import { CLAUDE_DIR } from './parser.js'

const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json')

export function readSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
}

export function writeSettings(data) {
  const backup = SETTINGS_PATH + '.bak'
  if (fs.existsSync(SETTINGS_PATH)) {
    fs.copyFileSync(SETTINGS_PATH, backup)
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function updateSettings(updater) {
  const data = readSettings()
  updater(data)
  writeSettings(data)
  return data
}
