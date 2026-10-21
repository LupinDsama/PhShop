/**
 * Helper khởi động server test trên port ngẫu nhiên với database tạm.
 * Mỗi test file chạy trong process riêng (node:test) nên env được set trước khi import.
 *
 * Nếu đặt PHSHOP_TEST_BASE_URL → dùng server đã chạy sẵn (ví dụ `wrangler dev`
 * với D1) thay vì tự khởi động. Khi đó caller phải tự reset database trước.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const EXTERNAL_BASE_URL = process.env.PHSHOP_TEST_BASE_URL || null
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

let currentBaseUrl = null

export async function startTestServer() {
  if (EXTERNAL_BASE_URL) {
    currentBaseUrl = EXTERNAL_BASE_URL
    return {
      server: null,
      baseUrl: EXTERNAL_BASE_URL,
      external: true,
      async close() { /* server bên ngoài tự quản lý */ },
    }
  }
  const { startServer } = await import('../../server/index.js')
  const { seed } = await import('../../server/scripts/seed.js')
  await seed({ silent: true })
  const server = await startServer({ port: 0, host: '127.0.0.1' })
  const { port } = server.address()
  currentBaseUrl = `http://127.0.0.1:${port}`
  return {
    server,
    baseUrl: currentBaseUrl,
    async close() {
      // Đóng các stream SSE trước, nếu không server.close() sẽ không hoàn tất.
      try {
        const { closeAll } = await import('../../server/lib/events.js')
        closeAll()
      } catch { /* ignore */ }
      // Ngắt các socket keep-alive của undici để server.close() không bị treo.
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
      const { close } = await import('../../server/db/index.js')
      close()
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    },
  }
}

/** Tạo tài khoản quản trị qua đúng quy trình bootstrap của hệ thống. */
export async function createAdmin(email = 'admin@test.local', password = 'AdminMatKhau@1', role = 'SUPER_ADMIN') {
  if (EXTERNAL_BASE_URL) {
    // Server bên ngoài: tài khoản admin phải được tạo sẵn (script bootstrap D1).
    return { email, password, role }
  }
  const { bootstrapAdmin } = await import('../../server/scripts/bootstrap-admin.js')
  await bootstrapAdmin({ email, password, role })
  return { email, password, role }
}

const ADMIN_TEST_ACCOUNT = { email: 'admin@test.local', password: 'AdminMatKhau@1' }
let adminClientPromise = null

async function getAdminClient(baseUrl) {
  if (!adminClientPromise) {
    adminClientPromise = (async () => {
      const client = new TestClient(baseUrl)
      const res = await client.login(ADMIN_TEST_ACCOUNT.email, ADMIN_TEST_ACCOUNT.password)
      if (res.status !== 200) {
        throw new Error(`Không đăng nhập được tài khoản admin test: HTTP ${res.status}`)
      }
      return client
    })()
  }
  return adminClientPromise
}

/**
 * Tạo biến thể sản phẩm riêng cho test (qua API admin) để các test không ảnh
 * hưởng tồn kho của nhau — hoạt động giống nhau cho Node server và D1.
 */
export async function createTestVariant({ price = 100000, stock = 100, maxQty = 50 } = {}) {
  if (!currentBaseUrl) throw new Error('Chưa khởi động test server. Gọi startTestServer() trước.')
  const admin = await getAdminClient(currentBaseUrl)
  const suffix = randomBytes(5).toString('hex')
  const res = await admin.post('/api/admin/products', {
    name: 'Sản phẩm kiểm thử',
    slug: `test-product-${suffix}`,
    category: 'figure',
    description: 'Dùng cho test',
    basePrice: price,
    images: [],
    status: 'active',
    productionDays: 3,
    featured: false,
    variants: [{
      sku: `TEST-${suffix.toUpperCase()}`,
      color: 'Đỏ',
      size: '10cm',
      price,
      stock,
      minQty: 1,
      maxQty,
      status: 'active',
    }],
  })
  if (res.status !== 201) {
    throw new Error(`Không tạo được biến thể test: HTTP ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`)
  }
  const product = res.body.product
  return {
    productId: product.id,
    variantId: product.variants[0].id,
    slug: product.slug,
    price,
    stock,
  }
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
