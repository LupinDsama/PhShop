import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuth } from '../context/AuthContext'
import { products, formatPrice, categories } from '../data/products'
import { Search, Filter, ChevronLeft, ShoppingCart, Star } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Products() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const cart = useCartStore()
  const filtered = products.filter(
    (p) =>
      p.status === 'active' &&
      (activeCat === 'all' || p.category === activeCat) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
            <Input
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActiveCat('all')}>
              <Filter className="mr-2 h-4 w-4" /> Tất cả
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeCat === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
            }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeCat === c.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <p className="text-dark-500">Không tìm thấy sản phẩm phù hợp.</p>
            </div>
          ) : (
            filtered.map((p) => (
              <Card key={p.id} className="cursor-pointer group" onClick={() => navigate(`/products/${p.slug}`)}>
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100 relative">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition">{p.name}</h3>
                  <p className="text-sm text-dark-500 line-clamp-2">{p.description}</p>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-brand-600">{formatPrice(p.base_price)}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-dark-400">
                  <Star size={12} className="text-amber-400" /> 4.8
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-10 text-center">
          <Link to="/" className="text-sm font-medium text-dark-600 hover:text-brand-600">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
