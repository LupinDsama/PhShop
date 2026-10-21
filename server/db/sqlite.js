/**
 * Adapter SQLite cho Node.js (node:sqlite).
 * Cùng interface với adapter D1 (./d1.js) để route code không phụ thuộc nền tảng.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import config from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let db = null

export function init() {
  if (db) return db
  const dir = path.dirname(config.dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  db = new DatabaseSync(config.dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)
  return db
}

export function close() {
  if (db) {
    db.close()
    db = null
  }
}

/** Đọc nhiều dòng. */
export async function all(sql, params = []) {
  return init().prepare(sql).all(...params)
}

/** Đọc một dòng (null nếu không có). */
export async function one(sql, params = []) {
  return init().prepare(sql).get(...params) ?? null
}

/** Chạy câu lệnh ghi. Trả về { changes, lastInsertRowid }. */
export async function run(sql, params = []) {
  const result = init().prepare(sql).run(...params)
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  }
}

/**
 * Transaction. Với SQLite file: BEGIN IMMEDIATE / COMMIT / ROLLBACK.
 * Với D1 (không có transaction tường minh) adapter tương ứng chạy tuần tự.
 */
export async function tx(fn) {
  const database = init()
  database.exec('BEGIN IMMEDIATE')
  try {
    const result = await fn()
    database.exec('COMMIT')
    return result
  } catch (err) {
    try { database.exec('ROLLBACK') } catch { /* ignore */ }
    throw err
  }
}

export default { init, close, all, one, run, tx }

// Tên alias để tương thích với code cũ và các script/test.
export const getDb = init
export const closeDb = close
