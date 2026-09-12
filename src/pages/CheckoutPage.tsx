export const CheckoutPage = () => {
  return (
    <div className="container section-spacing">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-form card-surface">
          <h3>Shipping address</h3>
          <div className="field-grid">
            <input placeholder="Full name" />
            <input placeholder="Phone number" />
            <input placeholder="Street address" />
            <input placeholder="City" />
            <input placeholder="State" />
            <input placeholder="PIN code" />
          </div>
        </div>
        <aside className="summary-panel">
          <h3>Payment</h3>
          <button className="primary-button full-width">Pay with Razorpay</button>
          <button className="secondary-button full-width">Cash on Delivery</button>
        </aside>
      </div>
    </div>
  )
}
