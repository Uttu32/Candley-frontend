import { useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string) => useSyncExternalStore(
  (onChange) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  },
  () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
  () => false,
)

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
export const mobileQuery = '(max-width: 767px)'
