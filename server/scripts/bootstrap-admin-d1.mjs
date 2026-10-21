#!/usr/bin/env node
/**
 * Bootstrap tài khoản quản trị trên Cloudflare D1 (sinh SQL để nạp bằng wrangler).
 *
 * Dùng:
 *   PHSHOP_ADMIN_PASSWORD='...' node server/scripts/bootstrap-admin-d1.mjs > data/admin.sql
 *   npx wrangler d1 execute phshop --remote --file=data/admin.sql -c wrangler.worker.toml
 *
 * - Idempotent: INSERT ... ON CONFLICT(email) DO UPDATE (không tạo trùng).
 * - Mật khẩu được băm scrypt, không ghi rõ vào file SQL.
 * - Nếu thiếu PHSHOP_ADMIN_PASSWORD → sinh mật khẩu ngẫu nhiên, in ra MỘT LẦN.
 */
import { randomBytes } from 'node:crypto'
import { hashPassword } from '../lib/password.js'
import config from '../config.js'

const q = (v) => `'${String(v).replace(/'/g, "''")}'`

function generatePassword() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  const bytes = randomBytes(20)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export async function adminSql({ email, password, role = 'SUPER_ADMIN' } = {}) {
  const targetEmail = (email || config.adminEmail).trim().toLowerCase()
  const plain = password || process.env.PHSHOP_ADMIN_PASSWORD || generatePassword()
  const generated = !password && !process.env.PHSHOP_ADMIN_PASSWORD
  const hash = await hashPassword(plain)

  const sql = [
    `INSERT INTO users (email, name, phone, password_hash, role, email_verified, status, created_at, updated_at)
     VALUES (${q(targetEmail)}, 'PhShop Admin', '', ${q(hash)}, ${q(role)}, 1, 'active', datetime('now'), datetime('now'))
     ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, status = 'active', email_verified = 1, updated_at = datetime('now');`,
    `INSERT INTO audit_log (actor_user_id, actor_email, actor_role, action, entity_type, entity_id, before_json, after_json, ip, user_agent)
     SELECT id, ${q(targetEmail)}, ${q(role)}, 'admin.bootstrap.ensure', 'user', CAST(id AS TEXT), NULL, ${q(JSON.stringify({ role, source: 'd1-bootstrap' }))}, 'cli', 'bootstrap-admin-d1'
     FROM users WHERE email = ${q(targetEmail)};`,
  ].join('\n')

  return { sql, email: targetEmail, role, generated, password: generated ? plain : undefined }
}

const isMain = process.argv[1] && process.argv[1].endsWith('bootstrap-admin-d1.mjs')
if (isMain) {
  adminSql({})
    .then((result) => {
      process.stdout.write(`${result.sql}\n`)
      if (result.password) {
        console.error('[bootstrap-admin-d1] Mật khẩu tạm thời (lưu lại ngay, hiển thị MỘT LẦN):')
        console.error(result.password)
      }
    })
    .catch((err) => {
      console.error('[bootstrap-admin-d1] Lỗi:', err.message)
      process.exit(1)
    })
}
