import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail } from '../helpers/server.js'

let ctx
before(async () => { ctx = await startTestServer() })
after(async () => { await ctx.close() })

async function newCart() {
  const c = new TestClient(ctx.baseUrl)
  await c.get('/api/cart') // tạo cookie giỏ khách vãng lai
  return c
}

test('giỏ khách vãng lai: thêm biến thể vào giỏ và tính tổng', async () => {
  const c = await newCart()
  const res = await c.post('/api/cart/items', { variantId: 'v1', quantity: 2 })
  assert.equal(res.status, 200)
  assert.equal(res.body.count, 2)
  assert.equal(res.body.subtotal, 500000)
  assert.equal(res.body.total, 500000)
  assert.equal(res.body.items.length, 1)
  assert.equal(res.body.items[0].sku, 'FIG-001-RED')
})

test('thêm cùng biến thể + cùng ghi chú → gộp vào một dòng, không tạo dòng trùng', async () => {
  const c = await newCart()
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 1, note: 'gói quà' })
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 2, note: 'gói quà' })
  const res = await c.get('/api/cart')
  assert.equal(res.body.items.length, 1, 'phải gộp thành 1 dòng')
  assert.equal(res.body.items[0].quantity, 3)
})

test('cùng biến thể nhưng khác ghi chú → hai dòng riêng biệt', async () => {
  const c = await newCart()
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 1, note: 'gói quà' })
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 1, note: 'không gói quà' })
  const res = await c.get('/api/cart')
  assert.equal(res.body.items.length, 2)
})

test('số lượng bị chặn bởi tồn kho và max_qty của server', async () => {
  const c = await newCart()
  // v1: stock 12, max_qty 10
  await c.post('/api/cart/items', { variantId: 'v1', quantity: 50 })
  const res = await c.get('/api/cart')
  assert.equal(res.body.items[0].quantity, 10, 'bị chặn bởi max_qty')
})

test('cập nhật số lượng trực tiếp qua API bị kiểm tra lại ở server', async () => {
  const c = await newCart()
  const added = await c.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  const itemId = added.body.items[0].id
  // v1 có max_qty = 10 → server phải chặn, không tin client
  const res = await c.patch(`/api/cart/items/${itemId}`, { quantity: 50 })
  assert.equal(res.status, 200)
  assert.equal(res.body.items[0].quantity, 10, 'server phải chặn vượt max_qty')

  // Giá trị vượt quá giới hạn schema (99) bị từ chối ngay ở tầng validation
  const res0 = await c.patch(`/api/cart/items/${itemId}`, { quantity: 999 })
  assert.equal(res0.status, 422)

  // Số lượng âm bị từ chối
  const resNeg = await c.patch(`/api/cart/items/${itemId}`, { quantity: -3 })
  assert.equal(resNeg.status, 422)

  const res2 = await c.patch(`/api/cart/items/${itemId}`, { quantity: 0 })
  assert.equal(res2.body.items.length, 0, 'quantity = 0 phải xoá dòng')
})

test('xoá một dòng và xoá toàn bộ giỏ', async () => {
  const c = await newCart()
  const added = await c.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  await c.post('/api/cart/items', { variantId: 'v2', quantity: 1 })
  const del = await c.delete(`/api/cart/items/${added.body.items[0].id}`)
  assert.equal(del.body.items.length, 1)
  const clear = await c.delete('/api/cart')
  assert.equal(clear.body.items.length, 0)
  assert.equal(clear.body.total, 0)
})

test('giỏ được bảo vệ theo cookie: khách khác không xoá được dòng của người khác', async () => {
  const a = await newCart()
  const b = await newCart()
  const added = await a.post('/api/cart/items', { variantId: 'v1', quantity: 1 })
  const itemId = added.body.items[0].id
  const res = await b.delete(`/api/cart/items/${itemId}`)
  assert.equal(res.status, 404)
  const still = await a.get('/api/cart')
  assert.equal(still.body.items.length, 1)
})

test('thêm biến thể không tồn tại bị từ chối', async () => {
  const c = await newCart()
  const res = await c.post('/api/cart/items', { variantId: 'v-khong-ton-tai', quantity: 1 })
  assert.equal(res.status, 404)
})

test('giỏ hàng tồn tại sau khi tải lại trang (dữ liệu server-side)', async () => {
  const c = await newCart()
  await c.post('/api/cart/items', { variantId: 'v3', quantity: 2 })
  const again = await c.get('/api/cart')
  assert.equal(again.body.count, 2)
  assert.equal(again.body.items[0].sku, 'FIG-001-BLK')
})

test('sau khi đăng nhập, giỏ khách vãng lai được hợp nhất vào giỏ tài khoản', async () => {
  const guest = await newCart()
  await guest.post('/api/cart/items', { variantId: 'v1', quantity: 2, note: 'gói quà' })

  const email = randomEmail('merge')
  const registered = await guest.register({ name: 'Khách Merge', email, password: 'MatKhau@123' })
  assert.equal(registered.status, 201)

  const merged = await guest.post('/api/cart/merge', {})
  assert.equal(merged.status, 200)
  assert.equal(merged.body.merged, 1)
  assert.equal(merged.body.count, 2)
  assert.equal(merged.body.items[0].note, 'gói quà')
})

test('giỏ đăng nhập đồng bộ giữa hai thiết bị (cùng tài khoản)', async () => {
  const email = randomEmail('sync')
  const device1 = new TestClient(ctx.baseUrl)
  await device1.register({ name: 'Khách Sync', email, password: 'MatKhau@123' })
  const device2 = new TestClient(ctx.baseUrl)
  await device2.login(email, 'MatKhau@123')

  await device1.post('/api/cart/items', { variantId: 'v4', quantity: 1 })
  const onDevice2 = await device2.get('/api/cart')
  assert.equal(onDevice2.body.count, 1, 'thiết bị 2 phải thấy giỏ của thiết bị 1')
  assert.equal(onDevice2.body.items[0].sku, 'DEC-002-WHT')
})
