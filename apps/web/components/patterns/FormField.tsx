import { cn } from 'cn'
import type { ReactNode } from 'react'

/** The ids a control points at, so a screen reader reads the hint and the error with it. */
export function fieldIds(id: string, hint?: string, error?: string, warning?: string) {
  const describedBy = [hint && `${id}-hint`, warning && `${id}-warning`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ')
  return {
    id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
  }
}

export interface FormFieldProps {
  id: string
  label: string
  /** One sentence under the control (spec/15 §3). */
  hint?: string
  /** The error sentence, from packages/copy; the border turns error-500 (spec/14 §9). */
  error?: string
  /** A sentence worth reading that blocks nothing: amber text, no aria-invalid. */
  warning?: string
  children: ReactNode
  className?: string
}

/**
 * Label, control, hint and error, in that order (spec/14 §9: the message sits
 * below the field in error-600). The error is text, never colour alone
 * (WCAG 3.3.1). The control itself takes its ids from fieldIds().
 */
export function FormField({
  id,
  label,
  hint,
  warning,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-n-800">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {warning && (
        <p id={`${id}-warning`} className="text-xs font-semibold text-warning-700">
          {warning}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-error-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** A native select with the input's measures (spec/14 §9: same as a field, chevron right). */
export const selectClass =
  'h-9 w-full min-w-0 rounded-md border border-border-interactive bg-white px-2.5 text-base text-text-primary focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-n-50 disabled:text-text-disabled aria-invalid:border-error-500'
