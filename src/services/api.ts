import type {
  AddressInput, AdminCustomer, AdminDashboard, AdminProductInput, Announcement, AuthUser, Cart, Category, CheckoutOptions,
  Coupon, HeroSlide, Order, OrderStatus, Paginated, PaymentMethod, Product, Quote, RazorpayPaymentInit, RazorpaySuccess,
  SavedAddress, Session, StoreSettings, Wishlist,
} from '../types'

/** Empty base URL means same-origin (the Vite dev proxy forwards `/api`). */
export const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string
  details: unknown[]

  constructor(message: string, status: number, code = 'API_ERROR', details: unknown[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() { return this.status === 401 }
  get isForbidden() { return this.status === 403 }
  get isNotFound() { return this.status === 404 }
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') =>
  error instanceof Error && error.message ? error.message : fallback

// The access token lives in memory only. After a reload the session is restored from the httpOnly refresh
// cookie, or — when the browser blocks that cookie because the API is on another site — from the refresh
// token kept in localStorage.
let accessToken: string | null = null
let sessionExpiredHandler: (() => void) | undefined
let refreshInFlight: Promise<Session | null> | undefined

const refreshStorageKey = 'candley.refreshToken'
const storedRefreshToken = () => {
  try { return localStorage.getItem(refreshStorageKey) } catch { return null }
}
const storeRefreshToken = (token: string | null | undefined) => {
  try {
    if (token) localStorage.setItem(refreshStorageKey, token)
    else localStorage.removeItem(refreshStorageKey)
  } catch {
    // Storage can be unavailable (private mode); the cookie still works where allowed.
  }
}
/** Keeps a freshly issued session: access token in memory, refresh token in localStorage. */
const adoptSession = (session: Session) => {
  accessToken = session.accessToken
  if (session.refreshToken) storeRefreshToken(session.refreshToken)
  return session
}

export const getAccessToken = () => accessToken
export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token === null) storeRefreshToken(null)
}
export const onSessionExpired = (handler: () => void) => { sessionExpiredHandler = handler }

type Query = Record<string, string | number | boolean | undefined | null>
type RequestOptions = { method?: string; body?: unknown; query?: Query; headers?: Record<string, string>; signal?: AbortSignal; retryOnUnauthorized?: boolean }

const buildUrl = (path: string, query?: Query) => {
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const suffix = params.toString()
  return `${apiBaseUrl}/api/v1${path}${suffix ? `?${suffix}` : ''}`
}

type Envelope<T> = { success: boolean; message?: string; data: T; error?: { code?: string; message?: string; details?: unknown[] } }

const send = async (path: string, options: RequestOptions) => {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined
  if (options.body instanceof FormData) body = options.body
  else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  try {
    return await fetch(buildUrl(path, options.query), { method: options.method ?? 'GET', headers, body, credentials: 'include', signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR')
  }
}

/** Exchanges the refresh cookie for a new session. Concurrent callers share one request. */
export const refreshSession = () => {
  refreshInFlight ??= (async () => {
    try {
      const stored = storedRefreshToken()
      const response = await send('/auth/refresh', { method: 'POST', retryOnUnauthorized: false, headers: stored ? { 'X-Refresh-Token': stored } : undefined })
      if (!response.ok) {
        // 401 means the token is invalid or revoked; other failures (network, 5xx, 429) may be temporary.
        if (response.status === 401) storeRefreshToken(null)
        return null
      }
      const payload = (await response.json()) as Envelope<Session>
      return adoptSession(payload.data)
    } catch {
      return null
    } finally {
      refreshInFlight = undefined
    }
  })()
  return refreshInFlight
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response = await send(path, options)
  if (response.status === 401 && options.retryOnUnauthorized !== false && accessToken !== null) {
    const session = await refreshSession()
    if (session) response = await send(path, options)
    else {
      setAccessToken(null)
      sessionExpiredHandler?.()
    }
  }
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload || payload.success === false) {
    const message = payload?.message ?? payload?.error?.message ?? (response.status === 403 ? 'You do not have access to this.' : `Request failed (${response.status})`)
    throw new ApiError(message, response.status, payload?.error?.code, payload?.error?.details ?? [])
  }
  return payload.data
}

const json = (method: string, body?: unknown, extra: Omit<RequestOptions, 'method' | 'body'> = {}) => ({ method, body, ...extra })

export type ProductQuery = { q?: string; category?: string; collection?: string; minPrice?: number; maxPrice?: number; sort?: string; page?: number; limit?: number; featured?: boolean; inStock?: boolean }

export const authApi = {
  login: async (input: { email: string; password: string }) => {
    return adoptSession(await request<Session>('/auth/login', json('POST', input, { retryOnUnauthorized: false })))
  },
  register: (input: { name: string; email: string; password: string }) => request<AuthUser>('/auth/register', json('POST', input)),
  logout: async () => {
    const stored = storedRefreshToken()
    try {
      await request<null>('/auth/logout', json('POST', undefined, { retryOnUnauthorized: false, headers: stored ? { 'X-Refresh-Token': stored } : undefined }))
    } finally {
      setAccessToken(null)
    }
  },
  me: () => request<AuthUser>('/auth/me'),
  updateProfile: (input: { name: string; email: string; phone: string; dateOfBirth: string }) => request<AuthUser>('/auth/me', json('PATCH', input)),
  changePassword: async (input: { currentPassword: string; newPassword: string }) => {
    return adoptSession(await request<Session>('/auth/change-password', json('POST', input)))
  },
  forgotPassword: (email: string) => request<null>('/auth/forgot-password', json('POST', { email })),
  resetPassword: (input: { token: string; password: string }) => request<null>('/auth/reset-password', json('POST', input)),
}

export const catalogApi = {
  products: (query: ProductQuery = {}, signal?: AbortSignal) => request<Paginated<Product>>('/products', { query, signal }),
  product: (slug: string) => request<Product>(`/products/${encodeURIComponent(slug)}`),
  related: (slug: string, limit = 4) => request<Product[]>(`/products/${encodeURIComponent(slug)}/related`, { query: { limit } }),
  bestSellers: (limit = 8) => request<Product[]>('/products/best-sellers', { query: { limit } }),
  featured: (limit = 8) => request<Product[]>('/products/featured', { query: { limit } }),
  categories: () => request<Category[]>('/products/categories'),
}

export const cmsApi = {
  heroSlides: () => request<HeroSlide[]>('/cms/hero'),
  announcement: () => request<Announcement>('/cms/announcement'),
  checkoutOptions: () => request<CheckoutOptions>('/cms/checkout-options'),
}

const variantQuery = (variantId?: string) => (variantId ? { variantId } : undefined)

export const cartApi = {
  get: () => request<Cart>('/cart'),
  add: (input: { productId: string; variantId?: string; quantity: number }) => request<Cart>('/cart/items', json('POST', input)),
  setQuantity: (productId: string, variantId: string | undefined, quantity: number) =>
    request<Cart>(`/cart/items/${productId}`, json('PATCH', { quantity, ...(variantId ? { variantId } : {}) })),
  remove: (productId: string, variantId?: string) => request<Cart>(`/cart/items/${productId}`, { method: 'DELETE', query: variantQuery(variantId) }),
  clear: () => request<Cart>('/cart', { method: 'DELETE' }),
}

export const wishlistApi = {
  get: () => request<Wishlist>('/wishlist'),
  add: (productId: string) => request<Wishlist>('/wishlist', json('POST', { productId })),
  remove: (productId: string) => request<Wishlist>(`/wishlist/${productId}`, { method: 'DELETE' }),
}

export const accountApi = {
  addresses: () => request<SavedAddress[]>('/account/addresses'),
  addAddress: (input: AddressInput) => request<SavedAddress[]>('/account/addresses', json('POST', input)),
  updateAddress: (id: string, input: Partial<AddressInput>) => request<SavedAddress[]>(`/account/addresses/${id}`, json('PATCH', input)),
  removeAddress: (id: string) => request<SavedAddress[]>(`/account/addresses/${id}`, { method: 'DELETE' }),
}

export type CheckoutInput = { shippingAddress?: AddressInput; addressId?: string; paymentMethod: PaymentMethod; couponCode?: string; idempotencyKey: string }

export const ordersApi = {
  list: () => request<Order[]>('/orders'),
  get: (id: string) => request<Order>(`/orders/${id}`),
  quote: (couponCode?: string) => request<Quote>('/orders/quote', json('POST', { couponCode: couponCode || undefined })),
  create: (input: CheckoutInput) => request<Order>('/orders', json('POST', input)),
  cancel: (id: string, reason?: string) => request<Order>(`/orders/${id}/cancel`, json('POST', { reason })),
  startRazorpay: (id: string) => request<RazorpayPaymentInit>(`/orders/${id}/payment/razorpay`, json('POST')),
  verifyRazorpay: (id: string, input: RazorpaySuccess) => request<Order>(`/orders/${id}/payment/razorpay/verify`, json('POST', input)),
}

const productForm = (input: Partial<AdminProductInput>, images: File[], extra: Record<string, string> = {}) => {
  const body = new FormData()
  body.set('product', JSON.stringify(input))
  Object.entries(extra).forEach(([key, value]) => body.set(key, value))
  images.forEach((image) => body.append('images', image))
  return body
}

export type HeroSlideInput = Partial<Omit<HeroSlide, '_id' | 'createdAt' | 'updatedAt' | 'backgroundVideo'>>

export const adminApi = {
  dashboard: (query: { from?: string; to?: string } = {}) => request<AdminDashboard>('/admin/dashboard', { query }),
  products: (query: { page?: number; limit?: number; search?: string; status?: string; category?: string; lowStock?: number } = {}) => request<Paginated<Product>>('/admin/products', { query }),
  product: (id: string) => request<Product>(`/admin/products/${id}`),
  createProduct: (input: AdminProductInput, images: File[], thumbnailIndex: number) =>
    request<Product>('/admin/products', { method: 'POST', body: productForm(input, images, { thumbnailIndex: String(thumbnailIndex) }) }),
  updateProduct: (id: string, input: Partial<AdminProductInput>, images: File[], options: { thumbnailIndex?: number; removeImages?: string[] } = {}) =>
    request<Product>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: productForm(input, images, {
        ...(options.thumbnailIndex !== undefined ? { thumbnailIndex: String(options.thumbnailIndex) } : {}),
        ...(options.removeImages?.length ? { removeImages: JSON.stringify(options.removeImages) } : {}),
      }),
    }),
  setProductStatus: (id: string, status: Product['status']) => request<Product>(`/admin/products/${id}/status`, json('PATCH', { status })),
  adjustInventory: (id: string, input: { variantId?: string; stock?: number; delta?: number }) => request<Product>(`/admin/products/${id}/inventory`, json('PATCH', input)),
  deleteProduct: (id: string) => request<{ deleted: boolean; archived: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),

  categories: () => request<Category[]>('/admin/categories'),
  createCategory: (input: Partial<Category>) => request<Category>('/admin/categories', json('POST', input)),
  updateCategory: (id: string, input: Partial<Category>) => request<Category>(`/admin/categories/${id}`, json('PATCH', input)),
  deleteCategory: (id: string) => request<null>(`/admin/categories/${id}`, { method: 'DELETE' }),

  heroSlides: () => request<HeroSlide[]>('/admin/cms/hero'),
  createHeroSlide: (input: HeroSlideInput) => request<HeroSlide>('/admin/cms/hero', json('POST', input)),
  updateHeroSlide: (id: string, input: HeroSlideInput) => request<HeroSlide>(`/admin/cms/hero/${id}`, json('PATCH', input)),
  reorderHeroSlides: (ids: string[]) => request<HeroSlide[]>('/admin/cms/hero/order', json('PUT', { ids })),
  setHeroSlideActive: (id: string, active: boolean) => request<HeroSlide>(`/admin/cms/hero/${id}/${active ? 'activate' : 'deactivate'}`, json('POST')),
  deleteHeroSlide: (id: string) => request<null>(`/admin/cms/hero/${id}`, { method: 'DELETE' }),
  uploadHeroMedia: (id: string, kind: 'image' | 'video', target: string, file: File) => {
    const body = new FormData()
    body.set('target', target)
    body.set(kind, file)
    return request<HeroSlide>(`/admin/cms/hero/${id}/${kind}`, { method: 'POST', body })
  },

  orders: (query: { page?: number; limit?: number; status?: string; paymentStatus?: string; search?: string } = {}) => request<Paginated<Order>>('/admin/orders', { query }),
  order: (id: string) => request<Order>(`/admin/orders/${id}`),
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => request<Order>(`/admin/orders/${id}/status`, json('PATCH', { status, note: note || undefined })),
  markCodCollected: (id: string) => request<Order>(`/admin/orders/${id}/cod-collected`, json('POST')),

  customers: (query: { page?: number; limit?: number; search?: string; status?: string } = {}) => request<Paginated<AdminCustomer>>('/admin/customers', { query }),
  setCustomerStatus: (id: string, status: AdminCustomer['status']) => request<AdminCustomer>(`/admin/customers/${id}/status`, json('PATCH', { status })),

  coupons: (query: { page?: number; limit?: number } = {}) => request<Paginated<Coupon>>('/admin/coupons', { query }),
  createCoupon: (input: Partial<Coupon>) => request<Coupon>('/admin/coupons', json('POST', input)),
  updateCoupon: (id: string, input: Partial<Coupon>) => request<Coupon>(`/admin/coupons/${id}`, json('PATCH', input)),
  deleteCoupon: (id: string) => request<{ deleted: boolean; deactivated: boolean }>(`/admin/coupons/${id}`, { method: 'DELETE' }),

  storeSettings: () => request<StoreSettings>('/admin/settings/store'),
  updateStoreSettings: (input: Partial<StoreSettings>) => request<StoreSettings>('/admin/settings/store', json('PUT', input)),
  announcement: () => request<Announcement | null>('/admin/settings/announcement'),
  updateAnnouncement: (input: Partial<Announcement>) => request<Announcement>('/admin/settings/announcement', json('PUT', input)),
}
