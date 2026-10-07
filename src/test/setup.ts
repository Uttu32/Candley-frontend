import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom lacks these browser APIs.
const mediaState: Record<string, boolean> = {}
export const setMediaQuery = (query: string, matches: boolean) => { mediaState[query] = matches }
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: mediaState[query] ?? false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }),
})
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
HTMLMediaElement.prototype.pause = vi.fn()

afterEach(() => {
  cleanup()
  Object.keys(mediaState).forEach((key) => delete mediaState[key])
})
