import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type Common = { label: string; error?: string | null; hint?: ReactNode }

const describedBy = (id: string, error?: string | null, hint?: ReactNode) =>
  [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined

const Label = ({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) => (
  <label htmlFor={htmlFor}>
    {label}
    {required && <span className="field-required" aria-hidden="true">*</span>}
  </label>
)

const Messages = ({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) => (
  <>
    {hint && <small id={`${id}-hint`} className="field-hint">{hint}</small>}
    {error && <small id={`${id}-error`} className="field-error">{error}</small>}
  </>
)

/** Labelled input with an associated error message (aria-invalid + aria-describedby). */
export const Field = ({ label, error, hint, id, className = '', ...props }: Common & InputHTMLAttributes<HTMLInputElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={`field ${className}`}>
      <Label htmlFor={inputId} label={label} required={props.required} />
      <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, error, hint)} {...props} />
      <Messages id={inputId} error={error} hint={hint} />
    </div>
  )
}

type NumberFieldProps = Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onValueChange: (value: number) => void
  /** Text shown inside the input, e.g. "₹". */
  prefix?: string
}

/**
 * Numeric input that keeps what the user typed as text, so the field can be cleared and retyped
 * (a controlled `type="number"` bound straight to a number snaps an empty field back to 0).
 * An empty field reports 0 to the form.
 */
export const NumberField = ({ label, error, hint, id, className = '', value, onValueChange, prefix, ...props }: NumberFieldProps) => {
  const generated = useId()
  const inputId = id ?? generated
  const [text, setText] = useState(value === 0 && props.placeholder ? '' : String(value))
  const [synced, setSynced] = useState(value)
  // Adopt values set from outside the input (e.g. a computed total) without fighting the user's typing.
  if (value !== synced) {
    setSynced(value)
    setText(String(value))
  }
  return (
    <div className={`field ${className}`}>
      <Label htmlFor={inputId} label={label} required={props.required} />
      <div className={`field-number ${prefix ? 'has-prefix' : ''}`}>
        {prefix && <span className="field-prefix" aria-hidden="true">{prefix}</span>}
        <input
          id={inputId}
          type="number"
          inputMode={props.step && String(props.step).includes('.') ? 'decimal' : 'numeric'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          {...props}
          value={text}
          onChange={(event) => {
            const next = event.target.value
            const parsed = next.trim() === '' ? 0 : Number(next)
            setText(next)
            if (Number.isFinite(parsed)) {
              setSynced(parsed)
              onValueChange(parsed)
            }
          }}
          onBlur={(event) => {
            // Tidy leading zeros ("02" → "2") once the user leaves the field.
            if (text.trim() !== '' && Number.isFinite(Number(text))) setText(String(Number(text)))
            props.onBlur?.(event)
          }}
          // Stop the mouse wheel from silently changing the number while scrolling the page.
          onWheel={(event) => event.currentTarget.blur()}
        />
      </div>
      <Messages id={inputId} error={error} hint={hint} />
    </div>
  )
}

export const TextAreaField = ({ label, error, hint, id, className = '', ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={`field ${className}`}>
      <Label htmlFor={inputId} label={label} required={props.required} />
      <textarea id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, error, hint)} {...props} />
      <Messages id={inputId} error={error} hint={hint} />
    </div>
  )
}

export const SelectField = ({ label, error, hint, id, className = '', children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) => {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={`field ${className}`}>
      <Label htmlFor={inputId} label={label} required={props.required} />
      <select id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, error, hint)} {...props}>{children}</select>
      <Messages id={inputId} error={error} hint={hint} />
    </div>
  )
}

export const FormError = ({ message }: { message?: string | null }) => (message ? <p className="form-error" role="alert">{message}</p> : null)
