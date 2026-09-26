'use client'

import { copy, count, fill } from '@wc/copy'
import type { ImportApplyResult, ImportDraftDTO } from '@wc/data/dto'
import Link from 'next/link'
import { useState } from 'react'
import { Money } from '@/components/patterns/Money'
import { Notice } from '@/components/patterns/Notice'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatHours } from '@/lib/format'
import { applyAction } from './actions'

const t = copy.imports
const r = t.reconcile

/**
 * Step 4 (spec/06 §2): per worker, what the file brings against what is known,
 * before anything is written. "Nije prenio sve plate" is the complaint about
 * the tools we replace, so the difference is on the screen before the button.
 */
export function ReconcileStep({ slug, draft }: { slug: string; draft: ImportDraftDTO }) {
  const [result, setResult] = useState<ImportApplyResult | null>(null)
  const [busy, setBusy] = useState(false)
  const payroll = draft.kind === 'payroll'
  const amount = (v: string | null) =>
    v === null ? (
      <span className="text-text-secondary">{r.none}</span>
    ) : payroll ? (
      <Money value={v} />
    ) : (
      formatHours(v)
    )

  const confirm = async () => {
    setBusy(true)
    setResult(await applyAction(slug, draft.batchId))
    setBusy(false)
  }

  if (result?.ok && result.summary) {
    const s = result.summary
    const next =
      draft.kind === 'workers'
        ? `/app/${slug}/workers`
        : `/app/${slug}/projects/${draft.project?.id}/weeks/${draft.weekEnding}`
    return (
      <section
        role="status"
        className="grid max-w-[880px] justify-items-start gap-2 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      >
        <h2 className="text-md font-semibold text-text-primary">{t.applied}</h2>
        {s.weekEnding && (
          <p className="text-sm text-text-secondary">
            {fill(t.appliedWeek, { date: formatDate(s.weekEnding) })}
          </p>
        )}
        <ul className="grid gap-0.5 text-sm">
          <li>{count(t, 'rowsImported', s.rowsImported)}</li>
          <li>{count(t, 'workers', s.workers)}</li>
          <li>{count(t, 'rowsSkipped', s.rowsSkipped)}</li>
        </ul>
        <Button asChild className="mt-2">
          <Link href={next}>{draft.kind === 'workers' ? copy.nav.workers : r.openWeek}</Link>
        </Button>
      </section>
    )
  }

  return (
    <div className="grid gap-4">
      {result?.refused === 'locked' && <Notice tone="warning" title={r.locked} />}
      {draft.kind !== 'workers' && (
        <section className="grid gap-3">
          <h2 className="text-md font-semibold text-text-primary">
            {payroll ? r.titlePayroll : r.titleHours}
          </h2>
          <p className="text-sm text-text-secondary">{r.note}</p>
          <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{r.columns.worker}</TableHead>
                  <TableHead className="text-right">{r.columns.inFile}</TableHead>
                  {payroll && <TableHead className="text-right">{r.columns.onProject}</TableHead>}
                  <TableHead className="text-right">{r.columns.lastWeek}</TableHead>
                  <TableHead className="text-right">{r.columns.difference}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.reconcile.map((line) => (
                  <TableRow key={line.workerId}>
                    <TableCell>{line.workerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{amount(line.inFile)}</TableCell>
                    {payroll && (
                      <TableCell className="text-right tabular-nums">
                        {amount(line.onProject)}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">
                      {amount(line.lastWeek)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {amount(line.difference)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
      <div className="flex gap-2">
        <Button asChild variant="secondary">
          <Link href={`/app/${slug}/imports/new?batch=${draft.batchId}&step=2`}>
            {copy.buttons.back}
          </Link>
        </Button>
        <Button type="button" disabled={busy} onClick={() => void confirm()}>
          {r.submit}
        </Button>
      </div>
    </div>
  )
}
