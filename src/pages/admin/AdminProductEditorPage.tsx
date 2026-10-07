import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, ImagePlus, Plus, Star, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '../../services/api'
import type { AdminProductInput, Product } from '../../types'
import { humanize } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { Field, FormError, NumberField, SelectField, TextAreaField } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { imageTypes, productStatuses, slugify, validateImageFile, validateProduct } from '../../utils/rules'
import { CdnImage } from '../../components/common/CdnImage'

const maxImages = 12

const statusHint: Record<AdminProductInput['status'], string> = {
  DRAFT: 'Hidden from the store while you work on it',
  ACTIVE: 'Visible and available to buy',
  OUT_OF_STOCK: 'Visible, but cannot be bought',
  ARCHIVED: 'Hidden and excluded from reports',
}

const emptyProduct: AdminProductInput = {
  name: '', slug: '', sku: '', category: '', collection: '', fragrance: '', description: '', shortDescription: '',
  price: 0, mrp: 0, stock: 0, tags: [], status: 'DRAFT', featured: false, variants: [], seo: { title: '', description: '' },
}

const toInput = (product: Product): AdminProductInput => ({
  name: product.name, slug: product.slug, sku: product.sku, category: product.category, collection: product.collection, fragrance: product.fragrance,
  description: product.description, shortDescription: product.shortDescription, price: product.price, mrp: product.mrp, stock: product.stock,
  tags: product.tags ?? [], status: product.status, featured: product.featured, seo: { title: product.seo?.title ?? '', description: product.seo?.description ?? '' },
  variants: (product.variants ?? []).map((variant) => ({ _id: variant._id, label: variant.label, sku: variant.sku, price: variant.price, stock: variant.stock, active: variant.active !== false })),
})

const ProductForm = ({ existing }: { existing?: Product }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [product, setProduct] = useState<AdminProductInput>(existing ? toInput(existing) : emptyProduct)
  const [slugTouched, setSlugTouched] = useState(Boolean(existing))
  const [keptImages, setKeptImages] = useState<string[]>(existing?.images ?? [])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [thumbnail, setThumbnail] = useState<string>(existing?.thumbnailImage ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const previews = useMemo(() => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [newFiles])
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews])

  const set = <K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) => setProduct((current) => ({ ...current, [key]: value }))
  const setVariant = (index: number, changes: Partial<AdminProductInput['variants'][number]>) =>
    setProduct((current) => ({ ...current, variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...changes } : variant)) }))

  const chooseFiles = (files: FileList | null) => {
    if (!files) return
    const accepted: File[] = []
    const problems: string[] = []
    Array.from(files).forEach((file) => { const problem = validateImageFile(file); if (problem) problems.push(problem); else accepted.push(file) })
    const room = maxImages - keptImages.length - newFiles.length
    if (accepted.length > room) problems.push(`Only ${maxImages} images are allowed per product`)
    setNewFiles((current) => [...current, ...accepted.slice(0, Math.max(room, 0))])
    setFormError(problems.join('. '))
  }

  const allImages = [...keptImages, ...previews.map((preview) => preview.url)]
  const thumbnailIndex = Math.max(allImages.indexOf(thumbnail), 0)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateProduct(product)
    setErrors(found)
    if (Object.keys(found).length) { setFormError('Please fix the highlighted fields.'); return }
    setSaving(true)
    setFormError('')
    try {
      const input = { ...product, name: product.name.trim(), sku: product.sku.trim(), tags: product.tags.map((tag) => tag.trim()).filter(Boolean) }
      const saved = existing
        ? await adminApi.updateProduct(existing._id, input, newFiles, { thumbnailIndex, removeImages: existing.images.filter((url) => !keptImages.includes(url)) })
        : await adminApi.createProduct(input, newFiles, thumbnailIndex)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.removeQueries({ queryKey: ['admin', 'product', saved._id] })
      triggerToast(existing ? 'Product updated' : 'Product created')
      navigate('/admin/products')
    } catch (error) {
      setFormError(errorMessage(error, 'The product could not be saved'))
      setSaving(false)
    }
  }

  const hasVariants = product.variants.length > 0
  const totalStock = hasVariants ? product.variants.filter((variant) => variant.active).reduce((sum, variant) => sum + variant.stock, 0) : product.stock
  const discount = product.mrp > product.price && product.mrp > 0 ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0

  return (
    <form className="pe" onSubmit={submit} noValidate>
      <div className="pe-layout">
        <div className="pe-main">
          <section className="pe-card">
            <header className="pe-card-head"><h2>Basic details</h2><p>The name and description customers see on the product page.</p></header>
            <div className="pe-grid">
              <Field label="Product name" required value={product.name} error={errors.name} placeholder="e.g. Lavender Dream Soy Candle" onChange={(event) => { set('name', event.target.value); if (!slugTouched) set('slug', slugify(event.target.value)) }} className="span-2" />
              <TextAreaField label="Short description" required rows={2} maxLength={240} value={product.shortDescription} error={errors.shortDescription} hint={`Shown on product cards. ${product.shortDescription.length}/240`} onChange={(event) => set('shortDescription', event.target.value)} className="span-2" />
              <TextAreaField label="Full description" required rows={6} value={product.description} error={errors.description} hint="Shown on the product page." onChange={(event) => set('description', event.target.value)} className="span-2" />
            </div>
          </section>

          <section className="pe-card">
            <header className="pe-card-head"><h2>Pricing</h2><p>Selling price is what customers pay. MRP is shown struck through when it is higher.</p></header>
            <div className="pe-grid">
              <NumberField label="Selling price" prefix="₹" min={0} step="0.01" required value={product.price} error={errors.price} placeholder="0" onValueChange={(value) => set('price', value)} />
              <NumberField label="MRP" prefix="₹" min={0} step="0.01" required value={product.mrp} error={errors.mrp} placeholder="0" hint={discount ? `Customers see ${discount}% off` : 'Must be at least the selling price'} onValueChange={(value) => set('mrp', value)} />
            </div>
          </section>

          <section className="pe-card">
            <header className="pe-card-head">
              <h2>Variants</h2>
              <p>Use variants for sizes or weights (e.g. 200g, 400g). Each has its own price, stock and SKU. Leave empty if the product comes in one size.</p>
            </header>
            {hasVariants && (
              <div className="pe-variants">
                {product.variants.map((variant, index) => (
                  <div key={variant._id ?? `new-${index}`} className={`pe-variant ${variant.active ? '' : 'is-inactive'}`}>
                    <Field label="Label" required value={variant.label} placeholder="e.g. 200g" error={errors[`variant-${index}-label`]} onChange={(event) => setVariant(index, { label: event.target.value })} />
                    <Field label="SKU" required value={variant.sku} error={errors[`variant-${index}-sku`]} onChange={(event) => setVariant(index, { sku: event.target.value })} />
                    <NumberField label="Price" prefix="₹" min={0} step="0.01" value={variant.price} error={errors[`variant-${index}-price`]} onValueChange={(value) => setVariant(index, { price: value })} />
                    <NumberField label="Stock" min={0} step={1} value={variant.stock} error={errors[`variant-${index}-stock`]} onValueChange={(value) => setVariant(index, { stock: value })} />
                    <div className="pe-variant-actions">
                      <label className="pe-switch">
                        <input type="checkbox" role="switch" checked={variant.active} onChange={(event) => setVariant(index, { active: event.target.checked })} />
                        <span aria-hidden="true" />
                        Active
                      </label>
                      <button type="button" className="pe-remove" aria-label={`Remove variant ${variant.label || index + 1}`} onClick={() => set('variants', product.variants.filter((_, i) => i !== index))}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="secondary-button small pe-add" onClick={() => set('variants', [...product.variants, { label: '', sku: '', price: product.price, stock: 0, active: true }])}><Plus size={14} aria-hidden="true" /> Add variant</button>
          </section>

          <section className="pe-card">
            <header className="pe-card-head"><h2>Images</h2><p>JPEG, PNG, WebP or AVIF, up to 8 MB each, {maxImages} max. The starred image is used as the thumbnail.</p></header>
            <label htmlFor="product-images" className="pe-drop">
              <ImagePlus size={22} aria-hidden="true" />
              <span><strong>Add images</strong><small>{allImages.length}/{maxImages} uploaded · click to choose files</small></span>
            </label>
            <input id="product-images" className="sr-only" type="file" accept={imageTypes.join(',')} multiple onChange={(event) => { chooseFiles(event.target.files); event.target.value = '' }} />
            {allImages.length > 0 && (
              <ul className="pe-images">
                {allImages.map((url, index) => {
                  const isNew = index >= keptImages.length
                  const isThumb = index === thumbnailIndex
                  return (
                    <li key={url} className={isThumb ? 'is-thumbnail' : ''}>
                      <CdnImage src={url} width={200} alt={`Product image ${index + 1}${isNew ? ' (new)' : ''}`} />
                      {isThumb && <span className="pe-thumb-badge">Thumbnail</span>}
                      {isNew && <span className="pe-new-badge">New</span>}
                      <div className="pe-image-actions">
                        <button type="button" aria-pressed={isThumb} aria-label={isThumb ? 'Thumbnail' : 'Use as thumbnail'} title="Use as thumbnail" onClick={() => setThumbnail(url)}><Star size={15} fill={isThumb ? 'currentColor' : 'none'} aria-hidden="true" /></button>
                        <button type="button" className="is-danger" aria-label="Remove image" title="Remove" onClick={() => (isNew ? setNewFiles((files) => files.filter((_, i) => i !== index - keptImages.length)) : setKeptImages((images) => images.filter((image) => image !== url)))}><Trash2 size={15} aria-hidden="true" /></button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="pe-card">
            <header className="pe-card-head"><h2>Search engine listing</h2><p>Optional. Defaults to the product name and short description.</p></header>
            <div className="pe-grid">
              <Field label="SEO title" maxLength={70} value={product.seo?.title ?? ''} placeholder={product.name} hint={`${(product.seo?.title ?? '').length}/70`} onChange={(event) => set('seo', { title: event.target.value, description: product.seo?.description ?? '' })} className="span-2" />
              <TextAreaField label="SEO description" rows={2} maxLength={160} value={product.seo?.description ?? ''} placeholder={product.shortDescription} hint={`${(product.seo?.description ?? '').length}/160`} onChange={(event) => set('seo', { title: product.seo?.title ?? '', description: event.target.value })} className="span-2" />
            </div>
          </section>
        </div>

        <aside className="pe-side">
          <section className="pe-card">
            <header className="pe-card-head"><h2>Visibility</h2></header>
            <SelectField label="Status" value={product.status} hint={statusHint[product.status]} onChange={(event) => set('status', event.target.value as AdminProductInput['status'])}>
              {productStatuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </SelectField>
            <label className="pe-switch pe-switch-row">
              <input type="checkbox" role="switch" checked={product.featured} onChange={(event) => set('featured', event.target.checked)} />
              <span aria-hidden="true" />
              Featured on the homepage
            </label>
          </section>

          <section className="pe-card">
            <header className="pe-card-head"><h2>Inventory</h2></header>
            <NumberField label="Stock" min={0} step={1} value={totalStock} error={errors.stock} disabled={hasVariants} hint={hasVariants ? 'Calculated from active variants. Edit stock on each variant.' : 'Units available to sell'} onValueChange={(value) => set('stock', value)} />
            <Field label="SKU" required value={product.sku} error={errors.sku} hint="Your unique stock code" onChange={(event) => set('sku', event.target.value)} />
          </section>

          <section className="pe-card">
            <header className="pe-card-head"><h2>Organisation</h2></header>
            <Field label="Category" required value={product.category} error={errors.category} onChange={(event) => set('category', event.target.value)} list="category-options" hint="Pick an existing category or type a new one" />
            <Field label="Collection" required value={product.collection} error={errors.collection} placeholder="e.g. Autumn Rituals" onChange={(event) => set('collection', event.target.value)} />
            <Field label="Fragrance" required value={product.fragrance} error={errors.fragrance} placeholder="e.g. Lavender & vanilla" onChange={(event) => set('fragrance', event.target.value)} />
            <Field label="Tags" value={product.tags.join(', ')} placeholder="calming, gift, soy" onChange={(event) => set('tags', event.target.value.split(',').map((tag) => tag.trimStart()))} hint="Separate with commas" />
            <Field label="URL slug" required value={product.slug} error={errors.slug} onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }} hint={<>/product/<strong>{product.slug || '…'}</strong></>} />
          </section>
        </aside>
      </div>

      <div className="pe-savebar">
        <FormError message={formError} />
        <div className="pe-savebar-actions">
          <Link to="/admin/products" className="secondary-button">Cancel</Link>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>
    </form>
  )
}

export const AdminProductEditorPage = () => {
  const { id } = useParams()
  const productQuery = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminApi.product(id!), enabled: Boolean(id) })
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories })
  return (
    <section>
      <Link to="/admin/products" className="od-back"><ArrowLeft size={16} aria-hidden="true" /> All products</Link>
      <header className="pe-header">
        <h1>{id ? 'Edit product' : 'New product'}</h1>
        {id && productQuery.data && <a href={`/product/${productQuery.data.slug}`} target="_blank" rel="noreferrer" className="dash-link">View in store <ExternalLink size={14} aria-hidden="true" /></a>}
      </header>
      <datalist id="category-options">{categories.data?.map((category) => <option key={category._id} value={category.name} />)}</datalist>
      {!id ? <ProductForm /> : productQuery.isPending ? <Skeleton className="skeleton-block" label="Loading product" /> : productQuery.isError ? (
        <ErrorState error={productQuery.error} onRetry={() => void productQuery.refetch()} />
      ) : <ProductForm key={productQuery.data._id} existing={productQuery.data} />}
    </section>
  )
}
