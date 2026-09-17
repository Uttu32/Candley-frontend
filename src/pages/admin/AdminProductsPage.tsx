import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { triggerToast } from '../../components/common/ToastContainer'
import { api, type AdminProductInput } from '../../services/api'

const initialProduct: AdminProductInput = { name: '', slug: '', sku: '', category: '', collection: '', fragrance: '', description: '', shortDescription: '', price: 0, mrp: 0, stock: 0, tags: [], status: 'DRAFT', featured: false, variants: [] }

export const AdminProductsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isCreateRoute = location.pathname.endsWith('/new')
  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.adminProducts({ limit: 100 }),
    retry: false,
  })
  const [product, setProduct] = useState(initialProduct)
  const [images, setImages] = useState<File[]>([])
  const [thumbnailIndex, setThumbnailIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof AdminProductInput, value: string | number) => setProduct((current) => ({ ...current, [key]: value }))
  const chooseImages = (files: FileList | null) => { setImages(Array.from(files ?? []).filter((file) => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024)); setThumbnailIndex(0) }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setIsSaving(true)
    try { await api.createAdminProduct(product, images, thumbnailIndex); triggerToast('Product created'); navigate('/admin/products') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create product') } finally { setIsSaving(false) }
  }

  const products = productsQuery.data?.items ?? []

  return <section>
    <div className="account-heading">
      <div><span className="eyebrow">Catalog</span><h2>Products</h2></div>
      <Link to="/admin/products/new" className="primary-button"><Plus size={16} /> Add product</Link>
    </div>
    {productsQuery.isLoading && <div className="account-empty-state"><p>Loading products...</p></div>}
    {productsQuery.isError && <div className="account-empty-state"><h2>Unable to load products</h2><p>{productsQuery.error instanceof Error ? productsQuery.error.message : 'Please try again later.'}</p></div>}
    {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && <div className="account-empty-state"><h2>No products yet</h2><p>Add your first product to start building the catalog.</p></div>}
    {products.length > 0 &&
      <div className="product-grid wide admin-product-grid">
        {products.map((item) =>
          <article key={item.id} className="product-card w-1/5 flex">
            <div className="product-media max-w-[85%] align-self-center">
              <img src={item.images[0]} alt={item.name} />
            </div>
            <div className="product-body"><div className="product-meta"><span>{item.category}</span><span>{item.stock} in stock</span></div><h3>{item.name}</h3><div className="price-row"><strong>₹{item.price}</strong><span>₹{item.mrp}</span></div></div>
          </article>)}</div>}
    {isCreateRoute && <div className="drawer-backdrop" role="presentation" onClick={() => navigate('/admin/products')}>
      <aside className="admin-product-drawer" role="dialog" aria-modal="true" aria-labelledby="add-product-title" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><span className="eyebrow">Catalog</span><h2 id="add-product-title">Add product</h2></div><button className="icon-button" type="button" onClick={() => navigate('/admin/products')} aria-label="Close add product drawer"><X size={20} /></button></div>
        <form className="admin-panel admin-product-form" onSubmit={submit}><div className="field-grid">
          <label>Name<input required value={product.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={product.slug} onChange={(event) => update('slug', event.target.value)} /></label>
          <label>SKU<input required value={product.sku} onChange={(event) => update('sku', event.target.value)} /></label>
          <label>Category<input required value={product.category} onChange={(event) => update('category', event.target.value)} /></label>
          <label>Collection<input required value={product.collection} onChange={(event) => update('collection', event.target.value)} /></label>
          <label>Fragrance<input required value={product.fragrance} onChange={(event) => update('fragrance', event.target.value)} /></label>
          <label>Price<input required min="0" type="number" value={product.price} onChange={(event) => update('price', Number(event.target.value))} /></label>
          <label>MRP<input required min="0" type="number" value={product.mrp} onChange={(event) => update('mrp', Number(event.target.value))} /></label>
          <label>Quantity<input required min="0" type="number" value={product.stock} onChange={(event) => update('stock', Number(event.target.value))} /></label>
          <label>Status<select value={product.status} onChange={(event) => update('status', event.target.value)}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select></label>
        </div><label>Short description<input required value={product.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} /></label><label>Description<textarea required rows={5} value={product.description} onChange={(event) => update('description', event.target.value)} /></label><label>Product images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => chooseImages(event.target.files)} /></label>
          {images.length > 0 && <div className="admin-image-picker">{images.map((image, index) => <button className={index === thumbnailIndex ? 'selected' : ''} type="button" key={`${image.name}-${index}`} onClick={() => setThumbnailIndex(index)}><img src={URL.createObjectURL(image)} alt={image.name} /><span>{index === thumbnailIndex ? 'Main thumbnail' : 'Use as thumbnail'}</span></button>)}</div>}
          {error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Uploading and saving...' : 'Create product'}</button></form>
      </aside>
    </div>}
  </section>
}
