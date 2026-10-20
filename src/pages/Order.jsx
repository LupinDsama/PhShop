import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useOrderStore } from '../store/orders'
import { useAuth } from '../context/AuthContext'
import { createRealtimeClient } from '../lib/realtime'
import api from '../lib/api'
import {
  formatPrice, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS,
  ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE, ORDER_PROGRESS, CUSTOMER_ACTIONS,
} from '../lib/format'
import { Package, Clock, ArrowRight, Mail, XCircle, AlertCircle, RotateCcw, Radio, WifiOff, PackageSearch } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LoadingState, ErrorState, EmptyState, Pagination } from '../components/ui/States'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang sản xuất' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export default function Order() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { orders, total, page, totalPages, loading, error, fetchOrders, cancelOrder, requestReturn, applyUpdate } = useOrderStore()
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [live, setLive] = useState('connecting')
  const clientRef = useRef(null)

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true)
    try {
      const order = await api.get(`/api/orders/${encodeURIComponent(id)}`)
      setDetail(order.order)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Danh sách đơn + phân trang + lọc
  useEffect(() => {
    fetchOrders({ page: 1, limit: 10, status: status || undefined }).catch(() => {})
  }, [fetchOrders, status, user?.id])

  // Chi tiết đơn khi đi từ trang checkout
  useEffect(() => {
    if (orderId) loadDetail(orderId)
    else setDetail(null)
  }, [orderId, loadDetail])

  // Realtime: cập nhật trạng thái đơn ngay khi admin thay đổi
  useEffect(() => {
    if (!user) return undefined
    const client = createRealtimeClient({
      onStatus: ({ status: s }) => setLive(s),
      onEvent: (payload) => {
        if (!payload?.orderId) return
        fetchOrders({ page, limit: 10, status: status || undefined }).catch(() => {})
        if (orderId && payload.orderId === orderId) {
          loadDetail(orderId)
        } else {
          applyUpdate({ id: payload.orderId, status: payload.status, paymentStatus: payload.paymentStatus })
        }
      },
      // Polling dự phòng khi SSE không khả dụng
      pollFn: () => fetchOrders({ page, limit: 10, status: status || undefined }),
    })
    clientRef.current = client
    return () => client.stop()
  }, [user?.id, orderId, page, status, fetchOrders, loadDetail, applyUpdate])

  const handleCancel = async (order) => {
    setActionError(null)
    try {
      await cancelOrder(order.id)
      if (orderId === order.id) loadDetail(order.id)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleReturn = async (order) => {
    setActionError(null)
    try {
      await requestReturn(order.id, 'Khách hàng yêu cầu trả hàng.')
      if (orderId === order.id) loadDetail(order.id)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const liveBadge = useMemo(() => {
    if (live === 'connected') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
          <Radio size={12} className="animate-pulse" /> Cập nhật trực tiếp
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
        <WifiOff size={12} /> Đang đồng bộ theo chu kỳ
      </span>
    )
  }, [live])

  if (loading && !orders.length && !orderId) {
    return (
      <div className="section">
        <div className="container-page"><LoadingState label="Đang tải đơn hàng..." /></div>
      </div>
    )
  }

  // ---- Chi tiết một đơn ----
  if (orderId) {
    return (
      <div className="section">
        <div className="container-page">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-dark-900">Chi tiết đơn hàng</h2>
              {searchParams.get('placed') && (
                <p className="text-brand-600 text-sm mt-1">Đặt hàng thành công! Cảm ơn bạn đã mua sắm.</p>
              )}
            </div>
            <Link to="/order" className="text-sm text-dark-500 hover:text-brand-600">← Tất cả đơn hàng</Link>
          </div>

          {actionError && (
            <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {detailLoading && !detail && <LoadingState label="Đang tải chi tiết đơn hàng..." />}
          {detail && <OrderCard order={detail} onCancel={handleCancel} onReturn={handleReturn} detailed />}
        </div>
      </div>
    )
  }

  // ---- Danh sách đơn ----
  return (
    <div className="section">
      <div className="container-page">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Lịch sử đơn hàng</h2>
            <p className="text-dark-500 text-sm">Tổng cộng {total} đơn hàng.</p>
          </div>
          <div className="flex items-center gap-3">
            {liveBadge}
            <Link to="/products" className="text-sm text-dark-500 hover:text-brand-600 flex items-center gap-1">
              Tiếp tục mua sắm <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              onClick={() => setStatus(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                status === f.value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <ErrorState message={error} onRetry={() => fetchOrders({ page, limit: 10, status: status || undefined })} />}

        {!error && orders.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Chưa có đơn hàng"
            description="Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay."
            action={
              <Link to="/products" className="inline-flex items-center gap-2 text-brand-600 font-medium">
                Duyệt sản phẩm <ArrowRight size={18} />
              </Link>
            }
          />
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onCancel={handleCancel} onReturn={handleReturn} />
            ))}
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => fetchOrders({ page: p, limit: 10, status: status || undefined })}
            />
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-brand-600" />
                <h3 className="font-bold text-dark-900">Hướng dẫn theo dõi</h3>
              </div>
              <p className="text-sm text-dark-500 leading-relaxed">
                Các sản phẩm sản xuất theo đơn cần thêm thời gian tùy năng lực sản xuất.
                Trang này tự động cập nhật trạng thái khi nhân viên xử lý đơn.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
                ].map((s) => (
                  <div key={s} className="flex items-start gap-2">
                    <span className="text-xs font-medium text-dark-700">{ORDER_STATUS_LABELS[s]}</span>
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

function OrderCard({ order, onCancel, onReturn, detailed = false }) {
  const progress = order.progress ?? ORDER_PROGRESS[order.status] ?? 0
  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-brand-600" />
          <span className="font-semibold text-dark-900">{order.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ORDER_STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAYMENT_STATUS_BADGE[order.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500">Ngày đặt</span>
          <span className="font-medium text-dark-900">{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500">Số sản phẩm</span>
          <span className="font-medium text-dark-900">{order.itemCount} sản phẩm</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500">Thanh toán</span>
          <span className="font-medium text-dark-900">{order.paymentMethod}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500">Tổng tiền</span>
          <span className="font-bold text-brand-600 text-lg">{formatPrice(order.total)}</span>
        </div>
        {order.note && (
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-dark-500">Ghi chú</span>
            <span className="text-dark-600 text-xs italic text-right">{order.note}</span>
          </div>
        )}
        {order.publicNote && (
          <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">Thông báo: {order.publicNote}</div>
        )}
        {order.trackingNumber && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-500">Mã vận đơn</span>
            <span className="font-medium text-dark-900">{order.trackingNumber}</span>
          </div>
        )}
      </div>

      {detailed && order.items?.length > 0 && (
        <div className="border-t border-dark-100 pt-4 mb-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-dark-900">{item.name}</div>
                <div className="text-xs text-dark-500">{item.color} • {item.size} • SKU {item.sku} • x{item.quantity}</div>
                {item.note && <div className="text-xs text-brand-600">Ghi chú: {item.note}</div>}
              </div>
              <span className="font-medium text-dark-900 whitespace-nowrap">{formatPrice(item.lineTotal)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <div className="flex justify-between text-xs text-dark-400 mb-1">
          <span>Tiến độ</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-dark-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              order.status === 'DELIVERED' ? 'bg-green-600'
                : order.status === 'SHIPPED' ? 'bg-blue-600'
                  : order.status === 'PROCESSING' ? 'bg-amber-600'
                    : order.status === 'CANCELLED' ? 'bg-red-600'
                      : 'bg-brand-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {detailed && order.history?.length > 0 && (
        <div className="border-t border-dark-100 pt-4 mb-4">
          <h4 className="text-sm font-semibold text-dark-900 mb-2">Lịch sử trạng thái</h4>
          <ol className="space-y-2">
            {order.history.map((h) => (
              <li key={h.id} className="text-xs text-dark-500 flex justify-between gap-2">
                <span>
                  {h.type === 'created' ? 'Đơn hàng được tạo'
                    : h.type === 'status_change' ? `${h.fromLabel} → ${h.toLabel}`
                      : h.type === 'payment_change' ? `Thanh toán: ${h.paymentFrom} → ${h.paymentTo}`
                        : h.note || 'Ghi chú'}
                </span>
                <span className="whitespace-nowrap">{formatDate(h.createdAt)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="pt-4 border-t border-dark-100 flex flex-wrap gap-2">
        <Link to={`/order/${order.id}`}>
          <Button variant="outline" size="sm">Xem chi tiết</Button>
        </Link>
        {CUSTOMER_ACTIONS.canCancel(order.status) && (
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onCancel(order)}>
            <XCircle size={14} className="mr-1" /> Hủy đơn
          </Button>
        )}
        {CUSTOMER_ACTIONS.canReturn(order.status) && (
          <Button size="sm" variant="outline" onClick={() => onReturn(order)}>
            <RotateCcw size={14} className="mr-1" /> Yêu cầu trả hàng
          </Button>
        )}
        <span className="flex items-center gap-1 text-xs text-dark-400 ml-auto">
          <Mail size={12} /> Trạng thái được cập nhật tự động
        </span>
      </div>
    </Card>
  )
}
