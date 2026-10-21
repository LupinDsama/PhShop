/**
 * Wishlist API. Luôn gắn với user đã đăng nhập — kiểm tra quyền sở hữu ở server.
 */
import { all, one, run } from '../db/index.js'
import { parse, wishlistSchema } from '../lib/validate.js'
import { notFound } from '../lib/http.js'
import { parseJsonSafe } from '../lib/http.js'

export async function serializeWishlist(userId) {
  const rows = await all(
    `SELECT w.id, w.created_at, p.id AS product_id, p.slug, p.name, p.category, p.base_price, p.images, p.status, p.production_days
     FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? ORDER BY w.id DESC`,
    [userId],
  )
  const items = rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    price: r.base_price,
    images: parseJsonSafe(r.images, []),
    status: r.status,
    leadTimeDays: r.production_days,
    available: r.status === 'active',
    addedAt: r.created_at,
  }))
  return { items, count: items.length }
}

export function registerWishlistRoutes(router) {
  router.get('/api/wishlist', async (ctx) => {
    return ctx.json(200, await serializeWishlist(ctx.user.id))
  })

  router.post('/api/wishlist', async (ctx) => {
    const body = parse(wishlistSchema, ctx.body)
    const product = await one(`SELECT * FROM products WHERE id = ?`, [body.productId])
    if (!product) throw notFound('Không tìm thấy sản phẩm.')
    const existing = await one(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [ctx.user.id, body.productId])
    if (existing) {
      // Idempotent: trả về trạng thái hiện tại, không tạo bản ghi trùng.
      return ctx.json(200, { ...(await serializeWishlist(ctx.user.id)), alreadyExists: true })
    }
    await run(`INSERT INTO wishlist_items (user_id, product_id, created_at) VALUES (?, ?, datetime('now'))`, [
      ctx.user.id,
      body.productId,
    ])
    return ctx.json(201, await serializeWishlist(ctx.user.id))
  })

  router.delete('/api/wishlist/:productId', async (ctx) => {
    const productId = ctx.params.productId
    const row = await one(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [ctx.user.id, productId])
    if (!row) throw notFound('Sản phẩm không có trong danh sách yêu thích.')
    await run(`DELETE FROM wishlist_items WHERE id = ? AND user_id = ?`, [row.id, ctx.user.id])
    return ctx.json(200, await serializeWishlist(ctx.user.id))
  })

  router.post('/api/wishlist/sync', async (ctx) => {
    // Đồng bộ wishlist từ client (guest) sang tài khoản sau khi đăng nhập.
    const ids = Array.isArray(ctx.body?.productIds) ? ctx.body.productIds.slice(0, 200) : []
    let merged = 0
    for (const raw of ids) {
      const productId = String(raw)
      const product = await one(`SELECT id FROM products WHERE id = ?`, [productId])
      if (!product) continue
      const existing = await one(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [ctx.user.id, productId])
      if (existing) continue
      await run(`INSERT INTO wishlist_items (user_id, product_id, created_at) VALUES (?, ?, datetime('now'))`, [
        ctx.user.id,
        productId,
      ])
      merged += 1
    }
    return ctx.json(200, { ...(await serializeWishlist(ctx.user.id)), merged })
  })
}
