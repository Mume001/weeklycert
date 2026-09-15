'use client'

import { copy, fill } from '@wc/copy'
import type { IsoDate } from '@wc/data/dto'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

export type LockedBannerProps = {
  /** Date of the signature, or of the submission. */
  signedAt: IsoDate
  /** Absent for roles that may not correct (viewer). */
  onCreateCorrection?: () => void
} & ({ reason: 'signed'; signedBy: string } | { reason: 'submitted' })

/** spec/19 §7 locked state: the content stays readable, a correction is offered. */
export function LockedBanner(props: LockedBannerProps) {
  const date = formatDate(props.signedAt)
  const text =
    props.reason === 'signed'
      ? fill(copy.locked.signed, { date, Name: props.signedBy })
      : fill(copy.locked.submitted, { date })
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border border-info-100 bg-info-50 px-4 py-3 text-info-600 shadow-[inset_3px_0_0_var(--info-500)]"
    >
      <Lock className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-semibold">{text}</p>
      {props.onCreateCorrection && (
        <Button variant="secondary" size="sm" onClick={props.onCreateCorrection}>
          {copy.locked.createCorrection}
        </Button>
      )}
    </div>
  )
}
