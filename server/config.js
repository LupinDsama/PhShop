/**
 * Cấu hình runtime cho PhShop backend.
 * Mọi giá trị nhạy cảm đều đọc từ biến môi trường, KHÔNG hardcode trong repo.
 *
 * Dùng getter để đọc process.env tại thời điểm truy cập: Cloudflare Worker
 * nạp biến môi trường từ binding `env` sau khi module đã được bundle, nên cấu
 * hình phải "sống" (đọc lại) chứ không được chụp lại một lần lúc import.
 */
import path from 'node:path'

const env = (key, dflt) => {
  const value = process.env[key]
  return value === undefined || value === '' ? dflt : value
}

const int = (key, dflt) => {
  const n = Number.parseInt(env(key, ''), 10)
  return Number.isFinite(n) ? n : dflt
}

const bool = (key, dflt) => {
  const value = env(key, undefined)
  if (value === undefined) return dflt
  return value === 'true' || value === '1' || value === 'yes'
}

const nodeEnv = env('NODE_ENV', 'development')

export const config = {
  get nodeEnv() { return env('NODE_ENV', 'development') },
  get isProd() { return env('NODE_ENV', 'development') === 'production' },
  get host() { return env('HOST', '127.0.0.1') },
  get port() { return int('PORT', 8787) },

  // Thư mục gốc dự án (không dùng import.meta.url vì Worker không có giá trị này)
  get ROOT() {
    return process.env.PHSHOP_ROOT ? path.resolve(process.env.PHSHOP_ROOT) : process.cwd()
  },
  get dbPath() {
    return env('PHSHOP_DB_PATH', path.join(process.cwd(), 'data', 'phshop.db'))
  },
  get staticDir() {
    return env('PHSHOP_STATIC_DIR', path.join(process.cwd(), 'dist'))
  },

  get sessionTtlMs() { return int('PHSHOP_SESSION_TTL_HOURS', 48) * 60 * 60 * 1000 },
  get secureCookies() { return bool('PHSHOP_SECURE_COOKIES', nodeEnv === 'production') },
  // SameSite cookie: Lax (cùng origin) | None (frontend và API khác origin)
  get cookieSameSite() { return env('PHSHOP_COOKIE_SAMESITE', 'Lax') },
  get trustProxy() { return bool('PHSHOP_TRUST_PROXY', false) },

  // Email quản trị mục tiêu. Quyền KHÔNG được cấp tự động khi đăng ký.
  get adminEmail() {
    return env('PHSHOP_ADMIN_EMAIL', 'nhantk123vip@gmail.com').trim().toLowerCase()
  },
  get superAdminEmail() {
    return env('PHSHOP_SUPER_ADMIN_EMAIL', env('PHSHOP_ADMIN_EMAIL', 'nhantk123vip@gmail.com')).trim().toLowerCase()
  },

  // Nếu true, chỉ tài khoản đã xác minh email mới được đặt hàng.
  get requireVerifiedEmail() { return bool('PHSHOP_REQUIRE_VERIFIED_EMAIL', false) },

  get shippingFee() { return int('PHSHOP_SHIPPING_FEE', 0) },
  get freeShippingThreshold() { return int('PHSHOP_FREE_SHIPPING_THRESHOLD', 0) },

  // Danh sách origin được phép gọi API chéo origin (mặc định: chỉ same-origin).
  get corsOrigins() {
    return env('PHSHOP_CORS_ORIGINS', '').split(',').map((s) => s.trim()).filter(Boolean)
  },

  // Ngưỡng rate limit: [số lần, cửa sổ ms]
  get rateLimits() {
    return {
      login: { limit: int('PHSHOP_RL_LOGIN', 10), windowMs: 15 * 60 * 1000 },
      register: { limit: int('PHSHOP_RL_REGISTER', 5), windowMs: 60 * 60 * 1000 },
      passwordReset: { limit: int('PHSHOP_RL_RESET', 5), windowMs: 60 * 60 * 1000 },
      contact: { limit: int('PHSHOP_RL_CONTACT', 5), windowMs: 60 * 60 * 1000 },
      orderCreate: { limit: int('PHSHOP_RL_ORDER', 20), windowMs: 60 * 60 * 1000 },
      review: { limit: int('PHSHOP_RL_REVIEW', 10), windowMs: 60 * 60 * 1000 },
      api: { limit: int('PHSHOP_RL_API', 600), windowMs: 60 * 1000 },
    }
  },

  get maxBodyBytes() { return int('PHSHOP_MAX_BODY', 256 * 1024) },

  // 'node' | 'worker' — quyết định chiến lược realtime (SSE in-memory chỉ dùng
  // được khi mọi request cùng tiến trình; Cloudflare Worker dùng polling).
  get platform() { return env('PHSHOP_PLATFORM', 'node') },
}

export default config
