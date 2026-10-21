/**
 * Chạy bộ test API trên Cloudflare D1 (wrangler dev + miniflare).
 * Mỗi file test được chạy với database sạch (reset trước) để không ảnh hưởng lẫn nhau.
 *
 * Dùng:
 *   node scripts/test-d1.mjs            # tự khởi động wrangler dev
 *   node scripts/test-d1.mjs --base http://127.0.0.1:8790   # dùng worker đã chạy
 */
import { spawn, execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
const BASE = baseIndex >= 0 ? args[baseIndex + 1] : null
const PORT = process.env.E2E_D1_PORT || '8790'

const FILES = [
  'tests/api/auth.test.js',
  'tests/api/authorization.test.js',
  'tests/api/cart.test.js',
  'tests/api/orders.test.js',
  'tests/api/admin.test.js',
  'tests/api/realtime.test.js',
  'tests/api/security.test.js',
]

function sh(cmd, cmdArgs, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'inherit', shell: true, ...opts })
}

async function waitFor(url, timeoutMs = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch { /* chưa sẵn sàng */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

let worker = null
if (!BASE) {
  console.log('[test-d1] Khởi động wrangler dev (D1 local)...')
  worker = spawn('npx.cmd', [
    'wrangler', 'dev', '-c', 'wrangler.worker.toml', '--port', PORT, '--ip', '127.0.0.1',
    '--var', 'PHSHOP_RL_API:100000', '--var', 'PHSHOP_RL_LOGIN:1000', '--var', 'PHSHOP_RL_REGISTER:1000',
    '--var', 'PHSHOP_RL_RESET:1000', '--var', 'PHSHOP_RL_CONTACT:1000', '--var', 'PHSHOP_RL_ORDER:1000',
    '--var', 'PHSHOP_RL_REVIEW:1000',
  ], { cwd: root, stdio: 'ignore', shell: true })
  const ready = await waitFor(`http://127.0.0.1:${PORT}/api/health`)
  if (!ready) {
    console.error('[test-d1] Worker không khởi động được.')
    worker?.kill()
    process.exit(1)
  }
}

const base = BASE || `http://127.0.0.1:${PORT}`
let failed = 0

for (const file of FILES) {
  process.stdout.write(`\n=== ${file} ===\n`)
  // Reset DB + tạo lại tài khoản admin test
  try {
    sh('node server/scripts/d1-reset.mjs --local')
    const { adminSql } = await import(pathToFileURL(path.join(root, 'server', 'scripts', 'bootstrap-admin-d1.mjs')).href)
    const result = await adminSql({ email: 'admin@test.local', password: 'AdminMatKhau@1' })
    const sqlFile = path.join(root, 'data', 'admin-test.sql')
    fs.writeFileSync(sqlFile, `${result.sql}\n`, 'utf8')
    sh(`npx.cmd wrangler d1 execute phshop --local --file="${sqlFile}" -c wrangler.worker.toml`)
  } catch (err) {
    console.error(`[test-d1] Không reset được DB: ${err.message}`)
  }

  const code = spawn(process.execPath, [
    '--disable-warning=ExperimentalWarning', '--test', path.join(root, file),
  ], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, PHSHOP_TEST_BASE_URL: base },
  })
  const exitCode = await new Promise((resolve) => code.on('exit', resolve))
  if (exitCode !== 0) failed += 1
}

console.log(`\n[test-d1] Hoàn tất. ${FILES.length - failed}/${FILES.length} file test xanh.`)
worker?.kill()
process.exit(failed > 0 ? 1 : 0)
