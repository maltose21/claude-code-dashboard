import path from 'path'

export function ensureWithin(baseDir, untrustedPath) {
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, untrustedPath)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('路径越界：不允许访问目标目录外的文件')
  }
  return resolved
}
