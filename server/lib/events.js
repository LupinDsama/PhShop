/**
 * Realtime hub dựa trên Server-Sent Events.
 * - Xác thực bằng session cookie trước khi mở stream.
 * - Phân kênh theo user / admin; không phát dữ liệu của người khác.
 * - Hỗ trợ Last-Event-ID để replay khi client reconnect.
 * - Có ring buffer để khôi phục trạng thái khi client mất kết nối.
 */
const BUFFER_SIZE = 200

let nextEventId = 1
const buffer = [] // { id, channel, payload }
const clients = new Set() // { res, channels:Set, userId, role, id }

export function subscribe(res, { channels, userId, role }) {
  const client = { res, channels: new Set(channels), userId, role, id: Math.random().toString(36).slice(2) }
  clients.add(client)
  return () => clients.delete(client)
}

export function replaySince(lastEventId, channels) {
  const since = Number.parseInt(lastEventId, 10)
  if (!Number.isFinite(since)) return []
  return buffer.filter((e) => e.id > since && channels.has(e.channel))
}

/**
 * Phát event tới các kênh được chỉ định.
 * @param {string[]} channels
 * @param {object} payload
 */
export function publish(channels, payload, { type = 'message' } = {}) {
  const id = nextEventId++
  const event = { id, channel: channels[0] || 'broadcast', payload: { ...payload, type, eventId: id } }
  buffer.push({ id, channel: event.channel, payload: event.payload })
  if (buffer.length > BUFFER_SIZE) buffer.shift()

  const frame = `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(event.payload)}\n\n`
  for (const client of clients) {
    if (!channels.some((c) => client.channels.has(c))) continue
    try {
      client.res.write(frame)
    } catch {
      clients.delete(client)
    }
  }
  return id
}

export function heartbeat() {
  const frame = `: ping ${Date.now()}\n\n`
  for (const client of clients) {
    try { client.res.write(frame) } catch { clients.delete(client) }
  }
}

export function clientCount() {
  return clients.size
}

export function closeAll() {
  for (const client of clients) {
    try { client.res.end() } catch { /* ignore */ }
  }
  clients.clear()
}

const timer = setInterval(heartbeat, 25000)
timer.unref?.()
