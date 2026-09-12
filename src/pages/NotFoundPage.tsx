import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div className="container section-spacing not-found-page">
      <h1>Page not found</h1>
      <p>The scent you’re looking for is not in this room.</p>
      <Link to="/" className="primary-button">Back home</Link>
    </div>
  )
}
