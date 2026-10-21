# PhShop — Hướng dẫn Triển khai

> Kiến trúc sau audit: **Frontend React (SPA) trên Cloudflare Pages** + **API Node.js trên Cloudflare Worker (D1)**.
> Pages Functions làm proxy `/api/*` → Worker để frontend và API **cùng origin** (cookie phiên/CSRF là first-party).

---

## 0. Kiến trúc triển khai hiện tại (đang chạy)

```
Trình duyệt
   │  https://phshop.pages.dev            (Cloudflare Pages — file tĩnh trong dist/)
   │  https://phshop.pages.dev/api/*      (Pages Function  functions/api/[[path]].js  → proxy)
   ▼
Cloudflare Worker  https://phshop-api.lupindsama.workers.dev   (server/worker.js)
   │
   ▼
Cloudflare D1  database "phshop"  (18 bảng, region APAC)
```

| Thành phần | Nơi chạy | Lệnh |
|---|---|---|
| Frontend | Cloudflare Pages (`phshop`) | `npm run deploy:web` |
| API | Cloudflare Worker (`phshop-api`) | `npm run deploy:api` |
| Database | Cloudflare D1 (`phshop`) | schema: `npx wrangler d1 execute phshop --remote --file=server/db/schema.sql -c wrangler.worker.toml` |
| Dữ liệu mẫu | D1 | `node server/scripts/seed.js --sql > data/seed.sql` → `npx wrangler d1 execute phshop --remote --file=data/seed.sql -c wrangler.worker.toml` |

> Worker chạy cùng lõi API với Node server (`server/app.js`), nên logic nghiệp vụ chỉ có **một bản duy nhất**.

---

## 1. Yêu cầu môi trường

| Thành phần | Yêu cầu |
|---|---|
| Node.js | **≥ 22.5.0** (dùng `node:sqlite` có sẵn — không cần cài native module) |
| npm | ≥ 10 |
| Cloudflare | Tài khoản có Pages + Workers + D1 (đã dùng: `LupinDsama`) |
| Dung lượng | ~200 MB (node_modules) |

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

### 4.3. Realtime: SSE (Node) + polling (Worker)

Cloudflare Worker chạy **mỗi request ở một isolate riêng**, nên bộ nhớ in-memory của SSE
không dùng chung được giữa các request → sự kiện có thể không tới client.

Vì vậy hệ thống dùng **hai kênh song song**:
1. **SSE** (`/api/events`) — đẩy ngay lập tức (hiệu quả trên Node server; trên Worker là "best effort").
2. **Polling** (`/api/events/poll?since=<id>`) — luôn chạy mỗi 3 s, đọc từ bảng `events_log` trong D1.
   Kênh này là nguồn đảm bảo cho mọi môi trường.

Client (`src/lib/realtime.js`) dùng cả hai và bỏ qua sự kiện trùng bằng `eventId` tăng dần.

> Test: `npm test` (Node) chạy đủ cả SSE lẫn polling; `npm run test:d1` (Worker + D1) chạy polling
> và **bỏ qua 3 test SSE-live** với lý do được ghi rõ (giới hạn nền tảng, không phải lỗi logic).

---

## 5. Triển khai Cloudflare Pages (frontend + proxy)

`wrangler.toml` (Pages) và `wrangler.worker.toml` (Worker) là hai file cấu hình riêng:

```toml
# wrangler.toml — Pages
name = "phshop"
compatibility_date = "2025-04-01"

[pages]
  pages_build_output_dir = "dist"
```

Lệnh:

```bash
npm run deploy:web
# = npm run build && wrangler pages deploy dist --project-name phshop
```

> `wrangler pages deploy` tự đóng gói thư mục `functions/` → Pages Function
> `functions/api/[[path]].js` làm proxy `/api/*` tới Worker. Nhờ đó frontend và API
> **cùng origin**, cookie phiên/CSRF là first-party (`SameSite=Lax` là đủ).

### 5.1. Vì sao cần proxy thay vì gọi thẳng Worker?

| Cách | Hệ quả |
|---|---|
| Gọi thẳng `https://phshop-api...` (khác origin) | Cookie phải `SameSite=None; Secure`; cookie CSRF do domain API phát ra → **JavaScript của Pages không đọc được** → không lấy được token CSRF → mọi POST bị 403. Đây chính là lỗi đã gặp và đã sửa bằng proxy. |
| Proxy qua Pages (hiện tại) | Cùng origin → cookie first-party, đọc được bằng `document.cookie`, không cần CORS. |

### 5.2. Nếu vẫn muốn gọi thẳng Worker (ví dụ cho mobile app)

- Đặt `PHSHOP_CORS_ORIGINS` trên Worker (allow-list, có `Vary: Origin`).
- Đặt `PHSHOP_COOKIE_SAMESITE=None` + `PHSHOP_SECURE_COOKIES=true`.
- Frontend phải lấy CSRF token từ **body** của response (`csrfToken`) thay vì đọc cookie —
  cơ chế này đã được cài trong `src/lib/api.js` (fallback + tự refresh khi gặp 403).

> Lưu ý kỹ thuật: `Headers.append('set-cookie', ...)` phải được dùng thay vì đưa mảng vào object
> `headers` — nếu không, nhiều cookie bị gộp thành một header `"a=1, b=2"` và trình duyệt parse sai
> (cookie CSRF bị coi là HttpOnly → 403). Đây là lỗi đã phát hiện và sửa ở cả Worker lẫn proxy.

---

## 6. Kiểm thử trước khi phát hành

```bash
npm ci
npm test              # 106 test unit + API (bắt buộc xanh)
npm run test:e2e      # 25 test trình duyệt thật trên bản build
npm run test:e2e:dev  # 25 test trên dev server (bắt lỗi StrictMode)
npm run test:d1       # 106 test trên Cloudflare Worker + D1 (wrangler dev)
npm run lint
npm run build
```

Checklist phát hành:

- [ ] `npm test` → 106/106
- [ ] `npm run test:e2e` → 25/25, 0 lỗi console
- [ ] `npm run test:d1` → 7/7 file test xanh (3 test SSE-live được skip có lý do)
- [ ] Schema D1 đã áp dụng: `npx wrangler d1 execute phshop --remote --file=server/db/schema.sql -c wrangler.worker.toml`
- [ ] Seed danh mục đã nạp: `node server/scripts/seed.js --sql > data/seed.sql` → `npx wrangler d1 execute phshop --remote --file=data/seed.sql -c wrangler.worker.toml`
- [ ] Tài khoản quản trị đã bootstrap bằng **script** (mật khẩu lấy từ secret manager)
- [ ] `NODE_ENV=production`, `PHSHOP_SECURE_COOKIES=true`, `PHSHOP_COOKIE_SAMESITE=None` (khi gọi thẳng Worker)
- [ ] Rate limit & CSP đang bật (mặc định)
- [ ] Health check `https://phshop.pages.dev/api/health` trả `ok:true` sau khi deploy
- [ ] Dữ liệu test đã dọn: `npm run db:cleanup`
- [ ] Ghi log audit log được thu thập (log aggregation)

---

## 7. Bảng môi trường

| Môi trường | Domain | Database | Ghi chú |
|---|---|---|---|
| Local | http://localhost:5173 | `data/phshop.db` (node:sqlite) | `npm run dev` |
| Test/E2E | http://127.0.0.1:8791 | `data/e2e.db` (xoá mỗi lần chạy) | `npm run test:e2e` |
| Worker + D1 (local) | http://127.0.0.1:8790 | D1 local của wrangler | `npm run test:d1` |
| Staging | theo hạ tầng | D1 riêng | Cần SMTP + payment credentials |
| Production | https://phshop.pages.dev | D1 `phshop` | API qua Pages Function proxy |

---

## 8. Danh sách dịch vụ/credential còn cần cấu hình

| # | Dịch vụ | Biến cần thiết | Trạng thái hiện tại |
|---|---|---|---|
| 1 | SMTP (nodemailer/Resend) | `PHSHOP_SMTP_*` | ❌ Chưa có — email xác minh/reset chưa gửi được |
| 2 | MoMo | `PHSHOP_MOMO_API_KEY` | ❌ Chưa có — API trả 409, chỉ dùng COD |
| 3 | Chuyển khoản ngân hàng | `PHSHOP_BANK_TRANSFER_API_KEY` | ❌ Chưa có |
| 4 | Cloudflare (Pages + Workers + D1) | — | ✅ Đã cấu hình & deploy (account `LupinDsama`) |
| 5 | Redis/KV cho rate limit dùng chung | — | ⚠️ Rate limit hiện in-memory theo isolate Worker → mỗi isolate một bộ đếm; cần KV/Durable Object khi scale nhiều instance |
| 6 | Ảnh sản phẩm | — | ⚠️ Đang dùng Unsplash CDN (nên chuyển sang bucket riêng + CSP `img-src`) |
| 7 | Mật khẩu admin production | secret manager | ⚠️ Đang dùng mật khẩu tạm → **đổi ngay** bằng `node server/scripts/bootstrap-admin-d1.mjs` với `PHSHOP_ADMIN_PASSWORD` |

> Không có secret nào nằm trong repository. Mọi giá trị trên đều phải cấu hình qua biến môi trường
> hoặc secret manager của hạ tầng.

---

## 9. Quy trình cập nhật tài khoản quản trị trên D1

```bash
# 1) Sinh SQL (mật khẩu lấy từ biến môi trường, không ghi vào repo)
PHSHOP_ADMIN_PASSWORD='<mật khẩu mới>' node server/scripts/bootstrap-admin-d1.mjs > data/admin.sql

# 2) Nạp vào D1
npx wrangler d1 execute phshop --remote --file=data/admin.sql -c wrangler.worker.toml
```

Lệnh trên **idempotent** (`ON CONFLICT(email) DO UPDATE`), đồng thời ghi một dòng audit log.
