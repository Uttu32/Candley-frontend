import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeProduct, makeSlide, makeUser, mockApi, MockError, renderApp, signIn, storefrontDefaults } from './utils'
import type { HeroSlide } from '../types'

beforeEach(() => signIn(makeUser('ADMIN')))

describe('admin hero manager', () => {
  it('lists slides in order with live status', async () => {
    mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [makeSlide({ heading: 'Second', sortOrder: 2 }), makeSlide({ heading: 'First', sortOrder: 1 }), makeSlide({ heading: 'Draft', sortOrder: 3, desktopImage: '' })] })
    renderApp('/admin/cms/hero')
    const list = await screen.findByRole('list', { name: 'Slides in display order' })
    const items = within(list).getAllByRole('heading', { level: 2 })
    expect(items.map((heading) => heading.textContent)).toEqual(['First', 'Second', 'Draft'])
    expect(within(list).getAllByText('Live')).toHaveLength(2)
    expect(within(list).getByText('Needs media')).toBeInTheDocument()
  })

  it('validates and creates a slide', async () => {
    const created = makeSlide({ heading: 'Winter Glow', desktopImage: '' })
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [], 'POST /admin/cms/hero': created })
    renderApp('/admin/cms/hero')
    await userEvent.click(await screen.findByRole('button', { name: 'Add slide' }))
    const form = screen.getByRole('form', { name: 'New slide' })
    await userEvent.clear(within(form).getByLabelText('Button link'))
    await userEvent.type(within(form).getByLabelText('Button link'), 'javascript:alert(1)')
    await userEvent.click(within(form).getByRole('button', { name: 'Create slide' }))
    expect(within(form).getByText('Heading must be at least 2 characters')).toBeInTheDocument()
    expect(within(form).getByText(/use a site path/i)).toBeInTheDocument()
    expect(api.callsTo('POST', '/admin/cms/hero')).toHaveLength(0)

    await userEvent.type(within(form).getByLabelText(/^heading/i), 'Winter Glow')
    await userEvent.clear(within(form).getByLabelText('Button link'))
    await userEvent.type(within(form).getByLabelText('Button link'), '/collection/winter')
    fireEvent.change(within(form).getByLabelText('Show from'), { target: { value: '2026-12-01T09:00' } })
    fireEvent.change(within(form).getByLabelText('Show until'), { target: { value: '2026-12-31T23:00' } })
    await userEvent.selectOptions(within(form).getByLabelText('Content position'), 'bottom-center')
    await userEvent.click(within(form).getByRole('button', { name: 'Create slide' }))
    await waitFor(() => expect(api.callsTo('POST', '/admin/cms/hero')).toHaveLength(1))
    const body = api.callsTo('POST', '/admin/cms/hero')[0]!.body as Record<string, unknown>
    expect(body).toMatchObject({ heading: 'Winter Glow', ctaUrl: '/collection/winter', overlayPosition: 'bottom-center', secondaryCta: null })
    expect(new Date(body.startsAt as string).toISOString()).toBe(new Date('2026-12-01T09:00').toISOString())
  })

  it('shows backend validation errors', async () => {
    mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [], 'POST /admin/cms/hero': new MockError(400, 'mobileVideo requires a desktop video', 'INVALID_SLIDE') })
    renderApp('/admin/cms/hero')
    await userEvent.click(await screen.findByRole('button', { name: 'Add slide' }))
    const form = screen.getByRole('form', { name: 'New slide' })
    await userEvent.type(within(form).getByLabelText(/^heading/i), 'Valid heading')
    await userEvent.click(within(form).getByRole('button', { name: 'Create slide' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('mobileVideo requires a desktop video')
  })

  it('reorders with the keyboard-accessible move buttons', async () => {
    const a = makeSlide({ heading: 'A', sortOrder: 1 })
    const b = makeSlide({ heading: 'B', sortOrder: 2 })
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [a, b], 'PUT /admin/cms/hero/order': ({ body }: { body: { ids: string[] } }) => body.ids.map((id, index) => ({ ...(id === a._id ? a : b), sortOrder: index + 1 })) })
    renderApp('/admin/cms/hero')
    await userEvent.click(await screen.findByRole('button', { name: 'Move B up' }))
    await waitFor(() => expect(api.callsTo('PUT', '/admin/cms/hero/order')[0]?.body).toEqual({ ids: [b._id, a._id] }))
    const list = screen.getByRole('list', { name: 'Slides in display order' })
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['B', 'A']))
  })

  it('reorders by drag and drop and rolls back on failure', async () => {
    const a = makeSlide({ heading: 'A', sortOrder: 1 })
    const b = makeSlide({ heading: 'B', sortOrder: 2 })
    mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [a, b], 'PUT /admin/cms/hero/order': new MockError(409, 'ids must include every hero slide exactly once') })
    renderApp('/admin/cms/hero')
    const list = await screen.findByRole('list', { name: 'Slides in display order' })
    const [first, second] = within(list).getAllByRole('listitem')
    fireEvent.dragStart(second!)
    fireEvent.dragOver(first!)
    fireEvent.drop(first!)
    expect(await screen.findByText('ids must include every hero slide exactly once')).toBeInTheDocument()
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['A', 'B']))
  })

  it('activates and deactivates slides', async () => {
    const slide = makeSlide({ heading: 'Toggle me' })
    let current: HeroSlide = slide
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': () => [current], [`POST /admin/cms/hero/${slide._id}/deactivate`]: () => { current = { ...slide, active: false }; return current } })
    renderApp('/admin/cms/hero')
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(api.callsTo('POST', `/admin/cms/hero/${slide._id}/deactivate`)).toHaveLength(1))
    expect(await screen.findByText('Inactive')).toBeInTheDocument()
  })

  it('validates media before upload and uploads images to the right target', async () => {
    const slide = makeSlide({ heading: 'Media' })
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [slide], [`POST /admin/cms/hero/${slide._id}/image`]: { ...slide, mobileImage: '/m.jpg' }, [`POST /admin/cms/hero/${slide._id}/video`]: slide })
    renderApp('/admin/cms/hero')
    const mobileInput = await screen.findByLabelText('Mobile image (optional)')
    await userEvent.upload(mobileInput, new File(['x'], 'notes.txt', { type: 'text/plain' }), { applyAccept: false })
    expect(await screen.findByText('Use a JPEG, PNG, WebP or AVIF image')).toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText('Mobile video (optional)'), new File(['x'], 'm.mp4', { type: 'video/mp4' }))
    expect(await screen.findByText('Upload a desktop video before a mobile video')).toBeInTheDocument()
    await userEvent.upload(mobileInput, new File(['x'], 'mobile.png', { type: 'image/png' }))
    await waitFor(() => expect(api.callsTo('POST', `/admin/cms/hero/${slide._id}/image`)).toHaveLength(1))
    const form = api.callsTo('POST', `/admin/cms/hero/${slide._id}/image`)[0]!.body as FormData
    expect(form.get('target')).toBe('mobileImage')
    expect((form.get('image') as File).name).toBe('mobile.png')
    expect(api.callsTo('POST', `/admin/cms/hero/${slide._id}/video`)).toHaveLength(0)
  })

  it('confirms before deleting', async () => {
    const slide = makeSlide({ heading: 'Remove me' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/cms/hero': [slide], [`DELETE /admin/cms/hero/${slide._id}`]: null })
    renderApp('/admin/cms/hero')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(confirm).toHaveBeenCalled()
    expect(api.callsTo('DELETE', `/admin/cms/hero/${slide._id}`)).toHaveLength(0)
  })
})

describe('admin orders and products', () => {
  it('offers only allowed status transitions and sends the update', async () => {
    const order = { _id: 'o1', orderNumber: 'CAN-1', userId: { _id: 'u', name: 'Asha', email: 'a@x.test' }, items: [], shippingAddress: { name: 'Asha', phone: '1', addressLine1: 'a', city: 'c', state: 's', postalCode: '1', country: 'IN' }, subtotal: 1, shipping: 0, tax: 0, total: 1, paymentMethod: 'COD', paymentStatus: 'PENDING', status: 'CONFIRMED', createdAt: '2026-10-07T10:00:00Z', statusHistory: [] }
    const api = mockApi({ ...storefrontDefaults, 'GET /admin/orders/o1': order, 'PATCH /admin/orders/o1/status': { ...order, status: 'PROCESSING' } })
    renderApp('/admin/orders/o1')
    const select = await screen.findByLabelText('New status')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose…', 'Processing', 'Cancelled'])
    expect(screen.queryByRole('button', { name: 'Mark cash collected' })).toBeNull()
    await userEvent.selectOptions(select, 'PROCESSING')
    await userEvent.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(api.callsTo('PATCH', '/admin/orders/o1/status')[0]?.body).toEqual({ status: 'PROCESSING' }))
  })

  it('validates the product form and preserves variant ids on save', async () => {
    const existing = makeProduct({ _id: 'prod1'.padEnd(24, '0'), name: 'Lavender', slug: 'lavender', sku: 'LAV', variants: [{ _id: 'var-small', label: '200g', sku: 'LAV-200', price: 500, stock: 3, active: true }] })
    const api = mockApi({ ...storefrontDefaults, [`GET /admin/products/${existing._id}`]: existing, 'GET /admin/categories': [], [`PATCH /admin/products/${existing._id}`]: existing, 'GET /admin/products': { items: [existing], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } })
    renderApp(`/admin/products/${existing._id}/edit`)
    const mrp = await screen.findByLabelText(/MRP/)
    await userEvent.clear(mrp)
    await userEvent.type(mrp, '1')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('MRP must be at least the selling price')).toBeInTheDocument()
    expect(api.callsTo('PATCH', `/admin/products/${existing._id}`)).toHaveLength(0)
    await userEvent.clear(mrp)
    await userEvent.type(mrp, '900')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.callsTo('PATCH', `/admin/products/${existing._id}`)).toHaveLength(1))
    const payload = JSON.parse((api.callsTo('PATCH', `/admin/products/${existing._id}`)[0]!.body as FormData).get('product') as string)
    expect(payload.variants[0]).toMatchObject({ _id: 'var-small', sku: 'LAV-200' })
  })
})
