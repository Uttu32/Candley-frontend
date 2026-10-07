import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, CircleCheck, Clock, CreditCard, HandCoins, IndianRupee, Package, PackageX, ReceiptText, RefreshCw,
  ShoppingBag, TrendingDown, TrendingUp, Truck, TriangleAlert, UserPlus, Wallet,
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { formatDate, formatInr, humanize } from '../../utils/format'
import { useSession } from '../../hooks/useSession'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { StatusPill } from '../account/OrderPages'
import type { AdminDashboard, OrderStatus } from '../../types'
import { CdnImage } from '../../components/common/CdnImage'

const ranges = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
]

const statusColor: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'var(--gold)',
  CONFIRMED: 'var(--lavender)',
  PROCESSING: 'var(--rose)',
  SHIPPED: 'var(--lavender-dark)',
  DELIVERED: 'var(--success)',
  CANCELLED: 'var(--danger)',
}
const statusOrder: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const compactInr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 })
const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const timeAgo = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`
  if (minutes < 7 * 24 * 60) return `${Math.round(minutes / (24 * 60))}d ago`
  return formatDate(value)
}

/** Rounds a chart maximum up to a readable axis value (1, 2, 2.5 or 5 × 10ⁿ). */
const niceMax = (value: number) => {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10
  return step * magnitude
}

const seriesLabel = (label: string, unit: AdminDashboard['seriesUnit']) => {
  const date = new Date(unit === 'day' ? `${label}T00:00:00` : `${label}-01T00:00:00`)
  return unit === 'day'
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

const Delta = ({ current, previous, period }: { current: number; previous: number | undefined; period: string }) => {
  if (previous === undefined) return null
  if (previous === 0 && current === 0) return <span className="dash-delta is-flat">No change vs previous {period}</span>
  if (previous === 0) return <span className="dash-delta is-up"><TrendingUp size={14} aria-hidden="true" /> New vs previous {period}</span>
  const change = ((current - previous) / previous) * 100
  const tone = Math.abs(change) < 0.5 ? 'is-flat' : change > 0 ? 'is-up' : 'is-down'
  const Icon = change >= 0 ? TrendingUp : TrendingDown
  return (
    <span className={`dash-delta ${tone}`}>
      <Icon size={14} aria-hidden="true" /> {change > 0 ? '+' : ''}{change.toFixed(Math.abs(change) < 10 ? 1 : 0)}% vs previous {period}
    </span>
  )
}

const KpiCard = ({ icon, label, value, detail, delta, tone }: { icon: ReactNode; label: string; value: ReactNode; detail: ReactNode; delta: ReactNode; tone: string }) => (
  <article className={`dash-kpi tone-${tone}`}>
    <div className="dash-kpi-head"><span className="dash-kpi-icon" aria-hidden="true">{icon}</span><h2>{label}</h2></div>
    <strong className="dash-kpi-value">{value}</strong>
    <p className="dash-kpi-detail">{detail}</p>
    {delta}
  </article>
)

const Panel = ({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`dash-panel ${className}`}>
    <header className="dash-panel-head"><h2>{title}</h2>{action}</header>
    {children}
  </section>
)

const RevenueChart = ({ data }: { data: AdminDashboard }) => {
  const [active, setActive] = useState<number | null>(null)
  const points = data.revenueSeries
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0)
  if (totalOrders === 0) return <p className="dash-empty">No orders in this period yet. Revenue will appear here as soon as one comes in.</p>
  const max = niceMax(Math.max(...points.map((point) => point.booked)))
  // Label at most ~8 bars on wide screens and ~4 on phones so dates never collide.
  const step = Math.max(1, Math.ceil(points.length / 8))
  const narrowStep = step * 2
  const shown = active === null ? null : points[active]
  return (
    <div className="dash-chart">
      <div className="dash-chart-meta">
        <ul className="dash-legend">
          <li><span style={{ background: 'var(--lavender-dark)' }} />Paid</li>
          <li><span style={{ background: 'var(--rose)' }} />Awaiting payment</li>
        </ul>
        <p className="dash-chart-readout" aria-live="polite">
          {shown
            ? <><strong>{seriesLabel(shown.label, data.seriesUnit)}</strong> · {formatInr(shown.booked)} from {shown.orders} order{shown.orders === 1 ? '' : 's'} · {formatInr(shown.value)} paid</>
            : <>Hover a bar for details</>}
        </p>
      </div>
      <div className="dash-chart-body">
        <div className="dash-chart-axis" aria-hidden="true">
          {[max, max / 2, 0].map((tick) => <span key={tick}>{compactInr.format(tick)}</span>)}
        </div>
        <div className="dash-chart-plot" role="list" aria-label={`Order value per ${data.seriesUnit}`} onMouseLeave={() => setActive(null)}>
          {points.map((point, index) => (
            <div
              key={point.label}
              role="listitem"
              tabIndex={0}
              className={`dash-bar ${active === index ? 'is-active' : ''}`}
              aria-label={`${seriesLabel(point.label, data.seriesUnit)}: ${formatInr(point.booked)} ordered, ${formatInr(point.value)} paid, ${point.orders} orders`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <div className="dash-bar-track">
                <div className="dash-bar-fill" style={{ height: `${(point.booked / max) * 100}%` }}>
                  <div className="dash-bar-paid" style={{ height: point.booked ? `${(point.value / point.booked) * 100}%` : 0 }} />
                </div>
              </div>
              <span className={`dash-bar-label ${index % narrowStep === 0 ? '' : 'is-minor'}`} aria-hidden="true">{index % step === 0 ? seriesLabel(point.label, data.seriesUnit) : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AttentionList = ({ data }: { data: AdminDashboard }) => {
  const items = [
    { label: 'Ready to pack', hint: 'Confirmed, not yet processing', count: data.needsAttention.toProcess, to: '/admin/orders?status=CONFIRMED', icon: <Package size={18} /> },
    { label: 'Ready to ship', hint: 'Packed and waiting for dispatch', count: data.needsAttention.toShip, to: '/admin/orders?status=PROCESSING', icon: <Truck size={18} /> },
    { label: 'COD to collect', hint: 'Delivered, cash not marked collected', count: data.needsAttention.codToCollect, to: '/admin/orders?status=DELIVERED&paymentStatus=PENDING', icon: <HandCoins size={18} /> },
    { label: 'Awaiting online payment', hint: 'Checkout started, not paid', count: data.needsAttention.awaitingPayment, to: '/admin/orders?status=PENDING_PAYMENT', icon: <Clock size={18} /> },
    { label: 'Out of stock', hint: 'Live products that can’t be bought', count: data.outOfStockProducts, to: '/admin/inventory?filter=out', icon: <PackageX size={18} /> },
    { label: 'Running low', hint: `${data.lowStockThreshold} or fewer left`, count: data.lowStockProducts, to: '/admin/inventory?filter=low', icon: <TriangleAlert size={18} /> },
  ]
  if (items.every((item) => item.count === 0)) {
    return <p className="dash-all-clear"><CircleCheck size={22} aria-hidden="true" /> All caught up. Nothing needs your attention right now.</p>
  }
  return (
    <ul className="dash-attention">
      {items.map((item) => (
        <li key={item.label} className={item.count === 0 ? 'is-clear' : ''}>
          <Link to={item.to}>
            <span className="dash-attention-icon" aria-hidden="true">{item.icon}</span>
            <span className="dash-attention-text"><strong>{item.label}</strong><small>{item.hint}</small></span>
            <span className="dash-attention-count">{item.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const StatusBreakdown = ({ data }: { data: AdminDashboard }) => {
  const total = data.ordersByStatus.reduce((sum, entry) => sum + entry.count, 0)
  if (total === 0) return <p className="dash-empty">No orders in this period.</p>
  const entries = statusOrder.map((status) => ({ status, count: data.ordersByStatus.find((entry) => entry.status === status)?.count ?? 0 })).filter((entry) => entry.count > 0)
  return (
    <>
      <div className="dash-stack" role="img" aria-label={entries.map((entry) => `${humanize(entry.status)} ${entry.count}`).join(', ')}>
        {entries.map((entry) => <span key={entry.status} style={{ flexGrow: entry.count, background: statusColor[entry.status] }} />)}
      </div>
      <ul className="dash-status-list">
        {entries.map((entry) => (
          <li key={entry.status}>
            <Link to={`/admin/orders?status=${entry.status}`}>
              <span className="dash-dot" style={{ background: statusColor[entry.status] }} aria-hidden="true" />
              {humanize(entry.status)}
              <strong>{entry.count}</strong>
              <small>{Math.round((entry.count / total) * 100)}%</small>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

const PaymentSplit = ({ data }: { data: AdminDashboard }) => {
  const total = data.paymentMethods.reduce((sum, entry) => sum + entry.amount, 0)
  if (total === 0) return null
  return (
    <div className="dash-payments">
      <h3>Payment method</h3>
      {data.paymentMethods.map((entry) => (
        <div key={entry.method} className="dash-payment-row">
          <span className="dash-payment-name">{entry.method === 'COD' ? <Wallet size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}{entry.method === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'}</span>
          <span className="dash-meter" aria-hidden="true"><span style={{ width: `${(entry.amount / total) * 100}%` }} /></span>
          <span className="dash-payment-value">{formatInr(entry.amount)} <small>· {entry.count}</small></span>
        </div>
      ))}
    </div>
  )
}

const Thumb = ({ src, name }: { src?: string; name: string }) => (
  src ? <CdnImage src={src} width={44} className="dash-thumb" /> : <span className="dash-thumb dash-thumb-empty" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
)

const DashboardSkeleton = () => (
  <div role="status" aria-label="Loading dashboard">
    <div className="dash-kpis">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="dash-kpi dash-skeleton-kpi" />)}</div>
    <div className="dash-grid"><Skeleton className="dash-panel dash-skeleton-panel span-2" /><Skeleton className="dash-panel dash-skeleton-panel" /></div>
  </div>
)

export const AdminDashboardPage = () => {
  const { user } = useSession()
  const [range, setRange] = useState('30')
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard', range],
    queryFn: () => adminApi.dashboard({ from: range === 'all' ? undefined : new Date(Date.now() - Number(range) * 86_400_000).toISOString() }),
  })
  const period = range === 'all' ? '' : `${range} days`
  const data = dashboard.data

  return (
    <section className="dash">
      <header className="dash-header">
        <div>
          <p className="dash-eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>Dashboard</h1>
          <p className="dash-subtitle">{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Here’s how the store is doing.</p>
        </div>
        <div className="dash-controls">
          <div className="dash-range" role="radiogroup" aria-label="Period">
            {ranges.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={range === option.value} className={range === option.value ? 'is-active' : ''} onClick={() => setRange(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="dash-refresh" onClick={() => void dashboard.refetch()} disabled={dashboard.isFetching} aria-label="Refresh dashboard">
            <RefreshCw size={16} className={dashboard.isFetching ? 'is-spinning' : ''} aria-hidden="true" />
          </button>
        </div>
      </header>

      {dashboard.isPending ? <DashboardSkeleton /> : dashboard.isError || !data ? (
        <ErrorState error={dashboard.error} title="Dashboard data could not be loaded" onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          <div className="dash-kpis">
            <KpiCard
              tone="lavender" icon={<IndianRupee size={18} />} label="Order value" value={formatInr(data.bookedSales)}
              detail={`${data.bookedOrders} order${data.bookedOrders === 1 ? '' : 's'}, excluding cancellations`}
              delta={<Delta current={data.bookedSales} previous={data.previous?.bookedSales} period={period} />}
            />
            <KpiCard
              tone="success" icon={<Wallet size={18} />} label="Collected" value={formatInr(data.totalSales)}
              detail={data.bookedSales ? `${Math.round((data.totalSales / data.bookedSales) * 100)}% of order value · ${data.paidOrders} paid` : `${data.paidOrders} paid orders`}
              delta={<Delta current={data.totalSales} previous={data.previous?.totalSales} period={period} />}
            />
            <KpiCard
              tone="gold" icon={<ShoppingBag size={18} />} label="Orders" value={data.totalOrders}
              detail={`${data.pendingOrders} still open`}
              delta={<Delta current={data.totalOrders} previous={data.previous?.totalOrders} period={period} />}
            />
            <KpiCard
              tone="rose" icon={<ReceiptText size={18} />} label="Avg. order value" value={formatInr(data.bookedAverageOrderValue)}
              detail={data.paidOrders ? `${formatInr(data.averageOrderValue)} on paid orders` : 'Across non-cancelled orders'}
              delta={<Delta current={data.bookedAverageOrderValue} previous={data.previous?.bookedAverageOrderValue} period={period} />}
            />
            <KpiCard
              tone="slate" icon={<UserPlus size={18} />} label="New customers" value={data.newCustomers}
              detail={`${data.totalCustomers} active customer${data.totalCustomers === 1 ? '' : 's'} in total`}
              delta={<Delta current={data.newCustomers} previous={data.previous?.newCustomers} period={period} />}
            />
          </div>

          <div className="dash-grid">
            <Panel title={data.seriesUnit === 'day' ? 'Daily order value' : 'Monthly order value'} className="span-2">
              <RevenueChart data={data} />
            </Panel>
            <Panel title="Needs attention">
              <AttentionList data={data} />
            </Panel>

            <Panel title="Recent orders" className="span-2" action={<Link to="/admin/orders" className="dash-link">View all <ArrowRight size={14} aria-hidden="true" /></Link>}>
              {data.recentOrders.length === 0 ? <p className="dash-empty">No orders yet. Your latest orders will show up here.</p> : (
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead><tr><th scope="col">Order</th><th scope="col" className="dash-col-customer">Customer</th><th scope="col">Status</th><th scope="col" className="num">Total</th></tr></thead>
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order._id}>
                          <td><Link to={`/admin/orders/${order._id}`} className="dash-order-link">#{order.orderNumber}</Link><small>{timeAgo(order.createdAt)}</small></td>
                          <td className="dash-col-customer">{order.customerName || '—'}<small>{order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.paymentMethod === 'COD' ? 'COD' : 'Online'}</small></td>
                          <td><StatusPill status={order.status} />{order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && <small className="dash-unpaid">{humanize(order.paymentStatus)} payment</small>}</td>
                          <td className="num"><strong>{formatInr(order.total)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel title="Orders by status">
              <StatusBreakdown data={data} />
              <PaymentSplit data={data} />
            </Panel>

            <Panel title="Best sellers" className="span-2" action={<Link to="/admin/products" className="dash-link">Products <ArrowRight size={14} aria-hidden="true" /></Link>}>
              {data.topProducts.length === 0 ? <p className="dash-empty">No products sold in this period.</p> : (
                <ol className="dash-top">
                  {data.topProducts.map((product, index) => {
                    const lead = data.topProducts[0].revenue || 1
                    return (
                      <li key={product.productId}>
                        <span className="dash-rank">{index + 1}</span>
                        <Thumb src={product.image} name={product.name} />
                        <span className="dash-top-main">
                          <strong>{product.name}</strong>
                          <span className="dash-meter" aria-hidden="true"><span style={{ width: `${(product.revenue / lead) * 100}%` }} /></span>
                        </span>
                        <span className="dash-top-figures"><strong>{formatInr(product.revenue)}</strong><small>{product.units} sold</small></span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </Panel>
            <Panel title="Stock watch" action={<Link to="/admin/inventory" className="dash-link">Inventory <ArrowRight size={14} aria-hidden="true" /></Link>}>
              {data.lowStockItems.length === 0 ? (
                <p className="dash-all-clear"><CircleCheck size={22} aria-hidden="true" /> Every live product has more than {data.lowStockThreshold} in stock.</p>
              ) : (
                <ul className="dash-stock">
                  {data.lowStockItems.map((item) => (
                    <li key={item._id}>
                      <Thumb src={item.image} name={item.name} />
                      <span className="dash-stock-name"><Link to={`/admin/products/${item._id}/edit`}>{item.name}</Link><small>{item.sku}</small></span>
                      <span className={`pill ${item.stock === 0 ? 'pill-danger' : 'pill-warning'}`}>{item.stock === 0 ? 'Out of stock' : `${item.stock} left`}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="dash-footnote">{data.totalProducts} live product{data.totalProducts === 1 ? '' : 's'} in the catalogue</p>
            </Panel>
          </div>
        </>
      )}
    </section>
  )
}
