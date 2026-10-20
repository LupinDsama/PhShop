import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { formatPrice } from '../data/products'
import { ArrowRight, Play, Monitor, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'

export default function Home() {
  const navigate = useNavigate()
  const featured = [
    {
      title: 'Intro animation mượt mà',
      desc: 'Hình sản phẩm lướt nhanh 0.5–1 giây trước khi vào trang chủ.',
      icon: <Play size={24} />,
    },
    {
      title: 'Chọn biến thể linh hoạt',
      desc: 'Màu sắc, kích thước, số lượng và ghi chú trước khi đặt hàng.',
      icon: <Monitor size={24} />,
    },
    {
      title: 'Bảo mật đơn hàng',
      desc: 'Trạng thái thanh toán chỉ cập nhật từ nguồn tin cậy phía server.',
      icon: <ShieldCheck size={24} />,
    },
  ]

  return (
    <div className="section">
      <div className="container-page">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 text-white p-8 md:p-12 mb-16 shadow-xl">
          <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
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
            <Card key={i} className="p-6 border-brand-100/50 hover:border-brand-200">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 mb-4">
                {f.icon}
              </div>
              <CardTitle className="text-lg">{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </Card>
          ))}
        </div>

        {/* Featured products */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-dark-900">Sản phẩm nổi bật</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[
            { name: 'Mô hình Kỷ Viễn', price: 250000, img: 'https://images.unsplash.com/photo-1618990102830-3060efb9c4ca?w=600&q=80' },
            { name: 'Mô hình Trong Túm', price: 420000, img: 'https://images.unsplash.com/photo-1606893906813-f7d12e3c62ad?w=600&q=80' },
            { name: 'Mô hình Động Vật', price: 180000, img: 'https://images.unsplash.com/photo-1594273774108-7107b6f71f60?w=600&q=80' },
            { name: 'Mô hình Phim Ảnh', price: 320000, img: 'https://images.unsplash.com/photo-1611720731423-c05ce6bb27b7?w=600&q=80' },
          ].map((p) => (
            <Card key={p.name} className="cursor-pointer hover:border-brand-200 group" onClick={() => navigate(`/products/${p.name.toLowerCase().replace(/\s+/g,'-')}`)}>
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <h3 className="font-semibold text-dark-900">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-600">{formatPrice(p.price)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
