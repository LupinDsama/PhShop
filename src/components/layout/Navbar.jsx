import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, User, ShoppingBag, Heart } from 'lucide-react'
import { useCartStore } from '../../store/cart'
import { useWishlistStore } from '../../store/wishlist'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

const MOBILE_LINKS = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Sản phẩm', to: '/products' },
  { label: 'Giới thiệu', to: '/about' },
  { label: 'Liên hệ', to: '/contact' },
  { label: 'Giỏ hàng', to: '/cart' },
  { label: 'Yêu thích', to: '/wishlist' },
]

export default function Navbar() {
  const count = useCartStore((s) => s.count)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const wishCount = useWishlistStore((s) => s.count)
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist)
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  useEffect(() => {
    fetchCart().catch(() => {})
  }, [fetchCart, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist({ authenticated: true }).catch(() => {})
    } else {
      fetchWishlist({ authenticated: false }).catch(() => {})
    }
  }, [isAuthenticated, fetchWishlist])

  const handleLogout = async () => {
    setUserOpen(false)
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-100 bg-white/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg">P</div>
          <span className="font-display font-bold text-xl tracking-tight">PhShop</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-brand-600 transition">Trang chủ</Link>
          <Link to="/products" className="hover:text-brand-600 transition">Sản phẩm</Link>
          <Link to="/about" className="hover:text-brand-600 transition">Giới thiệu</Link>
          <Link to="/contact" className="hover:text-brand-600 transition">Liên hệ</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/wishlist" className="relative p-2 hover:bg-dark-100 rounded-full transition" aria-label="Danh sách yêu thích">
            <Heart size={20} />
            {wishCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative p-2 hover:bg-dark-100 rounded-full transition" aria-label="Giỏ hàng">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={userOpen}
                className="flex items-center gap-2 p-2 hover:bg-dark-100 rounded-full transition"
              >
                <User size={20} />
                <span className="text-sm font-medium text-dark-700 hidden sm:block max-w-[120px] truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-dark-100 bg-white shadow-xl py-2 z-50">
                  <div className="px-4 py-2 text-xs text-dark-400 truncate">{user?.email}</div>
                  <Link to="/profile" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition">
                    Hồ sơ của tôi
                  </Link>
                  <Link to="/order" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition">
                    Đơn hàng của tôi
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 transition font-semibold">
                      Quản trị Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">Đăng nhập</Link>
            </Button>
          )}

          <button className="md:hidden p-2" onClick={() => setOpen((o) => !o)} aria-label="Mở menu" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-dark-100 bg-white">
          <div className="container-page px-4 py-4 space-y-2">
            {MOBILE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm hover:text-brand-600 transition"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setOpen(false)} className="block py-3 text-sm hover:text-brand-600 transition">Hồ sơ</Link>
                <Link to="/order" onClick={() => setOpen(false)} className="block py-3 text-sm hover:text-brand-600 transition">Đơn hàng</Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="block py-3 text-sm text-brand-600 hover:bg-brand-50 transition font-semibold">
                    Quản trị Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="block py-3 text-sm text-red-600 hover:text-red-500 transition">Đăng xuất</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="block py-3 text-sm hover:text-brand-600 transition">Đăng nhập / Đăng ký</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
