/**
 * PhShop backend server (Node.js, zero external runtime dependencies).
 *
 * - API JSON + REST tại /api/*
 * - Realtime qua SSE tại /api/events
 * - Phục vụ static build (dist/) khi chạy production
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import config from './config.js'
import { createRouter } from './http/router.js'
import { ApiError, parseCookies, readJson, sendJson, sendNoContent, clientIp } from './lib/http.js'
import { applySecurityHeaders, ensureCsrfCookie, requireCsrf, consumeRateLimit, applyCors } from './lib/security.js'
import { getSessionUser } from './lib/session.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerProductRoutes } from './routes/products.js'
import { registerCartRoutes } from './routes/cart.js'
import { registerWishlistRoutes } from './routes/wishlist.js'
import { registerOrderRoutes } from './routes/orders.js'
import { registerAdminRoutes } from './routes/admin.js'
import { registerEventRoutes } from './routes/events.js'
import { registerMiscRoutes } from './routes/misc.js'
import { getDb, closeDb } from './db/index.js'
import { purgeExpiredSessions } from './lib/session.js'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

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

export function createApp({ router = buildRouter() } = {}) {
  return async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const cookies = parseCookies(req.headers.cookie)
    const setCookies = []

    applySecurityHeaders(res)
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const ctx = {
      req,
      res,
      url,
      query: Object.fromEntries(url.searchParams.entries()),
      params: {},
      body: {},
      cookies,
      headers: req.headers,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || '',
      user: null,
      csrfToken: null,
      setCookie: (value) => setCookies.push(value),
      json: (status, payload, headers = {}) => {
        flushCookies(res, setCookies)
        sendJson(res, status, payload, headers)
      },
      noContent: (status = 204, headers = {}) => {
        flushCookies(res, setCookies)
        sendNoContent(res, status, headers)
      },
    }

    try {
      if (!url.pathname.startsWith('/api/')) {
        return await serveStatic(req, res, url)
      }

      ctx.csrfToken = ensureCsrfCookie(req, res, cookies)
      ctx.user = getSessionUser(cookies.phshop_sid)

      const { route, params } = router.match(req.method, url.pathname)
      ctx.params = params

      // Rate limit tổng cho API.
      consumeRateLimit('api', ctx.ip, config.rateLimits.api)

      // CSRF cho mọi request thay đổi trạng thái (double-submit cookie).
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
        ctx.body = await readJson(req)
      }

      const result = await route.handler(ctx)
      if (result === undefined) return undefined // handler tự quản lý response (SSE)
      flushCookies(res, setCookies)
      if (!res.headersSent) sendJson(res, 200, result ?? { ok: true })
    } catch (err) {
      handleError(res, err, setCookies)
    }
  }
}

function flushCookies(res, setCookies) {
  if (!setCookies.length) return
  const existing = res.getHeader('Set-Cookie')
  // Phải copy mảng, không giữ tham chiếu tới setCookies (sẽ bị xoá bên dưới).
  const all = existing ? [].concat(existing, setCookies) : [...setCookies]
  res.setHeader('Set-Cookie', all)
  setCookies.length = 0
}
function handleError(res, err, setCookies) {
  flushCookies(res, setCookies)
  if (res.headersSent) {
    try { res.end() } catch { /* ignore */ }
    return
  }
  if (err instanceof ApiError) {
    sendJson(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details },
    })
    return
  }
  // Không lộ stack trace cho client.
  console.error('[phshop] Unhandled error:', err)
  sendJson(res, 500, {
    error: {
      code: 'internal_error',
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
      ...(config.isProd ? {} : { debug: String(err?.message || err) }),
    },
  })
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Method không hỗ trợ.' } })
    return
  }
  const staticDir = config.staticDir
  const indexFile = path.join(staticDir, 'index.html')
  if (!fs.existsSync(indexFile)) {
    sendJson(res, 404, {
      error: { code: 'not_found', message: 'Frontend chưa được build. Chạy `npm run build` hoặc dùng `npm run dev`.' },
    })
    return
  }
  const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(staticDir, safePath)
  if (!filePath.startsWith(path.resolve(staticDir))) filePath = indexFile
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = indexFile
  }
  const ext = path.extname(filePath)
  const isHtml = ext === '.html'
  const body = fs.readFileSync(filePath)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

export function startServer({ port = config.port, host = config.host } = {}) {
  getDb()
  purgeExpiredSessions()
  const server = http.createServer(createApp())
  server.keepAliveTimeout = 65000
  server.headersTimeout = 70000
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server))
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('server', 'index.js'))
if (isMain) {
  startServer().then((server) => {
    const address = server.address()
    console.log(`[phshop] API sẵn sàng tại http://${address.address}:${address.port}`)
    console.log(`[phshop] Database: ${config.dbPath}`)
    console.log(`[phshop] Static: ${config.staticDir}`)
    const shutdown = () => {
      server.close(() => {
        closeDb()
        process.exit(0)
      })
      setTimeout(() => process.exit(0), 3000).unref()
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }).catch((err) => {
    console.error('[phshop] Không khởi động được server:', err)
    process.exit(1)
  })
}
