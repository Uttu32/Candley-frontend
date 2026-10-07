import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi, ApiError, errorMessage, ordersApi } from '../services/api'
import { useRazorpayPayment } from '../hooks/useRazorpayPayment'
import type { Order, PaymentMethod } from '../types'
import { formatDate, formatInr, newIdempotencyKey } from '../utils/format'
import { cartKey, useCart } from '../hooks/useCart'
import { AddressForm } from '../components/account/AddressForm'
import { ErrorState, Skeleton } from '../components/common/Feedback'
import { FormError } from '../components/common/Field'
import { PageMeta } from '../components/common/PageMeta'

type PaymentProblem = { order: Order; message: string }

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartQuery = useCart()
  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: accountApi.addresses })
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const quoteQuery = useQuery({
    queryKey: ['quote', appliedCoupon, cartQuery.data?.updatedAt],
    queryFn: () => ordersApi.quote(appliedCoupon),
    enabled: Boolean(cartQuery.data?.items.length) && !cartQuery.data?.hasIssues,
    retry: false,
  })

  const [chosenAddressId, setChosenAddressId] = useState<string>()
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod>()
  const [error, setError] = useState('')
  const [stage, setStage] = useState<'idle' | 'placing' | 'paying'>('idle')
  const [paymentProblem, setPaymentProblem] = useState<PaymentProblem | null>(null)
  const submitting = useRef(false)
  const payment = useRazorpayPayment()

  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data])
  const addressId = chosenAddressId ?? addresses.find((address) => address.isDefault)?._id ?? addresses[0]?._id
  const quote = quoteQuery.data
  const methods = quote?.paymentMethods
  const method: PaymentMethod | undefined = chosenMethod && methods?.[chosenMethod === 'COD' ? 'cod' : 'razorpay'].available
    ? chosenMethod
    : methods?.razorpay.available ? 'RAZORPAY' : methods?.cod.available ? 'COD' : undefined

  // One idempotency key per distinct checkout; retries of the same submission reuse it.
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [addressId, method, quote?.couponCode, cartQuery.data?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveAddress = useMutation({
    mutationFn: accountApi.addAddress,
    onSuccess: (saved) => {
      queryClient.setQueryData(['addresses'], saved)
      setChosenAddressId(saved[saved.length - 1]?._id)
      setShowNewAddress(false)
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const finish = async (order: Order) => {
    await queryClient.invalidateQueries({ queryKey: cartKey })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    navigate(`/account/orders/${order._id}?placed=1`, { replace: true })
  }

  /** Opens Razorpay for an unpaid order; success is shown only after server verification. */
  const pay = async (order: Order) => {
    setPaymentProblem(null)
    setStage('paying')
    const result = await payment.pay(order)
    setStage('idle')
    if (result.ok) return finish(result.order)
    setPaymentProblem({ order, message: result.message })
  }

  const placeOrder = async () => {
    if (submitting.current || !method || !addressId) return
    submitting.current = true
    setError('')
    setStage('placing')
    try {
      const order = await ordersApi.create({ addressId, paymentMethod: method, couponCode: quote?.couponCode ?? undefined, idempotencyKey })
      if (order.paymentMethod === 'COD' || order.paymentStatus === 'PAID') return await finish(order)
      await pay(order)
    } catch (placeError) {
      setError(errorMessage(placeError, 'Your order could not be placed'))
      if (placeError instanceof ApiError && placeError.status === 409) {
        queryClient.invalidateQueries({ queryKey: cartKey })
        queryClient.invalidateQueries({ queryKey: ['quote'] })
      }
      setStage('idle')
    } finally {
      submitting.current = false
    }
  }

  if (cartQuery.isPending || addressesQuery.isPending) return <div className="container section-spacing"><Skeleton className="skeleton-block" label="Loading checkout" /></div>
  if (cartQuery.isError) return <div className="container section-spacing"><ErrorState error={cartQuery.error} onRetry={() => void cartQuery.refetch()} /></div>
  const cart = cartQuery.data

  if (paymentProblem) {
    return (
      <div className="container section-spacing">
        <PageMeta title="Payment" noIndex />
        <div className="empty-state" role="alert">
          <h1>Payment not completed</h1>
          <p>{paymentProblem.message}</p>
          {paymentProblem.order.reservationExpiresAt && <p>Your items are reserved until {formatDate(paymentProblem.order.reservationExpiresAt, true)}.</p>}
          <div className="profile-actions">
            <button type="button" className="primary-button" disabled={stage !== 'idle'} onClick={() => void pay(paymentProblem.order)}>{stage === 'idle' ? 'Try payment again' : 'Opening payment…'}</button>
            <Link to={`/account/orders/${paymentProblem.order._id}`} className="secondary-button">View order {paymentProblem.order.orderNumber}</Link>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return <div className="container section-spacing"><div className="empty-state"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/shop" className="primary-button">Continue shopping</Link></div></div>
  }
  if (cart.hasIssues) {
    return <div className="container section-spacing"><div className="empty-state" role="alert"><h1>Checkout</h1><p>Some items in your cart have changed or are unavailable.</p><Link to="/cart" className="primary-button">Review your cart</Link></div></div>
  }

  const busy = stage !== 'idle'
  const canPlace = Boolean(method && addressId && quote && !busy && !quoteQuery.isFetching)

  return (
    <div className="container section-spacing">
      <PageMeta title="Checkout" noIndex />
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-form">
          <section className="card-surface checkout-section" aria-labelledby="address-heading">
            <h2 id="address-heading">Delivery address</h2>
            {addresses.length > 0 && (
              <fieldset className="address-options">
                <legend className="sr-only">Choose a delivery address</legend>
                {addresses.map((address) => (
                  <label key={address._id} className={`address-option ${address._id === addressId ? 'active' : ''}`}>
                    <input type="radio" name="address" value={address._id} checked={address._id === addressId} onChange={() => setChosenAddressId(address._id)} />
                    <span>
                      <strong>{address.label || 'Address'}{address.isDefault ? ' · Default' : ''}</strong>
                      <span>{address.name}, {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} {address.postalCode}</span>
                      <small>{address.phone}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {showNewAddress || addresses.length === 0 ? (
              <AddressForm submitLabel="Save and use this address" busy={saveAddress.isPending} onSubmit={(address) => saveAddress.mutate(address)} onCancel={addresses.length ? () => setShowNewAddress(false) : undefined} />
            ) : (
              <button type="button" className="text-button" onClick={() => setShowNewAddress(true)}>+ Add a new address</button>
            )}
          </section>

          <section className="card-surface checkout-section" aria-labelledby="payment-heading">
            <h2 id="payment-heading">Payment</h2>
            {!methods ? (
              <Skeleton className="skeleton-line" label="Loading payment options" />
            ) : (
              <fieldset className="payment-options">
                <legend className="sr-only">Choose a payment method</legend>
                {([['RAZORPAY', 'razorpay', 'Pay online', 'UPI, cards, net banking and wallets via Razorpay'], ['COD', 'cod', 'Cash on delivery', 'Pay when your order arrives']] as const).map(([value, key, title, description]) => (
                  <label key={value} className={`address-option ${method === value ? 'active' : ''} ${methods[key].available ? '' : 'disabled'}`}>
                    <input type="radio" name="payment" value={value} checked={method === value} disabled={!methods[key].available} onChange={() => setChosenMethod(value)} />
                    <span><strong>{title}</strong><span>{methods[key].available ? description : methods[key].reason}</span></span>
                  </label>
                ))}
                {!methods.cod.available && !methods.razorpay.available && <p className="form-error">No payment method is available for this order right now.</p>}
              </fieldset>
            )}
          </section>
        </div>

        <aside className="summary-panel" aria-label="Order summary">
          <h2>Order summary</h2>
          {quoteQuery.isError ? (
            <ErrorState error={quoteQuery.error} title="Totals could not be calculated" onRetry={() => void quoteQuery.refetch()} />
          ) : !quote ? (
            <Skeleton className="skeleton-block" label="Calculating totals" />
          ) : (
            <>
              <ul className="summary-lines">
                {quote.items.map((item) => (
                  <li key={`${item.productId}-${item.variantId ?? ''}`} className="summary-row">
                    <span>{item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}</span>
                    <span>{formatInr(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <form className="coupon-form" onSubmit={(event) => { event.preventDefault(); setAppliedCoupon(couponInput.trim().toUpperCase()) }}>
                <label htmlFor="coupon" className="sr-only">Coupon code</label>
                <input id="coupon" placeholder="Coupon code" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} maxLength={40} />
                <button type="submit" className="secondary-button small" disabled={quoteQuery.isFetching}>Apply</button>
              </form>
              {quote.couponError && <p className="field-error" role="alert">{quote.couponError}</p>}
              {quote.couponCode && <p className="coupon-applied">Coupon {quote.couponCode} applied <button type="button" className="text-button" onClick={() => { setAppliedCoupon(''); setCouponInput('') }}>Remove</button></p>}
              <div className="summary-row"><span>Subtotal</span><span>{formatInr(quote.subtotal)}</span></div>
              {quote.discount > 0 && <div className="summary-row"><span>Discount</span><span>−{formatInr(quote.discount)}</span></div>}
              <div className="summary-row"><span>Shipping</span><span>{quote.shipping === 0 ? 'Free' : formatInr(quote.shipping)}</span></div>
              <div className="summary-row total" aria-live="polite"><strong>Total</strong><strong>{formatInr(quote.total)}</strong></div>
            </>
          )}
          <FormError message={error} />
          <button type="button" className="primary-button full-width" disabled={!canPlace} onClick={() => void placeOrder()} aria-busy={busy}>
            {stage === 'placing' ? 'Placing order…' : payment.stage === 'verifying' ? 'Confirming payment…' : stage === 'paying' ? 'Waiting for payment…' : method === 'COD' ? 'Place order' : 'Continue to payment'}
          </button>
          {!addressId && <p className="field-hint">Add a delivery address to continue.</p>}
        </aside>
      </div>
    </div>
  )
}
