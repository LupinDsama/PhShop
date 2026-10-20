# PhShop — Báo cáo Kiểm thử

> Ngày chạy: 21/10/2026 · Môi trường: Windows, Node v22.23.2, npm 10.9.8
> Lệnh: `npm test` (unit + API), `npm run test:e2e` (trình duyệt thật, bản build production)
> và `npm run test:e2e:dev` (trình duyệt thật trên dev server — bắt lỗi chỉ xảy ra ở StrictMode)

---

## 1. Tổng quan

| Bộ test | Lệnh | Tổng | Pass | Fail | Skip | Blocked |
|---|---|---|---|---|---|---|
| Unit (business logic) | `npm run test:unit` | 17 | 17 | 0 | 0 | 0 |
| API integration + security | `npm run test:api` | 88 | 88 | 0 | 0 | 0 |
| **Tổng API+Unit** | `npm test` | **105** | **105** | **0** | **0** | **0** |
| E2E trình duyệt thật (bản build production) | `npm run test:e2e` | 25 | 25 | 0 | 0 | 0 |
| E2E trên dev server (Vite + StrictMode) | `npm run test:e2e:dev` | 25 | 25 | 0 | 0 | 0 |
| **Tổng toàn bộ** | | **130** | **130** | **0** | **0** | **0** |

Thời gian: `npm test` ≈ 26 s · `npm run test:e2e` ≈ 90 s (gồm build production).

> Lưu ý môi trường: hình ảnh sản phẩm lấy từ `images.unsplash.com` bị chặn bởi mạng của máy test
> (`ERR_BLOCKED_BY_ORB`) — đây là hạn chế của môi trường, không phải lỗi ứng dụng; các test
> không phụ thuộc vào tải ảnh nên vẫn xanh. **0 lỗi console** trên mọi trang.

---

## 2. Chi tiết theo file test

| File | Số test | Pass | Nội dung |
|---|---|---|---|
| `tests/unit/pricing.test.js` | 7 | 7 | Tính tổng, coupon (percent/fixed/free_shipping), giới hạn giảm giá, `safeQuantity` |
| `tests/unit/order-state.test.js` | 6 | 6 | Transition hợp lệ/không hợp lệ, quyền theo vai trò, trạng thái thanh toán |
| `tests/unit/password.test.js` | 4 | 4 | scrypt hash/verify, salt ngẫu nhiên, hash token |
| `tests/api/auth.test.js` | 12 | 12 | Đăng ký/đăng nhập/đăng xuất, cookie HttpOnly, session, profile, đổi mật khẩu + thu hồi phiên, reset mật khẩu, không lộ email |
| `tests/api/authorization.test.js` | 11 | 11 | **IDOR** (đơn/wishlist/hồ sơ), privilege escalation, chặn API admin, 401/403 |
| `tests/api/cart.test.js` | 11 | 11 | Thêm/gộp/xoá, clamp số lượng, bảo vệ theo cookie, đồng bộ 2 thiết bị, hợp nhất giỏ |
| `tests/api/orders.test.js` | 19 | 19 | Tạo đơn, giá giả bị bỏ qua, idempotency (tuần tự + song song), trừ/hoàn kho, hủy/trả hàng, lịch sử, coupon, thanh toán chưa cấu hình |
| `tests/api/admin.test.js` | 14 | 14 | Transition trạng thái, ghi chú nội bộ, version conflict, CRUD sản phẩm, phân quyền vai trò, invitation, coupon, audit log |
| `tests/api/realtime.test.js` | 7 | 7 | SSE khách nhận event, không rò rỉ đơn người khác, admin nhận mọi đơn, replay `Last-Event-ID`, 401 chưa đăng nhập, polling dự phòng |
| `tests/api/security.test.js` | 14 | 14 | Security header, CSRF (thiếu/sai/đúng), 404/405, không lộ stack trace, SQL injection, giới hạn body, rate limit, không lộ token |
| **Tổng** | **105** | **105** | |

---

## 3. Smoke test từng page (E2E, bản build production)

| Route | Kết quả | Ghi chú |
|---|---|---|
| `/` | ✅ HTTP 200 + nội dung | Hero, danh mục, sản phẩm nổi bật (fetch từ API) |
| `/about` | ✅ HTTP 200 + nội dung | |
| `/products` | ✅ HTTP 200 + lọc danh mục + ô tìm kiếm | Danh sách lấy từ API, có phân trang |
| `/products/mo-hinh-ky-vien-3d` | ✅ HTTP 200 + biến thể + nút thêm giỏ | Chọn biến thể, tồn kho, số lượng max |
| `/cart` | ✅ HTTP 200 | Giỏ server-side, badge cập nhật, xoá/đổi số lượng |
| `/wishlist` | ✅ HTTP 200 | Yêu cầu đăng nhập khi chưa đăng nhập |
| `/login` | ✅ HTTP 200 + form | Đăng nhập thật (E2E-001) |
| `/register` | ✅ HTTP 200 + form | Đăng ký thật (E2E-001) |
| `/contact` | ✅ HTTP 200 + form | Gửi form → lưu DB |
| `/checkout` | ✅ (nằm trong luồng đặt hàng) | Yêu cầu đăng nhập, tạo đơn thật |
| `/order`, `/order/:id` | ✅ | Xem đơn, lịch sử, hủy/trả hàng |
| `/admin` | ✅ (với admin) / ✅ bị chặn (với khách) | Dashboard + 8 tab |
| `/profile` | ✅ | Hồ sơ, đổi mật khẩu, danh sách phiên |
| Route lạ (`/khong-ton-tai-abc`) | ✅ Trang 404 | HTTP 200 (SPA) + nội dung "Không tìm thấy trang" |

**Lỗi console: 0** trên toàn bộ các trang.

---

## 4. Ma trận test nghiệp vụ (theo đề bài)

| Test ID | Kịch bản | Kết quả mong đợi | Kết quả thực tế | Nơi kiểm chứng |
|---|---|---|---|---|
| ECOM-001 | Mở trang Products | Danh sách sản phẩm tải thành công | ✅ | E2E `SMOKE-/products` |
| ECOM-002 | Mở chi tiết sản phẩm | Thông tin và biến thể đúng | ✅ | E2E `SMOKE-/products/mo-hinh-ky-vien-3d` |
| ECOM-003 | Thêm sản phẩm vào giỏ | Đúng biến thể và số lượng | ✅ badge = 1 | E2E `ECOM-003` |
| ECOM-004 | Refresh trang giỏ | Dữ liệu vẫn đúng theo chính sách lưu | ✅ badge = 1 sau refresh, giỏ hiện sản phẩm | E2E `ECOM-004`, `ECOM-004b` |
| ECOM-005 | Thêm/xoá wishlist | Database và UI đồng bộ | ✅ 201/200, count = 1, `alreadyExists` | E2E `ECOM-005`, API `authorization.test.js` |
| ECOM-006 | Đăng ký và đăng nhập | Xác thực đúng | ✅ session trả đúng email | E2E `AUTH-001`, API `auth.test.js` |
| ECOM-007 | Đặt hàng hợp lệ | Đơn được tạo một lần | ✅ mã `PHS…`, idempotency | E2E `ECOM-007`, API `orders.test.js` |
| ECOM-008 | Giá hoặc tồn kho thay đổi | Server kiểm tra và phản hồi đúng | ✅ 422 + chi tiết item lỗi | API `orders.test.js` |
| ECOM-009 | Khách xem lịch sử đơn | Chỉ thấy đơn của chính mình | ✅ | API `orders.test.js`, `authorization.test.js` |
| ECOM-010 | Admin cập nhật trạng thái | Database và audit log được cập nhật | ✅ 200 + `audit_log` | API `admin.test.js` |
| ECOM-011 | Khách đang mở trang Order | Nhận trạng thái mới qua realtime | ✅ tự hiện "Đang sản xuất" | E2E `ECOM-011`, API `realtime.test.js` |
| ECOM-012 | Mất kết nối realtime | Tự kết nối lại hoặc đồng bộ bằng API | ✅ reconnect + replay `Last-Event-ID` + polling 15 s | API `realtime.test.js` |
| ECOM-013 | Khách gọi API admin | Bị từ chối | ✅ 403 | E2E `ECOM-013` |
| ECOM-014 | Thay order ID của tài khoản khác | Bị từ chối, không lộ dữ liệu | ✅ 404 | E2E `ECOM-014`, API `authorization.test.js` |
| ECOM-015 | Request tạo đơn lặp | Không tạo đơn trùng | ✅ 1 đơn (kể cả 2 request song song) | API `orders.test.js` |
| ECOM-016 | Hủy đơn không hợp lệ | Server từ chối | ✅ 422 khi đã sản xuất | API `orders.test.js` |
| ECOM-017 | Thanh toán thất bại | Không báo đã thanh toán | ✅ MoMo chưa cấu hình → 409, `paymentStatus = UNPAID` | API `orders.test.js` |
| ECOM-018 | Admin thay đổi sản phẩm | UI khách phản ánh dữ liệu mới | ✅ sản phẩm `hidden` không còn trong API public | API `admin.test.js` |
| ECOM-019 | Gửi form liên hệ liên tục | Có giới hạn abuse phù hợp | ✅ 429 sau ngưỡng | API `security.test.js` |
| ECOM-020 | Kiểm thử responsive | Không lỗi nghiêm trọng ở viewport mục tiêu | ✅ overflow = 0px ở 375px | E2E `ECOM-020` |

### Bổ sung ngoài 20 test bắt buộc

| ID | Kịch bản | Kết quả |
|---|---|---|
| AUTH-SEC-01 | CSRF: thiếu token | 403 ✅ |
| AUTH-SEC-02 | CSRF: token sai | 403 ✅ |
| AUTH-SEC-03 | SQL injection qua query/body | Không ảnh hưởng hệ thống ✅ |
| AUTH-SEC-04 | Body > 256 kB | 413 ✅ |
| AUTH-SEC-05 | Stack trace không lộ ra client | ✅ |
| AUTH-SEC-06 | Response reset mật khẩu không lộ email tồn tại | ✅ |
| AUTH-SEC-07 | Đổi mật khẩu thu hồi phiên khác | ✅ |
| AUTH-SEC-08 | Session không chứa token trong body | ✅ |
| CART-SEC-01 | Xoá dòng giỏ của người khác | 404 ✅ |
| ORD-SEC-01 | Client gửi `total`/`paymentStatus` giả | Server bỏ qua ✅ |
| ORD-SEC-02 | Coupon dưới ngưỡng / không tồn tại | 422 ✅ |
| ADM-SEC-01 | `expectedVersion` cũ | 409 ✅ |
| ADM-SEC-02 | SUPPORT cập nhật thanh toán | 422 ✅ |
| ADM-SEC-03 | SUPER_ADMIN tự hạ quyền | 400 ✅ |
| ADM-SEC-04 | Token mời dùng lần hai | Không cấp quyền ✅ |
| RT-SEC-01 | Khách A nhận event của đơn B | Không ✅ |

---

## 5. Kiểm tra quyền admin & truy cập chéo tài khoản

| Kiểm tra | Kỳ vọng | Kết quả |
|---|---|---|
| Khách gọi `GET /api/admin/orders` | 403 | ✅ |
| Khách gọi `POST /api/admin/products` | 403 | ✅ |
| Chưa đăng nhập gọi `GET /api/admin/users` | 401 | ✅ |
| Khách đăng ký bằng email quản trị | role = CUSTOMER | ✅ |
| Khách tự `PATCH /api/admin/users/:id/role` | 403 | ✅ |
| Khách đọc đơn của người khác | 404 | ✅ |
| Khách xoá wishlist của người khác | 404 | ✅ |
| Khách mở SSE chưa đăng nhập | 401 | ✅ |
| SUPPORT cập nhật trạng thái thanh toán | 422 | ✅ |
| Chỉ SUPER_ADMIN mở `/api/admin/users/:id/role` | 403 cho ADMIN | ✅ |
| Admin thấy đơn của mọi khách | 200 + danh sách | ✅ |
| Ghi chú nội bộ không lộ cho khách | `internalNote` = undefined | ✅ |

---

## 6. Kiểm thử realtime bằng hai phiên độc lập

| Bước | Kết quả |
|---|---|
| Phiên A (khách) đăng nhập + tạo đơn | ✅ 201, mã `PHS…` |
| Phiên B (admin) đăng nhập | ✅ role `SUPER_ADMIN` |
| Phiên B cập nhật trạng thái qua API | ✅ 200 |
| Phiên A mở trang đơn | ✅ hiển thị đúng trạng thái mới |
| Phiên B đổi trạng thái lần 2 (không refresh) | ✅ Phiên A tự cập nhật ("Đang sản xuất") |
| Sự kiện của đơn người khác | ✅ Không nhận nhầm |
| Reconnect `Last-Event-ID` | ✅ Replay đúng sự kiện bị lỡ |
| Mất kết nối | ✅ Tự reconnect (exponential backoff) + polling dự phòng |

---

## 7. Hiệu năng & build

| Hạng mục | Kết quả đo |
|---|---|
| Bundle chính | 599 kB (182 kB gzip) |
| Chunk Admin (lazy) | 51 kB (11 kB gzip) — tách riêng, chỉ tải khi vào `/admin` |
| CSS | 26.5 kB (5.8 kB gzip) |
| Build time | ≈ 3.5 s |
| Ảnh | `loading="lazy"` cho ảnh ngoài viewport đầu |
| Tìm kiếm | Debounce 300 ms, chỉ 1 request/300 ms |
| Phân trang | Server-side (products/orders/users/audit) — không tải toàn bộ danh sách |
| Query | Có index cho `orders(user_id)`, `orders(status)`, `order_items(order_id)`, `audit_log(action)`, `cart_items(cart_id,variant_id,note)`, `products(status,category)` |
| SQL | Prepared statement cho 100% truy vấn |

---

## 8. Lỗi phát hiện trong quá trình kiểm thử & cách sửa

| # | Lỗi | Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|---|---|
| 1 | Cookie phiên không được gửi | Đăng nhập xong nhưng session = null | `flushCookies` giữ tham chiếu tới mảng `setCookies` rồi xoá mảng → header rỗng | Copy mảng trước khi xoá (`[...setCookies]`) |
| 2 | `Set-Cookie` không xuất hiện trong response | Thiếu cookie | `res.writeHead()` không merge chắc chắn với `setHeader` | Truyền `Set-Cookie` tường minh vào object của `writeHead` |
| 3 | `ReferenceError: variantId is not defined` | Server không khởi động | Schema zod dùng biến chưa khai báo | Khai báo `variantId: id`, `productId: id` |
| 4 | 500 khi tạo đơn | `Cannot read properties of undefined (reading 'idempotency-key')` | `ctx.headers` chưa được gán | Thêm `headers: req.headers` vào context |
| 5 | SSE mở được cho người chưa đăng nhập | Endpoint công khai | Route bị gắn nhầm `auth: false` khi hàng loạt thay thế | Bỏ `auth: false`, bắt buộc session |
| 6 | 500 khi tạo lời mời admin | FK violation | `email_tokens.user_id` NOT NULL nhưng user chưa tồn tại | Tạo user ở trạng thái `invited` trước khi tạo token |
| 7 | Token reset dùng lại được | Bảo mật | Không đánh dấu `used_at` | Set `used_at` sau khi dùng + test hồi quy |
| 8 | Body > 256 kB làm treo socket | Client không nhận được 413 | `req.destroy()` trước khi gửi response | `req.pause()` + gửi 413 rồi mới ngắt |
| 9 | Vòng lặp render vô hạn (Checkout) | Crash trang | Selector zustand trả object mới mỗi lần | Bỏ selector tạo object; store server-side |
| 10 | Giỏ trống sau refresh | Mất dữ liệu | Getter của zustand bị serialize thành giá trị cứng | Giỏ server-side, tổng do server tính |
| 11 | `React.Fragment` nhận prop `disabled` | Cảnh báo console | `Button asChild` dùng Fragment | `cloneElement` |
| 12 | E2E: 403 khi gọi API từ script | Test fail | Thiếu header CSRF | Lấy token từ cookie của browser context |
| 13 | E2E: `/products` fail | Test fail | `getByText` không match placeholder | Dùng `getByPlaceholder` |
| 14 | Build lỗi `manualChunks is not a function` | Build fail | Vite 8 (rolldown) yêu cầu dạng function | Bỏ manualChunks, dùng `React.lazy` để tách chunk |
| 15 | Test server không thoát | Treo process | SSE giữ socket mở | `closeAll()` + `server.closeAllConnections()` |
| 16 | Hỏng encoding tiếng Việt | Chuỗi lỗi trong log | `Set-Content` PowerShell ghi lại file UTF-8 | Chỉ dùng công cụ edit/write (UTF-8) cho file nguồn |
| 17 | **App kẹt ở màn "Đang tải dữ liệu..." ở chế độ dev** | `/admin`, `/order`, `/profile` không render (chỉ xảy ra ở dev) | React StrictMode gọi effect 2 lần (mount → cleanup → mount); `mounted.current` không được set lại `true` nên `isReady` không bao giờ bật | Set `mounted.current = true` trong thân effect; bổ sung lệnh `npm run test:e2e:dev` để bắt lỗi chỉ xảy ra ở dev |
| 18 | Route `/admin` cho khách chưa đăng nhập bị treo | Loader quay vô hạn | Cùng nguyên nhân #17 | Như #17; xác minh lại bằng `test:e2e:dev` (25/25 PASS) |

---

## 9. Cách chạy lại toàn bộ

```bash
npm install
npm test            # 105 test (unit + API) — ~26s
npm run test:e2e    # 25 test trình duyệt thật (build + chạy) — ~90s
npm run test:e2e:dev   # 25 test trên dev server (bắt lỗi StrictMode) — ~90s
npm run lint        # oxlint
npm run build       # build production
```

Kết quả E2E chi tiết được ghi ra `docs/e2e-results.json` sau mỗi lần chạy.
