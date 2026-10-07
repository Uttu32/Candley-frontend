import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { triggerToast } from '../../components/common/ToastContainer'
import { PageMeta } from '../../components/common/PageMeta'

const accountNav = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/wishlist', label: 'Wishlist' },
  { to: '/account/settings', label: 'Password' },
]

export const AccountLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const signOut = async () => {
    await logout().catch(() => undefined)
    triggerToast('You have been signed out')
    navigate('/login', { replace: true })
  }
  return (
    <div className="container section-spacing">
      <PageMeta title="Your account" noIndex />
      <div className="account-heading">
        <div>
          <span className="eyebrow">Your space</span>
          <h1>Hello, {user?.name.split(' ')[0]}</h1>
        </div>
        <button type="button" className="secondary-button small" onClick={() => void signOut()}>Sign out</button>
      </div>
      <div className="account-layout">
        <nav className="account-sidebar card-surface" aria-label="Account">
          {accountNav.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}
        </nav>
        <div className="account-content card-surface">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
