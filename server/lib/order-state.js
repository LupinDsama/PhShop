/**
 * State machine trạng thái đơn hàng.
 * Mọi thay đổi trạng thái đều phải đi qua đây — không có chỗ nào được set status trực tiếp.
 */

export const ORDER_STATUS = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
}

export const ORDER_STATUSES = Object.keys(ORDER_STATUS)

export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
}

export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS)

export const STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang sản xuất',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURN_REQUESTED: 'Yêu cầu trả hàng',
  RETURNED: 'Đã trả hàng',
  REFUND_PENDING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
}

export const PAYMENT_LABELS = {
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Đang chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
}

/** Transition hợp lệ của trạng thái đơn (không phụ thuộc vai trò). */
export const ORDER_TRANSITIONS = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
}

/** Transition hợp lệ của trạng thái thanh toán. */
export const PAYMENT_TRANSITIONS = {
  UNPAID: ['PENDING', 'PAID', 'FAILED'],
  PENDING: ['PAID', 'FAILED', 'UNPAID'],
  PAID: ['REFUNDED'],
  FAILED: ['PENDING', 'PAID', 'UNPAID'],
  REFUNDED: [],
}

/** Trạng thái mà khách hàng được tự hủy. */
export const CUSTOMER_CANCELLABLE = ['PENDING_CONFIRMATION', 'CONFIRMED']

/** Trạng thái mà khách hàng được yêu cầu trả hàng. */
export const CUSTOMER_RETURNABLE = ['SHIPPED', 'DELIVERED']

export const ROLE_RANK = {
  CUSTOMER: 1,
  SUPPORT: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
}

export function isValidStatus(status) {
  return ORDER_STATUSES.includes(status)
}

export function isValidPaymentStatus(status) {
  return PAYMENT_STATUSES.includes(status)
}

export function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false
  return (ORDER_TRANSITIONS[from] || []).includes(to)
}

export function canTransitionPayment(from, to) {
  if (!isValidPaymentStatus(from) || !isValidPaymentStatus(to)) return false
  return (PAYMENT_TRANSITIONS[from] || []).includes(to)
}

/**
 * Kiểm tra quyền thực hiện transition.
 * @param {string} from trạng thái hiện tại
 * @param {string} to trạng thái mới
 * @param {string} role vai trò người thực hiện
 * @param {boolean} isOwner người thực hiện có sở hữu đơn hay không
 */
export function assertTransition(from, to, role, isOwner = false) {
  if (!isValidStatus(to)) {
    return { ok: false, code: 'invalid_status', message: 'Trạng thái đơn hàng không hợp lệ.' }
  }
  if (from === to) {
    return { ok: false, code: 'no_change', message: 'Đơn hàng đang ở trạng thái này.' }
  }
  if (!canTransition(from, to)) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: `Không thể chuyển trạng thái từ "${STATUS_LABELS[from] || from}" sang "${STATUS_LABELS[to] || to}".`,
    }
  }
  const rank = ROLE_RANK[role] || 0
  if (role === 'CUSTOMER') {
    if (!isOwner) return { ok: false, code: 'forbidden', message: 'Bạn không sở hữu đơn hàng này.' }
    if (to === 'CANCELLED') {
      if (!CUSTOMER_CANCELLABLE.includes(from)) {
        return { ok: false, code: 'invalid_transition', message: 'Đơn hàng đã bắt đầu xử lý, không thể tự hủy.' }
      }
      return { ok: true }
    }
    if (to === 'RETURN_REQUESTED') {
      if (!CUSTOMER_RETURNABLE.includes(from)) {
        return { ok: false, code: 'invalid_transition', message: 'Chỉ có thể yêu cầu trả hàng khi đơn đã được giao.' }
      }
      return { ok: true }
    }
    return { ok: false, code: 'forbidden', message: 'Khách hàng không được tự thay đổi trạng thái này.' }
  }
  if (rank < ROLE_RANK.SUPPORT) {
    return { ok: false, code: 'forbidden', message: 'Bạn không có quyền thay đổi trạng thái đơn hàng.' }
  }
  if (role === 'SUPPORT') {
    const allowedForSupport = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED']
    if (!allowedForSupport.includes(to)) {
      return { ok: false, code: 'forbidden', message: 'Vai trò hỗ trợ không được thực hiện thao tác này.' }
    }
  }
  return { ok: true }
}

/** Transition trạng thái thanh toán theo vai trò. */
export function assertPaymentTransition(from, to, role) {
  if (!isValidPaymentStatus(to)) {
    return { ok: false, code: 'invalid_payment_status', message: 'Trạng thái thanh toán không hợp lệ.' }
  }
  if (from === to) return { ok: false, code: 'no_change', message: 'Trạng thái thanh toán không thay đổi.' }
  if (!canTransitionPayment(from, to)) {
    return { ok: false, code: 'invalid_transition', message: 'Không thể chuyển trạng thái thanh toán như vậy.' }
  }
  const rank = ROLE_RANK[role] || 0
  if (rank < ROLE_RANK.ADMIN) {
    return { ok: false, code: 'forbidden', message: 'Chỉ quản trị mới cập nhật được trạng thái thanh toán.' }
  }
  if (to === 'PAID' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return { ok: false, code: 'forbidden', message: 'Không đủ quyền.' }
  }
  return { ok: true }
}

/** Thứ tự tiến trình hiển thị trên UI khách hàng. */
export const CUSTOMER_PROGRESS = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]

export const PROGRESS_STEP = {
  PENDING_CONFIRMATION: 20,
  CONFIRMED: 45,
  PROCESSING: 70,
  SHIPPED: 90,
  DELIVERED: 100,
  CANCELLED: 0,
  RETURN_REQUESTED: 90,
  RETURNED: 95,
  REFUND_PENDING: 98,
  REFUNDED: 100,
}
