import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Search, UserRound, Heart, Minus, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getCartCount } from '../store/useAppStore'
import { categories, products } from '../data/mock'
import { navLinks } from '../constants/site'

export const StorefrontLayout = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const {
    cartItems,
    isMenuOpen,
    isSearchOpen,
    isCartOpen,
    toggleMenu,
    toggleSearch,
    toggleCart,
    wishlist,
    removeFromCart,
    updateQuantity,
  } = useAppStore()
  const cartCount = getCartCount(cartItems)

  const cartProducts = cartItems.map((item) => {
    const product = products.find((entry) => entry.id === item.productId) ?? products[0]
    return { ...item, product }
  })

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const searchResults = products.filter((product) =>
    [product.name, product.category, product.collection, product.fragrance, ...product.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearchQuery),
  )

  const closeSearch = () => {
    setSearchQuery('')
    toggleSearch()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="announcement-bar">
          <span>Free shipping above ₹999</span>
        </div>
        <nav className="primary-header container">
          <button className="icon-button mobile-only" onClick={toggleMenu} aria-label="Toggle menu">
            ☰
          </button>
          <Link to="/" className="brand-logo" aria-label="Candley Aroma home">
            <img src="/candley-aroma-round-logo.svg" alt="Candley Aroma" />
          </Link>
          <div className="nav-links desktop-only">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}>{link.label}</a>
            ))}
          </div>
          <div className="header-actions">
            <button className="icon-button" onClick={toggleSearch} aria-label="Search">
              <Search size={18} />
            </button>
            <Link
              to="/account/wishlist"
              className="icon-button"
              aria-label={`Wishlist${wishlist.length > 0 ? `, ${wishlist.length} saved` : ''}`}
            >
              <Heart size={18} />
              {wishlist.length > 0 && <span className="count-badge">{wishlist.length}</span>}
            </Link>
            <Link to="/account" className="icon-button" aria-label="Account">
              <UserRound size={18} />
            </Link>
            <button className="icon-button" onClick={toggleCart} aria-label="Cart">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="mobile-menu"
          >
            <div className="mobile-menu-content">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href}>{link.label}</a>
              ))}
              <div className="menu-groups">
                {categories.slice(0, 4).map((category) => (
                  <a key={category.id} href={`/category/${category.slug}`}>{category.name}</a>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          >
            <div className="search-panel" onClick={(event) => event.stopPropagation()}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                    closeSearch()
                  }
                }}
              >
                <input
                  aria-label="Search products"
                  placeholder="Search candles, fragrances, collections"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                />
              </form>
              <div className="search-results">
                {searchQuery.trim() && searchResults.length === 0 ? (
                  <p className="search-empty">No products found for “{searchQuery}”.</p>
                ) : (
                  searchResults.slice(0, 6).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="search-result-item"
                      onClick={() => {
                        navigate(`/product/${product.slug}`)
                        closeSearch()
                      }}
                    >
                      <img src={product.images[0]} alt="" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.fragrance}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen && (
          <motion.aside
            className="cart-drawer"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
          >
            <div className="drawer-header">
              <h3>Your cart</h3>
              <button className="icon-button" onClick={toggleCart} aria-label="Close cart">×</button>
            </div>
            <div className="drawer-content">
              {cartProducts.length === 0 ? (
                <div className="empty-cart-drawer">
                  <p>Your cart is empty.</p>
                  <Link to="/shop" onClick={toggleCart}>Continue shopping</Link>
                </div>
              ) : (
                cartProducts.map(({ product, quantity, variantId }) => (
                  <div key={`${product.id}-${variantId ?? 'default'}`} className="cart-item-row cart-drawer-item">
                    <div className="mini-thumb" style={{ backgroundImage: `url(${product.images[0]})` }} />
                    <div className="drawer-item-copy">
                      <strong>{product.name}</strong>
                      <span>{product.fragrance}</span>
                      <div className="drawer-quantity-wrap">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() => updateQuantity(product.id, variantId, quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${product.name}`}
                          onClick={() => updateQuantity(product.id, variantId, quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="drawer-item-actions">
                      <span>₹{product.price * quantity}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name} from cart`}
                        onClick={() => removeFromCart(product.id, variantId)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cartProducts.length > 0 && (
              <div className="drawer-footer">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>
                    ₹
                    {cartProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0)}
                  </strong>
                </div>
                <Link to="/cart" className="primary-button full-width" onClick={toggleCart}>
                  View cart
                </Link>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  )
}
