import { cn } from 'cn'
import type * as React from 'react'

// spec/14 §9: 36 high, n-450 border, radius 6, fs-base, focus ring;
// with an error the border is error-500 and the message below is error-600.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-border-interactive bg-white px-3 text-base text-text-primary transition-colors placeholder:text-text-secondary focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-n-50 disabled:text-text-disabled aria-invalid:border-error-500',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
