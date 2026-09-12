import { Link } from 'react-router-dom'

export const LoginPage = () => {
  return (
    <div className="container auth-page section-spacing">
      <div className="auth-card card-surface">
        <h1>Login</h1>
        <form className="auth-form">
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button className="primary-button full-width" type="submit">Sign in</button>
        </form>
        <p>
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}
