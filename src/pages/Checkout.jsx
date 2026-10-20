import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../data/products'
import { Mail, Phone, Truck, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('info')
  const [form, setForm] = useState({
    recipient: '', phone: '', address: '', note: '', payment: 'cod'
  })

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
    else if (items.length === 0) navigate('/cart')
  }, [isAuthenticated, items.length, navigate])

  if (!isAuthenticated || items.length === 0) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`Đơn hàng đã được đặt thành công!\nMã đơn: PH${Date.now().toString().slice(-6)}\nTổng: ${formatPrice(total)}`)
    clearCart()
    navigate('/order')
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Xác nhận đơn hàng</h2>
          <Link to="/cart" className="text-sm text-dark-500 hover:text-brand-600">← Sửa giỏ hàng</Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {step === 'info' ? (
              <>
                <Card>
                  <div className="p-6">
                    <h3 className="font-bold text-dark-900 mb-4">Thông tin giao hàng</h3>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('payment') }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-700">Người nhận</label>
                        <Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                        <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-700">Địa chỉ giao hàng</label>
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-700">Ghi chú đơn hàng (tùy chọn)</label>
                        <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
                        <div key={i.variantId} className="flex gap-3 items-start">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-100 flex-shrink-0">
                            <img src={i.variant.images?.[0] || 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=400&q=80'} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-dark-900">{i.variant.name || 'Sản phẩm'}</span>
                              <span className="text-sm text-dark-500">x{i.quantity}</span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm font-bold text-brand-600">{formatPrice(i.variant.price * i.quantity)}</span>
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
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dark-200 hover:border-brand-200 transition">
                        <input type="radio" name="payment" value="cod" defaultChecked className="accent-brand-600" onChange={() => setForm({ ...form, payment: 'cod' })} />
                        <span className="text-sm font-medium text-dark-700">Thanh toán khi nhận hàng (COD)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dark-200 hover:border-brand-200 transition">
                        <input type="radio" name="payment" value="momo" className="accent-brand-600" onChange={() => setForm({ ...form, payment: 'momo' })} />
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full border border-dark-300 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-brand-500" />
                          </div>
                          <span className="text-xs font-bold">MoMo</span>
                        </div>
                        <span className="text-sm font-medium text-dark-700">Ví MoMo</span>
                      </label>
                      <div className="text-xs text-dark-400 mt-2">
                        Lưu ý: Trạng thái thanh toán chỉ được cập nhật từ nguồn tin cậy phía server.
                      </div>
                      <Button onClick={handleSubmit} className="w-full py-3 text-lg font-bold shadow-lg mt-4">
                        Xác nhận đặt hàng
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
                  <span className="font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Phí vận chuyển</span>
                  <span className="font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold text-dark-900">Tổng thanh toán</span>
                  <span className="font-bold text-brand-600 text-lg">{formatPrice(total)}</span>
                </div>
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
                  <span>Email xác nhận đơn hàng</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
