# PhShop — Hướng dẫn Triển khai

> Kiến trúc sau audit: **Frontend React (SPA) + Backend Node.js API + SQLite**.
> Backend phục vụ đồng thời API (`/api/*`) và file tĩnh trong `dist/`.

---

## 1. Yêu cầu môi trường

| Thành phần | Yêu cầu |
|---|---|
| Node.js | **≥ 22.5.0** (dùng `node:sqlite` có sẵn — không cần cài native module) |
| npm | ≥ 10 |
| Dung lượng | ~200 MB (node_modules) + file SQLite (database) |
| Hệ điều hành | Linux / macOS / Windows (đã kiểm thử trên Windows 11 + Node 22) |

> `node:sqlite` đang ở trạng thái **experimental** trong Node 22 → script dùng cờ
> `--disable-warning=ExperimentalWarning` để log sạch. API của module đã ổn định đủ dùng.

---

## 2. Chạy local

```bash
npm install
npm run seed            # tạo danh mục sản phẩm + coupon mẫu (idempotent)
npm run dev             # chạy đồng thời API (8787) + Vite (5173)
```

- Web: http://localhost:5173 (Vite proxy `/api` → API server)
- API: http://127.0.0.1:8787/api/health

Chạy riêng từng phần:

```bash
npm run dev:api         # chỉ API
npm run dev:web         # chỉ frontend (proxy tới PHSHOP_API_TARGET)
```

## 3. Chạy production (một Node host)

```bash
npm ci
npm run build
NODE_ENV=production \
PHSHOP_DB_PATH=/var/lib/phshop/phshop.db \
PHSHOP_SECURE_COOKIES=true \
PORT=8080 \
npm start
```

Server sẽ phục vụ cả `dist/` (SPA fallback về `index.html`) và `/api/*` trên cùng origin →
cookie phiên hoạt động `SameSite=Lax` (không cần cấu hình CORS).

### 3.1. Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8787` | Cổng HTTP |
| `HOST` | `127.0.0.1` | Địa chỉ lắng nghe (đặt `0.0.0.0` trong container) |
| `NODE_ENV` | `development` | `production` bật HSTS + ẩn chi tiết lỗi |
| `PHSHOP_DB_PATH` | `./data/phshop.db` | Đường dẫn file SQLite (cần volume ghi được) |
| `PHSHOP_STATIC_DIR` | `./dist` | Thư mục file tĩnh |
| `PHSHOP_SESSION_TTL_HOURS` | `48` | Thời hạn phiên đăng nhập |
| `PHSHOP_SECURE_COOKIES` | `true` khi production | Gắn `Secure` cho cookie phiên |
| `PHSHOP_COOKIE_SAMESITE` | `Lax` | Đặt `None` khi frontend và API khác origin |
| `PHSHOP_TRUST_PROXY` | `false` | Bật khi sau reverse proxy (đọc `X-Forwarded-For`) |
| `PHSHOP_CORS_ORIGINS` | rỗng | Danh sách origin được phép (CSV) khi tách origin |
| `PHSHOP_ADMIN_EMAIL` | `nhantk123vip@gmail.com` | Email quản trị mục tiêu |
| `PHSHOP_SUPER_ADMIN_EMAIL` | = admin email | Tài khoản được phép đổi vai trò |
| `PHSHOP_ADMIN_PASSWORD` | — | Mật khẩu cho lệnh bootstrap (xem §3.2) |
| `PHSHOP_REQUIRE_VERIFIED_EMAIL` | `false` | Bắt buộc xác minh email mới được đặt hàng |
| `PHSHOP_MOMO_API_KEY` | — | Bật cổng thanh toán MoMo (xem §4) |
| `PHSHOP_BANK_TRANSFER_API_KEY` | — | Bật cổng chuyển khoản |
| `PHSHOP_RL_*` | xem `server/config.js` | Ngưỡng rate limit |

### 3.2. Khởi tạo tài khoản quản trị (quy trình có kiểm soát)

```bash
# Khuyến nghị: truyền mật khẩu qua biến môi trường / secret manager
PHSHOP_ADMIN_PASSWORD='<mật khẩu mạnh>' npm run bootstrap:admin
```

- Script là **idempotent**: chạy lại không tạo trùng, không ghi đè mật khẩu.
  Muốn đặt lại mật khẩu: `npm run bootstrap:admin -- --reset-password`.
- Nếu **không** cấp `PHSHOP_ADMIN_PASSWORD`, script sinh mật khẩu ngẫu nhiên và in **một lần duy nhất**.
- Mọi thao tác đều ghi vào `audit_log`.
- Đăng ký công khai **không bao giờ** cấp quyền admin, kể cả với email quản trị.
- Cách khác: SUPER_ADMIN tạo lời mời trong Admin Dashboard → tab *Khách hàng* → copy token →
  người được mời đăng ký tại `/register?invite=<token>` (token hạn 7 ngày, dùng 1 lần).

### 3.3. Health check & vận hành

```bash
curl http://127.0.0.1:8787/api/health
# {"ok":true,"env":"production","uptime":123,"users":42,"time":"..."}
```

### 3.4. Sao lưu

SQLite ở chế độ WAL → sao lưu file `.db` (+ `-wal`) khi dừng server, hoặc dùng:

```bash
sqlite3 /var/lib/phshop/phshop.db ".backup '/backup/phshop-$(date +%F).db'"
```

---

## 4. Tích hợp dịch vụ bên ngoài (BLOCKER — cần credentials)

### 4.1. Cổng thanh toán (MoMo / chuyển khoản)

Hiện trạng: `server/lib/payment.js` **không giả lập** trạng thái thành công.

- `COD`: đơn ở trạng thái `UNPAID` cho tới khi admin xác nhận đã thu tiền → cập nhật `PAID`.
- `MOMO` / `BANK_TRANSFER`: nếu chưa có `PHSHOP_MOMO_API_KEY` (tương ứng), API trả **409** với thông báo
  rõ ràng và UI chỉ hiển thị phương thức COD.

Cần làm khi có credentials:
1. Đặt `PHSHOP_MOMO_API_KEY`, `PHSHOP_MOMO_SECRET_KEY` (và endpoint) qua secret manager.
2. Cài SDK chính thức của MoMo (`@apmmo/zalopay` tương tự) và hiện thực `createPaymentIntent`
   trong `server/lib/payment.js` (tạo payment intent, trả `checkoutUrl`).
3. Thêm endpoint webhook `POST /api/payments/momo/notify` để cập nhật `payment_status` khi
   thanh toán thành công — **chỉ** khi chữ ký hợp lệ.
4. Không bao giờ đánh dấu `PAID` dựa trên dữ liệu gửi lên từ trình duyệt.

### 4.2. Email (xác minh, đặt lại mật khẩu, thông báo đơn)

Hiện trạng: hệ thống **tạo token nhưng không gửi email**.
- Ở môi trường không phải production, token được trả về trong response (để kiểm thử).
- Ở production, `verificationToken`/`resetToken` là `undefined` → người dùng không thể xác minh/reset
  cho tới khi có SMTP.

Cần làm:
1. Cấu hình SMTP (`PHSHOP_SMTP_HOST`, `PHSHOP_SMTP_PORT`, `PHSHOP_SMTP_USER`, `PHSHOP_SMTP_PASS`,
   `PHSHOP_MAIL_FROM`).
2. Tạo `server/lib/notify.js` gửi email qua Nodemailer (thêm dependency) hoặc qua HTTP API
   (Resend/SendGrid) — không dùng dịch vụ gửi email không xác thực.
3. Hook vào: `register` (xác minh), `password-reset/request` (link reset),
   `order.create` + `order.update` (thông báo trạng thái cho khách), `contact.submit` (acknowledge).
4. **Không** ghi token vào log sau khi đã tích hợp email.

### 4.3. Cloudflare Pages + Workers/D1 (BLOCKER)

- ✅ **Frontend** vẫn deploy lên Cloudflare Pages bình thường:
  ```bash
  npm run build
  npx wrangler pages deploy dist --project-name phshop
  ```
  Nhưng **chỉ phần frontend** — trang sẽ gọi API ở origin khác.
- ❌ **Backend** chưa chạy được trên Cloudflare Pages vì:
  1. `node:sqlite` không tồn tại trong môi trường Workers/Pages Functions.
  2. Hệ thống file SQLite cần persistent filesystem (không có trên Workers).
  3. Pages Functions không phải là mô hình long-running phù hợp cho server Node hiện tại.

  **Hai lựa chọn:**
  - **(A) Khuyến nghị — giữ backend trên Node host** (Railway/Render/Fly/VM):
    - Frontend: Cloudflare Pages (biến môi trường build `VITE_API_BASE_URL=https://api.phshop.vn`).
    - Backend: Node host, `PHSHOP_CORS_ORIGINS=https://phshop.pages.dev`,
      `PHSHOP_COOKIE_SAMESITE=None`, `PHSHOP_SECURE_COOKIES=true`.
    - Hoạt động ngay với code hiện tại (đã có CORS allow-list + SameSite config).
  - **(B) Viết lại tầng dữ liệu cho D1** (khoảng 1–2 ngày công):
    - Tạo D1 database, đổi `server/db/index.js` sang adapter D1 (async API).
    - Chuyển API thành Pages Function `functions/api/[[path]].js` hoặc Worker.
    - Vẫn giữ nguyên `server/lib/*` (business logic không phụ thuộc DB) và `server/routes/*`.
    - Cần tài khoản Cloudflare để kiểm chứng — hiện **chưa thể kiểm thử** trong môi trường này.

  > Ưu tiên hiện tại của dự án: **(A)** — đã hoạt động và được kiểm thử đầy đủ.

---

## 5. Triển khai Cloudflare Pages (frontend)

`wrangler.toml` hiện tại:

```toml
name = "phshop"
compatibility_date = "2026-10-21"

[pages]
  pages_build_output_dir = "dist"
```

Lệnh:

```bash
npm run build
npx wrangler pages deploy dist --project-name phshop
```

Nếu frontend và API khác origin, đặt biến môi trường build:

```bash
VITE_API_BASE_URL=https://api.phshop.vn npm run build
```

> `public/_redirects` (`/* /index.html 200`) đã giữ để SPA deep-link hoạt động trên Pages.

---

## 6. Kiểm thử trước khi phát hành

```bash
npm ci
npm test              # 105 test unit + API (bắt buộc xanh)
npm run test:e2e      # 25 test trình duyệt thật trên bản build
npm run lint
npm run build
```

Checklist phát hành:

- [ ] `npm test` → 105/105
- [ ] `npm run test:e2e` → 25/25, 0 lỗi console
- [ ] `PHSHOP_DB_PATH` trỏ tới volume ghi được, backup tự động đã bật
- [ ] `NODE_ENV=production`, `PHSHOP_SECURE_COOKIES=true`, HTTPS phía trước
- [ ] Tài khoản quản trị đã bootstrap bằng **script**, mật khẩu lấy từ secret manager
- [ ] Rate limit & CSP đang bật (mặc định)
- [ ] Health check `/api/health` trả `ok:true` sau khi deploy
- [ ] Ghi log audit log được thu thập (log aggregation)

---

## 7. Bảng môi trường

| Môi trường | Domain | Database | Ghi chú |
|---|---|---|---|
| Local | http://localhost:5173 | `data/phshop.db` | `npm run dev` |
| Test/E2E | http://127.0.0.1:8791 | `data/e2e.db` (xoá mỗi lần chạy) | `npm run test:e2e` |
| Staging | theo hạ tầng | DB riêng | Cần SMTP + payment credentials |
| Production | https://phshop.pages.dev | DB riêng | Theo phương án A hoặc B ở §4.3 |

---

## 8. Danh sách dịch vụ/credential còn cần cấu hình

| # | Dịch vụ | Biến cần thiết | Trạng thái hiện tại |
|---|---|---|---|
| 1 | SMTP (nodemailer/Resend) | `PHSHOP_SMTP_*` | ❌ Chưa có — email xác minh/reset chưa gửi được |
| 2 | MoMo | `PHSHOP_MOMO_API_KEY` | ❌ Chưa có — API trả 409, chỉ dùng COD |
| 3 | Chuyển khoản ngân hàng | `PHSHOP_BANK_TRANSFER_API_KEY` | ❌ Chưa có |
| 4 | Cloudflare (D1/Workers) | `wrangler whoami` | ❌ Chưa đăng nhập — backend chạy trên Node host |
| 5 | Redis/KV cho rate limit dùng chung | — | ⚠️ Chưa cần khi 1 instance; cần khi scale |
| 6 | Ảnh sản phẩm | — | ⚠️ Đang dùng Unsplash CDN (nên chuyển sang bucket riêng) |

> Không có secret nào nằm trong repository. Mọi giá trị trên đều phải cấu hình qua biến môi trường
> hoặc secret manager của hạ tầng.
