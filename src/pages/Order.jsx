import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Package, Clock, Truck, ArrowRight, Mail, CheckCircle2, XCircle } from 'lucide-react'
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
      id: 'PH20261020001',
      number: 'PH20261020001',
      customerEmail: 'nhantk123vip@gmail.com',
      status: 'hoan_tat',
      date: '20/10/2026',
      total: 570000,
      items: 2,
      progress: 100,
      note: 'Giao hàng vào sáng sớm',
      payment: 'COD',
    },
    {
      id: 'PH20261018002',
      number: 'PH20261018002',
      customerEmail: 'nhantk123vip@gmail.com',
      status: 'dang_giao',
      date: '18/10/2026',
      total: 250000,
      items: 1,
      progress: 80,
      note: 'Đóng gói quà tặng',
      payment: 'MoMo',
    },
    {
      id: 'PH20261015003',
      number: 'PH20261015003',
      customerEmail: 'nhantk123vip@gmail.com',
      status: 'dang_san_xuat',
      date: '15/10/2026',
      total: 420000,
      items: 1,
      progress: 50,
      note: 'Sản xuất theo yêu cầu',
      payment: 'COD',
    },
    {
      id: 'PH20261012004',
      number: 'PH20261012004',
      customerEmail: 'nhantk123vip@gmail.com',
      status: 'da_huy',
      date: '12/10/2026',
      total: 180000,
      items: 1,
      progress: 0,
      note: 'Khách hàng hủy',
      payment: 'MoMo',
    },
  ]

  const statusConfig = {
    moi_tao: { label: 'Mới tạo', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} />, step: 25 },
    xac_nhan: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 size={14} />, step: 50 },
    dang_san_xuat: { label: 'Đang sản xuất', color: 'bg-amber-100 text-amber-700', icon: <Package size={14} />, step: 75 },
    dang_giao: { label: 'Đang giao', color: 'bg-blue-100 text-blue-700', icon: <Truck size={14} />, step: 90 },
    hoan_tat: { label: 'Hoàn tất', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} />, step: 100 },
    da_huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} />, step: 0 },
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
            {orders.length === 0 ? (
              <div className="max-w-md mx-auto text-center py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Package size={32} />
                </div>
                <h2 className="text-2xl font-bold text-dark-900 mb-2">Chưa có đơn hàng</h2>
                <p className="text-gray-500 mb-8">Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay.</p>
                <Link to="/products" className="inline-flex items-center gap-2 text-brand-600 font-medium">
                  Duyệt sản phẩm <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <>
                {orders.map((o) => {
                  const cfg = statusConfig[o.status]
                  return (
                    <Card key={o.id} className="p-6 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-brand-600" />
                          <span className="font-semibold text-dark-900">{o.number}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500">Ngày đặt</span>
                          <span className="font-medium text-dark-900">{o.date}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500">Số sản phẩm</span>
                          <span className="font-medium text-dark-900">{o.items} sản phẩm</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500">Thanh toán</span>
                          <span className="font-medium text-dark-900">{o.payment}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500">Tổng tiền</span>
                          <span className="font-bold text-brand-600 text-lg">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.total)}
                          </span>
                        </div>
                        {o.note && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-dark-500">Ghi chú</span>
                            <span className="text-dark-600 text-xs italic">{o.note}</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-dark-400 mb-1">
                          <span>Tiến độ</span>
                          <span>{cfg.step}%</span>
                        </div>
                        <div className="w-full bg-dark-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              o.status === 'hoan_tat' ? 'bg-green-600' :
                              o.status === 'dang_giao' ? 'bg-blue-600' :
                              o.status === 'dang_san_xuat' ? 'bg-amber-600' :
                              o.status === 'da_huy' ? 'bg-red-600' :
                              'bg-brand-600'
                            }`}
                            style={{ width: `${cfg.step}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dark-100">
                        <div className="flex items-center gap-2 text-sm text-dark-500 mb-2">
                          <Mail size={14} className="mt-0.5" />
                          <span>Chúng tôi sẽ thông báo qua email khi trạng thái đơn hàng thay đổi.</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="w-1/2">Xem chi tiết</Button>
                          <Button size="sm" className="w-1/2">Theo dõi</Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </>
            )}
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-brand-600" />
                <h3 className="font-bold text-dark-900">Hướng dẫn theo dõi</h3>
              </div>
              <p className="text-sm text-dark-500 leading-relaxed">
                Các sản phẩm sản xuất theo đơn có thể cần thêm thời gian tùy vào
                năng lực sản xuất. Bạn sẽ được cập nhật trạng thái qua email.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Mới tạo', desc: 'Đơn hàng đã được ghi nhận, chờ xác nhận.' },
                  { label: 'Đã xác nhận', desc: 'Đơn hàng đã được xác nhận và đang chuẩn bị.' },
                  { label: 'Đang sản xuất', desc: 'Sản phẩm đang được in 3D theo yêu cầu.' },
                  { label: 'Đang giao', desc: 'Đơn hàng đang trên đường giao đến bạn.' },
                  { label: 'Hoàn tất', desc: 'Đơn hàng đã giao thành công.' },
                  { label: 'Đã hủy', desc: 'Đơn hàng đã bị hủy.' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-medium text-dark-700">{s.label}</span>
                    <span className="text-xs text-dark-500 ml-1">{s.desc}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
