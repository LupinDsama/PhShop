import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setStatus(null)
    try {
      const data = await api.post('/api/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      })
      setStatus(data.message)
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-dark-900 mb-4">Liên hệ với chúng tôi</h2>
          <p className="text-dark-600 lg:max-w-xl mx-auto">
            Có câu hỏi về mô hình in 3D, đơn hàng hoặc muốn đặt sản phẩm tùy chỉnh?
            Gửi tin nhắn cho chúng tôi, chúng tôi sẽ phản hồi sớm nhất có thể.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <Card className="p-8">
              {error && (
                <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {status && (
                <div role="status" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-brand-50 text-brand-700 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{status}</span>
                </div>
              )}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label htmlFor="ct-name" className="block text-sm font-medium text-dark-700">Họ tên</label>
                    <Input id="ct-name" placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="ct-email" className="block text-sm font-medium text-dark-700">Email</label>
                    <Input id="ct-email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ct-phone" className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                  <Input id="ct-phone" type="tel" placeholder="09xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ct-message" className="block text-sm font-medium text-dark-700">Nội dung tin nhắn</label>
                  <textarea
                    id="ct-message"
                    className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    rows={4}
                    maxLength={4000}
                    placeholder="Nhập nội dung tại đây..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    minLength={10}
                  ></textarea>
                </div>
                <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg" disabled={sending}>
                  {sending ? 'Đang gửi...' : 'Gửi tin nhắn'} <ArrowRight size={20} />
                </Button>
              </form>
            </Card>
          </div>
          <div className="lg:col-span-5">
            <Card className="p-8 space-y-6">
              <h3 className="font-bold text-dark-900">Thông tin liên hệ</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-brand-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-dark-900">Email hỗ trợ</div>
                    <div className="text-dark-500 text-sm">support@phshop.example</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-brand-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-dark-900">Hotline</div>
                    <div className="text-dark-500 text-sm">0900 123 456</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-brand-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-dark-900">Địa chỉ</div>
                    <div className="text-dark-500 text-sm">123 Đường không cong, Quận 1, Thành phố Hồ Chí Minh</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-brand-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-dark-900">Giờ làm việc</div>
                    <div className="text-dark-500 text-sm">Thứ 2 – Chủ nhật: 8:00 – 21:00</div>
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
