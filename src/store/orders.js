import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STATUS_ORDER = [
  'moi_tao',
  'xac_nhan',
  'dang_san_xuat',
  'dang_giao',
  'hoan_tat',
  'da_huy',
]

const STATUS_LABEL = {
  moi_tao: 'Mới tạo',
  xac_nhan: 'Đã xác nhận',
  dang_san_xuat: 'Đang sản xuất',
  dang_giao: 'Đang giao',
  hoan_tat: 'Hoàn tất',
  da_huy: 'Đã hủy',
}

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) =>
        set((state) => ({ orders: [order, ...state.orders] })),

      updateOrderStatus: (orderId, newStatus) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          ),
        })),

      getOrdersByUser: (email) =>
        get().orders.filter((o) => o.customerEmail === email),

      getAllOrders: () => get().orders,

      getOrderById: (id) => get().orders.find((o) => o.id === id),

      get statusOrder() {
        return STATUS_ORDER
      },
      get statusLabel() {
        return STATUS_LABEL
      },
    }),
    { name: 'phshop-orders' }
  )
)
