/**
 * Realtime SSE endpoint.
 * - Chỉ mở được khi đã đăng nhập (session cookie).
 * - Kênh: `user:<id>` (đơn của chính mình) và `admin` (chỉ ADMIN/SUPER_ADMIN/SUPPORT).
 * - Hỗ trợ Last-Event-ID để replay khi reconnect.
 */
import { subscribe, replaySince, pollEvents } from '../lib/events.js'

/** Các kênh realtime mà user hiện tại được phép nghe. */
export function channelsFor(user) {
  const channels = new Set([`user:${user.id}`])
  if (['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(user.role)) channels.add('admin')
  return channels
}

export function registerEventRoutes(router) {
  router.get('/api/events', async (ctx) => {
    const channels = channelsFor(ctx.user)

    const stream = ctx.openStream({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const unsubscribe = subscribe(stream, { channels, userId: ctx.user.id, role: ctx.user.role })

    // Gửi trạng thái ban đầu để client biết đã kết nối thành công.
    stream.send(
      `event: ready\ndata: ${JSON.stringify({ userId: ctx.user.id, channels: [...channels], at: new Date().toISOString() })}\n\n`,
    )

    const lastEventId = ctx.headers['last-event-id']
    if (lastEventId) {
      const missed = replaySince(lastEventId, channels)
      for (const evt of missed) {
        stream.send(`id: ${evt.id}\nevent: ${evt.payload.type || 'message'}\ndata: ${JSON.stringify(evt.payload)}\n\n`)
      }
    }

    const cleanup = () => {
      unsubscribe()
      stream.close()
    }
    ctx.req.on?.('close', cleanup)
    ctx.req.on?.('error', cleanup)
    // Không gửi body JSON — giữ stream mở.
    return undefined
  })

  /**
   * Polling sự kiện — dùng khi SSE không khả dụng (Cloudflare Worker chạy mỗi
   * request ở isolate riêng nên bộ nhớ in-memory không dùng chung được).
   * Trả về các sự kiện mới kể từ `since` (id của sự kiện cuối đã nhận).
   */
  router.get('/api/events/poll', async (ctx) => {
    const channels = [...channelsFor(ctx.user)]
    const since = Number.parseInt(ctx.query.since, 10) || 0
    const { events, lastEventId } = await pollEvents(channels, since)
    return ctx.json(200, { events, lastEventId })
  })
}
