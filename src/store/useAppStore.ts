import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../types'
import { api, getAccessToken } from '../services/api'
import type { AuthUser } from '../services/api'

type AppState = {
  cartItems: CartItem[]
  wishlist: string[]
  user: AuthUser | null
  isMenuOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
  replaceCart: (items: CartItem[]) => void
  replaceWishlist: (productIds: string[]) => void
  setUser: (user: AuthUser | null) => void
  addToCart: (productId: string, quantity?: number, variantId?: string) => void
  removeFromCart: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  toggleWishlist: (productId: string) => void
  toggleMenu: () => void
  toggleCart: () => void
  toggleSearch: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      cartItems: [],
      wishlist: [],
      user: null,
      isMenuOpen: false,
      isCartOpen: false,
      isSearchOpen: false,
      replaceCart: (items) => set({ cartItems: items }),
      replaceWishlist: (productIds) => set({ wishlist: productIds }),
      setUser: (user) => set({ user }),
      addToCart: (productId, quantity = 1, variantId) =>
        set((state) => {
          const existingItem = state.cartItems.find(
            (item) => item.productId === productId && item.variantId === variantId,
          )
          const nextItems = existingItem
            ? state.cartItems.map((item) =>
                item.productId === productId && item.variantId === variantId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              )
            : [...state.cartItems, { productId, variantId, quantity }]
          if (getAccessToken()) {
            void api.addCartItem({ productId, variantId, quantity }).catch(() => undefined)
          }
          return {
            cartItems: nextItems,
          }
        }),
      removeFromCart: (productId, variantId) =>
        set((state) => {
          if (getAccessToken()) void api.removeCartItem(productId).catch(() => undefined)
          return { cartItems: state.cartItems.filter(
            (item) => !(item.productId === productId && item.variantId === variantId),
          ) }
        }),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (getAccessToken()) void api.updateCartItem(productId, Math.max(0, quantity)).catch(() => undefined)
          return {
            cartItems: state.cartItems.map((item) =>
              item.productId === productId && item.variantId === variantId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item,
            ).filter((item) => item.quantity > 0),
          }
        }),
      toggleWishlist: (productId) =>
        set((state) => {
          const isSaved = state.wishlist.includes(productId)
          if (getAccessToken()) void (isSaved ? api.removeWishlist(productId) : api.addWishlist(productId)).catch(() => undefined)
          return {
            wishlist: isSaved
              ? state.wishlist.filter((id) => id !== productId)
              : [...state.wishlist, productId],
          }
        }),
      toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
    }),
    {
      name: 'candley-aura-store',
      partialize: (state) => ({
        cartItems: state.cartItems,
        wishlist: state.wishlist,
      }),
    },
  ),
)

export const getCartCount = (cartItems: CartItem[]) =>
  cartItems.reduce((total, item) => total + item.quantity, 0)
