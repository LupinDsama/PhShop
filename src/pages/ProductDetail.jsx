import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useWishlistStore } from '../store/wishlist'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { formatPrice } from '../lib/format'
import { ChevronLeft, Truck, ShieldCheck, CheckCircle2, Heart, Star, Package, Clock, AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingState, ErrorState } from '../components/ui/States'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const wishlistItems = useWishlistStore((s) => s.items)
  const wishlistApi = useWishlistStore.getState

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/products/${encodeURIComponent(slug)}`)
      setData(result)
      const firstAvailable = result.product.variants.find((v) => v.inStock) || result.product.variants[0]
      setSelectedVariantId(firstAvailable?.id || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  const product = data?.product
  const variants = product?.variants || []
  const currentVariant = variants.find((v) => v.id === selectedVariantId) || variants[0]
  const isWishlisted = wishlistItems.some((i) => i.productId === product?.id)
  const maxQty = currentVariant ? Math.min(currentVariant.maxQty, currentVariant.stock) : 1
  const inCart = cartItems.find((i) => i.variantId === currentVariant?.id)

  const handleAddToCart = async () => {
    if (!currentVariant || currentVariant.stock === 0) return
    setBusy(true)
    setFeedback(null)
    try {
      await addItem(currentVariant.id, quantity, note.trim())
      setFeedback({ type: 'success', message: `Đã thêm ${quantity} sản phẩm vào giỏ hàng.` })
      setQuantity(1)
      setNote('')
    } catch (err) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${slug}` } })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const added = await wishlistApi().toggleItem({ id: product.id })
      setFeedback({
        type: 'success',
        message: added ? 'Đã lưu vào danh sách yêu thích.' : 'Đã xoá khỏi danh sách yêu thích.',
      })
    } catch (err) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="section">
        <div className="container-page"><LoadingState label="Đang tải thông tin sản phẩm..." /></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="section">
        <div className="container-page">
          <ErrorState message={error || 'Không tìm thấy sản phẩm.'} onRetry={load} />
          <div className="text-center">
            <Link to="/products" className="text-brand-600 font-medium hover:underline">← Quay lại danh sách sản phẩm</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container-page">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 mb-6">
          <ChevronLeft size={16} /> Quay lại sản phẩm
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-square flex items-center justify-center text-gray-400 text-sm">Chưa có ảnh</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-3 gap-3">
                {product.images.slice(1).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${product.name} - ảnh ${i + 2}`}
                    loading="lazy"
                    className="rounded-xl border border-gray-200 shadow-sm w-full h-32 object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">{product.category}</span>
                {currentVariant && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">Mã: {currentVariant.sku}</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className={`text-amber-400 ${i < 4 ? 'fill-amber-400' : 'text-gray-200'}`} />
                ))}
                <span className="text-sm text-gray-500 ml-1">4.8 ({data.reviews?.length || 0} đánh giá)</span>
              </div>
              <p className="text-gray-500 mb-6 leading-relaxed">{product.description}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-brand-600">{formatPrice(currentVariant?.price || product.basePrice)}</span>
                {currentVariant && currentVariant.price !== product.basePrice && (
                  <span className="text-sm text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${currentVariant?.stock > 0 ? 'bg-brand-500' : 'bg-red-500'}`} />
                  {currentVariant?.stock > 0 ? `Còn hàng: ${currentVariant.stock}` : 'Tạm hết hàng'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-brand-600" />
                  Sản xuất trong ~{product.productionDays} ngày
                </span>
              </div>
            </div>

            {feedback && (
              <div
                role="status"
                className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                  feedback.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {feedback.type === 'success'
                  ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn biến thể</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setSelectedVariantId(v.id); setQuantity(1) }}
                      aria-pressed={selectedVariantId === v.id}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left ${
                        selectedVariantId === v.id
                          ? 'border-brand-600 bg-brand-50 text-brand-600 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      } ${v.stock === 0 ? 'opacity-60' : ''}`}
                    >
                      {v.color} • {v.size}
                      <span className="block text-xs text-gray-400 mt-1">{formatPrice(v.price)}</span>
                      {v.stock === 0 && <span className="text-xs text-red-500 mt-1">Hết hàng</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="qty" className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Button variant="outline" size="sm" disabled={quantity <= 1 || busy} onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm số lượng">
                    −
                  </Button>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10)
                      setQuantity(Number.isFinite(n) ? Math.min(Math.max(1, n), Math.max(1, maxQty)) : 1)
                    }}
                    className="w-16 text-center"
                  />
                  <Button variant="outline" size="sm" disabled={quantity >= maxQty || busy} onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} aria-label="Tăng số lượng">
                    +
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Tối đa {maxQty} sản phẩm cho biến thể này.</p>
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
                <Input
                  id="note"
                  placeholder="Ví dụ: đóng gói quà tặng..."
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full py-4 text-lg font-bold shadow-lg"
                disabled={!currentVariant || currentVariant.stock === 0 || busy}
              >
                {busy ? 'Đang xử lý...' : currentVariant?.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/cart')} className="w-full py-4 text-lg font-bold">
                Xem giỏ hàng {inCart ? `(${inCart.quantity})` : ''}
              </Button>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={busy}
                className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-brand-50 hover:border-brand-300 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Heart size={18} className={`${isWishlisted ? 'fill-brand-600 text-brand-600' : 'text-gray-500'}`} />
                {isWishlisted ? 'Đã lưu yêu thích' : 'Lưu vào yêu thích'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-gray-500 mt-6">
              <div className="flex items-center gap-2"><Truck size={14} className="text-brand-600" /><span>Giao hàng nhanh</span></div>
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-brand-600" /><span>Thanh toán an toàn</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-600" /><span>Hoàn tiền 14 ngày</span></div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-brand-600 rounded-full" />
            <h3 className="text-lg font-bold text-gray-900">Mô tả chi tiết</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8 mb-12">
            <p className="text-gray-600 leading-relaxed">
              {product.name} là sản phẩm in 3D được sản xuất với độ phân giải cao, chi tiết sắc nét,
              phù hợp cho sưu tầm, trang trí hoặc quà tặng ý nghĩa. Bạn có thể chọn màu sắc, kích thước
              và thêm ghi chú riêng khi đặt hàng. Thời gian sản xuất dự kiến khoảng {product.productionDays} ngày.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-brand-600 rounded-full" />
            <h3 className="text-lg font-bold text-gray-900">Đánh giá khách hàng</h3>
          </div>
          {data.reviews?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.reviews.slice(0, 3).map((r) => (
                <Card key={r.id} className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">{r.author?.[0]?.toUpperCase() || 'K'}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{r.author}</div>
                      <div className="flex gap-1 text-xs text-amber-400">
                        {[...Array(r.rating)].map((_, j) => <Star key={j} size={14} className="fill-amber-400" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyReviews />
          )}
        </div>

        {data.related?.length > 0 && (
          <div className="mt-16">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Sản phẩm tương tự</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.related.map((p) => (
                <Link key={p.id} to={`/products/${p.slug}`} className="block group">
                  <Card className="h-full">
                    <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-gray-100">
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition line-clamp-2">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-brand-600">{formatPrice(p.basePrice)}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyReviews() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
      <Package size={28} className="mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
    </div>
  )
}
