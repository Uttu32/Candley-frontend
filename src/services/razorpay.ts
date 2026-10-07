import type { RazorpayPaymentInit, RazorpaySuccess } from '../types'

type RazorpayFailure = { error?: { description?: string; reason?: string } }
type RazorpayInstance = { open: () => void; on: (event: 'payment.failed', handler: (response: RazorpayFailure) => void) => void }
type RazorpayOptions = {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color: string }
  handler: (response: RazorpaySuccess) => void
  modal: { ondismiss: () => void; escape?: boolean }
}
declare global {
  interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance }
}

const scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js'
let loading: Promise<void> | undefined

export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = undefined
      script.remove()
      reject(new Error('The payment window could not be loaded. Check your connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return loading
}

export type CheckoutOutcome =
  | { status: 'success'; response: RazorpaySuccess }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string }

/**
 * Opens Razorpay Checkout for a server-created order. The outcome is only a client signal:
 * the order counts as paid only after the server verifies the signature.
 */
export const openRazorpayCheckout = async (init: RazorpayPaymentInit, prefill: RazorpayOptions['prefill']): Promise<CheckoutOutcome> => {
  await loadRazorpay()
  if (!window.Razorpay) throw new Error('The payment window is unavailable')
  return new Promise<CheckoutOutcome>((resolve) => {
    let failure: string | undefined
    const instance = new window.Razorpay!({
      key: init.keyId,
      order_id: init.razorpayOrderId,
      amount: init.amount,
      currency: init.currency,
      name: 'Candley Aroma',
      description: `Order ${init.orderNumber}`,
      prefill,
      theme: { color: '#8a6fcf' },
      handler: (response) => resolve({ status: 'success', response }),
      // Razorpay keeps the modal open after a failed attempt so the customer can retry; report it when they close it.
      modal: { ondismiss: () => resolve(failure ? { status: 'failed', message: failure } : { status: 'dismissed' }) },
    })
    instance.on('payment.failed', (response) => { failure = response.error?.description ?? 'The payment was declined' })
    instance.open()
  })
}
