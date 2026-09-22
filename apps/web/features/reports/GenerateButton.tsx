'use client'

// "Generate the draft" (spec/03 §4.5). The job runs in the background even in
// this phase: the action returns a report id and the screen polls
// api/v1/reports/[id]/status until it is done (spec/19 §2), so the wait is
// built against a real one and not a fake spinner.
import { copy, count, fill } from '@wc/copy'
import type { ReportStatusDTO } from '@wc/data/dto'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useWeekState } from '@/lib/week-state'
import { generateAction } from './actions'

export function GenerateButton({
  slug,
  periodId,
  next,
}: {
  slug: string
  periodId: string
  /** What follows a draft: the signature, or asking the signer for it. */
  next: ReactNode
}) {
  const { blocking, unacknowledgedSoft } = useWeekState()
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [version, setVersion] = useState<number | null>(null)

  const refused =
    blocking.length > 0
      ? count(copy.grid, 'generateDisabled', blocking.length)
      : unacknowledgedSoft.length > 0
        ? count(copy.review, 'warningsBlock', unacknowledgedSoft.length)
        : null

  const run = async () => {
    setState('running')
    const started = await generateAction(slug, periodId)
    if (!started.ok) {
      setState('idle')
      return
    }
    // Poll until the job says it is done, the way the real screen will.
    for (let i = 0; i < 20; i++) {
      const response = await fetch(
        `/api/v1/reports/${started.reportId}/status?t=${encodeURIComponent(slug)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) break
      const status: ReportStatusDTO = await response.json()
      if (status.state === 'done') break
      if (status.state === 'failed') {
        setState('idle')
        return
      }
    }
    setVersion(started.version)
    setState('done')
  }

  // The draft is there, so the screen says so and offers what comes next. It
  // does not refresh itself: that would take this line away as it appears.
  if (state === 'done' && version !== null) {
    return (
      <span className="flex flex-wrap items-center gap-3">
        <span role="status" className="text-sm font-semibold text-success-700">
          {fill(copy.review.ready, { n: version })}
        </span>
        {next}
      </span>
    )
  }

  const button = (
    <Button onClick={run} disabled={refused !== null || state === 'running'}>
      {state === 'running' ? copy.review.generating : copy.review.generate}
    </Button>
  )

  if (refused === null) return button
  return (
    <TooltipProvider>
      <Tooltip>
        {/* A disabled button gives no tooltip, so the wrapper carries it. */}
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{refused}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
