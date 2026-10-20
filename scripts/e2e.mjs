/**
 * Bộ test E2E chạy bằng trình duyệt thật (patchright/Playwright).
 *
 * Mặc định: build production rồi chạy API server (vừa phục vụ API vừa phục vụ
 * file tĩnh trong dist/) → kiểm thử đúng bản build thật.
 *
 * Chạy:
 *   node scripts/e2e.mjs
 *   node scripts/e2e.mjs --base http://127.0.0.1:8787   # dùng server đã chạy
 *   node scripts/e2e.mjs --skip-build
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = 'C:/Users/thanh/.claude/skills/browser-automation'

const args = process.argv.slice(2)
const baseArgIndex = args.indexOf('--base')
const BASE = baseArgIndex >= 0 ? args[baseArgIndex + 1] : null
const skipBuild = args.includes('--skip-build')
// Chạy E2E trên dev server (Vite + StrictMode) để bắt lỗi chỉ xuất hiện ở dev.
const useDev = args.includes('--dev')
const DEV_PORT = process.env.E2E_DEV_PORT || '5188'

const PORT = process.env.E2E_PORT || '8791'
const DB_PATH = path.join(root, 'data', 'e2e.db')

// Phải set TRƯỚC khi import module server để cả script và server dùng cùng DB.
process.env.PHSHOP_DB_PATH = DB_PATH
process.env.PHSHOP_STATIC_DIR = path.join(root, 'dist')

const children = []
function spawnProcess(cmd, cmdArgs, env = {}) {
  const child = spawn(cmd, cmdArgs, { cwd: root, stdio: 'ignore', shell: false, env: { ...process.env, ...env } })
  children.push(child)
  return child
}

async function waitFor(url, timeoutMs = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch { /* chưa sẵn sàng */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function runCommand(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd: root, stdio: 'inherit', shell: false })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))))
  })
}

if (!BASE) {
  if (!skipBuild && !useDev) {
    console.log('[E2E] Đang build production...')
    await runCommand(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'])
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${suffix}`
    if (fs.existsSync(file)) fs.rmSync(file)
  }

  spawnProcess(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server', 'index.js')], {
    PORT,
  })
  const ready = await waitFor(`http://127.0.0.1:${PORT}/api/health`)
  if (!ready) {
    console.error('[E2E] Không khởi động được API server.')
    process.exitCode = 1
    throw new Error('api-not-ready')
  }

  if (useDev) {
    console.log('[E2E] Đang khởi động Vite dev server...')
    spawnProcess(process.execPath, [
      path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      '--port', DEV_PORT, '--host', '127.0.0.1', '--strictPort',
    ], { PHSHOP_API_TARGET: `http://127.0.0.1:${PORT}` })
    const devReady = await waitFor(`http://127.0.0.1:${DEV_PORT}/`, 90000)
    if (!devReady) {
      console.error('[E2E] Không khởi động được Vite dev server.')
      process.exitCode = 1
      throw new Error('vite-not-ready')
    }
  }
}

const BASE_URL = BASE || (useDev ? `http://127.0.0.1:${DEV_PORT}` : `http://127.0.0.1:${PORT}`)
const API_URL = BASE_URL

// Tài khoản admin CHỈ dùng cho database tạm của E2E (bị xoá trước mỗi lần chạy).
// Không phải credential production — production dùng `npm run bootstrap:admin` với
// PHSHOP_ADMIN_PASSWORD lấy từ secret manager.
const ADMIN_EMAIL = 'e2e-admin@phshop.local'
const ADMIN_PASSWORD = 'E2eAdminMatKhau@2026'

async function runSuite() {
  // Chuẩn bị dữ liệu admin
  const { bootstrapAdmin } = await import(pathToFileURL(path.join(root, 'server', 'scripts', 'bootstrap-admin.js')).href)
  await bootstrapAdmin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'SUPER_ADMIN' })
  const { seed } = await import(pathToFileURL(path.join(root, 'server', 'scripts', 'seed.js')).href)
  seed({ silent: true })

  const browserScript = path.join(root, 'tests', 'e2e', 'browser-suite.mjs')
  const proc = spawn(process.execPath, [path.join(skillDir, 'browser.mjs'), BASE_URL, '--script', browserScript], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      E2E_API_URL: API_URL,
      E2E_ADMIN_EMAIL: ADMIN_EMAIL,
      E2E_ADMIN_PASSWORD: ADMIN_PASSWORD,
    },
  })
  await new Promise((resolve) => proc.on('exit', resolve))
}

try {
  await runSuite()
} finally {
  for (const child of children) {
    try { child.kill() } catch { /* ignore */ }
  }
}
