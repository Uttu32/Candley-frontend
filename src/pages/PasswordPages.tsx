import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, errorMessage } from '../services/api'
import { Field, FormError } from '../components/common/Field'
import { PageMeta } from '../components/common/PageMeta'
import { triggerToast } from '../components/common/ToastContainer'

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await authApi.forgotPassword(email.trim())
      // The server responds identically whether or not the account exists.
      setSentMessage('If an account exists for that email, we have sent a link to reset your password. It expires in 30 minutes.')
    } catch (submissionError) {
      setError(errorMessage(submissionError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <PageMeta title="Forgot password" noIndex />
      <div className="auth-card card-surface">
        <h1>Reset your password</h1>
        {sentMessage ? (
          <p role="status">{sentMessage}</p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <FormError message={error} />
            <button className="primary-button full-width" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        <p><Link to="/login">Back to sign in</Link></p>
      </div>
    </div>
  )
}

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const tokenValid = /^[a-f\d]{64}$/i.test(token)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setSubmitting(true)
    setError('')
    try {
      await authApi.resetPassword({ token, password })
      triggerToast('Password updated. Please sign in.')
      navigate('/login', { replace: true })
    } catch (submissionError) {
      setError(errorMessage(submissionError))
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <PageMeta title="Choose a new password" noIndex />
      <div className="auth-card card-surface">
        <h1>Choose a new password</h1>
        {!tokenValid ? (
          <div role="alert"><p>This reset link is invalid or incomplete.</p><Link to="/forgot-password" className="primary-button">Request a new link</Link></div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <Field label="New password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} hint="At least 8 characters" />
            <Field label="Confirm new password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <FormError message={error} />
            <button className="primary-button full-width" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
