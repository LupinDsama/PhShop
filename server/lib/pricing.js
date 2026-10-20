/**
 * Tính toán giá server-side. Hàm thuần (pure) để unit test được.
 * Client KHÔNG được gửi giá lên; mọi thứ tính lại từ DB.
 */
import config from '../config.js'

/**
 * @param {Array<{unitPrice:number, quantity:number}>} lines
 * @param {{type:string,value:number,min_order:number,max_discount:number}|null} coupon
 * @param {{shippingFee?:number, freeShippingThreshold?:number}} opts
 */
export function computeTotals(lines, coupon, opts = {}) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  let discount = 0
  let shippingFee = opts.shippingFee ?? config.shippingFee
  const freeThreshold = opts.freeShippingThreshold ?? config.freeShippingThreshold

  if (coupon && subtotal >= (coupon.min_order || 0)) {
    if (coupon.type === 'percent') {
      discount = Math.floor((subtotal * coupon.value) / 100)
      if (coupon.max_discount > 0) discount = Math.min(discount, coupon.max_discount)
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, subtotal)
    } else if (coupon.type === 'free_shipping') {
      shippingFee = 0
    }
  }

  discount = Math.max(0, Math.min(discount, subtotal))
  const afterDiscount = subtotal - discount
  if (freeThreshold > 0 && afterDiscount >= freeThreshold) shippingFee = 0

  const total = Math.max(0, afterDiscount + shippingFee)
  return { subtotal, discount, shippingFee, total }
}

/**
 * Parse ngày theo UTC cho nhất quán với định dạng timestamp của SQLite.
 * - 'YYYY-MM-DD'            → UTC nửa đêm
 * - 'YYYY-MM-DD HH:MM:SS'   → UTC
 * - ISO string              → theo chuẩn
 */
export function parseDate(value) {
  if (!value) return null
  const str = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(`${str}T00:00:00Z`)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return new Date(`${str.replace(' ', 'T')}Z`)
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Kiểm tra coupon có hợp lệ ở thời điểm hiện tại không. */
export function isCouponUsable(coupon, now = new Date()) {
  if (!coupon) return false
  if (!coupon.active) return false
  const startsAt = parseDate(coupon.starts_at)
  const endsAt = parseDate(coupon.ends_at)
  if (startsAt && startsAt.getTime() > now.getTime()) return false
  if (endsAt && endsAt.getTime() < now.getTime()) return false
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return false
  return true
}

/** Kiểm tra coupon theo giá trị đơn hàng. */
export function checkCoupon(coupon, subtotal, now = new Date()) {
  if (!isCouponUsable(coupon, now)) {
    return { ok: false, message: 'Mã giảm giá không còn hiệu lực.' }
  }
  if (subtotal < (coupon.min_order || 0)) {
    return { ok: false, message: `Đơn hàng tối thiểu ${coupon.min_order}đ để dùng mã này.` }
  }
  return { ok: true }
}

/** Làm tròn về số nguyên dương, chống số âm / NaN. */
export function safeQuantity(value, { min = 1, max = 99 } = {}) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return min
  if (n < min) return min
  if (n > max) return max
  return n
}
