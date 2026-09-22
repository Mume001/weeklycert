'use client'

// "Deductions and all work" (spec/03 §4.5): what the hours cannot know. The
// engine checks net pay against the deductions (spec/05 §3.5), so these
// figures are what turns those findings on; nothing here computes anything.
import { copy } from '@wc/copy'
import type { DeductionKind, ReviewWorker } from '@wc/data/dto'
import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { fieldIds, selectClass } from '@/components/patterns/FormField'
import { Money } from '@/components/patterns/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { savePayrollAction } from './actions'

const t = copy.review.payroll
const KINDS = Object.keys(copy.review.deductionKinds) as DeductionKind[]

interface DeductionRow {
  /** Stable across edits, so React keys never fall back to the index. */
  key: string
  kind: DeductionKind
  label: string
  amount: string
}

interface Row {
  grossAllWork: string
  netPay: string
  deductions: DeductionRow[]
}

const rowOf = (worker: ReviewWorker): Row => ({
  grossAllWork: worker.hasPayroll ? worker.grossAllWork : '',
  netPay: worker.hasPayroll ? worker.netPay : '',
  deductions: worker.deductions.map((d, i) => ({
    key: `${worker.workerId}-${i}`,
    kind: d.kind,
    label: d.label ?? '',
    amount: d.amount,
  })),
})

export function PayrollSection({
  slug,
  periodId,
  workers,
  readOnly,
}: {
  slug: string
  periodId: string
  workers: ReviewWorker[]
  readOnly: boolean
}) {
  const [pending, start] = useTransition()
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(workers.map((w) => [w.workerId, rowOf(w)])),
  )

  const update = (workerId: string, change: Partial<Row>) =>
    setRows((current) => ({
      ...current,
      [workerId]: {
        ...(current[workerId] ?? { grossAllWork: '', netPay: '', deductions: [] }),
        ...change,
      },
    }))

  const save = () =>
    start(async () => {
      await savePayrollAction(
        slug,
        periodId,
        workers.flatMap((worker) => {
          const row = rows[worker.workerId]
          return row ? [{ workerId: worker.workerId, ...row }] : []
        }),
      )
    })

  return (
    <section className="grid gap-3" aria-labelledby="payroll-heading">
      <div>
        <h2 id="payroll-heading" className="text-lg font-semibold text-text-primary">
          {t.title}
        </h2>
        <p className="text-sm text-text-secondary">{t.hint}</p>
      </div>

      <div className="grid gap-2">
        {workers.map((worker) => {
          const row = rows[worker.workerId] ?? { grossAllWork: '', netPay: '', deductions: [] }
          const gross = `payroll-${worker.workerId}-gross`
          const net = `payroll-${worker.workerId}-net`
          return (
            <div
              key={worker.workerId}
              className="grid gap-2 rounded-lg border border-border-decorative bg-white px-4 py-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:items-end"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-text-primary">{worker.workerName}</p>
                <p className="text-xs text-text-secondary">
                  <Money value={worker.grossProject} />
                </p>
              </div>
              <div className="grid gap-1">
                <label htmlFor={gross} className="text-xs font-semibold text-n-700">
                  {t.grossAllWork}
                </label>
                <Input
                  {...fieldIds(gross)}
                  inputMode="decimal"
                  disabled={readOnly}
                  value={row.grossAllWork}
                  onChange={(e) => update(worker.workerId, { grossAllWork: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <label htmlFor={net} className="text-xs font-semibold text-n-700">
                  {t.netPay}
                </label>
                <Input
                  {...fieldIds(net)}
                  inputMode="decimal"
                  disabled={readOnly}
                  value={row.netPay}
                  onChange={(e) => update(worker.workerId, { netPay: e.target.value })}
                />
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update(worker.workerId, {
                      deductions: [
                        ...row.deductions,
                        {
                          key: `${worker.workerId}-${row.deductions.length}-${worker.lines.length}`,
                          kind: 'federal_tax' as DeductionKind,
                          label: '',
                          amount: '',
                        },
                      ],
                    })
                  }
                >
                  {t.add}
                </Button>
              )}

              {row.deductions.map((deduction, index) => {
                const kindId = `payroll-${worker.workerId}-kind-${index}`
                const amountId = `payroll-${worker.workerId}-amount-${index}`
                const change = (next: Partial<DeductionRow>) =>
                  update(worker.workerId, {
                    deductions: row.deductions.map((d, i) => (i === index ? { ...d, ...next } : d)),
                  })
                return (
                  <div
                    key={deduction.key}
                    className="grid gap-2 sm:col-span-4 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:items-end"
                  >
                    <div className="grid gap-1 sm:col-start-2">
                      <label htmlFor={kindId} className="text-xs font-semibold text-n-700">
                        {t.deduction}
                      </label>
                      <select
                        {...fieldIds(kindId)}
                        className={selectClass}
                        disabled={readOnly}
                        value={deduction.kind}
                        onChange={(e) => change({ kind: e.target.value as DeductionKind })}
                      >
                        {KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {copy.review.deductionKinds[kind]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <label htmlFor={amountId} className="text-xs font-semibold text-n-700">
                        {t.amount}
                      </label>
                      <Input
                        {...fieldIds(amountId)}
                        inputMode="decimal"
                        disabled={readOnly}
                        value={deduction.amount}
                        onChange={(e) => change({ amount: e.target.value })}
                      />
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t.remove}
                        onClick={() =>
                          update(worker.workerId, {
                            deductions: row.deductions.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div>
          <Button type="button" onClick={save} disabled={pending}>
            {t.save}
          </Button>
        </div>
      )}
    </section>
  )
}
