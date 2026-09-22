import { cn } from 'cn'
import { Info, type LucideIcon, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

const TONE = {
  info: {
    icon: Info,
    className: 'border-info-100 bg-info-50 text-info-600 shadow-[inset_3px_0_0_var(--info-500)]',
  },
  warning: {
    icon: TriangleAlert,
    className:
      'border-warning-100 bg-warning-50 text-warning-700 shadow-[inset_3px_0_0_var(--warning-500)]',
  },
} satisfies Record<string, { icon: LucideIcon; className: string }>

/** spec/14 §9 warning strip: 3 px bar in the colour, tone 50, icon, 13/600 title, 12 text. */
export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: keyof typeof TONE
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const { icon: Icon, className } = TONE[tone]
  return (
    <div className={cn('flex flex-wrap items-start gap-3 rounded-md border px-4 py-3', className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-xs text-n-800">{children}</div>}
      </div>
      {action}
    </div>
  )
}
