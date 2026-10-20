import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail, createAdmin, createTestVariant } from '../helpers/server.js'

let ctx
let admin
before(async () => {
  ctx = await startTestServer()
  admin = await createAdmin()
})
after(async () => { await ctx.close() })

const SHIPPING = {
  recipient: 'Nguyễn Văn A',
  phone: '0912345678',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  paymentMethod: 'COD',
}

async function customerWithCart(variantId, quantity = 1, prefix = 'ord') {
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail(prefix)
  await c.register({ name: 'Khách Đặt Hàng', email, password: 'MatKhau@123' })
  const added = await c.post('/api/cart/items', { variantId, quantity })
  assert.equal(added.status, 200, 'thêm vào giỏ phải thành công')
  return { client: c, email, cart: added.body }
}

async function adminClient() {
  const c = new TestClient(ctx.baseUrl)
  await c.login(admin.email, admin.password)
  return c
}

test('tạo đơn hàng hợp lệ: giá tính từ server, giỏ được xoá', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client, email } = await customerWithCart(v.variantId, 2)
  const res = await client.post('/api/orders', SHIPPING)
  assert.equal(res.status, 201)
  const order = res.body.order
  assert.equal(order.email, email)
  assert.equal(order.status, 'PENDING_CONFIRMATION')
  assert.equal(order.paymentStatus, 'UNPAID')
  assert.equal(order.subtotal, 500000)
  assert.equal(order.total, 500000)
  assert.equal(order.items.length, 1)
  assert.equal(order.items[0].quantity, 2)
  assert.equal(order.items[0].unitPrice, 250000)
  assert.ok(order.id.startsWith('PHS'))

  const cart = await client.get('/api/cart')
  assert.equal(cart.body.count, 0, 'giỏ phải được xoá sau khi đặt hàng')
})

test('client không thể giả giá: server bỏ qua giá gửi lên', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, total: 1, subtotal: 1, price: 1 })
  assert.equal(res.status, 201)
  assert.equal(res.body.order.total, 250000, 'giá phải do server tính')
  assert.equal(res.body.order.subtotal, 250000)
})

test('client không thể giả trạng thái thanh toán', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, paymentStatus: 'PAID', status: 'DELIVERED' })
  assert.equal(res.status, 201)
  assert.equal(res.body.order.paymentStatus, 'UNPAID')
  assert.equal(res.body.order.status, 'PENDING_CONFIRMATION')
})

test('idempotency: gửi lại cùng Idempotency-Key không tạo đơn trùng', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const key = 'idem-key-001'
  const first = await client.post('/api/orders', SHIPPING, { headers: { 'Idempotency-Key': key } })
  const second = await client.post('/api/orders', SHIPPING, { headers: { 'Idempotency-Key': key } })
  assert.equal(first.status, 201)
  assert.equal(second.status, 201)
  assert.equal(second.body.order.id, first.body.order.id, 'phải trả lại cùng đơn')
  assert.equal(second.body.replayed, true)

  const list = await client.get('/api/orders')
  assert.equal(list.body.total, 1, 'chỉ có 1 đơn trong DB')
})

test('idempotency: hai request song song cùng key chỉ tạo 1 đơn', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const key = 'idem-key-parallel'
  const [a, b] = await Promise.all([
    client.post('/api/orders', SHIPPING, { headers: { 'Idempotency-Key': key } }),
    client.post('/api/orders', SHIPPING, { headers: { 'Idempotency-Key': key } }),
  ])
  const ids = new Set([a.body.order?.id, b.body.order?.id].filter(Boolean))
  assert.equal(ids.size, 1, 'hai request song song phải cho cùng 1 đơn')
  const list = await client.get('/api/orders')
  assert.equal(list.body.total, 1)
})

test('đặt hàng khi giỏ trống bị từ chối', async () => {
  const c = new TestClient(ctx.baseUrl)
  await c.register({ name: 'Khách Trống Giỏ', email: randomEmail('empty'), password: 'MatKhau@123' })
  const res = await c.post('/api/orders', SHIPPING)
  assert.equal(res.status, 400)
})

test('tồn kho bị trừ khi đặt hàng và trả lại khi hủy', async () => {
  const v = await createTestVariant({ price: 180000, stock: 10 })
  const { client } = await customerWithCart(v.variantId, 2)
  const { one } = await import('../../server/db/index.js')

  const before = one(`SELECT stock FROM variants WHERE id = ?`, [v.variantId]).stock
  const order = await client.post('/api/orders', SHIPPING)
  const mid = one(`SELECT stock FROM variants WHERE id = ?`, [v.variantId]).stock
  assert.equal(mid, before - 2, 'khi đặt hàng phải trừ kho')

  const cancel = await client.post(`/api/orders/${order.body.order.id}/cancel`, {})
  assert.equal(cancel.status, 200)
  assert.equal(cancel.body.order.status, 'CANCELLED')

  const after = one(`SELECT stock FROM variants WHERE id = ?`, [v.variantId]).stock
  assert.equal(after, before, 'khi hủy phải trả lại tồn kho')
})

test('không đặt được quá số lượng tồn kho', async () => {
  const v = await createTestVariant({ price: 100000, stock: 3, maxQty: 50 })
  const { client } = await customerWithCart(v.variantId, 10)
  const cart = await client.get('/api/cart')
  assert.equal(cart.body.items[0].quantity, 3, 'giỏ bị giới hạn theo tồn kho')
})

test('đơn hàng chỉ xem được của chính mình, có phân trang và lọc trạng thái', async () => {
  const v1 = await createTestVariant({ price: 100000, stock: 50 })
  const v2 = await createTestVariant({ price: 200000, stock: 50 })
  const { client: a } = await customerWithCart(v1.variantId, 1, 'pageA')
  const { client: b } = await customerWithCart(v2.variantId, 1, 'pageB')
  await a.post('/api/orders', SHIPPING)
  await b.post('/api/orders', SHIPPING)

  const listA = await a.get('/api/orders')
  assert.equal(listA.status, 200)
  assert.equal(listA.body.total, 1)
  assert.equal(listA.body.orders[0].email, a.user.email)

  const filtered = await a.get('/api/orders?status=PENDING_CONFIRMATION')
  assert.equal(filtered.body.total, 1)
  const other = await a.get('/api/orders?status=DELIVERED')
  assert.equal(other.body.total, 0)
})

test('khách hủy đơn ở trạng thái cho phép', async () => {
  const v = await createTestVariant({ price: 180000, stock: 10 })
  const { client } = await customerWithCart(v.variantId, 1)
  const order = await client.post('/api/orders', SHIPPING)
  const cancel = await client.post(`/api/orders/${order.body.order.id}/cancel`, {})
  assert.equal(cancel.status, 200)
  assert.equal(cancel.body.order.status, 'CANCELLED')
})

test('khách không hủy được đơn đã chuyển sang sản xuất', async () => {
  const v = await createTestVariant({ price: 180000, stock: 10 })
  const { client } = await customerWithCart(v.variantId, 1)
  const order = await client.post('/api/orders', SHIPPING)
  const admin = await adminClient()
  const upd = await admin.patch(`/api/admin/orders/${order.body.order.id}`, { status: 'CONFIRMED' })
  assert.equal(upd.status, 200)
  const upd2 = await admin.patch(`/api/admin/orders/${order.body.order.id}`, { status: 'PROCESSING' })
  assert.equal(upd2.status, 200)

  const cancel = await client.post(`/api/orders/${order.body.order.id}/cancel`, {})
  assert.equal(cancel.status, 422, 'server phải từ chối hủy đơn đang sản xuất')
})

test('yêu cầu trả hàng chỉ hợp lệ khi đơn đã giao', async () => {
  const v = await createTestVariant({ price: 180000, stock: 10 })
  const { client } = await customerWithCart(v.variantId, 1)
  const order = await client.post('/api/orders', SHIPPING)
  const early = await client.post(`/api/orders/${order.body.order.id}/return`, { note: 'muốn trả' })
  assert.equal(early.status, 422)

  const admin = await adminClient()
  for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    const r = await admin.patch(`/api/admin/orders/${order.body.order.id}`, { status })
    assert.equal(r.status, 200, `chuyển sang ${status} phải thành công`)
  }
  const ret = await client.post(`/api/orders/${order.body.order.id}/return`, { note: 'muốn trả' })
  assert.equal(ret.status, 200)
  assert.equal(ret.body.order.status, 'RETURN_REQUESTED')
})

test('lịch sử trạng thái được lưu đầy đủ', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const order = await client.post('/api/orders', SHIPPING)
  const admin = await adminClient()
  await admin.patch(`/api/admin/orders/${order.body.order.id}`, { status: 'CONFIRMED', note: 'Đã gọi khách xác nhận' })
  await admin.patch(`/api/admin/orders/${order.body.order.id}`, { paymentStatus: 'PAID' })

  const events = await client.get(`/api/orders/${order.body.order.id}/events`)
  assert.equal(events.status, 200)
  const types = events.body.events.map((e) => e.type)
  assert.ok(types.includes('created'))
  assert.ok(types.includes('status_change'))
  assert.ok(types.includes('payment_change'))
  const statusEvent = events.body.events.find((e) => e.type === 'status_change')
  assert.equal(statusEvent.fromStatus, 'PENDING_CONFIRMATION')
  assert.equal(statusEvent.toStatus, 'CONFIRMED')
  assert.equal(statusEvent.actorRole, 'SUPER_ADMIN')
})

test('mã giảm giá dưới ngưỡng tối thiểu bị từ chối', async () => {
  const v = await createTestVariant({ price: 100000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, couponCode: 'PHSHOP10' })
  assert.equal(res.status, 422)
  assert.match(res.body.error.message, /tối thiểu/i)
})

test('mã giảm giá áp dụng đúng số tiền', async () => {
  const v = await createTestVariant({ price: 1000000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, couponCode: 'PHSHOP10' })
  assert.equal(res.status, 201)
  assert.equal(res.body.order.subtotal, 1000000)
  assert.equal(res.body.order.discount, 100000, 'giảm 10% tối đa 100.000đ')
  assert.equal(res.body.order.total, 900000)
})

test('mã giảm giá không tồn tại bị từ chối', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, couponCode: 'KHONG-CO-THAT' })
  assert.equal(res.status, 422)
})

test('thông tin giao hàng thiếu bị từ chối bởi validation', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { recipient: '', phone: 'abc', address: 'x' })
  assert.equal(res.status, 422)
})

test('cổng thanh toán chưa cấu hình không được giả lập thành công', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const res = await client.post('/api/orders', { ...SHIPPING, paymentMethod: 'MOMO' })
  assert.equal(res.status, 409)
  assert.match(res.body.error.message, /chưa được cấu hình/i)
})

test('đơn hàng tạo ra ghi nhận trong audit log', async () => {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const { client } = await customerWithCart(v.variantId, 1)
  const order = await client.post('/api/orders', SHIPPING)
  const admin = await adminClient()
  const audit = await admin.get('/api/admin/audit?action=order.create')
  assert.equal(audit.status, 200)
  assert.ok(audit.body.entries.length > 0)
  const entry = audit.body.entries.find((e) => e.entityId === order.body.order.id)
  assert.ok(entry, 'phải có audit log cho đơn hàng')
  assert.equal(entry.actorEmail, client.user.email)
})
