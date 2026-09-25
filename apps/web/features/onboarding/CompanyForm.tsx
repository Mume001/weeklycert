'use client'

import { copy, fill } from '@wc/copy'
import {
  type CompanyFormDTO,
  type CompanyFormErrors,
  type CompanyInput,
  CompanyInputSchema,
  companyFormErrors,
} from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { weekdayName } from '@/lib/format'
import { saveCompanyAction } from './actions'

const c = copy.onboarding.company
const fields = c.fields

/**
 * Step 1, the company (spec/03 §4.3, spec/04 tenants). The FEIN is never sent
 * to the browser: the field is empty and says which four digits are on file.
 */
export function CompanyForm({
  slug,
  form,
  readOnly,
  nextHref,
}: {
  slug: string
  form: CompanyFormDTO
  readOnly: boolean
  /** Where a save goes: the next step. */
  nextHref: string
}) {
  const router = useRouter()
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const [errors, setErrors] = useState<CompanyFormErrors>({})
  const { register, handleSubmit, formState } = useForm<CompanyInput>({
    defaultValues: form.values,
  })

  const onSubmit = handleSubmit(async (values) => {
    // A disabled control has no value in the form; the stored one stands for it.
    const payload = {
      ...form.values,
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined && !Number.isNaN(v)),
      ),
    }
    const local = CompanyInputSchema.safeParse(payload)
    const result = local.success
      ? await saveCompanyAction(slug, payload)
      : { ok: false as const, errors: companyFormErrors(local.error) }
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    router.push(nextHref)
  })

  const text = (
    name: Exclude<keyof CompanyInput, 'defaultOurRole' | 'weekEndsOn'>,
    field: { label: string; hint?: string },
    extra?: { type?: string; inputMode?: 'numeric'; hint?: string },
  ) => {
    const id = `company-${name}`
    const code = errors[name]
    const error = code && c.errors[code]
    const hint = extra?.hint ?? field.hint
    return (
      <FormField id={id} label={field.label} hint={hint} error={error}>
        <Input
          {...fieldIds(id, hint, error)}
          type={extra?.type ?? 'text'}
          inputMode={extra?.inputMode}
          disabled={readOnly}
          {...register(name)}
        />
      </FormField>
    )
  }

  const errorList = Object.values(errors).map((code) => c.errors[code])
  const weekError = errors.weekEndsOn && c.errors[errors.weekEndsOn]

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <p className="text-sm text-text-secondary sm:col-span-2">{c.intro}</p>
      {errorList.length > 0 && (
        <p
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 focus-visible:focus-ring sm:col-span-2"
        >
          {errorList.join(' ')}
        </p>
      )}
      <div className="sm:col-span-2">{text('legalName', fields.legalName)}</div>
      <div className="sm:col-span-2">{text('addressLine1', fields.addressLine1)}</div>
      <div className="sm:col-span-2">{text('addressLine2', fields.addressLine2)}</div>
      {text('city', fields.city)}
      <div className="grid grid-cols-[88px_1fr] gap-4">
        <FormField id="company-state" label={fields.state.label}>
          <Input id="company-state" value="NY" readOnly className="bg-n-50 text-n-700" />
        </FormField>
        {text('zip', fields.zip, { inputMode: 'numeric' })}
      </div>
      {text('fein', fields.fein, {
        inputMode: 'numeric',
        hint: form.feinLast4
          ? `${fields.fein.hint} ${fill(fields.fein.onFile, { last4: form.feinLast4 })}`
          : fields.fein.hint,
      })}
      {text('nysRegistrationNumber', fields.nysRegistrationNumber)}
      {text('nysRegistrationExpiresOn', fields.nysRegistrationExpiresOn, { type: 'date' })}
      <FormField
        id="company-defaultOurRole"
        label={fields.defaultOurRole.label}
        hint={fields.defaultOurRole.hint}
      >
        <select
          {...fieldIds('company-defaultOurRole', fields.defaultOurRole.hint)}
          className={selectClass}
          disabled={readOnly}
          {...register('defaultOurRole')}
        >
          {(['prime', 'sub', 'sub_tier2'] as const).map((role) => (
            <option key={role} value={role}>
              {copy.projects.roles[role]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="company-weekEndsOn"
        label={fields.weekEndsOn.label}
        hint={fields.weekEndsOn.hint}
        error={weekError}
      >
        <select
          {...fieldIds('company-weekEndsOn', fields.weekEndsOn.hint, weekError)}
          className={selectClass}
          disabled={readOnly || form.weekEndLocked}
          {...register('weekEndsOn', { valueAsNumber: true })}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <option key={dow} value={dow}>
              {weekdayName(dow)}
            </option>
          ))}
        </select>
      </FormField>
      {!readOnly && (
        <div className="sm:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {copy.onboarding.continue}
          </Button>
        </div>
      )}
    </form>
  )
}
