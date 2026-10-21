/**
 * Admin API. Mọi endpoint đều kiểm tra quyền ở backend.
 * - SUPPORT: chỉ xem đơn, cập nhật trạng thái vận hành.
 * - ADMIN: thêm/sửa sản phẩm, coupon, cập nhật thanh toán, ghi chú nội bộ.
 * - SUPER_ADMIN: quản lý vai trò, tạo invitation quản trị, cấu hình hệ thống.
 */
import { all, one, run, tx } from '../db/index.js'
import { parse, productSchema, productPatchSchema, orderUpdateSchema, roleUpdateSchema, couponSchema, settingsSchema } from '../lib/validate.js'
import { notFound, forbidden, conflict, unprocessable, badRequest } from '../lib/http.js'
import { assertTransition, assertPaymentTransition, ORDER_STATUSES, PAYMENT_STATUSES } from '../lib/order-state.js'
import { serializeOrder, logOrderEvent } from '../lib/orders.js'
import { audit } from '../lib/audit.js'
import { publish } from '../lib/events.js'
import { randomToken, hashToken, hashPassword } from '../lib/password.js'
import { parseJsonSafe } from '../lib/http.js'

const requireRole = (ctx, roles) => {
  if (!roles.includes(ctx.user.role)) {
    throw forbidden('Bạn không có quyền thực hiện thao tác này.')
  }
}

async function serializeAdminProduct(p) {
  const variants = await all(`SELECT * FROM variants WHERE product_id = ? ORDER BY id`, [p.id])
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    basePrice: p.base_price,
    images: parseJsonSafe(p.images, []),
    status: p.status,
    productionDays: p.production_days,
    featured: !!p.featured,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      price: v.price,
      stock: v.stock,
      minQty: v.min_qty,
      maxQty: v.max_qty,
      status: v.status,
      leadTimeDays: v.lead_time_days,
    })),
    totalStock: variants.reduce((s, v) => s + v.stock, 0),
  }
}

export function registerAdminRoutes(router) {
  // ---------- Dashboard ----------
  router.get('/api/admin/stats', async (ctx) => {
    const orders = await all(`SELECT * FROM orders`)
    const paid = orders.filter((o) => o.payment_status === 'PAID')
    const revenue = paid.reduce((s, o) => s + o.total, 0)
    const pending = orders.filter((o) => o.status === 'PENDING_CONFIRMATION').length
    const customers = (await one(`SELECT COUNT(*) AS c FROM users WHERE role = 'CUSTOMER'`)).c
    const products = (await one(`SELECT COUNT(*) AS c FROM products WHERE status = 'active'`)).c
    const lowStock = await all(
      `SELECT v.id, v.sku, v.stock, p.name FROM variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= 3 ORDER BY v.stock ASC LIMIT 20`,
    )
    const recentRows = await all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 8`)
    const recentOrders = []
    for (const o of recentRows) recentOrders.push(await serializeOrder(o))
    const byStatus = ORDER_STATUSES.map((status) => ({
      status,
      count: orders.filter((o) => o.status === status).length,
    }))
    const byPayment = PAYMENT_STATUSES.map((status) => ({
      status,
      count: orders.filter((o) => o.payment_status === status).length,
    }))
    const revenueByDay = (await all(
      `SELECT substr(created_at, 1, 10) AS day, SUM(total) AS total, COUNT(*) AS count
       FROM orders WHERE payment_status = 'PAID' GROUP BY day ORDER BY day DESC LIMIT 14`,
    )).reverse()
    return ctx.json(200, {
      totals: {
        orders: orders.length,
        revenue,
        paidOrders: paid.length,
        pendingOrders: pending,
        customers,
        activeProducts: products,
        averageOrderValue: paid.length ? Math.round(revenue / paid.length) : 0,
      },
      byStatus,
      byPayment,
      revenueByDay,
      lowStock,
      recentOrders,
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  // ---------- Orders ----------
  router.get('/api/admin/orders', async (ctx) => {
    const page = Math.max(Number.parseInt(ctx.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(ctx.query.limit, 10) || 20, 1), 100)
    const offset = (page - 1) * limit
    const where = []
    const params = []
    const q = (ctx.query.q || '').trim()
    if (q) {
      where.push('(o.id LIKE ? OR o.email LIKE ? OR o.recipient LIKE ? OR o.phone LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like, like)
    }
    if (ctx.query.status && ORDER_STATUSES.includes(ctx.query.status)) {
      where.push('o.status = ?')
      params.push(ctx.query.status)
    }
    if (ctx.query.paymentStatus && PAYMENT_STATUSES.includes(ctx.query.paymentStatus)) {
      where.push('o.payment_status = ?')
      params.push(ctx.query.paymentStatus)
    }
    if (ctx.query.from) {
      where.push('o.created_at >= ?')
      params.push(ctx.query.from)
    }
    if (ctx.query.to) {
      where.push('o.created_at <= ?')
      params.push(`${ctx.query.to} 23:59:59`)
    }
    if (ctx.query.product) {
      where.push('EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND (oi.product_id = ? OR oi.sku LIKE ?))')
      params.push(ctx.query.product, `%${ctx.query.product}%`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const total = (await one(`SELECT COUNT(*) AS c FROM orders o ${whereSql}`, params)).c
    const rows = await all(
      `SELECT o.* FROM orders o ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    const orders = []
    for (const o of rows) orders.push(await serializeOrder(o))
    return ctx.json(200, {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })

  router.get('/api/admin/orders/:id', async (ctx) => {
    const order = await one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')
    return ctx.json(200, { order: await serializeOrder(order, { includeInternal: true }) })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })

  router.patch('/api/admin/orders/:id', async (ctx) => {
    const body = parse(orderUpdateSchema, ctx.body)
    const order = await one(`SELECT * FROM orders WHERE id = ?`, [ctx.params.id])
    if (!order) throw notFound('Không tìm thấy đơn hàng.')

    if (body.expectedVersion !== undefined && body.expectedVersion !== order.version) {
      throw conflict('Đơn hàng vừa được cập nhật bởi người khác. Vui lòng tải lại trang.', {
        currentVersion: order.version,
      })
    }

    let nextStatus = order.status
    let nextPayment = order.payment_status

    if (body.status && body.status !== order.status) {
      const check = assertTransition(order.status, body.status, ctx.user.role, false)
      if (!check.ok) throw unprocessable(check.message, { code: check.code })
      nextStatus = body.status
    }

    if (body.paymentStatus && body.paymentStatus !== order.payment_status) {
      const check = assertPaymentTransition(order.payment_status, body.paymentStatus, ctx.user.role)
      if (!check.ok) throw unprocessable(check.message, { code: check.code })
      nextPayment = body.paymentStatus
    }

    const fields = []
    const params = []
    const push = (col, value) => { fields.push(`${col} = ?`); params.push(value) }
    if (nextStatus !== order.status) push('status', nextStatus)
    if (nextPayment !== order.payment_status) push('payment_status', nextPayment)
    if (body.internalNote !== undefined && ctx.user.role !== 'SUPPORT') push('internal_note', body.internalNote)
    if (body.publicNote !== undefined) push('public_note', body.publicNote)
    if (body.trackingNumber !== undefined) push('tracking_number', body.trackingNumber)

    if (fields.length) {
      await tx(async () => {
        await run(
          `UPDATE orders SET ${fields.join(', ')}, version = version + 1, updated_at = datetime('now') WHERE id = ?`,
          [...params, order.id],
        )
        if (nextStatus !== order.status) {
          await logOrderEvent(order.id, {
            type: 'status_change',
            fromStatus: order.status,
            toStatus: nextStatus,
            actorUserId: ctx.user.id,
            actorRole: ctx.user.role,
            note: body.note || '',
          })
        }
        if (nextPayment !== order.payment_status) {
          await logOrderEvent(order.id, {
            type: 'payment_change',
            paymentFrom: order.payment_status,
            paymentTo: nextPayment,
            actorUserId: ctx.user.id,
            actorRole: ctx.user.role,
            note: body.note || '',
          })
        }
        if (body.note) {
          await logOrderEvent(order.id, {
            type: 'note',
            actorUserId: ctx.user.id,
            actorRole: ctx.user.role,
            note: body.note,
          })
        }
      })
    }

    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'order.update',
      entityType: 'order',
      entityId: order.id,
      before: { status: order.status, paymentStatus: order.payment_status },
      after: { status: nextStatus, paymentStatus: nextPayment },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    const updated = await one(`SELECT * FROM orders WHERE id = ?`, [order.id])
    // Realtime: báo cho chủ đơn và cho admin khác.
    await publish([`user:${order.user_id}`, 'admin'], {
      orderId: order.id,
      userId: order.user_id,
      status: nextStatus,
      paymentStatus: nextPayment,
      updatedAt: new Date().toISOString(),
    }, { type: 'order.updated' })

    return ctx.json(200, { order: await serializeOrder(updated, { includeInternal: true }) })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })

  // ---------- Products ----------
  router.get('/api/admin/products', async (ctx) => {
    const page = Math.max(Number.parseInt(ctx.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(ctx.query.limit, 10) || 20, 1), 100)
    const offset = (page - 1) * limit
    const q = (ctx.query.q || '').trim().toLowerCase()
    const where = []
    const params = []
    if (q) {
      where.push('(LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(category) LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like)
    }
    if (ctx.query.status) {
      where.push('status = ?')
      params.push(ctx.query.status)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const total = (await one(`SELECT COUNT(*) AS c FROM products ${whereSql}`, params)).c
    const rows = await all(`SELECT * FROM products ${whereSql} ORDER BY id LIMIT ? OFFSET ?`, [...params, limit, offset])
    const products = []
    for (const p of rows) products.push(await serializeAdminProduct(p))
    return ctx.json(200, {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.post('/api/admin/products', async (ctx) => {
    const body = parse(productSchema, ctx.body)
    if (await one(`SELECT id FROM products WHERE slug = ?`, [body.slug])) {
      throw conflict('Slug đã tồn tại. Vui lòng chọn slug khác.')
    }
    const productId = `p_${randomToken(6).replace(/[^a-z0-9]/gi, '').toLowerCase()}`
    await tx(async () => {
      await run(
        `INSERT INTO products (id, slug, name, category, description, base_price, images, status, production_days, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          productId,
          body.slug,
          body.name,
          body.category,
          body.description,
          body.basePrice,
          JSON.stringify(body.images),
          body.status,
          body.productionDays,
          body.featured ? 1 : 0,
        ],
      )
      for (const v of body.variants) {
        const variantId = v.id || `v_${randomToken(6).replace(/[^a-z0-9]/gi, '').toLowerCase()}`
        await run(
          `INSERT INTO variants (id, product_id, sku, color, size, price, stock, min_qty, max_qty, status, lead_time_days, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            variantId,
            productId,
            v.sku,
            v.color,
            v.size,
            v.price,
            v.stock,
            v.minQty,
            v.maxQty,
            v.status,
            body.productionDays,
          ],
        )
      }
    })
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'product.create',
      entityType: 'product',
      entityId: productId,
      after: { name: body.name, slug: body.slug, variants: body.variants.length },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    const created = await one(`SELECT * FROM products WHERE id = ?`, [productId])
    return ctx.json(201, { product: await serializeAdminProduct(created) })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.patch('/api/admin/products/:id', async (ctx) => {
    const body = parse(productPatchSchema, ctx.body)
    const product = await one(`SELECT * FROM products WHERE id = ?`, [ctx.params.id])
    if (!product) throw notFound('Không tìm thấy sản phẩm.')
    if (body.slug && body.slug !== product.slug && await one(`SELECT id FROM products WHERE slug = ?`, [body.slug])) {
      throw conflict('Slug đã tồn tại. Vui lòng chọn slug khác.')
    }
    const before = await serializeAdminProduct(product)
    await tx(async () => {
      const fields = []
      const params = []
      const push = (col, value) => { fields.push(`${col} = ?`); params.push(value) }
      if (body.name !== undefined) push('name', body.name)
      if (body.slug !== undefined) push('slug', body.slug)
      if (body.category !== undefined) push('category', body.category)
      if (body.description !== undefined) push('description', body.description)
      if (body.basePrice !== undefined) push('base_price', body.basePrice)
      if (body.images !== undefined) push('images', JSON.stringify(body.images))
      if (body.status !== undefined) push('status', body.status)
      if (body.productionDays !== undefined) push('production_days', body.productionDays)
      if (body.featured !== undefined) push('featured', body.featured ? 1 : 0)
      if (fields.length) {
        await run(`UPDATE products SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...params, product.id])
      }
      if (Array.isArray(body.variants)) {
        for (const v of body.variants) {
          const existing = v.id
            ? await one(`SELECT id FROM variants WHERE id = ? AND product_id = ?`, [v.id, product.id])
            : null
          if (existing) {
            await run(
              `UPDATE variants SET sku = ?, color = ?, size = ?, price = ?, stock = ?, min_qty = ?, max_qty = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
              [v.sku, v.color, v.size, v.price, v.stock, v.minQty, v.maxQty, v.status, v.id],
            )
          } else {
            const variantId = `v_${randomToken(6).replace(/[^a-z0-9]/gi, '').toLowerCase()}`
            await run(
              `INSERT INTO variants (id, product_id, sku, color, size, price, stock, min_qty, max_qty, status, lead_time_days, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
              [
                variantId,
                product.id,
                v.sku,
                v.color,
                v.size,
                v.price,
                v.stock,
                v.minQty,
                v.maxQty,
                v.status,
                product.production_days,
              ],
            )
          }
        }
      }
    })
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'product.update',
      entityType: 'product',
      entityId: product.id,
      before: { name: before.name, status: before.status, basePrice: before.basePrice },
      after: body,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    const updated = await one(`SELECT * FROM products WHERE id = ?`, [product.id])
    await publish(['admin'], { productId: product.id, updatedAt: new Date().toISOString() }, { type: 'product.updated' })
    return ctx.json(200, { product: await serializeAdminProduct(updated) })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.delete('/api/admin/products/:id', async (ctx) => {
    const product = await one(`SELECT * FROM products WHERE id = ?`, [ctx.params.id])
    if (!product) throw notFound('Không tìm thấy sản phẩm.')
    const orderRefs = (await one(`SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?`, [product.id])).c
    if (orderRefs > 0) {
      // Không xoá cứng nếu đã có đơn → chuyển sang discontinued.
      await run(`UPDATE products SET status = 'discontinued', updated_at = datetime('now') WHERE id = ?`, [product.id])
      await audit({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        actorRole: ctx.user.role,
        action: 'product.discontinue',
        entityType: 'product',
        entityId: product.id,
        after: { status: 'discontinued' },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return ctx.json(200, { ok: true, discontinued: true })
    }
    await run(`DELETE FROM products WHERE id = ?`, [product.id])
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'product.delete',
      entityType: 'product',
      entityId: product.id,
      before: { name: product.name },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true, deleted: true })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  // ---------- Users & RBAC ----------
  router.get('/api/admin/users', async (ctx) => {
    const page = Math.max(Number.parseInt(ctx.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(ctx.query.limit, 10) || 20, 1), 100)
    const offset = (page - 1) * limit
    const q = (ctx.query.q || '').trim().toLowerCase()
    const where = []
    const params = []
    if (q) {
      where.push('(LOWER(email) LIKE ? OR LOWER(name) LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    if (ctx.query.role) {
      where.push('role = ?')
      params.push(ctx.query.role)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const total = (await one(`SELECT COUNT(*) AS c FROM users ${whereSql}`, params)).c
    const rows = await all(`SELECT * FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
    const users = []
    for (const u of rows) {
      users.push({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        emailVerified: !!u.email_verified,
        status: u.status,
        createdAt: u.created_at,
        orderCount: (await one(`SELECT COUNT(*) AS c FROM orders WHERE user_id = ?`, [u.id])).c,
        lastLoginAt: (await one(`SELECT MAX(last_seen_at) AS t FROM sessions WHERE user_id = ?`, [u.id]))?.t || null,
      })
    }
    return ctx.json(200, {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.patch('/api/admin/users/:id/role', async (ctx) => {
    requireRole(ctx, ['SUPER_ADMIN'])
    const body = parse(roleUpdateSchema, ctx.body)
    const target = await one(`SELECT * FROM users WHERE id = ?`, [ctx.params.id])
    if (!target) throw notFound('Không tìm thấy tài khoản.')
    if (target.id === ctx.user.id && body.role !== 'SUPER_ADMIN') {
      throw badRequest('Không thể tự hạ quyền của chính mình.')
    }
    if (target.role === 'SUPER_ADMIN' && body.role !== 'SUPER_ADMIN') {
      const superAdmins = (await one(`SELECT COUNT(*) AS c FROM users WHERE role = 'SUPER_ADMIN'`)).c
      if (superAdmins <= 1) throw badRequest('Phải còn ít nhất một SUPER_ADMIN trong hệ thống.')
    }
    await run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [body.role, target.id])
    // Thu hồi phiên để thay đổi quyền có hiệu lực ngay.
    await run(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`, [target.id])
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'user.role.change',
      entityType: 'user',
      entityId: String(target.id),
      before: { role: target.role, email: target.email },
      after: { role: body.role, email: target.email },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true, role: body.role })
  }, { role: ['SUPER_ADMIN'] })

  router.post('/api/admin/users/:id/status', async (ctx) => {
    requireRole(ctx, ['SUPER_ADMIN'])
    const status = ctx.body?.status === 'active' ? 'active' : 'disabled'
    const target = await one(`SELECT * FROM users WHERE id = ?`, [ctx.params.id])
    if (!target) throw notFound('Không tìm thấy tài khoản.')
    if (target.id === ctx.user.id) throw badRequest('Không thể tự vô hiệu hóa tài khoản của chính mình.')
    await run(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, target.id])
    if (status === 'disabled') {
      await run(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`, [target.id])
    }
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'user.status.change',
      entityType: 'user',
      entityId: String(target.id),
      before: { status: target.status },
      after: { status },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true, status })
  }, { role: ['SUPER_ADMIN'] })

  // ---------- Invitation quản trị ----------
  router.post('/api/admin/invitations', async (ctx) => {
    requireRole(ctx, ['SUPER_ADMIN'])
    const email = String(ctx.body?.email || '').trim().toLowerCase()
    const role = ['ADMIN', 'SUPPORT', 'CUSTOMER'].includes(ctx.body?.role) ? ctx.body.role : 'ADMIN'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw unprocessable('Email không hợp lệ.')

    let user = await one(`SELECT * FROM users WHERE email = ?`, [email])
    if (!user) {
      // Tạo sẵn tài khoản ở trạng thái "invited" với mật khẩu không thể đăng nhập.
      const unusableHash = await hashPassword(randomToken(48))
      const result = await run(
        `INSERT INTO users (email, name, phone, password_hash, role, email_verified, status, created_at, updated_at)
         VALUES (?, ?, '', ?, 'CUSTOMER', 0, 'invited', datetime('now'), datetime('now'))`,
        [email, email.split('@')[0], unusableHash],
      )
      user = await one(`SELECT * FROM users WHERE id = ?`, [Number(result.lastInsertRowid)])
    }

    const token = randomToken(32)
    await run(
      `INSERT INTO email_tokens (token_hash, user_id, purpose, extra, expires_at) VALUES (?, ?, 'invite', ?, ?)`,
      [hashToken(token), user.id, role, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
    )

    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'admin.invitation.create',
      entityType: 'user',
      entityId: email,
      after: { role, userId: user.id },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(201, {
      ok: true,
      role,
      email,
      // Token trả về để quản trị gửi qua kênh an toàn. Không có SMTP nên không gửi tự động.
      invitationToken: token,
      note: 'Gửi token này cho người được mời qua kênh an toàn. Token hết hạn sau 7 ngày. Người được mời đăng ký tại /register kèm inviteToken.',
    })
  }, { role: ['SUPER_ADMIN'] })

  // ---------- Audit log ----------
  router.get('/api/admin/audit', async (ctx) => {
    const page = Math.max(Number.parseInt(ctx.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(ctx.query.limit, 10) || 50, 1), 200)
    const offset = (page - 1) * limit
    const where = []
    const params = []
    if (ctx.query.action) {
      where.push('action LIKE ?')
      params.push(`${ctx.query.action}%`)
    }
    if (ctx.query.actor) {
      where.push('actor_email LIKE ?')
      params.push(`%${ctx.query.actor}%`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const total = (await one(`SELECT COUNT(*) AS c FROM audit_log ${whereSql}`, params)).c
    const rows = await all(`SELECT * FROM audit_log ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
    return ctx.json(200, {
      entries: rows.map((r) => ({
        id: r.id,
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        before: parseJsonSafe(r.before_json),
        after: parseJsonSafe(r.after_json),
        ip: r.ip,
        createdAt: r.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  // ---------- Coupons ----------
  router.get('/api/admin/coupons', async (ctx) => {
    const rows = await all(`SELECT * FROM coupons ORDER BY code`)
    return ctx.json(200, {
      coupons: rows.map((c) => ({
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.min_order,
        maxDiscount: c.max_discount,
        startsAt: c.starts_at,
        endsAt: c.ends_at,
        usageLimit: c.usage_limit,
        usedCount: c.used_count,
        active: !!c.active,
      })),
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.post('/api/admin/coupons', async (ctx) => {
    const body = parse(couponSchema, ctx.body)
    const code = body.code.toUpperCase()
    if (await one(`SELECT code FROM coupons WHERE code = ?`, [code])) throw conflict('Mã coupon đã tồn tại.')
    await run(
      `INSERT INTO coupons (code, type, value, min_order, max_discount, starts_at, ends_at, usage_limit, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        code,
        body.type,
        body.value,
        body.minOrder,
        body.maxDiscount,
        body.startsAt || null,
        body.endsAt || null,
        body.usageLimit,
        body.active ? 1 : 0,
      ],
    )
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'coupon.create',
      entityType: 'coupon',
      entityId: code,
      after: body,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(201, { ok: true, code })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.patch('/api/admin/coupons/:code', async (ctx) => {
    const body = parse(couponSchema.partial(), ctx.body)
    const code = String(ctx.params.code).toUpperCase()
    const existing = await one(`SELECT * FROM coupons WHERE code = ?`, [code])
    if (!existing) throw notFound('Không tìm thấy mã coupon.')
    await run(
      `UPDATE coupons SET type = ?, value = ?, min_order = ?, max_discount = ?, starts_at = ?, ends_at = ?, usage_limit = ?, active = ? WHERE code = ?`,
      [
        body.type ?? existing.type,
        body.value ?? existing.value,
        body.minOrder ?? existing.min_order,
        body.maxDiscount ?? existing.max_discount,
        body.startsAt ?? existing.starts_at,
        body.endsAt ?? existing.ends_at,
        body.usageLimit ?? existing.usage_limit,
        body.active === undefined ? existing.active : body.active ? 1 : 0,
        code,
      ],
    )
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'coupon.update',
      entityType: 'coupon',
      entityId: code,
      before: existing,
      after: body,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  // ---------- Contact messages ----------
  router.get('/api/admin/contact', async (ctx) => {
    const rows = await all(`SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100`)
    return ctx.json(200, {
      messages: rows.map((m) => ({
        id: m.id, name: m.name, email: m.email, phone: m.phone,
        message: m.message, status: m.status, createdAt: m.created_at,
      })),
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })

  // ---------- Settings ----------
  router.get('/api/admin/settings', async (ctx) => {
    const rows = await all(`SELECT * FROM settings`)
    const obj = {}
    for (const r of rows) obj[r.key] = r.value
    return ctx.json(200, { settings: obj })
  }, { role: ['ADMIN', 'SUPER_ADMIN'] })

  router.put('/api/admin/settings', async (ctx) => {
    requireRole(ctx, ['SUPER_ADMIN'])
    const body = parse(settingsSchema, ctx.body)
    const before = await all(`SELECT * FROM settings`)
    const beforeObj = {}
    for (const r of before) beforeObj[r.key] = r.value
    await tx(async () => {
      for (const [key, value] of Object.entries(body)) {
        await run(
          `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, String(value)],
        )
      }
    })
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'settings.update',
      entityType: 'settings',
      entityId: 'global',
      before: beforeObj,
      after: body,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true, settings: body })
  }, { role: ['SUPER_ADMIN'] })

  // ---------- Reviews ----------
  router.get('/api/admin/reviews', async (ctx) => {
    const rows = await all(
      `SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.id DESC LIMIT 100`,
    )
    return ctx.json(200, {
      reviews: rows.map((r) => ({
        id: r.id, productId: r.product_id, productName: r.product_name,
        author: r.author, rating: r.rating, comment: r.comment, status: r.status, createdAt: r.created_at,
      })),
    })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })

  router.patch('/api/admin/reviews/:id', async (ctx) => {
    const status = ['published', 'hidden'].includes(ctx.body?.status) ? ctx.body.status : null
    if (!status) throw unprocessable('Trạng thái đánh giá không hợp lệ.')
    const row = await one(`SELECT * FROM reviews WHERE id = ?`, [ctx.params.id])
    if (!row) throw notFound('Không tìm thấy đánh giá.')
    await run(`UPDATE reviews SET status = ? WHERE id = ?`, [status, row.id])
    await audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'review.update',
      entityType: 'review',
      entityId: String(row.id),
      before: { status: row.status },
      after: { status },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  }, { role: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] })
}
