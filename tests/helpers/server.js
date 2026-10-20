/**
 * Helper khởi động server test trên port ngẫu nhiên với database tạm.
 * Mỗi test file chạy trong process riêng (node:test) nên env được set trước khi import.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phshop-test-'))
process.env.PHSHOP_DB_PATH = path.join(tmpDir, 'test.db')
process.env.NODE_ENV = 'test'
process.env.PHSHOP_SECURE_COOKIES = 'false'
process.env.PHSHOP_TRUST_PROXY = 'false'
// Rate limit cao để các test khác không bị ảnh hưởng; riêng test rate-limit sẽ override.
process.env.PHSHOP_RL_API = '100000'
process.env.PHSHOP_RL_LOGIN = '1000'
process.env.PHSHOP_RL_REGISTER = '1000'
process.env.PHSHOP_RL_RESET = '1000'
process.env.PHSHOP_RL_CONTACT = '1000'
process.env.PHSHOP_RL_ORDER = '1000'
process.env.PHSHOP_RL_REVIEW = '1000'

export async function startTestServer() {
  const { startServer } = await import('../../server/index.js')
  const { seed } = await import('../../server/scripts/seed.js')
  seed({ silent: true })
  const server = await startServer({ port: 0, host: '127.0.0.1' })
  const { port } = server.address()
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      // Đóng các stream SSE trước, nếu không server.close() sẽ không hoàn tất.
      try {
        const { closeAll } = await import('../../server/lib/events.js')
        closeAll()
      } catch { /* ignore */ }
      // Ngắt các socket keep-alive của undici để server.close() không bị treo.
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
      const { closeDb } = await import('../../server/db/index.js')
      closeDb()
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    },
  }
}

/** Tạo tài khoản quản trị qua đúng quy trình bootstrap của hệ thống. */
export async function createAdmin(email = 'admin@test.local', password = 'AdminMatKhau@1', role = 'SUPER_ADMIN') {
  const { bootstrapAdmin } = await import('../../server/scripts/bootstrap-admin.js')
  await bootstrapAdmin({ email, password, role })
  return { email, password, role }
}

/**
 * Tạo biến thể sản phẩm riêng cho test để các test không ảnh hưởng tồn kho của nhau.
 */
export async function createTestVariant({ price = 100000, stock = 100, maxQty = 50 } = {}) {
  const { run } = await import('../../server/db/index.js')
  const suffix = randomBytes(5).toString('hex')
  const productId = `tp_${suffix}`
  const variantId = `tv_${suffix}`
  run(
    `INSERT INTO products (id, slug, name, category, description, base_price, images, status, production_days, featured, created_at, updated_at)
     VALUES (?, ?, 'Sản phẩm kiểm thử', 'figure', 'Dùng cho test', ?, '[]', 'active', 3, 0, datetime('now'), datetime('now'))`,
    [productId, `test-product-${suffix}`, price],
  )
  run(
    `INSERT INTO variants (id, product_id, sku, color, size, price, stock, min_qty, max_qty, status, lead_time_days, created_at, updated_at)
     VALUES (?, ?, ?, 'Đỏ', '10cm', ?, ?, 1, ?, 'active', 3, datetime('now'), datetime('now'))`,
    [variantId, productId, `TEST-${suffix.toUpperCase()}`, price, stock, maxQty],
  )
  return { productId, variantId, price, stock }
}

/** Client HTTP giữ cookie jar + tự lấy CSRF token. */
export class TestClient {
  constructor(baseUrl, { ip } = {}) {
    this.baseUrl = baseUrl
    this.cookies = new Map()
    this.csrfToken = null
    this.ip = ip
  }

  cookieHeader() {
    if (!this.cookies.size) return null
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  absorb(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    for (const line of raw) {
      const [pair] = line.split(';')
      const idx = pair.indexOf('=')
      if (idx < 0) continue
      const name = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1).trim()
      if (value === '') this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }

  async request(method, url, { body, headers = {}, raw = false, csrf = true } = {}) {
    const finalHeaders = { ...headers }
    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json'
    }
    if (csrf && !['GET', 'HEAD'].includes(method)) {
      if (!this.csrfToken) await this.fetchCsrf()
      if (this.csrfToken) finalHeaders['X-CSRF-Token'] = this.csrfToken
    }
    const cookie = this.cookieHeader()
    if (cookie) finalHeaders.Cookie = cookie
    if (this.ip) finalHeaders['X-Forwarded-For'] = this.ip

    const res = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    })
    this.absorb(res)
    if (raw) return res
    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
    return { status: res.status, headers: res.headers, body: json, text }
  }

  async fetchCsrf() {
    const res = await fetch(`${this.baseUrl}/api/meta`, { headers: this.cookieHeader() ? { Cookie: this.cookieHeader() } : {} })
    this.absorb(res)
    const token = this.cookies.get('phshop_csrf')
    if (token) this.csrfToken = decodeURIComponent(token)
    return this.csrfToken
  }

  get(url, opts) { return this.request('GET', url, opts) }
  post(url, body, opts) { return this.request('POST', url, { ...opts, body }) }
  patch(url, body, opts) { return this.request('PATCH', url, { ...opts, body }) }
  put(url, body, opts) { return this.request('PUT', url, { ...opts, body }) }
  delete(url, body, opts) { return this.request('DELETE', url, { ...opts, body }) }

  async login(email, password) {
    const res = await this.post('/api/auth/login', { email, password })
    if (res.status === 200) this.user = res.body.user
    return res
  }

  async register(payload) {
    const res = await this.post('/api/auth/register', payload)
    if (res.status === 201) this.user = res.body.user
    return res
  }
}

export function randomEmail(prefix = 'user') {
  return `${prefix.toLowerCase()}-${randomBytes(6).toString('hex')}@example.com`
}

export function cleanupTemp() {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
}
