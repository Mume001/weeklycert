import { copy } from '@wc/copy'
import type { DisplayStatus } from '@wc/data/dto'
import { cn } from 'cn'
import {
  CircleCheck,
  CircleX,
  Lock,
  type LucideIcon,
  Pencil,
  PenTool,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

// Colour and icon per status (spec/03 §1, icons fixed by spec/14 §10).
// Text is always step 600 on the tone 50 (spec/14 §3); Corrected uses the violet ramp.
const STYLE: Record<DisplayStatus, { icon: LucideIcon; className: string }> = {
  draft: { icon: Pencil, className: 'border-n-200 bg-n-100 text-n-600' },
  needs_attention: {
    icon: TriangleAlert,
    className: 'border-warning-100 bg-warning-50 text-warning-600',
  },
  validated: { icon: CircleCheck, className: 'border-info-100 bg-info-50 text-info-600' },
  signed: { icon: PenTool, className: 'border-success-100 bg-success-50 text-success-600' },
  submitted: { icon: Lock, className: 'border-success-600 bg-success-600 text-white' },
  rejected: { icon: CircleX, className: 'border-error-100 bg-error-50 text-error-600' },
  corrected: { icon: RefreshCw, className: 'border-violet-100 bg-violet-50 text-violet-600' },
}

/** Icon and word, never colour alone (spec/14 §1 rule 3). 22 high, fully rounded, 11/600. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  const { icon: Icon, className } = STYLE[status]
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-2xs font-semibold whitespace-nowrap',
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.25} aria-hidden="true" />
      {copy.status[status]}
    </span>
  )
}
