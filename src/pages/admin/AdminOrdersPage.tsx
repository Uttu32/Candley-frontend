import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, errorMessage } from '../../services/api'
import type { Order, OrderStatus } from '../../types'
import { formatDate, formatInr, humanize } from '../../utils/format'
import { StatusPill } from '../account/OrderPages'
import { Pagination } from '../../components/common/Pagination'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { FormError } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { nextStatuses } from '../../utils/rules'

const statuses: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

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

  return (
    <section>
      <Link to="/admin/orders" className="text-button">← All orders</Link>
      <div className="section-row"><h1>Order {order.orderNumber}</h1><StatusPill status={order.status} /></div>
      {refundNeeded && <p className="form-error" role="alert">This order was paid online and then cancelled. Issue a refund from the Razorpay dashboard.</p>}
      <div className="admin-grid-2">
        <div className="admin-panel">
          <h2>Items</h2>
          <table className="data-table">
            <thead><tr><th scope="col">Item</th><th scope="col">SKU</th><th scope="col">Qty</th><th scope="col">Total</th></tr></thead>
            <tbody>{order.items.map((item) => <tr key={`${item.productId}-${item.variantId ?? ''}`}><td>{item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ''}</td><td>{item.sku}</td><td>{item.quantity} × {formatInr(item.unitPrice)}</td><td>{formatInr(item.lineTotal)}</td></tr>)}</tbody>
          </table>
          <dl className="totals">
            <div className="summary-row"><dt>Subtotal</dt><dd>{formatInr(order.subtotal)}</dd></div>
            {(order.discount ?? 0) > 0 && <div className="summary-row"><dt>Discount {order.couponCode}</dt><dd>−{formatInr(order.discount)}</dd></div>}
            <div className="summary-row"><dt>Shipping</dt><dd>{formatInr(order.shipping)}</dd></div>
            <div className="summary-row total"><dt>Total</dt><dd>{formatInr(order.total)}</dd></div>
          </dl>
        </div>
        <div className="admin-panel">
          <h2>Customer</h2>
          <p>{customer?.name}<br />{customer?.email}<br />{customer?.phone}</p>
          <h2>Ship to</h2>
          <p>{order.shippingAddress.name}<br />{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? <><br />{order.shippingAddress.addressLine2}</> : null}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />{order.shippingAddress.phone}</p>
          <h2>Payment</h2>
          <p>{order.paymentMethod} · {humanize(order.paymentStatus)}{order.payment?.razorpayPaymentId ? <><br /><small>Razorpay {order.payment.razorpayPaymentId}</small></> : null}{order.payment?.failureReason ? <><br /><small>Last failure: {order.payment.failureReason}</small></> : null}</p>
        </div>
      </div>

      <div className="admin-panel">
        <h2>Update order</h2>
        {options.length === 0 ? <p className="account-muted">No further status changes are possible.</p> : (
          <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (nextStatus === 'CANCELLED' && !window.confirm('Cancel this order and return its stock?')) return; updateStatus.mutate() }}>
            <label className="inline-field">New status
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as OrderStatus)} required>
                <option value="">Choose…</option>
                {options.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
              </select>
            </label>
            <label className="inline-field grow">Note (optional)<input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} /></label>
            <button type="submit" className="primary-button small" disabled={!nextStatus || updateStatus.isPending}>{updateStatus.isPending ? 'Saving…' : 'Update'}</button>
          </form>
        )}
        {canCollect && <button type="button" className="secondary-button small" disabled={collectCod.isPending} onClick={() => collectCod.mutate()}>Mark cash collected</button>}
        <FormError message={error} />
        <h3>History</h3>
        <ol className="status-timeline">
          {(order.statusHistory ?? []).map((entry, index) => (
            <li key={index}><StatusPill status={entry.status} /> {formatDate(entry.at, true)}{entry.note ? ` · ${entry.note}` : ''}{typeof entry.changedBy === 'object' && entry.changedBy ? ` · by ${entry.changedBy.name}` : ''}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
