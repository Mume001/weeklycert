'use client'

import { copy } from '@wc/copy'
import { type ImportKind, SOURCE_KINDS, type SourceKind } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { type UploadResult, uploadAction } from './actions'

const t = copy.imports.upload

/** 06 §2: up to 10 MB. Checked here too, so a larger file is never sent. */
const MAX_BYTES = 10 * 1024 * 1024

type UploadError = Extract<UploadResult, { ok: false }>['error']

function message(error: UploadError): string {
  if (error === 'projectRequired' || error === 'weekRequired' || error === 'fileRequired') {
    return t.errors[error]
  }
  return t.refused[error]
}

/** Step 1, the file (spec/06 §2): what it is, where it is from, and for which week. */
export function UploadForm({
  slug,
  projects,
  initial,
}: {
  slug: string
  /** Active projects with the weeks that are still open to hours. */
  projects: { id: string; name: string; weeks: string[] }[]
  initial: { kind: ImportKind; projectId: string; weekEnding: string }
}) {
  const router = useRouter()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [kind, setKind] = useState<ImportKind>(initial.kind)
  const [projectId, setProjectId] = useState(initial.projectId || projects[0]?.id || '')
  const [error, setError] = useState<UploadError | null>(null)
  const [busy, setBusy] = useState(false)
  const weeks = projects.find((p) => p.id === projectId)?.weeks ?? []

  const fail = (e: UploadError) => {
    setError(e)
    requestAnimationFrame(() => errorRef.current?.focus())
  }

  const submit = async (form: FormData) => {
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return fail('fileRequired')
    if (file.size > MAX_BYTES) return fail('tooBig')
    setBusy(true)
    const result = await uploadAction(slug, form)
    setBusy(false)
    if (!result.ok) return fail(result.error)
    router.push(`/app/${slug}/imports/new?batch=${result.batchId}`)
  }

  return (
    <form
      action={submit}
      className="grid max-w-[880px] gap-5 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      {error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 focus-visible:focus-ring"
        >
          {message(error)}
        </p>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-n-800">{t.kind}</legend>
        {(['hours', 'payroll', 'workers'] as const).map((k) => (
          <label
            key={k}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border-interactive p-3 has-[:checked]:border-n-900 has-[:focus-visible]:focus-ring"
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="mt-1 size-4 accent-brand"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-semibold text-text-primary">
                {copy.imports.kinds[k].label}
              </span>
              <span className="text-xs text-text-secondary">{copy.imports.kinds[k].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {kind !== 'workers' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="import-project" label={t.project}>
            <select
              {...fieldIds('import-project')}
              name="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={selectClass}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="import-week" label={t.weekEnding}>
            <select
              {...fieldIds('import-week')}
              name="weekEnding"
              key={projectId}
              defaultValue={weeks.includes(initial.weekEnding) ? initial.weekEnding : weeks.at(-1)}
              className={selectClass}
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  {formatDate(w)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      )}

      <FormField id="import-source" label={t.source}>
        <select
          {...fieldIds('import-source')}
          name="source"
          defaultValue={'quickbooks_time' satisfies SourceKind}
          className={`${selectClass} max-w-sm`}
        >
          {SOURCE_KINDS.map((s) => (
            <option key={s} value={s}>
              {copy.imports.sources[s]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="import-file" label={t.file.label} hint={t.file.hint}>
        <Input
          {...fieldIds('import-file', t.file.hint)}
          type="file"
          name="file"
          accept=".csv,.tsv,.txt,.xlsx"
        />
      </FormField>

      <div>
        <Button type="submit" disabled={busy}>
          {t.submit}
        </Button>
      </div>
    </form>
  )
}
