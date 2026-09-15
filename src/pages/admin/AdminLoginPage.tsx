import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { triggerToast } from '../../components/common/ToastContainer'
import { api } from '../../services/api'
import { useAppStore } from '../../store/useAppStore'

export const AdminLoginPage = () => {
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await api.adminLogin({ email, password })
      setUser(session.user)
      triggerToast('Admin access granted')
      navigate('/admin/dashboard')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container auth-page section-spacing">
      <div className="auth-card card-surface">
        <span className="eyebrow">Admin portal</span>
        <h1>Sign in</h1>
        <form className="auth-form" onSubmit={submit}>
          <input required type="email" placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input required minLength={8} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Access dashboard'}
          </button>
        </form>
        <p>
          <Link to="/login">Customer login</Link>
        </p>
      </div>
    </div>
  )
}
