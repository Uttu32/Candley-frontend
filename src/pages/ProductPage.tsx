import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError, catalogApi, cmsApi } from '../services/api'
import type { Product } from '../types'
import { formatInr } from '../utils/format'
import { useCartActions } from '../hooks/useCart'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { ProductCard, WishlistButton } from '../components/product/ProductCard'
import { ErrorState, Skeleton } from '../components/common/Feedback'
import { PageMeta } from '../components/common/PageMeta'
import { triggerToast } from '../components/common/ToastContainer'

const Gallery = ({ product }: { product: Product }) => {
  const images = product.images.length ? product.images : product.thumbnailImage ? [product.thumbnailImage] : []
  const [active, setActive] = useState(Math.max(images.indexOf(product.thumbnailImage), 0))
  if (images.length === 0) return <div className="product-gallery"><div className="image-placeholder gallery-main" role="img" aria-label="No image available" /></div>
  return (
    <div className="product-gallery">
      <img className="gallery-main" src={images[active]} alt={`${product.name}, image ${active + 1} of ${images.length}`} decoding="async" />
      {images.length > 1 && (
        <div className="gallery-thumbs" role="group" aria-label="Product images">
          {images.map((image, index) => (
            <button key={image} type="button" className={`gallery-thumb ${index === active ? 'active' : ''}`} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-current={index === active ? 'true' : undefined}>
              <img src={image} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ProductDetail = ({ product, maxPerItem }: { product: Product; maxPerItem: number }) => {
  const { add } = useCartActions()
  const requireAuth = useRequireAuth()
  const variants = (product.variants ?? []).filter((variant) => variant.active !== false)
  const firstAvailable = variants.find((variant) => variant.stock > 0) ?? variants[0]
  const [variantId, setVariantId] = useState(firstAvailable?._id)
  const [quantity, setQuantity] = useState(1)
  const variant = variants.find((entry) => entry._id === variantId)

  const price = variant?.price ?? product.price
  const stock = variant?.stock ?? product.stock
  const sku = variant?.sku ?? product.sku
  const sellable = product.status === 'ACTIVE' && stock > 0
  const maxQuantity = Math.max(1, Math.min(stock, maxPerItem))
  const clampedQuantity = Math.min(quantity, maxQuantity)

  const addToCart = () => requireAuth('Sign in to add items to your cart', () => add.mutate(
    { productId: product._id, variantId: variant?._id, quantity: clampedQuantity },
    { onSuccess: () => triggerToast(`${product.name}${variant ? ` (${variant.label})` : ''} added to cart`) },
  ))

  return (
    <div className="product-info">
      <span className="eyebrow">{product.collection}</span>
      <h1>{product.name}</h1>
      <p>{product.shortDescription}</p>

      <div className="price-row" aria-live="polite">
        <strong>{formatInr(price)}</strong>
        {product.mrp > price && <span><span className="sr-only">MRP </span>{formatInr(product.mrp)}</span>}
      </div>

      {variants.length > 0 && (
        <fieldset className="variant-list">
          <legend>Size</legend>
          {variants.map((entry) => (
            <label key={entry._id} className={`variant-option ${entry._id === variantId ? 'active' : ''} ${entry.stock <= 0 ? 'sold-out' : ''}`}>
              <input type="radio" name="variant" value={entry._id} checked={entry._id === variantId} onChange={() => { setVariantId(entry._id); setQuantity(1) }} />
              <span>{entry.label}</span>
              {entry.stock <= 0 && <small>Sold out</small>}
            </label>
          ))}
        </fieldset>
      )}

      <p className="stock-line" aria-live="polite">
        {product.status === 'OUT_OF_STOCK' || stock <= 0 ? <span className="stock-out">Out of stock</span> : stock <= 5 ? <span className="stock-low">Only {stock} left</span> : <span className="stock-in">In stock</span>}
        <span className="sku">SKU: {sku}</span>
      </p>

      {sellable && (
        <div className="quantity-control inline-quantity" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQuantity(Math.max(1, clampedQuantity - 1))} disabled={clampedQuantity <= 1} aria-label="Decrease quantity">−</button>
          <span aria-live="polite">{clampedQuantity}</span>
          <button type="button" onClick={() => setQuantity(Math.min(maxQuantity, clampedQuantity + 1))} disabled={clampedQuantity >= maxQuantity} aria-label="Increase quantity">+</button>
        </div>
      )}

      <div className="product-actions">
        <button type="button" className="primary-button" onClick={addToCart} disabled={!sellable || add.isPending}>
          {!sellable ? 'Out of stock' : add.isPending ? 'Adding…' : 'Add to cart'}
        </button>
        <WishlistButton product={product} className="secondary-button" />
      </div>

      {product.description && <div className="product-description"><h2>About this candle</h2><p>{product.description}</p></div>}
      {product.fragranceNotes && (product.fragranceNotes.top.length + product.fragranceNotes.heart.length + product.fragranceNotes.base.length > 0) && (
        <dl className="spec-list">
          {(['top', 'heart', 'base'] as const).filter((key) => product.fragranceNotes![key].length).map((key) => (
            <div key={key}><dt>{key[0]!.toUpperCase() + key.slice(1)} notes</dt><dd>{product.fragranceNotes![key].join(', ')}</dd></div>
          ))}
        </dl>
      )}
      {product.specifications && product.specifications.length > 0 && (
        <dl className="spec-list">{product.specifications.map((spec) => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl>
      )}
    </div>
  )
}

export const ProductPage = () => {
  const { slug = '' } = useParams()
  const productQuery = useQuery({ queryKey: ['product', slug], queryFn: () => catalogApi.product(slug), enabled: Boolean(slug) })
  const relatedQuery = useQuery({ queryKey: ['product', slug, 'related'], queryFn: () => catalogApi.related(slug, 4), enabled: productQuery.isSuccess })
  const optionsQuery = useQuery({ queryKey: ['checkout-options'], queryFn: cmsApi.checkoutOptions, staleTime: 5 * 60_000 })

  if (productQuery.isPending) {
    return (
      <div className="container section-spacing product-page" role="status" aria-label="Loading product">
        <Skeleton className="gallery-main" />
        <div className="product-info"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-line short" /></div>
      </div>
    )
  }
  if (productQuery.isError) {
    const notFound = productQuery.error instanceof ApiError && (productQuery.error.isNotFound || productQuery.error.status === 400)
    return (
      <div className="container section-spacing">
        <PageMeta title={notFound ? 'Product not found' : 'Product unavailable'} noIndex />
        {notFound ? (
          <div className="empty-state"><h1>Product not found</h1><p>This candle is no longer available.</p><Link to="/shop" className="primary-button">Browse the collection</Link></div>
        ) : (
          <ErrorState error={productQuery.error} onRetry={() => void productQuery.refetch()} />
        )}
      </div>
    )
  }

  const product = productQuery.data
  return (
    <div className="container section-spacing">
      <PageMeta title={product.seo?.title || product.name} description={product.seo?.description || product.shortDescription} image={product.thumbnailImage || product.images[0]} canonicalPath={`/product/${product.slug}`} />
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/shop">Shop</Link> <span aria-hidden="true">/</span> <span aria-current="page">{product.name}</span>
      </nav>
      <div className="product-page">
        <Gallery key={product._id} product={product} />
        <ProductDetail key={product._id} product={product} maxPerItem={optionsQuery.data?.maxQuantityPerItem ?? 10} />
      </div>
      {(relatedQuery.data?.length ?? 0) > 0 && (
        <section className="section-spacing" aria-labelledby="related-heading">
          <h2 id="related-heading">You may also like</h2>
          <div className="product-grid">{relatedQuery.data!.map((item) => <ProductCard key={item._id} product={item} />)}</div>
        </section>
      )}
    </div>
  )
}
