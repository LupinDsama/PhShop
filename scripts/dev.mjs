#!/usr/bin/env node
/**
 * Chạy đồng thời API server và Vite dev server (không cần thêm dependency).
 * - API:  http://127.0.0.1:8787
 * - Web:  http://localhost:5173  (proxy /api -> API server)
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const children = []
let shuttingDown = false

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    // Không dùng shell để đường dẫn có khoảng trắng không bị tách sai.
    shell: false,
    env: { ...process.env, ...env },
  })
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.log(`[dev] ${name} đã dừng (code ${code}).`)
      shutdown(code ?? 0)
    }
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    try { child.kill() } catch { /* ignore */ }
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const apiPort = process.env.PORT || '8787'

start('api', process.execPath, [
  '--disable-warning=ExperimentalWarning',
  path.join(root, 'server', 'index.js'),
], { PORT: apiPort })

start('web', process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
], { PHSHOP_API_TARGET: `http://127.0.0.1:${apiPort}` })

console.log(`[dev] API: http://127.0.0.1:${apiPort}  |  Web: http://localhost:5173`)
