/**
 * Realtime: SSE (in-memory) + nhật ký sự kiện trong DB (polling).
 *
 * Vì sao cần cả hai?
 *  - Node server: SSE in-memory hoạt động tốt (một tiến trình duy nhất).
 *  - Cloudflare Worker: mỗi request có thể chạy ở isolate riêng nên bộ nhớ
 *    in-memory KHÔNG đảm bảo chia sẻ giữa các request → sự kiện có thể không
 *    tới được client đang mở stream. Vì vậy mọi sự kiện đều được ghi vào
 *    bảng `events_log`; client polling theo `since=<id>` sẽ luôn nhận được.
 */
import { all, run, one } from '../db/index.js'
import { randomToken } from './password.js'

const BUFFER_SIZE = 200
const MAX_LOG_ROWS = 1000

let nextEventId = 1
const buffer = [] // { id, channel, payload }
const clients = new Set() // { stream, channels:Set, userId, role }

// Heartbeat khởi động lazily: Cloudflare Worker không cho phép tạo timer ở
// global scope (chỉ được phép trong phạm vi handler).
let heartbeatTimer = null

function ensureHeartbeat() {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(heartbeat, 25000)
  heartbeatTimer.unref?.()
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export function subscribe(stream, { channels, userId, role }) {
  ensureHeartbeat()
  const client = { stream, channels: new Set(channels), userId, role, id: randomToken(8) }
  clients.add(client)
  return () => clients.delete(client)
}

export function replaySince(lastEventId, channels) {
  const since = Number.parseInt(lastEventId, 10)
  if (!Number.isFinite(since)) return []
  return buffer.filter((e) => e.id > since && channels.has(e.channel))
}

const channelKey = (channels) => `|${channels.join('|')}|`

/**
 * Phát sự kiện: ghi vào DB (để polling đọc được) + đẩy tới các stream đang mở.
 * @returns {Promise<number>} id của sự kiện
 */
export async function publish(channels, payload, { type = 'message' } = {}) {
  const list = Array.isArray(channels) ? channels : [channels]
  const body = { ...payload, type }

  // 1) Ghi log để client polling nhận được (nguồn dữ liệu đáng tin cậy).
  let eventId = nextEventId
  try {
    const result = await run(
      `INSERT INTO events_log (channels, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [channelKey(list), type, JSON.stringify(body)],
    )
    eventId = Number(result.lastInsertRowid) || nextEventId
    nextEventId = Math.max(nextEventId, eventId + 1)
  } catch {
    // DB lỗi → vẫn phát qua SSE nếu có
  }

  const enriched = { ...body, eventId }
  const frame = `id: ${eventId}\nevent: ${type}\ndata: ${JSON.stringify(enriched)}\n\n`

  // 2) Đẩy tới các stream đang mở (Node server / cùng isolate).
  for (const client of clients) {
    if (!list.some((c) => client.channels.has(c))) continue
    try {
      client.stream.send(frame)
    } catch {
      clients.delete(client)
    }
  }

  buffer.push({ id: eventId, channel: list[0] || 'broadcast', payload: enriched })
  if (buffer.length > BUFFER_SIZE) buffer.shift()

  return eventId
}

/** Đọc sự kiện mới từ DB cho các kênh của user. */
export async function pollEvents(channels, since = 0, limit = 50) {
  const startId = Number.parseInt(since, 10)
  const from = Number.isFinite(startId) && startId > 0 ? startId : 0
  const clauses = []
  const params = []
  for (const channel of channels) {
    clauses.push('channels LIKE ?')
    params.push(`%|${channel}|%`)
  }
  const where = clauses.length ? `AND (${clauses.join(' OR ')})` : ''
  const rows = await all(
    `SELECT id, type, payload, created_at FROM events_log WHERE id > ? ${where} ORDER BY id ASC LIMIT ?`,
    [from, ...params, limit],
  )
  const events = rows.map((r) => {
    let payload = {}
    try { payload = JSON.parse(r.payload) } catch { payload = {} }
    return { id: r.id, type: r.type, data: { ...payload, eventId: r.id }, createdAt: r.created_at }
  })

  // Giữ bảng events_log gọn: chỉ giữ MAX_LOG_ROWS sự kiện gần nhất.
  try {
    const max = await one(`SELECT MAX(id) AS m FROM events_log`)
    if (max?.m && max.m > MAX_LOG_ROWS) {
      await run(`DELETE FROM events_log WHERE id < ?`, [max.m - MAX_LOG_ROWS])
    }
  } catch { /* bỏ qua */ }

  const lastEventId = rows.length ? Number(rows[rows.length - 1].id) : from
  return { events, lastEventId }
}

export function heartbeat() {
  const frame = `: ping ${Date.now()}\n\n`
  for (const client of clients) {
    try { client.stream.send(frame) } catch { clients.delete(client) }
  }
}

export function clientCount() {
  return clients.size
}

export function closeAll() {
  for (const client of clients) {
    try { client.stream.close() } catch { /* ignore */ }
  }
  clients.clear()
}
