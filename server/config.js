/**
 * Cấu hình runtime cho PhShop backend.
 * Mọi giá trị nhạy cảm đều đọc từ biến môi trường, KHÔNG hardcode trong repo.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// server/ -> thư mục gốc dự án
export const ROOT = path.resolve(__dirname, '..')

const int = (v, dflt) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) ? n : dflt
}
const bool = (v, dflt) => {
  if (v === undefined || v === null || v === '') return dflt
  return v === 'true' || v === '1' || v === 'yes'
}

const nodeEnv = process.env.NODE_ENV || 'development'
const adminEmail = (process.env.PHSHOP_ADMIN_EMAIL || 'nhantk123vip@gmail.com').trim().toLowerCase()

export const config = {
  ROOT,
  nodeEnv,
  isProd: nodeEnv === 'production',
  host: process.env.HOST || '127.0.0.1',
  port: int(process.env.PORT, 8787),

  dbPath: process.env.PHSHOP_DB_PATH || path.join(ROOT, 'data', 'phshop.db'),
  staticDir: process.env.PHSHOP_STATIC_DIR || path.join(ROOT, 'dist'),

  sessionTtlMs: int(process.env.PHSHOP_SESSION_TTL_HOURS, 48) * 60 * 60 * 1000,
  secureCookies: bool(process.env.PHSHOP_SECURE_COOKIES, nodeEnv === 'production'),
  // SameSite của cookie phiên. Khi frontend và API khác origin (cross-site)
  // cần đặt PHSHOP_COOKIE_SAMESITE=None (kèm Secure=true).
  cookieSameSite: process.env.PHSHOP_COOKIE_SAMESITE || 'Lax',
  trustProxy: bool(process.env.PHSHOP_TRUST_PROXY, false),

  // Email quản trị mục tiêu. Quyền admin KHÔNG được cấp tự động khi đăng ký.
  adminEmail,
  superAdminEmail: (process.env.PHSHOP_SUPER_ADMIN_EMAIL || adminEmail).trim().toLowerCase(),

  // Nếu true, chỉ tài khoản đã xác minh email mới được đặt hàng.
  requireVerifiedEmail: bool(process.env.PHSHOP_REQUIRE_VERIFIED_EMAIL, false),

  shippingFee: int(process.env.PHSHOP_SHIPPING_FEE, 0),
  freeShippingThreshold: int(process.env.PHSHOP_FREE_SHIPPING_THRESHOLD, 0),

  // Danh sách origin được phép gọi API chéo origin (mặc định: chỉ same-origin).
  corsOrigins: (process.env.PHSHOP_CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  // Ngưỡng rate limit: [số lần, cửa sổ ms]
  rateLimits: {
    login: { limit: int(process.env.PHSHOP_RL_LOGIN, 10), windowMs: 15 * 60 * 1000 },
    register: { limit: int(process.env.PHSHOP_RL_REGISTER, 5), windowMs: 60 * 60 * 1000 },
    passwordReset: { limit: int(process.env.PHSHOP_RL_RESET, 5), windowMs: 60 * 60 * 1000 },
    contact: { limit: int(process.env.PHSHOP_RL_CONTACT, 5), windowMs: 60 * 60 * 1000 },
    orderCreate: { limit: int(process.env.PHSHOP_RL_ORDER, 20), windowMs: 60 * 60 * 1000 },
    review: { limit: int(process.env.PHSHOP_RL_REVIEW, 10), windowMs: 60 * 60 * 1000 },
    api: { limit: int(process.env.PHSHOP_RL_API, 600), windowMs: 60 * 1000 },
  },

  maxBodyBytes: int(process.env.PHSHOP_MAX_BODY, 256 * 1024),
}

export default config
