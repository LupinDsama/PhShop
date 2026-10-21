/**
 * Cart API (server-side).
 * - Khách vãng lai: giỏ gắn với cookie `phshop_cart` (HttpOnly).
 * - Khách đã đăng nhập: giỏ gắn với user, đồng bộ được mọi thiết bị.
 * - Khi đăng nhập, giỏ khách vãng lai được hợp nhất vào giỏ tài khoản.
 * - Mọi giá/tồn kho đều đọc lại từ DB, không tin giá từ client.
 */
import { all, one, run, tx } from '../db/index.js'
import config from '../config.js'
import { parse, cartAddSchema, cartUpdateSchema } from '../lib/validate.js'
import { randomToken, hashToken } from '../lib/password.js'
import { conflict, notFound, badRequest, serializeCookie } from '../lib/http.js'
import { computeTotals } from '../lib/pricing.js'

export const CART_COOKIE = 'phshop_cart'

export async function ensureGuestCart(ctx) {
  const guestKey = ctx.cookies[CART_COOKIE]
  if (guestKey) {
    const row = await one(`SELECT * FROM carts WHERE guest_key = ?`, [hashToken(guestKey)])
    if (row) return { cart: row, guestKey: null }
  }
  const key = randomToken(24)
  const id = randomToken(16)
  await run(`INSERT INTO carts (id, guest_key, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [
    id,
    hashToken(key),
  ])
  ctx.setCookie(
    serializeCookie(CART_COOKIE, key, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: config.cookieSameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    }),
  )
  return { cart: await one(`SELECT * FROM carts WHERE id = ?`, [id]), guestKey: key }
}

export async function getOrCreateUserCart(userId) {
  const existing = await one(`SELECT * FROM carts WHERE user_id = ?`, [userId])
  if (existing) return existing
  const id = randomToken(16)
  await run(`INSERT INTO carts (id, user_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`, [id, userId])
  return one(`SELECT * FROM carts WHERE id = ?`, [id])
}

export async function resolveCart(ctx) {
  if (ctx.user) return getOrCreateUserCart(ctx.user.id)
  const { cart } = await ensureGuestCart(ctx)
  return cart
}

export async function serializeCart(cart) {
  const rows = await all(
    `SELECT ci.id, ci.variant_id, ci.product_id, ci.quantity, ci.note,
            v.sku, v.color, v.size, v.price, v.stock, v.min_qty, v.max_qty, v.status AS variant_status,
            p.name AS product_name, p.slug, p.status AS product_status, p.images, p.production_days
     FROM cart_items ci
     JOIN variants v ON v.id = ci.variant_id
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.id`,
    [cart.id],
  )
  const items = rows.map((r) => {
    let images = []
    try { images = JSON.parse(r.images) } catch { images = [] }
    const unavailable = r.product_status !== 'active' || r.variant_status !== 'active'
    const overStock = r.quantity > r.stock
    return {
      id: r.id,
      variantId: r.variant_id,
      productId: r.product_id,
      slug: r.slug,
      name: r.product_name,
      sku: r.sku,
      color: r.color,
      size: r.size,
      price: r.price,
      quantity: r.quantity,
      note: r.note,
      stock: r.stock,
      minQty: r.min_qty,
      maxQty: r.max_qty,
      images,
      lineTotal: r.price * r.quantity,
      leadTimeDays: r.production_days,
      available: !unavailable && r.stock > 0 && !overStock,
      issues: unavailable
        ? ['Sản phẩm không còn được bán.']
        : overStock
          ? [`Chỉ còn ${r.stock} sản phẩm trong kho.`]
          : [],
    }
  })
  const totals = computeTotals(items.map((i) => ({ unitPrice: i.price, quantity: i.quantity })), null)
  return {
    id: cart.id,
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    ...totals,
    hasIssues: items.some((i) => !i.available),
  }
}

/** Hợp nhất giỏ khách vãng lai vào giỏ tài khoản. */
export async function mergeGuestCartIntoUser(userId, guestKey) {
  if (!guestKey) return { merged: 0 }
  const guest = await one(`SELECT * FROM carts WHERE guest_key = ?`, [hashToken(guestKey)])
  if (!guest) return { merged: 0 }
  const userCart = await getOrCreateUserCart(userId)
  const guestItems = await all(`SELECT * FROM cart_items WHERE cart_id = ?`, [guest.id])
  let merged = 0
  await tx(async () => {
    for (const item of guestItems) {
      const variant = await one(`SELECT * FROM variants WHERE id = ?`, [item.variant_id])
      if (!variant || variant.status !== 'active') continue
      const existing = await one(
        `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ? AND note = ?`,
        [userCart.id, item.variant_id, item.note],
      )
      const quantity = Math.min(item.quantity, variant.max_qty, variant.stock)
      if (quantity <= 0) continue
      if (existing) {
        await run(
          `UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`,
          [Math.min(existing.quantity + quantity, variant.max_qty, variant.stock), existing.id],
        )
      } else {
        await run(
          `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [userCart.id, item.product_id, item.variant_id, quantity, item.note],
        )
      }
      merged += 1
    }
    await run(`DELETE FROM cart_items WHERE cart_id = ?`, [guest.id])
    await run(`DELETE FROM carts WHERE id = ?`, [guest.id])
  })
  return { merged }
}

export function registerCartRoutes(router) {
  router.get('/api/cart', async (ctx) => {
    const cart = await resolveCart(ctx)
    return ctx.json(200, await serializeCart(cart))
  }, { auth: false })

  router.post('/api/cart/items', async (ctx) => {
    const body = parse(cartAddSchema, ctx.body)
    const variant = await one(`SELECT * FROM variants WHERE id = ?`, [body.variantId])
    if (!variant) throw notFound('Không tìm thấy biến thể sản phẩm.')
    const product = await one(`SELECT * FROM products WHERE id = ?`, [variant.product_id])
    if (!product || product.status !== 'active' || variant.status !== 'active') {
      throw conflict('Sản phẩm hiện không còn được bán.')
    }
    const cart = await resolveCart(ctx)
    const existing = await one(
      `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ? AND note = ?`,
      [cart.id, variant.id, body.note || ''],
    )
    const desired = (existing?.quantity || 0) + body.quantity
    const capped = Math.min(desired, variant.max_qty, variant.stock)
    if (capped <= 0) throw conflict('Sản phẩm đã hết hàng.')
    if (existing) {
      await run(`UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`, [capped, existing.id])
    } else {
      await run(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [cart.id, variant.product_id, variant.id, capped, body.note || ''],
      )
    }
    return ctx.json(200, await serializeCart(cart))
  }, { auth: false })

  router.patch('/api/cart/items/:id', async (ctx) => {
    const body = parse(cartUpdateSchema, ctx.body)
    const cart = await resolveCart(ctx)
    const item = await one(`SELECT * FROM cart_items WHERE id = ? AND cart_id = ?`, [ctx.params.id, cart.id])
    if (!item) throw notFound('Không tìm thấy sản phẩm trong giỏ hàng.')
    const variant = await one(`SELECT * FROM variants WHERE id = ?`, [item.variant_id])
    const quantity = body.quantity ?? item.quantity
    if (quantity <= 0) {
      await run(`DELETE FROM cart_items WHERE id = ?`, [item.id])
      return ctx.json(200, await serializeCart(cart))
    }
    const max = variant ? Math.min(variant.max_qty, variant.stock) : item.quantity
    const capped = Math.min(quantity, max)
    await run(`UPDATE cart_items SET quantity = ?, note = ?, updated_at = datetime('now') WHERE id = ?`, [
      capped,
      body.note ?? item.note,
      item.id,
    ])
    return ctx.json(200, await serializeCart(cart))
  }, { auth: false })

  router.delete('/api/cart/items/:id', async (ctx) => {
    const cart = await resolveCart(ctx)
    const item = await one(`SELECT * FROM cart_items WHERE id = ? AND cart_id = ?`, [ctx.params.id, cart.id])
    if (!item) throw notFound('Không tìm thấy sản phẩm trong giỏ hàng.')
    await run(`DELETE FROM cart_items WHERE id = ?`, [item.id])
    return ctx.json(200, await serializeCart(cart))
  }, { auth: false })

  router.delete('/api/cart', async (ctx) => {
    const cart = await resolveCart(ctx)
    await run(`DELETE FROM cart_items WHERE cart_id = ?`, [cart.id])
    return ctx.json(200, await serializeCart(cart))
  }, { auth: false })

  router.post('/api/cart/merge', async (ctx) => {
    if (!ctx.user) throw badRequest('Cần đăng nhập để hợp nhất giỏ hàng.')
    const guestKey = ctx.cookies[CART_COOKIE]
    const result = await mergeGuestCartIntoUser(ctx.user.id, guestKey)
    const cart = await getOrCreateUserCart(ctx.user.id)
    return ctx.json(200, { ...(await serializeCart(cart)), merged: result.merged })
  }, { auth: false })
}
