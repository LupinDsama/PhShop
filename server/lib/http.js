/**
 * Tiện ích HTTP: parse cookie/body, response helpers, lỗi API chuẩn hoá.
 */
import config from '../config.js'

export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (msg, details) => new ApiError(400, 'bad_request', msg, details)
export const unauthorized = (msg = 'Bạn cần đăng nhập.') => new ApiError(401, 'unauthorized', msg)
export const forbidden = (msg = 'Bạn không có quyền thực hiện thao tác này.', details = undefined) =>
  new ApiError(403, 'forbidden', msg, details)
export const notFound = (msg = 'Không tìm thấy dữ liệu.') => new ApiError(404, 'not_found', msg)
export const conflict = (msg, details) => new ApiError(409, 'conflict', msg, details)
export const tooMany = (msg = 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.') => new ApiError(429, 'rate_limited', msg)
export const unprocessable = (msg, details) => new ApiError(422, 'unprocessable', msg, details)

export function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!key) continue
    try { out[key] = decodeURIComponent(value) } catch { out[key] = value }
  }
  return out
}

export function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${opts.path || '/'}`)
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`)
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`)
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`)
  return parts.join('; ')
}

export function readBody(req, limit = config.maxBodyBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let done = false
    const fail = (err) => {
      if (done) return
      done = true
      // Ngừng đọc nhưng KHÔNG destroy socket: cần gửi được response 413 cho client.
      req.pause()
      reject(err)
    }
    req.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > limit) {
        fail(new ApiError(413, 'payload_too_large', 'Nội dung gửi lên quá lớn.'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (done) return
      done = true
      resolve(Buffer.concat(chunks))
    })
    req.on('error', (err) => fail(err))
    req.on('aborted', () => fail(new ApiError(400, 'request_aborted', 'Yêu cầu bị hủy.')))
  })
}

export async function readJson(req, limit) {
  const buf = await readBody(req, limit)
  if (!buf.length) return {}
  try {
    const parsed = JSON.parse(buf.toString('utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw badRequest('Body phải là JSON object.')
    }
    return parsed
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw badRequest('Body không phải JSON hợp lệ.')
  }
}

/** Gộp nhiều header Set-Cookie thành một mảng chuẩn. */
export function mergeSetCookie(existing, list = []) {
  const out = []
  if (existing) {
    if (Array.isArray(existing)) out.push(...existing)
    else out.push(existing)
  }
  out.push(...list)
  return out.length ? out : null
}

export function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload)
  const finalHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  }
  // Cookie đã set qua setHeader() phải được ghi lại tường minh khi writeHead(),
  // vì hành vi merge giữa setHeader() và writeHead() không đảm bảo cho Set-Cookie.
  const cookies = res.getHeader('Set-Cookie')
  if (cookies) finalHeaders['Set-Cookie'] = cookies
  res.writeHead(status, finalHeaders)
  res.end(body)
}

export function sendNoContent(res, status = 204, headers = {}) {
  const finalHeaders = { ...headers }
  const cookies = res.getHeader('Set-Cookie')
  if (cookies) finalHeaders['Set-Cookie'] = cookies
  res.writeHead(status, finalHeaders)
  res.end()
}

export function clientIp(req) {
  if (config.trustProxy) {
    const xff = req.headers['x-forwarded-for']
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

export function parseJsonSafe(value, fallback = null) {
  if (value === null || value === undefined) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}
