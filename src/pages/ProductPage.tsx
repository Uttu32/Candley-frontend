import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export const ProductPage = () => {
  const { slug } = useParams()

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug ?? ''),
    enabled: Boolean(slug),
    retry: false,
  })

  const product = productQuery.data

  const { addToCart, toggleWishlist, wishlist } = useAppStore()

  const variants = useMemo(
    () =>
      product?.variants ?? [
        {
          _id: 'default',
          label: 'Default',
          price: product?.price ?? 0,
          stock: product?.stock ?? 0,
        },
      ],
    [product],
  )

  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?._id,
  )

  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setSelectedVariantId(variants[0]?._id)
    setQuantity(1)
  }, [product?._id, variants])

  const selectedVariant =
    variants.find((variant) => variant._id === selectedVariantId) ?? variants[0]

  const isLiked = product ? wishlist.includes(product._id) : false

  if (!product) {
    return (
      <div className="container section-spacing">
        <div className="empty-state">
          <h2>Product not found</h2>
          <p>The requested candle is not available in the catalog yet.</p>
          <Link to="/shop" className="primary-button">
            Browse the collection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container section-spacing product-page">
      <div className="product-gallery">
        {(product.images ?? []).map((image, index) => (
          <img key={image} src={image} alt={`${product.name} -${index} `} />
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
              key={variant._id}
              className={`secondary - button small ${selectedVariantId === variant._id ? 'active' : ''
                } `}
              type="button"
              onClick={() => setSelectedVariantId(variant._id)}
            >
              {variant.label}
            </button>
          ))}
        </div>

        <div className="quantity-control inline-quantity">
          <button
            type="button"
            onClick={() =>
              setQuantity((value) => Math.max(1, value - 1))
            }
          >
            −
          </button>

          <span>{quantity}</span>

          <button
            type="button"
            onClick={() => setQuantity((value) => value + 1)}
          >
            +
          </button>
        </div>

        <div className="product-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              addToCart(product._id, quantity, selectedVariantId)
              triggerToast('Added to cart')
            }}
          >
            Add to cart
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              toggleWishlist(product._id)
              triggerToast(
                isLiked
                  ? 'Removed from wishlist'
                  : 'Added to wishlist',
              )
            }}
          >
            {isLiked ? 'Saved' : 'Wishlist'}
          </button>
        </div>

        <div className="detail-links flex justify-center mt-8">
          <Link to="/shop" className="group inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"          >
            <span className="border-b text-blue-600 border-blue-600 pb-0.5 transition-all group-hover:border-blue-800">
              Continue shopping
            </span>
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}