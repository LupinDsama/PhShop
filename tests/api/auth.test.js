import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail } from '../helpers/server.js'

let ctx
before(async () => { ctx = await startTestServer() })
after(async () => { await ctx.close() })

test('health endpoint trả về trạng thái OK', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.get('/api/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.ok, true)
})

test('đăng ký tạo tài khoản CUSTOMER và trả về user', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('reg')
  const res = await c.register({ name: 'Nguyễn Test', email, password: 'MatKhau@123', phone: '0912345678' })
  assert.equal(res.status, 201)
  assert.equal(res.body.user.email, email)
  assert.equal(res.body.user.role, 'CUSTOMER')
  assert.equal(res.body.user.password, undefined)
  assert.equal(res.body.user.password_hash, undefined)
})

test('đăng ký trùng email bị từ chối', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('dup')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const c2 = new TestClient(ctx.baseUrl)
  const res = await c2.register({ name: 'Nguyễn B', email, password: 'MatKhau@123' })
  assert.equal(res.status, 409)
  assert.equal(res.body.error.code, 'conflict')
})

test('đăng ký với dữ liệu không hợp lệ bị chặn bởi validation', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.register({ name: 'x', email: 'khong-phai-email', password: '123' })
  assert.equal(res.status, 422)
  assert.ok(Array.isArray(res.body.error.details))
  assert.ok(res.body.error.details.length > 0)
})

test('đăng nhập sai mật khẩu bị từ chối với thông báo chung', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('login')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const c2 = new TestClient(ctx.baseUrl)
  const res = await c2.login(email, 'SaiMatKhau')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.code, 'unauthorized')
  assert.ok(!/không tồn tại/i.test(res.body.error.message))
})

test('đăng nhập đúng trả về cookie phiên HttpOnly + có cookie CSRF', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('session')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const res = await c.login(email, 'MatKhau@123')
  assert.equal(res.status, 200)
  const setCookies = res.headers.getSetCookie()
  const session = setCookies.find((s) => s.startsWith('phshop_sid='))
  assert.ok(session, 'phải có cookie phiên')
  assert.match(session, /HttpOnly/i)
  assert.match(session, /SameSite=(Lax|None)/i)
  assert.ok(c.cookies.has('phshop_csrf'), 'phải có cookie CSRF')
})

test('session endpoint trả user khi đã đăng nhập, null khi chưa', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('sess')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const me = await c.get('/api/auth/session')
  assert.equal(me.status, 200)
  assert.equal(me.body.user.email, email)

  const anon = new TestClient(ctx.baseUrl)
  const anonRes = await anon.get('/api/auth/session')
  assert.equal(anonRes.status, 200)
  assert.equal(anonRes.body.user, null)
})

test('đăng xuất vô hiệu hóa phiên', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('logout')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  await c.login(email, 'MatKhau@123')
  const out = await c.post('/api/auth/logout', {})
  assert.equal(out.status, 200)
  const after = await c.get('/api/auth/session')
  assert.equal(after.body.user, null)
})

test('cập nhật hồ sơ được lưu, không đổi được email', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('profile')
  await c.register({ name: 'Tên Cũ', email, password: 'MatKhau@123' })
  const res = await c.patch('/api/auth/profile', { name: 'Tên Mới', phone: '0987654321' })
  assert.equal(res.status, 200)
  assert.equal(res.body.user.name, 'Tên Mới')
  await c.patch('/api/auth/profile', { email: 'hacker@evil.com' })
  const me = await c.get('/api/auth/session')
  assert.equal(me.body.user.email, email)
})

test('đổi mật khẩu thành công và phiên cũ khác bị thu hồi', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('pwd')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  const c2 = new TestClient(ctx.baseUrl)
  await c2.login(email, 'MatKhau@123')

  const bad = await c.patch('/api/auth/password', { currentPassword: 'Sai', newPassword: 'MatKhauMoi@1' })
  assert.equal(bad.status, 401)

  const ok = await c.patch('/api/auth/password', { currentPassword: 'MatKhau@123', newPassword: 'MatKhauMoi@1' })
  assert.equal(ok.status, 200)

  const old = await c2.get('/api/auth/session')
  assert.equal(old.body.user, null, 'phiên khác phải bị thu hồi sau khi đổi mật khẩu')

  const fresh = new TestClient(ctx.baseUrl)
  const relogin = await fresh.login(email, 'MatKhauMoi@1')
  assert.equal(relogin.status, 200)
})

test('quên mật khẩu: token chỉ dùng được một lần và không lộ email tồn tại', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('reset')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })

  const req = await c.post('/api/auth/password-reset/request', { email })
  assert.equal(req.status, 202)
  const token = req.body.resetToken
  assert.ok(token, 'môi trường test phải trả token để kiểm thử được')

  const reqUnknown = await new TestClient(ctx.baseUrl).post('/api/auth/password-reset/request', { email: randomEmail('ghost') })
  assert.equal(reqUnknown.status, 202)
  assert.equal(reqUnknown.body.resetToken, undefined)
  assert.equal(reqUnknown.body.message, req.body.message, 'thông báo phải giống nhau để không lộ email')

  const confirm = await c.post('/api/auth/password-reset/confirm', { token, newPassword: 'MatKhauReset@9' })
  assert.equal(confirm.status, 200)
  const reuse = await c.post('/api/auth/password-reset/confirm', { token, newPassword: 'MatKhauReset@8' })
  assert.equal(reuse.status, 400, 'token không được dùng lại')
})

test('đặt lại mật khẩu thu hồi các phiên đang đăng nhập', async () => {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail('reset2')
  await c.register({ name: 'Nguyễn A', email, password: 'MatKhau@123' })
  await c.login(email, 'MatKhau@123')
  const req = await c.post('/api/auth/password-reset/request', { email })
  await c.post('/api/auth/password-reset/confirm', { token: req.body.resetToken, newPassword: 'MatKhauReset@9' })
  const after = await c.get('/api/auth/session')
  assert.equal(after.body.user, null)
})
