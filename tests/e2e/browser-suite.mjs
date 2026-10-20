/**
 * Bộ test E2E cho toàn bộ website (chạy trong trình duyệt thật).
 * Script này được chạy bởi scripts/e2e.mjs qua browser-automation skill.
 */
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8791'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

const results = []
const consoleErrors = []
let currentPage = ''

function record(id, name, ok, detail = '') {
  results.push({ id, name, ok: !!ok, detail, page: currentPage })
}

function track(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${label}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`[${label}] pageerror: ${err.message}`))
}

/** Lấy CSRF token từ cookie của browser context. */
async function csrfFromContext(browserContext) {
  const list = await browserContext.cookies()
  const found = list.find((c) => c.name === 'phshop_csrf')
  return found ? decodeURIComponent(found.value) : ''
}

export default async function run(page) {
  track(page, 'main')
  const base = page.url().replace(/\/$/, '')

  // ---------- 1. SMOKE TEST TẤT CẢ TRANG ----------
  const routes = [
    { path: '/', expect: 'Mô hình in 3D' },
    { path: '/about', expect: 'Về chúng tôi' },
    { path: '/products', expect: 'Mô hình Kỷ Viễn' },
    { path: '/products/mo-hinh-ky-vien-3d', expect: 'Thêm vào giỏ hàng' },
    { path: '/cart', expect: 'Giỏ hàng' },
    { path: '/wishlist', expect: 'yêu thích' },
    { path: '/login', expect: 'Đăng nhập' },
    { path: '/register', expect: 'Tạo tài khoản' },
    { path: '/contact', expect: 'Liên hệ' },
  ]
  for (const route of routes) {
    currentPage = route.path
    const res = await page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded' })
    const okStatus = res && res.status() === 200
    let okContent = false
    try {
      await page.getByText(route.expect, { exact: false }).first().waitFor({ timeout: 8000 })
      okContent = true
    } catch { /* không tìm thấy */ }
    record(`SMOKE-${route.path}`, `Mở trang ${route.path}`, okStatus && okContent,
      okStatus ? (okContent ? '' : 'thiếu nội dung mong đợi') : `HTTP ${res && res.status()}`)
  }

  // Ô tìm kiếm trên trang danh sách sản phẩm
  currentPage = '/products (search box)'
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' })
  const searchBoxVisible = await page.getByPlaceholder(/Tìm sản phẩm/).first().isVisible().catch(() => false)
  record('SMOKE-/products:search', 'Trang /products có ô tìm kiếm', searchBoxVisible)

  // ---------- 2. ĐĂNG KÝ KHÁCH HÀNG ----------
  currentPage = '/register'
  const email = `e2e-${Date.now()}@example.com`
  await page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Họ tên').fill('Khách E2E')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('KhachMatKhau@1')
  await page.getByLabel('Xác nhận mật khẩu').fill('KhachMatKhau@1')
  await page.getByRole('button', { name: /Tạo tài khoản/i }).click()
  await page.waitForTimeout(2500)
  const loggedIn = await page.evaluate(async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' })
    const data = await res.json()
    return data.user ? data.user.email : null
  })
  record('AUTH-001', 'Đăng ký và đăng nhập bằng form', loggedIn === email, loggedIn ? `user=${loggedIn}` : 'không lấy được session')

  // ---------- 3. THÊM VÀO GIỎ + BADGE + REFRESH ----------
  currentPage = '/products/mo-hinh-ky-vien-3d'
  await page.goto(`${base}/products/mo-hinh-ky-vien-3d`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Thêm vào giỏ hàng/i }).click({ force: true })
  await page.waitForTimeout(1200)
  const badgeAfterAdd = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('nav span')].map((s) => s.textContent.trim())
    return spans.find((t) => /^\d+$/.test(t)) || null
  })
  record('ECOM-003', 'Thêm sản phẩm vào giỏ (badge cập nhật)', badgeAfterAdd === '1', `badge=${badgeAfterAdd}`)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const badgeAfterReload = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('nav span')].map((s) => s.textContent.trim())
    return spans.find((t) => /^\d+$/.test(t)) || null
  })
  record('ECOM-004', 'Refresh giỏ hàng — dữ liệu giữ nguyên', badgeAfterReload === '1', `badge=${badgeAfterReload}`)

  await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const cartHasItem = await page.getByText('Mô hình Kỷ Viễn In 3D', { exact: false }).first().isVisible().catch(() => false)
  record('ECOM-004b', 'Trang giỏ hiển thị sản phẩm sau refresh', cartHasItem)

  // ---------- 4. CHECKOUT TẠO ĐƠN ----------
  currentPage = '/checkout'
  await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.getByLabel('Người nhận').fill('Khách E2E')
  await page.getByLabel('Số điện thoại').fill('0912345678')
  await page.getByLabel('Địa chỉ giao hàng').fill('123 Nguyễn Huệ, Quận 1, TP.HCM')
  await page.getByRole('button', { name: /Tiếp tục thanh toán/i }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Xác nhận đặt hàng/i }).click()
  await page.waitForTimeout(2500)
  const orderUrl = page.url()
  const orderCreated = /\/order\/PHS/.test(orderUrl)
  record('ECOM-007', 'Đặt hàng hợp lệ tạo 1 đơn (mã PHS…)', orderCreated, orderUrl)

  let orderId = orderCreated ? orderUrl.split('/order/')[1].split('?')[0] : null

  // ---------- 5. REALTIME: ADMIN ĐỔI TRẠNG THÁI ----------
  currentPage = '/admin'
  const adminContext = await page.context().browser().newContext()
  const adminPage = await adminContext.newPage()
  track(adminPage, 'admin')
  await adminPage.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await adminPage.getByLabel('Email').fill(ADMIN_EMAIL)
  await adminPage.getByLabel('Mật khẩu').fill(ADMIN_PASSWORD)
  await adminPage.getByRole('button', { name: /^Đăng nhập$/ }).click()
  await adminPage.waitForTimeout(2500)
  const adminSession = await adminPage.evaluate(async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' })
    const data = await res.json()
    return data.user ? data.user.role : null
  })
  record('ADMIN-001', 'Admin đăng nhập được vào dashboard', adminSession === 'SUPER_ADMIN', `role=${adminSession}`)

  await adminPage.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
  await adminPage.waitForTimeout(2000)
  const adminPageOk = await adminPage.getByText('Bảng điều khiển Admin', { exact: false }).first().isVisible().catch(() => false)
  record('ADMIN-002', 'Trang /admin hiển thị dashboard', adminPageOk)

  if (orderId) {
    // Admin cập nhật trạng thái qua API (giống thao tác trên UI)
    const cookieHeader = await adminContext.cookies().then((list) => list.map((c) => `${c.name}=${c.value}`).join('; '))
    const csrf = await csrfFromContext(adminContext)

    const patchRes = await fetch(`${API}/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, 'X-CSRF-Token': csrf },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    record('ORDER-002', 'Admin cập nhật trạng thái đơn qua backend', patchRes.status === 200, `HTTP ${patchRes.status}`)

    // Khách hàng đang mở trang đơn phải tự cập nhật (realtime)
    await page.goto(`${base}/order/${orderId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const beforeRealtime = await page.getByText('Chờ xác nhận', { exact: false }).first().isVisible().catch(() => false)

    await fetch(`${API}/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, 'X-CSRF-Token': csrf },
      body: JSON.stringify({ status: 'PROCESSING' }),
    })
    await page.waitForTimeout(3000)
    const afterRealtime = await page.getByText('Đang sản xuất', { exact: false }).first().isVisible().catch(() => false)
    record('ECOM-011', 'Trang đơn của khách tự cập nhật khi admin đổi trạng thái',
      !beforeRealtime && afterRealtime, `trước=${beforeRealtime} sau=${afterRealtime}`)

    // Khách khác không xem được đơn này (IDOR) — gọi trực tiếp API
    const other = await page.context().browser().newContext()
    const otherPage = await other.newPage()
    track(otherPage, 'other-user')
    await otherPage.goto(`${base}/register`, { waitUntil: 'domcontentloaded' })
    await otherPage.getByLabel('Họ tên').fill('Khách Khác')
    await otherPage.getByLabel('Email').fill(`other-${Date.now()}@example.com`)
    await otherPage.getByLabel('Mật khẩu', { exact: true }).fill('KhacMatKhau@1')
    await otherPage.getByLabel('Xác nhận mật khẩu').fill('KhacMatKhau@1')
    await otherPage.getByRole('button', { name: /Tạo tài khoản/i }).click()
    await otherPage.waitForTimeout(2000)
    const otherCookies = await other.cookies().then((list) => list.map((c) => `${c.name}=${c.value}`).join('; '))
    const otherCsrf = await csrfFromContext(other)
    const idorRes = await fetch(`${API}/api/orders/${orderId}`, {
      headers: { Cookie: otherCookies, 'X-CSRF-Token': otherCsrf },
    })
    record('ECOM-014', 'Khách khác không đọc được đơn của người khác (IDOR)', idorRes.status === 404, `HTTP ${idorRes.status}`)

    // Khách gọi API admin
    const adminApiRes = await fetch(`${API}/api/admin/orders`, {
      headers: { Cookie: otherCookies, 'X-CSRF-Token': otherCsrf },
    })
    record('ECOM-013', 'Khách gọi API quản trị bị từ chối', adminApiRes.status === 403, `HTTP ${adminApiRes.status}`)
    await other.close()
  }

  // ---------- 6. WISHLIST ----------
  currentPage = '/products'
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const wishlistApi = await page.evaluate(async () => {
    const csrf = decodeURIComponent((document.cookie.match(/(?:^|; )phshop_csrf=([^;]*)/) || [])[1] || '')
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }
    const post = await fetch('/api/wishlist', { method: 'POST', headers, body: JSON.stringify({ productId: 'p1' }) })
    const dup = await fetch('/api/wishlist', { method: 'POST', headers, body: JSON.stringify({ productId: 'p1' }) })
    const dupBody = await dup.json()
    const list = await fetch('/api/wishlist', { headers })
    const listBody = await list.json()
    return { post: post.status, dup: dup.status, count: dupBody.count, already: dupBody.alreadyExists, listCount: listBody.count }
  })
  record('ECOM-005', 'Wishlist: thêm và chống bản ghi trùng',
    wishlistApi.post === 201 && wishlistApi.dup === 200 && wishlistApi.count === 1 && wishlistApi.already === true,
    JSON.stringify(wishlistApi))

  // ---------- 7. KHÁCH KHÔNG VÀO ĐƯỢC /ADMIN ----------
  currentPage = '/admin (as customer)'
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const denied = await page.getByText('Bạn không có quyền truy cập', { exact: false }).first().isVisible().catch(() => false)
  record('ADMIN-003', 'Khách hàng bị chặn khỏi /admin', denied)

  // ---------- 8. RESPONSIVE (mobile) ----------
  currentPage = 'mobile 375px'
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  record('ECOM-020', 'Không tràn ngang ở viewport mobile 375px', overflow <= 2, `overflow=${overflow}px`)
  await page.setViewportSize({ width: 1280, height: 800 })

  // ---------- 9. TRANG 404 ----------
  currentPage = '/khong-ton-tai'
  const res404 = await page.goto(`${base}/khong-ton-tai-abc`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  const notFoundVisible = await page.getByText('Không tìm thấy trang', { exact: false }).first().isVisible().catch(() => false)
  record('SMOKE-404', 'Route lạ hiển thị trang 404', notFoundVisible, `HTTP ${res404 && res404.status()}`)

  await adminContext.close()

  // Lọc bỏ lỗi console không liên quan (ví dụ: ảnh CDN bị chặn bởi môi trường)
  const relevantErrors = consoleErrors.filter((e) => !/Failed to load resource|ERR_BLOCKED_BY_ORB|net::/i.test(e))

  // Ghi kết quả ra file để tổng hợp báo cáo
  try {
    const fs = await import('node:fs')
    const nodePath = await import('node:path')
    const outDir = nodePath.join(process.cwd(), 'docs')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(
      nodePath.join(outDir, 'e2e-results.json'),
      JSON.stringify({ baseUrl: base, generatedAt: new Date().toISOString(), results, consoleErrors: relevantErrors }, null, 2),
    )
  } catch { /* bỏ qua lỗi ghi file */ }

  return {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    consoleErrors: relevantErrors,
  }
}
