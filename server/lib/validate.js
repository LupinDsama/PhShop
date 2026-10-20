/**
 * Schema validation (zod) cho toàn bộ input từ client.
 * Mọi endpoint đều validate ở server — không tin dữ liệu client.
 */
import { z } from 'zod'
import { unprocessable } from './http.js'

const emailSchema = typeof z.email === 'function' ? z.email() : z.string().email()

export const email = emailSchema
export const password = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự.').max(200)
export const name = z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự.').max(120)
export const phone = z.string().trim().regex(/^[0-9+\s.-]{6,20}$/, 'Số điện thoại không hợp lệ.')
export const note = z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.')
export const id = z.string().trim().min(1).max(64)

export const registerSchema = z.object({
  name,
  email,
  password,
  phone: phone.optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  inviteToken: z.string().trim().max(128).optional().or(z.literal('')),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(200),
})

export const profileSchema = z.object({
  name: name.optional(),
  phone: phone.optional().or(z.literal('')),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
})

export const passwordResetRequestSchema = z.object({ email })
export const passwordResetSchema = z.object({
  token: z.string().trim().min(10).max(200),
  newPassword: password,
})

export const cartAddSchema = z.object({
  variantId: id,
  quantity: z.coerce.number().int().min(1).max(99),
  note: note.optional().or(z.literal('')),
})

export const cartUpdateSchema = z.object({
  itemId: z.coerce.number().int().optional(),
  variantId: id.optional(),
  quantity: z.coerce.number().int().min(0).max(99).optional(),
  note: note.optional(),
})

export const wishlistSchema = z.object({ productId: id })

export const orderCreateSchema = z.object({
  recipient: name,
  phone,
  address: z.string().trim().min(5, 'Địa chỉ quá ngắn.').max(500),
  note: note.optional().or(z.literal('')),
  paymentMethod: z.enum(['COD', 'MOMO', 'BANK_TRANSFER']).default('COD'),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
})

export const orderUpdateSchema = z.object({
  status: z.string().trim().max(40).optional(),
  paymentStatus: z.string().trim().max(40).optional(),
  note: note.optional(),
  internalNote: z.string().trim().max(1000).optional(),
  publicNote: z.string().trim().max(1000).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  expectedVersion: z.coerce.number().int().optional(),
})

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.').max(200),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().max(5000).default(''),
  basePrice: z.coerce.number().int().min(0).max(100000000),
  images: z.array(z.string().trim().max(2000)).max(10).default([]),
  status: z.enum(['active', 'hidden', 'discontinued']).default('active'),
  productionDays: z.coerce.number().int().min(0).max(365).default(5),
  featured: z.coerce.boolean().default(false),
  variants: z
    .array(
      z.object({
        id: id.optional(),
        sku: z.string().trim().min(2).max(80),
        color: z.string().trim().max(60).default(''),
        size: z.string().trim().max(60).default(''),
        price: z.coerce.number().int().min(0).max(100000000),
        stock: z.coerce.number().int().min(0).max(1000000),
        minQty: z.coerce.number().int().min(1).max(99).default(1),
        maxQty: z.coerce.number().int().min(1).max(99).default(10),
        status: z.enum(['active', 'hidden', 'discontinued']).default('active'),
      }),
    )
    .min(1, 'Cần ít nhất một biến thể.')
    .max(30),
})

export const productPatchSchema = productSchema.partial().extend({
  id: id.optional(),
})

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(''),
})

export const contactSchema = z.object({
  name,
  email,
  phone: phone.optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Nội dung quá ngắn.').max(4000),
})

export const roleUpdateSchema = z.object({
  role: z.enum(['CUSTOMER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']),
})

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Z0-9_-]+$/i, 'Mã coupon chỉ gồm chữ, số, - và _'),
  type: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.coerce.number().int().min(0).max(100000000),
  minOrder: z.coerce.number().int().min(0).max(100000000).default(0),
  maxDiscount: z.coerce.number().int().min(0).max(100000000).default(0),
  startsAt: z.string().trim().max(40).optional().or(z.literal('')),
  endsAt: z.string().trim().max(40).optional().or(z.literal('')),
  usageLimit: z.coerce.number().int().min(0).max(1000000).default(0),
  active: z.coerce.boolean().default(true),
})

export const addressSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal('')),
  recipient: name,
  phone: phone.optional().or(z.literal('')),
  address: z.string().trim().min(5, 'Địa chỉ quá ngắn.').max(500),
  isDefault: z.coerce.boolean().optional(),
})

export const settingsSchema = z.record(
  z.string().trim().max(100),
  z.string().max(5000),
)

/** Parse và ném lỗi 422 nếu dữ liệu không hợp lệ. */
export function parse(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    throw unprocessable('Dữ liệu gửi lên không hợp lệ.', details)
  }
  return result.data
}
