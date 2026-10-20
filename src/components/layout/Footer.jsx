export default function Footer() {
  return (
    <footer className="border-t border-dark-800 bg-dark-900 text-dark-200 mt-auto">
      <div className="container-page py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">P</div>
              <span className="font-display font-bold text-white text-lg">PhShop</span>
            </div>
            <p className="text-sm text-dark-400 max-w-xs">
              Website bán mô hình in 3D hiện đại, từ figure, sưu tầm đến trang trí.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Sản phẩm</h4>
            <ul className="space-y-2 text-sm text-dark-300">
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Figure & Nhân vật</a></li>
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Trang trí & Thư tượng</a></li>
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Sưu tầm</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm text-dark-300">
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Hướng dẫn mua hàng</a></li>
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Chính sách đổi trả</a></li>
              <li><a href="#" className="text-dark-300 hover:text-brand-400 transition">Liên hệ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Kết nối</h4>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center hover:bg-brand-600 transition">F</a>
              <a href="#" className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center hover:bg-brand-600 transition">I</a>
              <a href="#" className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center hover:bg-brand-600 transition">T</a>
            </div>
          </div>
        </div>
        <div className="border-t border-dark-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-dark-400">
          <span>© {new Date().getFullYear()} PhShop. Mua sắm mô hình 3D.</span>
          <span>Hoạt động trên Cloudflare Pages</span>
        </div>
      </div>
    </footer>
  )
}
