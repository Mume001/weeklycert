import { copy, count } from '@wc/copy'
import type { DeadlineLevel } from '@wc/data/dto'
import { cn } from 'cn'
import { CircleCheck, CircleX, type LucideIcon } from 'lucide-react'

const t = copy.dashboard.deadlines

// spec/03 §4.3: red once the day has passed, dark red past the 14 days of
// grace, when the $100 a day becomes legally possible. Icon and words always;
// the colour is never the only sign (spec/14 §1 rule 3).
const LEVEL: Record<DeadlineLevel, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheck, className: 'border-success-100 bg-success-50 text-success-600' },
  late: { icon: CircleX, className: 'border-error-100 bg-error-50 text-error-600' },
  penalty: { icon: CircleX, className: 'border-error-700 bg-error-700 text-white' },
}

/** "12 days left", "due today", "3 days late", as a badge in the colour of its level. */
export function DeadlineBadge({ daysLeft, level }: { daysLeft: number; level: DeadlineLevel }) {
  const { icon: Icon, className } = LEVEL[level]
  const text =
    daysLeft === 0
      ? t.dueToday
      : daysLeft > 0
        ? count(t, 'daysLeft', daysLeft)
        : count(t, 'daysLate', -daysLeft)
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-2xs font-semibold whitespace-nowrap',
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.4} aria-hidden="true" />
      {text}
    </span>
  )
}
