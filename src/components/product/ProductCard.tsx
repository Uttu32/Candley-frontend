import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Product } from '../../types'
import { formatInr } from '../../utils/format'
import { useCartActions } from '../../hooks/useCart'
import { useToggleWishlist, useWishlist } from '../../hooks/useWishlist'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { triggerToast } from '../common/ToastContainer'
import { displayPrice, isPurchasable } from '../../utils/rules'
import { CdnImage } from '../common/CdnImage'

export const WishlistButton = ({ product, className = '' }: { product: Product; className?: string }) => {
  const wishlist = useWishlist()
  const toggle = useToggleWishlist()
  const requireAuth = useRequireAuth()
  const saved = wishlist.has(product._id)
  return (
    <button
      type="button"
      className={`wishlist-button ${saved ? 'active' : ''} ${className}`}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={(event) => {
        event.preventDefault()
        requireAuth('Sign in to save products to your wishlist', () => toggle.mutate({ product, saved }))
      }}
    >
      <Heart size={16} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      <span className="wishlist-state">{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

export const ProductCard = ({ product }: { product: Product }) => {
  const { add } = useCartActions()
  const requireAuth = useRequireAuth()
  const { from, price } = displayPrice(product)
  const activeVariants = (product.variants ?? []).filter((variant) => variant.active !== false)
  const needsChoice = activeVariants.length > 1
  const purchasable = isPurchasable(product)
  const href = `/product/${product.slug}`

  return (
    <article className="product-card">
      <div className="product-media">
        <Link to={href} tabIndex={-1} aria-hidden="true">
          {product.thumbnailImage || product.images[0]
            ? <CdnImage src={product.thumbnailImage || product.images[0]!} width={420} />
            : <div className="image-placeholder" />}
        </Link>
        {!purchasable ? <span className="product-badge muted">Sold out</span> : product.badge && <span className="product-badge">{product.badge}</span>}
        <WishlistButton product={product} />
      </div>
      <div className="product-body">
        <div className="product-meta px-2">
          <span>{product.collection}</span>
          <span>{product.fragrance}</span>
        </div>
        <h3 className="px-2"><Link to={href} className="product-title-link">{product.name}</Link></h3>
        <div className="price-row px-2">
          <strong>{from ? `From ${formatInr(price)}` : formatInr(price)}</strong>
          {!from && product.mrp > price && <span><span className="sr-only">MRP </span>{formatInr(product.mrp)}</span>}
        </div>
        <div className="card-actions">
          {!purchasable ? (
            <button type="button" className="primary-button small" disabled aria-label={`${product.name} is sold out`}>Sold out</button>
          ) : needsChoice ? (
            <Link to={href} className="primary-button small" aria-label={`Choose options for ${product.name}`}>Choose options</Link>
          ) : (
            <button
              type="button"
              className="primary-button small"
              aria-label={`Add ${product.name} to cart`}
              disabled={add.isPending}
              onClick={() => requireAuth('Sign in to add items to your cart', () => add.mutate(
                { productId: product._id, variantId: activeVariants[0]?._id, quantity: 1 },
                { onSuccess: () => triggerToast(`${product.name} added to cart`) },
              ))}
            >
              {add.isPending ? 'Adding…' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
