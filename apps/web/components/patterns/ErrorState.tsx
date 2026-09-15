'use client'

import { copy, fill } from '@wc/copy'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  title?: string
  body?: string
  requestId: string
  onRetry: () => void
}

/** spec/19 §7 error state: a button and the request id. Text from spec/15 §3. */
export function ErrorState({
  title = copy.errors.state.title,
  body = copy.errors.state.body,
  requestId,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-border-decorative bg-white px-6 py-10 text-center"
    >
      <CircleAlert className="size-8 text-error-500" strokeWidth={1.75} aria-hidden="true" />
      <p className="text-md font-semibold text-text-primary">{title}</p>
      <p className="max-w-prose text-sm text-text-secondary">{body}</p>
      <Button variant="secondary" className="mt-2" onClick={onRetry}>
        {copy.errors.state.retry}
      </Button>
      <p className="font-mono text-xs text-text-secondary">
        {fill(copy.errors.state.reference, { requestId })}
      </p>
    </div>
  )
}
