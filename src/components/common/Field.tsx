import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type Common = { label: string; error?: string | null; hint?: ReactNode }

/** Labelled input with an associated error message (aria-invalid + aria-describedby). */
export const Field = ({ label, error, hint, id, className = '', ...props }: Common & InputHTMLAttributes<HTMLInputElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  const describedBy = [error ? `${inputId}-error` : '', hint ? `${inputId}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && <small id={`${inputId}-hint`} className="field-hint">{hint}</small>}
      {error && <small id={`${inputId}-error`} className="field-error">{error}</small>}
    </div>
  )
}

export const TextAreaField = ({ label, error, id, className = '', ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      <textarea id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error && <small id={`${inputId}-error`} className="field-error">{error}</small>}
    </div>
  )
}

export const SelectField = ({ label, error, id, className = '', children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${inputId}-error` : undefined} {...props}>{children}</select>
      {error && <small id={`${inputId}-error`} className="field-error">{error}</small>}
    </div>
  )
}

export const FormError = ({ message }: { message?: string | null }) => (message ? <p className="form-error" role="alert">{message}</p> : null)
