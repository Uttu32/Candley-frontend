import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../services/api'
import { postLoginPath, useSession } from '../hooks/useSession'
import { Field, FormError } from '../components/common/Field'
import { PageMeta } from '../components/common/PageMeta'
import { triggerToast } from '../components/common/ToastContainer'

/** One sign-in form for customers and administrators; the destination depends on the role the server returns. */
export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? new URLSearchParams(location.search).get('next')
  const { login, user, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated' && user && !submitting) return <Navigate to={postLoginPath(user, from)} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const signedIn = await login(email.trim(), password)
      triggerToast(`Welcome back, ${signedIn.name.split(' ')[0]}`)
      navigate(postLoginPath(signedIn, from), { replace: true })
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to sign in'))
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <PageMeta title="Sign in" noIndex />
      <div className="auth-card card-surface">
        <h1>Sign in</h1>
        <form className="auth-form" onSubmit={submit} noValidate={false}>
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <FormError message={error} />
          <button className="primary-button full-width" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p><Link to="/forgot-password">Forgot your password?</Link></p>
        <p>New here? <Link to="/register" state={location.state}>Create an account</Link></p>
      </div>
    </div>
  )
}
