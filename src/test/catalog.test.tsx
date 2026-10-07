import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeProduct, makeUser, mockApi, MockError, renderApp, signIn, storefrontDefaults } from './utils'

const page = (items: ReturnType<typeof makeProduct>[], overrides = {}) => ({ items, pagination: { page: 1, limit: 12, total: items.length, totalPages: 1, ...overrides } })

beforeEach(() => signIn(null))

describe('shop listing', () => {
  it('drives the API query from the URL and route', async () => {
    const api = mockApi({ ...storefrontDefaults, 'GET /products': page([makeProduct({ name: 'Rose Oud' })]) })
    renderApp('/category/luxury-candles?sort=price_low_high&price=1000-1999&page=2&q=rose')
    expect(await screen.findByRole('link', { name: 'Rose Oud' })).toBeInTheDocument()
    const params = api.callsTo('GET', '/products')[0]!.url.searchParams
    expect(Object.fromEntries(params)).toMatchObject({ category: 'luxury-candles', sort: 'price_low_high', minPrice: '1000', maxPrice: '1999', page: '2', q: 'rose', limit: '12' })
  })

  it('updates the URL when sorting and resets the page', async () => {
    const api = mockApi({ ...storefrontDefaults, 'GET /products': page([makeProduct()], { page: 2, totalPages: 3, total: 30 }) })
    const { router } = renderApp('/shop?page=2')
    await userEvent.selectOptions(await screen.findByLabelText('Sort by'), 'newest')
    await waitFor(() => expect(router.state.location.search).toBe('?sort=newest'))
    await waitFor(() => expect(api.calls.at(-1)!.url.searchParams.get('sort')).toBe('newest'))
  })

  it('paginates using server pagination', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products': page([makeProduct()], { page: 1, totalPages: 3, total: 30 }) })
    const { router } = renderApp('/shop')
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
  })

  it('shows empty and error states', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products': page([]) })
    renderApp('/shop')
    expect(await screen.findByRole('heading', { name: 'No matching products' })).toBeInTheDocument()
  })

  it('shows an error state with retry when the API fails', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products': new MockError(500, 'Internal server error') })
    renderApp('/shop')
    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('marks sold-out products and asks to choose options for multi-variant products', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products': page([
      makeProduct({ name: 'Gone', stock: 0, status: 'OUT_OF_STOCK' }),
      makeProduct({ name: 'Sizes', variants: [{ _id: 'v1', label: 'S', sku: 's', price: 400, stock: 3 }, { _id: 'v2', label: 'L', sku: 'l', price: 900, stock: 3 }] }),
    ]) })
    renderApp('/shop')
    const gone = (await screen.findByRole('link', { name: 'Gone' })).closest('article')!
    expect(within(gone).getByRole('button', { name: 'Gone is sold out' })).toBeDisabled()
    const sizes = screen.getByRole('link', { name: 'Sizes' }).closest('article')!
    expect(within(sizes).getByRole('link', { name: 'Choose options for Sizes' })).toBeInTheDocument()
    expect(within(sizes).getByText(/From ₹400/)).toBeInTheDocument()
  })
})

describe('product detail', () => {
  const product = makeProduct({
    slug: 'lavender-dusk', name: 'Lavender Dusk', price: 800, mrp: 1600,
    variants: [
      { _id: 'v-small', label: '200g', sku: 'LAV-200', price: 800, stock: 4 },
      { _id: 'v-large', label: '400g', sku: 'LAV-400', price: 1400, stock: 0 },
      { _id: 'v-gift', label: 'Gift box', sku: 'LAV-GIFT', price: 1500, stock: 2 },
    ],
  })

  it('updates price, SKU and stock when a variant is chosen, and disables sold-out variants', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products/lavender-dusk': product, 'GET /products/lavender-dusk/related': [] })
    renderApp('/product/lavender-dusk')
    expect(await screen.findByRole('heading', { name: 'Lavender Dusk', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('SKU: LAV-200')).toBeInTheDocument()
    expect(screen.getByText('Only 4 left')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /400g/ }))
    expect(screen.getByText('SKU: LAV-400')).toBeInTheDocument()
    expect(screen.getByText('Out of stock', { selector: '.stock-out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: /Gift box/ }))
    expect(screen.getByText('₹1,500')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled() // capped at stock (2)
  })

  it('adds the selected variant to the cart for signed-in users', async () => {
    signIn(makeUser())
    const api = mockApi({
      ...storefrontDefaults,
      'GET /products/lavender-dusk': product,
      'GET /products/lavender-dusk/related': [makeProduct({ name: 'Rose Related' })],
      'POST /cart/items': { userId: 'u', items: [], subtotal: 1500, itemCount: 1, hasIssues: false },
    })
    renderApp('/product/lavender-dusk')
    await userEvent.click(await screen.findByRole('radio', { name: /Gift box/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(api.callsTo('POST', '/cart/items')[0]?.body).toEqual({ productId: product._id, variantId: 'v-gift', quantity: 1 }))
    expect(await screen.findByRole('link', { name: 'Rose Related' })).toBeInTheDocument()
  })

  it('sends guests to login instead of adding to cart', async () => {
    const api = mockApi({ ...storefrontDefaults, 'GET /products/lavender-dusk': product, 'GET /products/lavender-dusk/related': [] })
    const { router } = renderApp('/product/lavender-dusk')
    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toEqual({ from: '/product/lavender-dusk' })
    expect(api.callsTo('POST', '/cart/items')).toHaveLength(0)
  })

  it('shows not found for unknown products', async () => {
    mockApi({ ...storefrontDefaults, 'GET /products/missing': new MockError(404, 'Product not found') })
    renderApp('/product/missing')
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
  })
})
