import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { formatPrice } from '../lib/format'
import { Truck, CreditCard, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/States'

export default function Checkout() {
  const { items, count, subtotal, total, loading, fetchCart } = useCartStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('info')
  const [form, setForm] = useState({
    recipient: '', phone: '', address: '', note: '', payment: 'COD', couponCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([
    { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', enabled: true },
  ])
  const [idempotencyKey, setIdempotencyKey] = useState(() => (
    globalThis.crypto?.randomUUID?.() || `key-${Date.now()}-${Math.random().toString(36).slice(2)}`
  ))

  useEffect(() => {
    fetchCart().catch(() => {})
    api.get('/api/meta').then((meta) => {
      if (meta?.paymentMethods) setPaymentMethods(meta.paymentMethods)
    }).catch(() => {})
  }, [fetchCart])

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        recipient: f.recipient || user.name || '',
        phone: f.phone || user.phone || '',
      }))
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        recipient: form.recipient.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        paymentMethod: form.payment,
      }
      if (form.couponCode.trim()) payload.couponCode = form.couponCode.trim()
      const data = await api.post('/api/orders', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      // Tạo key mới cho đơn tiếp theo (đơn mới cần key mới).
      setIdempotencyKey(globalThis.crypto?.randomUUID?.() || `key-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      navigate(`/order/${data.order.id}?placed=1`)
    } catch (err) {
      setError(err.message)
      if (err.status === 422 && Array.isArray(err.details?.items)) {
        // Server báo thiếu tồn kho → đồng bộ lại giỏ hàng
        fetchCart().catch(() => {})
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !items.length) {
    return (
      <div className="section">
        <div className="container-page"><LoadingState label="Đang tải thông tin thanh toán..." /></div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="section">
        <div className="container-page text-center py-16">
          <p className="text-gray-500 mb-6">Giỏ hàng của bạn đang trống.</p>
          <Link to="/products" className="text-brand-600 font-medium hover:underline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Xác nhận đơn hàng</h2>
          <Link to="/cart" className="text-sm text-dark-500 hover:text-brand-600">← Sửa giỏ hàng</Link>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 mb-6 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {step === 'info' ? (
              <>
                <Card>
                  <div className="p-6">
                    <h3 className="font-bold text-dark-900 mb-4">Thông tin giao hàng</h3>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('payment') }} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="co-recipient" className="block text-sm font-medium text-dark-700">Người nhận</label>
                        <Input id="co-recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required minLength={2} />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="co-phone" className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                        <Input id="co-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="co-address" className="block text-sm font-medium text-dark-700">Địa chỉ giao hàng</label>
                        <Input id="co-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required minLength={5} />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="co-note" className="block text-sm font-medium text-dark-700">Ghi chú đơn hàng (tùy chọn)</label>
                        <Input id="co-note" maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                      </div>
                      <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg">
                        Tiếp tục thanh toán <ArrowRight size={20} />
                      </Button>
                    </form>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="font-bold text-dark-900 mb-4">Sản phẩm trong đơn</h3>
                    <div className="space-y-3">
                      {items.map((i) => (
                        <div key={i.id} className="flex gap-3 items-start">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-100 flex-shrink-0">
                            {i.images?.[0] && <img src={i.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between gap-2">
                              <span className="text-sm font-medium text-dark-900">{i.name}</span>
                              <span className="text-sm text-dark-500">x{i.quantity}</span>
                            </div>
                            <div className="text-xs text-dark-500">{i.color} • {i.size}</div>
                            {i.note && <div className="text-xs text-brand-600 mt-0.5">Ghi chú: {i.note}</div>}
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm font-bold text-brand-600">{formatPrice(i.lineTotal)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <div className="p-6">
                    <h3 className="font-bold text-dark-900 mb-4">Phương thức thanh toán</h3>
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.value}
                          className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition ${
                            form.payment === method.value ? 'border-brand-500 bg-brand-50' : 'border-dark-200 hover:border-brand-200'
                          } ${method.enabled ? '' : 'opacity-50 cursor-not-allowed'}`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={method.value}
                            checked={form.payment === method.value}
                            disabled={!method.enabled}
                            onChange={() => setForm({ ...form, payment: method.value })}
                            className="accent-brand-600"
                          />
                          <span className="text-sm font-medium text-dark-700">{method.label}</span>
                          {!method.enabled && (
                            <span className="text-xs text-dark-400">(chưa cấu hình)</span>
                          )}
                        </label>
                      ))}
                      <div className="space-y-2 pt-2">
                        <label htmlFor="co-coupon" className="block text-sm font-medium text-dark-700">Mã giảm giá (tùy chọn)</label>
                        <Input
                          id="co-coupon"
                          value={form.couponCode}
                          onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                          placeholder="PHSHOP10"
                        />
                      </div>
                      <div className="text-xs text-dark-400">
                        Trạng thái thanh toán chỉ được cập nhật từ nguồn tin cậy phía server sau khi xác nhận giao dịch.
                      </div>
                      <Button onClick={handleSubmit} className="w-full py-3 text-lg font-bold shadow-lg mt-4" disabled={submitting}>
                        {submitting && <Loader2 size={18} className="mr-2 animate-spin" />}
                        {submitting ? 'Đang tạo đơn hàng...' : 'Xác nhận đặt hàng'}
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep('info')} className="w-1/2">
                    Quay lại thông tin
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-4">
            <Card className="sticky top-24 p-6">
              <h3 className="font-bold text-dark-900 mb-6">Tóm tắt thanh toán</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Tạm tính</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Phí vận chuyển</span>
                  <span className="font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold text-dark-900">Tổng thanh toán</span>
                  <span className="font-bold text-brand-600 text-lg">{formatPrice(total)}</span>
                </div>
                <div className="text-xs text-dark-400">Số lượng: {count} sản phẩm</div>
              </div>
              <div className="space-y-2 text-sm text-dark-500">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-brand-600" />
                  <span>Giao hàng miễn phí</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-brand-600" />
                  <span>Thanh toán an toàn</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-brand-600" />
                  <span>Trạng thái đơn cập nhật trực tiếp</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
