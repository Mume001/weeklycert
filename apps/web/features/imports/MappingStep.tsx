'use client'

import { copy, fill } from '@wc/copy'
import { DATE_FORMATS, type ImportDraftDTO } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Notice } from '@/components/patterns/Notice'
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
import { mappingAction } from './actions'

const m = copy.imports.mapping
type TargetKey = keyof typeof m.targets

const label = (target: string) => m.targets[target as TargetKey] ?? target

/** Step 2 (spec/06 §2): every field of this kind, the column feeding it, and the first rows. */
export function MappingStep({ slug, draft }: { slug: string; draft: ImportDraftDTO }) {
  const router = useRouter()
  const alertRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<Record<string, number | null>>(
    Object.fromEntries(draft.fields.map((f) => [f.target, f.column])),
  )
  const [dateFormat, setDateFormat] = useState(draft.dateFormat)
  const [lastWins, setLastWins] = useState(draft.lastWins)
  const [save, setSave] = useState(false)
  const [profileName, setProfileName] = useState(draft.profileName ?? '')
  const [missing, setMissing] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const mapping = Object.fromEntries(
      Object.entries(columns).flatMap(([t, c]) => (c === null ? [] : [[t, c]])),
    )
    const result = await mappingAction(slug, draft.batchId, {
      mapping,
      dateFormat,
      lastWins,
      profileName: save ? profileName : '',
    })
    setBusy(false)
    if (!result.ok) {
      setMissing(result.missing)
      requestAnimationFrame(() => alertRef.current?.focus())
      return
    }
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">{m.intro}</p>
      {draft.profileName && (
        <Notice tone="info" title={fill(m.profileLoaded, { Profile: draft.profileName })} />
      )}
      {draft.fullSsnColumns.length > 0 && <Notice tone="warning" title={copy.imports.fullSsn} />}
      {missing.length > 0 && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 focus-visible:focus-ring"
        >
          {missing.map((t) => (
            <p key={t}>{fill(m.missing, { Field: label(t) })}</p>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.columns.field}</TableHead>
              <TableHead>{m.columns.column}</TableHead>
              <TableHead>{m.columns.samples}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.fields.map((f) => {
              const col = columns[f.target] ?? null
              const id = `map-${f.target.replace(':', '-')}`
              return (
                <TableRow key={f.target}>
                  <TableCell>
                    <label htmlFor={id} className="font-semibold text-text-primary">
                      {label(f.target)}
                    </label>
                    {f.required && (
                      <span className="ml-2 text-xs font-semibold text-warning-700">
                        {m.required}
                      </span>
                    )}
                    {f.confidence && col === f.column && (
                      <span className="ml-2 text-xs text-text-secondary">
                        {m.confidence[f.confidence]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <select
                      id={id}
                      value={col ?? ''}
                      onChange={(e) =>
                        setColumns((c) => ({
                          ...c,
                          [f.target]: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      aria-invalid={missing.includes(f.target) || undefined}
                      className={`${selectClass} max-w-xs`}
                    >
                      <option value="">{m.none}</option>
                      {draft.columns.map((c, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: a file may repeat a column name; its position is what the mapping stores
                        <option key={i} value={i}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-secondary">
                    {col === null ? '' : (draft.columns[col]?.samples ?? []).join(' · ')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid max-w-[880px] gap-4 sm:grid-cols-2">
        <FormField id="map-date-format" label={m.dateFormat}>
          <select
            {...fieldIds('map-date-format')}
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}
            className={selectClass}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FormField>
        {draft.kind === 'hours' && (
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold text-n-800">
              {m.duplicates.label}
            </legend>
            {([false, true] as const).map((last) => (
              <label key={String(last)} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="duplicates"
                  checked={lastWins === last}
                  onChange={() => setLastWins(last)}
                  className="size-4 accent-brand focus-visible:focus-ring"
                />
                {last ? m.duplicates.last : m.duplicates.sum}
              </label>
            ))}
          </fieldset>
        )}
        <div className="grid gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-n-800">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
              className="size-4 accent-brand focus-visible:focus-ring"
            />
            {m.saveProfile}
          </label>
          {save && (
            <FormField id="map-profile" label={m.profileName} className="max-w-sm">
              <Input
                {...fieldIds('map-profile')}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </FormField>
          )}
        </div>
      </div>
      <div>
        <Button type="button" disabled={busy} onClick={() => void submit()}>
          {m.submit}
        </Button>
      </div>
    </div>
  )
}
