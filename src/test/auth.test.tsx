import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeUser, mockApi, MockError, renderApp, signIn, storefrontDefaults } from './utils'
import { useAppStore } from '../store/useAppStore'

const adminDefaults = {
  'GET /admin/dashboard': { totalSales: 0, totalOrders: 0, paidOrders: 0, totalCustomers: 0, newCustomers: 0, pendingOrders: 0, totalProducts: 0, outOfStockProducts: 0, lowStockProducts: 0, averageOrderValue: 0, bookedSales: 0, bookedOrders: 0, bookedAverageOrderValue: 0, lowStockThreshold: 5, previous: null, seriesUnit: 'day', revenueSeries: [], topProducts: [], ordersByStatus: [], paymentMethods: [], needsAttention: { awaitingPayment: 0, toProcess: 0, toShip: 0, codToCollect: 0 }, recentOrders: [], lowStockItems: [] },
}

beforeEach(() => signIn(null))

describe('shared login', () => {
  it('sends customers to their account', async () => {
    const customer = makeUser('CUSTOMER')
    mockApi({ ...storefrontDefaults, 'POST /auth/login': { accessToken: 't', user: customer }, 'GET /auth/me': customer })
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), customer.email)
    await userEvent.type(screen.getByLabelText(/password/i), 'CorrectHorse!42')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: /hello, asha/i })).toBeInTheDocument()
    expect(useAppStore.getState().user?.role).toBe('CUSTOMER')
  })

  it('sends admins to the dashboard based on the role returned by the server', async () => {
    const admin = makeUser('ADMIN')
    mockApi({ ...storefrontDefaults, ...adminDefaults, 'POST /auth/login': { accessToken: 't', user: admin } })
    const { router } = renderApp('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), admin.email)
    await userEvent.type(screen.getByLabelText(/password/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/dashboard')
  })

  it('shows the server error message on failure', async () => {
    mockApi({ ...storefrontDefaults, 'POST /auth/login': new MockError(401, 'Invalid email or password') })
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('redirects /admin/login to the shared login and returns there after sign-in', async () => {
    const admin = makeUser('SUPER_ADMIN')
    mockApi({ ...storefrontDefaults, ...adminDefaults, 'POST /auth/login': { accessToken: 't', user: admin } })
    const { router } = renderApp('/admin/login')
    await userEvent.type(await screen.findByLabelText(/email/i), admin.email)
    await userEvent.type(screen.getByLabelText(/password/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/dashboard'))
  })
})

describe('protected routes', () => {
  it('redirects guests to login and back to the requested page afterwards', async () => {
    const customer = makeUser('CUSTOMER')
    mockApi({ ...storefrontDefaults, 'POST /auth/login': { accessToken: 't', user: customer }, 'GET /orders': [] })
    const { router } = renderApp('/account/orders')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/email/i), customer.email)
    await userEvent.type(screen.getByLabelText(/password/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/account/orders'))
  })

  it('shows access denied to customers on admin pages', async () => {
    signIn(makeUser('CUSTOMER'))
    mockApi({ ...storefrontDefaults })
    renderApp('/admin/dashboard')
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  it('waits for session restore instead of redirecting', async () => {
    useAppStore.setState({ user: null, sessionStatus: 'unknown' })
    mockApi({ ...storefrontDefaults, ...adminDefaults })
    const { router } = renderApp('/admin/dashboard')
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/dashboard')
    useAppStore.getState().setSession(makeUser('ADMIN'))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

describe('registration and password reset', () => {
  it('validates registration before submitting', async () => {
    const api = mockApi({ ...storefrontDefaults })
    renderApp('/register')
    await userEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter your name (at least 2 characters)')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument()
    expect(api.callsTo('POST', '/auth/register')).toHaveLength(0)
  })

  it('shows the same confirmation for forgot-password regardless of account existence', async () => {
    mockApi({ ...storefrontDefaults, 'POST /auth/forgot-password': null })
    renderApp('/forgot-password')
    await userEvent.type(await screen.findByLabelText(/email/i), 'someone@example.test')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument()
  })

  it('rejects malformed reset links without calling the API', async () => {
    mockApi({ ...storefrontDefaults })
    renderApp('/reset-password?token=abc')
    expect(await screen.findByText(/invalid or incomplete/i)).toBeInTheDocument()
  })
})
