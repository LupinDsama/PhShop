import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (variant, quantity = 1, note = '') => {
        const items = get().items
        const existing = items.find((i) => i.variantId === variant.id && i.note === note)
        if (existing) {
          existing.quantity += quantity
        } else {
          items.push({ variantId: variant.id, variant, quantity, note })
        }
        set({ items: [...items] })
      },
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }))
      },
      updateNote: (variantId, note) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, note } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      get total() {
        return get().items.reduce(
          (sum, i) => sum + i.variant.price * i.quantity,
          0
        )
      },
      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'phshop-cart' }
  )
)
