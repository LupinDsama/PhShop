/**
 * Realtime SSE endpoint.
 * - Chỉ mở được khi đã đăng nhập (session cookie).
 * - Kênh: `user:<id>` (đơn của chính mình) và `admin` (chỉ ADMIN/SUPER_ADMIN/SUPPORT).
 * - Hỗ trợ Last-Event-ID để replay khi reconnect.
 */
import { subscribe, replaySince } from '../lib/events.js'

export function registerEventRoutes(router) {
  router.get('/api/events', async (ctx) => {
    const channels = new Set([`user:${ctx.user.id}`])
    if (['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(ctx.user.role)) channels.add('admin')

    const { res, req } = ctx
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('retry: 3000\n\n')

    const unsubscribe = subscribe(res, { channels, userId: ctx.user.id, role: ctx.user.role })

    // Gửi trạng thái ban đầu để client biết đã kết nối thành công.
    res.write(
      `event: ready\ndata: ${JSON.stringify({ userId: ctx.user.id, channels: [...channels], at: new Date().toISOString() })}\n\n`,
    )

    const lastEventId = ctx.headers['last-event-id']
    if (lastEventId) {
      const missed = replaySince(lastEventId, channels)
      for (const evt of missed) {
        res.write(`id: ${evt.id}\nevent: ${evt.payload.type || 'message'}\ndata: ${JSON.stringify(evt.payload)}\n\n`)
      }
    }

    const cleanup = () => {
      unsubscribe()
      try { res.end() } catch { /* ignore */ }
    }
    req.on('close', cleanup)
    req.on('error', cleanup)
    // Không gửi body JSON — giữ stream mở.
    return undefined
  })
}
