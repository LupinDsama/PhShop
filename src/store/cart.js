import { create } from 'zustand'
import api from '../lib/api'

/**
 * Giỏ hàng server-side.
 * - Khách vãng lai: server gắn giỏ với cookie `phshop_cart`.
 * - Khách đã đăng nhập: giỏ theo user, đồng bộ mọi thiết bị.
 * - Mọi tổng tiền do server tính (không dùng getter trong store để tránh
 *   giá trị stale như ở phiên bản localStorage trước đây).
 */
export const useCartStore = create((set, get) => ({
  items: [],
  count: 0,
  subtotal: 0,
  discount: 0,
  shippingFee: 0,
  total: 0,
  hasIssues: false,
  loading: false,
  error: null,
  loaded: false,

  applyCart: (cart) =>
    set({
      items: cart?.items || [],
      count: cart?.count || 0,
      subtotal: cart?.subtotal || 0,
      discount: cart?.discount || 0,
      shippingFee: cart?.shippingFee || 0,
      total: cart?.total || 0,
      hasIssues: !!cart?.hasIssues,
      loaded: true,
    }),

  fetchCart: async () => {
    set({ loading: true, error: null })
    try {
      const cart = await api.get('/api/cart')
      get().applyCart(cart)
      return cart
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (variantId, quantity = 1, note = '') => {
    set({ error: null })
    try {
      const cart = await api.post('/api/cart/items', { variantId, quantity, note })
      get().applyCart(cart)
      return cart
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  updateItem: async (itemId, patch) => {
    try {
      const cart = await api.patch(`/api/cart/items/${itemId}`, patch)
      get().applyCart(cart)
      return cart
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  removeItem: async (itemId) => {
    try {
      const cart = await api.delete(`/api/cart/items/${itemId}`)
      get().applyCart(cart)
      return cart
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  clearCart: async () => {
    try {
      const cart = await api.delete('/api/cart')
      get().applyCart(cart)
      return cart
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  /** Hợp nhất giỏ khách vãng lai vào giỏ tài khoản sau khi đăng nhập. */
  mergeGuestCart: async () => {
    try {
      const cart = await api.post('/api/cart/merge', {})
      get().applyCart(cart)
      return cart
    } catch {
      return null
    }
  },

  reset: () => set({ items: [], count: 0, subtotal: 0, discount: 0, shippingFee: 0, total: 0, hasIssues: false, error: null, loaded: false }),
}))
