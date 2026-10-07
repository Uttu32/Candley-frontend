import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, errorMessage } from '../services/api'
import { postLoginPath, useSession } from '../hooks/useSession'
import { Field, FormError } from '../components/common/Field'
import { PageMeta } from '../components/common/PageMeta'
import { triggerToast } from '../components/common/ToastContainer'
import { validateRegistration } from '../utils/rules'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useSession()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateRegistration(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setError('')
    setSubmitting(true)
    try {
      await authApi.register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      const user = await login(form.email.trim(), form.password)
      triggerToast('Account created. Welcome to Candley Aroma!')
      navigate(postLoginPath(user, (location.state as { from?: string } | null)?.from), { replace: true })
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to create your account'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <PageMeta title="Create account" noIndex />
      <div className="auth-card card-surface">
        <h1>Create account</h1>
        <form className="auth-form" onSubmit={submit} noValidate>
          <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
          <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
          <Field label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
          <Field label="Confirm password" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          <FormError message={error} />
          <button className="primary-button full-width" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
      </div>
    </div>
  )
}
