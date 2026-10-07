/**
 * Client-side mirrors of backend business rules. They exist for fast, friendly feedback only:
 * the server re-validates everything and is the source of truth.
 */
import type { AddressInput, AdminProductInput, HeroSlide, Order, OrderStatus, Product, ProductStatus } from '../types'

// ---------- Catalogue ----------

/** Display price: the single variant/product price, or "from" the cheapest active variant (server values). */
export const displayPrice = (product: Product) => {
  const variants = (product.variants ?? []).filter((variant) => variant.active !== false)
  if (variants.length <= 1) return { from: false, price: variants[0]?.price ?? product.price }
  return { from: true, price: Math.min(...variants.map((variant) => variant.price)) }
}

export const isPurchasable = (product: Product) => product.status === 'ACTIVE' && product.stock > 0

export const productStatuses: ProductStatus[] = ['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']

export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180)

export const validateProduct = (product: AdminProductInput) => {
  const errors: Record<string, string> = {}
  if (product.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens'
  if (product.sku.trim().length < 2) errors.sku = 'SKU must be at least 2 characters'
  for (const key of ['category', 'collection', 'fragrance'] as const) if (!product[key].trim()) errors[key] = 'Required'
  if (product.shortDescription.trim().length < 2) errors.shortDescription = 'Required'
  if (product.shortDescription.length > 240) errors.shortDescription = 'Keep it under 240 characters'
  if (product.description.trim().length < 2) errors.description = 'Required'
  if (!(product.price >= 0)) errors.price = 'Enter a valid price'
  if (!(product.mrp >= product.price)) errors.mrp = 'MRP must be at least the selling price'
  if (!Number.isInteger(product.stock) || product.stock < 0) errors.stock = 'Enter a whole number'
  const skus = [product.sku, ...product.variants.map((variant) => variant.sku)].filter(Boolean).map((sku) => sku.toUpperCase())
  product.variants.forEach((variant, index) => {
    if (!variant.label.trim()) errors[`variant-${index}-label`] = 'Label required'
    if (!variant._id && !variant.sku.trim()) errors[`variant-${index}-sku`] = 'SKU required'
    const repeated = variant.sku && skus.filter((sku) => sku === variant.sku.toUpperCase()).length > 1
    // The backend allows a single variant to share the product SKU.
    if (repeated && !(product.variants.length === 1 && variant.sku.toUpperCase() === product.sku.toUpperCase())) errors[`variant-${index}-sku`] = 'SKU must be unique'
    if (!(variant.price >= 0)) errors[`variant-${index}-price`] = 'Invalid price'
    if (!Number.isInteger(variant.stock) || variant.stock < 0) errors[`variant-${index}-stock`] = 'Whole number'
  })
  return errors
}

// ---------- Media ----------

export const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const videoTypes = ['video/mp4', 'video/webm']
export const maxImageBytes = 8 * 1024 * 1024
export const maxHeroUploadBytes = 40 * 1024 * 1024

export const validateImageFile = (file: File) => {
  if (!imageTypes.includes(file.type)) return `${file.name}: use JPEG, PNG, WebP or AVIF`
  if (file.size > maxImageBytes) return `${file.name}: larger than 8 MB`
  return null
}

export const validateHeroFile = (file: File, kind: 'image' | 'video') => {
  const types = kind === 'image' ? imageTypes : videoTypes
  if (!types.includes(file.type)) return kind === 'image' ? 'Use a JPEG, PNG, WebP or AVIF image' : 'Use an MP4 or WebM video'
  if (file.size > maxHeroUploadBytes) return 'Files must be 40 MB or smaller'
  return null
}

// ---------- Links and hero slides ----------

/** A site path ("/shop") or an https URL, matching the backend's link rule. */
export const isSafeLink = (value: string) => {
  if (!value) return true
  if (value.startsWith('/')) return !value.startsWith('//') && !value.includes('\\')
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

/** Same rules as the public hero endpoint: active, inside the schedule window, and has an image or video. */
export const slideStatus = (slide: HeroSlide, now = new Date()) => {
  if (!slide.active) return 'Inactive'
  if (!slide.desktopImage && !slide.desktopVideo && !slide.backgroundVideo) return 'Needs media'
  if (slide.startsAt && new Date(slide.startsAt) > now) return 'Scheduled'
  if (slide.endsAt && new Date(slide.endsAt) <= now) return 'Expired'
  return 'Live'
}

export type SlideFormState = {
  heading: string; subheading: string; ctaText: string; ctaUrl: string; secondaryText: string; secondaryUrl: string; imageAlt: string
  overlayPosition: HeroSlide['overlayPosition']; textAlignment: HeroSlide['textAlignment']; overlayColor: string; overlayOpacity: number
  active: boolean; startsAt: string; endsAt: string
}

export const validateSlideForm = (form: SlideFormState) => {
  const errors: Record<string, string> = {}
  if (form.heading.trim().length < 2) errors.heading = 'Heading must be at least 2 characters'
  if (form.heading.length > 120) errors.heading = 'Keep the heading under 120 characters'
  if (form.subheading.length > 220) errors.subheading = 'Keep it under 220 characters'
  if (form.ctaText && form.ctaText.trim().length < 2) errors.ctaText = 'At least 2 characters'
  if (!isSafeLink(form.ctaUrl)) errors.ctaUrl = 'Use a site path like /shop or an https:// link'
  if ((form.secondaryText || form.secondaryUrl) && (!form.secondaryText.trim() || !form.secondaryUrl.trim())) errors.secondaryUrl = 'Provide both text and link, or neither'
  if (!isSafeLink(form.secondaryUrl)) errors.secondaryUrl = 'Use a site path like /shop or an https:// link'
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) errors.endsAt = 'End must be after the start'
  return errors
}

// ---------- Accounts and orders ----------

export const validateRegistration = (input: { name: string; email: string; password: string; confirm: string }) => {
  const errors: Record<string, string> = {}
  if (input.name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters)'
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) errors.email = 'Enter a valid email address'
  if (input.password.length < 8) errors.password = 'Use at least 8 characters'
  if (input.password.length > 128) errors.password = 'Use at most 128 characters'
  if (input.confirm !== input.password) errors.confirm = 'Passwords do not match'
  return errors
}

export const emptyAddress: AddressInput = { label: 'Home', name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false }

export const validateAddress = (address: AddressInput) => {
  const errors: Partial<Record<keyof AddressInput, string>> = {}
  if (address.name.trim().length < 2) errors.name = 'Enter the recipient name'
  if (!/^[\d+\-\s()]{8,20}$/.test(address.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (address.addressLine1.trim().length < 3) errors.addressLine1 = 'Enter the street address'
  if (address.city.trim().length < 2) errors.city = 'Enter the city'
  if (address.state.trim().length < 2) errors.state = 'Enter the state'
  if (!/^[A-Za-z\d\s-]{4,12}$/.test(address.postalCode.trim())) errors.postalCode = 'Enter a valid PIN code'
  if (address.country.trim().length < 2) errors.country = 'Enter the country'
  return errors
}

/** Customers may cancel while awaiting payment or confirmed. */
export const customerCanCancel = (order: Order) => order.status === 'PENDING_PAYMENT' || order.status === 'CONFIRMED'

/** Status changes the backend allows administrators to make. */
export const nextStatuses = (status: OrderStatus): OrderStatus[] => ({
  PENDING_PAYMENT: ['CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
} as Record<OrderStatus, OrderStatus[]>)[status]

export type CouponFormState = { code: string; description: string; discountType: 'PERCENT' | 'FIXED'; amount: string; minOrderValue: string; maxDiscount: string; usageLimit: string; perCustomerLimit: string; startsAt: string; endsAt: string; active: boolean }

export const validateCoupon = (form: CouponFormState) => {
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.code)) return 'Code must be 3-40 letters, numbers, dashes or underscores'
  const amount = Number(form.amount)
  if (!(amount > 0)) return 'Enter a discount amount greater than zero'
  if (form.discountType === 'PERCENT' && amount > 100) return 'A percentage discount cannot exceed 100'
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return 'End date must be after the start date'
  return null
}
