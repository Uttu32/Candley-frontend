import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/api'
import { formatInr, humanize } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'

const ranges = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export const AdminDashboardPage = () => {
  const [range, setRange] = useState('30')
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard', range],
    queryFn: () => adminApi.dashboard({ from: range === 'all' ? undefined : new Date(Date.now() - Number(range) * 86_400_000).toISOString() }),
  })

  return (
    <section>
      <div className="section-row">
        <h1>Dashboard</h1>
        <label className="inline-field">Period
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            {ranges.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {dashboard.isPending ? (
        <div className="stats-grid">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="stat-card" />)}</div>
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} title="Dashboard data could not be loaded" onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          <div className="stats-grid">
            {[
              ['Sales (paid)', formatInr(dashboard.data.totalSales)],
              ['Orders', dashboard.data.totalOrders],
              ['Paid orders', dashboard.data.paidOrders],
              ['Average paid order', formatInr(dashboard.data.averageOrderValue)],
              ['Open orders', dashboard.data.pendingOrders],
              ['Active customers', dashboard.data.totalCustomers],
              ['New customers', dashboard.data.newCustomers],
              ['Products', dashboard.data.totalProducts],
            ].map(([label, value]) => (
              <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
            <Link to="/admin/inventory?filter=out" className="stat-card stat-link"><span>Out of stock</span><strong>{dashboard.data.outOfStockProducts}</strong></Link>
            <Link to="/admin/inventory?filter=low" className="stat-card stat-link"><span>Low stock (≤5)</span><strong>{dashboard.data.lowStockProducts}</strong></Link>
          </div>

          <div className="admin-grid-2">
            <div className="admin-panel">
              <h2>Revenue by day</h2>
              {dashboard.data.revenueSeries.length === 0 ? <p className="account-muted">No paid orders in this period.</p> : (
                <ul className="bar-list">
                  {(() => {
                    const max = Math.max(...dashboard.data.revenueSeries.map((point) => point.value))
                    return dashboard.data.revenueSeries.map((point) => (
                      <li key={point.label}>
                        <span>{point.label}</span>
                        <span className="bar" style={{ width: `${max ? (point.value / max) * 100 : 0}%` }} aria-hidden="true" />
                        <strong>{formatInr(point.value)}</strong>
                      </li>
                    ))
                  })()}
                </ul>
              )}
            </div>
            <div className="admin-panel">
              <h2>Top products</h2>
              {dashboard.data.topProducts.length === 0 ? <p className="account-muted">No sales in this period.</p> : (
                <table className="data-table">
                  <thead><tr><th scope="col">Product</th><th scope="col">Units</th><th scope="col">Revenue</th></tr></thead>
                  <tbody>{dashboard.data.topProducts.map((product) => <tr key={product.productId}><td>{product.name}</td><td>{product.units}</td><td>{formatInr(product.revenue)}</td></tr>)}</tbody>
                </table>
              )}
              <h2>Orders by status</h2>
              {dashboard.data.ordersByStatus.length === 0 ? <p className="account-muted">No orders in this period.</p> : (
                <ul className="status-counts">
                  {dashboard.data.ordersByStatus.map((entry) => <li key={entry.status}><Link to={`/admin/orders?status=${entry.status}`}>{humanize(entry.status)}</Link> <strong>{entry.count}</strong></li>)}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
