#!/usr/bin/env node
/**
 * Seed dữ liệu danh mục sản phẩm + coupon (idempotent).
 *
 * Dùng:
 *   node server/scripts/seed.js            # ghi thẳng vào file SQLite (Node)
 *   node server/scripts/seed.js --sql      # in ra file SQL để nạp vào D1
 */
import { one, run, close, setAdapter } from '../db/index.js'
import * as sqliteAdapter from '../db/sqlite.js'
import { seedProducts, seedCoupons } from '../db/seed-data.js'

setAdapter(sqliteAdapter)

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)

/** Sinh SQL để nạp vào D1 (dùng INSERT OR IGNORE → idempotent). */
export function seedSql() {
  const lines = []
  for (const p of seedProducts) {
    lines.push(
      `INSERT OR IGNORE INTO products (id, slug, name, category, description, base_price, images, status, production_days, featured, created_at, updated_at) VALUES (${q(p.id)}, ${q(p.slug)}, ${q(p.name)}, ${q(p.category)}, ${q(p.description)}, ${p.base_price}, ${q(JSON.stringify(p.images))}, ${q(p.status)}, ${p.production_days}, ${p.featured}, datetime('now'), datetime('now'));`,
    )
    for (const v of p.variants) {
      lines.push(
        `INSERT OR IGNORE INTO variants (id, product_id, sku, color, size, price, stock, min_qty, max_qty, status, lead_time_days, created_at, updated_at) VALUES (${q(v.id)}, ${q(p.id)}, ${q(v.sku)}, ${q(v.color)}, ${q(v.size)}, ${v.price}, ${v.stock}, ${v.min_qty}, ${v.max_qty}, 'active', ${p.production_days}, datetime('now'), datetime('now'));`,
      )
    }
  }
  for (const c of seedCoupons) {
    lines.push(
      `INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_discount, usage_limit, active, created_at) VALUES (${q(c.code)}, ${q(c.type)}, ${c.value}, ${c.min_order}, ${c.max_discount}, 0, 1, datetime('now'));`,
    )
  }
  return lines.join('\n')
}

export async function seed({ silent = false } = {}) {
  sqliteAdapter.init()
  let createdProducts = 0
  let createdVariants = 0
  for (const p of seedProducts) {
    const exists = await one(`SELECT id FROM products WHERE id = ? OR slug = ?`, [p.id, p.slug])
    if (!exists) {
      await run(
        `INSERT INTO products (id, slug, name, category, description, base_price, images, status, production_days, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [p.id, p.slug, p.name, p.category, p.description, p.base_price, JSON.stringify(p.images), p.status, p.production_days, p.featured],
      )
      createdProducts += 1
    }
    for (const v of p.variants) {
      const vExists = await one(`SELECT id FROM variants WHERE id = ?`, [v.id])
      if (!vExists) {
        await run(
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
    const exists = await one(`SELECT code FROM coupons WHERE code = ?`, [c.code])
    if (!exists) {
      await run(
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
  if (process.argv.includes('--sql')) {
    process.stdout.write(`${seedSql()}\n`)
  } else {
    seed()
      .then(() => close())
      .catch((err) => {
        console.error('[seed] Lỗi:', err)
        process.exit(1)
      })
  }
}
