'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, fill } from '@wc/copy'
import {
  ClassificationEditInputSchema,
  type ClassificationFormError,
  type ClassificationFormErrors,
  ClassificationInputSchema,
  type ClassificationRateRow,
  type ClassificationSaveResult,
  classificationFormErrors,
  type ProjectClassificationsDTO,
  RateVersionInputSchema,
} from '@wc/data/dto'
import { CalendarPlus, ListPlus, type LucideIcon, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'
import { EmptyState } from '@/components/patterns/EmptyState'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Money } from '@/components/patterns/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/format'
import { addClassificationAction, addRateVersionAction, editClassificationAction } from './actions'

const c = copy.projects.classifications

function message(error: ClassificationFormError | undefined): string | undefined {
  if (!error) return undefined
  if (error.code === 'rateLocked') return c.rateLocked
  if (error.code === 'versionAfter') {
    return fill(c.errors.versionAfter, { date: formatDate(error.values?.date ?? '') })
  }
  return fill(c.errors[error.code], error.values ?? {})
}

type Mode =
  | { kind: 'add' }
  | { kind: 'edit'; row: ClassificationRateRow }
  | { kind: 'version'; row: ClassificationRateRow }
  | null

export interface ClassificationsPanelProps {
  slug: string
  projectId: string
  rows: ClassificationRateRow[]
  catalog: ProjectClassificationsDTO['catalog']
  canWrite: boolean
}

/**
 * The rates of one project (spec/03 §4.4). No modal: every form opens in place
 * under the table (spec/03 §1). A rate is never overwritten once a signed week
 * uses it; a new rate is a new version from a date.
 */
export function ClassificationsPanel({
  slug,
  projectId,
  rows,
  catalog,
  canWrite,
}: ClassificationsPanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const done = () => {
    setMode(null)
    router.refresh()
  }

  const columns: ColumnDef<ClassificationRateRow, unknown>[] = [
    {
      id: 'classification',
      header: c.columns.classification,
      // Your label and the source sit under the official name, so the nine
      // columns of 03 §4.4 fit at 1280 px without hiding the actions.
      cell: ({ row }) => (
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{row.original.officialLabel}</span>
          <span className="text-xs text-text-secondary">
            {row.original.displayLabel !== row.original.officialLabel &&
              `${row.original.displayLabel} · `}
            {c.source[row.original.source]}
          </span>
        </span>
      ),
    },
    {
      id: 'baseRate',
      header: c.columns.baseRate,
      meta: { align: 'right' },
      cell: ({ row }) => <Money value={row.original.baseRate} />,
    },
    {
      id: 'supplement',
      header: c.columns.supplement,
      meta: { align: 'right' },
      cell: ({ row }) => <Money value={row.original.supplement} />,
    },
    {
      id: 'effectiveFrom',
      header: c.columns.effectiveFrom,
      cell: ({ row }) => <DateText value={row.original.effectiveFrom} />,
    },
    {
      id: 'effectiveTo',
      header: c.columns.effectiveTo,
      cell: ({ row }) =>
        row.original.effectiveTo ? (
          <DateText value={row.original.effectiveTo} />
        ) : (
          <span className="text-text-secondary">{c.noEndDate}</span>
        ),
    },
    {
      id: 'otCodes',
      header: c.columns.otCodes,
      cell: ({ row }) => (
        <span className="flex gap-1">
          {row.original.otCodes.map((code) => (
            <span
              key={code}
              className="inline-flex h-[22px] items-center rounded-full border border-n-200 bg-n-100 px-2 font-mono text-2xs font-semibold text-n-700"
            >
              {code}
            </span>
          ))}
        </span>
      ),
    },
    {
      id: 'apprenticeRatio',
      header: c.columns.apprenticeRatio,
      cell: ({ row }) =>
        row.original.apprenticeRatio ?? <span className="text-text-secondary">{c.notSet}</span>,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{c.columns.actions}</span>,
      meta: { align: 'right' },
      // Icon buttons with a name and a tooltip: the one place spec/14 §10 allows
      // an icon alone, and the only way nine columns fit at 1440 px.
      cell: ({ row }) =>
        canWrite && (
          <span className="inline-flex justify-end gap-1">
            {row.original.isLatest && (
              <RowAction
                label={c.newVersion}
                icon={CalendarPlus}
                onClick={() => setMode({ kind: 'version', row: row.original })}
              />
            )}
            <RowAction
              label={c.edit}
              icon={Pencil}
              onClick={() => setMode({ kind: 'edit', row: row.original })}
            />
          </span>
        ),
    },
  ]

  const addButton = canWrite && mode?.kind !== 'add' && (
    <Button onClick={() => setMode({ kind: 'add' })}>{c.add}</Button>
  )
  const onProject = new Set(rows.map((r) => r.classificationId))

  return (
    <>
      {rows.length > 0 && addButton && <div>{addButton}</div>}
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={
          <EmptyState
            icon={ListPlus}
            title={c.empty.title}
            body={c.empty.body}
            action={addButton}
          />
        }
      />
      {mode?.kind === 'add' && (
        <AddForm
          catalog={catalog.filter((k) => !onProject.has(k.id))}
          onCancel={() => setMode(null)}
          onSave={(values) => addClassificationAction(slug, projectId, values)}
          onDone={done}
        />
      )}
      {mode?.kind === 'version' && (
        <VersionForm
          key={mode.row.id}
          row={mode.row}
          onCancel={() => setMode(null)}
          onSave={(values) => addRateVersionAction(slug, projectId, values)}
          onDone={done}
        />
      )}
      {mode?.kind === 'edit' && (
        <EditForm
          key={mode.row.id}
          row={mode.row}
          onCancel={() => setMode(null)}
          onSave={(values) => editClassificationAction(slug, projectId, values)}
          onDone={done}
        />
      )}
    </>
  )
}

function RowAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={label} onClick={onClick}>
            <Icon strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface FormProps<T> {
  onCancel: () => void
  onSave(values: T): Promise<ClassificationSaveResult>
  onDone: () => void
}

/** One form under the table: same card, same buttons, same error handling. */
function useInlineForm<T extends Record<string, string>>(
  schema: z.ZodType<T>,
  defaultValues: T,
  { onSave, onDone }: FormProps<T>,
) {
  const form = useForm<T>({ defaultValues: defaultValues as never })
  const [errors, setErrors] = useState<ClassificationFormErrors>({})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    // The form opens in place, so focus goes to its first field (spec/14 §8).
    ref.current?.querySelector<HTMLElement>('input:not([readonly]),select')?.focus()
  }, [])
  const submit = form.handleSubmit(async (values) => {
    const local = schema.safeParse(values)
    if (!local.success) return setErrors(classificationFormErrors(local.error))
    const result = await onSave(values as T)
    if (!result.ok) return setErrors(result.errors)
    onDone()
  })
  const field = (
    name: keyof T & string,
    label: string,
    hint?: string,
    extra?: { type?: string; readOnly?: boolean },
  ) => {
    const id = `rate-${name}`
    const error = message(errors[name])
    return (
      <FormField id={id} label={label} hint={hint} error={error}>
        <Input
          {...fieldIds(id, hint, error)}
          type={extra?.type ?? 'text'}
          readOnly={extra?.readOnly}
          className={extra?.readOnly ? 'bg-n-50 text-n-700' : undefined}
          {...form.register(name as never)}
        />
      </FormField>
    )
  }
  return { form, errors, ref, submit, field }
}

function FormCard({
  title,
  body,
  children,
  formRef,
  onSubmit,
  submitLabel,
  onCancel,
  pending,
}: {
  title: string
  body?: string
  children: ReactNode
  formRef: React.RefObject<HTMLFormElement | null>
  onSubmit: () => void
  submitLabel: string
  onCancel: () => void
  pending: boolean
}) {
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      aria-label={title}
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-md font-semibold text-text-primary">{title}</h2>
        {body && <p className="text-sm text-text-secondary">{body}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {c.cancel}
        </Button>
      </div>
    </form>
  )
}

const f = c.fields

function AddForm({
  catalog,
  ...props
}: FormProps<z.infer<typeof ClassificationInputSchema>> & {
  catalog: ProjectClassificationsDTO['catalog']
}) {
  const { form, errors, ref, submit, field } = useInlineForm(
    ClassificationInputSchema,
    {
      classificationId: '',
      displayLabel: '',
      baseRate: '',
      supplement: '',
      otCodes: '',
      effectiveFrom: '',
      apprenticeRatio: '',
    },
    props,
  )
  const trades = [...new Set(catalog.map((k) => k.trade))]
  const error = message(errors.classificationId)
  return (
    <FormCard
      title={c.add}
      formRef={ref}
      onSubmit={submit}
      submitLabel={c.addSubmit}
      onCancel={props.onCancel}
      pending={form.formState.isSubmitting}
    >
      <FormField id="rate-classificationId" label={f.classification.label} error={error}>
        <select
          {...fieldIds('rate-classificationId', undefined, error)}
          className={selectClass}
          {...form.register('classificationId')}
        >
          <option value="">{f.classification.placeholder}</option>
          {trades.map((trade) => (
            <optgroup key={trade} label={trade}>
              {catalog
                .filter((k) => k.trade === trade)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.officialLabel}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </FormField>
      {field('displayLabel', f.displayLabel.label, f.displayLabel.hint)}
      {field('baseRate', f.baseRate.label)}
      {field('supplement', f.supplement.label)}
      {field('otCodes', f.otCodes.label, f.otCodes.hint)}
      {field('effectiveFrom', f.effectiveFrom.label, undefined, { type: 'date' })}
      {field('apprenticeRatio', f.apprenticeRatio.label, f.apprenticeRatio.hint)}
    </FormCard>
  )
}

function VersionForm({
  row,
  ...props
}: FormProps<z.infer<typeof RateVersionInputSchema>> & { row: ClassificationRateRow }) {
  const { form, ref, submit, field } = useInlineForm(
    RateVersionInputSchema,
    {
      rowId: row.id,
      effectiveFrom: '',
      baseRate: row.baseRate,
      supplement: row.supplement,
      otCodes: row.otCodes.join(', '),
    },
    props,
  )
  return (
    <FormCard
      title={fill(c.versionTitle, { Classification: row.officialLabel })}
      body={c.versionBody}
      formRef={ref}
      onSubmit={submit}
      submitLabel={c.versionSubmit}
      onCancel={props.onCancel}
      pending={form.formState.isSubmitting}
    >
      {field('effectiveFrom', f.effectiveFrom.label, undefined, { type: 'date' })}
      {field('baseRate', f.baseRate.label)}
      {field('supplement', f.supplement.label)}
      {field('otCodes', f.otCodes.label, f.otCodes.hint)}
    </FormCard>
  )
}

function EditForm({
  row,
  ...props
}: FormProps<z.infer<typeof ClassificationEditInputSchema>> & { row: ClassificationRateRow }) {
  const { form, ref, submit, field } = useInlineForm(
    ClassificationEditInputSchema,
    {
      rowId: row.id,
      displayLabel: row.displayLabel,
      apprenticeRatio: row.apprenticeRatio ?? '',
      baseRate: row.baseRate,
      supplement: row.supplement,
      otCodes: row.otCodes.join(', '),
    },
    props,
  )
  // A signed week uses this rate: it reads, and the way to change it is a new version.
  const locked = row.usedBySignedWeek ? { readOnly: true } : undefined
  const lockedHint = row.usedBySignedWeek ? c.rateLocked : undefined
  return (
    <FormCard
      title={row.officialLabel}
      formRef={ref}
      onSubmit={submit}
      submitLabel={c.save}
      onCancel={props.onCancel}
      pending={form.formState.isSubmitting}
    >
      {field('displayLabel', f.displayLabel.label, f.displayLabel.hint)}
      {field('apprenticeRatio', f.apprenticeRatio.label, f.apprenticeRatio.hint)}
      {field('baseRate', f.baseRate.label, lockedHint, locked)}
      {field('supplement', f.supplement.label, undefined, locked)}
      {field('otCodes', f.otCodes.label, f.otCodes.hint, locked)}
    </FormCard>
  )
}
