export const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price) || 0)

export const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('vi-VN')
}

export const ORDER_STATUS_LABELS = {
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

export const PAYMENT_STATUS_LABELS = {
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Đang chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
}

export const ORDER_STATUS_BADGE = {
  PENDING_CONFIRMATION: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-700',
  RETURNED: 'bg-purple-100 text-purple-700',
  REFUND_PENDING: 'bg-yellow-100 text-yellow-700',
  REFUNDED: 'bg-green-100 text-green-700',
}

export const PAYMENT_STATUS_BADGE = {
  UNPAID: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
}

export const ORDER_PROGRESS = {
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

/** Trạng thái khách hàng được tự thực hiện. */
export const CUSTOMER_ACTIONS = {
  canCancel: (status) => status === 'PENDING_CONFIRMATION' || status === 'CONFIRMED',
  canReturn: (status) => status === 'SHIPPED' || status === 'DELIVERED',
}
