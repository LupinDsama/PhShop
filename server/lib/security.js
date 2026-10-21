/**
 * Security middleware: security headers, CSRF double-submit, rate limiting.
 */
import { randomToken, safeEqual } from './password.js'
import config from '../config.js'
import { tooMany, forbidden } from './http.js'

export const CSRF_COOKIE = 'phshop_csrf'
export const SESSION_COOKIE = 'phshop_sid'

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "upgrade-insecure-requests",
].join('; ')

export function applySecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  if (config.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

/**
 * CORS cho trường hợp frontend và API nằm khác origin (ví dụ frontend trên
 * Cloudflare Pages, API trên Node host). Chỉ các origin được khai báo mới
 * được phép và luôn kèm `Vary: Origin`.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin
  if (!origin) return false
  if (!config.corsOrigins.includes(origin)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token,Idempotency-Key')
  res.setHeader('Access-Control-Max-Age', '600')
  res.setHeader('Vary', 'Origin')
  return true
}

/**
 * Rate limiter sliding-window trong bộ nhớ.
 * key = `${scope}:${identifier}`
 */
const buckets = new Map()

export function checkRateLimit(scope, identifier, opts = config.rateLimits.api) {
  ensureCleanup()
  const { limit, windowMs } = opts
  const now = Date.now()
  const key = `${scope}:${identifier}`
  let hits = buckets.get(key)
  if (!hits) {
    hits = []
    buckets.set(key, hits)
  }
  // dọn cửa sổ cũ
  const cutoff = now - windowMs
  while (hits.length && hits[0] <= cutoff) hits.shift()
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000)
    return { allowed: false, retryAfter, remaining: 0 }
  }
  hits.push(now)
  return { allowed: true, remaining: limit - hits.length, retryAfter: 0 }
}

export function consumeRateLimit(scope, identifier, opts) {
  const result = checkRateLimit(scope, identifier, opts)
  if (!result.allowed) throw tooMany()
  return result
}

export function resetRateLimit(scope, identifier) {
  buckets.delete(`${scope}:${identifier}`)
}

// Dọn bộ nhớ định kỳ — khởi động lazily vì Cloudflare Worker không cho phép
// tạo timer ở global scope.
let cleanupTimer = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    const maxWindow = 60 * 60 * 1000
    for (const [key, hits] of buckets) {
      const kept = hits.filter((t) => t > now - maxWindow)
      if (!kept.length) buckets.delete(key)
      else buckets.set(key, kept)
    }
  }, 5 * 60 * 1000)
  cleanupTimer.unref?.()
}

/**
 * Lấy (hoặc tạo) CSRF token cho double-submit cookie.
 * Trả về { token, isNew } — isNew = true nghĩa là cần set cookie.
 */
export function ensureCsrfToken(cookies) {
  const existing = cookies[CSRF_COOKIE]
  if (existing) return { token: existing, isNew: false }
  return { token: randomToken(24), isNew: true }
}

export function csrfCookieHeader(token) {
  return `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Max-Age=86400`
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function verifyCsrf(req, cookies) {
  if (SAFE_METHODS.has(req.method)) return true
  const cookieToken = cookies[CSRF_COOKIE]
  const headerToken = req.headers['x-csrf-token']
  if (!cookieToken || !headerToken) return false
  return safeEqual(cookieToken, String(headerToken))
}

export function requireCsrf(req, cookies) {
  if (verifyCsrf(req, cookies)) return
  throw forbidden('CSRF token không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.')
}
