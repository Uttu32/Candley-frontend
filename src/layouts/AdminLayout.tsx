import { Outlet, NavLink } from 'react-router-dom'
import { Package, ShoppingCart, Users, TicketPercent, Settings, LayoutDashboard, Image } from 'lucide-react'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/cms/hero', label: 'Hero media', icon: Image },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export const AdminLayout = () => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Candley Admin</div>
        <nav>
          {adminLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="admin-nav-item">
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Admin</h1>
          </div>
          <div className="admin-actions">
            <button className="secondary-button">Search</button>
            <button className="secondary-button">Profile</button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
