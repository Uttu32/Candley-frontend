/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'

type Toast = {
  id: number
  message: string
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>
      const message = customEvent.detail?.message
      if (!message) return

      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, message }])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 2200)
    }

    window.addEventListener('app:toast', handler)
    return () => window.removeEventListener('app:toast', handler)
  }, [])

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-item">
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export const triggerToast = (message: string) => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message } }))
}
