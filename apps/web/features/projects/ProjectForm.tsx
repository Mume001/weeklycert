'use client'

import { copy, count, fill } from '@wc/copy'
import {
  type ProjectFormDTO,
  type ProjectFormError,
  type ProjectFormErrors,
  type ProjectInput,
  ProjectInputSchema,
  prcLooksUnusual,
  projectFormErrors,
} from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { weekdayName } from '@/lib/format'
import { createProjectAction, updateProjectAction } from './actions'

const f = copy.projects.form
const fields = f.fields

export interface ProjectFormProps {
  slug: string
  form: ProjectFormDTO
  /** Nothing can change: a viewer, or a paused company (spec/02 §3, 08 §2.4). */
  readOnly: boolean
  /** A closed project: only the status can change, which is how it is reopened. */
  closed: boolean
  cancelHref: string
}

function message(error: ProjectFormError | undefined): string | undefined {
  return error && fill(f.errors[error.code], error.values ?? {})
}

/**
 * The project form (spec/03 §4.4): the same fields as onboarding step 2, plus
 * the expected end, the site address, work pauses, records and status. The
 * week end is the company's and is shown read only (spec/15 §3 explains why).
 * The zod schema is the one the server runs again (spec/09 §4).
 */
export function ProjectForm({ slug, form, readOnly, closed, cancelHref }: ProjectFormProps) {
  const router = useRouter()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [saved, setSaved] = useState(false)
  const { register, control, handleSubmit, watch, formState } = useForm<ProjectInput>({
    defaultValues: form.values,
  })
  const pauses = useFieldArray({ control, name: 'workPauses' })
  const federal = watch('federallyFunded')
  // spec/13 A6: the PRC format is unverified, so an unusual one is a warning.
  const prcWarning = prcLooksUnusual(watch('prcNumber') ?? '') ? f.warnings.prcFormat : undefined
  const isNew = form.projectId === null
  const locked = readOnly || closed

  const show = (next: ProjectFormErrors) => {
    setErrors(next)
    // The summary takes focus, so the count is read out and the first field is one Tab away.
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false)
    // A disabled control has no value in the form; the stored one stands for it.
    const payload = {
      ...form.values,
      ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)),
    }
    const local = ProjectInputSchema.safeParse(payload)
    if (!local.success) return show(projectFormErrors(local.error))
    const result =
      form.projectId === null
        ? await createProjectAction(slug, payload)
        : await updateProjectAction(slug, form.projectId, payload)
    if (!result.ok) return show(result.errors)
    setErrors({})
    if (isNew) router.push(`/app/${slug}/projects/${result.id}`)
    else {
      setSaved(true)
      router.refresh()
    }
  })

  const errorCount = Object.keys(errors).length
  const text = (name: keyof typeof fields & keyof ProjectInput, extra?: { type?: string }) => {
    const id = `project-${name}`
    const field = fields[name]
    const hint = 'hint' in field ? field.hint : undefined
    const error = message(errors[name])
    const warning = name === 'prcNumber' ? prcWarning : undefined
    return (
      <FormField id={id} label={field.label} hint={hint} warning={warning} error={error}>
        <Input
          {...fieldIds(id, hint, error, warning)}
          type={extra?.type ?? 'text'}
          disabled={locked}
          {...register(name)}
        />
      </FormField>
    )
  }

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

      <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2">
        {text('name')}
        {text('prcNumber')}

        <FormField
          id="project-awardingBody"
          label={fields.awardingBody.label}
          hint={fields.awardingBody.hint}
        >
          <Input
            {...fieldIds('project-awardingBody', fields.awardingBody.hint)}
            list="awarding-bodies"
            disabled={locked}
            {...register('awardingBody')}
          />
          <datalist id="awarding-bodies">
            {form.awardingBodies.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FormField>

        <FormField id="project-ourRole" label={fields.ourRole.label}>
          <select
            {...fieldIds('project-ourRole')}
            className={selectClass}
            disabled={locked}
            {...register('ourRole')}
          >
            {(['prime', 'sub', 'sub_tier2'] as const).map((role) => (
              <option key={role} value={role}>
                {copy.projects.roles[role]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          id="project-generalContractor"
          label={fields.generalContractor.label}
          hint={fields.generalContractor.hint}
        >
          <Input
            {...fieldIds('project-generalContractor', fields.generalContractor.hint)}
            list="general-contractors"
            disabled={locked}
            {...register('generalContractor')}
          />
          <datalist id="general-contractors">
            {form.generalContractors.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FormField>

        {text('projectNumber')}
        {text('county')}
        {text('startDate', { type: 'date' })}
        {text('expectedEndDate', { type: 'date' })}

        <FormField
          id="project-weekEndsOn"
          label={fields.weekEndsOn.label}
          hint={fields.weekEndsOn.hint}
        >
          <Input
            {...fieldIds('project-weekEndsOn', fields.weekEndsOn.hint)}
            value={weekdayName(form.weekEndsOn)}
            readOnly
            className="bg-n-50 text-n-700"
          />
        </FormField>
      </section>

      <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2">
        <div className="flex items-start gap-2.5 sm:col-span-2">
          <input
            id="project-federallyFunded"
            type="checkbox"
            aria-describedby="project-federallyFunded-hint"
            className="mt-0.5 size-4 accent-brand focus-visible:focus-ring"
            disabled={locked}
            {...register('federallyFunded')}
          />
          <div>
            <label htmlFor="project-federallyFunded" className="text-sm font-semibold text-n-800">
              {fields.federallyFunded.label}
            </label>
            <p id="project-federallyFunded-hint" className="text-xs text-text-secondary">
              {fields.federallyFunded.hint}
            </p>
          </div>
        </div>
        {federal && (
          <>
            {text('federalWdNumber')}
            {text('federalWdMod')}
          </>
        )}
        <div className="sm:col-span-2">{text('siteAddress')}</div>
      </section>

      <fieldset className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <legend className="px-1 text-sm font-semibold text-n-800">{fields.workPauses.label}</legend>
        <p className="-mt-1 text-xs text-text-secondary">{fields.workPauses.hint}</p>
        {pauses.fields.map((pause, i) => {
          const error = message(errors[`workPauses.${i}.to`])
          return (
            <div
              key={pause.id}
              className="grid items-end gap-3 sm:grid-cols-[160px_160px_1fr_auto]"
            >
              <FormField id={`pause-${i}-from`} label={fields.workPauses.from}>
                <Input
                  {...fieldIds(`pause-${i}-from`)}
                  type="date"
                  disabled={locked}
                  {...register(`workPauses.${i}.from`)}
                />
              </FormField>
              <FormField id={`pause-${i}-to`} label={fields.workPauses.to} error={error}>
                <Input
                  {...fieldIds(`pause-${i}-to`, undefined, error)}
                  type="date"
                  disabled={locked}
                  {...register(`workPauses.${i}.to`)}
                />
              </FormField>
              <FormField id={`pause-${i}-reason`} label={fields.workPauses.reason}>
                <Input
                  {...fieldIds(`pause-${i}-reason`)}
                  disabled={locked}
                  {...register(`workPauses.${i}.reason`)}
                />
              </FormField>
              {!locked && (
                <Button type="button" variant="secondary" onClick={() => pauses.remove(i)}>
                  {fields.workPauses.remove}
                </Button>
              )}
            </div>
          )
        })}
        {!locked && (
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => pauses.append({ from: '', to: '', reason: '' })}
            >
              {fields.workPauses.add}
            </Button>
          </div>
        )}
      </fieldset>

      <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2">
        {text('retentionYears', { type: 'number' })}
        <FormField id="project-status" label={fields.status.label}>
          <select
            {...fieldIds('project-status')}
            className={selectClass}
            disabled={readOnly}
            {...register('status')}
          >
            {(['draft', 'active', 'paused', 'completed', 'archived'] as const).map((s) => (
              <option key={s} value={s}>
                {copy.projects.status[s]}
              </option>
            ))}
          </select>
        </FormField>
      </section>

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
