/**
 * Dọn các import không dùng được phát hiện bởi oxlint.
 * Chạy: node scripts/fix-unused-imports.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function lintOutput() {
  try {
    return execSync('npm.cmd run lint', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (err) {
    return `${err.stdout || ''}${err.stderr || ''}`
  }
}

const output = lintOutput()
const removals = new Map()

for (const line of output.split('\n')) {
  const m = line.match(/^(.+?):(\d+):(\d+): warning eslint\(no-unused-vars\): Identifier '([^']+)' is imported but never used\./)
  if (!m) continue
  const [, file, , , identifier] = m
  if (!removals.has(file)) removals.set(file, new Set())
  removals.get(file).add(identifier)
}

let changed = 0
for (const [file, identifiers] of removals) {
  const abs = path.isAbsolute(file) ? file : path.join(root, file)
  if (!fs.existsSync(abs)) continue
  const content = fs.readFileSync(abs, 'utf8')
  let updated = content

  updated = updated.replace(/import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"])/g, (full, names, source) => {
    const parts = names.split(',').map((s) => s.trim()).filter(Boolean)
    const kept = parts.filter((p) => {
      const local = p.includes(' as ') ? p.split(' as ')[1].trim() : p
      return !identifiers.has(local)
    })
    if (kept.length === parts.length) return full
    if (!kept.length) return ''
    const multiline = full.includes('\n')
    const body = kept.join(multiline ? ', ' : ', ')
    return `import { ${body} } from ${source}`
  })

  if (updated !== content) {
    fs.writeFileSync(abs, updated, 'utf8')
    changed += 1
    console.log(`[fix] ${path.relative(root, abs)}: ${[...identifiers].join(', ')}`)
  }
}
console.log(`[fix] ${changed} file được cập nhật.`)
