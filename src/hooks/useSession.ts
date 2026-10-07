import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, onSessionExpired, refreshSession, setAccessToken } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import { isAdminRole, type AuthUser } from '../types'

let restoring: Promise<void> | undefined

/** Restores the session from the refresh cookie once per page load. */
export const restoreSession = () => {
  restoring ??= (async () => {
    const session = await refreshSession()
    useAppStore.getState().setSession(session?.user ?? null)
  })()
  return restoring
}

onSessionExpired(() => {
  setAccessToken(null)
  useAppStore.getState().setSession(null)
})

/** Where a user lands after sign-in: the page they came from if allowed, otherwise their role's home. */
export const postLoginPath = (user: AuthUser, from?: string | null) => {
  const admin = isAdminRole(user.role)
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    if (from.startsWith('/admin')) return admin ? from : '/account'
    return from
  }
  return admin ? '/admin/dashboard' : '/account'
}

export const useSession = () => {
  const queryClient = useQueryClient()
  const user = useAppStore((state) => state.user)
  const status = useAppStore((state) => state.sessionStatus)
  const setSession = useAppStore((state) => state.setSession)

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login({ email, password })
    queryClient.clear()
    setSession(session.user)
    return session.user
  }, [queryClient, setSession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      queryClient.clear()
      setSession(null)
    }
  }, [queryClient, setSession])

  return { user, status, isAuthenticated: status === 'authenticated', isAdmin: isAdminRole(user?.role), login, logout, setSession }
}
