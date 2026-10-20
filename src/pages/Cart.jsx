import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../data/products'
import { ShoppingCart, Mail, Phone, Truck, ArrowRight, Trash2, Plus, Minus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

function ShieldCheckIcon({ size = 20, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export default function Cart() {
  const { items, removeItem, updateQuantity, updateNote, total, count, clearCart } = useCartStore()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (count === 0) {
    return (
      <div className="section">
        <div className="container-page">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ShoppingCart size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-8">Hãy chọn sản phẩm bạn thích và thêm vào giỏ hàng.</p>
            <Link to="/products" className="inline-flex items-center gap-2 text-brand-600 font-medium">
              Duyệt sản phẩm <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Giỏ hàng ({count})</h2>
            <div className="space-y-4">
              {items.map((item) => {
                const v = item.variant
                return (
                  <Card key={item.variantId} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src={v.images?.[0] || 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=400&q=80'} alt={v.name || 'Product'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-900">{v.name || 'Sản phẩm'}</h3>
                        <p className="text-sm text-gray-500">{v.color} • {v.size}</p>
                        {item.note && (
                          <p className="text-xs text-brand-600 mt-1">Ghi chú: {item.note}</p>
                        )}
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-lg font-bold text-brand-600">{formatPrice(v.price * item.quantity)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                            <Minus size={16} />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button variant="outline" size="sm" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
                            <Plus size={16} />
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.variantId)} className="text-red-500 hover:bg-red-50">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Ghi chú..."
                        value={item.note || ''}
                        onChange={(e) => updateNote(item.variantId, e.target.value)}
                        className="flex-grow"
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
            <Button onClick={clearCart} variant="outline" className="w-full">
              Xóa toàn bộ giỏ hàng
            </Button>
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tạm tính</span>
                  <span className="font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phí vận chuyển</span>
                  <span className="font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold text-gray-900">Tổng cộng</span>
                  <span className="font-bold text-brand-600">{formatPrice(total)}</span>
                </div>
              </div>
              {isAuthenticated ? (
                <Button onClick={() => navigate('/checkout')} className="w-full py-3 text-lg font-bold shadow-lg">
                  Tiến hành thanh toán
                </Button>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3 text-center">
                    Bạn cần đăng nhập trước khi thanh toán.
                  </p>
                  <Button onClick={() => navigate('/login')} className="w-full py-3 text-lg font-bold shadow-lg">
                    Đăng nhập & thanh toán
                  </Button>
                </>
              )}
            </Card>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Truck size={16} className="text-brand-600" />
                <span>Giao hàng miễn phí trên toàn quốc</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ShieldCheckIcon size={16} className="text-brand-600" />
                <span>Thanh toán an toàn, bảo mật thông tin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
