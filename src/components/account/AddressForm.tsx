import { useState, type FormEvent } from 'react'
import type { AddressInput } from '../../types'
import { Field } from '../common/Field'
import { emptyAddress, validateAddress } from '../../utils/rules'

type Props = { initial?: AddressInput; submitLabel: string; busy?: boolean; onSubmit: (address: AddressInput) => void; onCancel?: () => void; showDefaultToggle?: boolean }

export const AddressForm = ({ initial = emptyAddress, submitLabel, busy, onSubmit, onCancel, showDefaultToggle = true }: Props) => {
  const [address, setAddress] = useState<AddressInput>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({})
  const set = (key: keyof AddressInput) => (event: { target: { value: string } }) => setAddress((current) => ({ ...current, [key]: event.target.value }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const found = validateAddress(address)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(address)
  }

  return (
    <form className="address-form" onSubmit={submit} noValidate aria-label="Address">
      <div className="field-grid">
        <Field label="Full name" autoComplete="name" required value={address.name} onChange={set('name')} error={errors.name} />
        <Field label="Phone" type="tel" autoComplete="tel" required value={address.phone} onChange={set('phone')} error={errors.phone} />
        <Field label="Address line 1" autoComplete="address-line1" required value={address.addressLine1} onChange={set('addressLine1')} error={errors.addressLine1} className="span-2" />
        <Field label="Address line 2" autoComplete="address-line2" value={address.addressLine2 ?? ''} onChange={set('addressLine2')} className="span-2" />
        <Field label="City" autoComplete="address-level2" required value={address.city} onChange={set('city')} error={errors.city} />
        <Field label="State" autoComplete="address-level1" required value={address.state} onChange={set('state')} error={errors.state} />
        <Field label="PIN code" autoComplete="postal-code" inputMode="numeric" required value={address.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
        <Field label="Country" autoComplete="country-name" required value={address.country} onChange={set('country')} error={errors.country} />
        <Field label="Label" placeholder="Home, Office…" value={address.label ?? ''} onChange={set('label')} />
      </div>
      {showDefaultToggle && (
        <label className="checkbox-row">
          <input type="checkbox" checked={Boolean(address.isDefault)} onChange={(event) => setAddress((current) => ({ ...current, isDefault: event.target.checked }))} />
          Make this my default address
        </label>
      )}
      <div className="profile-actions">
        <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
