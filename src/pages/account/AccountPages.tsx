import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi, authApi, errorMessage } from '../../services/api'
import type { AddressInput, AuthUser, SavedAddress } from '../../types'
import { useSession } from '../../hooks/useSession'
import { useWishlist } from '../../hooks/useWishlist'
import { AddressForm } from '../../components/account/AddressForm'
import { ProductCard } from '../../components/product/ProductCard'
import { ErrorState, ProductGridSkeleton, Skeleton } from '../../components/common/Feedback'
import { Field, FormError } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'

const ProfileForm = ({ user }: { user: AuthUser }) => {
  const { setSession } = useSession()
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone ?? '', dateOfBirth: user.dateOfBirth ?? '' })
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => authApi.updateProfile({ ...form, name: form.name.trim(), email: form.email.trim() }),
    onSuccess: (updated) => { setSession(updated); triggerToast('Profile updated') },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (form.name.trim().length < 2) return setError('Enter your name (at least 2 characters)')
    if (form.phone && !/^[\d+\-\s()]*$/.test(form.phone)) return setError('Enter a valid phone number')
    save.mutate()
  }
  return (
    <form className="account-section" onSubmit={submit}>
      <h2>Profile</h2>
      <div className="field-grid">
        <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} hint={user.emailVerified ? 'Verified' : undefined} />
        <Field label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
      </div>
      <FormError message={error} />
      <div className="profile-actions"><button type="submit" className="primary-button" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  )
}

export const ProfilePage = () => {
  const { user } = useSession()
  return user ? <ProfileForm key={user.id} user={user} /> : null
}

export const AddressesPage = () => {
  const queryClient = useQueryClient()
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: accountApi.addresses })
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null)
  const [error, setError] = useState('')
  const settle = (data: SavedAddress[], message: string) => { queryClient.setQueryData(['addresses'], data); setEditing(null); setError(''); triggerToast(message) }
  const onError = (mutationError: unknown) => setError(errorMessage(mutationError))
  const add = useMutation({ mutationFn: accountApi.addAddress, onSuccess: (data) => settle(data, 'Address saved'), onError })
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<AddressInput> }) => accountApi.updateAddress(id, input), onSuccess: (data) => settle(data, 'Address updated'), onError })
  const remove = useMutation({ mutationFn: accountApi.removeAddress, onSuccess: (data) => settle(data, 'Address removed'), onError })

  if (addresses.isPending) return <Skeleton className="skeleton-block" label="Loading addresses" />
  if (addresses.isError) return <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />

  return (
    <section className="account-section">
      <div className="section-row"><h2>Addresses</h2>{editing === null && addresses.data.length < 10 && <button type="button" className="primary-button small" onClick={() => setEditing('new')}>Add address</button>}</div>
      <FormError message={error} />
      {editing === 'new' && <AddressForm submitLabel="Save address" busy={add.isPending} onSubmit={(input) => add.mutate(input)} onCancel={() => setEditing(null)} />}
      {addresses.data.length === 0 && editing === null && <p className="account-muted">You have no saved addresses yet.</p>}
      <ul className="address-list">
        {addresses.data.map((address) => (
          <li key={address._id} className="address-card">
            {editing !== 'new' && editing?._id === address._id ? (
              <AddressForm initial={address} submitLabel="Update address" busy={update.isPending} onSubmit={(input) => update.mutate({ id: address._id, input })} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <p><strong>{address.label || 'Address'}</strong>{address.isDefault && <span className="pill">Default</span>}</p>
                <p>{address.name}<br />{address.addressLine1}{address.addressLine2 ? <><br />{address.addressLine2}</> : null}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}<br />{address.phone}</p>
                <div className="profile-actions">
                  <button type="button" className="text-button" onClick={() => setEditing(address)}>Edit</button>
                  {!address.isDefault && <button type="button" className="text-button" onClick={() => update.mutate({ id: address._id, input: { isDefault: true } })}>Make default</button>}
                  <button type="button" className="text-button danger" onClick={() => { if (window.confirm('Remove this address?')) remove.mutate(address._id) }}>Remove</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export const WishlistPage = () => {
  const wishlist = useWishlist()
  if (wishlist.isPending) return <ProductGridSkeleton count={3} />
  if (wishlist.isError) return <ErrorState error={wishlist.error} onRetry={() => void wishlist.refetch()} />
  const products = wishlist.data.productIds
  return (
    <section className="account-section">
      <h2>Wishlist</h2>
      {products.length === 0 ? (
        <div className="empty-state"><p>Tap the heart on any product to save it here.</p><Link to="/shop" className="primary-button">Browse candles</Link></div>
      ) : (
        <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>
      )}
    </section>
  )
}

export const PasswordSettingsPage = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const change = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: () => { setForm({ currentPassword: '', newPassword: '', confirm: '' }); triggerToast('Password changed. Other devices have been signed out.') },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters')
    if (form.newPassword !== form.confirm) return setError('New passwords do not match')
    change.mutate()
  }
  return (
    <form className="account-section" onSubmit={submit}>
      <h2>Change password</h2>
      <div className="field-grid">
        <Field label="Current password" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={set('currentPassword')} />
        <Field label="New password" type="password" autoComplete="new-password" required value={form.newPassword} onChange={set('newPassword')} hint="At least 8 characters" />
        <Field label="Confirm new password" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
      </div>
      <FormError message={error} />
      <div className="profile-actions"><button type="submit" className="primary-button" disabled={change.isPending}>{change.isPending ? 'Saving…' : 'Change password'}</button></div>
    </form>
  )
}
