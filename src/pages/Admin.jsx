import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Package, Truck, ShieldCheck, Star, Settings, Users, Clock, Mail, Phone } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Admin() {
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState('dashboard')

  if (!isAuthenticated) {
    navigateToLogin()
    return null
  }

  const stats = [
    { label: 'Tổng đơn hàng', value: '124', change: '+12%', icon: <Package className="w-5 h-5" />, color: 'text-brand-600' },
    { label: 'Doanh thu tháng', value: '45.200.000 ₫', change: '+8%', icon: <ShieldCheck className="w-5 h-5" />, color: 'text-green-600' },
    { label: 'Sản phẩm active', value: '18', change: '+3', icon: <Star className="w-5 h-5" />, color: 'text-blue-600' },
    { label: 'Khách hàng mới', value: '32', change: '+15%', icon: <Users className="w-5 h-5" />, color: 'text-purple-600' },
  ]

  const recentOrders = [
    { id: 'PH001', customer: 'Nguyễn Văn A', total: '250.000 ₫', status: 'Hoàn tất', date: '20/10/2026' },
    { id: 'PH002', customer: 'Trần Thị B', total: '420.000 ₫', status: 'Đang giao', date: '19/10/2026' },
    { id: 'PH003', customer: 'Lê Văn C', total: '180.000 ₫', status: 'Đang sản xuất', date: '18/10/2026' },
    { id: 'PH004', customer: 'Phạm Văn D', total: '320.000 ₫', status: 'Mới tạo', date: '17/10/2026' },
  ]

  const tabs = [
    { key: 'dashboard', label: 'Tổng quan', icon: <Clock className="w-4 h-4" /> },
    { key: 'products', label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
    { key: 'orders', label: 'Đơn hàng', icon: <Truck className="w-4 h-4" /> },
    { key: 'users', label: 'Khách hàng', icon: <Users className="w-4 h-4" /> },
    { key: 'settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Bảng điều khiển Admin</h2>
            <p className="text-dark-500">Quản lý cửa hàng mô hình in 3D của bạn.</p>
          </div>
          <Button asChild>
            <Link to="/products">Thêm sản phẩm <ArrowRight size={18} /></Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-2xl font-bold text-dark-900">{s.value}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">{s.change} so với tháng trước</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center">{s.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-dark-100 pb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                tab === t.key
                  ? 'bg-brand-50 text-brand-600 shadow-sm border-brand-100'
                  : 'text-dark-500 hover:text-dark-700 hover:bg-dark-50'
              }`}
            >
              {t.icon} <span className="ml-2">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-dark-900 mb-4">Hoạt động gần đây</h3>
              <div className="space-y-4">
                {['Đơn hàng mới #PH001', 'Khách hàng mới đăng ký', 'Đơn hàng #PH002 đã giao', 'Sản phẩm mới được thêm'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 border border-dark-100">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">{i + 1}</div>
                    <div className="text-sm text-dark-600">{item}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-dark-900 mb-4">Thống kê đơn hàng</h3>
              <div className="space-y-4 text-sm">
                {[
                  ['Mới tạo', '5', 'text-blue-600'],
                  ['Đang xử lý', '12', 'text-amber-600'],
                  ['Đang giao', '8', 'text-purple-600'],
                  ['Hoàn tất', '99', 'text-green-600'],
                ].map(([label, count, color]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-dark-500">{label}</span>
                    <span className={`font-medium ${color}`}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === 'orders' && (
          <Card className="p-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dark-100">
                  <th className="px-4 py-3 font-medium text-dark-500">Mã đơn</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Khách hàng</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Tổng tiền</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Ngày</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-dark-50 transition">
                    <td className="px-4 py-3 font-medium text-dark-900">{o.id}</td>
                    <td className="px-4 py-3 text-dark-600">{o.customer}</td>
                    <td className="px-4 py-3 font-medium text-dark-900">{o.total}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        o.status === 'Hoàn tất' ? 'bg-green-100 text-green-700' :
                        o.status === 'Đang giao' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-dark-500">{o.date}</td>
                    <td className="px-4 py-3 text-dark-500">Xem chi tiết</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === 'products' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-dark-900">Quản lý sản phẩm</h3>
              <Button>Thêm sản phẩm mới</Button>
            </div>
            <Card className="p-6">
              <p className="text-dark-500 text-sm">Danh sách sản phẩm sẽ được hiển thị tại đây. Chức năng thêm/sửa/xóa sản phẩm đang được phát triển.</p>
            </Card>
          </>
        )}

        {tab === 'users' && (
          <Card className="p-6">
            <p className="text-dark-500 text-sm">Quản lý khách hàng đang được phát triển.</p>
          </Card>
        )}

        {tab === 'settings' && (
          <Card className="p-6">
            <h3 className="font-bold text-dark-900 mb-6">Cài đặt cửa hàng</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-dark-100">
                <div>
                  <div className="font-medium text-dark-900">Tên cửa hàng</div>
                  <div className="text-sm text-dark-500">PhShop - Mô hình in 3D</div>
                </div>
                <Input placeholder="Tên cửa hàng" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-dark-100">
                <div>
                  <div className="font-medium text-dark-900">Email hỗ trợ</div>
                  <div className="text-sm text-dark-500">support@phshop.example</div>
                </div>
                <Input type="email" placeholder="email@example.com" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-dark-100">
                <div>
                  <div className="font-medium text-dark-900">Mã khu vực</div>
                  <div className="text-sm text-dark-500">VN</div>
                </div>
                <Input placeholder="VN" />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function navigateToLogin() {
  if (typeof window !== 'undefined') window.location.href = '/login'
}
