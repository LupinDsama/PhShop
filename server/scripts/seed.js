#!/usr/bin/env node
/**
 * Seed dữ liệu danh mục sản phẩm + coupon (idempotent).
 * Dùng: node server/scripts/seed.js
 */
import { getDb, one, run, closeDb } from '../db/index.js'
import { seedProducts, seedCoupons } from '../db/seed-data.js'

export function seed({ silent = false } = {}) {
  getDb()
  let createdProducts = 0
  let createdVariants = 0
  for (const p of seedProducts) {
    const exists = one(`SELECT id FROM products WHERE id = ? OR slug = ?`, [p.id, p.slug])
    if (!exists) {
      run(
        `INSERT INTO products (id, slug, name, category, description, base_price, images, status, production_days, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [p.id, p.slug, p.name, p.category, p.description, p.base_price, JSON.stringify(p.images), p.status, p.production_days, p.featured],
      )
      createdProducts += 1
    }
    for (const v of p.variants) {
      const vExists = one(`SELECT id FROM variants WHERE id = ?`, [v.id])
      if (!vExists) {
        run(
          `INSERT INTO variants (id, product_id, sku, color, size, price, stock, min_qty, max_qty, status, lead_time_days, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
          [v.id, p.id, v.sku, v.color, v.size, v.price, v.stock, v.min_qty, v.max_qty, p.production_days],
        )
        createdVariants += 1
      }
    }
  }

  let createdCoupons = 0
  for (const c of seedCoupons) {
    const exists = one(`SELECT code FROM coupons WHERE code = ?`, [c.code])
    if (!exists) {
      run(
        `INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, active, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 1, datetime('now'))`,
        [c.code, c.type, c.value, c.min_order, c.max_discount],
      )
      createdCoupons += 1
    }
  }

  if (!silent) {
    console.log(`[seed] Sản phẩm mới: ${createdProducts}, biến thể mới: ${createdVariants}, coupon mới: ${createdCoupons}`)
  }
  return { createdProducts, createdVariants, createdCoupons }
}

const isMain = process.argv[1] && process.argv[1].endsWith('seed.js')
if (isMain) {
  seed()
  closeDb()
}
