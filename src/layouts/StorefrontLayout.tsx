import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { catalogApi, cmsApi } from '../services/api'
import { useCart } from '../hooks/useCart'
import { useWishlist } from '../hooks/useWishlist'
import { CartLines } from '../components/cart/CartLines'
import { formatInr } from '../utils/format'

const SearchOverlay = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(text.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [text])
  const results = useQuery({ queryKey: ['products', 'search', debounced], queryFn: ({ signal }) => catalogApi.products({ q: debounced, limit: 6 }, signal), enabled: debounced.length >= 2 })

  return (
    <div className="search-overlay" onClick={onClose} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Search products" onClick={(event) => event.stopPropagation()}>
        <form role="search" onSubmit={(event) => { event.preventDefault(); if (text.trim()) { navigate(`/search?q=${encodeURIComponent(text.trim())}`); onClose() } }}>
          <label htmlFor="global-search" className="sr-only">Search products</label>
          <input id="global-search" type="search" placeholder="Search candles, fragrances, collections" value={text} onChange={(event) => setText(event.target.value)} autoFocus />
        </form>
        <div className="search-results" aria-live="polite">
          {debounced.length >= 2 && results.isSuccess && results.data.items.length === 0 && <p className="search-empty">No products found for “{debounced}”.</p>}
          {results.isError && <p className="search-empty">Search is unavailable right now.</p>}
          {results.data?.items.map((product) => (
            <Link key={product._id} to={`/product/${product.slug}`} className="search-result-item" onClick={onClose}>
              {product.thumbnailImage ? <img src={product.thumbnailImage} alt="" loading="lazy" /> : <span className="image-placeholder" />}
              <span><strong>{product.name}</strong><small>{product.fragrance} · {formatInr(product.price)}</small></span>
            </Link>
          ))}
        </div>
        <button type="button" className="icon-button search-close" onClick={onClose} aria-label="Close search"><X size={18} /></button>
      </div>
    </div>
  )
}

const CartDrawer = ({ onClose }: { onClose: () => void }) => {
  const status = useAppStore((state) => state.sessionStatus)
  const cartQuery = useCart()
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => previous?.focus?.()
  }, [])
  const cart = cartQuery.data

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside ref={panelRef} tabIndex={-1} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
        <div className="drawer-header">
          <h2 id="cart-drawer-title">Your cart</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close cart"><X size={18} /></button>
        </div>
        <div className="drawer-content">
          {status !== 'authenticated' ? (
            <div className="empty-cart-drawer">
              <p>Sign in to view your cart.</p>
              <Link to="/login" className="primary-button" onClick={onClose}>Sign in</Link>
            </div>
          ) : cartQuery.isPending ? (
            <p role="status">Loading your cart…</p>
          ) : cartQuery.isError ? (
            <p className="form-error" role="alert">Your cart could not be loaded.</p>
          ) : cart!.items.length === 0 ? (
            <div className="empty-cart-drawer"><p>Your cart is empty.</p><Link to="/shop" onClick={onClose}>Continue shopping</Link></div>
          ) : (
            <CartLines cart={cart!} compact onNavigate={onClose} />
          )}
        </div>
        {cart && cart.items.length > 0 && (
          <div className="drawer-footer">
            {cart.hasIssues && <p className="line-issue">Some items need attention.</p>}
            <div className="summary-row"><span>Subtotal</span><strong>{formatInr(cart.subtotal)}</strong></div>
            <Link to="/cart" className="primary-button full-width" onClick={onClose}>View cart</Link>
          </div>
        )}
      </aside>
    </div>
  )
}

export const StorefrontLayout = () => {
  const location = useLocation()
  const { isMenuOpen, isSearchOpen, isCartOpen, setMenuOpen, setSearchOpen, setCartOpen, user } = useAppStore()
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const announcementQuery = useQuery({ queryKey: ['announcement'], queryFn: cmsApi.announcement, staleTime: 5 * 60_000 })
  const cartQuery = useCart()
  const wishlist = useWishlist()
  const cartCount = cartQuery.data?.itemCount ?? 0
  const wishlistCount = wishlist.ids.size
  const announcement = announcementQuery.data
  const navCategories = (categoriesQuery.data ?? []).filter((category) => (category.count ?? 0) > 0).slice(0, 4)

  // Close overlays when navigating.
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
    setCartOpen(false)
  }, [location.pathname, setCartOpen, setMenuOpen, setSearchOpen])

  const navItems = [{ label: 'Shop all', to: '/shop' }, ...navCategories.map((category) => ({ label: category.name, to: `/category/${category.slug}` })), { label: 'About', to: '/about' }]

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="topbar">
        {announcement?.enabled && (
          <div className="announcement-bar">
            <span>{announcement.message}</span>
            {announcement.ctaText && announcement.ctaUrl?.startsWith('/') && <Link to={announcement.ctaUrl}>{announcement.ctaText}</Link>}
          </div>
        )}
        <nav className="primary-header container" aria-label="Main">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} aria-controls="mobile-menu">
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/" className="brand-logo" aria-label="Candley Aroma home">
            <img src="/candley-aroma-round-logo.svg" alt="" />
          </Link>
          <div className="nav-links desktop-only">
            {navItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </div>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={18} /></button>
            <Link to="/account/wishlist" className="icon-button" aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`}>
              <Heart size={18} />
              {wishlistCount > 0 && <span className="count-badge" aria-hidden="true">{wishlistCount}</span>}
            </Link>
            <Link to={user ? '/account' : '/login'} className="icon-button" aria-label={user ? `Account for ${user.name}` : 'Sign in'}>
              <UserRound size={18} />
            </Link>
            <button className="icon-button" onClick={() => setCartOpen(true)} aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}>
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="count-badge" aria-hidden="true">{cartCount}</span>}
            </button>
          </div>
        </nav>
      </header>

      {isMenuOpen && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile" onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false) }} onKeyDown={(event) => event.key === 'Escape' && setMenuOpen(false)}>
          <div className="mobile-menu-content">
            {navItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
            <NavLink to={user ? '/account' : '/login'}>{user ? 'My account' : 'Sign in'}</NavLink>
          </div>
        </nav>
      )}
      {isSearchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {isCartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}

      <main id="main-content" className="page-shell" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Candley Aroma</span>
          <nav aria-label="Footer"><Link to="/about">About</Link> <Link to="/shop">Shop</Link> <Link to="/account/orders">Orders</Link></nav>
        </div>
      </footer>
    </div>
  )
}
