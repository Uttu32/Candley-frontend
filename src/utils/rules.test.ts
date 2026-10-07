import { describe, expect, it } from 'vitest'
import { displayPrice, isSafeLink, nextStatuses, slideStatus, slugify, validateAddress, validateCoupon, validateProduct, validateSlideForm, type SlideFormState } from './rules'
import { makeProduct, makeSlide } from '../test/utils'
import { emptyAddress } from './rules'

describe('business rule mirrors', () => {
  it('accepts only site paths and https links (same as the backend)', () => {
    expect(isSafeLink('/shop')).toBe(true)
    expect(isSafeLink('https://example.com/sale')).toBe(true)
    for (const bad of ['javascript:alert(1)', '//evil.example', 'http://insecure.example', 'data:text/html,x', '/\\evil']) expect(isSafeLink(bad)).toBe(false)
  })

  it('computes hero slide status like the public endpoint', () => {
    const now = new Date('2026-10-07T12:00:00Z')
    expect(slideStatus(makeSlide(), now)).toBe('Live')
    expect(slideStatus(makeSlide({ active: false }), now)).toBe('Inactive')
    expect(slideStatus(makeSlide({ desktopImage: '' }), now)).toBe('Needs media')
    expect(slideStatus(makeSlide({ desktopImage: '', desktopVideo: '/v.mp4' }), now)).toBe('Live')
    expect(slideStatus(makeSlide({ startsAt: '2026-10-08T00:00:00Z' }), now)).toBe('Scheduled')
    expect(slideStatus(makeSlide({ endsAt: '2026-10-01T00:00:00Z' }), now)).toBe('Expired')
  })

  it('validates slide forms', () => {
    const base: SlideFormState = { heading: 'Autumn', subheading: '', ctaText: 'Shop', ctaUrl: '/shop', secondaryText: '', secondaryUrl: '', imageAlt: '', overlayPosition: 'center', textAlignment: 'left', overlayColor: '#000000', overlayOpacity: 0.3, active: true, startsAt: '', endsAt: '' }
    expect(validateSlideForm(base)).toEqual({})
    expect(validateSlideForm({ ...base, ctaUrl: 'javascript:alert(1)' }).ctaUrl).toBeTruthy()
    expect(validateSlideForm({ ...base, secondaryText: 'Gifts' }).secondaryUrl).toBeTruthy()
    expect(validateSlideForm({ ...base, startsAt: '2026-12-10T10:00', endsAt: '2026-12-01T10:00' }).endsAt).toBeTruthy()
  })

  it('validates products including variant SKU uniqueness', () => {
    const product = { name: 'Lavender', slug: 'lavender', sku: 'LAV', category: 'Soy', collection: 'Calm', fragrance: 'Lavender', description: 'Calm.', shortDescription: 'Calm.', price: 500, mrp: 600, stock: 0, tags: [], status: 'ACTIVE' as const, featured: false, variants: [] }
    expect(validateProduct(product)).toEqual({})
    expect(validateProduct({ ...product, mrp: 100 }).mrp).toBeTruthy()
    expect(validateProduct({ ...product, slug: 'Bad Slug' }).slug).toBeTruthy()
    const dup = validateProduct({ ...product, variants: [{ label: 'a', sku: 'X', price: 1, stock: 1, active: true }, { label: 'b', sku: 'x', price: 1, stock: 1, active: true }] })
    expect(dup['variant-1-sku']).toMatch(/unique/)
    expect(validateProduct({ ...product, variants: [{ label: '200g', sku: 'LAV', price: 1, stock: 1, active: true }] })).toEqual({})
  })

  it('validates addresses and coupons', () => {
    expect(Object.keys(validateAddress(emptyAddress))).toEqual(expect.arrayContaining(['name', 'phone', 'addressLine1', 'city', 'state', 'postalCode']))
    expect(validateAddress({ ...emptyAddress, name: 'Asha', phone: '+91 98765 43210', addressLine1: '12 MG Road', city: 'Pune', state: 'MH', postalCode: '411001' })).toEqual({})
    const coupon = { code: 'SAVE10', description: '', discountType: 'PERCENT' as const, amount: '10', minOrderValue: '0', maxDiscount: '', usageLimit: '', perCustomerLimit: '', startsAt: '', endsAt: '', active: true }
    expect(validateCoupon(coupon)).toBeNull()
    expect(validateCoupon({ ...coupon, amount: '150' })).toMatch(/100/)
  })

  it('offers only backend-allowed order transitions', () => {
    expect(nextStatuses('CONFIRMED')).toEqual(['PROCESSING', 'CANCELLED'])
    expect(nextStatuses('SHIPPED')).toEqual(['DELIVERED'])
    expect(nextStatuses('DELIVERED')).toEqual([])
  })

  it('shows "from" pricing for multi-variant products', () => {
    expect(displayPrice(makeProduct({ price: 500 }))).toEqual({ from: false, price: 500 })
    expect(displayPrice(makeProduct({ variants: [{ _id: 'a', label: 'S', sku: 'a', price: 800, stock: 1 }, { _id: 'b', label: 'L', sku: 'b', price: 1400, stock: 1 }] }))).toEqual({ from: true, price: 800 })
  })

  it('slugifies names', () => {
    expect(slugify('  Rose & Oud — Deluxe! ')).toBe('rose-oud-deluxe')
  })
})
