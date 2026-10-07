import { Link } from 'react-router-dom'
import { useCart, useCartUpdating } from '../hooks/useCart'
import { useAppStore } from '../store/useAppStore'
import { CartLines } from '../components/cart/CartLines'
import { ErrorState, Skeleton } from '../components/common/Feedback'
import { PageMeta } from '../components/common/PageMeta'
import { formatInr } from '../utils/format'

export const CartPage = () => {
  const status = useAppStore((state) => state.sessionStatus)
  const cartQuery = useCart()
  const isUpdating = useCartUpdating()

  if (status === 'anonymous') {
    return (
      <div className="container section-spacing">
        <PageMeta title="Your cart" noIndex />
        <div className="empty-state">
          <h1>Your cart</h1>
          <p>Sign in to see your saved cart on any device.</p>
          <Link to="/login" state={{ from: '/cart' }} className="primary-button">Sign in</Link>
          <Link to="/register" className="text-button">Create an account</Link>
        </div>
      </div>
    )
  }

  const cart = cartQuery.data
  return (
    <div className="container section-spacing cart-page">
      <PageMeta title="Your cart" noIndex />
      <div className="cart-layout">
        <div className="cart-items">
          <h1>Your cart</h1>
          {cartQuery.isPending || status === 'unknown' ? (
            <Skeleton className="skeleton-block" label="Loading your cart" />
          ) : cartQuery.isError ? (
            <ErrorState error={cartQuery.error} title="Your cart could not be loaded" onRetry={() => void cartQuery.refetch()} />
          ) : cart!.items.length === 0 ? (
            <div className="empty-state">
              <h2>Your candle shelf is waiting.</h2>
              <Link to="/shop" className="primary-button">Explore candles</Link>
            </div>
          ) : (
            <>
              {cart!.hasIssues && (
                <p className="form-error" role="alert">Some items have changed or are unavailable. Update or remove them before checkout.</p>
              )}
              <CartLines cart={cart!} />
            </>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <aside className="summary-panel" aria-label="Order summary">
            <h2>Order summary</h2>
            <div className="summary-row"><span>Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})</span><strong aria-live="polite">{isUpdating ? 'Updating…' : formatInr(cart.subtotal)}</strong></div>
            <p className="account-muted">Shipping and any discounts are calculated at checkout.</p>
            {cart.hasIssues ? (
              <button type="button" className="primary-button full-width" disabled>Resolve cart issues to continue</button>
            ) : (
              <Link to="/checkout" className="primary-button full-width" aria-disabled={isUpdating}>Proceed to checkout</Link>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
