'use client'

import { copy, count } from '@wc/copy'
import { type PastedRow, parseScheduleText } from '@wc/core'
import type { ProjectClassificationsDTO } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
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
import { addPastedClassificationsAction } from './actions'

const t = copy.onboarding.classifications.paste

type Status = keyof typeof t.status

/**
 * "Paste a table from the wage schedule" (spec/03 §4.3 step 3). The text is
 * read in the browser by core's parseScheduleText and nothing is saved until
 * the user confirms; each confirmed row is then added like one typed by hand.
 * The layout of real pasted text is NEPROVJERENO (spec/13 A15).
 */
export function PasteSchedule({
  slug,
  projectId,
  catalog,
  onProject,
}: {
  slug: string
  projectId: string
  catalog: ProjectClassificationsDTO['catalog']
  /** Classification ids already on the project. */
  onProject: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<PastedRow[] | null>(null)
  const [from, setFrom] = useState('')
  const [added, setAdded] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const idOf = (label: string | null) => catalog.find((c) => c.officialLabel === label)?.id
  const statusOf = (row: PastedRow): Status => {
    if (row.issue) return row.issue
    const id = idOf(row.label)
    return id && onProject.includes(id) ? 'onProject' : 'ready'
  }
  const ready = (rows ?? []).filter((r) => statusOf(r) === 'ready')

  const add = async () => {
    setBusy(true)
    const result = await addPastedClassificationsAction(
      slug,
      projectId,
      ready.map((r) => ({
        classificationId: idOf(r.label) ?? '',
        displayLabel: '',
        baseRate: r.baseRate ?? '',
        supplement: r.supplement ?? '',
        otCodes: r.otCodes.join(', '),
        effectiveFrom: from,
        apprenticeRatio: '',
      })),
    )
    setBusy(false)
    setAdded(result.added)
    setRows(null)
    setText('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <div className="grid gap-2">
        {added !== null && (
          <p role="status" className="text-sm font-semibold text-success-700">
            {count(t, 'added', added)}
          </p>
        )}
        <div>
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            {t.open}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <FormField id="paste-text" label={t.label} hint={t.hint}>
        <textarea
          {...fieldIds('paste-text', t.hint)}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-border-interactive bg-white px-2.5 py-2 font-mono text-sm focus-visible:focus-ring"
        />
      </FormField>
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRows(
              parseScheduleText(
                text,
                catalog.map((c) => c.officialLabel),
              ),
            )
          }
        >
          {t.suggest}
        </Button>
      </div>
      {rows && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t.columns.line}</TableHead>
                <TableHead>{t.columns.classification}</TableHead>
                <TableHead className="text-right">{t.columns.baseRate}</TableHead>
                <TableHead className="text-right">{t.columns.supplement}</TableHead>
                <TableHead>{t.columns.otCodes}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const status = statusOf(row)
                return (
                  <TableRow key={row.line}>
                    <TableCell className="text-right tabular-nums">{row.line}</TableCell>
                    <TableCell>{row.label ?? row.text}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.baseRate && formatMoney(row.baseRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.supplement && formatMoney(row.supplement)}
                    </TableCell>
                    <TableCell className="font-mono">{row.otCodes.join(', ')}</TableCell>
                    <TableCell
                      className={
                        status === 'ready'
                          ? 'font-semibold text-success-700'
                          : 'font-semibold text-warning-700'
                      }
                    >
                      {t.status[status]}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {ready.length === 0 ? (
            <p className="text-sm font-semibold text-warning-700">{t.noneReady}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <FormField id="paste-from" label={t.effectiveFrom}>
                <Input
                  {...fieldIds('paste-from')}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </FormField>
              <Button type="button" disabled={busy || from === ''} onClick={() => void add()}>
                {count(t, 'add', ready.length)}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
