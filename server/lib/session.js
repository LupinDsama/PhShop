/**
 * Quản lý phiên đăng nhập: token ngẫu nhiên lưu dạng hash trong DB,
 * cookie HttpOnly, có TTL, thu hồi được và ghi lịch sử.
 */
import config from '../config.js'
import { all, one, run } from '../db/index.js'
import { randomToken, hashToken } from './password.js'
import { serializeCookie } from './http.js'
import { SESSION_COOKIE } from './security.js'

export async function createSession(userId, { ip = '', userAgent = '' } = {}) {
  const token = randomToken(32)
  const id = hashToken(token)
  const expiresAt = new Date(Date.now() + config.sessionTtlMs)
  await run(
    `INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at, user_agent, ip)
     VALUES (?, ?, datetime('now'), datetime('now'), ?, ?, ?)`,
    [id, userId, expiresAt.toISOString(), String(userAgent).slice(0, 255), String(ip).slice(0, 64)],
  )
  return { token, expiresAt }
}

export async function getSessionUser(token) {
  if (!token) return null
  const row = await one(
    `SELECT s.id AS session_id, s.expires_at, s.revoked_at, s.user_id,
            u.id, u.email, u.name, u.phone, u.role, u.email_verified, u.status
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [hashToken(token)],
  )
  if (!row) return null
  if (row.revoked_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  if (row.status !== 'active') return null
  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    emailVerified: !!row.email_verified,
  }
}

export async function touchSession(sessionId) {
  await run(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`, [sessionId])
}

export async function revokeSession(sessionId) {
  await run(`UPDATE sessions SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL`, [sessionId])
}

export async function revokeAllUserSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await run(
      `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND id != ? AND revoked_at IS NULL`,
      [userId, exceptSessionId],
    )
  } else {
    await run(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`, [userId])
  }
}

export async function listUserSessions(userId) {
  const rows = await all(
    `SELECT id, created_at, last_seen_at, expires_at, revoked_at, user_agent, ip
     FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId],
  )
  return rows.map((s) => ({
    id: s.id.slice(0, 12),
    createdAt: s.created_at,
    lastSeenAt: s.last_seen_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
    userAgent: s.user_agent,
    ip: s.ip,
    active: !s.revoked_at && new Date(s.expires_at).getTime() > Date.now(),
  }))
}

export async function purgeExpiredSessions() {
  await run(`DELETE FROM sessions WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL`)
}

export function sessionCookieHeader(token, expiresAt) {
  return serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: config.cookieSameSite,
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookieHeader() {
  return serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: config.cookieSameSite,
    path: '/',
    maxAge: 0,
  })
}

export { SESSION_COOKIE }
