import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, hashToken, randomToken } from '../../server/lib/password.js'

test('hashPassword: băm và xác minh mật khẩu', async () => {
  const hash = await hashPassword('MatKhau@123')
  assert.ok(hash.startsWith('scrypt$'))
  assert.ok(!hash.includes('MatKhau@123'))
  assert.equal(await verifyPassword('MatKhau@123', hash), true)
  assert.equal(await verifyPassword('matkhau@123', hash), false)
})

test('hashPassword: salt ngẫu nhiên → hash khác nhau mỗi lần', async () => {
  const a = await hashPassword('same-password')
  const b = await hashPassword('same-password')
  assert.notEqual(a, b)
  assert.equal(await verifyPassword('same-password', a), true)
  assert.equal(await verifyPassword('same-password', b), true)
})

test('verifyPassword: hash hỏng hoặc rỗng trả về false, không throw', async () => {
  assert.equal(await verifyPassword('x', ''), false)
  assert.equal(await verifyPassword('x', 'not-a-hash'), false)
  assert.equal(await verifyPassword('x', 'scrypt$1$2$3$4$5'), false)
})

test('hashToken: xác định, không lưu token thô', () => {
  const token = randomToken(32)
  const hash = hashToken(token)
  assert.equal(hash.length, 64)
  assert.notEqual(hash, token)
  assert.equal(hashToken(token), hash)
})
