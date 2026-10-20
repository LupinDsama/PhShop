# PhShop - Website Bán Mô Hình In 3D

## Giới thiệu

PhShop là nền tảng thương mại điện tử bán mô hình in 3D (figure, thư tượng, sưu tầm, trang trí).
Dự án gồm **frontend React (SPA)** + **backend Node.js API** + **database SQLite**, với
quản lý phân quyền (RBAC), realtime (SSE) và bộ kiểm thử tự động.

**🌐 Trang web:** https://phshop.pages.dev/
**📦 Repository:** https://github.com/LupinDsama/PhShop
**☁️ Deploy:** Cloudflare Pages (frontend) + Node host (backend API)

> ⚠️ Tài liệu kiểm toán đầy đủ: [`docs/ECOMMERCE_AUDIT.md`](docs/ECOMMERCE_AUDIT.md) ·
> [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) ·
> [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) ·
> [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) ·
> [`docs/ECOMMERCE_TASKS.md`](docs/ECOMMERCE_TASKS.md)

## Công nghệ sử dụng

| Công nghệ | Mục đích |
|-----------|----------|
| React 19 + Vite 8 | Frontend framework + build tool |
| React Router 7 | SPA routing, route được bảo vệ |
| Tailwind CSS 3 | Styling responsive |
| Framer Motion | Intro animation, chuyển trang |
| Zustand 5 | State phía client (cache của server, không phải nguồn dữ liệu) |
| Zod 4 | Validation input ở server |
| Lucide React | Biểu tượng |
| **Node.js 22 (node:http)** | **Backend API — không phụ thuộc runtime ngoài** |
| **node:sqlite** | **Database (18 bảng, transaction, index)** |
| **SSE (text/event-stream)** | **Realtime trạng thái đơn hàng** |
| **node:test** | **130 test tự động (unit + API + E2E trình duyệt)** |

## Cấu trúc thư mục

```
PhShop/
├── server/                  # Backend Node.js
│   ├── index.js             # HTTP server, router, static, error handling
│   ├── config.js            # Cấu hình qua biến môi trường
│   ├── db/
│   │   ├── schema.sql       # 18 bảng + index + foreign key
│   │   ├── index.js         # Kết nối SQLite + helper transaction
│   │   └── seed-data.js     # Danh mục sản phẩm & coupon mẫu
│   ├── lib/                 # http, security, session, password, pricing,
│   │                        # order-state, payment, events, audit, orders, validate
│   ├── routes/              # auth, products, cart, wishlist, orders, admin, events, misc
│   └── scripts/             # seed.js, bootstrap-admin.js
├── src/
│   ├── lib/
│   │   ├── api.js           # Fetch wrapper: cookie phiên, CSRF, timeout, chuẩn hoá lỗi
│   │   ├── realtime.js      # Client SSE: reconnect + replay + polling dự phòng
│   │   └── format.js        # Format tiền/ngày, nhãn & màu trạng thái
│   ├── context/AuthContext.jsx  # Session server-side, phân quyền
│   ├── store/               # cart, wishlist, orders (đồng bộ với API)
│   ├── components/
│   │   ├── layout/          # Navbar, Footer
│   │   ├── intro/           # Intro animation (có nút Bỏ qua)
│   │   └── ui/              # Button, Card, Input, States (loading/error/empty/pagination)
│   └── pages/
│       ├── Home.jsx  About.jsx  Products.jsx  ProductDetail.jsx
│       ├── Cart.jsx  Checkout.jsx  Order.jsx  Wishlist.jsx
│       ├── Login.jsx  Register.jsx  Profile.jsx  Contact.jsx
│       ├── Admin.jsx + pages/admin/*   # Dashboard, Orders, Products, Users,
│       │                                # Coupons, Reviews, Messages, Audit
│       └── NotFound.jsx
├── tests/
│   ├── unit/                # 17 test — pricing, order-state, password
│   ├── api/                 # 88 test — auth, IDOR/RBAC, cart, orders, admin, realtime, security
│   ├── e2e/browser-suite.mjs# 25 test trình duyệt thật
│   └── helpers/server.js    # Test server + HTTP client có cookie jar
├── scripts/                 # dev.mjs (chạy song song API+Vite), e2e.mjs
└── docs/                    # Audit, Tasks, Security, Test report, Deployment
```

## Cài đặt & chạy local

```bash
# Yêu cầu: Node.js >= 22.5.0
npm install
npm run seed        # tạo danh mục sản phẩm + coupon mẫu (idempotent)
npm run dev         # API http://127.0.0.1:8787 + Web http://localhost:5173
```

Lệnh khác:

```bash
npm run dev:api     # chỉ API
npm run dev:web     # chỉ frontend (Vite proxy /api)
npm run build       # build production vào dist/
npm start           # chạy production: phục vụ cả API và dist/
npm run lint        # oxlint
```

## Kiểm thử

```bash
npm test            # 105 test: unit + API integration + security
npm run test:e2e    # 25 test trình duyệt thật (build production rồi chạy)
```

Kết quả: **130/130 PASS**, 0 lỗi console. Chi tiết: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Tài khoản quản trị

```bash
# Mật khẩu lấy từ secret manager (không hardcode trong repo)
PHSHOP_ADMIN_PASSWORD='<mật khẩu mạnh>' npm run bootstrap:admin
```

- Script idempotent, có audit log, không tạo mật khẩu mặc định.
- Nếu thiếu biến môi trường, script sinh mật khẩu ngẫu nhiên và in ra **một lần duy nhất**.
- Đăng ký công khai **không bao giờ** cấp quyền admin (kể cả với email `nhantk123vip@gmail.com`).
- Cách khác: SUPER_ADMIN tạo lời mời trong Admin Dashboard → `/register?invite=<token>`.

## Tính năng chính

### Sản phẩm
- Danh sách từ API: tìm kiếm (debounce), lọc danh mục, phân trang, ảnh lazy-load.
- Chi tiết: gallery, biến thể (màu/kích thước/SKU), giá theo biến thể, tồn kho, số lượng min/max,
  ghi chú, thời gian sản xuất dự kiến, đánh giá, sản phẩm liên quan.

### Tài khoản & phân quyền
- Đăng ký, đăng nhập, đăng xuất, xác minh email, quên/đặt lại mật khẩu, hồ sơ, đổi mật khẩu,
  quản lý địa chỉ và phiên đăng nhập (thu hồi được).
- 4 vai trò: `CUSTOMER` · `SUPPORT` · `ADMIN` · `SUPER_ADMIN` — **kiểm tra ở server**.

### Giỏ hàng & yêu thích
- Giỏ server-side: khách vãng lai gắn cookie, khách đăng nhập đồng bộ mọi thiết bị;
  tự hợp nhất giỏ khi đăng nhập.
- Tổng tiền/tồn kho do server tính; chặn số lượng vượt giới hạn; chống dòng trùng.
- Wishlist server-side, chống bản ghi trùng, riêng tư theo tài khoản.

### Đơn hàng & realtime
- Tạo đơn: giá/tồn kho/thanh toán do server quyết định, `Idempotency-Key` chống tạo trùng.
- State machine 10 trạng thái + trạng thái thanh toán riêng; ghi lịch sử mọi thay đổi.
- Realtime SSE: trang đơn của khách cập nhật ngay khi admin đổi trạng thái
  (kèm reconnect, replay `Last-Event-ID` và polling dự phòng).

### Admin Dashboard
Tổng quan · Đơn hàng (tìm/lọc/phân trang/chi tiết/ghi chú) · Sản phẩm (CRUD) ·
Khách hàng & quyền · Mã giảm giá · Đánh giá · Tin nhắn · Nhật ký audit · Cấu hình hệ thống.

## Bảo mật

- Mật khẩu băm **scrypt**; token phiên chỉ lưu SHA-256; cookie `HttpOnly` + `SameSite` (+`Secure` ở production).
- **CSRF** double-submit cho mọi request thay đổi trạng thái; security header đầy đủ (CSP, HSTS…).
- **Rate limit** login/register/reset/contact/order/review; validation zod mọi endpoint; body ≤ 256 kB.
- Kiểm tra sở hữu dữ liệu ở mọi endpoint (chống IDOR) — có test tự động.
- Audit log cho mọi thao tác nhạy cảm; phản hồi lỗi không lộ stack trace.

Chi tiết & các rủi ro còn lại: [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).

## Deploy

Xem [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — ba phương án, ưu tiên giữ backend trên Node host
và frontend trên Cloudflare Pages.

```bash
# Frontend lên Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name phshop
```

## License

MIT
