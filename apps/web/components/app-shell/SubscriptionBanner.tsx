'use client'

import { copy, count } from '@wc/copy'
import { cn } from 'cn'
import { CircleAlert, CirclePause, Info, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SubscriptionBannerProps {
  state: 'trial' | 'paused' | 'past_due'
  daysLeft?: number
  /** Only for roles that may act on billing (spec/02 §3: the owner). */
  onAction?: () => void
}

// spec/14 §9 alert strip: 3 px bar in the colour, tone-50 background, icon, text.
const TONE: Record<SubscriptionBannerProps['state'], { icon: LucideIcon; className: string }> = {
  trial: {
    icon: Info,
    className: 'bg-info-50 text-info-600 shadow-[inset_3px_0_0_var(--info-500)]',
  },
  paused: {
    icon: CirclePause,
    className: 'bg-warning-50 text-warning-600 shadow-[inset_3px_0_0_var(--warning-500)]',
  },
  past_due: {
    icon: CircleAlert,
    className: 'bg-error-50 text-error-600 shadow-[inset_3px_0_0_var(--error-500)]',
  },
}

const ACTION = {
  trial: copy.shell.subscription.trial.action,
  paused: copy.shell.subscription.paused.action,
  past_due: copy.shell.subscription.pastDue.action,
} as const

/** Singular or plural by the number of days (spec/15 §1 rule 11). */
function bannerText(state: SubscriptionBannerProps['state'], daysLeft: number): string {
  if (state === 'trial') return count(copy.shell.subscription.trial, 'text', daysLeft)
  if (state === 'past_due') return count(copy.shell.subscription.pastDue, 'text', daysLeft)
  return copy.shell.subscription.paused.text
}

/** Under the page bar, only when needed (spec/03 §3). Text from spec/15 §3. */
export function SubscriptionBanner({ state, daysLeft = 0, onAction }: SubscriptionBannerProps) {
  const { icon: Icon, className } = TONE[state]
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-decorative px-6 py-2.5',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-semibold">{bannerText(state, daysLeft)}</p>
      {onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {ACTION[state]}
        </Button>
      )}
    </div>
  )
}
