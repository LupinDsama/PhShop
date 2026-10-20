/**
 * Products API: danh sách công khai, chi tiết, tìm kiếm, lọc, phân trang.
 * Giá và tồn kho luôn đọc từ DB.
 */
import { all, one } from '../db/index.js'
import { parseJsonSafe } from '../lib/http.js'

function serializeVariant(v) {
  return {
    id: v.id,
    productId: v.product_id,
    sku: v.sku,
    color: v.color,
    size: v.size,
    price: v.price,
    stock: v.stock,
    minQty: v.min_qty,
    maxQty: v.max_qty,
    status: v.status,
    leadTimeDays: v.lead_time_days,
    inStock: v.stock > 0 && v.status === 'active',
  }
}

function serializeProduct(p, variants = []) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    basePrice: p.base_price,
    price: p.base_price,
    images: parseJsonSafe(p.images, []),
    status: p.status,
    productionDays: p.production_days,
    featured: !!p.featured,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    variants: variants.map((v) => serializeVariant(v)),
    totalStock: variants.reduce((s, v) => s + v.stock, 0),
  }
}

export function listProducts(query = {}) {
  const where = []
  const params = []
  if (query.category && query.category !== 'all') {
    where.push('p.category = ?')
    params.push(query.category)
  }
  if (query.status) {
    where.push('p.status = ?')
    params.push(query.status)
  } else {
    where.push("p.status = 'active'")
  }
  if (query.q) {
    where.push('(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.slug) LIKE ?)')
    const like = `%${String(query.q).toLowerCase()}%`
    params.push(like, like, like)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 24, 1), 100)
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1)
  const offset = (page - 1) * limit

  const total = one(`SELECT COUNT(*) AS c FROM products p ${whereSql}`, params).c
  const rows = all(
    `SELECT p.* FROM products p ${whereSql} ORDER BY p.featured DESC, p.created_at DESC, p.id LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const items = rows.map((p) => {
    const variants = all(`SELECT * FROM variants WHERE product_id = ? ORDER BY id`, [p.id])
    return serializeProduct(p, variants)
  })
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
}

export function getProductBySlug(slug) {
  const p = one(`SELECT * FROM products WHERE slug = ?`, [slug])
  if (!p) return null
  const variants = all(`SELECT * FROM variants WHERE product_id = ? ORDER BY id`, [p.id])
  return serializeProduct(p, variants)
}

export function getProductById(id) {
  const p = one(`SELECT * FROM products WHERE id = ?`, [id])
  if (!p) return null
  const variants = all(`SELECT * FROM variants WHERE product_id = ? ORDER BY id`, [p.id])
  return serializeProduct(p, variants)
}

export function getCategories() {
  const rows = all(
    `SELECT category AS id, COUNT(*) AS count FROM products WHERE status = 'active' GROUP BY category ORDER BY category`,
  )
  return rows.map((r) => ({ id: r.id, count: r.count }))
}

export function registerProductRoutes(router) {
  router.get('/api/products', async (ctx) => {
    const result = listProducts(ctx.query)
    return ctx.json(200, result)
  }, { auth: false })

  router.get('/api/products/categories', async (ctx) => {
    return ctx.json(200, { categories: getCategories() })
  }, { auth: false })

  router.get('/api/products/:slug', async (ctx) => {
    const product = getProductBySlug(ctx.params.slug)
    if (!product) {
      return ctx.json(404, { error: { code: 'not_found', message: 'Không tìm thấy sản phẩm.' } })
    }
    const related = all(
      `SELECT p.* FROM products p WHERE p.category = ? AND p.id != ? AND p.status = 'active' LIMIT 4`,
      [product.category, product.id],
    ).map((p) => serializeProduct(p, all(`SELECT * FROM variants WHERE product_id = ?`, [p.id])))
    const reviews = all(
      `SELECT id, author, rating, comment, created_at FROM reviews WHERE product_id = ? AND status = 'published' ORDER BY id DESC LIMIT 10`,
      [product.id],
    )
    return ctx.json(200, { product, related, reviews })
  }, { auth: false })
}

export { serializeProduct, serializeVariant }
