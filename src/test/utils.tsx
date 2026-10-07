import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { vi } from 'vitest'
import { routes as appRoutes } from '../routes/router'
import { ToastContainer } from '../components/common/ToastContainer'
import { setAccessToken } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import type { AuthUser, HeroSlide, Product, Role } from '../types'

type Handler = (request: { url: URL; method: string; body: unknown; headers: Headers }) => unknown | Promise<unknown>
export type MockRoutes = Record<string, Handler | unknown>

/** Error response helper: mirrors the backend error envelope. */
export class MockError {
  status: number
  message: string
  code: string
  details: unknown[]
  constructor(status: number, message: string, code = 'API_ERROR', details: unknown[] = []) {
    this.status = status
    this.message = message
    this.code = code
    this.details = details
  }
}

/**
 * Installs a fetch mock keyed by "METHOD /path" (path relative to /api/v1, without query string).
 * Handlers return data (wrapped in the success envelope) or a MockError. Unmatched calls fail loudly.
 */
export const mockApi = (routes: MockRoutes) => {
  const calls: Array<{ method: string; path: string; url: URL; body: unknown }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init.method ?? 'GET').toUpperCase()
    const path = url.pathname.replace(/^\/api\/v1/, '')
    let body: unknown = init.body
    if (typeof init.body === 'string') body = JSON.parse(init.body)
    calls.push({ method, path, url, body })
    const key = `${method} ${path}`
    const entry = key in routes ? routes[key] : Object.entries(routes).find(([pattern]) => {
      const [m, p] = pattern.split(' ')
      return m === method && new RegExp(`^${p!.replace(/:[^/]+/g, '[^/]+')}$`).test(path)
    })?.[1]
    if (entry === undefined) return new Response(JSON.stringify({ success: false, message: `Unmocked ${key}` }), { status: 599 })
    const result = typeof entry === 'function' ? await (entry as Handler)({ url, method, body, headers: new Headers(init.headers) }) : entry
    if (result instanceof MockError) {
      return new Response(JSON.stringify({ success: false, message: result.message, error: { code: result.code, message: result.message, details: result.details } }), { status: result.status })
    }
    return new Response(JSON.stringify({ success: true, message: 'ok', data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock, callsTo: (method: string, path: string) => calls.filter((call) => call.method === method && call.path === path) }
}

export const makeUser = (role: Role = 'CUSTOMER', overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: `user-${role}`, _id: `user-${role}`, name: role === 'CUSTOMER' ? 'Asha Rao' : 'Store Admin', email: `${role.toLowerCase()}@example.test`,
  phone: '', dateOfBirth: '', role, emailVerified: true, ...overrides,
})

export const signIn = (user: AuthUser | null) => {
  setAccessToken(user ? 'test-access-token' : null)
  useAppStore.setState({ user, sessionStatus: user ? 'authenticated' : 'anonymous', isCartOpen: false, isMenuOpen: false, isSearchOpen: false })
}

/** Renders the real application routes at `path` with a fresh query cache. */
export const renderApp = (path: string, options: { routes?: RouteObject[] } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  const router = createMemoryRouter(options.routes ?? appRoutes, { initialEntries: [path] })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>,
  )
  return { ...utils, router, queryClient }
}

let counter = 0
export const makeProduct = (overrides: Partial<Product> = {}): Product => {
  counter += 1
  return {
    _id: `p${counter}`.padEnd(24, '0'), slug: `candle-${counter}`, sku: `SKU-${counter}`, name: `Candle ${counter}`, category: 'Luxury Candles', collection: 'Calm',
    fragrance: 'Vanilla', description: 'A lovely candle.', shortDescription: 'Lovely.', price: 500, mrp: 600, stock: 10, rating: 4.5, reviews: 3,
    tags: [], images: ['/img.png'], thumbnailImage: '/img.png', variants: [], status: 'ACTIVE', featured: false, ...overrides,
  }
}

export const makeSlide = (overrides: Partial<HeroSlide> = {}): HeroSlide => {
  counter += 1
  return {
    _id: `s${counter}`.padEnd(24, '0'), heading: `Slide ${counter}`, subheading: 'Sub', ctaText: 'Shop now', ctaUrl: '/shop', secondaryCta: null,
    desktopImage: `/hero-${counter}.jpg`, mobileImage: '', imageAlt: `Alt ${counter}`, desktopVideo: '', mobileVideo: '', posterImage: '',
    overlayPosition: 'center-left', textAlignment: 'left', overlay: { color: '#000000', opacity: 0.3 }, active: true, sortOrder: counter, ...overrides,
  }
}

/** Default storefront data so layout queries resolve. */
export const storefrontDefaults: MockRoutes = {
  'GET /products/categories': [],
  'GET /cms/announcement': { enabled: false, message: '', freeShippingEnabled: false, freeShippingThreshold: 0 },
  'GET /cart': { userId: 'u', items: [], subtotal: 0, itemCount: 0, hasIssues: false },
  'GET /wishlist': { userId: 'u', productIds: [] },
  'GET /cms/checkout-options': { codEnabled: true, codMaxOrderValue: null, razorpayEnabled: true, shippingFee: 99, freeShippingThreshold: 999, maxQuantityPerItem: 10 },
}
