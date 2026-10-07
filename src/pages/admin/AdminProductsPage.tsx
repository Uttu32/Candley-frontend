import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, errorMessage } from '../../services/api'
import type { Product, ProductStatus } from '../../types'
import { formatInr, humanize } from '../../utils/format'
import { Pagination } from '../../components/common/Pagination'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { triggerToast } from '../../components/common/ToastContainer'
import { productStatuses } from '../../utils/rules'
import { CdnImage } from '../../components/common/CdnImage'

export const AdminProductsPage = () => {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const status = params.get('status') ?? ''
  const [search, setSearch] = useState(params.get('search') ?? '')
  const query = { page, limit: 20, status: status || undefined, search: params.get('search') || undefined }
  const products = useQuery({ queryKey: ['admin', 'products', query], queryFn: () => adminApi.products(query), placeholderData: keepPreviousData })
  const update = (changes: Record<string, string | undefined>) => setParams((current) => {
    const next = new URLSearchParams(current)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    return next
  })

  const setStatus = useMutation({
    mutationFn: ({ product, next }: { product: Product; next: ProductStatus }) => adminApi.setProductStatus(product._id, next),
    onSuccess: (product) => { triggerToast(`${product.name} is now ${humanize(product.status)}`); queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }) },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })
  const remove = useMutation({
    mutationFn: (product: Product) => adminApi.deleteProduct(product._id),
    onSuccess: (result) => { triggerToast(result.deleted ? 'Product deleted' : 'Product has orders, so it was archived'); queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }) },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })

  return (
    <section>
      <div className="section-row">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="primary-button">Add product</Link>
      </div>
      <div className="admin-toolbar">
        <form role="search" onSubmit={(event) => { event.preventDefault(); update({ search: search.trim() || undefined, page: undefined }) }}>
          <label htmlFor="product-search" className="sr-only">Search products</label>
          <input id="product-search" type="search" placeholder="Search name, SKU or slug" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" className="secondary-button small">Search</button>
        </form>
        <label className="inline-field">Status
          <select value={status} onChange={(event) => update({ status: event.target.value || undefined, page: undefined })}>
            <option value="">All</option>
            {productStatuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
        </label>
      </div>

      {products.isPending ? <Skeleton className="skeleton-block" label="Loading products" /> : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <div className="empty-state"><p>No products found.</p></div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Product</th><th scope="col">SKU</th><th scope="col">Price</th><th scope="col">Stock</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {products.data.items.map((product) => (
                  <tr key={product._id}>
                    <td><div className="cell-product">
                      {product.thumbnailImage ? <CdnImage src={product.thumbnailImage} width={44} /> : <span className="image-placeholder" />}
                      <span><strong>{product.name}</strong><small>{product.category}{product.variants.length ? ` · ${product.variants.length} variants` : ''}</small></span>
                    </div></td>
                    <td>{product.sku}</td>
                    <td>{formatInr(product.price)}</td>
                    <td className={product.stock === 0 ? 'text-danger' : ''}>{product.stock}</td>
                    <td>
                      <label className="sr-only" htmlFor={`status-${product._id}`}>Status of {product.name}</label>
                      <select id={`status-${product._id}`} value={product.status} disabled={setStatus.isPending} onChange={(event) => setStatus.mutate({ product, next: event.target.value as ProductStatus })}>
                        {productStatuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                      </select>
                    </td>
                    <td><div className="cell-actions">
                      <Link to={`/admin/products/${product._id}/edit`} className="text-button">Edit</Link>
                      <button type="button" className="text-button danger" onClick={() => { if (window.confirm(`Delete ${product.name}? Products with orders are archived instead.`)) remove.mutate(product) }}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={products.data.pagination} onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })} />
        </>
      )}
    </section>
  )
}
