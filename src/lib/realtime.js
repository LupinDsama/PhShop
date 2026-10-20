/**
 * Client realtime dựa trên Server-Sent Events.
 * - Tự kết nối lại khi rớt mạng (exponential backoff).
 * - Hỗ trợ Last-Event-ID để server replay các sự kiện bị lỡ.
 * - Có cơ chế polling dự phòng khi SSE không khả dụng.
 * - Bỏ qua sự kiện trùng / đến sai thứ tự (dựa trên eventId tăng dần).
 */
const MAX_BACKOFF = 30000
const POLL_INTERVAL = 15000

export function createRealtimeClient({ onEvent, onStatus, pollFn } = {}) {
  let source = null
  let lastEventId = null
  let retryCount = 0
  let retryTimer = null
  let pollTimer = null
  let stopped = false
  let connected = false

  const setStatus = (status, extra = {}) => {
    connected = status === 'connected'
    onStatus?.({ status, connected, ...extra })
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const startPolling = () => {
    if (!pollFn || pollTimer) return
    pollTimer = setInterval(() => {
      pollFn().catch(() => {})
    }, POLL_INTERVAL)
  }

  const connect = () => {
    if (stopped) return
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setStatus('unsupported')
      startPolling()
      return
    }
    try {
      source = new EventSource('/api/events', { withCredentials: true })
    } catch {
      setStatus('error')
      startPolling()
      return
    }

    source.addEventListener('ready', () => {
      retryCount = 0
      setStatus('connected')
      stopPolling()
    })

    const handle = (event) => {
      let payload = null
      try { payload = JSON.parse(event.data) } catch { payload = null }
      if (!payload) return
      if (event.lastEventId) {
        const id = Number.parseInt(event.lastEventId, 10)
        if (Number.isFinite(id)) {
          if (lastEventId !== null && id <= lastEventId) return // sự kiện trùng / sai thứ tự
          lastEventId = id
        }
      }
      onEvent?.(payload, event)
    }

    for (const type of ['order.created', 'order.updated', 'product.updated', 'review.created']) {
      source.addEventListener(type, handle)
    }
    source.onmessage = handle

    source.onerror = () => {
      try { source.close() } catch { /* ignore */ }
      source = null
      setStatus('reconnecting')
      startPolling()
      if (stopped) return
      retryCount += 1
      const delay = Math.min(1000 * 2 ** (retryCount - 1), MAX_BACKOFF)
      retryTimer = setTimeout(connect, delay)
    }
  }

  connect()

  return {
    stop() {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      stopPolling()
      try { source?.close() } catch { /* ignore */ }
      source = null
      setStatus('closed')
    },
    reconnect() {
      stopped = false
      retryCount = 0
      connect()
    },
    isConnected: () => connected,
  }
}
