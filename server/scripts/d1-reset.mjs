#!/usr/bin/env node
/**
 * Reset database D1 (xoá toàn bộ dữ liệu) rồi nạp lại danh mục sản phẩm + coupon.
 * Dùng cho môi trường local/staging khi cần dữ liệu sạch.
 *
 * Dùng:
 *   node server/scripts/d1-reset.mjs --local
 *   node server/scripts/d1-reset.mjs --remote
 *
 * KHÔNG chạy --remote trên production nếu chưa sao lưu.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedProducts, seedCoupons } from '../db/seed-data.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const remote = process.argv.includes('--remote')
const target = remote ? '--remote' : '--local'

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)

const TABLES = [
  'cart_items', 'carts', 'order_items', 'order_events', 'orders', 'wishlist_items',
  'idempotency_keys', 'sessions', 'login_attempts', 'email_tokens', 'audit_log',
  'reviews', 'contact_messages', 'addresses', 'variants', 'products', 'coupons',
  'settings', 'users',
]

export function resetSql() {
  const lines = TABLES.map((t) => `DELETE FROM ${t};`)
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

function applySql(sql) {
  const file = path.join(root, 'data', 'd1-reset.sql')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${sql}\n`, 'utf8')
  // 1) Áp dụng schema (idempotent) để có đủ bảng mới nhất
  const schemaFile = path.join(root, 'server', 'db', 'schema.sql')
  execSync(`npx.cmd wrangler d1 execute phshop ${target} --file="${schemaFile}" -c wrangler.worker.toml`, {
    cwd: root, stdio: 'inherit', shell: true,
  })
  // 2) Xoá dữ liệu cũ + nạp lại danh mục
  execSync(`npx.cmd wrangler d1 execute phshop ${target} --file="${file}" -c wrangler.worker.toml`, {
    cwd: root, stdio: 'inherit', shell: true,
  })
  return file
}

const isMain = process.argv[1] && process.argv[1].endsWith('d1-reset.mjs')
if (isMain) {
  const file = applySql(resetSql())
  console.log(`[d1-reset] Đã reset (${target}) — file: ${file}`)
}
