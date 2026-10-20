import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, ShoppingBag, Heart } from 'lucide-react'
import { useCartStore } from '../../store/cart'
import { useWishlistStore } from '../../store/wishlist'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

export default function Navbar() {
  const count = useCartStore((state) => state.count)
  const wishCount = useWishlistStore((state) => state.count)
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-100 bg-white/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
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
          <Link
            to="/wishlist"
            className="relative p-2 hover:bg-dark-100 rounded-full transition"
          >
            <Heart size={20} />
            {wishCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            className="relative p-2 hover:bg-dark-100 rounded-full transition"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setUserOpen((o) => !o)} className="flex items-center gap-2 p-2 hover:bg-dark-100 rounded-full transition">
                <User size={20} />
                <span className="text-sm font-medium text-dark-700 hidden sm:block">{user?.email.split('@')[0]}</span>
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-dark-100 bg-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition">Hồ sơ của tôi</Link>
                  <Link to="/order" className="block px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition">Đơn hàng của tôi</Link>
                  {isAdmin && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 transition font-semibold">Quản trị Admin</Link>
                  )}
                  <button onClick={() => { logout(); setUserOpen(false); navigate('/login') }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">Đăng nhập</Link>
            </Button>
          )}
          <button className="md:hidden p-2" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-dark-100 bg-white">
          <div className="container-page px-4 py-4 space-y-4">
            {['Trang chủ', 'Sản phẩm', 'Giới thiệu', 'Liên hệ', 'Giỏ hàng', 'Yêu thích'].map((label) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false)
                  const target = label === 'Trang chủ' ? '/' : label === 'Sản phẩm' ? '/products' : label === 'Giới thiệu' ? '/about' : label === 'Liên hệ' ? '/contact' : label === 'Giỏ hàng' ? '/cart' : '/wishlist'
                  navigate(target)
                }}
                className="text-left py-3 text-sm hover:text-brand-600 transition"
              >
                {label}
              </button>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="block py-3 text-sm hover:text-brand-600 transition">Hồ sơ</Link>
                <Link to="/order" className="block py-3 text-sm hover:text-brand-600 transition">Đơn hàng</Link>
                {isAdmin && (
                  <Link to="/admin" className="block py-3 text-sm text-brand-600 hover:bg-brand-50 transition font-semibold">Quản trị Admin</Link>
                )}
                <button onClick={() => { logout(); navigate('/login') }} className="block py-3 text-sm text-red-600 hover:text-red-500 transition">Đăng xuất</button>
              </>
            ) : (
              <Link to="/login" className="block py-3 text-sm hover:text-brand-600 transition">Đăng nhập / Đăng ký</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
