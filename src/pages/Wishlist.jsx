import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWishlistStore } from '../store/wishlist'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import { Heart, ArrowRight, AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States'

export default function Wishlist() {
  const { items, count, loading, error, loaded, fetchWishlist, removeItem } = useWishlistStore()
  const { isAuthenticated, isReady } = useAuth()
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(() => {
    if (!isReady) return
    fetchWishlist({ authenticated: isAuthenticated }).catch(() => {})
  }, [fetchWishlist, isAuthenticated, isReady])

  useEffect(() => { load() }, [load])

  const handleRemove = async (item) => {
    setBusyId(item.productId)
    setActionError(null)
    try {
      await removeItem(item.productId)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!isReady || (loading && !loaded)) {
    return (
      <div className="section">
        <div className="container-page"><LoadingState label="Đang tải danh sách yêu thích..." /></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="section">
        <div className="container-page">
          <EmptyState
            icon={Heart}
            title="Đăng nhập để lưu sản phẩm yêu thích"
            description="Danh sách yêu thích được lưu trong tài khoản của bạn nên đồng bộ trên mọi thiết bị."
            action={
              <Link to="/login" state={{ from: '/wishlist' }} className="text-brand-600 font-medium hover:underline">
                Đăng nhập ngay
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  if (error && !loaded) {
    return (
      <div className="section">
        <div className="container-page"><ErrorState message={error} onRetry={load} /></div>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="section">
        <div className="container-page">
          <EmptyState
            icon={Heart}
            title="Chưa có sản phẩm yêu thích"
            description="Hãy nhấn vào tim trên các sản phẩm để lưu vào danh sách yêu thích."
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
        <h2 className="text-2xl font-bold text-dark-900 mb-8">Danh sách yêu thích ({count})</h2>

        {actionError && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((p) => (
            <Card key={p.productId} className="group relative">
              <button
                type="button"
                onClick={() => handleRemove(p)}
                disabled={busyId === p.productId}
                aria-label={`Xoá ${p.name} khỏi yêu thích`}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-brand-600 hover:bg-brand-600 hover:text-white transition shadow-sm disabled:opacity-50"
              >
                <Heart size={16} className="fill-brand-600" />
              </button>
              <Link to={`/products/${p.slug}`} className="block">
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-dark-100">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  )}
                </div>
                <h3 className="font-semibold text-dark-900 group-hover:text-brand-600 transition line-clamp-2">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-brand-600">{formatPrice(p.price)}</span>
                </div>
                {!p.available && (
                  <p className="text-xs text-red-500 mt-1">Sản phẩm hiện không còn được bán.</p>
                )}
              </Link>
              <div className="mt-3">
                <Link to={`/products/${p.slug}`}>
                  <Button size="sm" className="w-full py-2 text-sm">Xem chi tiết</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
