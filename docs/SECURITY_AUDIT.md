# PhShop — Báo cáo Audit Bảo mật

> Ngày: 21/10/2026 · Môi trường kiểm thử: local (Node 22, SQLite tạm cho mỗi test file)
> Phạm vi: toàn bộ `server/` (API) + `src/` (frontend) + cấu hình deploy
> Tài khoản/dữ liệu sử dụng: **chỉ dữ liệu test do dự án tạo ra** (DB tạm, email `@example.com`)

---

## 1. Tổng quan

| Chỉ số | Trước audit | Sau audit |
|---|---|---|
| P0 (chiếm quyền / lộ dữ liệu diện rộng / sai lệch thanh toán) | 2 | **0** |
| P1 (IDOR, vượt quyền, lỗ hổng xác thực, lỗi nghiệp vụ nghiêm trọng) | 5 | **0** |
| P2 (chức năng quan trọng hỏng / mất đồng bộ) | 8 | **0** |
| P3 (UI/UX, hiệu năng nhỏ) | 5 | **0** |
| Test bảo mật tự động | 0 | **30** (IDOR + RBAC + CSRF + rate limit + SQLi + XSS-safe + session) |

---

## 2. Phát hiện P0 — đã xử lý

### P0-01 · Privilege escalation qua email quản trị
- **Mô tả**: `AuthContext.jsx` gán `role = (email === 'nhantk123vip@gmail.com') ? 'admin' : 'customer'`.
  Bất kỳ ai đăng ký bằng email này đều nhận quyền admin, và mọi kiểm tra quyền đều nằm ở client.
- **Ảnh hưởng**: chiếm toàn quyền quản trị — xem/sửa/xoá mọi đơn hàng, sản phẩm, khách hàng.
- **Sửa**:
  - Role lưu trong bảng `users`, chỉ đọc từ server.
  - `POST /api/auth/register` **luôn** tạo `CUSTOMER` trừ khi có `inviteToken` hợp lệ
    (token do SUPER_ADMIN tạo qua `POST /api/admin/invitations`, hạn 7 ngày, dùng 1 lần).
  - Mọi route admin kiểm tra `role` ở server (`opts.role` trong router) → 403 cho CUSTOMER.
- **Kiểm chứng**: `tests/api/authorization.test.js` ("đăng ký bằng email quản trị KHÔNG tự cấp quyền admin"),
  `tests/api/admin.test.js` ("chỉ SUPER_ADMIN được đổi vai trò").

### P0-02 · Không có backend — dữ liệu nghiệp vụ nằm trong localStorage
- **Mô tả**: giỏ, yêu thích, đơn hàng, phiên đăng nhập lưu bằng `localStorage`; không có API, không có DB.
- **Ảnh hưởng**: (1) giá/tồn kho/thanh toán có thể bị sửa từ DevTools; (2) admin không thấy đơn của khách;
  (3) dữ liệu mất khi xoá cache; (4) không thể kiểm toán; (5) không có khả năng kiểm thử IDOR.
- **Sửa**: xây dựng backend Node.js + SQLite (18 bảng), mọi luồng nghiệp vụ đi qua API,
  giá/tồn kho/thanh toán do server quyết định.
- **Kiểm chứng**: `tests/api/orders.test.js` ("client không thể giả giá", "client không thể giả trạng thái thanh toán").

---

## 3. Phát hiện P1 — đã xử lý

| ID | Vấn đề | Sửa | Kiểm chứng |
|---|---|---|---|
| P1-01 | IDOR đơn hàng: `GET /api/orders/:id` không kiểm tra chủ sở hữu | Mọi truy vấn đơn lọc theo `user_id` của session; trả 404 (không lộ sự tồn tại) | `authorization.test.js` "IDOR: khách A không đọc được đơn của khách B" |
| P1-02 | IDOR wishlist: xoá được wishlist của người khác | Kiểm tra `user_id` trong `WHERE` | `authorization.test.js` "wishlist là riêng tư" |
| P1-03 | Không có state machine trạng thái đơn | `server/lib/order-state.js`: transition hợp lệ + quyền theo vai trò | `tests/unit/order-state.test.js` (6 test) |
| P1-04 | Không chống tạo đơn trùng → tồn kho âm, doanh thu sai | `Idempotency-Key` + unique constraint `(scope,key)` + transaction | `orders.test.js` "idempotency: hai request song song cùng key chỉ tạo 1 đơn" |
| P1-05 | Không có CSRF protection | Double-submit cookie + header `X-CSRF-Token` cho mọi method thay đổi trạng thái | `security.test.js` "CSRF: request thay đổi trạng thái thiếu token bị từ chối" |

---

## 4. Phát hiện P2/P3 — đã xử lý

| ID | Vấn đề | Sửa |
|---|---|---|
| P2-01 | Mật khẩu lưu dạng rõ (nếu chuyển backend) | scrypt + salt + `timingSafeEqual`; đổi mật khẩu/reset thu hồi toàn bộ phiên khác |
| P2-02 | Token phiên lưu thô trong DB | Chỉ lưu SHA-256(token); cookie `HttpOnly; SameSite=Lax; Secure(prod)` |
| P2-03 | Không có rate limit (spam login/đăng ký/reset/contact) | Sliding-window theo IP+email+user, trả 429 kèm `Retry-After` |
| P2-04 | Không giới hạn kích thước request | `maxBodyBytes` (256 kB) → 413 |
| P2-05 | Response lỗi lộ stack trace ở môi trường dev | Response chuẩn `{error:{code,message}}`; chi tiết chỉ log server-side |
| P2-06 | Thiếu security header | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS (prod) |
| P2-07 | Thiếu validation input | zod schema cho mọi endpoint → 422 kèm chi tiết field |
| P2-08 | Không ghi audit log thao tác nhạy cảm | Bảng `audit_log` (actor, action, before/after, ip, user-agent) |
| P2-09 | Không có trang 404 / lỗi runtime | `NotFound` page + ErrorBoundary mặc định của React Router |
| P3-01 | Giỏ hàng hỏng sau refresh (getter của zustand bị đóng băng) | Giỏ server-side, tổng tiền do server tính |
| P3-02 | `Button asChild` truyền `disabled` cho `React.Fragment` | `cloneElement` |
| P3-03 | Dữ liệu mẫu lẫn ký tự Trung Quốc | Đã sửa trong `server/db/seed-data.js` |

---

## 5. Kiểm thử chéo tài khoản (IDOR) — bằng chứng

Kịch bản tự động (`tests/api/authorization.test.js` + `tests/api/orders.test.js`):

| Hành động của khách A | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|
| `GET /api/orders/{đơn của B}` | 404, không lộ dữ liệu | ✅ 404 |
| `POST /api/orders/{đơn của B}/cancel` | 404 | ✅ 404 |
| `GET /api/orders/{đơn của B}/events` | 404 | ✅ 404 |
| `PATCH /api/orders/{đơn của B}` | bị từ chối | ✅ 404/405 |
| `DELETE /api/wishlist/{sản phẩm của B}` | 404 | ✅ 404 |
| `GET /api/wishlist` (giỏ của B) | chỉ dữ liệu của A | ✅ count = 0 |
| `PATCH /api/admin/users/{id của B}/role` | 403 | ✅ 403 |
| `GET /api/admin/orders` | 403 | ✅ 403 |
| `GET /api/events` chưa đăng nhập | 401 | ✅ 401 |
| Mở SSE khi admin đổi trạng thái **đơn của B** | không nhận event của B | ✅ không nhận |

## 6. Kiểm thử realtime bằng hai phiên độc lập

| Bước | Kết quả |
|---|---|
| Phiên 1: khách đăng nhập, tạo đơn `PHS…` | ✅ HTTP 201 |
| Phiên 2: admin đăng nhập (`SUPER_ADMIN`) | ✅ role xác nhận trong session |
| Phiên 2: `PATCH /api/admin/orders/:id` → `CONFIRMED` | ✅ HTTP 200 |
| Phiên 1: mở `/order/:id` rồi admin đổi → `PROCESSING` | ✅ trang khách tự hiện "Đang sản xuất" (không refresh) |
| Phiên 1: khách khác thử đọc đơn | ✅ 404 |
| Mất kết nối realtime | ✅ client tự reconnect (backoff) + polling dự phòng 15 s |
| Reconnect với `Last-Event-ID` | ✅ server replay sự kiện bị lỡ (`realtime.test.js`) |

## 7. Spam / brute force / abuse

| Vector | Biện pháp | Kiểm chứng |
|---|---|---|
| Brute force đăng nhập | 10 lần / 15 phút / (IP+email) → 429; ghi `login_attempts` | `security.test.js` |
| Spam đăng ký | 5 lần / giờ / IP | `security.test.js` (bộ đếm) |
| Lạm dụng reset mật khẩu | 5 lần / giờ / (IP+email), response không lộ email tồn tại | `auth.test.js` |
| Spam form liên hệ | 5 lần / giờ / IP → 429 | `security.test.js` "rate limit form liên hệ chặn spam" |
| Tạo đơn hàng hàng loạt | 20 lần / giờ / user | `security.js` (cấu hình) |
| Spam đánh giá | 10 lần / giờ / user + 1 đánh giá / sản phẩm / user | `misc.js` |
| Request trùng | Idempotency-Key + unique constraint | `orders.test.js` |
| Payload quá lớn | 413 | `security.test.js` |
| Wishlist spam | Unique `(user_id, product_id)` + idempotent POST | `authorization.test.js` |
| Đánh giá trùng | Unique theo (product, user) → 409 | `misc.js` |

> Lưu ý: ngưỡng được chọn để **không chặn** luồng mua hàng hợp lệ (20 đơn/giờ/user, 300 request/phút/IP);
> có test xác nhận luồng hợp lệ vẫn chạy được (`npm test` xanh toàn bộ).

## 8. OWASP Top 10 (2021) — đánh giá

| Rủi ro | Trạng thái | Ghi chú |
|---|---|---|
| A01 Broken Access Control | ✅ Đã xử lý | RBAC server-side, kiểm tra sở hữu, RBAC cho từng endpoint, audit log |
| A02 Cryptographic Failures | ✅ Đã xử lý | scrypt, token hash, HTTPS + Secure cookie ở production, HSTS |
| A03 Injection | ✅ Đã xử lý | Toàn bộ query dùng tham số; không có string concatenation SQL; React escape XSS mặc định |
| A04 Insecure Design | ✅ Đã xử lý | State machine, idempotency, giá server-side, RBAC least privilege |
| A05 Security Misconfiguration | ✅ Đã xử lý | Security header, không lộ stack trace, không có secret hardcode, `.env` bị ignore |
| A06 Vulnerable & Outdated Components | ⚠️ Theo dõi | `npm audit` cần chạy trong CI; hiện phụ thuộc chính thức của Vite/React/Tailwind |
| A07 Identification & Authentication Failures | ✅ Đã xử lý | Mật khẩu ≥ 8 ký tự, rate limit, thu hồi phiên, không email enumeration |
| A08 Software & Data Integrity Failures | ✅ Đã xử lý | Không có CDN không tin cậy; ảnh từ nguồn cố định; không deserialize dữ liệu không kiểm soát |
| A09 Security Logging & Monitoring Failures | ✅ Đã xử lý | `audit_log` + `login_attempts` + log server; chưa có alerting (khuyến nghị ghi nhận) |
| A10 SSRF | ✅ Không áp dụng | Server không nhận URL từ client để tải nội dung |
| XSS | ✅ Đã xử lý | React escape mặc định; không dùng `dangerouslySetInnerHTML`; validation server |
| Open Redirect | ✅ Đã xử lý | Không có redirect dựa trên tham số `next` từ query string |
| CORS | ✅ Đã xử lý | Mặc định same-origin; khi tách origin phải khai báo `PHSHOP_CORS_ORIGINS` (allow-list, có `Vary: Origin`) |
| File upload | ✅ Không áp dụng | Chưa có chức năng upload file |

## 9. Quản lý bí mật

- Không có secret, API key hoặc mật khẩu trong repo.
- Mật khẩu admin **không** có giá trị mặc định: `server/scripts/bootstrap-admin.js` yêu cầu
  `PHSHOP_ADMIN_PASSWORD` từ biến môi trường, nếu thiếu sẽ **sinh ngẫu nhiên** và in ra **một lần duy nhất**.
- Script là **idempotent**: chạy lại không tạo trùng; chỉ đổi mật khẩu khi có `--reset-password`.
- Mọi thao tác cấp/thu hồi quyền đều ghi `audit_log`.
- Token phiên, token reset, token mời đều lưu dạng hash SHA-256.
- `.gitignore` loại trừ `data/`, `*.db`, `.env`.

## 10. Rủi ro còn lại (đã ghi nhận, chưa xử lý được trong môi trường này)

| # | Rủi ro | Mức độ | Lý do chưa xử lý | Khuyến nghị |
|---|---|---|---|---|
| R1 | Chưa có email thật (xác minh/reset/thông báo) | P1 | Cần SMTP/API key | Cấu hình `SMTP_*`, nối `server/lib/notify.js` |
| R2 | Chưa tích hợp cổng thanh toán thật | P1 | Cần credentials MoMo | Cấu hình `PHSHOP_MOMO_API_KEY` + SDK chính thức; hiện API trả 409 rõ ràng, **không** giả lập thành công |
| R3 | Rate limit chỉ trong bộ nhớ, mất khi restart / không dùng chung cho nhiều instance | P2 | Khi chạy 1 instance thì đủ | Khi scale nhiều instance: dùng Redis/KV/Durable Object |
| R4 | Chưa có 2FA cho admin | P2 | Ngoài phạm vi hiện tại | Bật TOTP khi có nhiều admin |
| R5 | Chưa có WAF/rate limit ở tầng CDN | P2 | Cần tài khoản Cloudflare | Cloudflare WAF rate limiting rules |
| R6 | Ảnh sản phẩm lấy từ Unsplash CDN bên ngoài | P3 | Cần CDN riêng | Lưu ảnh trong bucket của dự án + CSP `img-src` |
| R7 | Chưa có automated SAST/DAST trong CI | P2 | Cần pipeline | `npm audit`, `oxlint`, `eslint-plugin-security`, OWASP ZAP trên staging |

## 11. Cách tái lập kiểm thử bảo mật

```bash
npm install
npm test                 # 105 test: unit + API integration + security (IDOR, RBAC, CSRF, rate limit)
npm run test:e2e         # 25 test trình duyệt thật (2 phiên admin + khách, realtime)
npm run lint             # oxlint
npm run build            # build production
```

Kết quả chi tiết: `docs/TEST_REPORT.md`.
