import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, ShoppingBag } from 'lucide-react'
import { useCartStore } from '../../store/cart'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

export default function Navbar() {
  const { count } = useCartStore()
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-100 bg-white/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">P</div>
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
            to="/cart"
            className="relative p-2 hover:bg-dark-100 rounded-full transition"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <>
              <span className="text-sm text-dark-600 hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login') }}>
                <LogOut size={16} /> /{user?.email.split('@')[0]}
              </Button>
            </>
          ) : (
            <Button asChild size="sm" asChild>
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
            {['Trang chủ', 'Sản phẩm', 'Giới thiệu', 'Liên hệ', 'Giỏ hàng'].map((label) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false)
                  navigate(label === 'Trang chủ' ? '/' : label.toLowerCase().replace(' ', '-'))
                }}
                className="text-left py-3 text-sm hover:text-brand-600 transition"
              >
                {label}
              </button>
            ))}
            {isAuthenticated ? (
              <button onClick={() => { logout(); navigate('/login') }} className="text-left py-3 text-sm text-red-600 hover:text-red-500 transition">
                Đăng xuất
              </button>
            ) : (
              <Link to="/login" className="block py-3 text-sm hover:text-brand-600 transition">
                Đăng nhập / Đăng ký
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
