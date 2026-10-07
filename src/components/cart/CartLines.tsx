import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { Cart } from '../../types'
import { formatInr } from '../../utils/format'
import { useCartActions } from '../../hooks/useCart'
import { CdnImage } from '../common/CdnImage'

/**
 * Renders server cart lines. Unit prices, line totals and availability are exactly what the API returned;
 * the client only sends quantity changes.
 */
export const CartLines = ({ cart, compact = false, onNavigate }: { cart: Cart; compact?: boolean; onNavigate?: () => void }) => {
  const { setQuantity, remove } = useCartActions()
  return (
    <ul className={compact ? 'drawer-lines' : 'cart-items-list'}>
      {cart.items.map((line) => {
        const product = line.productId
        const ref = { productId: product._id, variantId: line.variantId }
        const image = product.thumbnailImage || product.images?.[0]
        const label = `${product.name}${line.variant ? ` (${line.variant.label})` : ''}`
        return (
          <li key={line._id} className={`${compact ? 'cart-item-row cart-drawer-item' : 'cart-row'} ${line.available ? '' : 'is-unavailable'}`}>
            {image ? <CdnImage src={image} width={compact ? 64 : 120} className={compact ? 'mini-thumb' : ''} /> : <div className="image-placeholder mini-thumb" />}
            <div className="drawer-item-copy">
              <Link to={`/product/${product.slug}`} onClick={onNavigate}><strong>{product.name}</strong></Link>
              {line.variant && <span>{line.variant.label}</span>}
              <span className="unit-price">{formatInr(line.unitPrice)} each</span>
              {line.issueMessage && <span className="line-issue" role="alert">{line.issueMessage}{line.issue === 'INSUFFICIENT_STOCK' ? ` (${line.maxQuantity} available)` : ''}</span>}
              <div className="drawer-quantity-wrap" role="group" aria-label={`Quantity of ${label}`}>
                <button type="button" aria-label={`Decrease quantity of ${label}`} disabled={line.quantity <= 1} onClick={() => setQuantity.mutate({ ...ref, quantity: line.quantity - 1 })}><Minus size={14} /></button>
                <span aria-live="polite">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${label}`}
                  disabled={!line.available || line.quantity >= line.maxQuantity}
                  onClick={() => setQuantity.mutate({ ...ref, quantity: line.quantity + 1 })}
                ><Plus size={14} /></button>
              </div>
            </div>
            <div className="drawer-item-actions">
              <span>{line.available ? formatInr(line.lineTotal) : 'Unavailable'}</span>
              <button type="button" aria-label={`Remove ${label} from cart`} onClick={() => remove.mutate(ref)}><Trash2 size={14} /></button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
