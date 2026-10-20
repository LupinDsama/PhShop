import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Clock, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Contact() {
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
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.'); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-700">Họ tên</label>
                    <Input placeholder="Nguyễn Văn A" required />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-700">Email</label>
                    <Input type="email" placeholder="email@example.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                  <Input type="tel" placeholder="09xxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-700">Nội dung tin nhắn</label>
                  <textarea
                    className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    rows={4}
                    placeholder="Nhập nội dung tại đây..."
                    required
                  ></textarea>
                </div>
                <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg">
                  Gửi tin nhắn <ArrowRight size={20} />
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
                    <div className="text-dark-500 text-sm">123 Đường incong, Quận 1, Thành phố Hồ Chí Minh</div>
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
              <div className="pt-4 border-t border-dark-100">
                <p className="text-sm text-dark-500 mb-3">Liên kết xã hội</p>
                <div className="flex gap-3">
                  <a href="#" className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center hover:bg-brand-600 hover:text-white transition">F</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center hover:bg-brand-600 hover:text-white transition">I</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center hover:bg-brand-600 hover:text-white transition">T</a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
