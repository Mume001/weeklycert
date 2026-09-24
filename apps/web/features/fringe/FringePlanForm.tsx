'use client'

import { copy, fill } from '@wc/copy'
import { monthlyPremiumCredit, rate } from '@wc/core'
import {
  type FringeFormErrors,
  type FringePlanDTO,
  type FringePlanInput,
  FringePlanInputSchema,
  fringeFormErrors,
} from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, formatWhole } from '@/lib/format'
import { saveFringePlanAction } from './actions'

const t = copy.fringe
const f = t.form
const fields = f.fields
const c = t.converter

function valuesOf(plan: FringePlanDTO | null): FringePlanInput {
  return {
    name: plan?.name ?? '',
    kind: plan?.kind ?? 'health_welfare',
    funding: plan?.funding ?? 'plan_contribution',
    planNumber: plan?.planNumber ?? '',
    provider: plan?.provider ?? '',
    hourlyCredit: plan?.hourlyCredit ?? '',
    annualCost: plan?.annualCost ?? '',
    annualHoursBasis: plan?.annualHoursBasis ?? '',
    annualize: plan?.annualize ?? true,
    isLegallyRequired: plan?.isLegallyRequired ?? false,
  }
}

/**
 * Monthly premium to a credit per hour (spec/03 §4.6): the divisor is on the
 * screen, and so is the 2,080-hour rule. The arithmetic is core's
 * (monthlyPremiumCredit), the same the engine uses to annualise a plan.
 */
function Converter({
  basis,
  onUse,
  disabled,
}: {
  basis: string
  onUse: (credit: string) => void
  disabled: boolean
}) {
  const [monthly, setMonthly] = useState('')
  const [yearHours, setYearHours] = useState(basis)
  const out = monthlyPremiumCredit(monthly, yearHours)
  return (
    <fieldset className="grid gap-3 rounded-md border border-border-decorative bg-n-50 p-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold text-n-800">{c.title}</legend>
      <FormField id="converter-monthly" label={c.monthly}>
        <Input
          id="converter-monthly"
          inputMode="decimal"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
        />
      </FormField>
      <FormField id="converter-hours" label={c.hours}>
        <Input
          id="converter-hours"
          inputMode="numeric"
          value={yearHours}
          onChange={(e) => setYearHours(e.target.value)}
        />
      </FormField>
      <div aria-live="polite" className="grid gap-1 text-sm tabular-nums sm:col-span-2">
        {out && (
          <>
            <p>
              {fill(c.yearly, {
                monthly: formatMoney(monthly),
                yearly: formatMoney(out.yearly.toString()),
              })}
            </p>
            <p className="font-semibold">
              {fill(c.hourly, {
                yearly: formatMoney(out.yearly.toString()),
                hours: formatWhole(out.divisor.toString()),
                hourly: formatMoney(out.hourly.toString()),
              })}
            </p>
          </>
        )}
      </div>
      <p className="text-xs text-text-secondary sm:col-span-2">{c.note}</p>
      {!disabled && (
        <div className="sm:col-span-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!out}
            onClick={() => out && onUse(rate(out.hourly))}
          >
            {c.use}
          </Button>
        </div>
      )}
    </fieldset>
  )
}

export function FringePlanForm({
  slug,
  plan,
  basis,
  readOnly,
  cancelHref,
}: {
  slug: string
  /** Null for a new plan. */
  plan: FringePlanDTO | null
  /** The company's hours in a year, the converter's starting divisor. */
  basis: string
  readOnly: boolean
  cancelHref: string
}) {
  const router = useRouter()
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const [errors, setErrors] = useState<FringeFormErrors>({})
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, setValue, formState } = useForm<FringePlanInput>({
    defaultValues: valuesOf(plan),
  })

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false)
    const local = FringePlanInputSchema.safeParse(values)
    const result = local.success
      ? await saveFringePlanAction(slug, plan?.id ?? null, values)
      : { ok: false as const, errors: fringeFormErrors(local.error) }
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setErrors({})
    setSaved(true)
    router.push(`/app/${slug}/fringe-plans?plan=${result.id}`)
    router.refresh()
  })

  const text = (
    name: 'name' | 'planNumber' | 'provider' | 'hourlyCredit' | 'annualCost' | 'annualHoursBasis',
    field: { label: string; hint?: string },
    inputMode?: 'decimal' | 'numeric',
  ) => {
    const id = `plan-${name}`
    const code = errors[name]
    const error = code && f.errors[code]
    return (
      <FormField id={id} label={field.label} hint={field.hint} error={error}>
        <Input
          {...fieldIds(id, field.hint, error)}
          inputMode={inputMode}
          disabled={readOnly}
          {...register(name)}
        />
      </FormField>
    )
  }

  const check = (name: 'annualize' | 'isLegallyRequired') => {
    const field = fields[name]
    return (
      <div className="flex items-start gap-2.5">
        <input
          id={`plan-${name}`}
          type="checkbox"
          aria-describedby={`plan-${name}-hint`}
          className="mt-0.5 size-4 accent-brand focus-visible:focus-ring"
          disabled={readOnly}
          {...register(name)}
        />
        <div>
          <label htmlFor={`plan-${name}`} className="text-sm font-semibold text-n-800">
            {field.label}
          </label>
          <p id={`plan-${name}-hint`} className="text-xs text-text-secondary">
            {field.hint}
          </p>
        </div>
      </div>
    )
  }

  const errorCount = Object.keys(errors).length

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="plan-form-title"
      className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <h2 id="plan-form-title" className="text-md font-semibold text-text-primary sm:col-span-2">
        {plan ? fill(f.editTitle, { Plan: plan.name }) : f.newTitle}
      </h2>
      {errorCount > 0 && (
        <p
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 focus-visible:focus-ring sm:col-span-2"
        >
          {Object.values(errors)
            .map((code) => f.errors[code])
            .join(' ')}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm font-semibold text-success-700 sm:col-span-2">
          {f.saved}
        </p>
      )}
      <div className="sm:col-span-2">{text('name', fields.name)}</div>
      <FormField id="plan-kind" label={fields.kind.label}>
        <select
          {...fieldIds('plan-kind')}
          className={selectClass}
          disabled={readOnly}
          {...register('kind')}
        >
          {(
            [
              'health_welfare',
              'vacation_holiday',
              'apprenticeship_training',
              'pension',
              'other',
            ] as const
          ).map((k) => (
            <option key={k} value={k}>
              {t.kinds[k]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="plan-funding" label={fields.funding.label}>
        <select
          {...fieldIds('plan-funding')}
          className={selectClass}
          disabled={readOnly}
          {...register('funding')}
        >
          {(['plan_contribution', 'cash_in_lieu'] as const).map((k) => (
            <option key={k} value={k}>
              {t.funding[k]}
            </option>
          ))}
        </select>
      </FormField>
      {text('planNumber', fields.planNumber)}
      {text('provider', fields.provider)}
      <div className="sm:col-span-2">{text('hourlyCredit', fields.hourlyCredit, 'decimal')}</div>
      {text('annualCost', fields.annualCost, 'decimal')}
      {text('annualHoursBasis', fields.annualHoursBasis, 'numeric')}
      <Converter
        basis={basis}
        disabled={readOnly}
        onUse={(credit) => setValue('hourlyCredit', credit, { shouldDirty: true })}
      />
      <div className="grid gap-3 sm:col-span-2">
        {check('annualize')}
        {check('isLegallyRequired')}
      </div>
      {!readOnly && (
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {plan ? f.save : f.create}
          </Button>
          <Button asChild variant="secondary">
            <Link href={cancelHref}>{f.cancel}</Link>
          </Button>
        </div>
      )}
    </form>
  )
}
