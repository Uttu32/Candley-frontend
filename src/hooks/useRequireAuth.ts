import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'

/**
 * Wraps an action that needs a signed-in customer. Guests are sent to login and brought back
 * to the current page afterwards; nothing is stored locally on their behalf.
 */
export const useRequireAuth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppStore((state) => state.sessionStatus)
  return useCallback((reason: string, action: () => void) => {
    if (status === 'authenticated') {
      action()
      return
    }
    triggerToast(reason)
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
  }, [location.pathname, location.search, navigate, status])
}
