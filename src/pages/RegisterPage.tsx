import { Link } from 'react-router-dom'

export const RegisterPage = () => {
  return (
    <div className="container auth-page section-spacing">
      <div className="auth-card card-surface">
        <h1>Create account</h1>
        <form className="auth-form">
          <input placeholder="Full name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button className="primary-button full-width" type="submit">Register</button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
