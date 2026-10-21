/**
 * Cloudflare Worker entry — chạy cùng lõi API với Node server (server/app.js).
 *
 * Cấu hình trong wrangler.toml:
 *   [[d1_databases]] binding = "DB" database_name = "phshop"
 *
 * Lưu ý: D1 không có transaction tường minh nên adapter D1 chạy các câu lệnh
 * tuần tự; tính an toàn đồng thời dựa vào điều kiện UPDATE (stock) và ràng
 * buộc UNIQUE (idempotency_key, wishlist).
 */
import { createApp } from './app.js'
import { setAdapter } from './db/index.js'
import * as d1Adapter from './db/d1.js'
import { parseCookies, mergeSetCookie, ApiError } from './lib/http.js'
import config from './config.js'

// Worker dùng adapter D1 (Cloudflare).
setAdapter(d1Adapter)

const app = createApp()

function toPlainHeaders(headers) {
  const out = {}
  headers.forEach((value, key) => { out[key.toLowerCase()] = value })
  return out
}

export default {
  async fetch(request, env) {
    // Cloudflare Worker không tự đưa binding `vars` vào process.env.
    // Copy vào để server/config.js đọc được (config dùng getter nên đọc lại mỗi lần).
    for (const [key, value] of Object.entries(env || {})) {
      if (typeof value === 'string' && key !== 'DB') process.env[key] = value
    }
    process.env.PHSHOP_PLATFORM = 'worker'
    // Gán binding D1 cho adapter (env.DB theo wrangler.toml).
    d1Adapter.setBinding(env.DB)

    const url = new URL(request.url)
    const headers = toPlainHeaders(request.headers)
    const cookies = parseCookies(request.headers.get('cookie') || '')

    const reqLike = {
      method: request.method,
      url,
      headers,
      cookies,
      ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      async readJson() {
        // Giới hạn kích thước body giống Node server.
        const declared = Number(request.headers.get('content-length') || 0)
        if (declared > config.maxBodyBytes) {
          throw new ApiError(413, 'payload_too_large', 'Nội dung gửi lên quá lớn.')
        }
        const text = await request.text()
        if (text.length > config.maxBodyBytes) {
          throw new ApiError(413, 'payload_too_large', 'Nội dung gửi lên quá lớn.')
        }
        if (!text) return {}
        let parsed
        try { parsed = JSON.parse(text) } catch { throw new ApiError(400, 'bad_request', 'Body không phải JSON hợp lệ.') }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new ApiError(400, 'bad_request', 'Body phải là JSON object.')
        }
        return parsed
      },
    }

    // Stream cho SSE — tạo sẵn, chỉ dùng khi route mở stream.
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    let streamOpened = false
    const responseHeaders = {}

    const resLike = {
      _response: null,
      setHeader(name, value) { responseHeaders[name.toLowerCase()] = value },
      getHeader(name) { return responseHeaders[name.toLowerCase()] },
      getResponse() { return resLike._response },
      json(status, payload, setCookies = []) {
        const finalHeaders = { ...responseHeaders }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        delete finalHeaders['set-cookie']
        // Phải append từng cookie riêng: nếu đưa mảng vào object thì Headers sẽ
        // gộp thành MỘT header "a=1, b=2" và trình duyệt parse sai (cookie CSRF
        // bị coi là HttpOnly → không đọc được → 403).
        const h = new Headers(finalHeaders)
        for (const cookie of merged || []) h.append('set-cookie', cookie)
        resLike._response = new Response(JSON.stringify(payload), {
          status,
          headers: h,
        })
        return resLike._response
      },
      noContent(status = 204, setCookies = []) {
        const finalHeaders = { ...responseHeaders }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        delete finalHeaders['set-cookie']
        const h = new Headers(finalHeaders)
        for (const cookie of merged || []) h.append('set-cookie', cookie)
        resLike._response = new Response(null, { status, headers: h })
        return resLike._response
      },
      notFound() {
        return resLike.json(404, { error: { code: 'not_found', message: 'Endpoint không tồn tại.' } })
      },
      openStream(streamHeaders = {}, setCookies = []) {
        streamOpened = true
        const finalHeaders = { ...responseHeaders, ...streamHeaders }
        const merged = mergeSetCookie(finalHeaders['set-cookie'], setCookies)
        delete finalHeaders['set-cookie']
        const h = new Headers(finalHeaders)
        for (const cookie of merged || []) h.append('set-cookie', cookie)
        Object.assign(responseHeaders, Object.fromEntries(h.entries()))
        return {
          send: (text) => { writer.write(text).catch(() => {}) },
          close: () => { writer.close().catch(() => {}) },
        }
      },
    }

    let response = null
    try {
      response = await app(reqLike, resLike)
    } catch (err) {
      console.error('[phshop] Unhandled error:', err)
      response = new Response(JSON.stringify({ error: { code: 'internal_error', message: 'Đã xảy ra lỗi hệ thống.' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }

    if (streamOpened) {
      // Giữ stream mở; worker bị huỷ khi client ngắt kết nối.
      return new Response(readable, { status: 200, headers: responseHeaders })
    }

    return response || resLike.getResponse() || new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  },
}
