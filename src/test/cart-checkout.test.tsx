import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeProduct, makeUser, mockApi, MockError, renderApp, signIn, storefrontDefaults } from './utils'
import type { Cart, CartLine, Order, Product, Quote, SavedAddress } from '../types'

const product = makeProduct({ name: 'Amber Silk', price: 700 })
const line = (overrides: Partial<CartLine> = {}, item: Product = product): CartLine => ({
  _id: `line-${item._id}`, productId: item, quantity: 2, unitPrice: item.price, lineTotal: item.price * 2, available: true, maxQuantity: 10, issue: null, issueMessage: null, variant: null, ...overrides,
})
const cartOf = (lines: CartLine[]): Cart => ({ userId: 'u', items: lines, subtotal: lines.filter((entry) => entry.available).reduce((sum, entry) => sum + entry.lineTotal, 0), itemCount: lines.reduce((sum, entry) => sum + entry.quantity, 0), hasIssues: lines.some((entry) => !entry.available), updatedAt: '2026-10-07T10:00:00.000Z' })

const address: SavedAddress = { _id: 'addr1', label: 'Home', name: 'Asha Rao', phone: '+91 98765 43210', addressLine1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India', isDefault: true }
const quote = (overrides: Partial<Quote> = {}): Quote => ({
  items: [{ productId: product._id, productName: 'Amber Silk', sku: 'S', unitPrice: 700, quantity: 2, lineTotal: 1400 }],
  subtotal: 1400, discount: 0, couponCode: null, couponError: null, shipping: 0, tax: 0, total: 1400, currency: 'INR', freeShippingThreshold: 999,
  paymentMethods: { cod: { available: true, reason: null }, razorpay: { available: true, reason: null } }, ...overrides,
})
const order = (overrides: Partial<Order> = {}): Order => ({
  _id: 'order1', orderNumber: 'CAN-20261007-ABC123', userId: 'u', items: quote().items, shippingAddress: address, subtotal: 1400, shipping: 0, tax: 0, total: 1400,
  paymentMethod: 'COD', paymentStatus: 'PENDING', status: 'CONFIRMED', createdAt: '2026-10-07T10:00:00.000Z', statusHistory: [], ...overrides,
})

beforeEach(() => signIn(makeUser()))
afterEach(() => { delete window.Razorpay })

describe('cart', () => {
  it('shows server prices and totals, not client-computed ones', async () => {
    // The server says the unit price is now 750 even though the product payload still says 700.
    mockApi({ ...storefrontDefaults, 'GET /cart': cartOf([line({ unitPrice: 750, lineTotal: 1500 })]) })
    renderApp('/cart')
    expect(await screen.findByText('₹750 each')).toBeInTheDocument()
    expect(screen.getAllByText('₹1,500').length).toBeGreaterThan(0)
    expect(screen.queryByText('₹1,400')).toBeNull()
  })

  it('warns about unavailable items and blocks checkout', async () => {
    mockApi({ ...storefrontDefaults, 'GET /cart': cartOf([line({ available: false, issue: 'OUT_OF_STOCK', issueMessage: 'Out of stock', lineTotal: 0, maxQuantity: 0 })]) })
    renderApp('/cart')
    expect(await screen.findByText('Out of stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resolve cart issues/i })).toBeDisabled()
  })

  it('updates quantity optimistically and keeps the server result', async () => {
    let resolve!: (cart: Cart) => void
    const api = mockApi({ ...storefrontDefaults, 'GET /cart': cartOf([line()]), 'PATCH /cart/items/:id': () => new Promise<Cart>((done) => { resolve = done }) })
    renderApp('/cart')
    const quantity = await screen.findByRole('group', { name: 'Quantity of Amber Silk' })
    await userEvent.click(within(quantity).getByRole('button', { name: /increase/i }))
    expect(within(quantity).getByText('3')).toBeInTheDocument() // optimistic
    expect(screen.getByText('Updating…')).toBeInTheDocument() // totals wait for the server
    resolve(cartOf([line({ quantity: 3, lineTotal: 2100 })]))
    await waitFor(() => expect(screen.getAllByText('₹2,100').length).toBeGreaterThan(0))
    expect(api.callsTo('PATCH', `/cart/items/${product._id}`)[0]!.body).toEqual({ quantity: 3 })
  })

  it('rolls back and shows the server error when an update fails', async () => {
    mockApi({ ...storefrontDefaults, 'GET /cart': cartOf([line()]), 'PATCH /cart/items/:id': new MockError(409, 'Only limited stock is available', 'INSUFFICIENT_STOCK') })
    renderApp('/cart')
    const quantity = await screen.findByRole('group', { name: 'Quantity of Amber Silk' })
    await userEvent.click(within(quantity).getByRole('button', { name: /increase/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only limited stock is available')
    expect(within(quantity).getByText('2')).toBeInTheDocument()
  })

  it('sends the variant id when removing a variant line', async () => {
    const variantLine = line({ variantId: 'v-200', variant: { _id: 'v-200', label: '200g', sku: 'A-200', price: 700, stock: 5 } })
    const api = mockApi({ ...storefrontDefaults, 'GET /cart': cartOf([variantLine]), 'DELETE /cart/items/:id': cartOf([]) })
    renderApp('/cart')
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Amber Silk (200g) from cart' }))
    await waitFor(() => expect(api.calls.find((call) => call.method === 'DELETE')!.url.search).toBe('?variantId=v-200'))
  })

  it('prompts guests to sign in', async () => {
    signIn(null)
    mockApi({ ...storefrontDefaults })
    renderApp('/cart')
    expect(await within(screen.getByRole('main')).findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})

describe('wishlist', () => {
  it('toggles optimistically and rolls back on failure', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products': { items: [product], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } }, 'POST /wishlist': new MockError(500, 'Server unavailable') })
    renderApp('/shop')
    const heart = await screen.findByRole('button', { name: 'Save Amber Silk to wishlist' })
    await userEvent.click(heart)
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable')
    expect(screen.getByRole('button', { name: 'Save Amber Silk to wishlist' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('persists via the server and shows saved products', async () => {
    const api = mockApi({ ...storefrontDefaults, 'GET /products': { items: [product], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } }, 'POST /wishlist': { userId: 'u', productIds: [product] } })
    renderApp('/shop')
    await userEvent.click(await screen.findByRole('button', { name: 'Save Amber Silk to wishlist' }))
    expect(await screen.findByRole('button', { name: 'Remove Amber Silk from wishlist' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.callsTo('POST', '/wishlist')[0]!.body).toEqual({ productId: product._id })
  })

  it('asks guests to sign in', async () => {
    signIn(null)
    mockApi({ ...storefrontDefaults, 'GET /products': { items: [product], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } } })
    const { router } = renderApp('/shop')
    await userEvent.click(await screen.findByRole('button', { name: 'Save Amber Silk to wishlist' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

const checkoutRoutes = (extra = {}) => ({
  ...storefrontDefaults,
  'GET /cart': cartOf([line()]),
  'GET /account/addresses': [address],
  'POST /orders/quote': quote(),
  ...extra,
})

/** Installs a fake Razorpay Checkout that runs `behaviour` when opened. */
const fakeRazorpay = (behaviour: 'success' | 'dismiss' | 'fail') => {
  const opened = vi.fn()
  window.Razorpay = class {
    private failed?: (response: { error: { description: string } }) => void
    private options: { handler: (response: unknown) => void; modal: { ondismiss: () => void }; order_id: string; key: string }
    constructor(options: { handler: (response: unknown) => void; modal: { ondismiss: () => void }; order_id: string; key: string }) { this.options = options }
    on(_event: string, handler: (response: { error: { description: string } }) => void) { this.failed = handler }
    open() {
      opened(this.options)
      if (behaviour === 'success') this.options.handler({ razorpay_order_id: this.options.order_id, razorpay_payment_id: 'pay_1', razorpay_signature: 'f'.repeat(64) })
      if (behaviour === 'dismiss') this.options.modal.ondismiss()
      if (behaviour === 'fail') { this.failed?.({ error: { description: 'Card declined' } }); this.options.modal.ondismiss() }
    }
  } as unknown as typeof window.Razorpay
  return opened
}

describe('checkout', () => {
  it('shows server totals and only offers payment methods the server allows', async () => {
    mockApi(checkoutRoutes({ 'POST /orders/quote': quote({ shipping: 99, total: 1499, paymentMethods: { cod: { available: false, reason: 'Cash on delivery is available for orders up to ₹1000' }, razorpay: { available: true, reason: null } } }) }))
    renderApp('/checkout')
    expect(await screen.findByText('₹1,499')).toBeInTheDocument()
    expect(screen.getByText('₹99')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeDisabled()
    expect(screen.getByText(/available for orders up to/)).toBeInTheDocument()
  })

  it('applies a coupon through the server quote and shows coupon errors', async () => {
    const api = mockApi(checkoutRoutes({
      'POST /orders/quote': ({ body }: { body: { couponCode?: string } }) => (body.couponCode === 'GLOW10' ? quote({ discount: 140, couponCode: 'GLOW10', total: 1260 }) : body.couponCode ? quote({ couponError: 'This coupon has expired' }) : quote()),
    }))
    renderApp('/checkout')
    await userEvent.type(await screen.findByLabelText('Coupon code'), 'old')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('This coupon has expired')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Coupon code'))
    await userEvent.type(screen.getByLabelText('Coupon code'), 'glow10')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('₹1,260')).toBeInTheDocument()
    expect(api.callsTo('POST', '/orders/quote').at(-1)!.body).toEqual({ couponCode: 'GLOW10' })
  })

  it('places a COD order once, even when clicked twice, and shows the confirmation', async () => {
    let resolveCreate!: (value: Order) => void
    const api = mockApi(checkoutRoutes({ 'POST /orders': () => new Promise<Order>((done) => { resolveCreate = done }), 'GET /orders/order1': order() }))
    const { router } = renderApp('/checkout')
    await userEvent.click(await screen.findByRole('radio', { name: /cash on delivery/i }))
    const button = await screen.findByRole('button', { name: 'Place order' })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(api.callsTo('POST', '/orders')).toHaveLength(1)
    const body = api.callsTo('POST', '/orders')[0]!.body as Record<string, unknown>
    expect(body).toMatchObject({ addressId: 'addr1', paymentMethod: 'COD' })
    expect(typeof body.idempotencyKey).toBe('string')
    expect(body).not.toHaveProperty('total')
    resolveCreate(order())
    await waitFor(() => expect(router.state.location.pathname).toBe('/account/orders/order1'))
    expect(await screen.findByRole('heading', { name: /your order is confirmed/i })).toBeInTheDocument()
  })

  it('pays with Razorpay and shows success only after the server verifies the payment', async () => {
    const opened = fakeRazorpay('success')
    const pending = order({ paymentMethod: 'RAZORPAY', status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' })
    const paid = order({ paymentMethod: 'RAZORPAY', status: 'CONFIRMED', paymentStatus: 'PAID' })
    const api = mockApi(checkoutRoutes({
      'POST /orders': pending,
      'POST /orders/order1/payment/razorpay': { keyId: 'rzp_test_key', razorpayOrderId: 'order_rzp_1', amount: 140000, currency: 'INR', orderId: 'order1', orderNumber: pending.orderNumber },
      'POST /orders/order1/payment/razorpay/verify': paid,
      'GET /orders/order1': paid,
    }))
    const { router } = renderApp('/checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/account/orders/order1'))
    expect(opened).toHaveBeenCalledWith(expect.objectContaining({ key: 'rzp_test_key', order_id: 'order_rzp_1', amount: 140000 }))
    expect(api.callsTo('POST', '/orders/order1/payment/razorpay/verify')[0]!.body).toMatchObject({ razorpay_order_id: 'order_rzp_1', razorpay_payment_id: 'pay_1' })
    expect(await screen.findByText(/your payment has been received/i)).toBeInTheDocument()
  })

  it('does not show success when verification fails', async () => {
    fakeRazorpay('success')
    mockApi(checkoutRoutes({
      'POST /orders': order({ paymentMethod: 'RAZORPAY', status: 'PENDING_PAYMENT' }),
      'POST /orders/order1/payment/razorpay': { keyId: 'k', razorpayOrderId: 'o', amount: 1, currency: 'INR', orderId: 'order1', orderNumber: 'N' },
      'POST /orders/order1/payment/razorpay/verify': new MockError(400, 'Payment verification failed', 'INVALID_SIGNATURE'),
    }))
    const { router } = renderApp('/checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByRole('heading', { name: 'Payment not completed' })).toBeInTheDocument()
    expect(screen.getByText('Payment verification failed')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/checkout')
  })

  it('handles a declined payment and lets the customer retry the same order', async () => {
    fakeRazorpay('fail')
    const api = mockApi(checkoutRoutes({
      'POST /orders': order({ paymentMethod: 'RAZORPAY', status: 'PENDING_PAYMENT', reservationExpiresAt: '2026-10-07T10:30:00.000Z' }),
      'POST /orders/order1/payment/razorpay': { keyId: 'k', razorpayOrderId: 'o', amount: 1, currency: 'INR', orderId: 'order1', orderNumber: 'N' },
    }))
    renderApp('/checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByText('Payment failed: Card declined')).toBeInTheDocument()
    expect(screen.getByText(/reserved until/)).toBeInTheDocument()
    fakeRazorpay('dismiss')
    await userEvent.click(screen.getByRole('button', { name: 'Try payment again' }))
    expect(await screen.findByText('Payment was cancelled.')).toBeInTheDocument()
    expect(api.callsTo('POST', '/orders')).toHaveLength(1)
    expect(api.callsTo('POST', '/orders/order1/payment/razorpay')).toHaveLength(2)
  })

  it('shows server errors such as stock conflicts', async () => {
    mockApi(checkoutRoutes({ 'POST /orders': new MockError(409, 'Some items in your cart are unavailable. Please review your cart.', 'CART_ITEMS_UNAVAILABLE') }))
    renderApp('/checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Some items in your cart are unavailable')
  })

  it('requires an address: saves a new one before placing the order', async () => {
    const api = mockApi(checkoutRoutes({ 'GET /account/addresses': [], 'POST /account/addresses': [address] }))
    renderApp('/checkout')
    expect(await screen.findByRole('button', { name: 'Continue to payment' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Asha Rao')
    await userEvent.type(screen.getByLabelText(/^phone/i), '+91 98765 43210')
    await userEvent.type(screen.getByLabelText(/address line 1/i), '12 MG Road')
    await userEvent.type(screen.getByLabelText(/^city/i), 'Bengaluru')
    await userEvent.type(screen.getByLabelText(/^state/i), 'Karnataka')
    await userEvent.type(screen.getByLabelText(/pin code/i), '560001')
    await userEvent.click(screen.getByRole('button', { name: 'Save and use this address' }))
    await waitFor(() => expect(api.callsTo('POST', '/account/addresses')).toHaveLength(1))
    expect(await screen.findByRole('button', { name: 'Continue to payment' })).toBeEnabled()
  })
})

describe('order history', () => {
  it('lets a customer cancel an eligible order', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = mockApi({ ...storefrontDefaults, 'GET /orders/order1': order(), 'POST /orders/order1/cancel': order({ status: 'CANCELLED' }) })
    renderApp('/account/orders/order1')
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }))
    await waitFor(() => expect(api.callsTo('POST', '/orders/order1/cancel')).toHaveLength(1))
    expect(await screen.findByText('Cancelled', { selector: '.pill' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull()
  })

  it('does not offer cancellation once shipped', async () => {
    mockApi({ ...storefrontDefaults, 'GET /orders/order1': order({ status: 'SHIPPED' }) })
    renderApp('/account/orders/order1')
    expect(await screen.findByRole('heading', { name: /order CAN-/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull()
  })
})
