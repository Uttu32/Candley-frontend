import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, authApi, catalogApi, getAccessToken, onSessionExpired, setAccessToken } from './api'
import { MockError, mockApi } from '../test/utils'

beforeEach(() => setAccessToken(null))

describe('api client', () => {
  it('unwraps the success envelope and sends the bearer token', async () => {
    setAccessToken('abc')
    const api = mockApi({ 'GET /products/categories': [{ _id: '1', name: 'Soy', slug: 'soy' }] })
    await expect(catalogApi.categories()).resolves.toEqual([{ _id: '1', name: 'Soy', slug: 'soy' }])
    const [, init] = api.fetchMock.mock.calls[0]!
    expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer abc')
    expect(init!.credentials).toBe('include')
  })

  it('surfaces the backend message, status and code as ApiError', async () => {
    mockApi({ 'POST /auth/login': new MockError(401, 'Invalid email or password', 'INVALID_CREDENTIALS') })
    const error = await authApi.login({ email: 'a@b.co', password: 'x' }).catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'Invalid email or password', status: 401, code: 'INVALID_CREDENTIALS' })
  })

  it('refreshes once on 401 and retries the original request', async () => {
    setAccessToken('expired')
    let calls = 0
    const api = mockApi({
      'GET /auth/me': ({ headers }: { headers: Headers }) => {
        calls += 1
        return headers.get('Authorization') === 'Bearer fresh' ? { id: 'u1', name: 'Asha' } : new MockError(401, 'expired')
      },
      'POST /auth/refresh': { accessToken: 'fresh', user: { id: 'u1' } },
    })
    await expect(authApi.me()).resolves.toMatchObject({ id: 'u1' })
    expect(calls).toBe(2)
    expect(api.callsTo('POST', '/auth/refresh')).toHaveLength(1)
    expect(getAccessToken()).toBe('fresh')
  })

  it('shares one refresh between concurrent 401s', async () => {
    setAccessToken('expired')
    const api = mockApi({
      'GET /auth/me': ({ headers }: { headers: Headers }) => (headers.get('Authorization') === 'Bearer fresh' ? { id: 'u1' } : new MockError(401, 'expired')),
      'POST /auth/refresh': { accessToken: 'fresh', user: { id: 'u1' } },
    })
    await Promise.all([authApi.me(), authApi.me(), authApi.me()])
    expect(api.callsTo('POST', '/auth/refresh')).toHaveLength(1)
  })

  it('clears the session and notifies when refresh fails', async () => {
    setAccessToken('expired')
    const expired = vi.fn()
    onSessionExpired(expired)
    mockApi({ 'GET /auth/me': new MockError(401, 'expired'), 'POST /auth/refresh': new MockError(401, 'revoked') })
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 })
    expect(getAccessToken()).toBeNull()
    expect(expired).toHaveBeenCalled()
  })

  it('reports 403 as forbidden without trying to refresh', async () => {
    setAccessToken('ok')
    const api = mockApi({ 'GET /auth/me': new MockError(403, 'Insufficient permissions') })
    const error = await authApi.me().catch((caught) => caught)
    expect(error.isForbidden).toBe(true)
    expect(api.callsTo('POST', '/auth/refresh')).toHaveLength(0)
  })

  it('maps network failures to a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(catalogApi.categories()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('omits empty query parameters', async () => {
    const api = mockApi({ 'GET /products': { items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } } })
    await catalogApi.products({ q: '', category: 'soy', page: 2, maxPrice: undefined })
    expect(api.calls[0]!.url.search).toBe('?category=soy&page=2')
  })
})
