import { cn } from 'cn'
import type * as React from 'react'

// spec/14 §9: skeleton in n-100. No pulse: animations over 200 ms are not
// allowed (spec/14 §11), and a static shape reads just as clearly.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('rounded-md bg-n-100', className)} {...props} />
}

export { Skeleton }
