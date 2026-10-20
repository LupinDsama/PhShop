export default function Admin() {
  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-dark-900">Bảng điều khiển Admin</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-2xl border border-dark-100 bg-white">
            <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-1">Tổng đơn hàng</div>
            <div className="text-2xl font-bold text-dark-900">24</div>
          </div>
          <div className="p-6 rounded-2xl border border-dark-100 bg-white">
            <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-1">Doanh thu hôm nay</div>
            <div className="text-2xl font-bold text-brand-600">12.400.000 ₫</div>
          </div>
          <div className="p-6 rounded-2xl border border-dark-100 bg-white">
            <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-1">Sản phẩm</div>
            <div className="text-2xl font-bold text-dark-900">18</div>
          </div>
        </div>
        <div className="rounded-2xl border border-dark-100 bg-white overflow-hidden">
          <div className="p-6 border-b border-dark-100">
            <h3 className="font-bold text-dark-900">Đơn hàng gần đây</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-100">
                  <th className="px-6 py-3 text-xs font-semibold text-dark-500 uppercase">Mã đơn</th>
                  <th className="px-6 py-3 text-xs font-semibold text-dark-500 uppercase">Khách hàng</th>
                  <th className="px-6 py-3 text-xs font-semibold text-dark-500 uppercase">Tổng tiền</th>
                  <th className="px-6 py-3 text-xs font-semibold text-dark-500 uppercase">Trạng thái</th>
                  <th className="px-6 py-3 text-xs font-semibold text-dark-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {[
                  { id: 'PH001', customer: 'Nguyễn Văn A', total: '250.000 ₫', status: 'Hoàn tất' },
                  { id: 'PH002', customer: 'Trần Thị B', total: '420.000 ₫', status: 'Đang giao' },
                  { id: 'PH003', customer: 'Lê Văn C', total: '180.000 ₫', status: 'Đang sản xuất' },
                ].map((o) => (
                  <tr key={o.id} className="hover:bg-dark-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-dark-900">{o.id}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{o.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium text-dark-900">{o.total}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        o.status === 'Hoàn tất' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-500">Xem chi tiết</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-10 rounded-2xl border border-dark-100 bg-white p-6">
          <h3 className="font-bold text-dark-900 mb-4">Quản lý sản phẩm (sắp triển khai)</h3>
          <p className="text-dark-500 text-sm">
            Chức năng thêm/sửa/xóa sản phẩm, quản lý tồn kho, SKU và mã giảm giá
            sẽ được phát triển trong giai đoạn sau theo outline.
          </p>
        </div>
      </div>
    </div>
  )
}
