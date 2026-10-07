import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi, type ProductQuery } from '../services/api'
import { ProductCard } from '../components/product/ProductCard'
import { Pagination } from '../components/common/Pagination'
import { ErrorState, ProductGridSkeleton } from '../components/common/Feedback'
import { PageMeta } from '../components/common/PageMeta'
import { titleFromSlug } from '../utils/format'
import { SlidersHorizontal } from 'lucide-react'

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low_high', label: 'Price: low to high' },
  { value: 'price_high_low', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
] as const

const priceRanges = [
  { value: '', label: 'Any price' },
  { value: '0-999', label: 'Under ₹1,000' },
  { value: '1000-1999', label: '₹1,000 – ₹1,999' },
  { value: '2000-', label: '₹2,000 and above' },
]

const PAGE_SIZE = 12
const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Reads the product query from the route and URL so every filter is shareable and survives reloads. */
const useShopQuery = () => {
  const params = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // Legacy department routes (/candles, /gift-sets, …) map to the category of the same slug.
  const pathCategory = ['/candles', '/diffusers', '/room-sprays', '/gift-sets'].includes(location.pathname) ? location.pathname.slice(1) : undefined
  const isCollection = location.pathname.startsWith('/collection/')
  const category = (isCollection ? undefined : params.slug) ?? pathCategory ?? searchParams.get('category') ?? undefined
  const collection = (isCollection ? params.slug : undefined) ?? searchParams.get('collection') ?? undefined
  const [minPrice, maxPrice] = (searchParams.get('price') ?? '').split('-').map((value) => (value ? Number(value) : undefined))
  const sort = sortOptions.some((option) => option.value === searchParams.get('sort')) ? searchParams.get('sort')! : 'featured'
  const query: ProductQuery = {
    q: searchParams.get('q')?.trim() || undefined,
    category,
    collection,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    inStock: searchParams.get('inStock') === 'true' || undefined,
    sort,
    page: positiveInt(searchParams.get('page'), 1),
    limit: PAGE_SIZE,
  }
  return { query, routeCategory: params.slug && !isCollection ? params.slug : pathCategory, routeCollection: isCollection ? params.slug : undefined }
}

export const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query, routeCategory, routeCollection } = useShopQuery()
  const [searchText, setSearchText] = useState(query.q ?? '')
  // On phones the filter panel is collapsed behind a button so products appear first.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const productsQuery = useQuery({ queryKey: ['products', 'list', query], queryFn: ({ signal }) => catalogApi.products(query, signal), placeholderData: keepPreviousData })

  const updateParams = (changes: Record<string, string | undefined>, resetPage = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
      if (resetPage) next.delete('page')
      return next
    }, { preventScrollReset: true }) // filters and search update in place; paging scrolls explicitly
  }

  // Debounce typing into the URL; the URL stays the source of truth.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((searchParams.get('q') ?? '') !== searchText.trim()) updateParams({ q: searchText.trim() || undefined })
    }, 350)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  const categoryName = categoriesQuery.data?.find((category) => category.slug === (routeCategory ?? query.category))?.name
  const title = routeCollection ? titleFromSlug(routeCollection) : routeCategory ? categoryName ?? titleFromSlug(routeCategory) : query.q ? `Results for “${query.q}”` : 'Shop all'
  const data = productsQuery.data
  const priceValue = searchParams.get('price') ?? ''
  const activeFilterCount = [query.category, priceValue, query.inStock, query.sort && query.sort !== 'featured' ? query.sort : undefined].filter(Boolean).length

  return (
    <div className="container section-spacing">
      <PageMeta
        title={title}
        description={routeCategory ? `Shop ${title.toLowerCase()} from Candley Aroma: hand-poured, clean-burning home fragrance.` : 'Browse hand-poured soy candles and home fragrance from Candley Aroma.'}
        canonicalPath={routeCategory ? `/category/${routeCategory}` : routeCollection ? `/collection/${routeCollection}` : '/shop'}
        noIndex={Boolean(query.q)}
      />
      <div className="shop-header">
        <div>
          <h1>{title}</h1>
          <p aria-live="polite">{data ? `${data.pagination.total} ${data.pagination.total === 1 ? 'product' : 'products'}` : ' '}</p>
        </div>
        <button type="button" className="filter-toggle" aria-expanded={filtersOpen} aria-controls="shop-filters" onClick={() => setFiltersOpen((open) => !open)}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          {filtersOpen ? 'Hide filters' : 'Filters'}
          {activeFilterCount > 0 && <span className="filter-toggle-count">{activeFilterCount}</span>}
        </button>
      </div>
      <div className="shop-layout">
        <aside id="shop-filters" className={`filter-panel ${filtersOpen ? 'is-open' : ''}`} aria-label="Filters">
          <h2 className="filter-title">Filters</h2>
          {!routeCategory && !routeCollection && (categoriesQuery.data?.length ?? 0) > 0 && (
            <div className="filter-group">
              <label htmlFor="category-filter">Category</label>
              <select id="category-filter" value={query.category ?? ''} onChange={(event) => updateParams({ category: event.target.value || undefined })}>
                <option value="">All categories</option>
                {categoriesQuery.data!.map((category) => <option key={category._id} value={category.slug}>{category.name}</option>)}
              </select>
            </div>
          )}
          {(routeCategory || routeCollection) && <Link to="/shop" className="text-button">← All products</Link>}
          <div className="filter-group">
            <label htmlFor="price-filter">Price</label>
            <select id="price-filter" value={priceValue} onChange={(event) => updateParams({ price: event.target.value || undefined })}>
              {priceRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="sort-select">Sort by</label>
            <select id="sort-select" value={query.sort} onChange={(event) => updateParams({ sort: event.target.value === 'featured' ? undefined : event.target.value })}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(query.inStock)} onChange={(event) => updateParams({ inStock: event.target.checked ? 'true' : undefined })} />
            In stock only
          </label>
        </aside>

        <div className="shop-product-area">
          <div className="toolbar-row">
            <label htmlFor="shop-search" className="sr-only">Search products</label>
            <input id="shop-search" type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search candles, notes, collections" />
          </div>

          {productsQuery.isPending ? (
            <ProductGridSkeleton />
          ) : productsQuery.isError ? (
            <ErrorState error={productsQuery.error} title="Products could not be loaded" onRetry={() => void productsQuery.refetch()} />
          ) : data!.items.length === 0 ? (
            <div className="empty-state">
              <h2>No matching products</h2>
              <p>Try a different search or clear the filters.</p>
              <Link to="/shop" className="secondary-button">Clear filters</Link>
            </div>
          ) : (
            <>
              <div className={`product-grid wide ${productsQuery.isPlaceholderData ? 'is-refreshing' : ''}`} aria-busy={productsQuery.isFetching}>
                {data!.items.map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
              <Pagination pagination={data!.pagination} onPageChange={(page) => { updateParams({ page: page > 1 ? String(page) : undefined }, false); window.scrollTo({ top: 0 }) }} label="Product pages" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
