import { Link, useLocation } from 'react-router-dom'
import { products } from '../data/mock'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'

export const AccountPage = () => {
  const location = useLocation()
  const { addToCart, toggleWishlist, wishlist } = useAppStore()
  const savedProducts = products.filter((product) => wishlist.includes(product.id))
  const isWishlistPage = location.pathname === '/account/wishlist'

  return (
    <div className="container section-spacing">
      <h1>{isWishlistPage ? 'Your wishlist' : 'Account'}</h1>
      <div className="account-layout">
        <nav className="account-sidebar card-surface">
          <Link to="/account">Profile</Link>
          <Link to="/account/orders">Orders</Link>
          <Link to="/account/wishlist">Wishlist {wishlist.length > 0 && `(${wishlist.length})`}</Link>
          <Link to="/account/settings">Settings</Link>
        </nav>
        <div className="account-content card-surface">
          {isWishlistPage ? (
            savedProducts.length === 0 ? (
              <div className="empty-state">
                <h3>Your wishlist is empty</h3>
                <p>Tap the heart on any product to save it here.</p>
                <Link to="/shop" className="primary-button">Explore products</Link>
              </div>
            ) : (
              <div className="wishlist-list">
                {savedProducts.map((product) => (
                  <article key={product.id} className="wishlist-row">
                    <img src={product.images[0]} alt={product.name} />
                    <div className="wishlist-row-copy">
                      <span className="eyebrow">{product.collection}</span>
                      <h3>{product.name}</h3>
                      <strong>₹{product.price}</strong>
                    </div>
                    <div className="wishlist-row-actions">
                      <button
                        type="button"
                        className="primary-button small"
                        onClick={() => {
                          addToCart(product.id, 1, product.variants?.[0]?.id)
                          triggerToast('Added to cart')
                        }}
                      >
                        Add to cart
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          toggleWishlist(product.id)
                          triggerToast('Removed from wishlist')
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <>
              <h3>Welcome back</h3>
              <p>Your orders, wishlist, and preferences live here.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
