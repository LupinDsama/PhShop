import test from 'node:test'
import assert from 'node:assert/strict'
import { computeTotals, checkCoupon, safeQuantity } from '../../server/lib/pricing.js'

test('computeTotals: tính tổng không coupon', () => {
  const result = computeTotals([{ unitPrice: 250000, quantity: 2 }], null, { shippingFee: 0 })
  assert.equal(result.subtotal, 500000)
  assert.equal(result.discount, 0)
  assert.equal(result.shippingFee, 0)
  assert.equal(result.total, 500000)
})

test('computeTotals: coupon percent giới hạn max_discount', () => {
  const result = computeTotals(
    [{ unitPrice: 1000000, quantity: 1 }],
    { type: 'percent', value: 10, min_order: 0, max_discount: 50000 },
    { shippingFee: 0 },
  )
  assert.equal(result.discount, 50000)
  assert.equal(result.total, 950000)
})

test('computeTotals: coupon fixed không vượt quá subtotal', () => {
  const result = computeTotals(
    [{ unitPrice: 100000, quantity: 1 }],
    { type: 'fixed', value: 500000, min_order: 0, max_discount: 0 },
    { shippingFee: 0 },
  )
  assert.equal(result.discount, 100000)
  assert.equal(result.total, 0)
})

test('computeTotals: free_shipping và ngưỡng miễn phí vận chuyển', () => {
  const result = computeTotals(
    [{ unitPrice: 500000, quantity: 1 }],
    { type: 'free_shipping', value: 0, min_order: 0, max_discount: 0 },
    { shippingFee: 30000, freeShippingThreshold: 400000 },
  )
  assert.equal(result.shippingFee, 0)
  assert.equal(result.total, 500000)
})

test('computeTotals: giảm giá không được vượt quá subtotal', () => {
  const result = computeTotals(
    [{ unitPrice: 1000, quantity: 1 }],
    { type: 'percent', value: 200, min_order: 0, max_discount: 0 },
    { shippingFee: 0 },
  )
  assert.equal(result.discount, 1000)
  assert.equal(result.total, 0)
})

test('checkCoupon: từ chối coupon hết hạn / chưa tới hạn / quá đơn tối thiểu', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  assert.equal(checkCoupon({ active: 1, starts_at: '2026-01-02 00:00:00', min_order: 0 }, 100, now).ok, false)
  assert.equal(checkCoupon({ active: 1, ends_at: '2025-12-31 00:00:00', min_order: 0 }, 100, now).ok, false)
  assert.equal(checkCoupon({ active: 1, min_order: 500 }, 100, now).ok, false)
  assert.equal(checkCoupon({ active: 1, min_order: 100, usage_limit: 1, used_count: 1 }, 500, now).ok, false)
  assert.equal(checkCoupon({ active: 1, min_order: 100, usage_limit: 5, used_count: 1 }, 500, now).ok, true)
  assert.ok(now instanceof Date)
})

test('safeQuantity: chặn số âm, 0, NaN và giới hạn trên', () => {
  assert.equal(safeQuantity(-5), 1)
  assert.equal(safeQuantity(0), 1)
  assert.equal(safeQuantity('abc'), 1)
  assert.equal(safeQuantity(500, { max: 10 }), 10)
  assert.equal(safeQuantity('7'), 7)
})
