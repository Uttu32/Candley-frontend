import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export const AdminDashboardPage = () => {
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.adminDashboard(),
  })

  if (dashboard.isPending) {
    return <section><h2>Dashboard</h2><p>Loading live metrics...</p></section>
  }

  if (dashboard.isError) {
    return (
      <section>
        <h2>Dashboard</h2>
        <div className="admin-panel">
          <p className="form-error">Unable to load live dashboard data. Check the admin API connection and try again.</p>
          <button className="secondary-button" type="button" onClick={() => void dashboard.refetch()}>Retry</button>
        </div>
      </section>
    )
  }

  const metrics = dashboard.data

  return (
    <section>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        {[{'label': 'Total sales', 'value': formatCurrency(metrics.totalSales)},
          {'label': 'Total orders', 'value': metrics.totalOrders},
          {'label': 'Total customers', 'value': metrics.totalCustomers},
          {'label': 'Pending orders', 'value': metrics.pendingOrders},
          {'label': 'Out-of-stock products', 'value': `${metrics.outOfStockProducts}`},
          {'label': 'Average order value', 'value': formatCurrency(metrics.averageOrderValue)},
        ]?.map((stat) => (
          <div className="stat-card flex flex-col" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div> 
        ))}
      </div>

      {metrics.revenueSeries && metrics.revenueSeries.length > 0 && (
        <div className="admin-panel">
          <h3>Revenue over time</h3>
          <div className="admin-table">
            {metrics.revenueSeries.map((point) => (
              <div className="table-row" key={point.label}>
                <span>{point.label}</span>
                <strong>{formatCurrency(point.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
