'use client'

import { copy, fill } from '@wc/copy'
import {
  type AllocationErrors,
  type AllocationInput,
  AllocationInputSchema,
  allocationErrors,
  type WorkerFormDTO,
} from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DateText } from '@/components/patterns/DateText'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import { saveAllocationAction } from './actions'

const f = copy.workers.form
const a = f.allocation

type Row = WorkerFormDTO['fringe'][number]

const EMPTY: AllocationInput = {
  fringePlanId: '',
  hourlyCreditOverride: '',
  effectiveFrom: '',
  effectiveTo: '',
}

/** One allocation's fields: plan, credit per hour, from, to (spec/03 §4.6). */
function AllocationForm({
  slug,
  workerId,
  row,
  plans,
  onDone,
}: {
  slug: string
  workerId: string
  /** Null adds a new one. */
  row: Row | null
  plans: WorkerFormDTO['plans']
  onDone: () => void
}) {
  const router = useRouter()
  const [values, setValues] = useState<AllocationInput>(
    row
      ? {
          fringePlanId: row.planId,
          hourlyCreditOverride: row.override,
          effectiveFrom: row.from,
          effectiveTo: row.to ?? '',
        }
      : EMPTY,
  )
  const [errors, setErrors] = useState<AllocationErrors>({})
  const [busy, setBusy] = useState(false)
  const prefix = `allocation-${row?.allocationId ?? 'new'}`
  const set = (key: keyof AllocationInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))
  const error = (key: keyof AllocationInput) => {
    const code = errors[key]
    return code && a.errors[code]
  }

  const save = async () => {
    const local = AllocationInputSchema.safeParse(values)
    if (!local.success) return setErrors(allocationErrors(local.error))
    setBusy(true)
    const result = await saveAllocationAction(slug, workerId, row?.allocationId ?? null, values)
    setBusy(false)
    if (!result.ok) return setErrors(result.errors)
    onDone()
    router.refresh()
  }

  const field = (
    key: 'hourlyCreditOverride' | 'effectiveFrom' | 'effectiveTo',
    label: string,
    hint?: string,
  ) => {
    const id = `${prefix}-${key}`
    const message = error(key)
    return (
      <FormField id={id} label={label} hint={hint} error={message}>
        <Input
          {...fieldIds(id, hint, message)}
          type={key === 'hourlyCreditOverride' ? 'text' : 'date'}
          inputMode={key === 'hourlyCreditOverride' ? 'decimal' : undefined}
          value={values[key]}
          onChange={set(key)}
        />
      </FormField>
    )
  }

  const planId = `${prefix}-plan`
  const planError = error('fringePlanId')
  return (
    <div className="grid gap-4 rounded-md border border-border-decorative bg-n-50 p-4 sm:grid-cols-2">
      <FormField id={planId} label={a.fields.plan.label} error={planError}>
        <select
          {...fieldIds(planId, undefined, planError)}
          className={selectClass}
          value={values.fringePlanId}
          onChange={set('fringePlanId')}
        >
          <option value="">{a.fields.plan.none}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>
      {field('hourlyCreditOverride', a.fields.credit.label, a.fields.credit.hint)}
      {field('effectiveFrom', a.fields.from.label)}
      {field('effectiveTo', a.fields.to.label, a.fields.to.hint)}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="button" disabled={busy} onClick={() => void save()}>
          {row ? a.save : a.create}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {a.cancel}
        </Button>
      </div>
    </div>
  )
}

/**
 * The worker's fringe plans (worker_fringe_allocations, spec/04 §3.5): plan,
 * credit per hour, from, to. Owner, admin and payroll add, change and end them;
 * everybody else reads the table. The grid's engine credits the same rows.
 */
export function WorkerFringe({
  slug,
  form,
  canEdit,
}: {
  slug: string
  form: WorkerFormDTO
  canEdit: boolean
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const workerId = form.workerId ?? ''
  const done = () => setEditing(null)

  return (
    <section
      aria-labelledby="section-fringe"
      className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <h2 id="section-fringe" className="text-md font-semibold text-text-primary">
        {f.sections.fringe}
      </h2>
      {form.fringe.length === 0 ? (
        <p className="text-sm text-text-secondary">{f.noFringe}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.fringeColumns.plan}</TableHead>
              <TableHead className="text-right">{f.fringeColumns.credit}</TableHead>
              <TableHead>{f.fringeColumns.from}</TableHead>
              <TableHead>{f.fringeColumns.to}</TableHead>
              {canEdit && (
                <TableHead>
                  <span className="sr-only">{copy.fringe.columns.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.fringe.map((row) => (
              <TableRow key={row.allocationId}>
                <TableCell>{row.planName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.creditPerHour === null ? copy.fringe.notSet : formatMoney(row.creditPerHour)}
                </TableCell>
                <TableCell>
                  <DateText value={row.from} />
                </TableCell>
                <TableCell>{row.to === null ? f.noEndDate : <DateText value={row.to} />}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={fill(a.editLabel, { Plan: row.planName })}
                      onClick={() => setEditing(row.allocationId)}
                    >
                      {a.edit}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit && editing !== null && (
        <AllocationForm
          key={editing}
          slug={slug}
          workerId={workerId}
          row={form.fringe.find((r) => r.allocationId === editing) ?? null}
          plans={form.plans}
          onDone={done}
        />
      )}
      {canEdit &&
        editing === null &&
        (form.plans.length === 0 ? (
          <p className="text-sm text-text-secondary">{a.noPlans}</p>
        ) : (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing('new')}>
              {a.add}
            </Button>
          </div>
        ))}
    </section>
  )
}
