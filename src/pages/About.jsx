import { Link } from 'react-router-dom'
import { User, Truck, Headphones, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'

export default function About() {
  const info = [
    {
      icon: <User className="w-6 h-6" />,
      title: 'Về PhShop',
      desc: 'PhShop là nền tảng mua sắm mô hình in 3D hiện đại, dành cho người sưu tầm figure, đồ trang trí và quà tặng.',
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: 'Giao hàng nhanh',
      desc: 'Quy trình từ đặt hàng đến nhận hàng rõ ràng, theo dõi trạng thái đơn từng bước.',
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: 'Hỗ trợ dedicated',
      desc: 'Đội ngũ hỗ trợ luôn sẵn sàng giải đáp về sản phẩm in 3D tùy chỉnh.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Tùy chỉnh theo yêu cầu',
      desc: 'In 3D mô hình theo yêu cầu của bạn, màu sắc và kích thước đa dạng.',
    },
  ]

  return (
    <div className="section">
      <div className="container-page">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-dark-900 mb-4">Về chúng tôi</h2>
          <p className="text-dark-600 lg:max-w-2xl mx-auto">
            Chúng tôi xây dựng trải nghiệm mua sắm mô hình 3D với thiết kế tối giản,
            hoạt ảnh mượt mà và quy trình đặt hàng rõ ràng — lấy cảm hứng từ các sàn
            thương mại điện tử hiện đại.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {info.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-brand-600 mb-3">
                  {item.icon}
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-dark-900 p-8 md:p-12 text-white">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold mb-4">Sẵn sàng bắt đầu sưu tầm?</h3>
            <p className="text-dark-300 mb-6">Duyệt bộ sưu tập mô hình in 3D và đặt hàng trong vài giây.</p>
            <Link to="/products" className="inline-block px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-400 transition">
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
