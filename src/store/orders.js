import { create } from 'zustand'
import api from '../lib/api'

/** Store đơn hàng của khách — nguồn dữ liệu duy nhất là API server. */
export const useOrderStore = create((set, get) => ({
  orders: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  loading: false,
  error: null,
  loaded: false,

  fetchOrders: async ({ page = 1, limit = 10, status } = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)
      const data = await api.get(`/api/orders?${params.toString()}`)
      set({
        orders: data.orders || [],
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1,
        loaded: true,
      })
      return data
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  fetchOrder: async (orderId) => {
    const data = await api.get(`/api/orders/${encodeURIComponent(orderId)}`)
    return data.order
  },

  cancelOrder: async (orderId) => {
    const data = await api.post(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {})
    get().applyUpdate(data.order)
    return data.order
  },

  requestReturn: async (orderId, note = '') => {
    const data = await api.post(`/api/orders/${encodeURIComponent(orderId)}/return`, { note })
    get().applyUpdate(data.order)
    return data.order
  },

  /** Cập nhật tại chỗ một đơn trong danh sách (dùng khi realtime báo thay đổi). */
  applyUpdate: (order) => {
    if (!order?.id) return
    set((state) => {
      const index = state.orders.findIndex((o) => o.id === order.id)
      if (index === -1) return {}
      const orders = [...state.orders]
      orders[index] = { ...orders[index], ...order }
      return { orders }
    })
  },

  reset: () => set({ orders: [], total: 0, page: 1, totalPages: 1, loaded: false, error: null }),
}))
