import { useState } from 'react'
import { errorMessage, ordersApi } from '../services/api'
import { openRazorpayCheckout } from '../services/razorpay'
import { useAppStore } from '../store/useAppStore'
import type { Order } from '../types'

export type PaymentResult = { ok: true; order: Order } | { ok: false; message: string }

/**
 * Runs Razorpay Checkout for an unpaid order: server-created payment order → Checkout → server verification.
 * `ok` is true only when the verify endpoint returns the order as PAID.
 */
export const useRazorpayPayment = () => {
  const user = useAppStore((state) => state.user)
  const [stage, setStage] = useState<'idle' | 'paying' | 'verifying'>('idle')

  const pay = async (order: Order): Promise<PaymentResult> => {
    setStage('paying')
    try {
      const init = await ordersApi.startRazorpay(order._id)
      const outcome = await openRazorpayCheckout(init, { name: user?.name, email: user?.email, contact: order.shippingAddress.phone })
      if (outcome.status === 'dismissed') return { ok: false, message: 'Payment was cancelled.' }
      if (outcome.status === 'failed') return { ok: false, message: `Payment failed: ${outcome.message}` }
      setStage('verifying')
      const verified = await ordersApi.verifyRazorpay(order._id, outcome.response)
      return verified.paymentStatus === 'PAID'
        ? { ok: true, order: verified }
        : { ok: false, message: 'We could not confirm your payment yet. If money was deducted, it will be confirmed automatically.' }
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Payment could not be completed') }
    } finally {
      setStage('idle')
    }
  }

  return { pay, stage, busy: stage !== 'idle' }
}
