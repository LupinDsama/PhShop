import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { formatPrice } from '../lib/format'
import { Search, Filter, Star } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LoadingState, ErrorState, EmptyState, Pagination } from '../components/ui/States'

const CATEGORY_LABELS = {
  figure: 'Figure & Nhân vật',
  decor: 'Trang trí & Thư tượng',
  collectible: 'Sưu tầm',
  custom: 'Sản xuất riêng',
}

export default function Products() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(1) }, [debounced, activeCat])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' })
      if (activeCat !== 'all') params.set('category', activeCat)
      if (debounced) params.set('q', debounced)
      const result = await api.get(`/api/products?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeCat, debounced, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Tìm sản phẩm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setActiveCat('all') }}>
            <Filter className="mr-2 h-4 w-4" /> Xóa bộ lọc
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeCat === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
          {Object.entries(CATEGORY_LABELS).map(([id, name]) => (
            <button
              key={id}
              onClick={() => setActiveCat(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCat === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {loading && <LoadingState label="Đang tải danh sách sản phẩm..." />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && data.items.length === 0 && (
          <EmptyState
            title="Không tìm thấy sản phẩm phù hợp"
            description="Thử từ khoá khác hoặc chọn danh mục khác để xem thêm sản phẩm."
            action={
              <button
                onClick={() => { setSearch(''); setActiveCat('all') }}
                className="text-brand-600 font-medium hover:underline"
              >
                Xóa bộ lọc
              </button>
            }
          />
        )}

        {!loading && !error && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.items.map((p) => (
                <Link key={p.id} to={`/products/${p.slug}`} className="block group">
                  <Card className="h-full">
                    <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-gray-100 relative">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Chưa có ảnh</div>
                      )}
                      {p.totalStock <= 0 && (
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
                          Hết hàng
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition line-clamp-2">{p.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{CATEGORY_LABELS[p.category] || p.category}</p>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-brand-600">{formatPrice(p.basePrice)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" /> 4.8</span>
                      <span>{p.totalStock} trong kho</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}

        <div className="mt-10 text-center">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-brand-600">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
