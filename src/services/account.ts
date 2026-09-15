export type AccountProfile = {
  name: string
  email: string
  phone: string
  dateOfBirth: string
}

export type AccountPreferences = {
  orderUpdates: boolean
  promotions: boolean
  priceDrops: boolean
  backInStock: boolean
}

const profileKey = 'candley-aroma-profile'
const preferencesKey = 'candley-aroma-preferences'

export const defaultProfile: AccountProfile = {
  name: 'Candley guest',
  email: '',
  phone: '',
  dateOfBirth: '',
}

export const defaultPreferences: AccountPreferences = {
  orderUpdates: true,
  promotions: false,
  priceDrops: true,
  backInStock: true,
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? { ...fallback, ...JSON.parse(value) } : fallback
  } catch {
    return fallback
  }
}

export const getStoredProfile = () => read(profileKey, defaultProfile)
export const getStoredPreferences = () => read(preferencesKey, defaultPreferences)

export const saveProfile = (profile: AccountProfile) => {
  window.localStorage.setItem(profileKey, JSON.stringify(profile))
}

export const savePreferences = (preferences: AccountPreferences) => {
  window.localStorage.setItem(preferencesKey, JSON.stringify(preferences))
}

export const getApiBaseUrl = () => (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')

export const fetchRemoteProfile = async (accessToken: string): Promise<AccountProfile | null> => {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Unable to load your profile')
  const payload = await response.json() as { data: AccountProfile }
  return payload.data
}
