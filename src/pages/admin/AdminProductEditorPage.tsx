import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { adminApi, errorMessage } from '../../services/api'
import type { AdminProductInput, Product } from '../../types'
import { humanize } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { Field, FormError, SelectField, TextAreaField } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { imageTypes, productStatuses, slugify, validateImageFile, validateProduct } from '../../utils/rules'

const maxImages = 12

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
      const input = { ...product, name: product.name.trim(), sku: product.sku.trim(), tags: product.tags.filter(Boolean) }
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

  return (
    <form className="admin-panel admin-product-form" onSubmit={submit} noValidate>
      <div className="field-grid">
        <Field label="Name" required value={product.name} error={errors.name} onChange={(event) => { set('name', event.target.value); if (!slugTouched) set('slug', slugify(event.target.value)) }} />
        <Field label="Slug" required value={product.slug} error={errors.slug} onChange={(event) => { setSlugTouched(true); set('slug', event.target.value) }} hint={`/product/${product.slug || '…'}`} />
        <Field label="SKU" required value={product.sku} error={errors.sku} onChange={(event) => set('sku', event.target.value)} />
        <SelectField label="Status" value={product.status} onChange={(event) => set('status', event.target.value as AdminProductInput['status'])}>
          {productStatuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </SelectField>
        <Field label="Category" required value={product.category} error={errors.category} onChange={(event) => set('category', event.target.value)} list="category-options" />
        <Field label="Collection" required value={product.collection} error={errors.collection} onChange={(event) => set('collection', event.target.value)} />
        <Field label="Fragrance" required value={product.fragrance} error={errors.fragrance} onChange={(event) => set('fragrance', event.target.value)} />
        <Field label="Tags" value={product.tags.join(', ')} onChange={(event) => set('tags', event.target.value.split(',').map((tag) => tag.trim()))} hint="Comma separated" />
        <Field label="Price (₹)" type="number" min={0} step="0.01" required value={product.price} error={errors.price} onChange={(event) => set('price', Number(event.target.value))} />
        <Field label="MRP (₹)" type="number" min={0} step="0.01" required value={product.mrp} error={errors.mrp} onChange={(event) => set('mrp', Number(event.target.value))} />
        <Field label="Stock" type="number" min={0} step={1} value={product.variants.length ? product.variants.filter((variant) => variant.active).reduce((sum, variant) => sum + variant.stock, 0) : product.stock} error={errors.stock} disabled={product.variants.length > 0} hint={product.variants.length ? 'Sum of active variant stock' : undefined} onChange={(event) => set('stock', Number(event.target.value))} />
        <label className="checkbox-row"><input type="checkbox" checked={product.featured} onChange={(event) => set('featured', event.target.checked)} /> Featured on the homepage</label>
        <TextAreaField label="Short description" required rows={2} maxLength={240} value={product.shortDescription} error={errors.shortDescription} onChange={(event) => set('shortDescription', event.target.value)} className="span-2" />
        <TextAreaField label="Description" required rows={5} value={product.description} error={errors.description} onChange={(event) => set('description', event.target.value)} className="span-2" />
        <Field label="SEO title" maxLength={70} value={product.seo?.title ?? ''} onChange={(event) => set('seo', { title: event.target.value, description: product.seo?.description ?? '' })} />
        <Field label="SEO description" maxLength={160} value={product.seo?.description ?? ''} onChange={(event) => set('seo', { title: product.seo?.title ?? '', description: event.target.value })} />
      </div>

      <fieldset className="admin-fieldset">
        <legend>Variants</legend>
        <p className="field-hint">Each variant has its own price, stock and unique SKU. Existing variants keep their identity so carts and orders stay linked.</p>
        {product.variants.map((variant, index) => (
          <div key={variant._id ?? `new-${index}`} className="variant-row">
            <Field label="Label" value={variant.label} error={errors[`variant-${index}-label`]} onChange={(event) => setVariant(index, { label: event.target.value })} />
            <Field label="SKU" value={variant.sku} error={errors[`variant-${index}-sku`]} onChange={(event) => setVariant(index, { sku: event.target.value })} />
            <Field label="Price (₹)" type="number" min={0} step="0.01" value={variant.price} error={errors[`variant-${index}-price`]} onChange={(event) => setVariant(index, { price: Number(event.target.value) })} />
            <Field label="Stock" type="number" min={0} step={1} value={variant.stock} error={errors[`variant-${index}-stock`]} onChange={(event) => setVariant(index, { stock: Number(event.target.value) })} />
            <label className="checkbox-row"><input type="checkbox" checked={variant.active} onChange={(event) => setVariant(index, { active: event.target.checked })} /> Active</label>
            <button type="button" className="icon-button" aria-label={`Remove variant ${variant.label || index + 1}`} onClick={() => set('variants', product.variants.filter((_, i) => i !== index))}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="secondary-button small" onClick={() => set('variants', [...product.variants, { label: '', sku: '', price: product.price, stock: 0, active: true }])}><Plus size={14} aria-hidden="true" /> Add variant</button>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Images</legend>
        <div className="field">
          <label htmlFor="product-images">Add images</label>
          <input id="product-images" type="file" accept={imageTypes.join(',')} multiple onChange={(event) => { chooseFiles(event.target.files); event.target.value = '' }} />
          <small className="field-hint">JPEG, PNG, WebP or AVIF, up to 8 MB each, {maxImages} images max. Choose the thumbnail with the star.</small>
        </div>
        <ul className="image-manager">
          {allImages.map((url, index) => {
            const isNew = index >= keptImages.length
            const isThumb = index === thumbnailIndex
            return (
              <li key={url} className={isThumb ? 'is-thumbnail' : ''}>
                <img src={url} alt={`Product image ${index + 1}${isNew ? ' (new)' : ''}`} />
                <button type="button" className="text-button" aria-pressed={isThumb} onClick={() => setThumbnail(url)}>{isThumb ? '★ Thumbnail' : '☆ Use as thumbnail'}</button>
                <button type="button" className="text-button danger" onClick={() => (isNew ? setNewFiles((files) => files.filter((_, i) => i !== index - keptImages.length)) : setKeptImages((images) => images.filter((image) => image !== url)))}>Remove</button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <FormError message={formError} />
      <div className="profile-actions">
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Create product'}</button>
        <Link to="/admin/products" className="secondary-button">Cancel</Link>
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
      <h1>{id ? 'Edit product' : 'New product'}</h1>
      <datalist id="category-options">{categories.data?.map((category) => <option key={category._id} value={category.name} />)}</datalist>
      {!id ? <ProductForm /> : productQuery.isPending ? <Skeleton className="skeleton-block" label="Loading product" /> : productQuery.isError ? (
        <ErrorState error={productQuery.error} onRetry={() => void productQuery.refetch()} />
      ) : <ProductForm key={productQuery.data._id} existing={productQuery.data} />}
    </section>
  )
}
