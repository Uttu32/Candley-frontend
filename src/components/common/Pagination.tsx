import type { Pagination as PaginationData } from '../../types'

type Props = { pagination: PaginationData; onPageChange: (page: number) => void; label?: string }

export const Pagination = ({ pagination, onPageChange, label = 'Pagination' }: Props) => {
  const { page, totalPages } = pagination
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((value) => value === 1 || value === totalPages || Math.abs(value - page) <= 1)
  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="secondary-button small" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {pages.map((value, index) => (
        <span key={value} className="pagination-item">
          {index > 0 && value - pages[index - 1]! > 1 && <span aria-hidden="true">…</span>}
          <button type="button" className={`pagination-page ${value === page ? 'active' : ''}`} aria-current={value === page ? 'page' : undefined} aria-label={`Page ${value}`} onClick={() => onPageChange(value)}>
            {value}
          </button>
        </span>
      ))}
      <button type="button" className="secondary-button small" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  )
}
