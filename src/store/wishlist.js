import { create } from 'zustand'
import api from '../lib/api'

const GUEST_KEY = 'phshop-wishlist-guest'

function readGuestIds() {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeGuestIds(ids) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

/**
 * Wishlist:
 * - Khách đã đăng nhập: lưu trong database (đồng bộ mọi thiết bị).
 * - Khách vãng lai: lưu cục bộ, tự đồng bộ lên tài khoản khi đăng nhập.
 */
export const useWishlistStore = create((set, get) => ({
  items: [],
  count: 0,
  loading: false,
  error: null,
  loaded: false,

  apply: (payload) =>
    set({
      items: payload?.items || [],
      count: payload?.count ?? (payload?.items || []).length,
      loaded: true,
    }),

  fetchWishlist: async ({ authenticated } = {}) => {
    if (authenticated === false) {
      get().apply({ items: [], count: 0 })
      return
    }
    set({ loading: true, error: null })
    try {
      const data = await api.get('/api/wishlist')
      get().apply(data)
      return data
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  isInWishlist: (productId) => get().items.some((i) => i.productId === productId),

  toggleItem: async (product) => {
    const existing = get().items.find((i) => i.productId === product.id)
    if (existing) {
      await api.delete(`/api/wishlist/${product.id}`)
      const data = await api.get('/api/wishlist')
      get().apply(data)
      return false
    }
    const data = await api.post('/api/wishlist', { productId: product.id })
    get().apply(data)
    return true
  },

  addItem: async (productId) => {
    const data = await api.post('/api/wishlist', { productId })
    get().apply(data)
    return data
  },

  removeItem: async (productId) => {
    const data = await api.delete(`/api/wishlist/${productId}`)
    get().apply(data)
    return data
  },

  /** Đồng bộ wishlist của khách vãng lai lên tài khoản (gọi sau khi đăng nhập). */
  syncGuestWishlist: async () => {
    const ids = readGuestIds()
    if (!ids.length) return null
    try {
      const data = await api.post('/api/wishlist/sync', { productIds: ids })
      writeGuestIds([])
      get().apply(data)
      return data
    } catch {
      return null
    }
  },

  setGuestItems: (ids) => writeGuestIds(ids),
  getGuestIds: () => readGuestIds(),

  reset: () => set({ items: [], count: 0, error: null, loaded: false }),
}))
