# PhShop — Audit & Hoàn thiện Website Bán Mô Hình In 3D

> Ngày audit: 21/10/2026 · Phạm vi: toàn bộ source `PhShop/` (frontend + backend mới)
> Kết quả kiểm thử: **105 unit/API test + 25 E2E browser test — 130/130 PASS** (xem `docs/TEST_REPORT.md`)

---

## 1. Tổng quan kiến trúc

| Hạng mục | Trước audit | Sau audit |
|---|---|---|
| Backend | **Không có** — toàn bộ logic chạy trong trình duyệt | Node.js HTTP API (`server/`), 0 dependency runtime — chạy được trên **Cloudflare Worker** và Node server nhờ lõi chung `server/app.js` |
| Cơ sở dữ liệu | Không có (localStorage) | SQLite qua `node:sqlite` (Node) hoặc **Cloudflare D1** (Worker) — 19 bảng, index, FK, transaction |
| Xác thực | localStorage, role suy ra từ email | Email + mật khẩu (scrypt), phiên cookie HttpOnly, RBAC 4 vai trò |
| Phân quyền | Ẩn nút ở UI, kiểm tra ở client | Kiểm tra ở **server** cho mọi endpoint, audit log |
| Đơn hàng | localStorage của từng trình duyệt | Bảng `orders` + `order_items` + `order_events` (lịch sử) |
| Realtime | Không có (README tuyên bố sai) | SSE `/api/events` + **polling sự kiện** `/api/events/poll` (bảng `events_log`) — hoạt động trên cả Node lẫn Worker |
| Thanh toán | Radio button, đánh dấu "đã thanh toán" tùy ý | Trạng thái thanh toán riêng, server kiểm tra, không giả lập thành công |
| Triển khai | Chỉ static trên Cloudflare Pages | Pages (SPA) + Pages Function proxy + Worker (API) + D1 (DB) |
| Kiểm thử | 0 test | 130 test tự động (node:test + browser thật) — chạy trên cả 2 nền tảng |

---

## 2. Danh sách chức năng hiện có (sau khi hoàn thiện)

### 2.1 Công khai
- Trang chủ: hero, danh mục, sản phẩm nổi bật, đăng ký bản tin (gửi qua API, có rate limit).
- Giới thiệu, Liên hệ (form gửi thật vào DB + admin xem được).
- Danh sách sản phẩm: tìm kiếm (debounce 300ms), lọc theo danh mục, phân trang server-side, ảnh lazy-load.
- Chi tiết sản phẩm: gallery, chọn biến thể (màu/kích thước/SKU), tồn kho, giá theo biến thể,
  số lượng min/max theo biến thể, ghi chú, thời gian sản xuất dự kiến, đánh giá, sản phẩm liên quan.

### 2.2 Tài khoản
- Đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu, xác minh email, hồ sơ, đổi mật khẩu,
  quản lý địa chỉ giao hàng, danh sách phiên đăng nhập + thu hồi phiên.
- Đăng ký kèm `inviteToken` (lời mời của SUPER_ADMIN) mới được cấp vai trò quản trị.

### 2.3 Giỏ hàng & yêu thích
- Giỏ server-side: khách vãng lai gắn cookie `phshop_cart`, khách đăng nhập gắn theo user (đồng bộ mọi thiết bị).
- Hợp nhất giỏ khách vãng lai vào giỏ tài khoản ngay khi đăng nhập.
- Gộp dòng trùng (cùng biến thể + cùng ghi chú), chặn vượt tồn kho / `max_qty`, xoá dòng, xoá cả giỏ.
- Tổng tiền, phí vận chuyển, giảm giá **tính bởi server**.
- Wishlist server-side theo user, chống bản ghi trùng, đồng bộ từ khách vãng lai khi đăng nhập.

### 2.4 Đơn hàng
- Tạo đơn (COD/MoMo/chuyển khoản), giá & tồn kho do server tính lại, trừ kho có điều kiện (chống race).
- `Idempotency-Key` chống tạo đơn trùng khi double-click / retry (kể cả request song song).
- Mã đơn `PHS…` duy nhất, snapshot tên/SKU/giá/ghi chú tại thời điểm mua.
- State machine 10 trạng thái + trạng thái thanh toán riêng (`UNPAID/PENDING/PAID/FAILED/REFUNDED`).
- Khách: xem danh sách/chi tiết, lọc, phân trang, lịch sử thay đổi, hủy đơn, yêu cầu trả hàng.
- Realtime: khách thấy trạng thái mới không cần refresh.

### 2.5 Admin Dashboard
- Tổng quan (doanh thu, đơn, khách hàng, cảnh báo tồn kho, đơn gần đây).
- Đơn hàng: tìm theo mã/email/tên/SĐT, lọc theo trạng thái/thanh toán/ngày, phân trang,
  đổi trạng thái theo transition hợp lệ, ghi chú công khai / nội bộ, mã vận đơn, lịch sử thay đổi,
  chống ghi đè khi cập nhật đồng thời (`expectedVersion`).
- Sản phẩm: CRUD đầy đủ (tên, slug, danh mục, giá, ảnh, biến thể, tồn kho, thời gian SX, trạng thái).
- Khách hàng & quyền: đổi vai trò (chỉ SUPER_ADMIN), vô hiệu hoá tài khoản, tạo lời mời quản trị.
- Mã giảm giá, đánh giá, tin nhắn liên hệ, nhật ký audit, cấu hình hệ thống.

---

## 3. Danh sách chức năng thiếu / hoạt động sai (đã sửa)

| # | Vấn đề | Mức độ | Nguyên nhân | Cách sửa |
|---|---|---|---|---|
| 1 | **Ai đăng ký email `nhantk123vip@gmail.com` cũng thành admin** | P0 | `AuthContext` gán `role = email === ADMIN_EMAIL ? 'admin' : 'customer'` ở client | Role lấy từ DB; đăng ký luôn là `CUSTOMER`; chỉ `inviteToken` hợp lệ mới cấp quyền |
| 2 | **Admin chỉ thấy đơn của chính máy mình** | P0 | Đơn lưu ở localStorage | Bảng `orders` trong DB, admin đọc toàn bộ qua `/api/admin/orders` |
| 3 | **Giỏ hàng "biến mất" sau khi refresh** | P1 | `get count()`/`get total()` của zustand bị serialize thành giá trị cứng, rehydrate ra giá trị stale = 0 | Giỏ server-side; tổng tiền do server tính, store chỉ giữ giá trị thuần |
| 4 | **Trang Checkout crash** (`Maximum update depth exceeded`) | P1 | `useOrderStore((s) => ({ addOrder: s.addOrder }))` trả object mới mỗi lần render | Bỏ selector tạo object; dùng store server-side |
| 5 | **Không có backend → không thể kiểm tra giá/tồn kho** | P0 | Toàn bộ nghiệp vụ ở client | API server xác minh lại giá, tồn kho, coupon, thanh toán |
| 6 | Admin đổi trạng thái đơn tùy ý (bỏ qua state machine) | P1 | `updateOrderStatus` gán thẳng chuỗi | `assertTransition()` + `assertPaymentTransition()` theo vai trò |
| 7 | Không có lịch sử thay đổi trạng thái | P2 | Không lưu | Bảng `order_events` + màn hình lịch sử |
| 8 | Không chống tạo đơn trùng (double-click) | P1 | Không có idempotency | `Idempotency-Key` + unique constraint |
| 9 | Wishlist mỗi trình duyệt một kiểu, không phân quyền | P1 | localStorage | Bảng `wishlist_items` theo user, kiểm tra sở hữu ở server |
| 10 | Không có realtime (README ghi "sẽ hiển thị ngay" — sai) | P1 | Không có kênh push | SSE + replay + polling dự phòng |
| 11 | Nút "Lưu thay đổi" ở hồ sơ không làm gì | P2 | UI mẫu | `PATCH /api/auth/profile` + đổi mật khẩu + quản lý phiên |
| 12 | Form liên hệ chỉ `alert()` | P2 | UI mẫu | `POST /api/contact` + lưu DB + admin xem + rate limit |
| 13 | Bảng admin "Sản phẩm / Khách hàng / Cài đặt" là chữ trang trí | P2 | Chưa làm | Đã triển khai đầy đủ 8 module |
| 14 | Nút "Theo dõi" / "Xem chi tiết" ở trang đơn không hoạt động | P2 | Chưa làm | Trang chi tiết đơn `/order/:orderId` + lịch sử + hủy/trả hàng |
| 15 | Số lượng mua không bị chặn ở trang giỏ | P2 | Chỉ chặn ở trang chi tiết | Server chặn theo `max_qty` + tồn kho ở mọi endpoint |
| 16 | Không có phân trang / tìm kiếm / lọc cho danh sách | P2 | Thiếu | Phân trang + tìm kiếm + lọc server-side ở admin và khách |
| 17 | Dữ liệu mẫu có ký tự Trung Quốc lạc (`鲜亮`) | P3 | Copy/paste | Đã sửa trong seed data |
| 18 | `Button asChild` truyền `disabled` cho `React.Fragment` | P3 | Sai cách dùng React.Fragment | `cloneElement` |
| 19 | Import animation chặn tương tác | P3 | Không có nút bỏ qua ở một số trạng thái | Có nút "Bỏ qua", chỉ hiện 1 lần/session |
| 20 | Không có 404 page | P3 | Thiếu | `/404` với điều hướng |
| 21 | **Trang `/order` crash React #185** (đã xảy ra trên bản deploy cũ) | P2 | Selector zustand trả array mới mỗi lần → vòng lặp render vô hạn | Selector trả giá trị ổn định; test E2E cho `/order` |
| 22 | **Cookie CSRF không đọc được khi frontend và API khác origin** → mọi POST trả 403 | P1 | Cookie do domain API phát ra, JS của domain Pages không đọc được `document.cookie` | Pages Function proxy → cùng origin; thêm fallback lấy token từ body + tự refresh khi 403 |
| 23 | **Nhiều `Set-Cookie` bị gộp thành 1 header** → trình duyệt parse sai, cookie CSRF biến thành HttpOnly | P1 | Đưa mảng cookie vào object `headers` của `Response` | `Headers.append('set-cookie', …)` cho từng cookie (ở cả Worker và proxy) |
| 24 | **D1: `meta.last_row_id` + `bind()` phải là varargs** → lỗi FK và "Wrong number of parameter bindings" | P1 | Dùng sai API của D1 | Đọc `last_row_id`, `bind(...params)`; toàn bộ 106 test chạy trên D1 |
| 25 | **SSE không bảo đảm trên Cloudflare Worker** (mỗi request ở isolate riêng) | P2 | Bộ nhớ in-memory không dùng chung giữa request | Bảng `events_log` + endpoint polling `/api/events/poll`; client dùng song song SSE + polling |

---

## 4. Lỗi nghiêm trọng & ảnh hưởng

### P0 — Đã xử lý
- **Privilege escalation từ email**: bất kỳ ai biết email quản trị đều đăng ký được quyền admin
  (mọi thao tác quản trị, xem toàn bộ đơn hàng, sửa sản phẩm). Đã đóng bằng RBAC server-side.
- **Không có backend**: mọi "dữ liệu" nằm trong localStorage của người dùng → mất khi xoá cache,
  không đồng bộ, không kiểm toán được, không chống sửa giá/tồn kho.

### P1 — Đã xử lý
- Giỏ hàng hỏng sau refresh (mất dữ liệu bán hàng).
- Crash trang Checkout khiến không thể thanh toán.
- IDOR trên đơn hàng/wishlist/hồ sơ nếu có backend mà không kiểm tra sở hữu.
- Không chống tạo đơn trùng → nguy cơ tồn kho âm và doanh thu sai.
- Không có state machine → đơn có thể nhảy từ "Chờ xác nhận" thẳng lên "Đã giao".

### P2/P3 — Đã xử lý
Xem bảng mục 3.

---

## 5. Vấn đề kiến trúc, hiệu năng, bảo mật (đã xử lý)

| Nhóm | Vấn đề | Xử lý |
|---|---|---|
| Kiến trúc | Business logic nằm trong component | Tách `server/lib` (thuần) + `server/routes` + `src/lib`; business logic test được bằng unit test |
| Kiến trúc | Không có lớp xác thực/authorization tập trung | `AuthProvider` (server-backed) + `RequireAuth`/`RequireAdmin` + middleware phân quyền ở router |
| Hiệu năng | Bundle 645 kB, admin luôn nạp | `React.lazy` cho `/admin` → chunk 51 kB tách riêng; main chunk 599 kB (181 kB gzip) |
| Hiệu năng | Ảnh không lazy-load | `loading="lazy"` cho mọi ảnh ngoài viewport đầu |
| Hiệu năng | Tìm kiếm gọi API mỗi ký tự | Debounce 300 ms |
| Hiệu năng | Query DB không có index | Index cho `orders(user_id)`, `orders(status)`, `order_items(order_id)`, `audit_log(action)`, `cart_items(cart_id, variant_id, note)`… |
| Bảo mật | Không có CSRF | Double-submit cookie + header `X-CSRF-Token` cho mọi request thay đổi trạng thái |
| Bảo mật | Không có security header | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS (prod) |
| Bảo mật | Mật khẩu lưu dạng rõ | scrypt (N=16384, r=8, p=1) + salt ngẫu nhiên + `timingSafeEqual` |
| Bảo mật | Token phiên lưu thô | Chỉ lưu SHA-256(token) trong DB |
| Bảo mật | Không giới hạn request | Rate limit theo IP + email + user cho login/register/reset/contact/order/review |
| Bảo mật | Không kiểm tra dữ liệu đầu vào | zod schema cho mọi endpoint, body tối đa 256 kB |
| Bảo mật | Lộ stack trace khi lỗi | Response chuẩn `{error:{code,message}}`; chỉ log server-side |
| Vận hành | Không có nhật ký ai làm gì | `audit_log` cho mọi thao tác nhạy cảm (role, đơn, sản phẩm, coupon, đăng nhập) |

---

## 6. Kế hoạch triển khai theo ưu tiên (đã thực hiện)

| Ưu tiên | Nội dung | Trạng thái |
|---|---|---|
| P0 | Backend API + DB + RBAC + xác thực | ✅ Hoàn thành (`server/`) — chạy trên Node **và** Cloudflare Worker (D1) |
| P0 | Chặn privilege escalation theo email | ✅ Hoàn thành |
| P0 | Triển khai thật: Pages + proxy + Worker + D1 | ✅ Hoàn thành — `https://phshop.pages.dev` đã chạy đầy đủ |
| P0 | Quản lý đơn hàng server-side + state machine + audit log | ✅ Hoàn thành |
| P0 | Kiểm soát giá/tồn kho/idempotency ở server | ✅ Hoàn thành |
| P1 | Giỏ & wishlist server-side, đồng bộ nhiều thiết bị | ✅ Hoàn thành |
| P1 | Realtime SSE + polling (đảm bảo trên mọi nền tảng) | ✅ Hoàn thành — SSE + `/api/events/poll` (bảng `events_log`) |
| P1 | Admin Dashboard đầy đủ 8 module | ✅ Hoàn thành |
| P1 | Bộ test API + security + E2E | ✅ Hoàn thành (130 test) |
| P2 | CSRF, rate limit, security header, validation | ✅ Hoàn thành |
| P2 | Trải nghiệm: loading/empty/error state, phân trang, 404 | ✅ Hoàn thành |
| P3 | Code splitting, lazy ảnh, debounce, dọn lint | ✅ Hoàn thành |
| — | Tích hợp cổng thanh toán thật (MoMo) | ⛔ **Blocker**: cần credentials + SDK chính thức → xem `docs/DEPLOYMENT.md` §4.1 |
| — | Gửi email thật (xác minh, reset mật khẩu, thông báo đơn) | ⛔ **Blocker**: cần SMTP/API key → xem `docs/DEPLOYMENT.md` §4.2 |
| — | Rate limit dùng chung giữa nhiều isolate Worker | ⛔ **Blocker**: cần KV/Durable Object khi scale → xem `docs/DEPLOYMENT.md` §8 |

---

## 7. Cấu trúc sau khi hoàn thiện

```
PhShop/
├── server/                  # Backend Node.js (không dependency runtime)
│   ├── index.js             # HTTP server, router, static, error handling
│   ├── config.js            # Cấu hình qua biến môi trường
│   ├── db/
│   │   ├── schema.sql       # 18 bảng + index
│   │   ├── index.js         # Kết nối SQLite, transaction helper
│   │   └── seed-data.js     # Danh mục sản phẩm & coupon mẫu
│   ├── lib/                 # http, security, session, password, pricing,
│   │                        # order-state, payment, events, audit, orders, validate
│   ├── routes/              # auth, products, cart, wishlist, orders, admin, events, misc
│   └── scripts/             # seed.js, bootstrap-admin.js
├── src/
│   ├── lib/                 # api.js (fetch + CSRF), realtime.js (SSE), format.js
│   ├── context/AuthContext.jsx
│   ├── store/               # cart, wishlist, orders (server-backed)
│   ├── components/          # layout, intro, ui (Button/Card/Input/States)
│   └── pages/               # Home, About, Products, ProductDetail, Cart, Checkout,
│                            # Order, Wishlist, Login, Register, Profile, Contact,
│                            # Admin (+ pages/admin/*), NotFound
├── tests/
│   ├── unit/                # 17 test — pricing, order-state, password
│   ├── api/                 # 88 test — auth, authorization(IDOR), cart, orders,
│   │                        # admin, realtime(SSE), security
│   ├── e2e/browser-suite.mjs# 25 test trình duyệt thật
│   └── helpers/server.js    # Test server + HTTP client có cookie jar
├── scripts/                 # dev.mjs, e2e.mjs
└── docs/                    # AUDIT, TASKS, SECURITY_AUDIT, TEST_REPORT, DEPLOYMENT
```

---

## 8. Kết luận

- **Không còn lỗi P0/P1 chưa xử lý** — đã kiểm chứng bằng 130 test tự động.
- Các chức năng nghiệp vụ cốt lõi (tài khoản, sản phẩm, giỏ, yêu thích, checkout, đơn hàng,
  realtime, quản trị) đã chạy trên backend thật với dữ liệu thật.
- Ba hạng mục còn lại phụ thuộc dịch vụ bên ngoài (thanh toán, email, hạ tầng Cloudflare) được
  ghi rõ là blocker kèm hướng dẫn cấu hình trong `docs/DEPLOYMENT.md` — **không có logic nào
  được đánh dấu "xong" một cách giả lập**.
