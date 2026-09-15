import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon: LucideIcon
  /** A noun, not a sentence: "No workers yet" (spec/15 §3). */
  title: string
  /** One sentence that says why it is empty. */
  body: string
  /** One button. */
  action?: ReactNode
}

/** spec/14 §9: icon 32, title 16/600, one sentence, one button. */
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border-decorative bg-white px-6 py-10 text-center">
      <Icon className="size-8 text-n-600" strokeWidth={1.75} aria-hidden="true" />
      <p className="text-md font-semibold text-text-primary">{title}</p>
      <p className="max-w-prose text-sm text-text-secondary">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
