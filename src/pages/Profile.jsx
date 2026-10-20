import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Phone, MapPin, Clock, Settings, LogOut, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Hồ sơ của tôi</h2>
            <p className="text-dark-500">Quản lý thông tin tài khoản và đơn hàng.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Card className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl mb-3 overflow-hidden">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-lg font-bold text-dark-900">{user?.name || 'Khách hàng'}</div>
                <div className="text-sm text-dark-500">{user?.email}</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 hover:bg-dark-100 transition cursor-pointer">
                  <User size={18} className="text-dark-400" />
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-dark-900">Họ tên</div>
                    <div className="text-xs text-dark-400">{user?.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 hover:bg-dark-100 transition cursor-pointer">
                  <Mail size={18} className="text-dark-400" />
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-dark-900">Email</div>
                    <div className="text-xs text-dark-400">{user?.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 hover:bg-dark-100 transition cursor-pointer">
                  <Phone size={18} className="text-dark-400" />
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-dark-900">Số điện thoại</div>
                    <div className="text-xs text-dark-400">Chưa cập nhật</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 hover:bg-dark-100 transition cursor-pointer">
                  <MapPin size={18} className="text-dark-400" />
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-dark-900">Địa chỉ</div>
                    <div className="text-xs text-dark-400">Chưa cập nhật</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-dark-100">
                <Button onClick={() => { logout(); navigate('/login') }} variant="outline" className="w-full text-red-600 hover:bg-red-50">
                  <LogOut size={18} className="mr-2" /> Đăng xuất
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-dark-900">Cài đặt tài khoản</h3>
                <Button variant="outline" size="sm">Lưu thay đổi</Button>
              </div>
              <form className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Họ tên</label>
                  <Input defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Email</label>
                  <Input type="email" defaultValue={user?.email} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                  <Input type="tel" placeholder="09xxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Địa chỉ giao hàng</label>
                  <Input placeholder="Số, tên đường, phường, quận, thành phố" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Mật khẩu mới</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
