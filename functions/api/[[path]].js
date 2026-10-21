/**
 * Cloudflare Pages Function — proxy /api/* tới Cloudflare Worker (phshop-api).
 *
 * Mục đích: frontend và API cùng origin (phshop.pages.dev) để
 *  - cookie phiên/CSRF là first-party (SameSite=Lax hoạt động bình thường),
 *  - không cần CORS, không cần SameSite=None,
 *  - tránh rủi ro cookie bị chặn khi gọi cross-origin từ trình duyệt.
 *
 * Luồng: Browser → Pages (/api/*) → Worker (D1) → trả về nguyên vẹn.
 */
const WORKER_ORIGIN = 'https://phshop-api.lupindsama.workers.dev'

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const target = `${WORKER_ORIGIN}${url.pathname}${url.search}`

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const init = {
    method: request.method,
    headers: request.headers,
  }
  if (hasBody) {
    init.body = request.body
    // Không đặt Content-Length: body đã stream, để Cloudflare tự tính.
    init.headers = new Headers(request.headers)
    init.headers.delete('content-length')
  }

  let upstream
  try {
    upstream = await fetch(target, init)
  } catch (err) {
    console.error('[phshop-proxy] Không gọi được API:', err?.message || err)
    return new Response(
      JSON.stringify({ error: { code: 'upstream_error', message: 'Không kết nối được tới API server.' } }),
      { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  }

  const upstreamCookies = typeof upstream.headers.getSetCookie === 'function'
    ? upstream.headers.getSetCookie()
    : []
  const headers = new Headers(upstream.headers)
  // Giữ từng cookie riêng: Headers gộp nhiều Set-Cookie thành một chuỗi "a=1, b=2"
  // khiến trình duyệt parse sai (cookie CSRF bị coi là HttpOnly).
  headers.delete('set-cookie')
  for (const cookie of upstreamCookies) headers.append('set-cookie', cookie)
  // Bỏ header của lớp trung gian để trình duyệt không bị decode sai.
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('transfer-encoding')
  headers.set('X-PhShop-Proxy', 'pages-function')

  return new Response(upstream.body, { status: upstream.status, headers })
}
