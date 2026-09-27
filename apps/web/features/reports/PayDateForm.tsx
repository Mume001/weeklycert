'use client'

// The week's pay date (spec/01 §2.9): the company's setting unless this week
// has its own. The WH-347 is due 7 days after it, so it is worth a look here.
import { copy } from '@wc/copy'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setPayDateAction } from './actions'

const t = copy.review.payDate

export function PayDateForm({
  slug,
  periodId,
  payDate,
  readOnly,
}: {
  slug: string
  periodId: string
  payDate: { date: string; source: 'week' | 'company' }
  readOnly: boolean
}) {
  const [value, setValue] = useState(payDate.date)
  // A saved date comes back as the new prop; the field follows it.
  const [shown, setShown] = useState(payDate.date)
  if (shown !== payDate.date) {
    setShown(payDate.date)
    setValue(payDate.date)
  }
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const hint = payDate.source === 'week' ? t.entered : t.fromCompany

  const save = (date: string | null) =>
    start(async () => {
      setSaved(false)
      await setPayDateAction(slug, periodId, date)
      setSaved(true)
    })

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-border-decorative bg-white p-4 shadow-sm">
      <FormField id="pay-date" label={t.label} hint={hint}>
        <Input
          {...fieldIds('pay-date', hint)}
          type="date"
          value={value}
          disabled={readOnly || pending}
          onChange={(e) => setValue(e.target.value)}
          className="w-44"
        />
      </FormField>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 pb-6">
          <Button
            type="button"
            variant="secondary"
            disabled={pending || value === '' || value === payDate.date}
            onClick={() => save(value)}
          >
            {t.save}
          </Button>
          {payDate.source === 'week' && (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => save(null)}>
              {t.useCompany}
            </Button>
          )}
          <span role="status" className="text-sm text-text-secondary">
            {saved ? t.saved : ''}
          </span>
        </div>
      )}
    </section>
  )
}
