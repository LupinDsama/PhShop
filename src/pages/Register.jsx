import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock, Phone, MapPin } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', address: ''
  })
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) return alert('Mật khẩu xác nhận không khớp')
    const user = { email: form.email, name: form.name }
    login(user)
    navigate('/')
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Họ tên</label>
                <Input
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                <Input
                  type="tel"
                  placeholder="09xxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Địa chỉ giao hàng</label>
                <Input
                  placeholder="Số, tên đường, phường, quận, thành phố"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Mật khẩu</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Xác nhận mật khẩu</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg">
                Tạo tài khoản
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
