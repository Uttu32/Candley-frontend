import { useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, CircleCheck, CircleX, Clock, Copy, CreditCard, HandCoins, IndianRupee, Mail, MapPin,
  Package, PackageCheck, Phone, ShoppingBag, TriangleAlert, Truck, Wallet,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, errorMessage } from '../../services/api'
import type { Order, OrderStatus, PaymentStatus } from '../../types'
import { formatDate, formatInr, humanize } from '../../utils/format'
import { StatusPill } from '../account/OrderPages'
import { Pagination } from '../../components/common/Pagination'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { FormError } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { nextStatuses } from '../../utils/rules'
import { CdnImage } from '../../components/common/CdnImage'

const statuses: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

/** The happy path an order moves through; cancellation is shown separately. */
const progressSteps: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
const stepLabel: Record<OrderStatus, string> = { PENDING_PAYMENT: 'Placed', CONFIRMED: 'Confirmed', PROCESSING: 'Packing', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' }
const stepIcon = { PENDING_PAYMENT: Clock, CONFIRMED: CircleCheck, PROCESSING: Package, SHIPPED: Truck, DELIVERED: PackageCheck, CANCELLED: CircleX }
const statusColor: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'var(--gold)', CONFIRMED: 'var(--lavender)', PROCESSING: 'var(--rose)', SHIPPED: 'var(--lavender-dark)', DELIVERED: 'var(--success)', CANCELLED: 'var(--danger)',
}
const paymentTone: Record<PaymentStatus, string> = { PENDING: 'pill-warning', PAID: 'pill-success', FAILED: 'pill-danger', REFUNDED: 'pill-info' }

const customerOf = (order: Order) => (typeof order.userId === 'object' ? order.userId : null)

export const AdminOrdersPage = () => {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const query = { page: Number(params.get('page')) || 1, limit: 20, status: params.get('status') || undefined, paymentStatus: params.get('paymentStatus') || undefined, search: params.get('search') || undefined }
  const orders = useQuery({ queryKey: ['admin', 'orders', query], queryFn: () => adminApi.orders(query), placeholderData: keepPreviousData })
  const update = (changes: Record<string, string | undefined>) => setParams((current) => {
    const next = new URLSearchParams(current)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    return next
  })

  return (
    <section>
      <h1>Orders</h1>
      <div className="admin-toolbar">
        <form role="search" onSubmit={(event) => { event.preventDefault(); update({ search: search.trim() || undefined, page: undefined }) }}>
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input id="order-search" type="search" placeholder="Order number, name or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" className="secondary-button small">Search</button>
        </form>
        <label className="inline-field">Status
          <select value={query.status ?? ''} onChange={(event) => update({ status: event.target.value || undefined, page: undefined })}>
            <option value="">All</option>
            {statuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
        </label>
        <label className="inline-field">Payment
          <select value={query.paymentStatus ?? ''} onChange={(event) => update({ paymentStatus: event.target.value || undefined, page: undefined })}>
            <option value="">All</option>
            {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
        </label>
      </div>
      {orders.isPending ? <Skeleton className="skeleton-block" label="Loading orders" /> : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <div className="empty-state"><p>No orders match these filters.</p></div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Customer</th><th scope="col">Total</th><th scope="col">Payment</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {orders.data.items.map((order) => (
                  <tr key={order._id}>
                    <td><Link to={`/admin/orders/${order._id}`}>{order.orderNumber}</Link></td>
                    <td>{formatDate(order.createdAt, true)}</td>
                    <td>{customerOf(order)?.name ?? order.shippingAddress.name}<small className="block">{customerOf(order)?.email}</small></td>
                    <td>{formatInr(order.total)}</td>
                    <td>{order.paymentMethod} · {humanize(order.paymentStatus)}</td>
                    <td><StatusPill status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={orders.data.pagination} onPageChange={(page) => update({ page: page > 1 ? String(page) : undefined })} />
        </>
      )}
    </section>
  )
}

export const AdminOrderDetailPage = () => {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const orderQuery = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminApi.order(id) })
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const settle = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    setNextStatus('')
    setNote('')
    setError('')
    triggerToast(message)
  }
  const updateStatus = useMutation({
    mutationFn: () => adminApi.updateOrderStatus(id, nextStatus as OrderStatus, note.trim()),
    onSuccess: (order) => settle(`Order moved to ${humanize(order.status)}`),
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const collectCod = useMutation({ mutationFn: () => adminApi.markCodCollected(id), onSuccess: () => settle('COD payment recorded'), onError: (mutationError) => setError(errorMessage(mutationError)) })

  if (orderQuery.isPending) return <Skeleton className="skeleton-block" label="Loading order" />
  if (orderQuery.isError) return <ErrorState error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
  const order = orderQuery.data
  const options = nextStatuses(order.status)
  const customer = customerOf(order)
  const canCollect = order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING' && (order.status === 'SHIPPED' || order.status === 'DELIVERED')
  const refundNeeded = order.statusHistory?.some((entry) => entry.note?.includes('REFUND REQUIRED'))
  const addressText = [order.shippingAddress.name, order.shippingAddress.addressLine1, order.shippingAddress.addressLine2, `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`, order.shippingAddress.phone].filter(Boolean).join('\n')
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText)
      triggerToast('Address copied')
    } catch {
      triggerToast('Could not copy the address')
    }
  }

  const placedAt = order.createdAt
  const items = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const cancelled = order.status === 'CANCELLED'
  const reached = progressSteps.indexOf(order.status === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : order.status)
  const stepTime = (status: OrderStatus) => (status === 'PENDING_PAYMENT' ? placedAt : order.statusHistory?.findLast((entry) => entry.status === status)?.at)
  const history = [...(order.statusHistory ?? [])].reverse()
  const address = order.shippingAddress

  return (
    <section className="od">
      <Link to="/admin/orders" className="od-back"><ArrowLeft size={16} aria-hidden="true" /> All orders</Link>

      <header className="od-header">
        <div>
          <p className="od-eyebrow">Order</p>
          <h1>#{order.orderNumber}</h1>
          <p className="od-meta">
            <span><CalendarDays size={14} aria-hidden="true" /> Placed {formatDate(placedAt, true)}</span>
            <span><ShoppingBag size={14} aria-hidden="true" /> {items} item{items === 1 ? '' : 's'}</span>
            <span><IndianRupee size={14} aria-hidden="true" /> {formatInr(order.total)}</span>
          </p>
        </div>
        <div className="od-badges">
          <StatusPill status={order.status} />
          <span className={`pill ${paymentTone[order.paymentStatus]}`}>{order.paymentMethod === 'COD' ? 'COD' : 'Online'} · {humanize(order.paymentStatus)}</span>
        </div>
      </header>

      {refundNeeded && <p className="od-alert" role="alert"><TriangleAlert size={18} aria-hidden="true" /> This order was paid online and then cancelled. Issue a refund from the Razorpay dashboard.</p>}

      {cancelled ? (
        <div className="od-cancelled">
          <CircleX size={20} aria-hidden="true" />
          <div>
            <strong>Order cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ''}</strong>
            <span>{order.cancelledAt ? formatDate(order.cancelledAt, true) : ''}{order.cancellationReason ? ` · ${order.cancellationReason}` : ''}</span>
          </div>
        </div>
      ) : (
        <ol className="od-progress" aria-label="Order progress">
          {progressSteps.map((step, index) => {
            const state = index < reached ? 'is-done' : index === reached ? 'is-current' : ''
            const at = index <= reached ? stepTime(step) : undefined
            const Icon = stepIcon[step]
            return (
              <li key={step} className={state} aria-current={index === reached ? 'step' : undefined}>
                <span className="od-step-dot" aria-hidden="true">{index < reached ? <Check size={16} /> : <Icon size={16} />}</span>
                <span className="od-step-label">{stepLabel[step]}</span>
                <small>{at ? formatDate(at, true) : index > reached ? 'Pending' : ''}</small>
              </li>
            )
          })}
        </ol>
      )}

      <div className="od-grid">
        <div className="od-main">
          <section className="od-card">
            <h2>Items</h2>
            <ul className="od-items">
              {order.items.map((item) => {
                const image = item.thumbnailImage || item.image
                return (
                  <li key={`${item.productId}-${item.variantId ?? ''}`}>
                    {image ? <CdnImage src={image} width={56} className="od-item-img" /> : <span className="od-item-img od-item-img-empty" aria-hidden="true">{item.productName.charAt(0).toUpperCase()}</span>}
                    <span className="od-item-main">
                      <strong>{item.productName}</strong>
                      <small>{item.variantLabel ? `${item.variantLabel} · ` : ''}SKU {item.sku}</small>
                    </span>
                    <span className="od-item-qty">{item.quantity} × {formatInr(item.unitPrice)}</span>
                    <strong className="od-item-total">{formatInr(item.lineTotal)}</strong>
                  </li>
                )
              })}
            </ul>
            <dl className="od-totals">
              <div><dt>Subtotal</dt><dd>{formatInr(order.subtotal)}</dd></div>
              {(order.discount ?? 0) > 0 && <div className="is-discount"><dt>Discount{order.couponCode ? <span className="od-coupon">{order.couponCode}</span> : null}</dt><dd>−{formatInr(order.discount)}</dd></div>}
              <div><dt>Shipping</dt><dd>{order.shipping ? formatInr(order.shipping) : 'Free'}</dd></div>
              {order.tax > 0 && <div><dt>Tax</dt><dd>{formatInr(order.tax)}</dd></div>}
              <div className="is-total"><dt>Total</dt><dd>{formatInr(order.total)}</dd></div>
            </dl>
          </section>

          <section className="od-card">
            <h2>Update order</h2>
            {options.length === 0 ? <p className="od-muted">No further status changes are possible for this order.</p> : (
              <form className="od-form" onSubmit={(event) => { event.preventDefault(); if (nextStatus === 'CANCELLED' && !window.confirm('Cancel this order and return its stock?')) return; updateStatus.mutate() }}>
                <label className="od-field">
                  <span>New status</span>
                  <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as OrderStatus)} required>
                    <option value="">Choose…</option>
                    {options.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                  </select>
                </label>
                <label className="od-field od-field-grow">
                  <span>Note <small>(optional, visible in history)</small></span>
                  <input value={note} maxLength={300} placeholder="e.g. Shipped via Delhivery, AWB 1234" onChange={(event) => setNote(event.target.value)} />
                </label>
                <button type="submit" className="primary-button" disabled={!nextStatus || updateStatus.isPending}>{updateStatus.isPending ? 'Saving…' : 'Update'}</button>
              </form>
            )}
            {canCollect && (
              <div className="od-collect">
                <span><HandCoins size={18} aria-hidden="true" /> Cash of {formatInr(order.total)} is still to be collected.</span>
                <button type="button" className="secondary-button" disabled={collectCod.isPending} onClick={() => collectCod.mutate()}>Mark cash collected</button>
              </div>
            )}
            <FormError message={error} />
          </section>

          <section className="od-card">
            <h2>History</h2>
            {history.length === 0 ? <p className="od-muted">No status changes yet.</p> : (
              <ol className="od-timeline">
                {history.map((entry, index) => (
                  <li key={`${entry.status}-${entry.at}-${index}`}>
                    <span className="od-timeline-dot" style={{ background: statusColor[entry.status] }} aria-hidden="true" />
                    <div>
                      <p><strong>{humanize(entry.status)}</strong>{typeof entry.changedBy === 'object' && entry.changedBy ? <> by {entry.changedBy.name}</> : null}</p>
                      {entry.note && <p className="od-timeline-note">{entry.note}</p>}
                      <time dateTime={entry.at}>{formatDate(entry.at, true)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="od-side">
          <section className="od-card">
            <h2>Customer</h2>
            <div className="od-person">
              <span className="od-avatar" aria-hidden="true">{(customer?.name ?? address.name).charAt(0).toUpperCase()}</span>
              <div>
                <strong>{customer?.name ?? address.name}</strong>
                {customer && <Link to={`/admin/customers?search=${encodeURIComponent(customer.email)}`} className="od-link">View customer</Link>}
              </div>
            </div>
            <ul className="od-contact">
              {customer?.email && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${customer.email}`}>{customer.email}</a></li>}
              {customer?.phone && <li><Phone size={16} aria-hidden="true" /><a href={`tel:${customer.phone}`}>{customer.phone}</a></li>}
            </ul>
          </section>

          <section className="od-card">
            <div className="od-card-head">
              <h2>Ship to</h2>
              <button type="button" className="od-icon-button" onClick={() => void copyAddress()} aria-label="Copy shipping address"><Copy size={16} aria-hidden="true" /></button>
            </div>
            <address className="od-address">
              <strong>{address.name}</strong>
              <span>{address.addressLine1}</span>
              {address.addressLine2 && <span>{address.addressLine2}</span>}
              <span>{address.city}, {address.state} {address.postalCode}</span>
              {address.country && <span>{address.country}</span>}
            </address>
            <ul className="od-contact">
              <li><Phone size={16} aria-hidden="true" /><a href={`tel:${address.phone}`}>{address.phone}</a></li>
              <li><MapPin size={16} aria-hidden="true" /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`} target="_blank" rel="noreferrer">Open in Maps</a></li>
            </ul>
          </section>

          <section className="od-card">
            <h2>Payment</h2>
            <dl className="od-facts">
              <div><dt>Method</dt><dd>{order.paymentMethod === 'COD' ? <><Wallet size={15} aria-hidden="true" /> Cash on delivery</> : <><CreditCard size={15} aria-hidden="true" /> Online (Razorpay)</>}</dd></div>
              <div><dt>Status</dt><dd><span className={`pill ${paymentTone[order.paymentStatus]}`}>{humanize(order.paymentStatus)}</span></dd></div>
              <div><dt>Amount</dt><dd><strong>{formatInr(order.total)}</strong></dd></div>
              {order.payment?.paidAt && <div><dt>Paid on</dt><dd>{formatDate(order.payment.paidAt, true)}</dd></div>}
              {order.payment?.razorpayPaymentId && <div><dt>Payment ID</dt><dd className="od-mono">{order.payment.razorpayPaymentId}</dd></div>}
              {order.payment?.failureReason && <div><dt>Last failure</dt><dd className="od-danger">{order.payment.failureReason}</dd></div>}
            </dl>
          </section>
        </aside>
      </div>
    </section>
  )
}
