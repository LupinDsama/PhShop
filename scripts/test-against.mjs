/**
 * Chạy bộ test API (node:test) trên một server đã chạy sẵn — dùng để kiểm chứng
 * adapter D1 qua `wrangler dev` (miniflare) mà không cần sửa test.
 *
 * Dùng:
 *   node scripts/test-against.mjs http://127.0.0.1:8787
 *
 * Yêu cầu: DB của server đích phải sạch (reset) trước khi chạy.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = process.argv[2] || 'http://127.0.0.1:8787'

const env = { ...process.env, PHSHOP_TEST_BASE_URL: baseUrl }
const proc = spawn(process.execPath, [
  '--disable-warning=ExperimentalWarning',
  '--test',
  ...process.argv.slice(3).length ? process.argv.slice(3) : ['tests/api/admin.test.js', 'tests/api/auth.test.js', 'tests/api/authorization.test.js', 'tests/api/cart.test.js', 'tests/api/orders.test.js', 'tests/api/realtime.test.js', 'tests/api/security.test.js'],
], { cwd: root, stdio: 'inherit', shell: false, env })

proc.on('exit', (code) => process.exit(code ?? 0))
