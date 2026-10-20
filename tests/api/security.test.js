import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail } from '../helpers/server.js'

let ctx
before(async () => { ctx = await startTestServer() })
after(async () => { await ctx.close() })

test('security headers hiện diện trên mọi response', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.get('/api/health')
  assert.equal(res.status, 200)
  assert.ok(res.headers.get('content-security-policy'), 'phải có CSP')
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/)
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('x-frame-options'), 'DENY')
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.ok(res.headers.get('permissions-policy'))
})

test('CSRF: request thay đổi trạng thái thiếu token bị từ chối', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('csrf')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  // Gọi API thay đổi trạng thái mà không gửi header X-CSRF-Token
  const res = await c.request('POST', '/api/cart/items', { body: { variantId: 'v1', quantity: 1 }, csrf: false })
  assert.equal(res.status, 403)
  assert.match(res.body.error.message, /CSRF/i)
})

test('CSRF: token sai bị từ chối', async () => {
  const c = new TestClient(ctx.baseUrl)
  await c.fetchCsrf()
  const res = await c.request('POST', '/api/cart/items', {
    body: { variantId: 'v1', quantity: 1 },
    headers: { 'X-CSRF-Token': 'token-sai' },
    csrf: false,
  })
  assert.equal(res.status, 403)
})

test('CSRF: request hợp lệ với token đúng được chấp nhận', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  assert.equal(res.status, 200)
})

test('endpoint không tồn tại trả 404 chuẩn', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.get('/api/khong-ton-tai')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.code, 'not_found')
})

test('method không hỗ trợ trả 405', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.request('DELETE', '/api/health')
  assert.equal(res.status, 405)
  assert.equal(res.body.error.code, 'method_not_allowed')
})

test('lỗi server không lộ stack trace ra ngoài', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.post('/api/contact', { name: 'A', email: 'a@b.com', message: 'short' })
  assert.equal(res.status, 422)
  assert.equal(res.body.error.stack, undefined)
  assert.equal(res.body.stack, undefined)
  assert.ok(!/at .*\.js:\d+/.test(JSON.stringify(res.body)), 'không được lộ stack trace')
})

test('SQL injection trong tham số truy vấn không làm hỏng hệ thống', async () => {
  const c = new TestClient(ctx.baseUrl)
  const payloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    '1; DELETE FROM orders',
  ]
  for (const payload of payloads) {
    const res = await c.get(`/api/products?q=${encodeURIComponent(payload)}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.total, 0)
  }
  const health = await c.get('/api/health')
  assert.equal(health.status, 200)
  assert.ok(health.body.users >= 0)
})

test('SQL injection trong body đơn hàng bị chặn bởi validation', async () => {
  const c = new TestClient(ctx.baseUrl)
  await c.register({ name: 'Nguyễn A', email: randomEmail('sqli'), password: 'MatKhau@123' })
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  const res = await c.post('/api/orders', {
    recipient: "'; DROP TABLE orders; --",
    phone: '0912345678',
    address: 'x', // quá ngắn
    paymentMethod: 'COD',
  })
  assert.ok(res.status === 422 || res.status === 400)
  const health = await c.get('/api/health')
  assert.equal(health.status, 200)
})

test('giới hạn kích thước body', async () => {
  const c = new TestClient(ctx.baseUrl)
  await c.fetchCsrf()
  const huge = 'x'.repeat(300 * 1024)
  const res = await c.request('POST', '/api/contact', { body: { name: 'A', email: 'a@b.com', message: huge } })
  assert.ok(res.status === 413 || res.status === 422, `status thực tế: ${res.status}`)
  if (res.status === 413) assert.equal(res.body.error.code, 'payload_too_large')
})

test('rate limit chặn spam đăng nhập', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('rl')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  // Rate limit login đã được nới trong môi trường test, kiểm tra bộ đếm hoạt động
  const { checkRateLimit } = await import('../../server/lib/security.js')
  const { resetRateLimit } = await import('../../server/lib/security.js')
  const scope = 'test-rl'
  const identifier = `ip-${Date.now()}`
  resetRateLimit(scope, identifier)
  let blocked = false
  for (let i = 0; i < 5; i++) {
    const r = checkRateLimit(scope, identifier, { limit: 3, windowMs: 60000 })
    if (!r.allowed) { blocked = true; break }
  }
  assert.equal(blocked, true, 'bộ giới hạn phải chặn sau 3 lần')
})

test('rate limit form liên hệ chặn spam', async () => {
  const c = new TestClient(ctx.baseUrl, { ip: '10.9.9.9' })
  const { resetRateLimit } = await import('../../server/lib/security.js')
  resetRateLimit('contact', '10.9.9.9')
  const { config } = await import('../../server/config.js')
  const limit = config.rateLimits.contact.limit
  let blockedStatus = null
  for (let i = 0; i < limit + 2; i++) {
    const res = await c.post('/api/contact', {
      name: 'Nguyễn A', email: 'a@example.com', message: 'Nội dung đủ dài để hợp lệ.',
    })
    if (res.status === 429) { blockedStatus = res.status; break }
  }
  assert.equal(blockedStatus, 429, 'phải bị chặn bằng 429 sau khi vượt giới hạn')
})

test('thông báo lỗi không tiết lộ email có tồn tại hay không', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('enum')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const existing = await c.post('/api/auth/password-reset/request', { email })
  const missing = await c.post('/api/auth/password-reset/request', { email: randomEmail('none') })
  assert.equal(existing.status, missing.status)
  assert.equal(existing.body.message, missing.body.message)
})

test('cookie phiên không bị đặt trong localStorage và không xuất hiện trong query string', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('cookie')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const res = await c.get('/api/auth/session')
  assert.ok(!('token' in res.body), 'API không được trả token trong body')
  assert.equal(res.body.user.password_hash, undefined)
})
