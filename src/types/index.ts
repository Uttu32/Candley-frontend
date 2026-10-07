/** Types mirror the backend contract in Backend/docs/api-reference.md. */

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN'
export const adminRoles: Role[] = ['ADMIN', 'SUPER_ADMIN']
export const isAdminRole = (role: Role | undefined | null) => Boolean(role && adminRoles.includes(role))

export type AuthUser = {
  id: string
  _id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  role: Role
  emailVerified: boolean
}

export type Session = { accessToken: string; refreshToken?: string; user: AuthUser }

export type Pagination = { page: number; limit: number; total: number; totalPages: number }
export type Paginated<T> = { items: T[]; pagination: Pagination }

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'

export type Variant = {
  _id: string
  label: string
  sku: string
  price: number
  stock: number
  active?: boolean
}

export type Product = {
  _id: string
  slug: string
  sku: string
  name: string
  category: string
  collection: string
  fragrance: string
  description: string
  shortDescription: string
  price: number
  mrp: number
  stock: number
  rating: number
  reviews: number
  badge?: string | null
  tags: string[]
  images: string[]
  thumbnailImage: string
  variants: Variant[]
  status: ProductStatus
  featured: boolean
  fragranceNotes?: { top: string[]; heart: string[]; base: string[] }
  specifications?: Array<{ label: string; value: string }>
  seo?: { title: string; description: string }
  unitsSold?: number
  createdAt?: string
  updatedAt?: string
}

export type Category = {
  _id: string
  name: string
  slug: string
  image?: string
  description?: string
  active?: boolean
  sortOrder?: number
  count?: number
}

export type LineIssue = 'PRODUCT_UNAVAILABLE' | 'VARIANT_REQUIRED' | 'VARIANT_UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK'

export type CartLine = {
  _id: string
  productId: Product
  variantId?: string
  variant: (Variant & { sku: string }) | null
  quantity: number
  unitPrice: number
  lineTotal: number
  available: boolean
  maxQuantity: number
  issue: LineIssue | null
  issueMessage: string | null
}

export type Cart = {
  userId: string
  items: CartLine[]
  subtotal: number
  itemCount: number
  hasIssues: boolean
  updatedAt?: string | null
}

export type Wishlist = { userId: string; productIds: Product[] }

export type AddressInput = {
  label?: string
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault?: boolean
}
export type SavedAddress = AddressInput & { _id: string; isDefault: boolean }

export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'RAZORPAY' | 'COD'

export type OrderItem = {
  productId: string
  variantId?: string
  productName: string
  productSlug?: string
  variantLabel?: string
  sku: string
  image?: string
  thumbnailImage?: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type Order = {
  _id: string
  orderNumber: string
  userId: string | { _id: string; name: string; email: string; phone?: string }
  items: OrderItem[]
  shippingAddress: AddressInput
  subtotal: number
  discount?: number
  couponCode?: string
  shipping: number
  tax: number
  total: number
  currency?: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: OrderStatus
  payment?: { razorpayOrderId?: string; razorpayPaymentId?: string; paidAt?: string; failureReason?: string }
  reservationExpiresAt?: string
  statusHistory?: Array<{ status: OrderStatus; note?: string; at: string; changedBy?: { name: string; email: string } | string }>
  cancelledAt?: string
  cancellationReason?: string
  cancelledBy?: 'customer' | 'admin' | 'system'
  createdAt: string
  updatedAt?: string
}

export type Quote = {
  items: OrderItem[]
  subtotal: number
  discount: number
  couponCode: string | null
  couponError: string | null
  shipping: number
  tax: number
  total: number
  currency: string
  freeShippingThreshold: number
  paymentMethods: Record<'cod' | 'razorpay', { available: boolean; reason: string | null }>
}

export type CheckoutOptions = {
  codEnabled: boolean
  codMaxOrderValue: number | null
  razorpayEnabled: boolean
  shippingFee: number
  freeShippingThreshold: number
  maxQuantityPerItem: number
}

export type RazorpayPaymentInit = {
  keyId: string
  razorpayOrderId: string
  amount: number
  currency: string
  orderId: string
  orderNumber: string
  reservationExpiresAt?: string
}

export type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

export const overlayPositions = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const
export type OverlayPosition = (typeof overlayPositions)[number]
export type TextAlignment = 'left' | 'center' | 'right'

export type HeroSlide = {
  _id: string
  heading: string
  subheading: string
  ctaText?: string
  ctaUrl?: string
  secondaryCta?: { text: string; url: string } | null
  desktopImage: string
  mobileImage: string
  imageAlt: string
  backgroundVideo?: string
  desktopVideo: string
  mobileVideo: string
  posterImage: string
  overlayPosition: OverlayPosition
  textAlignment: TextAlignment
  overlay: { color: string; opacity: number }
  active: boolean
  sortOrder: number
  startsAt?: string | null
  endsAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type Announcement = {
  enabled: boolean
  message: string
  freeShippingEnabled: boolean
  freeShippingThreshold: number
  dismissible?: boolean
  ctaText?: string
  ctaUrl?: string
}

export type AdminDashboard = {
  totalSales: number
  totalOrders: number
  paidOrders: number
  totalCustomers: number
  newCustomers: number
  pendingOrders: number
  totalProducts: number
  outOfStockProducts: number
  lowStockProducts: number
  averageOrderValue: number
  /** Value of non-cancelled orders placed in the period, paid or not (e.g. COD awaiting collection). */
  bookedSales: number
  bookedOrders: number
  bookedAverageOrderValue: number
  lowStockThreshold: number
  /** Same figures for the equally long window before this one; null for "all time". */
  previous: { totalSales: number; totalOrders: number; bookedSales: number; bookedOrders: number; newCustomers: number; averageOrderValue: number; bookedAverageOrderValue: number; paidOrders: number } | null
  seriesUnit: 'day' | 'month'
  /** `value` is paid revenue, `booked` is all non-cancelled order value. Labels are YYYY-MM-DD or YYYY-MM (IST). */
  revenueSeries: Array<{ label: string; value: number; booked: number; orders: number }>
  topProducts: Array<{ productId: string; name: string; image?: string; units: number; revenue: number }>
  ordersByStatus: Array<{ status: OrderStatus; count: number }>
  paymentMethods: Array<{ method: PaymentMethod; count: number; amount: number }>
  needsAttention: { awaitingPayment: number; toProcess: number; toShip: number; codToCollect: number }
  recentOrders: Array<{ _id: string; orderNumber: string; customerName: string; itemCount: number; total: number; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; createdAt: string }>
  lowStockItems: Array<{ _id: string; name: string; sku: string; stock: number; image: string }>
}

export type AdminCustomer = {
  _id: string
  name: string
  email: string
  phone?: string
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED'
  emailVerified: boolean
  createdAt: string
  lastLoginAt?: string
  orderCount: number
  totalSpent: number
}

export type Coupon = {
  _id: string
  code: string
  description: string
  active: boolean
  discountType: 'PERCENT' | 'FIXED'
  amount: number
  minOrderValue: number
  maxDiscount?: number | null
  startsAt?: string | null
  endsAt?: string | null
  usageLimit?: number | null
  perCustomerLimit?: number | null
  usedCount: number
}

export type StoreSettings = {
  shippingFee: number
  freeShippingThreshold: number
  codEnabled: boolean
  codMaxOrderValue?: number | null
  maxQuantityPerItem: number
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
  status: ProductStatus
  featured: boolean
  variants: Array<{ _id?: string; label: string; sku: string; price: number; stock: number; active: boolean }>
  seo?: { title: string; description: string }
}
