import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { formatPrice, formatDate } from '../../lib/format'
import { Package, Star, Users, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'

import { LoadingState, ErrorState } from '../../components/ui/States'

export default function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/api/admin/stats')
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState label="Đang tải số liệu..." />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!stats) return null

  const cards = [
    { label: 'Tổng đơn hàng', value: stats.totals.orders, icon: <Package className="w-5 h-5" />, color: 'text-brand-600' },
    { label: 'Doanh thu đã thu', value: formatPrice(stats.totals.revenue), icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-600' },
    { label: 'Sản phẩm active', value: stats.totals.activeProducts, icon: <Star className="w-5 h-5" />, color: 'text-blue-600' },
    { label: 'Khách hàng', value: stats.totals.customers, icon: <Users className="w-5 h-5" />, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-1">{c.label}</div>
                <div className="text-2xl font-bold text-dark-900">{c.value}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center">{c.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-dark-900 mb-4">Đơn chờ xử lý</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-dark-500">Chờ xác nhận</span><span className="font-medium">{stats.totals.pendingOrders}</span></div>
            <div className="flex justify-between"><span className="text-dark-500">Đơn đã thu tiền</span><span className="font-medium">{stats.totals.paidOrders}</span></div>
            <div className="flex justify-between"><span className="text-dark-500">Giá trị đơn TB</span><span className="font-medium">{formatPrice(stats.totals.averageOrderValue)}</span></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-dark-900 mb-4">Trạng thái đơn hàng</h3>
          <div className="space-y-2 text-sm">
            {stats.byStatus.filter((s) => s.count > 0).map((s) => (
              <div key={s.status} className="flex justify-between">
                <span className="text-dark-500">{s.status}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
            {stats.byStatus.every((s) => s.count === 0) && <p className="text-sm text-dark-400">Chưa có đơn hàng.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-dark-900 mb-4">Cảnh báo tồn kho</h3>
          <div className="space-y-2 text-sm">
            {stats.lowStock.map((v) => (
              <div key={v.id} className="flex justify-between gap-2">
                <span className="text-dark-600 truncate">{v.name}</span>
                <span className={`font-medium ${v.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{v.stock}</span>
              </div>
            ))}
            {stats.lowStock.length === 0 && <p className="text-sm text-dark-400">Tồn kho đang ổn định.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-dark-900 mb-4">Đơn hàng gần đây</h3>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-dark-400">Chưa có đơn hàng nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dark-100">
                  <th className="px-3 py-2 font-medium text-dark-500">Mã đơn</th>
                  <th className="px-3 py-2 font-medium text-dark-500">Khách hàng</th>
                  <th className="px-3 py-2 font-medium text-dark-500">Tổng tiền</th>
                  <th className="px-3 py-2 font-medium text-dark-500">Trạng thái</th>
                  <th className="px-3 py-2 font-medium text-dark-500">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 font-medium text-dark-900">{o.id}</td>
                    <td className="px-3 py-2 text-dark-600">{o.recipient}</td>
                    <td className="px-3 py-2 text-dark-900">{formatPrice(o.total)}</td>
                    <td className="px-3 py-2 text-dark-600">{o.statusLabel}</td>
                    <td className="px-3 py-2 text-xs text-dark-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
