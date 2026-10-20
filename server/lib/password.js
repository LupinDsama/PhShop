/**
 * Băm mật khẩu bằng scrypt (node:crypto) + so khớp thời gian hằng số.
 * Không lưu mật khẩu dạng rõ, không log mật khẩu.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

const N = 16384
const r = 8
const p = 1
const KEYLEN = 64
const MAXMEM = 64 * 1024 * 1024

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r, p, maxmem: MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts
  try {
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    const derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: Number.parseInt(nStr, 10),
      r: Number.parseInt(rStr, 10),
      p: Number.parseInt(pStr, 10),
      maxmem: MAXMEM,
    })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token) {
  return sha256(token)
}

/** So sánh chuỗi không rò rỉ thời gian. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
