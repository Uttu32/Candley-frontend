import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, cmsApi } from '../services/api'
import { HeroFallback, HeroSlider } from '../components/hero/HeroSlider'
import { ProductCard } from '../components/product/ProductCard'
import { ErrorState, ProductGridSkeleton, Skeleton } from '../components/common/Feedback'
import { PageMeta } from '../components/common/PageMeta'
import { CdnImage } from '../components/common/CdnImage'

const brandPromises = ['100% Soy Wax', 'Cruelty Free', 'Vegan', 'Clean Fragrance', 'Sustainable Packaging', 'Made in India']

export const HomePage = () => {
  const heroQuery = useQuery({ queryKey: ['hero'], queryFn: cmsApi.heroSlides, staleTime: 60_000 })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  // Best sellers come from real order data; until there are orders, show admin-featured products.
  const bestSellersQuery = useQuery({ queryKey: ['products', 'best-sellers'], queryFn: () => catalogApi.bestSellers(8) })
  const featuredQuery = useQuery({ queryKey: ['products', 'featured-home'], queryFn: () => catalogApi.products({ sort: 'featured', limit: 8 }), enabled: bestSellersQuery.isSuccess && bestSellersQuery.data.length === 0 })

  const showcase = bestSellersQuery.data?.length ? bestSellersQuery.data : featuredQuery.data?.items ?? []
  const showcaseLoading = bestSellersQuery.isPending || (featuredQuery.fetchStatus === 'fetching')
  const categories = (categoriesQuery.data ?? []).filter((category) => (category.count ?? 0) > 0)

  return (
    <div className="home-page">
      <PageMeta description="Hand-poured soy candles and home fragrance, crafted in India. Shop luxury candles, gift sets and seasonal collections." canonicalPath="/" />
      {heroQuery.isPending ? (
        <Skeleton className="hero-slider" label="Loading featured collections" />
      ) : heroQuery.data?.length ? (
        <HeroSlider slides={heroQuery.data} />
      ) : (
        <HeroFallback />
      )}

      {categories.length > 0 && (
        <section className="container section-spacing" aria-labelledby="categories-heading">
          <div className="section-head">
            <span className="eyebrow">Shop by scent</span>
            <h2 id="categories-heading">Explore our collections</h2>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category._id} to={`/category/${category.slug}`} className="category-card">
                {category.image ? <CdnImage src={category.image} width={640} /> : <div className="image-placeholder" />}
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.count} {category.count === 1 ? 'product' : 'products'}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container section-spacing" aria-labelledby="bestsellers-heading">
        <div className="section-head">
          <span className="eyebrow">{bestSellersQuery.data?.length ? 'Best sellers' : 'Featured'}</span>
          <h2 id="bestsellers-heading">Made to be gifted and kept</h2>
        </div>
        {showcaseLoading ? (
          <ProductGridSkeleton count={4} />
        ) : bestSellersQuery.isError ? (
          <ErrorState error={bestSellersQuery.error} title="Products could not be loaded" onRetry={() => void bestSellersQuery.refetch()} />
        ) : showcase.length === 0 ? (
          <div className="empty-state">New candles are on their way. Please check back soon.</div>
        ) : (
          <div className="product-grid">{showcase.map((product) => <ProductCard key={product._id} product={product} />)}</div>
        )}
        <div className="section-cta"><Link to="/shop" className="secondary-button">Shop all candles</Link></div>
      </section>

      <section className="container section-spacing" aria-labelledby="promise-heading">
        <div className="section-head">
          <span className="eyebrow">Brand promise</span>
          <h2 id="promise-heading">Crafted with warm rituals in mind</h2>
        </div>
        <ul className="commitment-grid">
          {brandPromises.map((item) => (
            <li key={item} className="commitment-item"><Sparkles size={18} aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
