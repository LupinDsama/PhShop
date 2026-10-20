import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui/States'

export default function NotFound() {
  return (
    <div className="section">
      <div className="container-page">
        <EmptyState
          icon={Compass}
          title="Không tìm thấy trang bạn cần"
          description="Đường dẫn không tồn tại hoặc đã bị di chuyển. Hãy quay lại trang chủ hoặc xem danh mục sản phẩm."
          action={
            <Link to="/products" className="text-brand-600 font-medium hover:underline">
              Xem sản phẩm
            </Link>
          }
        />
      </div>
    </div>
  )
}
