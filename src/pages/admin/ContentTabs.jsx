import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Star, MessageSquare, Eye, EyeOff, Mail, Phone, AlertCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'

export function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/api/admin/reviews')
      setReviews(data.reviews || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (review) => {
    setMessage(null)
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { status: review.status === 'published' ? 'hidden' : 'published' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div>
      <h3 className="font-bold text-dark-900 mb-6">Quản lý đánh giá & nội dung ({reviews.length})</h3>

      {message && (
        <div role="status" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && reviews.length === 0 && (
        <EmptyState icon={Star} title="Chưa có đánh giá nào" description="Đánh giá của khách hàng sẽ hiển thị tại đây." />
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-dark-900 text-sm">{r.author}</div>
                <div className="flex gap-0.5 text-amber-400">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} size={12} className="fill-amber-400" />)}
                </div>
              </div>
              <p className="text-sm text-dark-600 mb-2">{r.comment || '(không có nhận xét)'}</p>
              <p className="text-xs text-dark-400 mb-3">{r.productName} • {formatDate(r.createdAt)}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {r.status}
                </span>
                <Button size="sm" variant="outline" onClick={() => toggle(r)}>
                  {r.status === 'published' ? <><EyeOff size={14} className="mr-1" /> Ẩn</> : <><Eye size={14} className="mr-1" /> Hiện</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function MessagesTab() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/api/admin/contact')
      setMessages(data.messages || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h3 className="font-bold text-dark-900 mb-6">Yêu cầu liên hệ / sản xuất riêng ({messages.length})</h3>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && messages.length === 0 && (
        <EmptyState icon={MessageSquare} title="Chưa có tin nhắn nào" description="Các yêu cầu từ form liên hệ sẽ hiển thị tại đây." />
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-dark-900 text-sm">{m.name}</div>
                <span className="text-xs text-dark-400">{formatDate(m.createdAt)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-dark-500 mb-2">
                <span className="flex items-center gap-1"><Mail size={12} /> {m.email}</span>
                {m.phone && <span className="flex items-center gap-1"><Phone size={12} /> {m.phone}</span>}
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold">{m.status}</span>
              </div>
              <p className="text-sm text-dark-600 whitespace-pre-wrap">{m.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
