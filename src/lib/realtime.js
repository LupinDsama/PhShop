/**
 * Client realtime cho PhShop.
 *
 * Hai kênh được dùng song song:
 *  1. SSE (`/api/events`) — đẩy ngay lập tức khi server dùng chung bộ nhớ
 *     (Node server, hoặc Worker khi request rơi vào cùng isolate).
 *  2. Polling (`/api/events/poll`) — luôn chạy, đảm bảo không bỏ sót sự kiện
 *     trên Cloudflare Worker (mỗi request ở isolate riêng → SSE không đáng tin).
 *
 * Sự kiện trùng / đến sai thứ tự bị loại bằng `eventId` tăng dần.
 */
const MAX_BACKOFF = 30000
const POLL_INTERVAL = 3000

export function createRealtimeClient({ onEvent, onStatus, pollInterval = POLL_INTERVAL } = {}) {
  let source = null
  let lastEventId = 0
  let retryCount = 0
  let retryTimer = null
  let pollTimer = null
  let stopped = false
  let connected = false

  const setStatus = (status, extra = {}) => {
    connected = status === 'connected'
    onStatus?.({ status, connected, ...extra })
  }

  const handle = (payload, eventId) => {
    if (!payload) return
    const id = Number.parseInt(eventId, 10)
    if (Number.isFinite(id)) {
      if (lastEventId && id <= lastEventId) return // sự kiện trùng / sai thứ tự
      lastEventId = id
    }
    onEvent?.(payload, { id })
  }

  // ---- Polling (luôn bật) ----
  const startPolling = () => {
    if (pollTimer || stopped) return
    const tick = async () => {
      if (stopped) return
      try {
        const res = await fetch(`/api/events/poll?since=${lastEventId}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        for (const evt of data.events || []) {
          handle(evt.data, evt.id)
        }
        if (Number.isFinite(data.lastEventId) && data.lastEventId > lastEventId) {
          lastEventId = data.lastEventId
        }
      } catch { /* mạng chập chờn → thử lại ở vòng sau */ }
    }
    pollTimer = setInterval(tick, pollInterval)
    tick()
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // ---- SSE (đường nhanh) ----
  const connect = () => {
    if (stopped) return
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setStatus('unsupported')
      return
    }
    try {
      source = new EventSource('/api/events', { withCredentials: true })
    } catch {
      setStatus('error')
      return
    }

    source.addEventListener('ready', () => {
      retryCount = 0
      setStatus('connected')
    })

    const onEvent = (event) => {
      let payload = null
      try { payload = JSON.parse(event.data) } catch { payload = null }
      handle(payload, event.lastEventId)
    }

    for (const type of ['order.created', 'order.updated', 'product.updated', 'review.created']) {
      source.addEventListener(type, onEvent)
    }
    source.onmessage = onEvent

    source.onerror = () => {
      try { source.close() } catch { /* ignore */ }
      source = null
      setStatus('reconnecting')
      if (stopped) return
      retryCount += 1
      const delay = Math.min(1000 * 2 ** (retryCount - 1), MAX_BACKOFF)
      retryTimer = setTimeout(connect, delay)
    }
  }

  connect()
  startPolling()

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
      startPolling()
    },
    isConnected: () => connected,
  }
}
