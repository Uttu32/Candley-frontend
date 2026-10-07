import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, errorMessage } from '../../services/api'
import type { Announcement, Coupon, StoreSettings } from '../../types'
import { formatDate, formatInr } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { Field, FormError, SelectField } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { isSafeLink, validateCoupon, type CouponFormState } from '../../utils/rules'

const emptyCoupon: CouponFormState = { code: '', description: '', discountType: 'PERCENT', amount: '', minOrderValue: '0', maxDiscount: '', usageLimit: '', perCustomerLimit: '', startsAt: '', endsAt: '', active: true }
const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value))

export const AdminCouponsPage = () => {
  const queryClient = useQueryClient()
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => adminApi.coupons({ limit: 100 }) })
  const [form, setForm] = useState<CouponFormState | null>(null)
  const [error, setError] = useState('')
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
  const create = useMutation({
    mutationFn: (input: CouponFormState) => adminApi.createCoupon({
      code: input.code.toUpperCase(), description: input.description, discountType: input.discountType, amount: Number(input.amount), minOrderValue: Number(input.minOrderValue || 0),
      maxDiscount: optionalNumber(input.maxDiscount), usageLimit: optionalNumber(input.usageLimit), perCustomerLimit: optionalNumber(input.perCustomerLimit),
      startsAt: input.startsAt ? new Date(input.startsAt).toISOString() : null, endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null, active: input.active,
    }),
    onSuccess: () => { invalidate(); setForm(null); setError(''); triggerToast('Coupon created') },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const toggle = useMutation({ mutationFn: (coupon: Coupon) => adminApi.updateCoupon(coupon._id, { active: !coupon.active }), onSuccess: invalidate, onError: (mutationError) => triggerToast(errorMessage(mutationError), 'error') })
  const remove = useMutation({
    mutationFn: (coupon: Coupon) => adminApi.deleteCoupon(coupon._id),
    onSuccess: (result) => { invalidate(); triggerToast(result.deleted ? 'Coupon deleted' : 'Coupon was used, so it was deactivated') },
    onError: (mutationError) => triggerToast(errorMessage(mutationError), 'error'),
  })
  const set = (key: keyof CouponFormState) => (event: { target: { value: string } }) => setForm((current) => current && ({ ...current, [key]: event.target.value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return
    const problem = validateCoupon(form)
    setError(problem ?? '')
    if (!problem) create.mutate(form)
  }

  return (
    <section>
      <div className="section-row"><h1>Coupons</h1>{!form && <button type="button" className="primary-button" onClick={() => setForm(emptyCoupon)}>Add coupon</button>}</div>
      {form && (
        <form className="admin-panel" onSubmit={submit} noValidate>
          <div className="field-grid">
            <Field label="Code" required value={form.code} onChange={set('code')} />
            <SelectField label="Type" value={form.discountType} onChange={set('discountType')}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount (₹)</option></SelectField>
            <Field label={form.discountType === 'PERCENT' ? 'Discount (%)' : 'Discount (₹)'} type="number" min={0} required value={form.amount} onChange={set('amount')} />
            <Field label="Maximum discount (₹)" type="number" min={0} value={form.maxDiscount} onChange={set('maxDiscount')} hint="Optional" />
            <Field label="Minimum order (₹)" type="number" min={0} value={form.minOrderValue} onChange={set('minOrderValue')} />
            <Field label="Total uses" type="number" min={1} value={form.usageLimit} onChange={set('usageLimit')} hint="Optional" />
            <Field label="Uses per customer" type="number" min={1} value={form.perCustomerLimit} onChange={set('perCustomerLimit')} hint="Optional" />
            <Field label="Description" value={form.description} onChange={set('description')} />
            <Field label="Starts" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
            <Field label="Ends" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          </div>
          <FormError message={error} />
          <div className="profile-actions">
            <button type="submit" className="primary-button" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create coupon'}</button>
            <button type="button" className="secondary-button" onClick={() => { setForm(null); setError('') }}>Cancel</button>
          </div>
        </form>
      )}
      {coupons.isPending ? <Skeleton className="skeleton-block" label="Loading coupons" /> : coupons.isError ? <ErrorState error={coupons.error} onRetry={() => void coupons.refetch()} /> : coupons.data.items.length === 0 ? (
        <div className="empty-state"><p>No coupons yet.</p></div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col">Used</th><th scope="col">Valid</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {coupons.data.items.map((coupon) => (
                <tr key={coupon._id}>
                  <td><strong>{coupon.code}</strong></td>
                  <td>{coupon.discountType === 'PERCENT' ? `${coupon.amount}%${coupon.maxDiscount ? ` (max ${formatInr(coupon.maxDiscount)})` : ''}` : formatInr(coupon.amount)}{coupon.minOrderValue ? ` · min ${formatInr(coupon.minOrderValue)}` : ''}</td>
                  <td>{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</td>
                  <td>{coupon.startsAt ? formatDate(coupon.startsAt) : 'Now'} – {coupon.endsAt ? formatDate(coupon.endsAt) : 'No end'}</td>
                  <td><span className={`pill ${coupon.active ? 'pill-success' : ''}`}>{coupon.active ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="cell-actions">
                    <button type="button" className="text-button" onClick={() => toggle.mutate(coupon)}>{coupon.active ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" className="text-button danger" onClick={() => { if (window.confirm(`Delete ${coupon.code}?`)) remove.mutate(coupon) }}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const StoreSettingsForm = ({ initial }: { initial: StoreSettings }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ shippingFee: String(initial.shippingFee), freeShippingThreshold: String(initial.freeShippingThreshold), codEnabled: initial.codEnabled, codMaxOrderValue: initial.codMaxOrderValue == null ? '' : String(initial.codMaxOrderValue), maxQuantityPerItem: String(initial.maxQuantityPerItem) })
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => adminApi.updateStoreSettings({ shippingFee: Number(form.shippingFee), freeShippingThreshold: Number(form.freeShippingThreshold), codEnabled: form.codEnabled, codMaxOrderValue: form.codMaxOrderValue === '' ? null : Number(form.codMaxOrderValue), maxQuantityPerItem: Number(form.maxQuantityPerItem) }),
    onSuccess: (settings) => { queryClient.setQueryData(['admin', 'store-settings'], settings); queryClient.invalidateQueries({ queryKey: ['checkout-options'] }); setError(''); triggerToast('Store settings saved') },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const quantity = Number(form.maxQuantityPerItem)
    if ([form.shippingFee, form.freeShippingThreshold].some((value) => !(Number(value) >= 0)) || (form.codMaxOrderValue !== '' && !(Number(form.codMaxOrderValue) >= 0))) return setError('Amounts must be zero or more')
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return setError('Maximum quantity must be between 1 and 99')
    save.mutate()
  }
  return (
    <form className="admin-panel" onSubmit={submit} noValidate>
      <h2>Checkout</h2>
      <div className="field-grid">
        <Field label="Shipping fee (₹)" type="number" min={0} value={form.shippingFee} onChange={set('shippingFee')} />
        <Field label="Free shipping from (₹)" type="number" min={0} value={form.freeShippingThreshold} onChange={set('freeShippingThreshold')} hint="Applied to the order total after discounts" />
        <Field label="Maximum COD order (₹)" type="number" min={0} value={form.codMaxOrderValue} onChange={set('codMaxOrderValue')} hint="Leave blank for no limit" />
        <Field label="Max quantity per item" type="number" min={1} max={99} value={form.maxQuantityPerItem} onChange={set('maxQuantityPerItem')} />
        <label className="checkbox-row"><input type="checkbox" checked={form.codEnabled} onChange={(event) => setForm((current) => ({ ...current, codEnabled: event.target.checked }))} /> Offer cash on delivery</label>
      </div>
      <FormError message={error} />
      <button type="submit" className="primary-button" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save checkout settings'}</button>
    </form>
  )
}

const AnnouncementForm = ({ initial, freeShippingThreshold }: { initial: Announcement | null; freeShippingThreshold: number }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ enabled: initial?.enabled ?? false, message: initial?.message ?? '', ctaText: initial?.ctaText ?? '', ctaUrl: initial?.ctaUrl ?? '' })
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => adminApi.updateAnnouncement({ enabled: form.enabled, message: form.message.trim(), ctaText: form.ctaText.trim(), ctaUrl: form.ctaUrl.trim() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcement'] }); setError(''); triggerToast('Announcement saved') },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.enabled && !form.message.trim()) return setError('Enter a message to show')
    if (form.ctaUrl && !isSafeLink(form.ctaUrl)) return setError('Link must be a site path like /shop or an https:// URL')
    save.mutate()
  }
  return (
    <form className="admin-panel" onSubmit={submit} noValidate>
      <h2>Announcement bar</h2>
      <div className="field-grid">
        <Field label="Message" maxLength={220} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="span-2" hint={`Tip: checkout currently gives free shipping from ${formatInr(freeShippingThreshold)}. Keep the message consistent.`} />
        <Field label="Link text" maxLength={80} value={form.ctaText} onChange={(event) => setForm((current) => ({ ...current, ctaText: event.target.value }))} />
        <Field label="Link" value={form.ctaUrl} onChange={(event) => setForm((current) => ({ ...current, ctaUrl: event.target.value }))} />
        <label className="checkbox-row"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} /> Show the announcement bar</label>
      </div>
      <FormError message={error} />
      <button type="submit" className="primary-button" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save announcement'}</button>
    </form>
  )
}

export const AdminSettingsPage = () => {
  const store = useQuery({ queryKey: ['admin', 'store-settings'], queryFn: adminApi.storeSettings })
  const announcement = useQuery({ queryKey: ['admin', 'announcement'], queryFn: adminApi.announcement })
  return (
    <section>
      <h1>Settings</h1>
      {store.isPending || announcement.isPending ? <Skeleton className="skeleton-block" label="Loading settings" /> : store.isError ? <ErrorState error={store.error} onRetry={() => void store.refetch()} /> : announcement.isError ? <ErrorState error={announcement.error} onRetry={() => void announcement.refetch()} /> : (
        <>
          <StoreSettingsForm initial={store.data} />
          <AnnouncementForm initial={announcement.data} freeShippingThreshold={store.data.freeShippingThreshold} />
        </>
      )}
    </section>
  )
}
