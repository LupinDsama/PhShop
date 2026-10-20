import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCartStore } from '../store/cart'
import { useWishlistStore } from '../store/wishlist'
import api from '../lib/api'
import { Mail, Lock, Phone, MapPin, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', inviteToken: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [resetToken, setResetToken] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart)
  const syncGuestWishlist = useWishlistStore((s) => s.syncGuestWishlist)

  useEffect(() => {
    const token = params.get('invite')
    if (token) setForm((f) => ({ ...f, inviteToken: token }))
    if (params.get('mode') === 'reset') setResetMode(true)
  }, [params])

  useEffect(() => {
    if (isAuthenticated && !resetMode) navigate('/', { replace: true })
  }, [isAuthenticated, navigate, resetMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
      }
      if (form.inviteToken) payload.inviteToken = form.inviteToken
      await register(payload)
      await Promise.all([mergeGuestCart(), syncGuestWishlist()])
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetRequest = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const data = await api.post('/api/auth/password-reset/request', { email: form.email.trim() })
      setNotice(data.message)
      if (data.resetToken) setResetToken(data.resetToken)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetConfirm = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/api/auth/password-reset/confirm', { token: resetToken, newPassword: form.password })
      setNotice('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.')
      setResetMode(false)
      setResetToken('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (resetMode) {
    return (
      <div className="section min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="container-page">
          <Card className="max-w-md mx-auto shadow-xl">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-dark-900 mb-2">Đặt lại mật khẩu</h2>
              <p className="text-dark-500 text-sm mb-6">
                Nhập email để nhận liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 60 phút.
              </p>

              {error && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {notice && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-brand-50 text-brand-700 text-sm" role="status">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <form onSubmit={resetToken ? handleResetConfirm : handleResetRequest} className="space-y-4">
                {!resetToken ? (
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="block text-sm font-medium text-dark-700">Email</label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="reset-password" className="block text-sm font-medium text-dark-700">Mật khẩu mới</label>
                    <Input
                      id="reset-password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    {process.env.NODE_ENV !== 'production' && (
                      <p className="text-xs text-amber-600">
                        Môi trường phát triển: token được hiển thị để kiểm thử — hệ thống chưa cấu hình SMTP.
                      </p>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full py-3 font-bold" disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : resetToken ? 'Đặt mật khẩu mới' : 'Gửi liên kết đặt lại'}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setResetMode(false); setError(null); setNotice(null) }}
                className="mt-6 w-full text-center text-sm text-dark-500 hover:text-brand-600 transition"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="section min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="container-page">
        <Card className="max-w-md mx-auto shadow-xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">P</div>
              <h2 className="text-2xl font-bold text-dark-900">Tạo tài khoản mới</h2>
              <p className="text-dark-500 text-sm mt-2">Lưu giỏ hàng, địa chỉ và lịch sử mua sắm.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reg-name" className="block text-sm font-medium text-dark-700">Họ tên</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="reg-name"
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-9"
                    required
                    minLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-email" className="block text-sm font-medium text-dark-700">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-phone" className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-address" className="block text-sm font-medium text-dark-700">Địa chỉ giao hàng</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="reg-address"
                    placeholder="Số, tên đường, phường, quận, thành phố"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-password" className="block text-sm font-medium text-dark-700">Mật khẩu</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-9"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-dark-700">Xác nhận mật khẩu</label>
                <Input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              {form.inviteToken && (
                <p className="text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
                  Đăng ký bằng mời quản trị — vai trò sẽ được cấp sau khi xác thực.
                </p>
              )}
              <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg" disabled={submitting}>
                {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-dark-500">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-brand-600 font-medium hover:underline">Đăng nhập</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
