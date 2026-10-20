/**
 * Helpers dùng chung cho đơn hàng: serialize, tạo mã đơn, đọc quyền sở hữu.
 */
import { getDb, all, one, run } from '../db/index.js'
import { randomToken } from './password.js'
import { STATUS_LABELS, PAYMENT_LABELS, PROGRESS_STEP } from './order-state.js'

export function generateOrderId() {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = randomToken(4).replace(/[-_]/g, '').toUpperCase().slice(0, 5)
  return `PHS${stamp}${rand}`
}

export function getOrderRow(orderId) {
  return one(`SELECT * FROM orders WHERE id = ?`, [orderId])
}

export function getOrderItems(orderId) {
  return all(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`, [orderId])
}

export function getOrderEvents(orderId) {
  return all(
    `SELECT id, type, from_status, to_status, payment_from, payment_to, actor_role, note, created_at
     FROM order_events WHERE order_id = ? ORDER BY id`,
    [orderId],
  ).map((e) => ({
    id: e.id,
    type: e.type,
    fromStatus: e.from_status,
    toStatus: e.to_status,
    fromLabel: e.from_status ? STATUS_LABELS[e.from_status] || e.from_status : null,
    toLabel: e.to_status ? STATUS_LABELS[e.to_status] || e.to_status : null,
    paymentFrom: e.payment_from,
    paymentTo: e.payment_to,
    actorRole: e.actor_role,
    note: e.note,
    createdAt: e.created_at,
  }))
}

export function serializeOrder(order, { includeInternal = false } = {}) {
  const items = getOrderItems(order.id)
  const base = {
    id: order.id,
    email: order.email,
    recipient: order.recipient,
    phone: order.phone,
    address: order.address,
    note: order.note,
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shipping_fee,
    total: order.total,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    progress: PROGRESS_STEP[order.status] ?? 0,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paymentStatusLabel: PAYMENT_LABELS[order.payment_status] || order.payment_status,
    couponCode: order.coupon_code || null,
    trackingNumber: order.tracking_number || null,
    publicNote: order.public_note || null,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      variantId: i.variant_id,
      sku: i.sku,
      name: i.product_name,
      color: i.color,
      size: i.size,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      note: i.note,
      lineTotal: i.line_total,
    })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    version: order.version,
  }
  if (includeInternal) {
    base.internalNote = order.internal_note || null
    base.history = getOrderEvents(order.id)
  }
  return base
}

/** Chuyển đổi timestamp SQLite sang ISO để client parse nhất quán. */
export function toIso(value) {
  if (!value) return null
  const str = String(value)
  if (str.endsWith('Z') || str.includes('T')) return str
  return `${str.replace(' ', 'T')}Z`
}

export function logOrderEvent(orderId, payload) {
  const db = getDb()
  db.prepare(
    `INSERT INTO order_events (order_id, type, from_status, to_status, payment_from, payment_to, actor_user_id, actor_role, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    orderId,
    payload.type || 'status_change',
    payload.fromStatus ?? null,
    payload.toStatus ?? null,
    payload.paymentFrom ?? null,
    payload.paymentTo ?? null,
    payload.actorUserId ?? null,
    payload.actorRole || 'SYSTEM',
    payload.note || '',
  )
}

export { run }
