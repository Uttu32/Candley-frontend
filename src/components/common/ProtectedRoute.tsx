import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

type ProtectedRouteProps = {
  allowedRoles?: Array<'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'STAFF'>
  redirectTo?: string
}

export const ProtectedRoute = ({
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const user = useAppStore((state) => state.user)

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  if (allowedRoles && user.role && !allowedRoles.includes(user.role as 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'STAFF')) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
