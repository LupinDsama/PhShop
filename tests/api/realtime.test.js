import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, TestClient, randomEmail, createAdmin, createTestVariant } from '../helpers/server.js'

let ctx
let adminCreds
let platform = 'node'
before(async () => {
  ctx = await startTestServer()
  adminCreds = await createAdmin()
  // Cloudflare Worker: mỗi request chạy ở isolate riêng nên SSE in-memory không
  // đảm bảo tới được client; realtime dùng polling (được test riêng).
  try {
    const probe = new TestClient(ctx.baseUrl)
    const health = await probe.get('/api/health')
    platform = health.body?.platform || 'node'
  } catch { /* giữ 'node' */ }
})
after(async () => { await ctx.close() })

const sseLiveSupported = () => platform === 'node'

const SHIPPING = {
  recipient: 'Nguyễn Văn A',
  phone: '0912345678',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  paymentMethod: 'COD',
}

/** Mở kết nối SSE và gom các event nhận được. */
async function openStream(client, { lastEventId } = {}) {
  const controller = new AbortController()
  const events = []
  const headers = { Cookie: client.cookieHeader(), Accept: 'text/event-stream' }
  if (lastEventId) headers['Last-Event-ID'] = String(lastEventId)
  const res = await fetch(`${client.baseUrl}/api/events`, { headers, signal: controller.signal })
  if (!res.ok || !res.body) {
    controller.abort()
    return { status: res.status, events, close: () => {}, ready: false }
  }
  const decoder = new TextDecoder()
  let buffer = ''
  const readyPromise = new Promise((resolve) => {
    ;(async () => {
      try {
        for await (const chunk of res.body) {
          buffer += decoder.decode(chunk, { stream: true })
          let idx
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const event = { type: 'message', id: null, data: null }
            for (const line of raw.split('\n')) {
              if (line.startsWith('event:')) event.type = line.slice(6).trim()
              else if (line.startsWith('id:')) event.id = line.slice(3).trim()
              else if (line.startsWith('data:')) {
                try { event.data = JSON.parse(line.slice(5).trim()) } catch { event.data = line.slice(5).trim() }
              }
            }
            if (event.type !== 'message' || event.data) events.push(event)
            if (event.type === 'ready') resolve(true)
          }
        }
      } catch { /* stream kết thúc */ }
    })()
  })
  await Promise.race([readyPromise, new Promise((r) => setTimeout(r, 2000))])
  return {
    status: res.status,
    events,
    ready: events.some((e) => e.type === 'ready'),
    close: () => controller.abort(),
  }
}

function waitFor(predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        reject(new Error('timeout chờ event'))
      }
    }, 50)
  })
}

async function placeOrder(prefix = 'sse') {
  const v = await createTestVariant({ price: 250000, stock: 50 })
  const c = new TestClient(ctx.baseUrl)
  const email = randomEmail(prefix)
  await c.register({ name: 'Khách Realtime', email, password: 'MatKhau@123' })
  await c.post('/api/cart/items', { variantId: v.variantId, quantity: 1 })
  const order = await c.post('/api/orders', SHIPPING)
  return { client: c, email, orderId: order.body.order.id }
}
test('SSE: khách nhận được event khi admin đổi trạng thái đơn của họ', async () => {
  const { client, orderId } = await placeOrder('rt1')
  const stream = await openStream(client)
  assert.equal(stream.status, 200)
  assert.ok(stream.ready, 'phải nhận event ready')

  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  await admin.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })

  await waitFor(() => stream.events.some((e) => e.type === 'order.updated'))
  const evt = stream.events.find((e) => e.type === 'order.updated')
  assert.equal(evt.data.orderId, orderId)
  assert.equal(evt.data.status, 'CONFIRMED')
  assert.ok(evt.id, 'event phải có id để reconnect/replay')
  stream.close()
})

test('SSE: khách A không nhận event của đơn khách B', async () => {
  const a = await placeOrder('rtA')
  const b = await placeOrder('rtB')
  const streamA = await openStream(a.client)
  assert.ok(streamA.ready)

  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  await admin.patch(`/api/admin/orders/${b.orderId}`, { status: 'CONFIRMED' })

  await new Promise((r) => setTimeout(r, 600))
  const leaked = streamA.events.filter((e) => e.type === 'order.updated' && e.data.orderId === b.orderId)
  assert.equal(leaked.length, 0, 'không được rò rỉ đơn của người khác')
  streamA.close()
})

test('SSE: admin nhận event của mọi đơn', async (t) => {
  if (!sseLiveSupported()) {
    t.skip('Cloudflare Worker: SSE in-memory không dùng chung giữa các isolate — realtime dùng polling')
    return
  }
  const { orderId: _ownOrderId } = await placeOrder('rtAdmin')
  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  const stream = await openStream(admin)
  assert.ok(stream.ready)

  const other = await placeOrder('rtOther')
  const admin2 = new TestClient(ctx.baseUrl)
  await admin2.login(adminCreds.email, adminCreds.password)
  await admin2.patch(`/api/admin/orders/${other.orderId}`, { status: 'CONFIRMED' })

  await waitFor(() => stream.events.some((e) => e.type === 'order.updated' && e.data.orderId === other.orderId))
  stream.close()
})

test('SSE: sự kiện tạo đơn được phát khi khách đặt hàng', async (t) => {
  if (!sseLiveSupported()) {
    t.skip('Cloudflare Worker: dùng polling thay cho SSE')
    return
  }
  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  const stream = await openStream(admin)
  assert.ok(stream.ready)

  await placeOrder('rtCreate')
  await waitFor(() => stream.events.some((e) => e.type === 'order.created'))
  stream.close()
})
test('SSE: hỗ trợ reconnect bằng Last-Event-ID (replay sự kiện bị lỡ)', async (t) => {
  if (!sseLiveSupported()) {
    t.skip('Cloudflare Worker: replay qua polling (xem test endpoint polling)')
    return
  }
  const { client, orderId } = await placeOrder('rtReplay')
  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)

  // Lấy id sự kiện hiện tại rồi tạo một sự kiện mới
  const first = await openStream(client)
  assert.ok(first.ready)
  const admin2 = new TestClient(ctx.baseUrl)
  await admin2.login(adminCreds.email, adminCreds.password)
  await admin2.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })
  await waitFor(() => first.events.some((e) => e.type === 'order.updated'))
  const lastId = first.events.find((e) => e.type === 'order.updated').id
  first.close()

  // Mở lại stream với Last-Event-ID cũ hơn sự kiện vừa xảy ra → phải replay
  const replay = await openStream(client, { lastEventId: Number(lastId) - 1 })
  await waitFor(() => replay.events.some((e) => e.type === 'order.updated'))
  const replayed = replay.events.find((e) => e.type === 'order.updated')
  assert.ok(replayed, 'phải replay sự kiện bị lỡ khi reconnect')
  assert.equal(replayed.data.orderId, orderId)
  replay.close()
})

test('SSE: client không đăng nhập không mở được stream', async () => {
  const c = new TestClient(ctx.baseUrl)
  const stream = await openStream(c)
  assert.equal(stream.status, 401)
})

test('polling dự phòng: đơn vẫn đọc được qua API khi không dùng realtime', async () => {
  const { client, orderId } = await placeOrder('poll')
  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  await admin.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })

  const res = await client.get(`/api/orders/${orderId}`)
  assert.equal(res.status, 200)
  assert.equal(res.body.order.status, 'CONFIRMED', 'API phải trả trạng thái mới nhất')
})

test('endpoint polling sự kiện trả về sự kiện mới theo kênh của user', async () => {
  const { client, orderId } = await placeOrder('pollapi')
  const admin = new TestClient(ctx.baseUrl)
  await admin.login(adminCreds.email, adminCreds.password)
  await admin.patch(`/api/admin/orders/${orderId}`, { status: 'CONFIRMED' })

  // Chờ ghi log sự kiện rồi polling
  await new Promise((r) => setTimeout(r, 600))
  const res = await client.get('/api/events/poll?since=0')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.events))
  const own = res.body.events.filter((e) => e.data?.orderId === orderId)
  assert.ok(own.length > 0, 'phải thấy sự kiện của đơn của chính mình')
  assert.ok(own.some((e) => e.type === 'order.updated'))

  // Đơn của người khác không được lộ qua kênh user
  const other = await placeOrder('pollother')
  const res2 = await client.get(`/api/events/poll?since=0`)
  const leaked = res2.body.events.filter((e) => e.data?.orderId === other.orderId)
  assert.equal(leaked.length, 0, 'không được lấy sự kiện của người khác')
})
