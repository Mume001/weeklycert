'use client'

import { copy, count, fill } from '@wc/copy'
import {
  type PiiPart,
  type WorkerFormDTO,
  type WorkerFormError,
  type WorkerFormErrors,
  type WorkerInput,
  WorkerInputSchema,
  workerFormErrors,
} from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createWorkerAction, readPiiAction, updateWorkerAction } from './actions'

const f = copy.workers.form
const fields = f.fields

/** The dots of a hidden value. A shape, not text: the reader hears `f.hidden`. */
const DOTS = '••••'

const EMPTY_APPRENTICE: NonNullable<WorkerInput['apprentice']> = {
  programName: '',
  registrar: '',
  programRegistrationNo: '',
  trade: '',
  periodNo: '',
  pctOfJourney: '',
  validFrom: '',
  validTo: '',
}

export interface WorkerFormProps {
  slug: string
  form: WorkerFormDTO
  /** A paused company reads (spec/08 §2.4). Show still works: it is a read. */
  readOnly: boolean
  cancelHref: string
  /**
   * Where a created one goes, "{id}" standing for its id. The onboarding wizard
   * sets it so a create lands back in the wizard (spec/03 §4.3); the screen's
   * own page is the default.
   */
  createdHref?: string
}

function message(error: WorkerFormError | undefined): string | undefined {
  return error && fill(f.errors[error.code], error.values ?? {})
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <h2 id={id} className="text-md font-semibold text-text-primary sm:col-span-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * The worker form (spec/03 §4.6). The PII parts of a saved worker start hidden:
 * the form holds no value until Show, which reads one part through the server
 * and is logged (spec/04 §6). A part that stays hidden is not sent back, so it
 * stays as it is. The SSN field takes four digits and nothing else; there is no
 * field for a full SSN anywhere (spec/11 §5).
 */
export function WorkerForm({ slug, form, readOnly, cancelHref, createdHref }: WorkerFormProps) {
  const router = useRouter()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<WorkerFormErrors>({})
  const [saved, setSaved] = useState(false)
  const isNew = form.workerId === null
  // A part is open when it was shown, or when there is nothing on file to hide.
  const [open, setOpen] = useState<Record<PiiPart, boolean>>({
    ssnLast4: !form.pii.hasSsnLast4,
    dateOfBirth: !form.pii.hasDateOfBirth,
    address: form.pii.place === null,
  })
  const [shown, setShown] = useState<Record<PiiPart, boolean>>({
    ssnLast4: false,
    dateOfBirth: false,
    address: false,
  })
  const { register, handleSubmit, watch, setValue, formState } = useForm<WorkerInput>({
    defaultValues: { ...form.values, apprentice: form.values.apprentice ?? EMPTY_APPRENTICE },
  })
  const level = watch('level')

  const show = (next: WorkerFormErrors) => {
    setErrors(next)
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const reveal = async (part: PiiPart) => {
    if (!form.workerId) return
    const pii = await readPiiAction(slug, form.workerId, part)
    if (pii?.part === 'ssnLast4') setValue('ssnLast4', pii.value)
    if (pii?.part === 'dateOfBirth') setValue('dateOfBirth', pii.value)
    if (pii?.part === 'address') setValue('address', pii.value)
    setOpen((o) => ({ ...o, [part]: true }))
    setShown((s) => ({ ...s, [part]: true }))
  }

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false)
    const payload: WorkerInput = {
      ...values,
      // A hidden part is left out, which the server reads as "unchanged".
      ssnLast4: open.ssnLast4 ? (values.ssnLast4 ?? '') : undefined,
      dateOfBirth: open.dateOfBirth ? (values.dateOfBirth ?? '') : undefined,
      address: open.address ? values.address : undefined,
      apprentice: values.level === 'RA' ? (values.apprentice ?? EMPTY_APPRENTICE) : null,
    }
    const local = WorkerInputSchema.safeParse(payload)
    if (!local.success) return show(workerFormErrors(local.error))
    const result =
      form.workerId === null
        ? await createWorkerAction(slug, payload)
        : await updateWorkerAction(slug, form.workerId, payload)
    if (!result.ok) return show(result.errors)
    setErrors({})
    if (isNew)
      router.push(createdHref?.replace('{id}', result.id) ?? `/app/${slug}/workers/${result.id}`)
    else {
      setSaved(true)
      router.refresh()
    }
  })

  type Path = Parameters<typeof register>[0]
  const text = (
    name: Path,
    field: { label: string; hint?: string },
    extra?: { type?: string; inputMode?: 'numeric'; maxLength?: number; prefix?: string },
  ) => {
    const id = `worker-${name.replace('.', '-')}`
    const error = message(errors[name])
    const input = (
      <Input
        {...fieldIds(id, field.hint, error)}
        type={extra?.type ?? 'text'}
        inputMode={extra?.inputMode}
        maxLength={extra?.maxLength}
        disabled={readOnly}
        autoComplete="off"
        className={extra?.prefix ? 'w-24 font-mono tabular-nums' : undefined}
        {...register(name)}
      />
    )
    return (
      <FormField id={id} label={field.label} hint={field.hint} error={error}>
        {extra?.prefix ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="font-mono text-n-700">
              {extra.prefix}
            </span>
            {input}
          </span>
        ) : (
          input
        )}
      </FormField>
    )
  }

  /** A part on file that is still hidden: the dots, and Show. A fieldset, since there is no control to label yet. */
  const hidden = (part: PiiPart, label: string, hint?: string) => {
    const id = `worker-${part}`
    const error = message(errors[part])
    return (
      <fieldset
        aria-describedby={[`${id}-state`, hint && `${id}-hint`, error && `${id}-error`]
          .filter(Boolean)
          .join(' ')}
        className="grid min-w-0 content-start gap-1.5"
      >
        <legend className="mb-1.5 text-sm font-semibold text-n-800">{label}</legend>
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-n-700">
            {DOTS}
          </span>
          <span id={`${id}-state`} className="sr-only">
            {f.hidden}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={f.showLabels[part]}
            onClick={() => void reveal(part)}
          >
            {f.show}
          </Button>
        </span>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-text-secondary">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-xs font-semibold text-error-600">
            {error}
          </p>
        )}
      </fieldset>
    )
  }

  const shownNote = (part: PiiPart) =>
    shown[part] && (
      <p role="status" className="text-xs text-text-secondary sm:col-span-2">
        {f.shown}
      </p>
    )

  const errorCount = Object.keys(errors).length
  const place = form.pii.place

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-[880px] gap-5">
      {errorCount > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 shadow-[inset_3px_0_0_var(--error-500)] focus-visible:focus-ring"
        >
          {count(f, 'summary', errorCount)}
        </div>
      )}
      {saved && (
        <p role="status" className="text-sm font-semibold text-success-700">
          {f.saved}
        </p>
      )}

      <Section title={f.sections.basics}>
        {text('firstName', fields.firstName)}
        {text('lastName', fields.lastName)}
        {text('middleName', fields.middleName)}
        {text('workerNumber', fields.workerNumber)}
        <FormField id="worker-defaultClassificationId" label={fields.defaultClassificationId.label}>
          <select
            {...fieldIds('worker-defaultClassificationId')}
            className={selectClass}
            disabled={readOnly}
            {...register('defaultClassificationId')}
          >
            <option value="">{fields.defaultClassificationId.none}</option>
            {form.classifications.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="worker-level" label={fields.level.label}>
          <select
            {...fieldIds('worker-level')}
            className={selectClass}
            disabled={readOnly}
            {...register('level')}
          >
            {(['J', 'RA', 'F', 'O'] as const).map((l) => (
              <option key={l} value={l}>
                {copy.workers.levels[l].label}
              </option>
            ))}
          </select>
        </FormField>
        {text('hireDate', fields.hireDate, { type: 'date' })}
        <FormField id="worker-status" label={fields.status.label}>
          <select
            {...fieldIds('worker-status')}
            className={selectClass}
            disabled={readOnly}
            {...register('status')}
          >
            {(['active', 'inactive'] as const).map((s) => (
              <option key={s} value={s}>
                {copy.workers.status[s]}
              </option>
            ))}
          </select>
        </FormField>
      </Section>

      <Section title={f.sections.identification}>
        <p className="text-sm text-text-secondary sm:col-span-2">{copy.workers.noFullSsn}</p>
        {open.ssnLast4
          ? text('ssnLast4', fields.ssnLast4, {
              inputMode: 'numeric',
              maxLength: 4,
              prefix: DOTS,
            })
          : hidden('ssnLast4', fields.ssnLast4.label, fields.ssnLast4.hint)}
        {open.dateOfBirth
          ? text('dateOfBirth', fields.dateOfBirth, { type: 'date' })
          : hidden('dateOfBirth', fields.dateOfBirth.label, fields.dateOfBirth.hint)}
        {shownNote('ssnLast4')}
        {!shown.ssnLast4 && shownNote('dateOfBirth')}
      </Section>

      <Section title={f.sections.address}>
        <p className="text-sm text-text-secondary sm:col-span-2">{copy.workers.encrypted}</p>
        {open.address ? (
          <>
            <div className="sm:col-span-2">{text('address.address1', fields.address1)}</div>
            <div className="sm:col-span-2">{text('address.address2', fields.address2)}</div>
            {text('address.city', fields.city)}
            {text('address.state', fields.state)}
            {text('address.postalCode', fields.postalCode, { inputMode: 'numeric', maxLength: 5 })}
            {text('address.postalCodeExt', fields.postalCodeExt, {
              inputMode: 'numeric',
              maxLength: 4,
            })}
            {text('address.phone', fields.phone, { type: 'tel' })}
            <p className="text-xs text-text-secondary sm:col-span-2">
              {copy.workers.addressLimits}
            </p>
            {shownNote('address')}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <span className="text-sm text-text-primary">
              {place && `${place.city}, ${place.state} ${place.postalCode}`}
            </span>
            <span className="sr-only">{f.hidden}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={f.showLabels.address}
              onClick={() => void reveal('address')}
            >
              {f.show}
            </Button>
          </div>
        )}
        {!isNew && place === null && (
          <p className="text-xs font-semibold text-warning-700 sm:col-span-2">{f.noAddress}</p>
        )}
      </Section>

      {level === 'RA' && (
        <Section title={f.sections.apprentice}>
          {form.values.apprentice === null && (
            <p className="text-xs font-semibold text-warning-700 sm:col-span-2">{f.noProgram}</p>
          )}
          <div className="sm:col-span-2">{text('apprentice.programName', fields.programName)}</div>
          <FormField id="worker-apprentice-registrar" label={fields.registrar.label}>
            <select
              {...fieldIds('worker-apprentice-registrar')}
              className={selectClass}
              disabled={readOnly}
              {...register('apprentice.registrar')}
            >
              <option value="" />
              {(['oa', 'saa', 'nysdol'] as const).map((r) => (
                <option key={r} value={r}>
                  {f.registrars[r]}
                </option>
              ))}
            </select>
          </FormField>
          {text('apprentice.programRegistrationNo', fields.programRegistrationNo)}
          {text('apprentice.trade', fields.trade)}
          {text('apprentice.periodNo', fields.periodNo, { inputMode: 'numeric' })}
          {text('apprentice.pctOfJourney', fields.pctOfJourney, { inputMode: 'numeric' })}
          {text('apprentice.validFrom', fields.validFrom, { type: 'date' })}
          {text('apprentice.validTo', fields.validTo, { type: 'date' })}
        </Section>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {isNew ? f.create : f.save}
          </Button>
          <Button asChild variant="secondary">
            <Link href={cancelHref}>{f.cancel}</Link>
          </Button>
        </div>
      )}
    </form>
  )
}
