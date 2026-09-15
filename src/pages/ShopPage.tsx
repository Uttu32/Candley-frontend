import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { triggerToast } from '../components/common/ToastContainer'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export const ShopPage = () => {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleWishlist, wishlist } = useAppStore()
  const navigate = useNavigate()

  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const maxPrice = Number(searchParams.get('maxPrice') ?? '2500')
  const sort = searchParams.get('sort') ?? 'featured'
  const productQuery = useQuery({
    queryKey: ['products', query, slug, maxPrice, sort],
    queryFn: () => api.products(new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(slug ? { category: slug } : {}),
      maxPrice: String(maxPrice),
      sort: sort === 'price_low_high' ? 'price_low_high' : sort === 'price_high_low' ? 'price_high_low' : sort === 'rating' ? 'rating' : 'featured',
      limit: '100',
    })),
    retry: false,
  })

  const visibleProducts = useMemo(() => {
    if (productQuery.data) return productQuery.data.items
    return []
  }, [maxPrice, productQuery.data, query, searchParams, slug, sort])

  const pageTitle = slug ? slug.replace(/-/g, ' ') : query ? `Search: ${query}` : 'Shop all'

  return (
    <div className="container section-spacing">
      <div className="shop-header">
        <h1>{pageTitle}</h1>
        <p>{visibleProducts.length} curated products</p>
      </div>
      <div className="shop-layout">
        <aside className="filter-panel">
          <h3>Filters</h3>
          <div className="filter-group">
            <label htmlFor="max-price">Max price</label>
            <input
              id="max-price"
              type="range"
              min={500}
              max={2500}
              step={100}
              value={maxPrice}
              onChange={(event) => {
                const next = event.target.value
                setSearchParams((params) => {
                  params.set('maxPrice', next)
                  return params
                })
              }}
            />
            <strong>Up to ₹{maxPrice}</strong>
          </div>
          <div className="filter-group">
            <label htmlFor="sort-select">Sort</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(event) => {
                setSearchParams((params) => {
                  params.set('sort', event.target.value)
                  return params
                })
              }}
            >
              <option value="featured">Featured</option>
              <option value="price_low_high">Price: low to high</option>
              <option value="price_high_low">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </aside>

        <div className="shop-product-area">
          <div className="toolbar-row">
            <input
              aria-label="Search products"
              value={query}
              onChange={(event) => {
                setSearchParams((params) => {
                  if (event.target.value) {
                    params.set('q', event.target.value)
                  } else {
                    params.delete('q')
                  }
                  return params
                })
              }}
              placeholder="Search candles, notes, collections"
            />
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty-state">No matches found. Try vanilla, floral, gifting or candle.</div>
          ) : (
            <div className="product-grid wide">
              {visibleProducts.map((product) => {
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
          )}
        </div>
      </div>
    </div>
  )
}
