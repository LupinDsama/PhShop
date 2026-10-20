import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const items = get().items
        if (items.find((i) => i.id === product.id)) return
        set({ items: [...items, product] })
      },
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      toggleItem: (product) => {
        if (get().items.find((i) => i.id === product.id)) {
          get().removeItem(product.id)
        } else {
          get().addItem(product)
        }
      },
      isInWishlist: (id) =>
        get().items.some((i) => i.id === id),
      clearWishlist: () => set({ items: [] }),
      get count() {
        return get().items.length
      },
    }),
    { name: 'phshop-wishlist' }
  )
)
