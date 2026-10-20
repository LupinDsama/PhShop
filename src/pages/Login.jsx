import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCartStore } from '../store/cart'
import { useWishlistStore } from '../store/wishlist'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart)
  const syncGuestWishlist = useWishlistStore((s) => s.syncGuestWishlist)

  const redirectTo = location.state?.from || '/'

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true })
  }, [isAuthenticated, navigate, redirectTo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      // Hợp nhất giỏ hàng & wishlist của khách vãng lai vào tài khoản.
      await Promise.all([mergeGuestCart(), syncGuestWishlist()])
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="section min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="container-page">
        <Card className="max-w-md mx-auto shadow-xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">P</div>
              <h2 className="text-2xl font-bold text-dark-900">Chào mừng quay lại</h2>
              <p className="text-dark-500 text-sm mt-2">Đăng nhập để tiếp tục mua sắm.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-medium text-dark-700">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-sm font-medium text-dark-700">Mật khẩu</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg" disabled={submitting}>
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link to="/register" className="text-brand-600 font-medium hover:underline">Đăng ký tài khoản</Link>
              <button
                type="button"
                onClick={() => navigate('/register?mode=reset')}
                className="text-dark-500 hover:text-brand-600 transition"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
