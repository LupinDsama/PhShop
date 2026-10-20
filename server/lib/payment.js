/**
 * Payment provider abstraction.
 *
 * QUY TẮC: KHÔNG BAO GIỜ giả lập thanh toán thành công.
 * - COD: trạng thái UNPAID cho tới khi admin xác nhận đã thu tiền.
 * - MOMO/BANK_TRANSFER: chỉ hoạt động khi có credentials thật (biến môi trường).
 *   Nếu chưa cấu hình, API trả lỗi rõ ràng và gợi ý dùng COD.
 */
import config from '../config.js'

export const PAYMENT_METHODS = {
  COD: 'COD',
  MOMO: 'MOMO',
  BANK_TRANSFER: 'BANK_TRANSFER',
}

export function providerConfigured(provider) {
  if (provider === 'COD') return true
  if (provider === 'MOMO') return !!process.env.PHSHOP_MOMO_API_KEY
  if (provider === 'BANK_TRANSFER') return !!process.env.PHSHOP_BANK_TRANSFER_API_KEY
  return false
}

/**
 * Tạo payment intent cho đơn hàng.
 * @returns {{provider:string,status:string,checkoutUrl:string|null,instructions:string}}
 */
export function createPaymentIntent({ method }) {
  if (method === 'COD') {
    return {
      provider: 'COD',
      status: 'UNPAID',
      checkoutUrl: null,
      instructions: 'Thanh toán khi nhận hàng. Đơn sẽ ở trạng thái chờ thanh toán tới khi nhân viên xác nhận.',
    }
  }
  if (!providerConfigured(method)) {
    const err = new Error(
      `Cổng thanh toán ${method} chưa được cấu hình. Vui lòng chọn COD hoặc liên hệ hỗ trợ để thanh toán thủ công.`,
    )
    err.code = 'payment_provider_not_configured'
    throw err
  }
  // Cần tích hợp SDK chính thức + credentials thật (ghi nhận blocker trong docs).
  const err = new Error('Cổng thanh toán chưa được tích hợp đầy đủ trong môi trường này.')
  err.code = 'payment_provider_not_implemented'
  throw err
}

export function paymentSummary(method) {
  const methods = {
    COD: 'Thanh toán khi nhận hàng (COD)',
    MOMO: 'Ví MoMo',
    BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  }
  return methods[method] || method
}

export const paymentMode = () => (config.isProd ? 'production' : 'development')
