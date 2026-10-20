/**
 * Client API cho PhShop.
 * - Tự động gửi cookie phiên (credentials: 'include').
 * - Tự động gắn CSRF token (double-submit) cho mọi request thay đổi trạng thái.
 * - Chuẩn hoá lỗi thành ApiError để UI hiển thị thông điệp thân thiện.
 */
const API_BASE = import.meta.env?.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || 'Đã xảy ra lỗi. Vui lòng thử lại.')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

let csrfPromise = null

/** Đảm bảo có cookie CSRF trước khi gọi request thay đổi trạng thái. */
export async function ensureCsrfToken() {
  if (getCookie('phshop_csrf')) return getCookie('phshop_csrf')
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/api/meta`, { credentials: 'include' })
      .then(() => getCookie('phshop_csrf'))
      .finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

export async function apiFetch(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    timeoutMs = 20000,
  } = options

  const finalHeaders = { Accept: 'application/json', ...headers }
  const init = { method, credentials: 'include', headers: finalHeaders }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    finalHeaders['Content-Type'] = 'application/json'
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken()
    if (token) finalHeaders['X-CSRF-Token'] = token
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  if (signal) signal.addEventListener('abort', onAbort)

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'Yêu cầu quá thời gian, vui lòng thử lại.')
    }
    throw new ApiError(0, 'network_error', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }

  const text = await response.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = null }
  }

  if (!response.ok) {
    const error = data?.error || {}
    throw new ApiError(
      response.status,
      error.code || 'unknown_error',
      error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
      error.details,
    )
  }
  return data
}

export const api = {
  get: (path, opts) => apiFetch(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => apiFetch(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  delete: (path, body, opts) => apiFetch(path, { ...opts, method: 'DELETE', body }),
}

export default api
