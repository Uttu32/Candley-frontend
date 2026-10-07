const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 })

/** Formats a server-provided rupee amount for display. Never used to derive amounts. */
export const formatInr = (value: number | null | undefined) => (typeof value === 'number' ? inr.format(value) : '—')

export const formatDate = (value: string | Date | null | undefined, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  // toLocaleDateString rejects timeStyle, so date-times go through toLocaleString.
  return withTime ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : date.toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export const humanize = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())

/** Turns a URL slug into a display title ("luxury-candles" → "Luxury candles"). */
export const titleFromSlug = (slug: string) => humanize(slug.replaceAll('-', ' '))

/** Random key for idempotent checkout submissions. */
export const newIdempotencyKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
