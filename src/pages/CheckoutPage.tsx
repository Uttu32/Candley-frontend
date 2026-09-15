import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Address } from '../services/api'
import { triggerToast } from '../components/common/ToastContainer'

const initialAddress: Address = { name: '', phone: '', addressLine1: '', city: '', state: '', postalCode: '', country: 'India' }

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const [address, setAddress] = useState(initialAddress)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateAddress = (key: keyof Address, value: string) => setAddress((current) => ({ ...current, [key]: value }))
  const submit = async (paymentMethod: 'COD' | 'RAZORPAY') => {
    if (!window.localStorage.getItem('candley-aroma-access-token')) {
      navigate('/login')
      return
    }
    if (paymentMethod === 'RAZORPAY') {
      setError('Online payment is not enabled by the backend yet. Please choose Cash on Delivery.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const order = await api.createOrder({ shippingAddress: address, paymentMethod })
      triggerToast(`Order ${order.orderNumber} placed`)
      navigate('/account/orders')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to create order')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container section-spacing">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-form card-surface">
          <h3>Shipping address</h3>
          <div className="field-grid">
            <input required placeholder="Full name" value={address.name} onChange={(event) => updateAddress('name', event.target.value)} />
            <input required placeholder="Phone number" value={address.phone} onChange={(event) => updateAddress('phone', event.target.value)} />
            <input required placeholder="Street address" value={address.addressLine1} onChange={(event) => updateAddress('addressLine1', event.target.value)} />
            <input required placeholder="City" value={address.city} onChange={(event) => updateAddress('city', event.target.value)} />
            <input required placeholder="State" value={address.state} onChange={(event) => updateAddress('state', event.target.value)} />
            <input required placeholder="PIN code" value={address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} />
          </div>
        </div>
        <aside className="summary-panel">
          <h3>Payment</h3>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-button full-width" onClick={() => void submit('RAZORPAY')} disabled={isSubmitting}>Pay with Razorpay</button>
          <button type="button" className="secondary-button full-width" onClick={() => void submit('COD')} disabled={isSubmitting}>{isSubmitting ? 'Placing order...' : 'Cash on Delivery'}</button>
        </aside>
      </div>
    </div>
  )
}
