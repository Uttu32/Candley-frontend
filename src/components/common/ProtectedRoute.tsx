import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import type { Role } from '../../types'
import { CandleLoader } from './CandleLoader'
import { PageMeta } from './PageMeta'

type ProtectedRouteProps = { allowedRoles?: Role[] }

export const AccessDenied = ({ message = 'Your account does not have access to this area.' }: { message?: string }) => (
  <div className="container section-spacing">
    <PageMeta title="Access denied" />
    <div className="empty-state" role="alert">
      <h1>Access denied</h1>
      <p>{message}</p>
      <Link to="/" className="primary-button">Back to the shop</Link>
    </div>
  </div>
)

/**
 * Client-side gate for navigation only: the API enforces every permission. Waits for the
 * startup session restore so a page reload does not bounce signed-in users to the login page.
 */
export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation()
  const user = useAppStore((state) => state.user)
  const status = useAppStore((state) => state.sessionStatus)

  if (status === 'unknown') return <CandleLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <AccessDenied />
  return <Outlet />
}
