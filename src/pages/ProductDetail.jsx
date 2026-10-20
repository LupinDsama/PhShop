import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { products, formatPrice } from '../data/products'
import { ChevronLeft, Mail, Phone, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.slug === slug)
  const { addItem } = useCartStore()
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)

  if (!product) return <div className="section container-page">Không tìm thấy sản phẩm.</div>

  return (
    <div className="section">
      <div className="container-page">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 mb-6">
          <ChevronLeft size={16} /> Quay lại sản phẩm
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <img src={product.images[0]} alt={product.name} className="rounded-2xl overflow-hidden border border-dark-100 shadow-sm w-full h-auto" />
            {product.images.slice(1).map((img, i) => (
              <img key={i} src={img} alt={product.name} className="rounded-xl border border-dark-100 shadow-sm w-full h-auto" />
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                {product.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2">{product.name}</h1>
              <p className="text-dark-500 mb-4">{product.description}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-brand-600">
                  {formatPrice(product.base_price)}
                </span>
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
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        selectedVariant?.id === v.id
                          ? 'border-brand-600 bg-brand-50 text-brand-600 shadow-sm'
                          : 'border-dark-200 bg-white text-dark-600 hover:border-dark-300'
                      }`}
                    >
                      {v.color} • {v.size} • {formatPrice(v.price)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Số lượng
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                    −
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center"
                  />
                  <Button variant="outline" size="sm" onClick={() => setQuantity((q) => q + 1)}>
                    +
                  </Button>
                </div>
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

            <div className="pt-4 border-t border-dark-100">
              <Button
                onClick={() => {
                  if (!selectedVariant) return alert('Vui lòng chọn biến thể')
                  addItem(selectedVariant, quantity, note)
                  setAdded(true)
                  setTimeout(() => setAdded(false), 2000)
                }}
                className="w-full py-3 text-lg font-bold shadow-lg hover:shadow-brand-500/20 transition"
                disabled={added}
              >
                {added ? 'Đã thêm vào giỏ!' : 'Thêm vào giỏ hàng'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/cart')}
                className="w-full py-3 text-lg font-bold mt-3"
              >
                Xem giỏ hàng
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-dark-500">
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

        <div className="mt-16 rounded-2xl border border-dark-100 bg-white p-8">
          <h3 className="text-lg font-bold text-dark-900 mb-6">Mô tả chi tiết</h3>
          <p className="text-dark-600 leading-relaxed">
            {product.name} là sản phẩm in 3D được sản xuất với độ phân giải cao,
            chi tiết sắc nét, phù hợp cho sưu tầm, trang trí hoặc quà tặng ý nghĩa.
            Bạn có thể chọn màu sắc, kích thước và thêm ghi chú riêng khi đặt hàng.
            Lưu ý: một số sản phẩm sản xuất theo đơn, thời gian hoàn thành có thể
            khác nhau tùy năng lực sản xuất.
          </p>
        </div>
      </div>
    </div>
  )
}
