/**
 * Adapter Cloudflare D1 — cùng interface với adapter Node (./index.js).
 *
 * D1 không hỗ trợ transaction tường minh (BEGIN/COMMIT) nên `tx()` chạy tuần tự.
 * Tính an toàn dựa vào điều kiện cập nhật ở mức câu lệnh:
 *   UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?
 * và ràng buộc UNIQUE cho idempotency_key / wishlist.
 */
let binding = null

export function setBinding(db) {
  binding = db
}

export function getBinding() {
  if (!binding) throw new Error('Chưa gán D1 binding. Gọi setBinding(env.DB) khi khởi tạo Worker.')
  return binding
}

export function init() {
  getBinding()
}

export async function close() { /* D1 không cần đóng */ }

/**
 * D1: chỉ gọi bind() khi có tham số.
 * Lưu ý: bind() của D1 nhận varargs (`bind(a, b)`), truyền mảng sẽ bị coi là
 * MỘT giá trị object → lỗi "Wrong number of parameter bindings".
 */
function prepared(sql, params) {
  const stmt = getBinding().prepare(sql)
  return params && params.length ? stmt.bind(...params) : stmt
}

export async function all(sql, params = []) {
  const { results } = await prepared(sql, params).all()
  return results || []
}

export async function one(sql, params = []) {
  const { results } = await prepared(sql, params).all()
  return (results && results[0]) || null
}

export async function run(sql, params = []) {
  const result = await prepared(sql, params).run()
  const meta = result.meta || {}
  return {
    changes: Number(meta.changes ?? 0),
    // D1 trả về `last_row_id` (có gạch dưới); một số phiên bản trả `lastRowid`.
    lastInsertRowid: Number(meta.last_row_id ?? meta.lastRowid ?? 0),
  }
}

/** D1 không có transaction tường minh → chạy tuần tự (an toàn nhờ điều kiện UPDATE). */
export async function tx(fn) {
  return fn()
}

export default { setBinding, getBinding, init, close, all, one, run, tx }
