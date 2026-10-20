/**
 * Orders API cho khách hàng.
 * - Giá & tồn kho luôn tính lại từ DB.
 * - Idempotency-Key chống tạo đơn trùng khi double-click / retry.
 * - Mọi đơn đều thuộc sở hữu của user đang đăng nhập (IDOR protection).
 */
import { all, one, run, tx } from '../db/index.js'
import config from '../config.js'
import { parse, orderCreateSchema } from '../lib/validate.js'
import { conflict, notFound, badRequest, unprocessable } from '../lib/http.js'
import { computeTotals, checkCoupon } from '../lib/pricing.js'
import { generateOrderId, serializeOrder, logOrderEvent } from '../lib/orders.js'
import { assertTransition, ORDER_STATUSES } from '../lib/order-state.js'
import { createPaymentIntent } from '../lib/payment.js'
import { publish } from '../lib/events.js'
import { audit } from '../lib/audit.js'
import { consumeRateLimit } from '../lib/security.js'
import { resolveCart } from './cart.js'

const IDEMPOTENCY_HEADER = 'idempotency-key'

function loadCartLines(cartId) {
  const rows = all(
    `SELECT ci.id, ci.variant_id, ci.product_id, ci.quantity, ci.note,
            v.sku, v.color, v.size, v.price, v.stock, v.max_qty, v.status AS variant_status,
            p.name AS product_name, p.status AS product_status, p.production_days
     FROM cart_items ci
     JOIN variants v ON v.id = ci.variant_id
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ? ORDER BY ci.id`,
    [cartId],
  )
  return rows
}

export function registerOrderRoutes(router) {
  router.post('/api/orders', async (ctx) => {
    consumeRateLimit('orderCreate', `user:${ctx.user.id}`, config.rateLimits.orderCreate)
    const body = parse(orderCreateSchema, ctx.body)

    const idempotencyKey = String(ctx.headers[IDEMPOTENCY_HEADER] || '').trim()
    const scope = `user:${ctx.user.id}:POST:/api/orders`
    if (idempotencyKey) {
      const stored = one(`SELECT * FROM idempotency_keys WHERE scope = ? AND key = ?`, [scope, idempotencyKey])
      if (stored) {
        return ctx.json(stored.status_code, { ...JSON.parse(stored.response), replayed: true })
      }
    }

    const cart = resolveCart(ctx)
    const lines = loadCartLines(cart.id)
    if (!lines.length) throw badRequest('Giỏ hàng đang trống, không thể tạo đơn.')

    const unavailable = lines.filter(
      (l) => l.product_status !== 'active' || l.variant_status !== 'active' || l.stock < l.quantity,
    )
    if (unavailable.length) {
      throw unprocessable('Một số sản phẩm không còn đủ số lượng hoặc đã ngừng bán.', {
        items: unavailable.map((l) => ({
          variantId: l.variant_id,
          sku: l.sku,
          requested: l.quantity,
          available: l.stock,
          message:
            l.product_status !== 'active' || l.variant_status !== 'active'
              ? 'Sản phẩm đã ngừng bán.'
              : `Chỉ còn ${l.stock} sản phẩm trong kho.`,
        })),
      })
    }

    // Coupon
    let coupon = null
    if (body.couponCode) {
      const code = body.couponCode.toUpperCase()
      coupon = one(`SELECT * FROM coupons WHERE code = ?`, [code])
      const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
      const check = checkCoupon(coupon, subtotal)
      if (!check.ok) throw unprocessable(check.message)
    }

    const totals = computeTotals(
      lines.map((l) => ({ unitPrice: l.price, quantity: l.quantity })),
      coupon,
    )

    // Payment intent (không giả lập thành công)
    let payment
    try {
      payment = createPaymentIntent({ orderId: 'pending', amount: totals.total, method: body.paymentMethod })
    } catch (err) {
      if (err.code === 'payment_provider_not_configured' || err.code === 'payment_provider_not_implemented') {
        throw conflict(err.message)
      }
      throw err
    }

    const orderId = generateOrderId()
    const maxLeadTime = lines.reduce((m, l) => Math.max(m, l.production_days || 0), 0)

    const created = tx(() => {
      // Trừ kho có điều kiện → an toàn với request đồng thời.
      for (const line of lines) {
        const res = run(
          `UPDATE variants SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?`,
          [line.quantity, line.variant_id, line.quantity],
        )
        if (res.changes !== 1) {
          throw conflict(`Không đủ tồn kho cho ${line.sku}. Vui lòng cập nhật giỏ hàng.`)
        }
      }

      run(
        `INSERT INTO orders (id, user_id, email, recipient, phone, address, note, subtotal, discount, shipping_fee, total,
                             status, payment_method, payment_status, coupon_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_CONFIRMATION', ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          orderId,
          ctx.user.id,
          ctx.user.email,
          body.recipient,
          body.phone,
          body.address,
          body.note || '',
          totals.subtotal,
          totals.discount,
          totals.shippingFee,
          totals.total,
          body.paymentMethod,
          payment.status,
          coupon ? coupon.code : null,
        ],
      )

      for (const line of lines) {
        run(
          `INSERT INTO order_items (order_id, product_id, variant_id, sku, product_name, color, size, unit_price, quantity, note, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            line.product_id,
            line.variant_id,
            line.sku,
            line.product_name,
            line.color,
            line.size,
            line.price,
            line.quantity,
            line.note || '',
            line.price * line.quantity,
          ],
        )
      }

      if (coupon) {
        run(`UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`, [coupon.code])
      }

      run(`DELETE FROM cart_items WHERE cart_id = ?`, [cart.id])

      logOrderEvent(orderId, {
        type: 'created',
        toStatus: 'PENDING_CONFIRMATION',
        paymentTo: payment.status,
        actorUserId: ctx.user.id,
        actorRole: ctx.user.role,
        note: `Thời gian sản xuất dự kiến ${maxLeadTime} ngày.`,
      })

      return one(`SELECT * FROM orders WHERE id = ?`, [orderId])
    })

    const payload = {
      order: serializeOrder(created),
      payment: {
        provider: payment.provider,
        status: payment.status,
        instructions: payment.instructions,
        checkoutUrl: payment.checkoutUrl,
      },
    }

    if (idempotencyKey) {
      try {
        run(`INSERT INTO idempotency_keys (scope, key, status_code, response, created_at) VALUES (?, ?, ?, ?, datetime('now'))`, [
          scope,
          idempotencyKey,
          201,
          JSON.stringify(payload),
        ])
      } catch {
        // Đã có bản ghi (race) → trả về bản đã lưu.
        const stored = one(`SELECT * FROM idempotency_keys WHERE scope = ? AND key = ?`, [scope, idempotencyKey])
        if (stored) return ctx.json(stored.status_code, { ...JSON.parse(stored.response), replayed: true })
      }
    }

    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'order.create',
      entityType: 'order',
      entityId: orderId,
      after: { total: totals.total, status: 'PENDING_CONFIRMATION', paymentStatus: payment.status },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    // Realtime: thông báo cho admin và cho chính user.
    publish([`user:${ctx.user.id}`, 'admin'], {
      orderId,
      userId: ctx.user.id,
      status: 'PENDING_CONFIRMATION',
      paymentStatus: payment.status,
      total: totals.total,
      updatedAt: new Date().toISOString(),
    }, { type: 'order.created' })

    return ctx.json(201, payload)
  })

  router.get('/api/orders', async (ctx) => {
    const page = Math.max(Number.parseInt(ctx.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(ctx.query.limit, 10) || 10, 1), 50)
    const offset = (page - 1) * limit
    const status = ctx.query.status && ORDER_STATUSES.includes(ctx.query.status) ? ctx.query.status : null
    const where = ['user_id = ?']
    const params = [ctx.user.id]
    if (status) {
      where.push('status = ?')
      params.push(status)
    }
    const whereSql = `WHERE ${where.join(' AND ')}`
    const total = one(`SELECT COUNT(*) AS c FROM orders ${whereSql}`, params).c
    const rows = all(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    return ctx.json(200, {
      orders: rows.map((o) => serializeOrder(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  })

  router.get('/api/orders/:id', async (ctx) => {
    const order = one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')
    // Chỉ chủ đơn (hoặc admin) được xem → chặn IDOR.
    if (order.user_id !== ctx.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role)) {
      throw notFound('Không tìm thấy đơn hàng.')
    }
    return ctx.json(200, { order: serializeOrder(order, { includeInternal: ctx.user.role !== 'CUSTOMER' }) })
  })

  router.post('/api/orders/:id/cancel', async (ctx) => {
    const order = one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')
    if (order.user_id !== ctx.user.id) throw notFound('Không tìm thấy đơn hàng.')

    const check = assertTransition(order.status, 'CANCELLED', 'CUSTOMER', true)
    if (!check.ok) throw unprocessable(check.message, { code: check.code })

    tx(() => {
      // Trả lại tồn kho.
      for (const item of all(`SELECT variant_id, quantity FROM order_items WHERE order_id = ?`, [order.id])) {
        run(`UPDATE variants SET stock = stock + ? WHERE id = ?`, [item.quantity, item.variant_id])
      }
      run(
        `UPDATE orders SET status = 'CANCELLED', version = version + 1, updated_at = datetime('now') WHERE id = ?`,
        [order.id],
      )
      logOrderEvent(order.id, {
        type: 'status_change',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        actorUserId: ctx.user.id,
        actorRole: 'CUSTOMER',
        note: 'Khách hàng hủy đơn.',
      })
    })

    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'order.cancel',
      entityType: 'order',
      entityId: order.id,
      before: { status: order.status },
      after: { status: 'CANCELLED' },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    publish([`user:${order.user_id}`, 'admin'], {
      orderId: order.id,
      userId: order.user_id,
      status: 'CANCELLED',
      paymentStatus: order.payment_status,
      updatedAt: new Date().toISOString(),
    }, { type: 'order.updated' })

    const updated = one(`SELECT * FROM orders WHERE id = ?`, [order.id])
    return ctx.json(200, { order: serializeOrder(updated) })
  })

  router.post('/api/orders/:id/return', async (ctx) => {
    const order = one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')
    if (order.user_id !== ctx.user.id) throw notFound('Không tìm thấy đơn hàng.')

    const check = assertTransition(order.status, 'RETURN_REQUESTED', 'CUSTOMER', true)
    if (!check.ok) throw unprocessable(check.message, { code: check.code })

    const note = String(ctx.body?.note || '').slice(0, 500)
    run(
      `UPDATE orders SET status = 'RETURN_REQUESTED', version = version + 1, updated_at = datetime('now') WHERE id = ?`,
      [order.id],
    )
    logOrderEvent(order.id, {
      type: 'status_change',
      fromStatus: order.status,
      toStatus: 'RETURN_REQUESTED',
      actorUserId: ctx.user.id,
      actorRole: 'CUSTOMER',
      note: note || 'Khách hàng yêu cầu trả hàng.',
    })
    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'order.return_requested',
      entityType: 'order',
      entityId: order.id,
      before: { status: order.status },
      after: { status: 'RETURN_REQUESTED' },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    publish([`user:${order.user_id}`, 'admin'], {
      orderId: order.id,
      userId: order.user_id,
      status: 'RETURN_REQUESTED',
      paymentStatus: order.payment_status,
      updatedAt: new Date().toISOString(),
    }, { type: 'order.updated' })

    const updated = one(`SELECT * FROM orders WHERE id = ?`, [order.id])
    return ctx.json(200, { order: serializeOrder(updated) })
  })

  router.get('/api/orders/:id/events', async (ctx) => {
    const order = one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')
    if (order.user_id !== ctx.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role)) {
      throw notFound('Không tìm thấy đơn hàng.')
    }
    const { getOrderEvents } = await import('../lib/orders.js')
    return ctx.json(200, { events: getOrderEvents(order.id) })
  })
}
