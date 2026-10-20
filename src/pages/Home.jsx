import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import api from '../lib/api'
import { formatPrice } from '../lib/format'
import { ArrowRight, Play, Monitor, ShieldCheck, Truck, Star, Clock } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const CATEGORY_IMAGES = {
  figure: 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=600&q=80',
  decor: 'https://images.unsplash.com/photo-1606893906813-f7d12e3c62ad?w=600&q=80',
  collectible: 'https://images.unsplash.com/photo-1594273774108-7107b6f71f60?w=600&q=80',
  custom: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&q=80',
}

const CATEGORY_LABELS = {
  figure: 'Figure & Nhân vật',
  decor: 'Trang trí & Thư tượng',
  collectible: 'Sưu tầm',
  custom: 'Sản xuất riêng',
}

export default function Home() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [email, setEmail] = useState('')
  const [newsletterMsg, setNewsletterMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const [productData, categoryData] = await Promise.all([
        api.get('/api/products?limit=8'),
        api.get('/api/products/categories'),
      ])
      setProducts(productData.items || [])
      setCategories(categoryData.categories || [])
    } catch {
      setProducts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleNewsletter = async (e) => {
    e.preventDefault()
    setNewsletterMsg(null)
    try {
      const data = await api.post('/api/newsletter', { email: email.trim() })
      setNewsletterMsg({ type: 'success', message: data.message })
      setEmail('')
    } catch (err) {
      setNewsletterMsg({ type: 'error', message: err.message })
    }
  }

  const featured = [
    { title: 'Biến thể linh hoạt', desc: 'Màu sắc, kích thước, số lượng và ghi chú trước khi đặt hàng.', icon: <Monitor size={24} /> },
    { title: 'Giá & tồn kho chuẩn server', desc: 'Mọi giá trị được tính lại từ hệ thống, không thể sửa từ trình duyệt.', icon: <ShieldCheck size={24} /> },
    { title: 'Theo dõi đơn trực tiếp', desc: 'Trạng thái đơn hàng cập nhật tức thì khi nhân viên xử lý.', icon: <Play size={24} /> },
  ]

  return (
    <div className="section">
      <div className="container-page">
        {/* Hero */}
        <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white p-8 md:p-12 mb-16 shadow-2xl">
          <div className="absolute -right-10 -bottom-20 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px]" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
              Mô hình in 3D • Sưu tầm & Trang trí
            </span>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 text-balance">
              Sáng tạo mọi chi tiết<br />bằng mô hình in 3D
            </h1>
            <p className="text-lg text-brand-100 mb-8 max-w-lg">
              Figure, thư tượng và sưu tầm in 3D độ phân giải cao. Chọn màu, kích thước và thêm ghi chú riêng trước khi đặt hàng.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-white text-brand-600 hover:bg-brand-100 font-bold shadow-lg" asChild>
                <Link to="/products">Xem sản phẩm <ArrowRight size={20} /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/20" onClick={() => navigate('/about')}>
                Về PhShop
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {featured.map((f, i) => (
            <Card key={i} className="p-6 border-brand-100/50 group hover:border-brand-200">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center mb-4 text-brand-600 group-hover:scale-110 transition">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">{f.title}</h3>
              <p className="text-dark-500 text-sm">{f.desc}</p>
            </Card>
          ))}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-dark-900">Danh mục</h2>
              <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">Xem tất cả →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((c) => (
                <Card key={c.id} className="cursor-pointer group" onClick={() => navigate(`/products?category=${c.id}`)}>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-dark-100 group-hover:opacity-90 relative">
                    {CATEGORY_IMAGES[c.id] && (
                      <img src={CATEGORY_IMAGES[c.id]} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <div>
                        <h3 className="text-white font-bold text-xl">{CATEGORY_LABELS[c.id] || c.id}</h3>
                        <span className="text-white/80 text-sm">{c.count} sản phẩm</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Featured products */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Sản phẩm nổi bật</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">Xem tất cả →</Link>
        </div>
        {products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-dark-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
            {products.map((p) => (
              <Link key={p.id} to={`/products/${p.slug}`} className="block group">
                <Card className="h-full">
                  <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100 relative">
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition line-clamp-2">{p.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-brand-600">{formatPrice(p.basePrice)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-dark-400">
                    <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" /> 4.8</span>
                    <span>{p.totalStock} trong kho</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Trust bar */}
        <div className="border-t border-dark-100 py-12 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-dark-500">
              <Truck size={16} className="text-brand-600" />
              <span>Giao hàng miễn phí toàn quốc</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-dark-500">
              <ShieldCheck size={16} className="text-brand-600" />
              <span>Thanh toán an toàn, bảo mật thông tin</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-dark-500">
              <Clock size={16} className="text-brand-600" />
              <span>Hoàn tiền trong 14 ngày</span>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="rounded-[3rem] bg-dark-900 p-8 md:p-12 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Nhận bản tin mới nhất</h3>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">Đăng ký email để nhận thông báo về sản phẩm mới, ưu đãi và tin tức về mô hình in 3D.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleNewsletter}>
            <Input
              type="email"
              placeholder="Email của bạn"
              aria-label="Email đăng ký bản tin"
              className="flex-1 bg-dark-800 border-dark-700 text-white placeholder-dark-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="bg-brand-600 text-white hover:bg-brand-500">Đăng ký</Button>
          </form>
          {newsletterMsg && (
            <p className={`mt-3 text-sm ${newsletterMsg.type === 'success' ? 'text-brand-100' : 'text-red-300'}`}>
              {newsletterMsg.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
