/**
 * Auth API: đăng ký, đăng nhập, đăng xuất, hồ sơ, phiên, đặt lại mật khẩu.
 *
 * QUY TẮC BẢO MẬT:
 * - Role LUÔN lấy từ DB. Đăng ký bằng email admin KHÔNG tự cấp quyền admin.
 * - Chỉ invitation hợp lệ (token do quản trị tạo) mới có thể cấp role quản trị.
 * - Mọi thao tác nhạy cảm đều ghi audit log.
 */
import { getDb, one, all, run } from '../db/index.js'
import config from '../config.js'
import {
  parse, registerSchema, loginSchema, profileSchema, passwordChangeSchema,
  passwordResetRequestSchema, passwordResetSchema, addressSchema,
} from '../lib/validate.js'
import { hashPassword, verifyPassword, randomToken, hashToken } from '../lib/password.js'
import {
  createSession, revokeSession, revokeAllUserSessions,
  listUserSessions, sessionCookieHeader, clearSessionCookieHeader,
} from '../lib/session.js'
import { audit } from '../lib/audit.js'
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/http.js'
import { consumeRateLimit, resetRateLimit } from '../lib/security.js'

const normalizeEmail = (v) => String(v || '').trim().toLowerCase()

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    role: user.role,
    emailVerified: !!user.email_verified,
    createdAt: user.created_at || null,
  }
}

function findUserByEmail(email) {
  return one(`SELECT * FROM users WHERE email = ?`, [email])
}

function createEmailToken(userId, purpose, extra = '', ttlMs = 24 * 60 * 60 * 1000) {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  run(
    `INSERT INTO email_tokens (token_hash, user_id, purpose, extra, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [hashToken(token), userId, purpose, extra, expiresAt],
  )
  return { token, expiresAt }
}

/** Role được cấp khi đăng ký — LUÔN là CUSTOMER trừ khi có invitation hợp lệ. */
function findInvite(token, userId = null) {
  if (!token) return null
  const row = one(
    `SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = 'invite' AND used_at IS NULL`,
    [hashToken(token)],
  )
  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  if (userId !== null && row.user_id !== userId) return null
  return row
}

export function registerAuthRoutes(router) {
  router.post('/api/auth/register', async (ctx) => {
    consumeRateLimit('register', ctx.ip, config.rateLimits.register)
    const body = parse(registerSchema, ctx.body)
    const email = normalizeEmail(body.email)
    const passwordHash = await hashPassword(body.password)
    const existing = findUserByEmail(email)

    let userId
    let grantedRole = 'CUSTOMER'

    if (existing) {
      // Tài khoản đã tồn tại: chỉ cho phép nếu có invitation hợp lệ.
      const invite = findInvite(body.inviteToken, existing.id)
      if (!invite) {
        throw conflict('Email này đã được sử dụng. Vui lòng đăng nhập hoặc đặt lại mật khẩu.')
      }
      grantedRole = invite.extra || 'CUSTOMER'
      userId = existing.id
      run(
        `UPDATE users SET name = ?, phone = ?, password_hash = ?, role = ?, status = 'active', updated_at = datetime('now') WHERE id = ?`,
        [body.name, body.phone || '', passwordHash, grantedRole, userId],
      )
      run(`UPDATE email_tokens SET used_at = datetime('now') WHERE token_hash = ?`, [hashToken(body.inviteToken)])
    } else {
      const invite = findInvite(body.inviteToken)
      grantedRole = invite ? invite.extra || 'CUSTOMER' : 'CUSTOMER'
      const result = run(
        `INSERT INTO users (email, name, phone, password_hash, role, email_verified, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 'active', datetime('now'), datetime('now'))`,
        [email, body.name, body.phone || '', passwordHash, grantedRole],
      )
      userId = Number(result.lastInsertRowid)
      if (body.inviteToken) {
        run(`UPDATE email_tokens SET used_at = datetime('now') WHERE token_hash = ?`, [hashToken(body.inviteToken)])
      }
    }

    const verify = createEmailToken(userId, 'verify', '', 7 * 24 * 60 * 60 * 1000)
    if (body.address) {
      run(
        `INSERT INTO addresses (user_id, label, recipient, phone, address_line, is_default) VALUES (?, 'Mặc định', ?, ?, ?, 1)`,
        [userId, body.name, body.phone || '', body.address],
      )
    }

    audit({
      actorUserId: userId,
      actorEmail: email,
      actorRole: grantedRole,
      action: 'auth.register',
      entityType: 'user',
      entityId: String(userId),
      after: { email, name: body.name, role: grantedRole, invited: !!body.inviteToken },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    const session = createSession(userId, { ip: ctx.ip, userAgent: ctx.userAgent })
    ctx.setCookie(sessionCookieHeader(session.token, session.expiresAt))
    const user = one(`SELECT * FROM users WHERE id = ?`, [userId])

    return ctx.json(201, {
      user: publicUser(user),
      // Token xác minh chỉ được trả về khi KHÔNG chạy production (không có SMTP).
      verificationToken: config.isProd ? undefined : verify.token,
    })
  }, { auth: false })

  router.post('/api/auth/login', async (ctx) => {
    const body = parse(loginSchema, ctx.body)
    const email = normalizeEmail(body.email)
    consumeRateLimit('login', `${ctx.ip}:${email}`, config.rateLimits.login)

    const user = findUserByEmail(email)
    const ok = user ? await verifyPassword(body.password, user.password_hash) : false

    run(`INSERT INTO login_attempts (email, ip, success) VALUES (?, ?, ?)`, [email, ctx.ip, ok ? 1 : 0])

    if (!ok) {
      audit({
        actorEmail: email,
        action: 'auth.login.failed',
        entityType: 'user',
        entityId: email,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      // Thông điệp chung chung — không tiết lộ email có tồn tại hay không.
      throw unauthorized('Email hoặc mật khẩu không đúng.')
    }
    if (user.status !== 'active') {
      throw forbidden('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.')
    }

    resetRateLimit('login', `${ctx.ip}:${email}`)
    const session = createSession(user.id, { ip: ctx.ip, userAgent: ctx.userAgent })
    ctx.setCookie(sessionCookieHeader(session.token, session.expiresAt))

    audit({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'auth.login',
      entityType: 'user',
      entityId: String(user.id),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return ctx.json(200, { user: publicUser(user) })
  }, { auth: false })

  router.post('/api/auth/logout', async (ctx) => {
    if (ctx.user) {
      revokeSession(ctx.user.sessionId)
      audit({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        actorRole: ctx.user.role,
        action: 'auth.logout',
        entityType: 'session',
        entityId: ctx.user.sessionId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
    }
    ctx.setCookie(clearSessionCookieHeader())
    return ctx.json(200, { ok: true })
  })

  router.get('/api/auth/session', async (ctx) => {
    if (!ctx.user) return ctx.json(200, { user: null, csrfToken: ctx.csrfToken })
    getDb().prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`).run(ctx.user.sessionId)
    const row = one(`SELECT * FROM users WHERE id = ?`, [ctx.user.id])
    return ctx.json(200, { user: publicUser(row), csrfToken: ctx.csrfToken })
  }, { auth: false })

  router.patch('/api/auth/profile', async (ctx) => {
    const body = parse(profileSchema, ctx.body)
    const before = one(`SELECT * FROM users WHERE id = ?`, [ctx.user.id])
    run(
      `UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`,
      [body.name ?? before.name, body.phone ?? before.phone, ctx.user.id],
    )
    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'user.profile.update',
      entityType: 'user',
      entityId: String(ctx.user.id),
      before: { name: before.name, phone: before.phone },
      after: { name: body.name ?? before.name, phone: body.phone ?? before.phone },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    const after = one(`SELECT * FROM users WHERE id = ?`, [ctx.user.id])
    return ctx.json(200, { user: publicUser(after) })
  })

  router.patch('/api/auth/password', async (ctx) => {
    const body = parse(passwordChangeSchema, ctx.body)
    const user = one(`SELECT * FROM users WHERE id = ?`, [ctx.user.id])
    const ok = await verifyPassword(body.currentPassword, user.password_hash)
    if (!ok) throw unauthorized('Mật khẩu hiện tại không đúng.')
    const hash = await hashPassword(body.newPassword)
    run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [hash, ctx.user.id])
    // Thu hồi các phiên khác, giữ lại phiên hiện tại.
    revokeAllUserSessions(ctx.user.id, ctx.user.sessionId)
    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'auth.password.change',
      entityType: 'user',
      entityId: String(ctx.user.id),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  })

  router.get('/api/auth/sessions', async (ctx) => {
    return ctx.json(200, { sessions: listUserSessions(ctx.user.id) })
  })

  router.delete('/api/auth/sessions/:id', async (ctx) => {
    const row = one(`SELECT * FROM sessions WHERE id LIKE ? AND user_id = ?`, [`${ctx.params.id}%`, ctx.user.id])
    if (!row) throw notFound('Không tìm thấy phiên đăng nhập.')
    revokeSession(row.id)
    audit({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.user.role,
      action: 'auth.session.revoke',
      entityType: 'session',
      entityId: row.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  })

  router.post('/api/auth/password-reset/request', async (ctx) => {
    consumeRateLimit('passwordReset', `${ctx.ip}:${ctx.body?.email || ''}`, config.rateLimits.passwordReset)
    const body = parse(passwordResetRequestSchema, ctx.body)
    const email = normalizeEmail(body.email)
    const user = findUserByEmail(email)
    let token
    if (user) {
      const created = createEmailToken(user.id, 'reset', '', 60 * 60 * 1000)
      token = created.token
      audit({
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'auth.password_reset.requested',
        entityType: 'user',
        entityId: String(user.id),
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
    }
    // Luôn trả về cùng message để không tiết lộ email tồn tại hay không.
    return ctx.json(202, {
      ok: true,
      message: 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
      resetToken: config.isProd ? undefined : token,
    })
  }, { auth: false })

  router.post('/api/auth/password-reset/confirm', async (ctx) => {
    consumeRateLimit('passwordResetConfirm', ctx.ip, config.rateLimits.passwordReset)
    const body = parse(passwordResetSchema, ctx.body)
    const tokenHash = hashToken(body.token)
    const row = one(`SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = 'reset' AND used_at IS NULL`, [tokenHash])
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      throw badRequest('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
    }
    const hash = await hashPassword(body.newPassword)
    run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [hash, row.user_id])
    run(`UPDATE email_tokens SET used_at = datetime('now') WHERE token_hash = ?`, [tokenHash])
    // Thu hồi toàn bộ phiên sau khi đặt lại mật khẩu.
    revokeAllUserSessions(row.user_id)
    audit({
      actorUserId: row.user_id,
      action: 'auth.password_reset.completed',
      entityType: 'user',
      entityId: String(row.user_id),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  }, { auth: false })

  router.post('/api/auth/verify-email', async (ctx) => {
    const token = String(ctx.body?.token || '')
    if (!token) throw badRequest('Thiếu token xác minh.')
    const tokenHash = hashToken(token)
    const row = one(`SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = 'verify' AND used_at IS NULL`, [tokenHash])
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      throw badRequest('Token xác minh không hợp lệ hoặc đã hết hạn.')
    }
    run(`UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?`, [row.user_id])
    run(`UPDATE email_tokens SET used_at = datetime('now') WHERE token_hash = ?`, [tokenHash])
    audit({
      actorUserId: row.user_id,
      action: 'auth.email.verified',
      entityType: 'user',
      entityId: String(row.user_id),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return ctx.json(200, { ok: true })
  }, { auth: false })

  router.get('/api/auth/addresses', async (ctx) => {
    const rows = all(`SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [ctx.user.id])
    return ctx.json(200, {
      addresses: rows.map((r) => ({
        id: r.id, label: r.label, recipient: r.recipient, phone: r.phone,
        address: r.address_line, isDefault: !!r.is_default,
      })),
    })
  })

  router.post('/api/auth/addresses', async (ctx) => {
    const schema = parse(addressSchema, ctx.body)
    const count = one(`SELECT COUNT(*) AS c FROM addresses WHERE user_id = ?`, [ctx.user.id]).c
    const isDefault = schema.isDefault || count === 0
    if (isDefault) run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [ctx.user.id])
    const result = run(
      `INSERT INTO addresses (user_id, label, recipient, phone, address_line, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
      [ctx.user.id, schema.label || 'Mặc định', schema.recipient, schema.phone || '', schema.address, isDefault ? 1 : 0],
    )
    return ctx.json(201, { id: Number(result.lastInsertRowid) })
  })

  router.delete('/api/auth/addresses/:id', async (ctx) => {
    const row = one(`SELECT * FROM addresses WHERE id = ? AND user_id = ?`, [ctx.params.id, ctx.user.id])
    if (!row) throw notFound('Không tìm thấy địa chỉ.')
    run(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [ctx.params.id, ctx.user.id])
    return ctx.json(200, { ok: true })
  })
}

export { publicUser, findUserByEmail, normalizeEmail, createEmailToken }
