/**
 * Lõi xử lý HTTP — đa nền tảng (Node http server & Cloudflare Worker).
 *
 * Không phụ thuộc trực tiếp vào req/res của Node hay của Worker:
 * adapter cung cấp `req` (method/url/headers/cookies/body/ip) và `res`
 * (json/noContent/openStream/setCookie).
 */
import { ApiError, sendJson } from './lib/http.js'
import { applySecurityHeaders, ensureCsrfToken, csrfCookieHeader, requireCsrf, consumeRateLimit, applyCors } from './lib/security.js'
import { getSessionUser } from './lib/session.js'
import config from './config.js'
import { createRouter } from './http/router.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerProductRoutes } from './routes/products.js'
import { registerCartRoutes } from './routes/cart.js'
import { registerWishlistRoutes } from './routes/wishlist.js'
import { registerOrderRoutes } from './routes/orders.js'
import { registerAdminRoutes } from './routes/admin.js'
import { registerEventRoutes } from './routes/events.js'
import { registerMiscRoutes } from './routes/misc.js'

export function buildRouter() {
  const router = createRouter()
  registerAuthRoutes(router)
  registerProductRoutes(router)
  registerCartRoutes(router)
  registerWishlistRoutes(router)
  registerOrderRoutes(router)
  registerAdminRoutes(router)
  registerEventRoutes(router)
  registerMiscRoutes(router)
  return router
}

/**
 * @param {object} req  { method, url (URL), headers (object|Headers), cookies, body, ip, userAgent }
 * @param {object} res  { json(status, payload), noContent(status), openStream(headers), setCookie(value) }
 */
export function createApp({ router = buildRouter() } = {}) {
  return async function handle(req, res) {
    const url = req.url
    const cookies = req.cookies || {}
    const setCookies = []

    const ctx = {
      req,
      res,
      url,
      query: Object.fromEntries(url.searchParams.entries()),
      params: {},
      body: {},
      cookies,
      headers: req.headers || {},
      ip: req.ip || 'unknown',
      userAgent: req.headers?.['user-agent'] || '',
      user: null,
      csrfToken: null,
      streamOpened: false,
      setCookie: (value) => setCookies.push(value),
      json: (status, payload) => res.json(status, payload, setCookies),
      noContent: (status = 204) => res.noContent(status, setCookies),
      openStream: (headers) => {
        ctx.streamOpened = true
        return res.openStream(headers, setCookies)
      },
    }

    try {
      applySecurityHeaders(res)
      applyCors(req, res)

      if (req.method === 'OPTIONS') {
        res.noContent(204, setCookies)
        return undefined
      }

      if (!url.pathname.startsWith('/api/')) {
        res.notFound()
        return undefined
      }
      ctx.csrfToken = ensureCsrfToken(cookies)
      if (ctx.csrfToken.isNew) {
        ctx.setCookie(csrfCookieHeader(ctx.csrfToken.token))
      }
      ctx.user = await getSessionUser(cookies.phshop_sid)

      const { route, params } = router.match(req.method, url.pathname)
      ctx.params = params

      // Rate limit tổng cho API.
      consumeRateLimit('api', ctx.ip, config.rateLimits.api)

      // CSRF cho mọi request thay đổi trạng thái.
      if (route.opts.csrf !== false) {
        requireCsrf(req, cookies)
      }

      // Phân quyền
      const roles = route.opts.role
      if (roles) {
        if (!ctx.user) throw new ApiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
        if (!roles.includes(ctx.user.role)) {
          throw new ApiError(403, 'forbidden', 'Bạn không có quyền thực hiện thao tác này.')
        }
      } else if (route.opts.auth !== false && !ctx.user) {
        throw new ApiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        ctx.body = await req.readJson()
      }

      const result = await route.handler(ctx)
      if (result === undefined) {
        // Handler đã tự ghi response (Node) hoặc mở stream (SSE).
        return res.getResponse?.()
      }
      if (result && typeof result.status === 'number' && result.headers) {
        return result // Response đã dựng sẵn (Worker)
      }
      return res.json(200, result, setCookies)
    } catch (err) {
      return handleError(res, err, setCookies)
    }
  }
}

export function handleError(res, err, setCookies = []) {
  if (err instanceof ApiError) {
    return res.json(err.status, { error: { code: err.code, message: err.message, details: err.details } }, setCookies)
  }
  // Không lộ stack trace cho client.
  console.error('[phshop] Unhandled error:', err)
  return res.json(500, {
    error: {
      code: 'internal_error',
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
      ...(config.isProd ? {} : { debug: String(err?.message || err) }),
    },
  }, setCookies)
}

export { sendJson }
