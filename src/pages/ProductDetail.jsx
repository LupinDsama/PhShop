import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useWishlistStore } from '../store/wishlist'
import { products, formatPrice } from '../data/products'
import { ChevronLeft, Mail, Phone, Truck, ShieldCheck, CheckCircle2, Heart, Star } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.slug === slug)
  const { addItem } = useCartStore()
  const { toggleItem, isInWishlist } = useWishlistStore()
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)

  if (!product) return <div className="section container-page">Không tìm thấy sản phẩm.</div>

  const currentVariant = selectedVariant || product.variants[0]
  const isWishlisted = isInWishlist(product.id)

  return (
    <div className="section">
      <div className="container-page">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 mb-6">
          <ChevronLeft size={16} /> Quay lại sản phẩm
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative group">
              <img
                src={product.images[0]}
                alt={product.name}
                className="rounded-2xl overflow-hidden border border-dark-100 shadow-sm w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-brand-600">
                  <Star size={20} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {product.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={product.name}
                  className="rounded-xl border border-dark-100 shadow-sm w-full h-32 object-cover cursor-pointer hover:border-brand-300 transition"
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-xs text-dark-400">•</span>
                <span className="text-xs text-dark-400">Mã: {currentVariant.sku}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className={`text-amber-400 ${i < 4 ? 'fill-amber-400' : 'text-dark-200'}`} />
                ))}
                <span className="text-sm text-dark-500 ml-1">4.8 (128 đánh giá)</span>
              </div>
              <p className="text-dark-500 mb-6 leading-relaxed">{product.description}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-brand-600">
                  {formatPrice(currentVariant.price)}
                </span>
                {currentVariant.price !== product.base_price && (
                  <span className="text-sm text-dark-400 line-through">{formatPrice(product.base_price)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-dark-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                  <span>Còn hàng: {currentVariant.stock}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Chọn biến thể
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        selectedVariant?.id === v.id
                          ? 'border-brand-600 bg-brand-50 text-brand-600 shadow-sm'
                          : 'border-dark-200 bg-white text-dark-600 hover:border-dark-300'
                      }`}
                    >
                      {v.color} • {v.size}
                      <span className="block text-xs text-dark-400 mt-1">{formatPrice(v.price)}</span>
                      {v.stock === 0 && <span className="text-xs text-red-500 mt-1">Hết hàng</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Số lượng
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Button variant="outline" size="sm" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                    −
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center"
                  />
                  <Button variant="outline" size="sm" disabled={quantity >= currentVariant.stock || currentVariant.stock === 0} onClick={() => setQuantity((q) => q + 1)}>
                    +
                  </Button>
                </div>
                {currentVariant.stock === 0 && <p className="text-xs text-red-500 mt-1">Sản phẩm tạm hết hàng</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <Input
                  placeholder="Ví dụ: đóng gói quà tặng..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-dark-100">
              <Button
                onClick={() => {
                  if (!currentVariant || currentVariant.stock === 0) return
                  addItem(currentVariant, quantity, note)
                  setAdded(true)
                  setTimeout(() => setAdded(false), 2500)
                }}
                className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-brand-500/20 transition disabled:opacity-50 disabled:pointer-events-none"
                disabled={currentVariant.stock === 0}
              >
                {added ? 'Đã thêm vào giỏ!' : currentVariant.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/cart')}
                className="w-full py-4 text-lg font-bold mt-3"
              >
                Xem giỏ hàng
              </Button>
              <button
                onClick={() => toggleItem(product)}
                className="w-full py-3 rounded-xl border border-dark-200 bg-white text-dark-600 font-medium hover:bg-brand-50 hover:border-brand-300 transition flex items-center justify-center gap-2"
              >
                <Heart size={18} className={`${isWishlisted ? 'fill-brand-600 text-brand-600' : 'text-dark-500'}`} />
                {isWishlisted ? 'Đã lưu yêu thích' : 'Lưu vào yêu thích'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-dark-500 mt-6">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-brand-600" />
                <span>Giao hàng nhanh</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-600" />
                <span>Thanh toán an toàn</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-600" />
                <span>Hoàn tiền 14 ngày</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Reviews */}
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-brand-600 rounded-full"></div>
            <h3 className="text-lg font-bold text-dark-900">Mô tả chi tiết</h3>
          </div>
          <div className="rounded-2xl border border-dark-100 bg-white p-8 mb-12">
            <p className="text-dark-600 leading-relaxed">
              {product.name} là sản phẩm in 3D được sản xuất với độ phân giải cao,
              chi tiết sắc nét, phù hợp cho sưu tầm, trang trí hoặc quà tặng ý nghĩa.
              Bạn có thể chọn màu sắc, kích thước và thêm ghi chú riêng khi đặt hàng.
              Lưu ý: một số sản phẩm sản xuất theo đơn, thời gian hoàn thành có thể
              khác nhau tùy vào năng lực sản xuất.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-brand-600 rounded-full"></div>
            <h3 className="text-lg font-bold text-dark-900">Đánh giá khách hàng</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-dark-100 flex items-center justify-center overflow-hidden">
                    <span className="text-xs font-medium text-dark-600">KH</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-900">Khách hàng {i}</div>
                    <div className="flex gap-1 text-xs text-amber-400">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={14} className="fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-dark-600 leading-relaxed">
                  "Sản phẩm rất đẹp, chi tiết sắc nét, giao hàng nhanh. Sẽ mua thêm lần sau!"
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Related products */}
        <div className="mt-16">
          <h3 className="text-xl font-bold text-dark-900 mb-6">Sản phẩm tương tự</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4).map((p) => (
              <Card key={p.id} className="cursor-pointer group" onClick={() => navigate(`/products/${p.slug}`)}>
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100 relative">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-brand-600">{formatPrice(p.base_price)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
