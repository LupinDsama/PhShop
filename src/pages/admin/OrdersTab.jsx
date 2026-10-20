import { useState, useEffect, useCallback, Fragment } from 'react'

import api from '../../lib/api'
import { formatPrice, formatDate } from '../../lib/format'
import { Search, ChevronDown, ChevronUp, AlertCircle, RefreshCw, PackageSearch } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'

const STATUS_OPTIONS = [
  { value: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang sản xuất' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'RETURN_REQUESTED', label: 'Yêu cầu trả hàng' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
  { value: 'REFUND_PENDING', label: 'Đang hoàn tiền' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
]

const PAYMENT_OPTIONS = [
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
]

const BADGE = {
  PENDING_CONFIRMATION: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-700',
  RETURNED: 'bg-purple-100 text-purple-700',
  REFUND_PENDING: 'bg-yellow-100 text-yellow-700',
  REFUNDED: 'bg-green-100 text-green-700',
}

export default function OrdersTab() {
  const [data, setData] = useState({ orders: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ q: '', status: '', paymentStatus: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [note, setNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [publicNote, setPublicNote] = useState('')
  const [tracking, setTracking] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
      const result = await api.get(`/api/admin/orders?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const openDetail = async (order) => {
    setExpanded(order.id)
    setActionError(null)
    try {
      const result = await api.get(`/api/admin/orders/${order.id}`)
      setDetail(result.order)
      setNote('')
      setInternalNote(result.order.internalNote || '')
      setPublicNote(result.order.publicNote || '')
      setTracking(result.order.trackingNumber || '')
    } catch (err) {
      setActionError(err.message)
    }
  }

  const updateOrder = async (orderId, payload) => {
    setSaving(true)
    setActionError(null)
    try {
      const result = await api.patch(`/api/admin/orders/${orderId}`, payload)
      setDetail(result.order)
      await load()
      return result.order
    } catch (err) {
      setActionError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (order, status) => {
    if (!status || status === order.status) return
    try {
      await updateOrder(order.id, { status })
    } catch {
      await load()
    }
  }

  const handlePaymentChange = async (order, paymentStatus) => {
    if (!paymentStatus || paymentStatus === order.paymentStatus) return
    try {
      await updateOrder(order.id, { paymentStatus })
    } catch {
      await load()
    }
  }

  return (
    <div>
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm theo mã đơn, email, tên, SĐT..."
              className="pl-9"
              value={filters.q}
              onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }) }}
            />
          </div>
          <select
            className="text-sm bg-white border border-dark-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={filters.status}
            onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }) }}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            className="text-sm bg-white border border-dark-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={filters.paymentStatus}
            onChange={(e) => { setPage(1); setFilters({ ...filters, paymentStatus: e.target.value }) }}
            aria-label="Lọc theo thanh toán"
          >
            <option value="">Tất cả thanh toán</option>
            {PAYMENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <Input type="date" value={filters.from} onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }) }} aria-label="Từ ngày" />
            <Input type="date" value={filters.to} onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }) }} aria-label="Đến ngày" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-dark-500">Tổng {data.total} đơn hàng</p>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} className="mr-1" /> Làm mới</Button>
        </div>
      </Card>

      {actionError && (
        <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading && <LoadingState label="Đang tải danh sách đơn hàng..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data.orders.length === 0 && (
        <EmptyState icon={PackageSearch} title="Không có đơn hàng phù hợp" description="Thử xoá bộ lọc để xem toàn bộ đơn hàng." />
      )}

      {!loading && !error && data.orders.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="px-3 py-3 font-medium text-dark-500">Mã đơn</th>
                <th className="px-3 py-3 font-medium text-dark-500">Khách hàng</th>
                <th className="px-3 py-3 font-medium text-dark-500">Tổng tiền</th>
                <th className="px-3 py-3 font-medium text-dark-500">Trạng thái</th>
                <th className="px-3 py-3 font-medium text-dark-500">Thanh toán</th>
                <th className="px-3 py-3 font-medium text-dark-500">Ngày</th>
                <th className="px-3 py-3 font-medium text-dark-500">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {data.orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="hover:bg-dark-50 transition">
                    <td className="px-3 py-3 font-medium text-dark-900">{o.id}</td>
                    <td className="px-3 py-3">
                      <div className="text-dark-800">{o.recipient}</div>
                      <div className="text-xs text-dark-400">{o.email}</div>
                    </td>
                    <td className="px-3 py-3 font-medium text-dark-900 whitespace-nowrap">{formatPrice(o.total)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE[o.status]}`}>
                        {STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-dark-600 whitespace-nowrap">
                        {PAYMENT_OPTIONS.find((s) => s.value === o.paymentStatus)?.label || o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-dark-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => (expanded === o.id ? setExpanded(null) : openDetail(o))}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        {expanded === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Chi tiết
                      </button>
                    </td>
                  </tr>
                  {expanded === o.id && detail?.id === o.id && (
                    <tr>
                      <td colSpan={7} className="px-3 pb-5">                        <div className="grid lg:grid-cols-2 gap-6 bg-dark-50 rounded-xl p-5">
                          <div>
                            <h4 className="font-semibold text-dark-900 mb-2">Sản phẩm</h4>
                            <ul className="space-y-2 text-sm">
                              {detail.items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-3">
                                  <span className="text-dark-700">
                                    {item.name} ({item.color} • {item.size}) x{item.quantity}
                                    {item.note && <em className="block text-xs text-brand-600">Ghi chú: {item.note}</em>}
                                  </span>
                                  <span className="whitespace-nowrap">{formatPrice(item.lineTotal)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-dark-600">
                              <div>Người nhận: {detail.recipient}</div>
                              <div>SĐT: {detail.phone}</div>
                              <div className="col-span-2">Địa chỉ: {detail.address}</div>
                              {detail.note && <div className="col-span-2">Ghi chú khách: {detail.note}</div>}
                              {detail.trackingNumber && <div className="col-span-2">Mã vận đơn: {detail.trackingNumber}</div>}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-dark-900 mb-2">Cập nhật trạng thái</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                className="text-sm bg-white border border-dark-200 rounded-xl px-3 py-2"
                                value={detail.status}
                                onChange={(e) => handleStatusChange(detail, e.target.value)}
                                aria-label="Trạng thái đơn"
                              >
                                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <select
                                className="text-sm bg-white border border-dark-200 rounded-xl px-3 py-2"
                                value={detail.paymentStatus}
                                onChange={(e) => handlePaymentChange(detail, e.target.value)}
                                aria-label="Trạng thái thanh toán"
                              >
                                {PAYMENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Input placeholder="Mã vận đơn" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                              <Input placeholder="Ghi chú công khai (khách thấy)" value={publicNote} onChange={(e) => setPublicNote(e.target.value)} />
                              <Input placeholder="Ghi chú nội bộ (chỉ admin)" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
                              <Input placeholder="Ghi chú cho lịch sử" value={note} onChange={(e) => setNote(e.target.value)} />
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={() => updateOrder(detail.id, {
                                  note: note.trim(),
                                  publicNote: publicNote.trim(),
                                  internalNote: internalNote.trim(),
                                  trackingNumber: tracking.trim(),
                                })}
                              >
                                {saving ? 'Đang lưu...' : 'Lưu ghi chú'}
                              </Button>
                            </div>

                            <h4 className="font-semibold text-dark-900 mt-4 mb-2">Lịch sử thay đổi</h4>
                            <ol className="space-y-1 text-xs text-dark-500 max-h-40 overflow-y-auto">
                              {detail.history?.map((h) => (
                                <li key={h.id} className="flex justify-between gap-2 border-b border-dark-100 pb-1">
                                  <span>
                                    {h.type === 'created' ? 'Đơn tạo'
                                      : h.type === 'status_change' ? `${h.fromLabel} → ${h.toLabel}`
                                        : h.type === 'payment_change' ? `Thanh toán: ${h.paymentFrom} → ${h.paymentTo}`
                                          : h.note}
                                  </span>
                                  <span className="whitespace-nowrap">{formatDate(h.createdAt)}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
