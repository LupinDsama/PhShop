import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrderStore } from '../store/orders'
import { Package, Truck, ShieldCheck, Star, Settings, Users, Clock, Mail, Phone, ChevronDown } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const statusOptions = [
  { value: 'moi_tao', label: 'Mới tạo', color: 'text-blue-600' },
  { value: 'xac_nhan', label: 'Đã xác nhận', color: 'text-blue-600' },
  { value: 'dang_san_xuat', label: 'Đang sản xuất', color: 'text-amber-600' },
  { value: 'dang_giao', label: 'Đang giao', color: 'text-blue-600' },
  { value: 'hoan_tat', label: 'Hoàn tất', color: 'text-green-600' },
  { value: 'da_huy', label: 'Đã hủy', color: 'text-red-600' },
]

const statusBadge = {
  moi_tao: 'bg-blue-100 text-blue-700',
  xac_nhan: 'bg-blue-100 text-blue-700',
  dang_san_xuat: 'bg-amber-100 text-amber-700',
  dang_giao: 'bg-blue-100 text-blue-700',
  hoan_tat: 'bg-green-100 text-green-700',
  da_huy: 'bg-red-100 text-red-700',
}

export default function Admin() {
  const { isAuthenticated, isAdmin } = useAuth()
  const orders = useOrderStore((state) => state.getAllOrders())
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus)
  const statusLabel = useOrderStore((state) => state.statusLabel)
  const [tab, setTab] = useState('dashboard')
  const [openStatus, setOpenStatus] = useState(null)

  if (!isAuthenticated) {
    navigateToLogin()
    return null
  }
  if (!isAdmin) {
    return (
      <div className="section min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="container-page">
          <Card className="max-w-md mx-auto shadow-xl text-center p-12">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-dark-900 mb-2">Bạn không có quyền truy cập</h2>
            <p className="text-dark-500 mb-6">Chỉ admin mới có thể vào trang quản trị.</p>
            <Link to="/" className="text-brand-600 font-medium hover:underline">Về trang chủ</Link>
          </Card>
        </div>
      </div>
    )
  }

  const sortedOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const totalRevenue = sortedOrders.reduce((sum, o) => sum + o.total, 0)

  const stats = [
    { label: 'Tổng đơn hàng', value: sortedOrders.length.toString(), change: '+12%', icon: <Package className="w-5 h-5" />, color: 'text-brand-600' },
    { label: 'Doanh thu tháng', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue), change: '+8%', icon: <ShieldCheck className="w-5 h-5" />, color: 'text-green-600' },
    { label: 'Sản phẩm active', value: '18', change: '+3%', icon: <Star className="w-5 h-5" />, color: 'text-blue-600' },
    { label: 'Khách hàng mới', value: new Set(sortedOrders.map(o => o.customerEmail)).size.toString(), change: '+15%', icon: <Users className="w-5 h-5" />, color: 'text-purple-600' },
  ]

  const tabs = [
    { key: 'dashboard', label: 'Tổng quan', icon: <Clock className="w-4 h-4" /> },
    { key: 'products', label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
    { key: 'orders', label: 'Đơn hàng', icon: <Truck className="w-4 h-4" /> },
    { key: 'users', label: 'Khách hàng', icon: <Users className="w-4 h-4" /> },
    { key: 'settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ]

  const handleChangeStatus = (orderId, newStatus) => {
    setOpenStatus(null)
    updateOrderStatus(orderId, newStatus)
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Bảng điều khiển Admin</h2>
            <p className="text-dark-500">Quản lý cửa hàng mô hình in 3D của bạn.</p>
          </div>
          <Button asChild>
            <Link to="/products">Thêm sản phẩm <ChevronDown size={18} /></Link>
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
                {sortedOrders.slice(0, 4).map((o, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-dark-50 border border-dark-100">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">{i + 1}</div>
                    <div className="text-sm text-dark-600">Đơn hàng mới #{o.id}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-dark-900 mb-4">Thống kê đơn hàng</h3>
              <div className="space-y-4 text-sm">
                {statusOptions.map((s) => (
                  <div key={s.value} className="flex justify-between">
                    <span className="text-dark-500">{s.label}</span>
                    <span className={`font-medium ${s.color}`}>
                      {sortedOrders.filter(o => o.status === s.value).length}
                    </span>
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
                  <th className="px-4 py-3 font-medium text-dark-500">Email</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Tổng tiền</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Ngày</th>
                  <th className="px-4 py-3 font-medium text-dark-500">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {sortedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-dark-50 transition">
                    <td className="px-4 py-3 font-medium text-dark-900">{o.id}</td>
                    <td className="px-4 py-3 text-dark-600">{o.customerName || o.customerEmail.split('@')[0]}</td>
                    <td className="px-4 py-3 text-sm text-dark-500">{o.customerEmail}</td>
                    <td className="px-4 py-3 font-medium text-dark-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge[o.status]}`}>
                        {statusLabel[o.status] || statusOptions.find(s => s.value === o.status)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-500">{o.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={o.status}
                          className="text-xs bg-white border border-dark-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                        >
                          {statusOptions.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleChangeStatus(o.id, o.status) }}>
                          Lưu
                        </Button>
                      </div>
                    </td>
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
