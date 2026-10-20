/**
 * Kết nối SQLite (node:sqlite) + migration schema idempotent.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import config from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let db = null

export function getDb() {
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

/** Chạy một hàm trong transaction. Tự rollback khi có lỗi. */
export function tx(fn) {
  const database = getDb()
  database.exec('BEGIN IMMEDIATE')
  try {
    const result = fn(database)
    database.exec('COMMIT')
    return result
  } catch (err) {
    try { database.exec('ROLLBACK') } catch { /* ignore */ }
    throw err
  }
}

export function all(sql, params = []) {
  return getDb().prepare(sql).all(...params)
}

export function one(sql, params = []) {
  return getDb().prepare(sql).get(...params) ?? null
}

export function run(sql, params = []) {
  return getDb().prepare(sql).run(...params)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

export default { getDb, tx, all, one, run, closeDb }
