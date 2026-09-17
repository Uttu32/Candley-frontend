import { ArrowRight, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export const HomePage = () => {
  const { addToCart, toggleWishlist, wishlist } = useAppStore()
  const navigate = useNavigate()
  const productsQuery = useQuery({ queryKey: ['products', 'home'], queryFn: () => api.products(new URLSearchParams({ sort: 'featured', limit: '20' })), retry: false })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories, retry: false })
  const heroQuery = useQuery({ queryKey: ['heroSlides'], queryFn: api.heroSlides, retry: false })
  const products = productsQuery.data?.items ?? []
  const categories = categoriesQuery.data ?? []
  const heroSlides = (heroQuery.data ?? []).filter((slide) => slide.active !== false)

  return (
    <div className="home-page">
      <section className="hero-section container">
        <div className="hero-carousel">
          {heroSlides.length === 0 ? (
            <div className="hero-slide active empty-state-hero"><div className="empty-state">No hero media has been published yet.</div></div>
          ) : (
            heroSlides.map((slide, index) => (
              <div key={slide.id ?? slide._id ?? `${slide.heading}-${index}`} className={`hero-slide ${index === 0 ? 'active' : ''}`}>
                {slide.desktopImage && <img src={slide.desktopImage} alt={slide.heading} />}
                <div className="hero-copy">
                  <h1>{slide.heading}</h1>
                  <p>{slide.subheading}</p>
                  {slide.ctaUrl && slide.ctaText && <Link to={slide.ctaUrl} className="primary-button">{slide.ctaText}<ArrowRight size={16} /></Link>}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Shop by scent</span>
          <h2>Explore our collections</h2>
        </div>
        <div className="category-grid">
          {categories.length === 0 ? (
            <div className="empty-state full-width">No categories have been published yet.</div>
          ) : (
            categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="category-card">
                <img src={category.image} alt={category.name} />
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.count} products</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Best sellers</span>
          <h2>Made to be gifted and kept</h2>
        </div>
        <div className="product-grid">
          {products.length === 0 ? (
            <div className="empty-state full-width">No products are available yet. The catalog will appear here once the admin publishes inventory.</div>
          ) : products.map((product) => {
            const isLiked = wishlist.includes(product.id)
            return (
              <article
                key={product.id}
                className="product-card"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/product/${product.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/product/${product.slug}`)
                  }
                }}
              >
                <div className="product-media">
                  <img src={product.images[0]} alt={product.name} />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <button
                    type="button"
                    className={`wishlist-button ${isLiked ? 'active' : ''}`}
                    aria-label={isLiked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                    aria-pressed={isLiked}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleWishlist(product.id)
                      triggerToast(isLiked ? 'Removed from wishlist' : 'Added to wishlist')
                    }}
                  >
                    <span aria-hidden="true">♥</span>
                    <span className="wishlist-state">{isLiked ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
                <div className="product-body">
                  <div className="product-meta">
                    <span>{product.collection}</span>
                    <span>{product.fragrance}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <div className="price-row">
                    <strong>₹{product.price}</strong>
                    <span>₹{product.mrp}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={(event) => {
                        event.stopPropagation()
                        addToCart(product.id, 1, product.variants?.[0]?.id)
                        triggerToast('Added to cart')
                      }}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="container section-spacing">
        <div className="section-head">
          <span className="eyebrow">Brand promise</span>
          <h2>Crafted with warm rituals in mind</h2>
        </div>
        <div className="commitment-grid">
          {['100% Soy Wax', 'Cruelty Free', 'Vegan', 'Clean Fragrance', 'Sustainable Packaging', 'Made in India'].map((item) => (
            <div key={item} className="commitment-item">
              <Sparkles size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
