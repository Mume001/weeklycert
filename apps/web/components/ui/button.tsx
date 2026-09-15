import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import type * as React from 'react'

// spec/14 §9: primary 36 high, padding 0 14, radius 6, brand, white 600;
// secondary white with an n-450 border and n-800 text; danger only for deleting;
// small 30 high at fs-sm. Icon buttons are 32 x 32 (spec/14 §8).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold whitespace-nowrap transition-colors select-none focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error-500 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'border-brand bg-brand text-white hover:border-brand-hover hover:bg-brand-hover',
        secondary: 'border-border-interactive bg-white text-n-800 hover:bg-n-50',
        outline: 'border-border-interactive bg-white text-n-800 hover:bg-n-50',
        destructive:
          'border-error-600 bg-error-600 text-white hover:border-error-700 hover:bg-error-700',
        ghost: 'border-transparent bg-transparent text-n-800 hover:bg-n-100',
        link: 'h-auto border-transparent px-0 text-teal-700 underline underline-offset-2 hover:text-teal-800',
      },
      size: {
        default: 'h-9 px-3.5 text-sm',
        sm: 'h-[30px] px-2.5 text-sm',
        icon: 'size-8',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
