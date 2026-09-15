import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { triggerToast } from '../components/common/ToastContainer'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await api.login({ email, password })
      triggerToast('Welcome back')
      navigate('/account')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <div className="auth-card card-surface">
        <h1>Login</h1>
        <form className="auth-form" onSubmit={submit}>
          <input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input required minLength={8} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-width" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p>
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}
