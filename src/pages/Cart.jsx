import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import { ShoppingCart, Truck, Trash2, Plus, Minus, AlertCircle, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States'

export default function Cart() {
  const {
    items, count, subtotal, total, loading, error, loaded,
    fetchCart, updateItem, removeItem, clearCart,
  } = useCartStore()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    fetchCart().catch(() => {})
  }, [fetchCart])

  const handleQuantity = async (item, next) => {
    setBusyId(item.id)
    setActionError(null)
    try {
      await updateItem(item.id, { quantity: next })
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleNote = async (item, note) => {
    try {
      await updateItem(item.id, { note })
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRemove = async (item) => {
    setBusyId(item.id)
    setActionError(null)
    try {
      await removeItem(item.id)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleClear = async () => {
    setActionError(null)
    try {
      await clearCart()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading && !loaded) {
    return (
      <div className="section">
        <div className="container-page"><LoadingState label="Đang tải giỏ hàng..." /></div>
      </div>
    )
  }

  if (!loaded && error) {
    return (
      <div className="section">
        <div className="container-page"><ErrorState message={error} onRetry={() => fetchCart()} /></div>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="section">
        <div className="container-page">
          <EmptyState
            icon={ShoppingCart}
            title="Giỏ hàng trống"
            description="Hãy chọn sản phẩm bạn thích và thêm vào giỏ hàng."
            action={
              <Link to="/products" className="inline-flex items-center gap-2 text-brand-600 font-medium">
                Duyệt sản phẩm <ArrowRight size={18} />
              </Link>
            }
          />
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

            {actionError && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    <Link to={`/products/${item.slug}`} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.images?.[0] && (
                        <img src={item.images[0]} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </Link>
                    <div className="flex-grow min-w-0">
                      <Link to={`/products/${item.slug}`} className="font-semibold text-gray-900 hover:text-brand-600">
                        {item.name}
                      </Link>
                      <p className="text-sm text-gray-500">{item.color} • {item.size} • SKU {item.sku}</p>
                      {item.issues?.map((issue) => (
                        <p key={issue} className="text-xs text-red-600 mt-1">{issue}</p>
                      ))}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-bold text-brand-600">{formatPrice(item.lineTotal)}</span>
                        <span className="text-xs text-gray-400">{formatPrice(item.price)} / sản phẩm</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => handleQuantity(item, item.quantity - 1)}
                          aria-label="Giảm số lượng"
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === item.id || item.quantity >= Math.min(item.maxQty, item.stock)}
                          onClick={() => handleQuantity(item, item.quantity + 1)}
                          aria-label="Tăng số lượng"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => handleRemove(item)}
                        className="text-red-500 hover:bg-red-50"
                        aria-label="Xoá sản phẩm khỏi giỏ"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Ghi chú cho sản phẩm này..."
                      maxLength={500}
                      defaultValue={item.note || ''}
                      onBlur={(e) => { if (e.target.value !== (item.note || '')) handleNote(item, e.target.value) }}
                      className="flex-grow"
                    />
                  </div>
                </Card>
              ))}
            </div>
            <Button onClick={handleClear} variant="outline" className="w-full">
              Xóa toàn bộ giỏ hàng
            </Button>
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tạm tính</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phí vận chuyển</span>
                  <span className="font-medium">{items.length ? 'Miễn phí' : '—'}</span>
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
                  <p className="text-xs text-gray-500 mb-3 text-center">Bạn cần đăng nhập trước khi thanh toán.</p>
                  <Button onClick={() => navigate('/login', { state: { from: '/checkout' } })} className="w-full py-3 text-lg font-bold shadow-lg">
                    Đăng nhập & thanh toán
                  </Button>
                </>
              )}
            </Card>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Truck size={16} className="text-brand-600" />
                <span>Giao hàng miễn phí toàn quốc</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ShieldIcon />
                <span>Thanh toán an toàn, bảo mật thông tin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShieldIcon({ size = 16, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
