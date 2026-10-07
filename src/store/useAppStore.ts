import { create } from 'zustand'
import type { AuthUser } from '../types'

/** `unknown` until the startup refresh attempt finishes; route guards wait for it. */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

type AppState = {
  user: AuthUser | null
  sessionStatus: SessionStatus
  isMenuOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
  setSession: (user: AuthUser | null) => void
  setMenuOpen: (open: boolean) => void
  setCartOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
}

/**
 * UI and session state only. Cart, wishlist and other server data live in React Query.
 * The user's role here drives navigation only; the server enforces every permission.
 */
export const useAppStore = create<AppState>()((set) => ({
  user: null,
  sessionStatus: 'unknown',
  isMenuOpen: false,
  isCartOpen: false,
  isSearchOpen: false,
  setSession: (user) => set({ user, sessionStatus: user ? 'authenticated' : 'anonymous' }),
  setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
  setCartOpen: (isCartOpen) => set({ isCartOpen }),
  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
}))
