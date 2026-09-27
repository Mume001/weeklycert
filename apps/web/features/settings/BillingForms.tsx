'use client'

// Pause, unpause, cancel and keep (spec/03 §4.9, spec/08 §2.3). Stripe comes
// in step 7; here the mock changes the company's state. The cancellation is
// three steps: why, export first, then the company's name typed in.
import { copy, count, fill } from '@wc/copy'
import { CANCEL_REASONS, PAUSE_MONTHS } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Notice } from '@/components/patterns/Notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { cancelAction, keepSubscriptionAction, pauseAction, unpauseAction } from './actions'

const t = copy.settings.billing

export function PausedControls({ slug, resumesOn }: { slug: string; resumesOn: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Notice
      tone="info"
      title={
        resumesOn ? fill(t.pause.pausedUntil, { date: formatDate(resumesOn) }) : t.status.paused
      }
      action={
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await unpauseAction(slug)
              router.refresh()
            })
          }
        >
          {t.pause.unpause}
        </Button>
      }
    />
  )
}

export function CancellingControls({ slug, endsOn }: { slug: string; endsOn: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Notice
      tone="warning"
      title={fill(t.cancel.ends, { date: formatDate(endsOn) })}
      action={
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await keepSubscriptionAction(slug)
              router.refresh()
            })
          }
        >
          {t.cancel.keep}
        </Button>
      }
    />
  )
}

export function PauseForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [months, setMonths] = useState<number>(3)
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t.pause.action}
      </Button>
    )
  }
  return (
    <section
      aria-labelledby="pause-title"
      className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <h2 id="pause-title" className="text-md font-semibold text-text-primary">
        {t.pause.title}
      </h2>
      <p className="text-sm text-text-secondary">{t.pause.body}</p>
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="pause-months" label={t.pause.resumeAfter}>
          <select
            {...fieldIds('pause-months')}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className={selectClass}
          >
            {PAUSE_MONTHS.map((m) => (
              <option key={m} value={m}>
                {count(t.pause, 'months', m)}
              </option>
            ))}
          </select>
        </FormField>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await pauseAction(slug, months)
              router.refresh()
            })
          }
        >
          {t.pause.confirm}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {copy.buttons.cancel}
        </Button>
      </div>
    </section>
  )
}

export function CancelFlow({
  slug,
  companyName,
  exportHref,
}: {
  slug: string
  companyName: string
  /** "Export everything now", the same file as /settings/data. */
  exportHref: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t.cancel.action}
      </Button>
    )
  }

  return (
    <section
      aria-labelledby="cancel-title"
      className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <h2 id="cancel-title" className="text-md font-semibold text-text-primary">
        {t.cancel.action}
      </h2>
      {step === 1 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold text-n-800">{t.cancel.why}</legend>
          {CANCEL_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 accent-brand"
              />
              {t.cancel.reasons[r]}
            </label>
          ))}
          <FormField id="cancel-note" label={t.cancel.note} error={error}>
            <Input
              {...fieldIds('cancel-note', undefined, error)}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          <div>
            <Button
              onClick={() => {
                if (!reason) {
                  setError(t.cancel.reasonRequired)
                  return
                }
                setError(undefined)
                setStep(2)
              }}
            >
              {copy.buttons.continue}
            </Button>
          </div>
        </fieldset>
      )}
      {step === 2 && (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-n-800">{t.cancel.exportTitle}</h3>
          <p className="text-sm text-text-secondary">{t.cancel.exportBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <a href={exportHref}>{t.cancel.exportAction}</a>
            </Button>
            <Button onClick={() => setStep(3)}>{copy.buttons.continue}</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-n-800">{t.cancel.confirmTitle}</h3>
          <div>
            <Button variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
              {t.cancel.confirm}
            </Button>
          </div>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            danger
            title={t.cancel.action}
            body={t.records.body}
            confirmLabel={t.cancel.confirm}
            requireText={companyName}
            onConfirm={() =>
              start(async () => {
                const result = await cancelAction(slug, { reason, note }, companyName)
                setConfirming(false)
                if (!result.ok) {
                  setError(t.cancel[result.error])
                  setStep(1)
                  return
                }
                setOpen(false)
                setStep(1)
                router.refresh()
              })
            }
          />
        </div>
      )}
    </section>
  )
}
