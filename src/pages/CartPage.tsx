import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { products } from '../data/mock'

export const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity } = useAppStore()

  const cartProducts = cartItems.map((item) => {
    const product = products.find((entry) => entry.id === item.productId) ?? products[0]
    return { ...item, product }
  })

  return (
    <div className="container section-spacing cart-page">
      <div className="cart-layout">
        <div className="cart-items">
          <h1>Your cart</h1>
          {cartItems.length === 0 ? (
            <div className="empty-state">
              <h3>Your candle shelf is waiting.</h3>
              <Link to="/shop" className="primary-button">Explore Candles</Link>
            </div>
          ) : (
            cartProducts.map(({ product, quantity, variantId }) => (
              <div key={`${product.id}-${variantId ?? 'default'}`} className="cart-row">
                <img src={product.images[0]} alt={product.name} />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.fragrance}</p>
                </div>
                <div className="quantity-control">
                  <button type="button" onClick={() => updateQuantity(product.id, variantId, quantity - 1)}>−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => updateQuantity(product.id, variantId, quantity + 1)}>+</button>
                </div>
                <strong>₹{product.price * quantity}</strong>
                <button type="button" className="text-button" onClick={() => removeFromCart(product.id, variantId)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <aside className="summary-panel">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₹{cartProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Free</strong>
          </div>
          <Link to="/checkout" className="primary-button full-width">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  )
}
