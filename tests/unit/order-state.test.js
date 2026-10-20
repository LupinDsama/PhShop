import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertTransition,
  assertPaymentTransition,
  canTransition,
  ORDER_TRANSITIONS,
  ORDER_STATUSES,
} from '../../server/lib/order-state.js'

test('state machine: các transition hợp lệ được cho phép', () => {
  assert.ok(canTransition('PENDING_CONFIRMATION', 'CONFIRMED'))
  assert.ok(canTransition('CONFIRMED', 'PROCESSING'))
  assert.ok(canTransition('PROCESSING', 'SHIPPED'))
  assert.ok(canTransition('SHIPPED', 'DELIVERED'))
  assert.ok(canTransition('SHIPPED', 'RETURN_REQUESTED'))
  assert.ok(canTransition('RETURN_REQUESTED', 'RETURNED'))
  assert.ok(canTransition('RETURNED', 'REFUND_PENDING'))
  assert.ok(canTransition('REFUND_PENDING', 'REFUNDED'))
  assert.ok(canTransition('PENDING_CONFIRMATION', 'CANCELLED'))
})

test('state machine: nhảy cóc trạng thái bị chặn', () => {
  assert.equal(canTransition('PENDING_CONFIRMATION', 'SHIPPED'), false)
  assert.equal(canTransition('PENDING_CONFIRMATION', 'DELIVERED'), false)
  assert.equal(canTransition('CANCELLED', 'CONFIRMED'), false)
  assert.equal(canTransition('REFUNDED', 'PROCESSING'), false)
  assert.equal(canTransition('DELIVERED', 'PROCESSING'), false)
})

test('state machine: mọi trạng thái đều có transition map', () => {
  for (const status of ORDER_STATUSES) {
    assert.ok(Array.isArray(ORDER_TRANSITIONS[status]), `thiếu transition cho ${status}`)
  }
})

test('assertTransition: khách chỉ được hủy đơn của chính mình ở trạng thái cho phép', () => {
  const okEarly = assertTransition('PENDING_CONFIRMATION', 'CANCELLED', 'CUSTOMER', true)
  assert.equal(okEarly.ok, true)

  const okConfirmed = assertTransition('CONFIRMED', 'CANCELLED', 'CUSTOMER', true)
  assert.equal(okConfirmed.ok, true)

  const tooLate = assertTransition('PROCESSING', 'CANCELLED', 'CUSTOMER', true)
  assert.equal(tooLate.ok, false)

  const notOwner = assertTransition('PENDING_CONFIRMATION', 'CANCELLED', 'CUSTOMER', false)
  assert.equal(notOwner.ok, false)

  const cannotConfirm = assertTransition('PENDING_CONFIRMATION', 'CONFIRMED', 'CUSTOMER', true)
  assert.equal(cannotConfirm.ok, false)
})

test('assertTransition: quyền theo vai trò', () => {
  assert.equal(assertTransition('PENDING_CONFIRMATION', 'CONFIRMED', 'SUPPORT', false).ok, true)
  assert.equal(assertTransition('PENDING_CONFIRMATION', 'CONFIRMED', 'ADMIN', false).ok, true)
  assert.equal(assertTransition('PENDING_CONFIRMATION', 'REFUNDED', 'ADMIN', false).ok, false)
  // SUPPORT không được chuyển sang REFUNDED
  assert.equal(assertTransition('REFUND_PENDING', 'REFUNDED', 'SUPPORT', false).ok, false)
  assert.equal(assertTransition('REFUND_PENDING', 'REFUNDED', 'ADMIN', false).ok, true)
})

test('assertPaymentTransition: chỉ admin được cập nhật thanh toán', () => {
  assert.equal(assertPaymentTransition('UNPAID', 'PAID', 'CUSTOMER').ok, false)
  assert.equal(assertPaymentTransition('UNPAID', 'PAID', 'SUPPORT').ok, false)
  assert.equal(assertPaymentTransition('UNPAID', 'PAID', 'ADMIN').ok, true)
  assert.equal(assertPaymentTransition('PAID', 'REFUNDED', 'ADMIN').ok, true)
  assert.equal(assertPaymentTransition('REFUNDED', 'PAID', 'ADMIN').ok, false)
})
