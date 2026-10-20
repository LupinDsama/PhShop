# PhShop - Website Bán Mô Hình In 3D

## Giới thiệu

PhShop là nền tảng thương mại điện tử hiện đại, chuyên bán sắm các mô hình in 3D (figure, thư tượng, sưu tầm, trang trí). Dự án được xây dựng theo outline từ ChatGPT, lấy cảm hứng UI/UX từ tasteskill.dev và trải nghiệm mua sắm từ Shopee/TikTok Shop.

**🌐 Trang web:** https://phshop.pages.dev/  
**📦 Repository:** https://github.com/LupinDsama/PhShop  
**☁️ Deploy:** Cloudflare Pages (qua Wrangler)

## Công nghệ sử dụng

| Công nghệ | Mục đích |
|-----------|----------|
| React + Vite | Frontend framework |
| React Router DOM | SPA routing, URL trực tiếp |
| Tailwind CSS | Styling, thiết kế responsive |
| Framer Motion | Intro animation, chuyển trang mượt mà |
| Zustand | Quản lý trạng thái (giỏ hàng, yêu thích, đơn hàng) |
| Zustand persist | Lưu dữ liệu vào localStorage |
| Lucide React | Biểu tượng |
| React Hook Form + Zod | Xử lý form và validation |
| Wrangler | Deploy lên Cloudflare Pages |

## Cấu trúc thư mục

```
PhShop/
├── public/
│   ├── _redirects          # SPA fallback cho Cloudflare Pages
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx             # Router, AuthProvider, ScrollToTop
│   ├── main.jsx            # Entry point
│   ├── index.css           # Tailwind + custom styles
│   ├── data/
│   │   └── products.js     # Dữ liệu sản phẩm mẫu
│   ├── context/
│   │   └── AuthContext.jsx # Xác thực, phân quyền admin/customer
│   ├── store/
│   │   ├── cart.js         # Giỏ hàng (persist localStorage)
│   │   ├── wishlist.js     # Yêu thích (persist localStorage)
│   │   └── orders.js       # Đơn hàng (persist localStorage)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx  # Thanh điều hướng, badge giỏ hàng/yêu thích
│   │   │   └── Footer.jsx  # Chân trang
│   │   ├── intro/
│   │   │   └── Intro.jsx   # Intro animation tự động + nút Bỏ qua
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Input.jsx
│   │       └── utils.jsx   # cn() helper
│   └── pages/
│       ├── Home.jsx        # Trang chủ, banner, danh mục, sản phẩm nổi bật
│       ├── About.jsx       # Giới thiệu
│       ├── Products.jsx    # Danh sách sản phẩm, lọc/tìm kiếm
│       ├── ProductDetail.jsx # Chi tiết sản phẩm, chọn biến thể, thêm giỏ
│       ├── Cart.jsx        # Giỏ hàng, điều chỉnh số lượng, tổng tiền
│       ├── Wishlist.jsx    # Danh sách yêu thích
│       ├── Login.jsx       # Đăng nhập (admin/customer)
│       ├── Register.jsx    # Đăng ký tài khoản
│       ├── Checkout.jsx    # Thanh toán, tạo đơn hàng thật
│       ├── Order.jsx       # Lịch sử đơn hàng của user
│       ├── Admin.jsx       # Bảng điều khiển admin (chỉ nhantk123vip@gmail.com)
│       ├── Contact.jsx     # Liên hệ
│       └── Profile.jsx     # Hồ sơ người dùng
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── wrangler.toml           # Cấu hình Cloudflare Pages
├── .gitignore
└── package.json
```

## Tính năng chính

### 1. Giao diện & trải nghiệm người dùng
- **Intro animation** tự động khi lần đầu vào trang (3 bước: hình sản phẩm → thiết kế tối giản → bắt đầu mua sắm), có nút **Bỏ qua**.
- Thiết kế hiện đại, tối giản, màu xanh lá cây (brand).
- Responsive trên mobile, tablet, desktop.
- Chuyển trang SPA mượt mà, URL trực tiếp.

### 2. Sản phẩm
- Danh sách sản phẩm với tìm kiếm và lọc theo danh mục (Figure, Trang trí, Sưu tầm).
- Trang chi tiết sản phẩm: gallery ảnh, chọn biến thể (màu sắc, kích thước, SKU, giá, tồn kho), số lượng, ghi chú, sao đánh giá, sản phẩm tương tự.
- Thêm vào giỏ hàng, lưu yêu thích (❤️).

### 3. Giỏ hàng & yêu thích
- Giỏ hàng lưu vào `localStorage` → không mất khi refresh/thoát web.
- Badge số trên icon giỏ hàng và yêu thích cập nhật real-time.
- Điều chỉnh số lượng, xóa sản phẩm, ghi chú đơn hàng.
- Tóm tắt tiền hàng, phí vận chuyển miễn phí.

### 4. Xác thực & phân quyền
- Đăng nhập / Đăng ký tài khoản.
- Email `nhantk123vip@gmail.com` được gán quyền **admin**.
- Các email khác là **customer**.
- Chỉ admin mới truy cập `/admin`.

### 5. Đơn hàng & thanh toán
- Checkout: thông tin giao hàng, hình thức thanh toán (COD / MoMo).
- Tạo đơn hàng thật với mã đơn, email, tổng tiền, trạng thái `moi_tao`.
- Trang `/order`: lịch sử đơn hàng của user, tiến độ xử lý, trạng thái.
- Trạng thái đơn hàng: Mới tạo → Đã xác nhận → Đang sản xuất → Đang giao → Hoàn tất / Đã hủy.

### 6. Admin Dashboard (chỉ admin)
- Thống kê: tổng đơn hàng, doanh thu, sản phẩm active, khách hàng mới.
- Tab Đơn hàng: bảng danh sách đơn hàng, dropdown **cập nhật trạng thái** đơn hàng cho từng khách hàng.
- Tab Sản phẩm, Khách hàng, Cài đặt (sắp phát triển).

## Cài đặt & chạy local

```bash
# Clone repository
git clone https://github.com/LupinDsama/PhShop.git
cd PhShop

# Cài dependencies
npm install

# Chạy phát triển
npm run dev

# Build sản xuất
npm run build

# Xem trước build
npm run preview
```

## Deploy lên Cloudflare Pages

Dự án đã được cấu hình sẵn trong `wrangler.toml`:

```toml
name = "phshop"
compatibility_date = "2026-10-20"

[assets]
  directory = "./dist"

[observability]
  enabled = true
```

Lệnh deploy:

```bash
npx wrangler pages deploy dist --project-name phshop
```

Trang web sẽ có sẵn tại: `https://phshop.pages.dev/`

## Lưu ý quan trọng

- Dữ liệu đơn hàng, giỏ hàng, yêu thích được lưu trong `localStorage` của trình duyệt (không có backend server thực).
- Trạng thái đăng nhập được lưu trong `localStorage` với thời gian hết hạn **48 giờ** — người dùng không bị đăng xuất khi refresh trang hoặc đóng/mở lại tab.
- Trạng thái đơn hàng có thể được cập nhật từ Admin Dashboard và sẽ hiển thị ngay trên trang `/order` của khách hàng.
- Email admin mặc định: `nhantk123vip@gmail.com`.

## License

MIT