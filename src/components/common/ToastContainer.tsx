/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'

type Tone = 'info' | 'error'
type Toast = { id: number; message: string; tone: Tone }

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const { message, tone = 'info' } = (event as CustomEvent<{ message: string; tone?: Tone }>).detail ?? {}
      if (!message) return
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-3), { id, message, tone }])
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === 'error' ? 5000 : 2600)
    }
    window.addEventListener('app:toast', handler)
    return () => window.removeEventListener('app:toast', handler)
  }, [])

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.tone === 'error' ? 'toast-error' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export const triggerToast = (message: string, tone: Tone = 'info') => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, tone } }))
}
