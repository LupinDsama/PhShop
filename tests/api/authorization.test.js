import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail, createAdmin } from '../helpers/server.js'

let ctx
let admin
before(async () => {
  ctx = await startTestServer()
  admin = await createAdmin()
})
after(async () => { await ctx.close() })

async function makeCustomer(prefix = 'cust') {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail(prefix)
  await c.register({ name: 'Khách Test', email, password: 'MatKhau@123' })
  return { client: c, email }
}

test('đăng ký bằng email quản trị KHÔNG tự cấp quyền admin', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.register({
    name: 'Kẻ tấn công',
    email: 'nhantk123vip@gmail.com',
    password: 'MatKhau@123',
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.user.role, 'CUSTOMER', 'role phải lấy từ DB, không suy ra từ email')
  assert.equal(res.body.user.isAdmin, undefined)

  // Không được truy cập API admin
  const adminApi = await c.get('/api/admin/orders')
  assert.equal(adminApi.status, 403)
})

test('khách không đăng nhập không đọc được API quản trị', async () => {
  const c = new TestClient(ctx.baseUrl)
  for (const url of ['/api/admin/orders', '/api/admin/stats', '/api/admin/users', '/api/admin/audit', '/api/admin/products']) {
    const res = await c.get(url)
    assert.equal(res.status, 401, `${url} phải yêu cầu đăng nhập`)
  }
})

test('khách đăng nhập vẫn bị chặn API quản trị (403)', async () => {
  const { client } = await makeCustomer()
  for (const url of ['/api/admin/orders', '/api/admin/stats', '/api/admin/users', '/api/admin/audit']) {
    const res = await client.get(url)
    assert.equal(res.status, 403, `${url} phải bị từ chối với CUSTOMER`)
  }
  const write = await client.post('/api/admin/products', { name: 'Hacked', slug: 'hacked', category: 'figure', basePrice: 1, variants: [{ sku: 'X-1', price: 1, stock: 1 }] })
  assert.equal(write.status, 403)
})

test('admin có quyền đọc đơn hàng của mọi khách', async () => {
  const adminClient = new TestClient(ctx.baseUrl)
  const login = await adminClient.login(admin.email, admin.password)
  assert.equal(login.status, 200)
  assert.equal(login.body.user.role, 'SUPER_ADMIN')

  const res = await adminClient.get('/api/admin/orders')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.orders))
})

test('IDOR: khách A không đọc được đơn của khách B', async () => {
  const { client: a, email: emailA } = await makeCustomer('idorA')
  const { client: b, email: emailB } = await makeCustomer('idorB')

  // B tạo đơn
  await b.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  const orderB = await b.post('/api/orders', {
    recipient: 'Khách B', phone: '0912345678', address: '123 Nguyễn Huệ, Quận 1, TP.HCM', paymentMethod: 'COD',
  })
  assert.equal(orderB.status, 201)
  const orderId = orderB.body.order.id

  // A cố đọc đơn của B
  const read = await a.get(`/api/orders/${orderId}`)
  assert.equal(read.status, 404, 'phải trả 404 để không lộ sự tồn tại của đơn')

  // A cố hủy đơn của B
  const cancel = await a.post(`/api/orders/${orderId}/cancel`, {})
  assert.equal(cancel.status, 404)

  // A cố xem lịch sử trạng thái của đơn B
  const events = await a.get(`/api/orders/${orderId}/events`)
  assert.equal(events.status, 404)

  // B vẫn thấy đơn của mình
  const own = await b.get(`/api/orders/${orderId}`)
  assert.equal(own.status, 200)
  assert.equal(own.body.order.id, orderId)
  assert.equal(own.body.order.email, emailB)
  assert.ok(emailA)
})

test('IDOR: khách không sửa được đơn qua PATCH /api/orders/:id', async () => {
  const { client: a } = await makeCustomer('patchA')
  const { client: b } = await makeCustomer('patchB')
  await b.post('/api/cart/items', { variantId: 'v2', quantity: 1 })
  const orderB = await b.post('/api/orders', {
    recipient: 'Khách B', phone: '0912345678', address: '456 Lê Lợi, Quận 1, TP.HCM', paymentMethod: 'COD',
  })
  const orderId = orderB.body.order.id
  const res = await a.patch(`/api/orders/${orderId}`, { status: 'DELIVERED' })
  assert.ok(res.status === 404 || res.status === 403 || res.status === 405)
})

test('wishlist là riêng tư: A không xem/sửa được wishlist của B', async () => {
  const { client: a } = await makeCustomer('wishA')
  const { client: b } = await makeCustomer('wishB')

  const add = await b.post('/api/wishlist', { productId: 'p1' })
  assert.equal(add.status, 201)
  assert.equal(add.body.count, 1)

  const listA = await a.get('/api/wishlist')
  assert.equal(listA.status, 200)
  assert.equal(listA.body.count, 0, 'wishlist của A phải rỗng')

  // A xoá wishlist của B → 404
  const del = await a.delete('/api/wishlist/p1')
  assert.equal(del.status, 404)

  // B vẫn còn wishlist
  const listB = await b.get('/api/wishlist')
  assert.equal(listB.body.count, 1)
})

test('wishlist: không tạo bản ghi trùng khi gọi lặp', async () => {
  const { client } = await makeCustomer('wishdup')
  const first = await client.post('/api/wishlist', { productId: 'p2' })
  const second = await client.post('/api/wishlist', { productId: 'p2' })
  assert.equal(first.status, 201)
  assert.equal(second.status, 200)
  assert.equal(second.body.alreadyExists, true)
  assert.equal(second.body.count, 1)
})

test('khách không đổi được role của chính mình hoặc của người khác', async () => {
  const { client } = await makeCustomer('role')
  const me = await client.get('/api/auth/session')
  const selfRole = await client.patch(`/api/admin/users/${me.body.user.id}/role`, { role: 'ADMIN' })
  assert.equal(selfRole.status, 403)

  const other = await client.patch('/api/admin/users/1/role', { role: 'SUPER_ADMIN' })
  assert.equal(other.status, 403)
})

test('API đơn hàng yêu cầu đăng nhập', async () => {
  const c = new TestClient(ctx.baseUrl)
  assert.equal((await c.get('/api/orders')).status, 401)
  assert.equal((await c.post('/api/orders', {})).status, 401)
  assert.equal((await c.get('/api/wishlist')).status, 401)
})

test('sự kiện realtime chỉ tới người sở hữu: đăng nhập sai bị chặn', async () => {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.get('/api/events', { raw: true })
  assert.equal(res.status, 401)
})
