'use client'

// Everything the filing screen writes (spec/03 §4.5): the confirmation from
// the portal, what the portal answered, the package to the general contractor,
// and the correction. Nothing is sent from here: the portal has no API
// (spec/05 §3.4) and there is no email in this phase (spec/19 §11), so what
// these forms do is record what the customer did.
import { copy, fill } from '@wc/copy'
import type { SubmissionDTO } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCorrectionAction,
  recordOutcomeAction,
  recordSentToPrimeAction,
  recordSubmissionAction,
} from './actions'

const t = copy.reports

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

export function RecordFiling({
  slug,
  periodId,
  prc,
  weekEnding,
}: {
  slug: string
  periodId: string
  prc: string
  /** Already formatted for the reader: the steps name the week you pick in the portal. */
  weekEnding: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  return (
    <Card title={t.filing.title}>
      <ol className="grid list-decimal gap-1 pl-5 text-sm text-text-secondary">
        {copy.submit.steps.map((step) => (
          <li key={step}>{fill(step, { prc, date: weekEnding })}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <FormField id="filing-ref" label={t.filing.confirmation} error={error}>
            <Input
              {...fieldIds('filing-ref', undefined, error)}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await recordSubmissionAction(slug, periodId, {
                confirmationRef: value,
              })
              if (!result.ok) {
                setError(t.errors.confirmationRequired)
                return
              }
              setError(undefined)
              setValue('')
              router.refresh()
            })
          }
        >
          {t.filing.submit}
        </Button>
      </div>
    </Card>
  )
}

export function PortalResponse({ slug, submission }: { slug: string; submission: SubmissionDTO }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [reason, setReason] = useState('')

  const record = (outcome: 'accepted' | 'rejected') =>
    start(async () => {
      await recordOutcomeAction(slug, submission.id, outcome, reason)
      router.refresh()
    })

  return (
    <Card title={t.portal.title}>
      <p className="text-sm font-semibold text-text-primary">{copy.submit.rejectedTitle}</p>
      <p className="text-sm text-text-secondary">{copy.submit.rejectedBody}</p>
      <FormField id="portal-reason" label={t.portal.reason}>
        <Input
          {...fieldIds('portal-reason')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => record('accepted')}>
          {t.portal.accepted}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => record('rejected')}>
          {t.portal.rejected}
        </Button>
      </div>
    </Card>
  )
}

export function SendToPrime({ slug, periodId }: { slug: string; periodId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState('')

  return (
    <Card title={t.toPrime.record}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <FormField id="prime-email" label={t.toPrime.email}>
            <Input
              {...fieldIds('prime-email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          variant="secondary"
          disabled={pending || email.trim() === ''}
          onClick={() =>
            start(async () => {
              await recordSentToPrimeAction(slug, periodId, email)
              setEmail('')
              router.refresh()
            })
          }
        >
          {t.toPrime.record}
        </Button>
      </div>
    </Card>
  )
}

export function CreateCorrection({
  slug,
  periodId,
  weekHref,
}: {
  slug: string
  periodId: string
  weekHref: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  return (
    <Card title={copy.locked.createCorrection}>
      <p className="text-sm text-text-secondary">{t.correction.note}</p>
      <FormField id="correction-note" label={t.correction.field} error={error}>
        <Input
          {...fieldIds('correction-note', undefined, error)}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>
      <div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await createCorrectionAction(slug, periodId, note)
              if (!result.ok) {
                setError(t.correction.error)
                return
              }
              router.push(weekHref)
            })
          }
        >
          {copy.locked.createCorrection}
        </Button>
      </div>
    </Card>
  )
}
