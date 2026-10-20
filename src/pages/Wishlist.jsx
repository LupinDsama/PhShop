import { Link, useNavigate } from 'react-router-dom'
import { Heart, ArrowRight, Package, Clock, Truck, Mail, Phone, MapPin, ShieldCheck, Star } from 'lucide-react'
import { useWishlistStore } from '../store/wishlist'
import { products, formatPrice } from '../data/products'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Wishlist() {
  const { items, removeItem } = useWishlistStore()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="section">
        <div className="container-page">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-20 h-20 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-6 text-dark-400">
              <Heart size={40} />
            </div>
            <h2 className="text-2xl font-bold text-dark-900 mb-2">Chưa có sản phẩm yêu thích</h2>
            <p className="text-dark-500 mb-8">Hãy nhấn vào tim trên các sản phẩm để lưu vào danh sách yêu thích.</p>
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
        <h2 className="text-2xl font-bold text-dark-900 mb-8">Danh sách yêu thích ({items.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((p) => (
            <Card key={p.id} className="group cursor-pointer relative" onClick={(e) => {
              if (e.target.closest('button')) return
              navigate(`/products/${p.slug}`)
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeItem(p.id)
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-brand-600 hover:bg-brand-600 hover:text-white transition shadow-sm"
              >
                <Heart size={16} className="fill-brand-600" />
              </button>
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-600">{formatPrice(p.base_price)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/products/${p.slug}`} className="flex-1">
                  <Button size="sm" className="w-full py-2 text-sm">Xem chi tiết</Button>
                </Link>
                <Button variant="outline" size="sm" className="flex-1">
                  <Star size={14} className="mr-1" /> Mua
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
