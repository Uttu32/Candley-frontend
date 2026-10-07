import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage, ordersApi } from '../../services/api'
import type { Order, OrderStatus } from '../../types'
import { formatDate, formatInr, humanize } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { triggerToast } from '../../components/common/ToastContainer'
import { useRazorpayPayment } from '../../hooks/useRazorpayPayment'
import { customerCanCancel } from '../../utils/rules'
import { CdnImage } from '../../components/common/CdnImage'

const statusTone: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'pill-warning', CONFIRMED: 'pill-info', PROCESSING: 'pill-info', SHIPPED: 'pill-info', DELIVERED: 'pill-success', CANCELLED: 'pill-danger',
}
export const StatusPill = ({ status }: { status: string }) => <span className={`pill ${statusTone[status as OrderStatus] ?? ''}`}>{humanize(status)}</span>

export const OrdersPage = () => {
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list })
  if (orders.isPending) return <Skeleton className="skeleton-block" label="Loading orders" />
  if (orders.isError) return <ErrorState error={orders.error} title="Orders could not be loaded" onRetry={() => void orders.refetch()} />
  return (
    <section className="account-section">
      <h2>Your orders</h2>
      {orders.data.length === 0 ? (
        <div className="empty-state"><p>You haven’t placed any orders yet.</p><Link to="/shop" className="primary-button">Start shopping</Link></div>
      ) : (
        <ul className="order-list">
          {orders.data.map((order) => (
            <li key={order._id} className="order-card">
              <div className="section-row">
                <div><strong>Order {order.orderNumber}</strong><small className="account-muted"> · {formatDate(order.createdAt)}</small></div>
                <StatusPill status={order.status} />
              </div>
              <p className="account-muted">{order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {formatInr(order.total)} · {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'} ({humanize(order.paymentStatus)})</p>
              <Link to={`/account/orders/${order._id}`} className="text-button">View details</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const OrderDetailPage = () => {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const orderQuery = useQuery({ queryKey: ['orders', id], queryFn: () => ordersApi.get(id), enabled: Boolean(id) })
  const payment = useRazorpayPayment()
  const payNow = async (order: Order) => {
    const result = await payment.pay(order)
    if (result.ok) {
      queryClient.setQueryData(['orders', id], result.order)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      triggerToast('Payment received. Your order is confirmed.')
    } else triggerToast(result.message, 'error')
  }
  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id, 'Cancelled by customer'),
    onSuccess: (order) => {
      queryClient.setQueryData(['orders', id], order)
      queryClient.invalidateQueries({ queryKey: ['orders'], exact: true })
      triggerToast(`Order ${order.orderNumber} cancelled`)
    },
    onError: (error) => triggerToast(errorMessage(error, 'The order could not be cancelled'), 'error'),
  })

  if (orderQuery.isPending) return <Skeleton className="skeleton-block" label="Loading order" />
  if (orderQuery.isError) {
    const missing = orderQuery.error instanceof ApiError && (orderQuery.error.isNotFound || orderQuery.error.status === 400)
    return missing ? <div className="empty-state"><h2>Order not found</h2><Link to="/account/orders">Back to orders</Link></div> : <ErrorState error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
  }
  const order = orderQuery.data
  const justPlaced = searchParams.get('placed') === '1'
  // Success is announced only when the server state confirms it.
  const confirmed = order.status !== 'CANCELLED' && (order.paymentMethod === 'COD' || order.paymentStatus === 'PAID')

  return (
    <section className="account-section">
      {justPlaced && confirmed && (
        <div className="success-banner" role="status">
          <h2>Thank you! Your order is confirmed.</h2>
          <p>Order {order.orderNumber}. {order.paymentMethod === 'COD' ? `Please keep ${formatInr(order.total)} ready on delivery.` : 'Your payment has been received.'}</p>
        </div>
      )}
      <div className="section-row">
        <h2>Order {order.orderNumber}</h2>
        <StatusPill status={order.status} />
      </div>
      <p className="account-muted">Placed {formatDate(order.createdAt, true)} · Payment: {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'} ({humanize(order.paymentStatus)})</p>
      {order.status === 'PENDING_PAYMENT' && (
        <div className="line-issue" role="status">
          <p>Awaiting payment{order.reservationExpiresAt ? `. Items reserved until ${formatDate(order.reservationExpiresAt, true)}` : ''}.</p>
          {order.paymentMethod === 'RAZORPAY' && (
            <button type="button" className="primary-button small" disabled={payment.busy} onClick={() => void payNow(order)}>
              {payment.stage === 'verifying' ? 'Confirming payment…' : payment.busy ? 'Waiting for payment…' : `Pay ${formatInr(order.total)} now`}
            </button>
          )}
        </div>
      )}

      <ul className="order-items">
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.variantId ?? ''}`} className="cart-row">
            {item.thumbnailImage || item.image ? <CdnImage src={(item.thumbnailImage || item.image)!} width={96} /> : <div className="image-placeholder" />}
            <div>
              {item.productSlug ? <Link to={`/product/${item.productSlug}`}><strong>{item.productName}</strong></Link> : <strong>{item.productName}</strong>}
              <p className="account-muted">{item.variantLabel ? `${item.variantLabel} · ` : ''}SKU {item.sku}</p>
              <p className="account-muted">{formatInr(item.unitPrice)} × {item.quantity}</p>
            </div>
            <strong>{formatInr(item.lineTotal)}</strong>
          </li>
        ))}
      </ul>

      <div className="order-summary-grid">
        <div>
          <h3>Delivery address</h3>
          <p>{order.shippingAddress.name}<br />{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? <><br />{order.shippingAddress.addressLine2}</> : null}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />{order.shippingAddress.phone}</p>
        </div>
        <dl className="totals">
          <div className="summary-row"><dt>Subtotal</dt><dd>{formatInr(order.subtotal)}</dd></div>
          {(order.discount ?? 0) > 0 && <div className="summary-row"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatInr(order.discount)}</dd></div>}
          <div className="summary-row"><dt>Shipping</dt><dd>{order.shipping === 0 ? 'Free' : formatInr(order.shipping)}</dd></div>
          {order.tax > 0 && <div className="summary-row"><dt>Tax</dt><dd>{formatInr(order.tax)}</dd></div>}
          <div className="summary-row total"><dt>Total</dt><dd>{formatInr(order.total)}</dd></div>
        </dl>
      </div>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <>
          <h3>Timeline</h3>
          <ol className="status-timeline">
            {order.statusHistory.map((entry, index) => (
              <li key={`${entry.status}-${index}`}><StatusPill status={entry.status} /> <span>{formatDate(entry.at, true)}</span>{entry.note && <small> · {entry.note}</small>}</li>
            ))}
          </ol>
        </>
      )}

      <div className="profile-actions">
        {customerCanCancel(order) && (
          <button type="button" className="secondary-button" disabled={cancel.isPending} onClick={() => { if (window.confirm(`Cancel order ${order.orderNumber}?`)) cancel.mutate() }}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
        <Link to="/account/orders" className="text-button">Back to orders</Link>
      </div>
    </section>
  )
}
