#!/usr/bin/env node
/**
 * Bootstrap tài khoản quản trị theo quy trình có kiểm soát.
 *
 * Yêu cầu:
 *  - Email quản trị lấy từ PHSHOP_ADMIN_EMAIL (mặc định nhantk123vip@gmail.com).
 *  - Mật khẩu PHẢI được cung cấp qua biến môi trường PHSHOP_ADMIN_PASSWORD.
 *    KHÔNG có mật khẩu mặc định, KHÔNG ghi mật khẩu vào source code hay log.
 *  - Nếu chưa có PHSHOP_ADMIN_PASSWORD, script sinh mật khẩu ngẫu nhiên và in ra
 *    MỘT LẦN duy nhất để quản trị lưu lại (không lưu vào DB dạng rõ).
 *  - Idempotent: chạy lại không tạo trùng; chỉ đổi mật khẩu khi có --reset-password.
 *  - Mọi thao tác đều ghi audit log.
 *
 * Dùng:
 *   node server/scripts/bootstrap-admin.js
 *   PHSHOP_ADMIN_PASSWORD='...' node server/scripts/bootstrap-admin.js
 *   node server/scripts/bootstrap-admin.js --reset-password
 */
import { randomBytes } from 'node:crypto'
import { one, run, close, setAdapter } from '../db/index.js'
import * as sqliteAdapter from '../db/sqlite.js'
import { hashPassword } from '../lib/password.js'
import { audit } from '../lib/audit.js'
import config from '../config.js'
import { seed } from './seed.js'

setAdapter(sqliteAdapter)

function generatePassword() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  const bytes = randomBytes(20)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export async function bootstrapAdmin({ email, password, role = 'SUPER_ADMIN', resetPassword = false } = {}) {
  sqliteAdapter.init()
  const targetEmail = (email || config.adminEmail).trim().toLowerCase()
  const existing = await one(`SELECT * FROM users WHERE email = ?`, [targetEmail])
  const plain = password || process.env.PHSHOP_ADMIN_PASSWORD || generatePassword()
  const generated = !password && !process.env.PHSHOP_ADMIN_PASSWORD
  const hash = await hashPassword(plain)

  let userId
  let created = false
  if (!existing) {
    const result = await run(
      `INSERT INTO users (email, name, phone, password_hash, role, email_verified, status, created_at, updated_at)
       VALUES (?, ?, '', ?, ?, 1, 'active', datetime('now'), datetime('now'))`,
      [targetEmail, 'PhShop Admin', hash, role],
    )
    userId = Number(result.lastInsertRowid)
    created = true
  } else {
    userId = existing.id
    if (resetPassword) {
      await run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [hash, userId])
    } else if (existing.role !== role) {
      await run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [role, userId])
    }
    if (existing.status !== 'active') {
      await run(`UPDATE users SET status = 'active' WHERE id = ?`, [userId])
    }
  }

  await audit({
    actorUserId: userId,
    actorEmail: targetEmail,
    actorRole: role,
    action: created ? 'admin.bootstrap.create' : 'admin.bootstrap.ensure',
    entityType: 'user',
    entityId: String(userId),
    before: existing ? { role: existing.role, status: existing.status } : null,
    after: { role, status: 'active', emailVerified: true, passwordReset: resetPassword || created },
    ip: 'cli',
    userAgent: 'bootstrap-admin',
  })

  return { userId, email: targetEmail, role, created, generated, password: generated ? plain : undefined }
}

const isMain = process.argv[1] && process.argv[1].endsWith('bootstrap-admin.js')
if (isMain) {
  const resetPassword = process.argv.includes('--reset-password')
  const roleArg = process.argv.find((a) => a.startsWith('--role='))
  const role = roleArg ? roleArg.split('=')[1] : 'SUPER_ADMIN'
  seed({ silent: true })
    .then(() => bootstrapAdmin({ role, resetPassword }))
    .then((result) => {
      console.log(`[bootstrap-admin] email=${result.email} role=${result.role} ${result.created ? 'created' : 'existing'}`)
      if (result.password) {
        console.log('[bootstrap-admin] Mật khẩu tạm thời (lưu lại ngay, hiển thị MỘT LẦN):')
        console.log(result.password)
      } else if (!result.created) {
        console.log('[bootstrap-admin] Mật khẩu không đổi. Dùng --reset-password để đặt lại.')
      }
      return close()
    })
    .catch((err) => {
      console.error('[bootstrap-admin] Lỗi:', err.message)
      process.exit(1)
    })
}
