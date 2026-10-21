/**
 * Dispatcher tầng database.
 *
 * Route code chỉ import từ đây nên không bị ràng buộc vào nền tảng:
 *  - Node server  → dùng adapter SQLite (./sqlite.js, node:sqlite)
 *  - Cloudflare   → dùng adapter D1 (./d1.js)
 *
 * Adapter được cấu hình 1 lần khi khởi động qua setAdapter().
 */
let adapter = null

export function setAdapter(next) {
  adapter = next
  return adapter
}

export function getAdapter() {
  if (!adapter) {
    throw new Error('Chưa cấu hình adapter database. Gọi setAdapter() khi khởi động.')
  }
  return adapter
}

export async function init() {
  return getAdapter().init?.()
}

export async function close() {
  return getAdapter().close?.()
}

export async function all(sql, params = []) {
  return getAdapter().all(sql, params)
}

export async function one(sql, params = []) {
  return getAdapter().one(sql, params)
}

export async function run(sql, params = []) {
  return getAdapter().run(sql, params)
}

export async function tx(fn) {
  return getAdapter().tx(fn)
}

export default { setAdapter, getAdapter, init, close, all, one, run, tx }

// Alias giữ tương thích
export const getDb = init
export const closeDb = close
