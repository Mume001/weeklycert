'use client'

// The hours grid (spec/03 §4.5, spec/19 §6). This component owns the cells, and
// everything else follows from them: the engine runs on every change, the panel
// gets the findings, and the autosave sends what moved.
//
// No virtualisation: thirteen rows by seven columns is what the fixtures carry
// and what the DOM handles without help. Virtualisation breaks paste and arrow
// keys, so it waits until a real customer passes 200 rows (spec/19 §6).
import { copy, count } from '@wc/copy'
import { AUTO_FIXABLE, type WeekInput, weekDates } from '@wc/core'
import { type Finding, gridRowFromLine, type IsoDate, type WeekGridDTO } from '@wc/data/dto'
import { cn } from 'cn'
import { CalendarOff, CopyIcon } from 'lucide-react'
import { type ClipboardEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Hours } from '@/components/patterns/Hours'
import { LockedBanner } from '@/components/patterns/LockedBanner'
import { Button } from '@/components/ui/button'
import { type FindingTarget, useWeekState } from '@/lib/week-state'
import { GridHeader } from './GridHeader'
import { GridRow } from './GridRow'
import { type ParsedCell, parseCell } from './parseCell'
import { TotalsRow } from './TotalsRow'
import { useAutosave } from './useAutosave'
import { type CellMap, cellsFromInput, useGridEngine } from './useGridEngine'
import { DAYS_IN_WEEK, focusCell, parsePaste, useGridKeyboard } from './useGridKeyboard'
import { WeekToolbar } from './WeekToolbar'
import './grid.css'

const EMPTY_DAY = { st: '0', ot: '0', manual: false, holiday: false }
const EMPTY_ROW: (ParsedCell | null)[] = [null, null, null, null, null, null, null]

/**
 * Only so the engine hook can run when the role may not read the input. The
 * numbers on screen then come from the DTO the server computed.
 */
const EMPTY_INPUT = {
  tenant: {
    annualHoursBasis: '2080',
    federalOtEnabled: true,
    mergeDeductions: true,
    strictPii: false,
  },
  project: {
    id: '',
    name: '',
    prcNumber: null,
    federalWdNumber: null,
    nyReporting: false,
    federalReporting: false,
    status: 'active' as const,
    startDate: '2026-01-01',
    actualEndDate: null,
    lastAcceptedSubmissionAt: null,
    finalWeekEnding: null,
    retentionYears: 6,
  },
  period: {
    id: '',
    weekEnding: '2026-01-03',
    weekEndsOn: 6 as const,
    status: 'open' as const,
    isNoWork: false,
    isFinal: false,
    lockedAt: null,
    payrollNumber: null,
  },
  intent: 'review' as const,
  classifications: [],
  workers: [],
  plans: [],
  entries: [],
  payroll: [],
  context: {
    today: null,
    payDate: null,
    priorWeeks: [],
    wageScheduleUpdatedAt: null,
    retroactiveEffectiveFrom: null,
    oldestReportWeekEnding: null,
    catalogLabels: null,
  },
} satisfies WeekInput

export interface WeekGridProps {
  data: WeekGridDTO
  /**
   * The week as the engine sees it. Present for roles that may edit hours
   * (spec/02 §3); a viewer gets the DTO only and the grid is read-only.
   */
  input?: WeekInput
  periodId?: string
  readOnly: boolean
  /** Who signed the week and when, for the locked banner (spec/19 §7). */
  lockedBy?: { name: string; at: IsoDate }
  /** Where "Review and generate" goes. */
  reviewHref: string
  /**
   * Where "Create a correction" goes. The correction itself is made on the
   * reports screen (spec/03 §4.5), which is a later session; the locked week
   * still has to offer the way out (spec/19 §7).
   */
  correctionHref: string
  /** Someone else changed the week while it was open (spec/03 §4.5). */
  conflict?: { by: string; minutesAgo: number }
}

export function WeekGrid({
  data,
  input,
  periodId,
  readOnly,
  lockedBy,
  reviewHref,
  correctionHref,
  conflict,
}: WeekGridProps) {
  const week = useWeekState()
  const days = useMemo(() => weekDates(data.weekEnding), [data.weekEnding])
  const [cells, setCells] = useState<CellMap>(() => (input ? cellsFromInput(input) : {}))
  const [focusedRow, setFocusedRow] = useState<string | null>(null)
  // ST rate, OT rate, Supplement and Gross are read after the hours are typed,
  // so on a narrow grid they start folded away (spec/03 §4.5).
  const [showRates, setShowRates] = useState(false)
  const autosave = useAutosave(periodId ?? '')
  const { queue } = autosave

  // The engine, in the browser, on every change (spec/19 §6). Without the input
  // there is nothing to recompute, so what the server computed stands.
  const live = useGridEngine(input ?? EMPTY_INPUT, cells)
  const rows = useMemo(
    () => (input ? live.rows.map(gridRowFromLine) : data.rows),
    [input, live.rows, data.rows],
  )
  const totals = input ? live.totals : data.totals
  const findings: Finding[] = input ? live.findings : data.findings

  const { setFindings, registerGrid } = week
  useEffect(() => setFindings(findings), [findings, setFindings])

  const write = useCallback(
    (rowId: string, day: number, parsed: ParsedCell | null, raw: string) => {
      if (!parsed || readOnly) return
      setCells((current) => {
        const row = [...(current[rowId] ?? EMPTY_ROW)]
        row[day] = parsed
        return { ...current, [rowId]: row }
      })
      queue({ rowId, day, raw })
    },
    [queue, readOnly],
  )

  const onCommit = useCallback(
    (rowId: string, day: number, raw: string) => write(rowId, day, parseCell(raw), raw),
    [write],
  )

  /** Ctrl+D: the value of the cell above, for a crew that works the same day. */
  const fillDown = useCallback(
    (row: number, day: number) => {
      const above = rows[row - 1]
      const target = rows[row]
      if (!above || !target) return
      const value = above.days[day] ?? EMPTY_DAY
      const raw = value.manual
        ? `${value.st}/${value.ot}`
        : String(Number(value.st) + Number(value.ot))
      write(target.id, day, parseCell(raw), raw)
    },
    [rows, write],
  )

  const post = useCallback(
    (body: Record<string, unknown>) => {
      if (!periodId || readOnly) return
      void fetch(`/api/v1/periods/${periodId}/entries`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then(() => window.location.reload())
    },
    [periodId, readOnly],
  )

  const copyLastWeek = useCallback(() => post({ action: 'copyPreviousWeek' }), [post])
  const markNoWork = useCallback(() => post({ action: 'markNoWork' }), [post])

  // The cell owns its own draft and commits on blur, which every key that moves
  // focus triggers; the hook only has to move (spec/19 §6).
  const onKeyDown = useGridKeyboard({
    rowCount: rows.length,
    commit: () => {},
    cancel: () => {},
    fillDown,
    copyLastWeek,
    readOnly,
  })

  /** A block out of Excel fills a rectangle and saves once (spec/19 §6). */
  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLTableSectionElement>) => {
      if (readOnly) return
      const target = event.target
      if (!(target instanceof HTMLInputElement)) return
      const block = parsePaste(event.clipboardData.getData('text/plain'))
      if (block.length === 0 || (block.length === 1 && block[0]?.length === 1)) return
      event.preventDefault()

      const startRow = rows.findIndex((row) => row.id === target.dataset.row)
      const startDay = Number(target.closest('td')?.dataset.day ?? 0)
      if (startRow < 0) return
      const pending: { rowId: string; day: number; raw: string; parsed: ParsedCell | null }[] = []

      block.forEach((line, r) => {
        const row = rows[startRow + r]
        if (!row) return
        line.forEach((text, c) => {
          const day = startDay + c
          if (day >= DAYS_IN_WEEK) return
          pending.push({ rowId: row.id, day, raw: text, parsed: parseCell(text) })
        })
      })

      setCells((current) => {
        const next = { ...current }
        for (const cell of pending) {
          if (!cell.parsed) continue
          const row = [...(next[cell.rowId] ?? EMPTY_ROW)]
          row[cell.day] = cell.parsed
          next[cell.rowId] = row
        }
        return next
      })
      for (const cell of pending) {
        if (cell.parsed) queue({ rowId: cell.rowId, day: cell.day, raw: cell.raw })
      }
    },
    [queue, readOnly, rows],
  )

  // The panel asks for a cell; the grid is the only one that knows where it is.
  useEffect(() => {
    registerGrid({
      focus: (target: FindingTarget) => {
        const row = rows.findIndex(
          (r) =>
            r.workerId === target.workerId &&
            (!target.classificationId || r.classificationId === target.classificationId),
        )
        if (row < 0) return
        setFocusedRow(rows[row]?.id ?? null)
        const day = target.workDate ? days.indexOf(target.workDate) : -1
        focusCell(row, day < 0 ? 0 : day)
      },
      fix: (finding: Finding) => {
        // The unambiguous repairs are DAY_OVER_24 and RATE_EXPIRED (spec/19 §4).
        // Only the first one lives in the grid: the second is a rate, and rates
        // are entered on the classifications screen.
        if (finding.code !== 'DAY_OVER_24' || !finding.workDate) return
        const day = days.indexOf(finding.workDate)
        const row = rows.find((r) => r.workerId === finding.workerId)
        if (day < 0 || !row) return
        write(row.id, day, parseCell(''), '')
      },
      canFix: (finding: Finding) =>
        !readOnly && finding.code === 'DAY_OVER_24' && AUTO_FIXABLE.includes(finding.code),
    })
  }, [registerGrid, rows, days, readOnly, write])

  const findingsByWorkerDay = useMemo(() => {
    const map: Record<string, Finding> = {}
    for (const finding of findings) {
      if (!finding.workerId || !finding.workDate) continue
      const key = `${finding.workerId}|${finding.workDate}`
      const current = map[key]
      if (!current || (current.severity !== 'hard' && finding.severity === 'hard')) {
        map[key] = finding
      }
    }
    return map
  }, [findings])

  const empty = data.isNoWork || rows.length === 0
  const toolbar = (
    <WeekToolbar
      status={data.displayStatus}
      blocking={week.blocking}
      save={autosave}
      readOnly={readOnly}
      onCopyLastWeek={copyLastWeek}
      onMarkNoWork={markNoWork}
      reviewHref={reviewHref}
      findings={findings}
      onOpenFindings={() => week.setPanelOpen(true)}
      findingsTriggerRef={week.panelTriggerRef}
      {...(empty ? {} : { showRates, onToggleRates: () => setShowRates((on) => !on) })}
    />
  )

  if (empty) {
    return (
      <div className="grid-frame">
        {toolbar}
        <div className="p-6">
          <EmptyState
            icon={CalendarOff}
            title={copy.grid.title}
            body={copy.grid.emptyWeek}
            action={
              <Button variant="secondary" onClick={copyLastWeek} disabled={readOnly}>
                <CopyIcon aria-hidden="true" />
                {copy.grid.copyLastWeek}
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid-frame">
      {toolbar}

      {conflict && (
        <div
          role="status"
          className="border-b border-info-100 bg-info-50 px-6 py-2 text-info-600 text-sm"
        >
          {count(copy.grid, 'conflict', conflict.minutesAgo, { Name: conflict.by })}
        </div>
      )}

      {data.lockedReason && lockedBy && (
        <div className="px-6 pt-4">
          <LockedBanner
            {...(data.lockedReason === 'signed'
              ? { reason: 'signed', signedBy: lockedBy.name }
              : { reason: 'submitted' })}
            signedAt={lockedBy.at}
            onCreateCorrection={() => {
              window.location.assign(correctionHref)
            }}
          />
        </div>
      )}

      {/* Wide: the grid. Narrow: one card per worker, read only (spec/14 §6).
          Which one shows is decided in grid.css, at 900 px. */}
      <div className="grid-scroll">
        <table className={cn('grid', !showRates && 'grid--compact')}>
          <GridHeader days={days} />
          <tbody onPaste={onPaste}>
            {rows.map((row, index) => (
              <GridRow
                key={row.id}
                row={row}
                rowIndex={index}
                days={days}
                findingsByDay={Object.fromEntries(
                  days.map((date) => [date, findingsByWorkerDay[`${row.workerId}|${date}`]]),
                )}
                focused={focusedRow === row.id}
                continued={index > 0 && rows[index - 1]?.workerId === row.workerId}
                readOnly={readOnly}
                onCommit={onCommit}
                onKeyDown={onKeyDown}
              />
            ))}
          </tbody>
          <TotalsRow totals={totals} />
        </table>
      </div>

      <div className="grid-cards p-4">
        {rows.map((row) => (
          <article key={row.id} className="grid-card">
            <p className="font-semibold text-sm">{row.workerName}</p>
            <p className="text-text-secondary text-xs">{row.classificationName}</p>
            <div className="grid-card__days">
              {days.map((date, index) => (
                <span key={date} className="grid-card__day">
                  <Hours
                    value={String(
                      Number(row.days[index]?.st ?? 0) + Number(row.days[index]?.ot ?? 0),
                    )}
                  />
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
