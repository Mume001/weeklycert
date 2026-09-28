'use client'

import { copy, fill } from '@wc/copy'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatClock } from '@/lib/format'
import {
  approveScheduleAction,
  discardJobAction,
  endSupportAction,
  retryJobAction,
  startSupportAction,
} from './actions'

const a = copy.admin

/** The reason first: it goes into the company's audit log for the owner (11 §2). */
export function SupportAccessForm({ tenantId }: { tenantId: string }) {
  const [pending, start] = useTransition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const t = a.tenant.support
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await startSupportAction(tenantId, reason)
          if (!result.ok) setError(t.reasonRequired)
        })
      }}
    >
      <h2 className="text-md font-semibold text-text-primary">{t.title}</h2>
      <p className="text-sm text-text-secondary">{t.body}</p>
      <FormField id="support-reason" label={t.reason} error={error}>
        <Input
          {...fieldIds('support-reason', undefined, error)}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={pending}>
          {t.start}
        </Button>
      </div>
    </form>
  )
}

/** The strip across a company while the admin looks in (03 §4.10). */
export function SupportBanner({
  tenantId,
  company,
  until,
}: {
  tenantId: string
  company: string
  until: string
}) {
  const [pending, start] = useTransition()
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-warning-100 bg-warning-50 px-6 py-2 text-sm font-semibold text-warning-700"
    >
      <span className="min-w-0 flex-1">
        {fill(a.supportBanner, { Company: company, time: formatClock(until) })}
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(() => endSupportAction(tenantId))}
      >
        {a.endSupport}
      </Button>
    </div>
  )
}

export function JobButtons({ jobId, describedBy }: { jobId: string; describedBy: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (action: typeof retryJobAction) =>
    start(async () => {
      await action(jobId)
      router.refresh()
    })
  return (
    <span className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-describedby={describedBy}
        onClick={() => run(retryJobAction)}
      >
        {a.jobs.retry}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-describedby={describedBy}
        onClick={() => run(discardJobAction)}
      >
        {a.jobs.discard}
      </Button>
    </span>
  )
}

export function ApproveButton({
  scheduleId,
  describedBy,
}: {
  scheduleId: string
  describedBy: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      aria-describedby={describedBy}
      onClick={() =>
        start(async () => {
          await approveScheduleAction(scheduleId)
          router.refresh()
        })
      }
    >
      {a.wageSchedules.approve}
    </Button>
  )
}
