import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { formatPrice, formatDate } from '../../lib/format'
import { ScrollText, AlertCircle, CheckCircle2, Ticket, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'

export function AuditTab() {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (action.trim()) params.set('action', action.trim())
      const result = await api.get(`/api/admin/audit?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [action, page])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h3 className="font-bold text-dark-900">Lịch sử hoạt động quản trị ({data.total})</h3>
        <Input
          placeholder="Lọc theo hành động, ví dụ: order."
          value={action}
          onChange={(e) => { setPage(1); setAction(e.target.value) }}
          className="w-64"
          aria-label="Lọc audit log"
        />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data.entries.length === 0 && (
        <EmptyState icon={ScrollText} title="Chưa có hoạt động nào được ghi nhận" />
      )}

      {!loading && !error && data.entries.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="px-3 py-3 font-medium text-dark-500">Thời gian</th>
                <th className="px-3 py-3 font-medium text-dark-500">Người thực hiện</th>
                <th className="px-3 py-3 font-medium text-dark-500">Hành động</th>
                <th className="px-3 py-3 font-medium text-dark-500">Đối tượng</th>
                <th className="px-3 py-3 font-medium text-dark-500">Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {data.entries.map((e) => (
                <tr key={e.id} className="hover:bg-dark-50">
                  <td className="px-3 py-2 text-xs text-dark-500 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td className="px-3 py-2 text-dark-700">{e.actorEmail || 'SYSTEM'}<span className="block text-xs text-dark-400">{e.actorRole}</span></td>
                  <td className="px-3 py-2"><code className="text-xs bg-dark-100 rounded px-1.5 py-0.5">{e.action}</code></td>
                  <td className="px-3 py-2 text-xs text-dark-500">{e.entityType} {e.entityId}</td>
                  <td className="px-3 py-2 text-xs text-dark-500 max-w-xs truncate">
                    {e.before && <span className="text-red-500">{JSON.stringify(e.before)}</span>}
                    {e.before && e.after && ' → '}
                    {e.after && <span className="text-brand-600">{JSON.stringify(e.after)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
          <span className="text-sm text-dark-600">Trang {data.page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
        </div>
      )}
    </div>
  )
}

export function CouponsTab() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, usageLimit: 0, active: true })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/api/admin/coupons')
      setCoupons(data.coupons || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    setMessage(null)
    try {
      await api.post('/api/admin/coupons', {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxDiscount: Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit),
        active: form.active,
      })
      setMessage({ type: 'success', text: 'Đã tạo mã giảm giá.' })
      setForm({ code: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, usageLimit: 0, active: true })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const toggle = async (coupon) => {
    setMessage(null)
    try {
      await api.patch(`/api/admin/coupons/${coupon.code}`, { active: !coupon.active })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div>
      <h3 className="font-bold text-dark-900 mb-6">Mã giảm giá</h3>

      {message && (
        <div role="status" className={`flex items-start gap-2 mb-4 p-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="p-4 mb-6">
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Mã</label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PHSHOP20" required />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Loại</label>
            <select className="w-full h-10 rounded-xl border border-dark-200 bg-white px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">percent</option>
              <option value="fixed">fixed</option>
              <option value="free_shipping">free_shipping</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Giá trị</label>
            <Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Đơn tối thiểu</label>
            <Input type="number" min={0} value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Giảm tối đa</label>
            <Input type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
          </div>
          <Button type="submit"><Plus size={16} className="mr-1" /> Tạo</Button>
        </form>
      </Card>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && coupons.length === 0 && (
        <EmptyState icon={Ticket} title="Chưa có mã giảm giá" />
      )}

      {!loading && !error && coupons.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="px-3 py-3 font-medium text-dark-500">Mã</th>
                <th className="px-3 py-3 font-medium text-dark-500">Loại</th>
                <th className="px-3 py-3 font-medium text-dark-500">Giá trị</th>
                <th className="px-3 py-3 font-medium text-dark-500">Tối thiểu</th>
                <th className="px-3 py-3 font-medium text-dark-500">Đã dùng</th>
                <th className="px-3 py-3 font-medium text-dark-500">Trạng thái</th>
                <th className="px-3 py-3 font-medium text-dark-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {coupons.map((c) => (
                <tr key={c.code}>
                  <td className="px-3 py-2 font-medium text-dark-900">{c.code}</td>
                  <td className="px-3 py-2 text-dark-600">{c.type}</td>
                  <td className="px-3 py-2 text-dark-600">{c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? formatPrice(c.value) : 'Miễn phí ship'}</td>
                  <td className="px-3 py-2 text-dark-600">{formatPrice(c.minOrder)}</td>
                  <td className="px-3 py-2 text-dark-600">{c.usedCount}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {c.active ? 'Đang chạy' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => toggle(c)}>{c.active ? 'Tạm dừng' : 'Kích hoạt'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
