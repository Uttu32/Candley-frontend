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
            <div className="hero-slide active empty-state-hero">
              <div className="hero-copy">
                <span className="eyebrow">Curated fragrance rituals</span>
                <h1>Slow moments, beautifully lit.</h1>
                <p>Premium candle collections and home-fragrance essentials, curated for your ritual.</p>
                <Link to="/shop" className="primary-button">
                  Shop the collection
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            heroSlides.map((slide, index) => (
              <div key={slide.id ?? slide._id ?? `${slide.heading}-${index}`} className={`hero-slide ${index === 0 ? 'active' : ''}`}>
                <img src={slide.desktopImage ?? slide.image ?? '/images/musk-rose-collection.png'} alt={slide.heading} />
                <div className="hero-copy">
                  <span className="eyebrow">Curated fragrance rituals</span>
                  <h1>{slide.heading}</h1>
                  <p>{slide.subheading}</p>
                  <Link to={slide.ctaUrl ?? '/shop'} className="primary-button">
                    {slide.ctaText ?? 'Shop now'}
                    <ArrowRight size={16} />
                  </Link>
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

      <section className="container section-spacing editorial-block">
        <div className="editorial-video-card">
          <div className="video-overlay">
            <Sparkles size={22} />
            <span>Light up your moments.</span>
          </div>
          <img src="/images/musk-rose-collection.png" alt="Candley Aroma rose candle collection" />
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
