import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Package, Clock, Truck, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Order() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  const orders = [
    {
      number: 'PH20261020001',
      status: 'hoàn_tất',
      date: '20/10/2026',
      total: 570000,
      items: 2,
      progress: 100,
    },
    {
      number: 'PH20261018002',
      status: 'dang_giao',
      date: '18/10/2026',
      total: 250000,
      items: 1,
      progress: 80,
    },
    {
      number: 'PH20261015003',
      status: 'dang_san_xuat',
      date: '15/10/2026',
      total: 420000,
      items: 1,
      progress: 50,
    },
  ]

  const statusLabel = {
    moi_tao: 'Mới tạo',
    xac_nhan: 'Đã xác nhận',
    dang_san_xuat: 'Đang sản xuất',
    dang_giao: 'Đang giao',
    hoan_tat: 'Hoàn tất',
    da_huy: 'Đã hủy',
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Lịch sử đơn hàng</h2>
          <Link to="/products" className="text-sm text-dark-500 hover:text-brand-600">Tiếp tục mua sắm <ArrowRight size={18} /></Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {orders.map((o) => (
              <Card key={o.number} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-brand-600" />
                    <span className="font-semibold text-dark-900">{o.number}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    o.status === 'hoan_tat' ? 'bg-green-100 text-green-700' :
                    o.status === 'dang_giao' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {statusLabel[o.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-dark-500">{o.date} • {o.items} sản phẩm</span>
                  <span className="font-bold text-dark-900">{o.total ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.total) : '-'}</span>
                </div>
                <div className="w-full bg-dark-100 rounded-full h-2 mb-3 overflow-hidden">
                  <div className={`bg-brand-600 h-full rounded-full transition-all duration-700`} style={{ width: `${o.progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-dark-400 mb-2">
                  <span>Đã xử lý</span>
                  <span>{o.progress}%</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-1/2">Xem chi tiết</Button>
                  <Button size="sm" className="w-1/2">Theo dõi</Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-brand-600" />
                <h3 className="font-bold text-dark-900">Thời gian xử lý</h3>
              </div>
              <p className="text-sm text-dark-500 leading-relaxed">
                Các sản phẩm sản xuất theo đơn có thể cần thêm thời gian tùy vào
                năng lực sản xuất. Bạn sẽ được cập nhật trạng thái qua email.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Truck size={16} className="text-dark-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-dark-900">Giao hàng全国</div>
                    <div className="text-dark-500">2–5 ngày làm việc</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="text-dark-400 mt-0.5">📧</span>
                  <div>
                    <div className="font-medium text-dark-900">Thông báo đơn hàng</div>
                    <div className="text-dark-500">Quá email khi trạng thái thay đổi</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
