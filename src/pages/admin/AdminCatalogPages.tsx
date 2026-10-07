import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, errorMessage } from '../../services/api'
import type { Category, Product } from '../../types'
import { isSafeLink, slugify } from '../../utils/rules'
import { Pagination } from '../../components/common/Pagination'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { Field, FormError, NumberField } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'

const StockEditor = ({ product, variantId, label, stock }: { product: Product; variantId?: string; label: string; stock: number }) => {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(String(stock))
  const save = useMutation({
    mutationFn: () => adminApi.adjustInventory(product._id, { ...(variantId ? { variantId } : {}), stock: Number(value) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); triggerToast(`Stock updated for ${label}`) },
    onError: (error) => { setValue(String(stock)); triggerToast(errorMessage(error), 'error') },
  })
  const valid = /^\d+$/.test(value)
  return (
    <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (valid && Number(value) !== stock) save.mutate() }}>
      <label className="sr-only" htmlFor={`stock-${product._id}-${variantId ?? 'base'}`}>Stock for {label}</label>
      <input id={`stock-${product._id}-${variantId ?? 'base'}`} className={`stock-input ${stock === 0 ? 'text-danger' : ''}`} type="number" min={0} step={1} value={value} aria-invalid={!valid} onChange={(event) => setValue(event.target.value)} />
      <button type="submit" className="secondary-button small" disabled={!valid || Number(value) === stock || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
    </form>
  )
}

export const AdminInventoryPage = () => {
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') ?? 'low'
  const page = Number(params.get('page')) || 1
  const query = { page, limit: 25, lowStock: filter === 'out' ? 0 : filter === 'low' ? 5 : undefined }
  const products = useQuery({ queryKey: ['admin', 'products', 'inventory', query], queryFn: () => adminApi.products(query), placeholderData: keepPreviousData })
  return (
    <section>
      <h1>Inventory</h1>
      <div className="admin-toolbar" role="group" aria-label="Stock filter">
        {[['low', 'Low stock (≤5)'], ['out', 'Out of stock'], ['all', 'All products']].map(([value, label]) => (
          <button key={value} type="button" className={`secondary-button small ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setParams({ filter: value! })}>{label}</button>
        ))}
      </div>
      {products.isPending ? <Skeleton className="skeleton-block" label="Loading inventory" /> : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <div className="empty-state"><p>{filter === 'all' ? 'No products yet.' : 'Nothing needs restocking.'}</p></div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Product</th><th scope="col">Variant</th><th scope="col">SKU</th><th scope="col">Stock</th></tr></thead>
              <tbody>
                {products.data.items.flatMap((product) => (product.variants.length ? product.variants.map((variant) => (
                  <tr key={variant._id}>
                    <td><Link to={`/admin/products/${product._id}/edit`}>{product.name}</Link></td>
                    <td>{variant.label}{variant.active === false ? ' (inactive)' : ''}</td>
                    <td>{variant.sku}</td>
                    <td><StockEditor product={product} variantId={variant._id} label={`${product.name} ${variant.label}`} stock={variant.stock} /></td>
                  </tr>
                )) : [(
                  <tr key={product._id}>
                    <td><Link to={`/admin/products/${product._id}/edit`}>{product.name}</Link></td>
                    <td>—</td>
                    <td>{product.sku}</td>
                    <td><StockEditor product={product} label={product.name} stock={product.stock} /></td>
                  </tr>
                )]))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={products.data.pagination} onPageChange={(next) => setParams({ filter, page: String(next) })} />
        </>
      )}
    </section>
  )
}

const emptyCategory = { name: '', slug: '', image: '', description: '', active: true, sortOrder: 0 }

const CategoryForm = ({ category, onDone }: { category?: Category; onDone: () => void }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...emptyCategory, ...category, image: category?.image ?? '', description: category?.description ?? '' })
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => {
      const input = { name: form.name.trim(), slug: form.slug, image: form.image.trim(), description: form.description.trim(), active: form.active, sortOrder: Number(form.sortOrder) }
      return category ? adminApi.updateCategory(category._id, input) : adminApi.createCategory(input)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); queryClient.invalidateQueries({ queryKey: ['categories'] }); triggerToast(category ? 'Category updated' : 'Category created'); onDone() },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return setError('Slug must use lowercase letters, numbers and hyphens')
    if (form.image && !isSafeLink(form.image)) return setError('Image must be an https:// URL or a site path')
    setError('')
    save.mutate()
  }
  return (
    <form className="admin-panel" onSubmit={submit} noValidate>
      <div className="field-grid">
        <Field label="Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: category ? current.slug : slugify(event.target.value) }))} hint="Must match the category name used on products" />
        <Field label="Slug" required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
        <Field label="Image URL" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} />
        <NumberField label="Sort order" min={0} step={1} value={form.sortOrder} hint="Lower numbers appear first" onValueChange={(value) => setForm((current) => ({ ...current, sortOrder: value }))} />
        <Field label="Description" value={form.description} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="span-2" />
        <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Visible in the store</label>
      </div>
      <FormError message={error} />
      <div className="profile-actions">
        <button type="submit" className="primary-button" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save category'}</button>
        <button type="button" className="secondary-button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

export const AdminCategoriesPage = () => {
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories })
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const remove = useMutation({
    mutationFn: (category: Category) => adminApi.deleteCategory(category._id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }); queryClient.invalidateQueries({ queryKey: ['categories'] }); triggerToast('Category deleted') },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })
  return (
    <section>
      <div className="section-row"><h1>Categories</h1>{editing === null && <button type="button" className="primary-button" onClick={() => setEditing('new')}>Add category</button>}</div>
      <p className="account-muted">Collections are set per product (the Collection field) and appear at /collection/&lt;slug&gt;.</p>
      {editing === 'new' && <CategoryForm onDone={() => setEditing(null)} />}
      {categories.isPending ? <Skeleton className="skeleton-block" label="Loading categories" /> : categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? <div className="empty-state"><p>No categories yet.</p></div> : (
        <ul className="admin-list">
          {categories.data.map((category) => (
            <li key={category._id} className="admin-panel">
              {editing === category._id ? <CategoryForm category={category} onDone={() => setEditing(null)} /> : (
                <div className="section-row">
                  <div><strong>{category.name}</strong> <small className="account-muted">/category/{category.slug} · order {category.sortOrder ?? 0}</small>{category.active === false && <span className="pill">Hidden</span>}</div>
                  <div className="cell-actions">
                    <button type="button" className="text-button" onClick={() => setEditing(category._id)}>Edit</button>
                    <button type="button" className="text-button danger" onClick={() => { if (window.confirm(`Delete ${category.name}?`)) remove.mutate(category) }}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const AdminCustomersPage = () => {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const query = { page: Number(params.get('page')) || 1, limit: 20, search: params.get('search') || undefined }
  const customers = useQuery({ queryKey: ['admin', 'customers', query], queryFn: () => adminApi.customers(query), placeholderData: keepPreviousData })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'BLOCKED' }) => adminApi.setCustomerStatus(id, status),
    onSuccess: (customer) => { queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] }); triggerToast(`${customer.name} is now ${customer.status.toLowerCase()}`) },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })
  return (
    <section>
      <h1>Customers</h1>
      <form className="admin-toolbar" role="search" onSubmit={(event) => { event.preventDefault(); setParams(search.trim() ? { search: search.trim() } : {}) }}>
        <label htmlFor="customer-search" className="sr-only">Search customers</label>
        <input id="customer-search" type="search" placeholder="Name, email or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="submit" className="secondary-button small">Search</button>
      </form>
      {customers.isPending ? <Skeleton className="skeleton-block" label="Loading customers" /> : customers.isError ? (
        <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
      ) : customers.data.items.length === 0 ? <div className="empty-state"><p>No customers found.</p></div> : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Orders</th><th scope="col">Spent</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {customers.data.items.map((customer) => (
                  <tr key={customer._id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.orderCount}</td>
                    <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.totalSpent)}</td>
                    <td><span className={`pill ${customer.status === 'ACTIVE' ? 'pill-success' : 'pill-danger'}`}>{customer.status.toLowerCase()}</span></td>
                    <td>
                      {customer.status === 'ACTIVE'
                        ? <button type="button" className="text-button danger" onClick={() => { if (window.confirm(`Block ${customer.name}? They will be signed out everywhere.`)) setStatus.mutate({ id: customer._id, status: 'BLOCKED' }) }}>Block</button>
                        : <button type="button" className="text-button" onClick={() => setStatus.mutate({ id: customer._id, status: 'ACTIVE' })}>Reactivate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={customers.data.pagination} onPageChange={(page) => setParams({ ...(query.search ? { search: query.search } : {}), page: String(page) })} />
        </>
      )}
    </section>
  )
}
