import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Boxes, FolderTree, Image, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart, TicketPercent, Users, X } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { PageMeta } from '../components/common/PageMeta'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/cms/hero', label: 'Hero slides', icon: Image },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export const AdminLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="admin-shell">
      <PageMeta title="Admin" noIndex />
      <a href="#admin-content" className="skip-link">Skip to content</a>
      <aside className={`admin-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="admin-brand">Candley Admin</div>
        <nav aria-label="Admin" id="admin-nav">
          {adminLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="admin-nav-item" onClick={() => setNavOpen(false)}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button type="button" className="icon-button admin-nav-toggle" onClick={() => setNavOpen((open) => !open)} aria-expanded={navOpen} aria-controls="admin-nav" aria-label={navOpen ? 'Close navigation' : 'Open navigation'}>
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <NavLink to="/" className="text-button">View store</NavLink>
          <div className="admin-actions">
            <span className="admin-user">{user?.name} <small>({user?.role.replace('_', ' ').toLowerCase()})</small></span>
            <button type="button" className="secondary-button small" onClick={() => void logout().finally(() => navigate('/login', { replace: true }))}>
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>
        <main id="admin-content" className="admin-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
