'use client'

import { copy, count, fill } from '@wc/copy'
import type { ImportDraftDTO } from '@wc/data/dto'
import { cn } from 'cn'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { confirmCheckAction, resolveAction } from './actions'

const t = copy.imports
const c = t.check
type MessageKey = keyof typeof c.messages

const TONE = {
  ok: 'text-success-700',
  warn: 'text-warning-700',
  error: 'text-error-600',
  skipped: 'text-text-secondary',
} as const

/**
 * Step 3 (spec/06 §2): every row as it will go in, what is wrong with it, the
 * picks for names and codes nothing matched, and the way on to step 4.
 */
export function CheckStep({ slug, draft }: { slug: string; draft: ImportDraftDTO }) {
  const router = useRouter()
  const [workers, setWorkers] = useState<Record<string, string>>({})
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [skip, setSkip] = useState(false)
  const [busy, setBusy] = useState(false)
  const check = draft.check
  if (!check) return null
  const { counts } = check
  const valueColumn = draft.kind === 'payroll' ? 'gross' : 'hours'
  const unresolved = check.unresolvedWorkers.length + check.unresolvedCodes.length > 0

  const saveMatches = async () => {
    setBusy(true)
    await resolveAction(slug, draft.batchId, { workers, codes })
    setBusy(false)
    setWorkers({})
    setCodes({})
    router.refresh()
  }

  const next = async () => {
    setBusy(true)
    const result = await confirmCheckAction(slug, draft.batchId, skip)
    setBusy(false)
    if (result.ok) router.refresh()
  }

  const blocked = counts.error > 0 && !skip

  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold" aria-live="polite">
        <li>{count(t, 'rowsInFile', counts.total)}</li>
        <li className="text-success-700">{fill(t.ready, { n: counts.ok })}</li>
        <li className="text-warning-700">{count(t, 'warnings', counts.warn)}</li>
        <li className="text-error-600">{count(t, 'errors', counts.error)}</li>
        <li className="text-text-secondary">{count(t, 'rowsSkipped', counts.skipped)}</li>
      </ul>

      {unresolved && (
        <section className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
          {check.unresolvedWorkers.map((name, i) => (
            <FormField
              key={name}
              id={`pick-worker-${i}`}
              label={fill(c.matchWorker, { Name: name })}
            >
              <select
                {...fieldIds(`pick-worker-${i}`)}
                value={workers[name] ?? ''}
                onChange={(e) => setWorkers((w) => ({ ...w, [name]: e.target.value }))}
                className={`${selectClass} max-w-sm`}
              >
                <option value="">{c.pickWorker}</option>
                <option value="new">{c.createWorker}</option>
                {draft.workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
          ))}
          {check.unresolvedCodes.map((code, i) => (
            <FormField key={code} id={`pick-code-${i}`} label={fill(c.matchCode, { Code: code })}>
              <select
                {...fieldIds(`pick-code-${i}`)}
                value={codes[code] ?? ''}
                onChange={(e) => setCodes((x) => ({ ...x, [code]: e.target.value }))}
                className={`${selectClass} max-w-sm`}
              >
                <option value="">{c.pickClassification}</option>
                {draft.classifications.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </FormField>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void saveMatches()}
            >
              {c.saveMatches}
            </Button>
          </div>
        </section>
      )}

      <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">{c.columns.row}</TableHead>
              <TableHead>{c.columns.worker}</TableHead>
              {draft.kind === 'hours' && <TableHead>{c.columns.date}</TableHead>}
              {draft.kind !== 'workers' && (
                <TableHead className="text-right">{c.columns[valueColumn]}</TableHead>
              )}
              <TableHead>{c.columns.status}</TableHead>
              <TableHead>{c.columns.message}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {check.rows.map((row) => (
              <TableRow key={row.rowNo}>
                <TableCell className="text-right tabular-nums">{row.rowNo}</TableCell>
                <TableCell>
                  {row.cells.worker ??
                    row.cells.fullName ??
                    [row.cells.lastName, row.cells.firstName].filter(Boolean).join(', ')}
                </TableCell>
                {draft.kind === 'hours' && <TableCell>{row.cells.date}</TableCell>}
                {draft.kind !== 'workers' && (
                  <TableCell className="text-right tabular-nums">
                    {row.cells[valueColumn]}
                  </TableCell>
                )}
                <TableCell className={cn('font-semibold', TONE[row.status])}>
                  {c.status[row.status]}
                </TableCell>
                <TableCell className="text-sm">
                  {row.messages.map((msg) => c.messages[msg as MessageKey] ?? msg).join(' ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {counts.total > check.rows.length && (
        <p className="text-xs text-text-secondary">{c.firstRows}</p>
      )}

      {counts.error > 0 && (
        <p className="text-sm font-semibold text-error-600">
          {count(c, 'stillErrors', counts.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="secondary">
          <Link href={`/app/${slug}/imports/new?batch=${draft.batchId}&step=2`}>
            {copy.buttons.back}
          </Link>
        </Button>
        {counts.error > 0 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-n-800">
            <input
              type="checkbox"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
              className="size-4 accent-brand focus-visible:focus-ring"
            />
            {c.skipErrors}
          </label>
        )}
        <Button type="button" disabled={busy || blocked} onClick={() => void next()}>
          {c.submit}
        </Button>
      </div>
    </div>
  )
}
