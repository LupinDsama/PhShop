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

async function adminClient() {
  const c = new TestClient(ctx.baseUrl)
  const res = await c.login(admin.email, admin.password)
  assert.equal(res.status, 200)
  return c
}

async function placeOrder(prefix = 'adm') {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail(prefix)
  await c.register({ name: 'Khách Hàng', email, password: 'MatKhau@123' })
  await c.post('/api/cart/items', { variantId: v.variantId, quantity: 1 })
  const order = await c.post('/api/orders', SHIPPING)
  return { client: c, email, orderId: order.body.order.id }
}

test('admin tìm kiếm đơn hàng theo mã, email và trạng thái', async () => {
  const adm = await adminClient()
  const { email, orderId } = await placeOrder('search')
  const byId = await adm.get(`/api/admin/orders?q=${orderId}`)
  assert.equal(byId.status, 200)
  assert.ok(byId.body.orders.some((o) => o.id === orderId))

  const byEmail = await adm.get(`/api/admin/orders?q=${encodeURIComponent(email)}`)
  assert.ok(byEmail.body.orders.some((o) => o.email === email))

  const byStatus = await adm.get('/api/admin/orders?status=PENDING_CONFIRMATION')
  assert.ok(byStatus.body.orders.every((o) => o.status === 'PENDING_CONFIRMATION'))
  assert.ok(byStatus.body.total >= 1)
})

test('admin đổi trạng thái đơn theo quy trình hợp lệ, transition sai bị từ chối', async () => {
  const adm = await adminClient()
  const { orderId } = await placeOrder('trans')
  const ok = await adm.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.order.status, 'CONFIRMED')

  const bad = await adm.patch(`/api/admin/orders/${orderId}`, { status: 'DELIVERED' })
  assert.equal(bad.status, 422, 'không được nhảy từ CONFIRMED sang DELIVERED')
  assert.equal(bad.body.error.details.code, 'invalid_transition')

  // Gửi lại cùng trạng thái là thao tác idempotent, không gây lỗi và không tăng version
  const same = await adm.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })
  assert.equal(same.status, 200)
  assert.equal(same.body.order.version, ok.body.order.version, 'version không được tăng khi không có thay đổi')
})

test('admin cập nhật được trạng thái thanh toán, khách không tự đánh dấu đã thanh toán', async () => {
  const adm = await adminClient()
  const { client, orderId } = await placeOrder('pay')
  const paid = await adm.patch(`/api/admin/orders/${orderId}`, { paymentStatus: 'PAID' })
  assert.equal(paid.status, 200)
  assert.equal(paid.body.order.paymentStatus, 'PAID')

  const customerTry = await client.patch(`/api/orders/${orderId}`, { paymentStatus: 'PAID' })
  assert.ok(customerTry.status === 404 || customerTry.status === 405, 'khách không được tự đánh dấu đã thanh toán')
})

test('ghi chú nội bộ không hiển thị cho khách', async () => {
  const adm = await adminClient()
  const { client, orderId } = await placeOrder('note')
  const upd = await adm.patch(`/api/admin/orders/${orderId}`, {
    internalNote: 'Khách than phiền về chất lượng, cần gọi lại.',
    publicNote: 'Đơn sẽ giao trong 3 ngày.',
  })
  assert.equal(upd.status, 200)
  assert.equal(upd.body.order.internalNote, 'Khách than phiền về chất lượng, cần gọi lại.')

  const customerView = await client.get(`/api/orders/${orderId}`)
  assert.equal(customerView.status, 200)
  assert.equal(customerView.body.order.internalNote, undefined, 'ghi chú nội bộ không được lộ cho khách')
  assert.equal(customerView.body.order.publicNote, 'Đơn sẽ giao trong 3 ngày.')
})

test('cập nhật đồng thời được phát hiện qua version', async () => {
  const adm = await adminClient()
  const { orderId } = await placeOrder('ver')
  const first = await adm.get(`/api/admin/orders/${orderId}`)
  const version = first.body.order.version

  const upd1 = await adm.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED', expectedVersion: version })
  assert.equal(upd1.status, 200)

  const upd2 = await adm.patch(`/api/admin/orders/${orderId}`, { status: 'PROCESSING', expectedVersion: version })
  assert.equal(upd2.status, 409, 'phải báo xung đột khi dữ liệu đã bị người khác cập nhật')
})

test('admin quản lý sản phẩm: tạo, sửa, ẩn', async () => {
  const adm = await adminClient()
  const created = await adm.post('/api/admin/products', {
    name: 'Mô hình kiểm thử',
    slug: 'mo-hinh-kiem-thu',
    category: 'figure',
    description: 'Mô tả',
    basePrice: 199000,
    images: [],
    status: 'active',
    productionDays: 4,
    variants: [{ sku: 'TEST-SKU-1', color: 'Đỏ', size: '10cm', price: 199000, stock: 20, minQty: 1, maxQty: 5 }],
  })
  assert.equal(created.status, 201)
  const productId = created.body.product.id
  assert.equal(created.body.product.variants.length, 1)

  const dup = await adm.post('/api/admin/products', {
    name: 'Trùng slug', slug: 'mo-hinh-kiem-thu', category: 'figure', basePrice: 1,
    variants: [{ sku: 'TEST-SKU-2', price: 1, stock: 1 }],
  })
  assert.equal(dup.status, 409)

  const patched = await adm.patch(`/api/admin/products/${productId}`, { name: 'Đã đổi tên', status: 'hidden' })
  assert.equal(patched.status, 200)
  assert.equal(patched.body.product.name, 'Đã đổi tên')
  assert.equal(patched.body.product.status, 'hidden')

  // Sản phẩm bị ẩn không xuất hiện trong danh sách công khai
  const publicList = await new TestClient(ctx.baseUrl).get('/api/products?q=mo-hinh-kiem-thu')
  assert.equal(publicList.body.total, 0)
})

test('validation sản phẩm: thiếu biến thể hoặc slug sai bị từ chối', async () => {
  const adm = await adminClient()
  const noVariants = await adm.post('/api/admin/products', {
    name: 'Không biến thể', slug: 'khong-bien-the', category: 'figure', basePrice: 1000, variants: [],
  })
  assert.equal(noVariants.status, 422)

  const badSlug = await adm.post('/api/admin/products', {
    name: 'Slug sai', slug: 'Slug Có Dấu', category: 'figure', basePrice: 1000,
    variants: [{ sku: 'S-1', price: 1000, stock: 1 }],
  })
  assert.equal(badSlug.status, 422)

  const negativePrice = await adm.post('/api/admin/products', {
    name: 'Giá âm', slug: 'gia-am', category: 'figure', basePrice: -5,
    variants: [{ sku: 'S-2', price: -5, stock: 1 }],
  })
  assert.equal(negativePrice.status, 422)
})

test('chỉ SUPER_ADMIN được đổi vai trò và cấu hình hệ thống', async () => {
  const adm = await adminClient()
  const users = await adm.get('/api/admin/users')
  const target = users.body.users.find((u) => u.role === 'CUSTOMER')
  assert.ok(target)

  const res = await adm.patch(`/api/admin/users/${target.id}/role`, { role: 'SUPPORT' })
  assert.equal(res.status, 200)
  assert.equal(res.body.role, 'SUPPORT')

  const settings = await adm.put('/api/admin/settings', { shopName: 'PhShop' })
  assert.equal(settings.status, 200)

  // Tài khoản SUPPORT không được đổi vai trò
  const support = new TestClient(ctx.baseUrl)
  const login = await support.login(target.email, 'MatKhau@123')
  assert.equal(login.status, 200)
  const forbidden = await support.patch(`/api/admin/users/${target.id}/role`, { role: 'ADMIN' })
  assert.equal(forbidden.status, 403)
})

test('SUPPORT không được đổi trạng thái thanh toán', async () => {
  const adm = await adminClient()
  const { orderId } = await placeOrder('support')
  const users = await adm.get('/api/admin/users')
  const target = users.body.users.find((u) => u.role === 'CUSTOMER')
  await adm.patch(`/api/admin/users/${target.id}/role`, { role: 'SUPPORT' })

  const support = new TestClient(ctx.baseUrl)
  await support.login(target.email, 'MatKhau@123')
  const res = await support.patch(`/api/admin/orders/${orderId}`, { paymentStatus: 'PAID' })
  assert.equal(res.status, 422, 'SUPPORT không được cập nhật thanh toán')
})

test('audit log ghi lại thay đổi vai trò và có phân trang', async () => {
  const adm = await adminClient()
  const users = await adm.get('/api/admin/users')
  const target = users.body.users.find((u) => u.role === 'CUSTOMER')
  await adm.patch(`/api/admin/users/${target.id}/role`, { role: 'SUPPORT' })

  const audit = await adm.get('/api/admin/audit?action=user.role.change')
  assert.equal(audit.status, 200)
  assert.ok(audit.body.entries.length > 0)
  const entry = audit.body.entries[0]
  assert.equal(entry.before.role, 'CUSTOMER')
  assert.equal(entry.after.role, 'SUPPORT')
  assert.equal(entry.actorEmail, admin.email)
})

test('invitation quản trị: token hợp lệ cấp role admin, token sai thì không', async () => {
  const adm = await adminClient()
  const invite = await adm.post('/api/admin/invitations', { email: 'newadmin@example.com', role: 'ADMIN' })
  assert.equal(invite.status, 201)
  const token = invite.body.invitationToken
  assert.ok(token)

  const c = new TestClient(ctx.baseUrl)
  const reg = await c.register({ name: 'Quản trị mới', email: 'newadmin@example.com', password: 'MatKhau@123', inviteToken: token })
  assert.equal(reg.status, 201)
  assert.equal(reg.body.user.role, 'ADMIN')

  // Token dùng lần hai không cấp quyền
  const c2 = new TestClient(ctx.baseUrl)
  const reg2 = await c2.register({ name: 'Khác', email: 'another@example.com', password: 'MatKhau@123', inviteToken: token })
  assert.equal(reg2.status, 201)
  assert.equal(reg2.body.user.role, 'CUSTOMER')
})

test('coupon được tạo và cập nhật qua admin API', async () => {
  const adm = await adminClient()
  const created = await adm.post('/api/admin/coupons', {
    code: 'TEST20', type: 'percent', value: 20, minOrder: 100000, maxDiscount: 50000, active: true,
  })
  assert.equal(created.status, 201)
  const patched = await adm.patch('/api/admin/coupons/TEST20', { value: 25 })
  assert.equal(patched.status, 200)
  const list = await adm.get('/api/admin/coupons')
  const coupon = list.body.coupons.find((c) => c.code === 'TEST20')
  assert.equal(coupon.value, 25)
})

test('dashboard trả về số liệu tổng quan', async () => {
  const adm = await adminClient()
  const res = await adm.get('/api/admin/stats')
  assert.equal(res.status, 200)
  assert.ok(typeof res.body.totals.orders === 'number')
  assert.ok(typeof res.body.totals.revenue === 'number')
  assert.ok(Array.isArray(res.body.byStatus))
  assert.ok(Array.isArray(res.body.lowStock))
})

test('admin không được tự hạ quyền của chính mình', async () => {
  const adm = await adminClient()
  const me = await adm.get('/api/auth/session')
  const res = await adm.patch(`/api/admin/users/${me.body.user.id}/role`, { role: 'CUSTOMER' })
  assert.equal(res.status, 400)
})
