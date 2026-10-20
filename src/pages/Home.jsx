import { Link, useNavigate } from 'react-router-dom'
import { useWishlistStore } from '../store/wishlist'
import { formatPrice } from '../data/products'
import { ArrowRight, Play, Monitor, ShieldCheck, Truck, Star, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

export default function Home() {
  const navigate = useNavigate()
  const { toggleItem, isInWishlist } = useWishlistStore()

  const featured = [
    { title: 'Intro animation mượt mà', desc: 'Hình sản phẩm lướt nhanh 0.5–1 giây trước khi vào trang chủ.', icon: <Play size={24} /> },
    { title: 'Chọn biến thể linh hoạt', desc: 'Màu sắc, kích thước, số lượng và ghi chú trước khi đặt hàng.', icon: <Monitor size={24} /> },
    { title: 'Bảo mật đơn hàng', desc: 'Trạng thái thanh toán chỉ cập nhật từ nguồn tin cậy phía server.', icon: <ShieldCheck size={24} /> },
  ]

  const products = [
    { id: 'p1', name: 'Mô hình Kỷ Viễn', category: 'figure', price: 250000, img: 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=600&q=80', slug: 'mo-hinh-ky-vien-3d' },
    { id: 'p2', name: 'Mô hình Trong Túm', category: 'decor', price: 420000, img: 'https://images.unsplash.com/photo-1606893906813-f7d12e3c62ad?w=600&q=80', slug: 'mo-hinh-trong-tuong-3d' },
    { id: 'p3', name: 'Mô hình Động Vật', category: 'collectible', price: 180000, img: 'https://images.unsplash.com/photo-1594273774108-7107b6f71f60?w=600&q=80', slug: 'mo-hinh-dong-vat-3d' },
    { id: 'p4', name: 'Mô hình Phim Ảnh', category: 'figure', price: 320000, img: 'https://images.unsplash.com/photo-1611720731423-c05ce6bb27b7?w=600&q=80', slug: 'mo-hinh-phim-hien-dai-3d' },
  ]

  const categories = [
    { name: 'Figure & Nhân vật', img: 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=600&q=80' },
    { name: 'Trang trí & Thư tượng', img: 'https://images.unsplash.com/photo-1606893906813-f7d12e3c62ad?w=600&q=80' },
    { name: 'Sưu tầm', img: 'https://images.unsplash.com/photo-1594273774108-7107b6f71f60?w=600&q=80' },
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
              Sáng tạo mọi chi tiết<br />
              bằng mô hình in 3D
            </h1>
            <p className="text-lg text-brand-100 mb-8 max-w-lg">
              Figure, thư tượng và sưu tầm in 3D độ phân giải cao. Chọn màu,
              kích thước và thêm ghi chú riêng trước khi đặt hàng.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-white text-brand-600 hover:bg-brand-100 text-brand-600 font-bold shadow-lg" asChild>
                <Link to="/products">Xem sản phẩm <ArrowRight size={20} /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/20">
                Xem danh mục
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {featured.map((f, i) => (
            <Card key={i} className="p-6 border-brand-100/50 group hover:border-brand-200">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 mb-4 group-hover:scale-110 transition">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">{f.title}</h3>
              <p className="text-dark-500 text-sm">{f.desc}</p>
            </Card>
          ))}
        </div>

        {/* Categories */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-dark-900">Danh mục</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((c) => (
              <Card key={c.name} className="cursor-pointer group" onClick={() => navigate('/products')}>
                <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-dark-100 relative group-hover:opacity-90">
                  <img src={c.img} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <h3 className="text-white font-bold text-xl">{c.name}</h3>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured products */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Sản phẩm nổi bật</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
          {products.map((p) => (
            <Card key={p.id} className="cursor-pointer group" onClick={() => navigate(`/products/${p.slug}`)}>
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100 relative">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleItem(p) }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-brand-600 hover:bg-brand-600 hover:text-white transition shadow-sm"
                >
                  <Star size={16} className={`${isInWishlist(p.id) ? 'fill-brand-600' : ''}`} />
                </button>
              </div>
              <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-600">{formatPrice(p.price)}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust bar */}
        <div className="border-t border-dark-100 py-12 mb-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 text-sm text-dark-500">
              <Truck size={16} className="text-brand-600" />
              <span>Giao hàng miễn phí trên toàn quốc</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark-500">
              <ShieldCheck size={16} className="text-brand-600" />
              <span>Thanh toán an toàn, bảo mật thông tin</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark-500">
              <Clock size={16} className="text-brand-600" />
              <span>Hoàn tiền trong 14 ngày</span>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-dark-900 text-center mb-10">Khách hàng nói về chúng tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-8">
                <div className="flex gap-2 text-amber-400 text-xs mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} className="fill-amber-400" />)}
                </div>
                <p className="text-dark-600 text-sm leading-relaxed mb-6">
                  "Sản phẩm in 3D rất đẹp, chi tiết sắc nét, giao hàng nhanh. Rất hài lòng!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-100 flex items-center justify-center overflow-hidden">
                    <span className="text-xs font-medium text-dark-600">KH</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-dark-900">Khách hàng {i}</div>
                    <div className="text-xs text-dark-400">Hà Nội, Việt Nam</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div className="rounded-[3rem] bg-dark-900 p-8 md:p-12 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Nhận bản tin mới nhất</h3>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">Đăng ký email để nhận thông báo về sản phẩm mới, ưu đãi và tin tức về mô hình in 3D.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn đã đăng ký!'); }}>
            <Input type="email" placeholder="Email của bạn" className="flex-1 bg-dark-800 border-dark-700 text-white placeholder-dark-400" />
            <Button type="submit" className="bg-brand-600 text-white hover:bg-brand-500">Đăng ký</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
