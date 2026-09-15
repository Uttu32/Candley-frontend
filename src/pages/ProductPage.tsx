import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export const ProductPage = () => {
  const { slug } = useParams()
  const productQuery = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug ?? ''), enabled: Boolean(slug), retry: false })
  const product = productQuery.data
  const { addToCart, toggleWishlist, wishlist } = useAppStore()

  if (!product) {
    return (
      <div className="container section-spacing">
        <div className="empty-state">
          <h2>Product not found</h2>
          <p>The requested candle is not available in the catalog yet.</p>
          <Link to="/shop" className="primary-button">Browse the collection</Link>
        </div>
      </div>
    )
  }

  const variants = useMemo(
    () =>
      product.variants ?? [
        { id: 'default', label: 'Default', price: product.price, stock: product.stock },
      ],
    [product],
  )
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? 'default')
  const [quantity, setQuantity] = useState(1)
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const isLiked = wishlist.includes(product.id)

  return (
    <div className="container section-spacing product-page">
      <div className="product-gallery">
        {(product.images ?? []).map((image, index) => (
          <img key={image} src={image} alt={`${product.name}-${index}`} />
        ))}
      </div>
      <div className="product-info">
        <span className="eyebrow">{product.collection}</span>
        <h1>{product.name}</h1>
        <p>{product.shortDescription}</p>
        <div className="price-row">
          <strong>₹{selectedVariant?.price ?? product.price}</strong>
          <span>₹{product.mrp}</span>
        </div>
        <div className="variant-list">
          {variants.map((variant) => (
            <button
              key={variant.id}
              className={`secondary-button small ${selectedVariantId === variant.id ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedVariantId(variant.id)}
            >
              {variant.label}
            </button>
          ))}
        </div>
        <div className="quantity-control inline-quantity">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((value) => value + 1)}>+</button>
        </div>
        <div className="product-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              addToCart(product.id, quantity, selectedVariantId)
              triggerToast('Added to cart')
            }}
          >
            Add to cart
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              toggleWishlist(product.id)
              triggerToast(isLiked ? 'Removed from wishlist' : 'Added to wishlist')
            }}
          >
            {isLiked ? 'Saved' : 'Wishlist'}
          </button>
        </div>
        <div className="detail-links">
          <Link to="/shop">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
