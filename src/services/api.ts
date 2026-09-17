import type { CartItem, Category, Product } from '../types'
import type { AccountProfile } from './account'

export type ApiEnvelope<T> = { success: boolean; message: string; data: T; errors?: unknown[] }
export type AuthUser = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'STAFF'; emailVerified?: boolean }
export type AuthSession = { accessToken: string; user: AuthUser }
export type ProductList = { items: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
export type AnnouncementBar = {
  enabled: boolean
  message: string
  freeShippingEnabled: boolean
  freeShippingThreshold: number
}
export type HeroSlide = {
  _id?: string
  id?: string
  heading: string
  subheading: string
  ctaText?: string
  ctaUrl?: string
  desktopImage?: string
  mobileImage?: string
  image?: string
  active?: boolean
  sortOrder?: number
  overlayPosition?: string
  textAlignment?: string
}
export type AdminProductInput = {
  name: string
  slug: string
  sku: string
  category: string
  collection: string
  fragrance: string
  description: string
  shortDescription: string
  price: number
  mrp: number
  stock: number
  tags: string[]
  status: 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'
  featured: boolean
  variants: Array<{ label: string; sku: string; price: number; stock: number }>
}
export type ApiCart = { userId: string; items: Array<{ productId: Product; variantId?: string; quantity: number }> }
export type Address = { name: string; phone: string; addressLine1: string; city: string; state: string; postalCode: string; country: string }
export type Order = { _id: string; orderNumber: string; items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number; image?: string }>; subtotal: number; shipping: number; tax: number; total: number; paymentMethod: 'RAZORPAY' | 'COD'; paymentStatus: string; status: string; shippingAddress: Address; createdAt: string }
export type AdminDashboard = {
  totalSales: number
  totalOrders: number
  totalCustomers: number
  conversionRate?: number
  pendingOrders: number
  totalProducts: number
  outOfStockProducts: number
  averageOrderValue: number
  revenueSeries?: Array<{ label: string; value: number }>
}

const baseUrl = () => ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

let accessToken: string | null = null

export const getAccessToken = () => accessToken
export const setAccessToken = (token: string) => { accessToken = token }
export const clearAccessToken = () => { accessToken = null }

const request = async <T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> => {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 401 && canRefresh && path !== '/api/v1/auth/refresh') {
    const refreshed = await request<{ accessToken: string }>('/api/v1/auth/refresh', { method: 'POST' }, false)
    setAccessToken(refreshed.accessToken)
    return request<T>(path, init, false)
  }
  const payload = await response.json().catch(() => ({ message: 'Unexpected server response' })) as ApiEnvelope<T> & { message?: string }
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Request failed')
  return payload.data
}

export const api = {
  register: (input: { name: string; email: string; password: string }) => request<AuthUser>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: async (input: { email: string; password: string }) => {
    const session = await request<AuthSession>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) })
    setAccessToken(session.accessToken)
    return session
  },
  adminLogin: async (input: { email: string; password: string }) => {
    const session = await request<AuthSession>('/api/v1/admin/login', { method: 'POST', body: JSON.stringify(input) })
    setAccessToken(session.accessToken)
    return session
  },
  adminDashboard: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams()
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<AdminDashboard>(`/api/v1/admin/dashboard${suffix}`)
  },
  adminProducts: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    return request<ProductList>(`/api/v1/admin/products?${query.toString()}`)
  },
  createAdminProduct: async (input: AdminProductInput, images: File[], thumbnailIndex: number) => {
    const body = new FormData()
    body.set('product', JSON.stringify(input))
    body.set('thumbnailIndex', String(thumbnailIndex))
    images.forEach((image) => body.append('images', image))
    return request<Product>('/api/v1/admin/products', { method: 'POST', body })
  },
  adminHeroSlides: () => request<HeroSlide[]>('/api/v1/admin/cms/hero'),
  updateHeroImage: async (slideId: string, image: File, target: 'desktopImage' | 'mobileImage') => {
    const body = new FormData()
    body.set('image', image)
    body.set('target', target)
    return request<HeroSlide>(`/api/v1/admin/cms/hero/${encodeURIComponent(slideId)}/image`, { method: 'POST', body })
  },
  logout: async () => { await request<null>('/api/v1/auth/logout', { method: 'POST' }, false); clearAccessToken() },
  me: () => request<AuthUser>('/api/v1/auth/me'),
  announcement: () => request<AnnouncementBar | null>('/api/v1/cms/announcement'),
  heroSlides: () => request<HeroSlide[]>('/api/v1/cms/hero'),
  products: (params: URLSearchParams) => request<ProductList>(`/api/v1/products?${params.toString()}`),
  product: (slug: string) => request<Product>(`/api/v1/products/${encodeURIComponent(slug)}`),
  categories: () => request<Category[]>('/api/v1/products/categories'),
  cart: () => request<ApiCart>('/api/v1/cart'),
  addCartItem: (item: CartItem) => request<ApiCart>('/api/v1/cart/items', { method: 'POST', body: JSON.stringify(item) }),
  updateCartItem: (productId: string, quantity: number) => request<ApiCart>(`/api/v1/cart/items/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeCartItem: (productId: string) => request<ApiCart>(`/api/v1/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  wishlist: () => request<{ productIds: Product[] }>('/api/v1/wishlist'),
  addWishlist: (productId: string) => request<{ productIds: Product[] }>('/api/v1/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }),
  removeWishlist: (productId: string) => request<{ productIds: Product[] }>(`/api/v1/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  orders: () => request<Order[]>('/api/v1/orders'),
  order: (id: string) => request<Order>(`/api/v1/orders/${encodeURIComponent(id)}`),
  createOrder: (input: { shippingAddress: Address; paymentMethod: 'RAZORPAY' | 'COD' }) => request<Order>('/api/v1/orders', { method: 'POST', body: JSON.stringify(input) }),
  profile: () => request<AccountProfile & { id: string; role: string; emailVerified: boolean }>('/api/v1/auth/me'),
  updateProfile: (profile: AccountProfile) => request<AccountProfile & { id: string; role: string; emailVerified: boolean }>('/api/v1/auth/me', { method: 'PATCH', body: JSON.stringify(profile) }),
}
