import type { ReactNode } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { errorMessage } from '../../services/api'

export const Skeleton = ({ className = '', label }: { className?: string; label?: string }) => (
  <div className={`skeleton ${className}`} aria-hidden={label ? undefined : true} role={label ? 'status' : undefined} aria-label={label} />
)

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="product-grid" role="status" aria-label="Loading products">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="product-card skeleton-card" aria-hidden="true">
        <Skeleton className="skeleton-media" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line short" />
      </div>
    ))}
  </div>
)

export const ErrorState = ({ error, title = 'Something went wrong', onRetry }: { error: unknown; title?: string; onRetry?: () => void }) => (
  <div className="empty-state" role="alert">
    <h2>{title}</h2>
    <p>{errorMessage(error)}</p>
    {onRetry && <button type="button" className="secondary-button" onClick={onRetry}>Try again</button>}
  </div>
)

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="empty-state">
    <h2>{title}</h2>
    {children}
  </div>
)

/** Router-level error boundary: catches render errors and unknown loader failures. */
export const RouteError = () => {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <div className="container section-spacing">
      <div className="empty-state" role="alert">
        <h1>{notFound ? 'Page not found' : 'This page hit a snag'}</h1>
        <p>{notFound ? 'The page you are looking for does not exist.' : 'Please reload the page. If it keeps happening, try again later.'}</p>
        <div className="profile-actions">
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Reload</button>
          <Link to="/" className="primary-button">Back home</Link>
        </div>
      </div>
    </div>
  )
}
