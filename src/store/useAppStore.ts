import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../types'

type AppState = {
  cartItems: CartItem[]
  wishlist: string[]
  isMenuOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
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
      isMenuOpen: false,
      isCartOpen: false,
      isSearchOpen: false,
      addToCart: (productId, quantity = 1, variantId) =>
        set((state) => {
          const existingItem = state.cartItems.find(
            (item) => item.productId === productId && item.variantId === variantId,
          )

          if (existingItem) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.productId === productId && item.variantId === variantId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            }
          }

          return {
            cartItems: [...state.cartItems, { productId, variantId, quantity }],
          }
        }),
      removeFromCart: (productId, variantId) =>
        set((state) => ({
          cartItems: state.cartItems.filter(
            (item) => !(item.productId === productId && item.variantId === variantId),
          ),
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          cartItems: state.cartItems
            .map((item) =>
              item.productId === productId && item.variantId === variantId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      toggleWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.includes(productId)
            ? state.wishlist.filter((id) => id !== productId)
            : [...state.wishlist, productId],
        })),
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
