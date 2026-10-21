/**
 * Contact + review + newsletter + health/meta endpoints.
 */
import { all, one, run } from '../db/index.js'
import config from '../config.js'
import { parse, contactSchema, reviewSchema } from '../lib/validate.js'
import { consumeRateLimit } from '../lib/security.js'
import { audit } from '../lib/audit.js'
import { notFound, unprocessable, conflict } from '../lib/http.js'
import { publish, clientCount } from '../lib/events.js'
import { ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABELS } from '../lib/order-state.js'

export function registerMiscRoutes(router) {
  router.get('/api/health', async (ctx) => {
    const users = await one(`SELECT COUNT(*) AS c FROM users`)
    return ctx.json(200, {
      ok: true,
      env: config.nodeEnv,
      platform: config.platform,
      uptime: Math.round(process.uptime()),
      users: users?.c ?? 0,
      sseClients: clientCount(),
      time: new Date().toISOString(),
    })
  }, { auth: false })

  router.get('/api/meta', async (ctx) => {
    return ctx.json(200, {
      statuses: ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
      paymentStatuses: PAYMENT_STATUSES,
      paymentMethods: [
        { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', enabled: true },
        { value: 'MOMO', label: 'Ví MoMo', enabled: !!process.env.PHSHOP_MOMO_API_KEY },
        { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng', enabled: !!process.env.PHSHOP_BANK_TRANSFER_API_KEY },
      ],
      adminEmail: config.adminEmail,
      requireVerifiedEmail: config.requireVerifiedEmail,
      csrfToken: ctx.csrfToken.token,
    })
  }, { auth: false })

  router.post('/api/contact', async (ctx) => {
    consumeRateLimit('contact', ctx.ip, config.rateLimits.contact)
    const body = parse(contactSchema, ctx.body)
    const result = await run(
      `INSERT INTO contact_messages (name, email, phone, message, status, ip, created_at) VALUES (?, ?, ?, ?, 'new', ?, datetime('now'))`,
      [body.name, String(body.email).toLowerCase(), body.phone || '', body.message, ctx.ip],
    )
    await audit({
      actorEmail: body.email,
      action: 'contact.submit',
      entityType: 'contact_message',
      entityId: String(result.lastInsertRowid),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(201, { ok: true, message: 'Đã ghi nhận. Chúng tôi sẽ phản hồi sớm nhất có thể.' })
  }, { auth: false })

  router.post('/api/newsletter', async (ctx) => {
    consumeRateLimit('contact', `newsletter:${ctx.ip}`, { limit: 3, windowMs: 60 * 60 * 1000 })
    const email = String(ctx.body?.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw unprocessable('Email không hợp lệ.')
    return ctx.json(200, { ok: true, message: 'Đăng ký bản tin thành công.' })
  }, { auth: false })

  router.get('/api/products/:slug/reviews', async (ctx) => {
    const product = await one(`SELECT id FROM products WHERE slug = ?`, [ctx.params.slug])
    if (!product) throw notFound('Không tìm thấy sản phẩm.')
    const list = await all(
      `SELECT id, author, rating, comment, created_at FROM reviews WHERE product_id = ? AND status = 'published' ORDER BY id DESC LIMIT 50`,
      [product.id],
    )
    return ctx.json(200, {
      reviews: list.map((r) => ({
        id: r.id, author: r.author, rating: r.rating, comment: r.comment, createdAt: r.created_at,
      })),
    })
  }, { auth: false })

  router.post('/api/products/:slug/reviews', async (ctx) => {
    consumeRateLimit('review', `user:${ctx.user.id}`, config.rateLimits.review)
    const body = parse(reviewSchema, ctx.body)
    const product = await one(`SELECT * FROM products WHERE slug = ?`, [ctx.params.slug])
    if (!product) throw notFound('Không tìm thấy sản phẩm.')
    const exists = await one(`SELECT id FROM reviews WHERE product_id = ? AND user_id = ?`, [product.id, ctx.user.id])
    if (exists) throw conflict('Bạn đã đánh giá sản phẩm này rồi.')
    const result = await run(
      `INSERT INTO reviews (product_id, user_id, author, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, 'published', datetime('now'))`,
      [product.id, ctx.user.id, ctx.user.name || 'Khách hàng', body.rating, body.comment],
    )
    await publish(['admin'], { reviewId: Number(result.lastInsertRowid), productId: product.id }, { type: 'review.created' })
    return ctx.json(201, { ok: true, id: Number(result.lastInsertRowid) })
  })
}
