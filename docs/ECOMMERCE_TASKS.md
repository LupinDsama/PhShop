# PhShop — Bảng theo dõi Task

> Cập nhật: 21/10/2026 · Trạng thái: `TODO` · `IN_PROGRESS` · `BLOCKED` · `DONE`
> `DONE` chỉ được đặt khi có bằng chứng kiểm thử cụ thể (lệnh test + kết quả).

| ID | Task | Priority | Status | File/Module | Tiêu chí nghiệm thu | Test | Kết quả lần chạy gần nhất | Lỗi phát hiện & cách sửa | Bằng chứng |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Xác thực backend: đăng ký/đăng nhập/đăng xuất/phiên | P0 | DONE | `server/routes/auth.js`, `server/lib/session.js` | Mật khẩu băm scrypt, phiên cookie HttpOnly, TTL 48h, thu hồi phiên | `tests/api/auth.test.js` | 12/12 PASS | — | `npm test` |
| AUTH-002 | Chặn privilege escalation (email admin không tự cấp quyền) | P0 | DONE | `server/routes/auth.js` | Đăng ký bằng email admin → role CUSTOMER; API admin → 403 | `tests/api/authorization.test.js` | 11/11 PASS | — | `npm test` |
| AUTH-003 | Quản lý hồ sơ, đổi mật khẩu, địa chỉ, phiên đăng nhập | P1 | DONE | `server/routes/auth.js`, `src/pages/Profile.jsx` | Lưu hồ sơ, đổi mật khẩu thu hồi phiên khác, xem/thu hồi phiên | `tests/api/auth.test.js` | PASS | — | `npm test` |
| AUTH-004 | Quên/đặt lại mật khẩu không lộ email tồn tại | P1 | DONE | `server/routes/auth.js` | Response giống nhau dù email có/không; token 1 lần | `tests/api/auth.test.js` | PASS | — | `npm test` |
| AUTH-005 | CSRF protection (double-submit) | P0 | DONE | `server/lib/security.js` | Thiếu/sai token → 403 | `tests/api/security.test.js` | 14/14 PASS | Thiếu token bị 403 | `npm test` |
| AUTH-006 | Rate limit login / register / reset | P1 | DONE | `server/lib/security.js` | Chặn bằng 429 sau ngưỡng | `tests/api/security.test.js` | PASS | — | `npm test` |
| ORDER-001 | Đơn hàng server-side + state machine + lịch sử | P1 | DONE | `server/routes/orders.js`, `server/lib/order-state.js` | Tạo/đọc/hủy/trả hàng đúng transition; lưu `order_events` | `tests/api/orders.test.js`, `tests/unit/order-state.test.js` | 19+6 PASS | — | `npm test` |
| ORDER-002 | Realtime SSE + reconnect + polling dự phòng | P1 | DONE | `server/lib/events.js`, `server/routes/events.js`, `src/lib/realtime.js` | Khách nhận `order.updated` khi admin đổi trạng thái; không rò rỉ đơn người khác | `tests/api/realtime.test.js`, E2E `ECOM-011` | 7/7 + 1/1 PASS | — | `npm test`, `npm run test:e2e` |
| ORDER-003 | Idempotency tạo đơn (double-click / retry) | P1 | DONE | `server/routes/orders.js` | Cùng `Idempotency-Key` → 1 đơn, kể cả song song | `tests/api/orders.test.js` | PASS | — | `npm test` |
| ORDER-004 | Server tính lại giá/tồn kho, trừ kho an toàn | P0 | DONE | `server/routes/orders.js`, `server/lib/pricing.js` | Client gửi giá giả bị bỏ qua; tồn kho trừ có điều kiện; hủy đơn trả lại kho | `tests/api/orders.test.js` | PASS | — | `npm test` |
| ORDER-005 | Phân trang + lọc trạng thái trang đơn khách | P2 | DONE | `server/routes/orders.js`, `src/pages/Order.jsx` | Chỉ thấy đơn của mình; lọc theo trạng thái | `tests/api/orders.test.js`, `tests/api/authorization.test.js` | PASS | — | `npm test` |
| CART-001 | Giỏ hàng server-side + đồng bộ nhiều thiết bị | P1 | DONE | `server/routes/cart.js`, `src/store/cart.js` | Refresh không mất dữ liệu; 2 thiết bị thấy cùng giỏ | `tests/api/cart.test.js`, E2E `ECOM-004` | 11/11 + 2/2 PASS | Zustand getter bị serialize thành giá trị stale → thay bằng server-side | `npm test`, `npm run test:e2e` |
| CART-002 | Hợp nhất giỏ khách vãng lai vào giỏ tài khoản | P1 | DONE | `server/routes/cart.js` | Gộp theo (variant, note), giới hạn tồn kho | `tests/api/cart.test.js` | PASS | — | `npm test` |
| CART-003 | Chặn số lượng âm/0/vượt giới hạn, chống dòng trùng | P1 | DONE | `server/routes/cart.js`, `server/lib/validate.js` | Server clamp theo `max_qty`/tồn kho; 422 nếu vượt schema | `tests/api/cart.test.js` | PASS | — | `npm test` |
| WISH-001 | Wishlist server-side + phân quyền + chống trùng | P2 | DONE | `server/routes/wishlist.js`, `src/store/wishlist.js` | A không xem/xoá được wishlist B; thêm lặp không tạo bản ghi trùng | `tests/api/authorization.test.js`, E2E `ECOM-005` | PASS | — | `npm test`, `npm run test:e2e` |
| PROD-001 | Sản phẩm + biến thể + tồn kho + API public | P0 | DONE | `server/routes/products.js`, `server/db/seed-data.js` | Danh sách/chi tiết/tìm kiếm/phân trang; biến thể có SKU, giá, kho, min/max | `tests/api/cart.test.js`, E2E smoke | PASS | — | `npm test` |
| PROD-002 | Admin CRUD sản phẩm có validation | P1 | DONE | `server/routes/admin.js`, `src/pages/admin/ProductsTab.jsx` | Tạo/sửa/ẩn/xoá; validation slug, biến thể, giá | `tests/api/admin.test.js` | 14/14 PASS | — | `npm test` |
| ADMIN-001 | Phân quyền RBAC server-side (4 vai trò) | P0 | DONE | `server/routes/admin.js`, `server/lib/order-state.js` | CUSTOMER bị 403; SUPPORT không đổi thanh toán; chỉ SUPER_ADMIN đổi vai trò | `tests/api/admin.test.js`, `tests/api/authorization.test.js` | PASS | — | `npm test` |
| ADMIN-002 | Dashboard đầy đủ (đơn, sản phẩm, khách, coupon, đánh giá, tin nhắn, audit, cấu hình) | P1 | DONE | `src/pages/Admin.jsx`, `src/pages/admin/*` | 8 tab, mỗi tab có loading/empty/error/phân trang | `tests/api/admin.test.js`, E2E `ADMIN-002` | PASS | — | `npm run test:e2e` |
| ADMIN-003 | Cập nhật trạng thái đơn: transition hợp lệ, chống ghi đè, ghi chú | P1 | DONE | `server/routes/admin.js` | Transition sai → 422; version cũ → 409; ghi chú nội bộ không lộ cho khách | `tests/api/admin.test.js` | PASS | — | `npm test` |
| ADMIN-004 | Quy trình cấp quyền quản trị an toàn | P0 | DONE | `server/scripts/bootstrap-admin.js`, `server/routes/admin.js` | Không tự cấp khi đăng ký; bootstrap idempotent có audit log; invitation token 1 lần | `tests/api/admin.test.js`, `tests/api/authorization.test.js` | PASS | — | `npm test` |
| AUDIT-001 | Audit log cho thao tác nhạy cảm | P1 | DONE | `server/lib/audit.js` | Có bản ghi cho order.create, order.update, user.role.change… | `tests/api/admin.test.js`, `tests/api/orders.test.js` | PASS | — | `npm test` |
| PAY-001 | Trạng thái thanh toán riêng, không giả lập thành công | P0 | DONE | `server/lib/payment.js`, `server/routes/orders.js` | COD → UNPAID; MoMo chưa cấu hình → 409, không đánh dấu đã thanh toán | `tests/api/orders.test.js` | PASS | — | `npm test` |
| SEC-001 | Security headers, body limit, không lộ stack trace | P1 | DONE | `server/lib/security.js`, `server/lib/http.js` | CSP + X-Frame-Options…; body >256 kB → 413; response không có stack | `tests/api/security.test.js` | PASS | `readBody` destroy socket trước khi gửi 413 → chuyển sang `pause()` | `npm test` |
| SEC-002 | Chống SQL injection | P1 | DONE | Toàn bộ query dùng tham số | Payload `'; DROP TABLE…` không phá hệ thống | `tests/api/security.test.js` | PASS | — | `npm test` |
| SEC-003 | IDOR: đơn/wishlist/hồ sơ/phiên | P0 | DONE | `server/routes/*.js` | A không đọc/hủy/sửa dữ liệu của B (404) | `tests/api/authorization.test.js`, E2E `ECOM-014` | PASS | — | `npm test`, `npm run test:e2e` |
| QA-001 | Smoke test toàn bộ page (9 route + 404) | P1 | DONE | `tests/e2e/browser-suite.mjs` | Mỗi route HTTP 200 + có nội dung, 0 lỗi console | `npm run test:e2e` | 25/25 PASS | `/products` dùng `getByText` không match placeholder → đổi sang `getByPlaceholder` | `docs/e2e-results.json` |
| QA-002 | Regression suite (unit + API) | P1 | DONE | `tests/` | 105 test xanh | `npm test` | 105/105 PASS | — | — |
| QA-003 | E2E 2 phiên độc lập (admin + khách) realtime | P1 | DONE | `tests/e2e/browser-suite.mjs` | Admin đổi trạng thái → trang khách tự cập nhật | `npm run test:e2e` | PASS | Thiếu CSRF header khi gọi API từ script → lấy token từ cookie của browser context | `docs/e2e-results.json` |
| QA-005 | E2E trên dev server (StrictMode) | P1 | DONE | `src/context/AuthContext.jsx` | Route bảo vệ không kẹt ở màn loading ở dev | `npm run test:e2e:dev` | 25/25 PASS | `mounted.current` không set lại `true` sau cleanup của StrictMode → `isReady` không bật | `docs/e2e-results.json` |
| QA-004 | Responsive mobile 375px | P2 | DONE | Tailwind layout | Không tràn ngang | `npm run test:e2e` | PASS | — | `docs/e2e-results.json` |
| PERF-001 | Code splitting admin + lazy ảnh + debounce | P3 | DONE | `src/App.jsx`, `src/pages/Products.jsx` | Chunk admin tách riêng; ảnh lazy; search debounce 300ms | `npm run build` | Admin chunk 51 kB, main 599 kB (182 kB gzip) | `manualChunks` dạng object không hợp lệ với rolldown → dùng `React.lazy` | — |
| DOC-001 | Tài liệu audit/tasks/security/test/deployment | P1 | DONE | `docs/*.md` | 5 tài liệu đầy đủ, không chứa secret | — | DONE | — | `docs/` |
| DEPLOY-001 | Triển khai API lên Cloudflare Workers + D1 | P1 | **BLOCKED** | `server/` | API chạy trên Cloudflare | — | — | Cần tài khoản Cloudflare + viết lại tầng DB cho D1 (node:sqlite không chạy trên Workers) | `docs/DEPLOYMENT.md` §4 |
| DEPLOY-002 | Tích hợp cổng thanh toán MoMo | P1 | **BLOCKED** | `server/lib/payment.js` | Thanh toán qua API MoMo thật | — | — | Cần API key + secret + SDK chính thức; hiện trả 409 với thông báo rõ ràng | `docs/DEPLOYMENT.md` §3 |
| DEPLOY-003 | Gửi email thật (xác minh/reset/thông báo đơn) | P1 | **BLOCKED** | `server/lib/notify.js` (chưa tạo) | Email được gửi qua SMTP/API | — | — | Cần SMTP credentials; hiện token được trả về ở môi trường dev và **không** gửi email | `docs/DEPLOYMENT.md` §3 |

---

## Ghi chú

- Không có test nào bị xoá, bỏ qua hay làm yếu để đạt trạng thái "xanh".
- Các test bảo mật được viết để **thất bại** nếu cơ chế bảo vệ bị gỡ bỏ (ví dụ bỏ `role` check →
  `authorization.test.js` fail).
- 3 task `BLOCKED` phụ thuộc dịch vụ bên ngoài; mọi task khác đã hoàn thành và có bằng chứng.
