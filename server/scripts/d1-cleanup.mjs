#!/usr/bin/env node
/**
 * Dọn dữ liệu test trên D1 production và khôi phục tồn kho theo danh mục.
 *
 * - Giữ lại tài khoản quản trị (PHSHOP_ADMIN_EMAIL).
 * - Xoá toàn bộ khách hàng, đơn hàng, giỏ, wishlist, phiên, đánh giá, tin nhắn
 *   và nhật ký audit phát sinh từ kiểm thử.
 * - Đặt lại tồn kho biến thể về giá trị trong danh mục sản phẩm.
 *
 * Dùng:
 *   node server/scripts/d1-cleanup.mjs --remote
 *   node server/scripts/d1-cleanup.mjs --local
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { seedProducts } from '../db/seed-data.js'
import config from '../config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const remote = process.argv.includes('--remote')
const target = remote ? '--remote' : '--local'
const keepEmail = (process.env.PHSHOP_ADMIN_EMAIL || config.adminEmail).toLowerCase()

const q = (v) => `'${String(v).replace(/'/g, "''")}'`

export function cleanupSql() {
  const lines = [
    // 1) Xoá dữ liệu phụ thuộc của các khách hàng test
    `DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)}));`,
    `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)}));`,
    `DELETE FROM idempotency_keys WHERE scope LIKE 'user:%' AND scope NOT LIKE '%${keepEmail}%';`,
    `DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)}));`,
    `DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM carts WHERE user_id IS NULL;`,
    `DELETE FROM wishlist_items WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM email_tokens WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email <> ${q(keepEmail)});`,
    `DELETE FROM reviews;`,
    `DELETE FROM contact_messages;`,
    `DELETE FROM login_attempts;`,
    `DELETE FROM audit_log WHERE actor_email <> ${q(keepEmail)};`,
    `DELETE FROM events_log;`,
    `DELETE FROM users WHERE email <> ${q(keepEmail)};`,
  ]
  // 2) Khôi phục tồn kho theo danh mục
  for (const p of seedProducts) {
    for (const v of p.variants) {
      lines.push(`UPDATE variants SET stock = ${v.stock}, updated_at = datetime('now') WHERE id = ${q(v.id)};`)
    }
  }
  return lines.join('\n')
}

function applySql(sql) {
  const file = path.join(root, 'data', 'd1-cleanup.sql')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${sql}\n`, 'utf8')
  execSync(`npx.cmd wrangler d1 execute phshop ${target} --file="${file}" -c wrangler.worker.toml`, {
    cwd: root, stdio: 'inherit', shell: true,
  })
  return file
}

const isMain = process.argv[1] && process.argv[1].endsWith('d1-cleanup.mjs')
if (isMain) {
  const file = applySql(cleanupSql())
  console.log(`[d1-cleanup] Đã dọn (${target}) — file: ${file}`)
}
