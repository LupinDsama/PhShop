/**
 * PhShop backend server cho Node.js (không dùng dependency runtime ngoài).
 *
 * - API JSON + REST tại /api/*
 * - Realtime qua SSE tại /api/events
 * - Phục vụ static build (dist/) khi chạy production
 *
 * Lõi xử lý nằm trong server/app.js (dùng chung với Cloudflare Worker).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import config from './config.js'
import { createApp } from './app.js'
import { parseCookies, readJson, clientIp, mergeSetCookie, ApiError } from './lib/http.js'
import { setAdapter } from './db/index.js'
import * as sqliteAdapter from './db/sqlite.js'
import { purgeExpiredSessions } from './lib/session.js'

// Node server dùng adapter SQLite (node:sqlite).
setAdapter(sqliteAdapter)

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

export function createNodeHandler(handler = createApp()) {
  return async function nodeHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const cookies = parseCookies(req.headers.cookie)
    const headers = {}

    const reqLike = {
      method: req.method,
      url,
      headers: req.headers,
      cookies,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || '',
      async readJson() {
        const body = await readJson(req)
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new ApiError(400, 'bad_request', 'Body phải là JSON object.')
        }
        return body
      },
    }

    const resLike = {
      setHeader(name, value) { headers[name.toLowerCase()] = value },
      getHeader(name) { return headers[name.toLowerCase()] },
      json(status, payload, setCookies = []) {
        if (res.headersSent) return
        const finalHeaders = { ...headers }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        if (merged) finalHeaders['Set-Cookie'] = merged
        const body = JSON.stringify(payload)
        finalHeaders['Content-Type'] = 'application/json; charset=utf-8'
        finalHeaders['Content-Length'] = Buffer.byteLength(body)
        finalHeaders['Cache-Control'] = 'no-store'
        res.writeHead(status, finalHeaders)
        res.end(body)
      },
      noContent(status = 204, setCookies = []) {
        if (res.headersSent) return
        const finalHeaders = { ...headers }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        if (merged) finalHeaders['Set-Cookie'] = merged
        res.writeHead(status, finalHeaders)
        res.end()
      },
      notFound() {
        resLike.json(404, { error: { code: 'not_found', message: 'Endpoint không tồn tại.' } })
      },
      openStream(streamHeaders = {}, setCookies = []) {
        const finalHeaders = { ...headers, ...streamHeaders }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        if (merged) finalHeaders['Set-Cookie'] = merged
        res.writeHead(200, finalHeaders)
        return {
          send: (text) => { try { res.write(text) } catch { /* client đã đóng */ } },
          close: () => { try { res.end() } catch { /* ignore */ } },
        }
      },
    }

    try {
      await handler(reqLike, resLike)
    } catch (err) {
      console.error('[phshop] Unhandled error:', err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: { code: 'internal_error', message: 'Đã xảy ra lỗi hệ thống.' } }))
      }
    }
  }
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: { code: 'method_not_allowed', message: 'Method không hỗ trợ.' } }))
    return
  }
  const staticDir = config.staticDir
  const indexFile = path.join(staticDir, 'index.html')
  if (!fs.existsSync(indexFile)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      error: { code: 'not_found', message: 'Frontend chưa được build. Chạy `npm run build` hoặc dùng `npm run dev`.' },
    }))
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
  sqliteAdapter.init()
  purgeExpiredSessions()
  const app = createApp()
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    if (!url.pathname.startsWith('/api/')) {
      serveStatic(req, res, url)
      return
    }
    await createNodeHandler(app)(req, res)
  })
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
        sqliteAdapter.close()
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
