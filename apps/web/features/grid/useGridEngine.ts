'use client'

// The engine, in the browser (spec/19 §6). computeWeek() is a pure function, so
// it runs on every keystroke, synchronously, and the findings panel is right
// before the user has finished blinking. The server runs the same code when it
// saves, and its result is the one that counts (spec/03 §4.5).
import { computeWeek, type WeekInput, type WeekResult, weekDates } from '@wc/core'
import { useMemo } from 'react'
import type { ParsedCell } from './parseCell'

/** rowId -> seven days, null where the day was never typed. */
export type CellMap = Record<string, (ParsedCell | null)[]>

const EMPTY: (ParsedCell | null)[] = [null, null, null, null, null, null, null]

/** The cells as the server sent them, so the first paint matches the server. */
export function cellsFromInput(input: WeekInput): CellMap {
  const dates = weekDates(input.period.weekEnding)
  const cells: CellMap = {}
  for (const entry of input.entries) {
    const rowId = `${entry.workerId}:${entry.classificationId}`
    const day = dates.indexOf(entry.workDate)
    if (day < 0) continue
    const row = cells[rowId] ?? [...EMPTY]
    const manual = entry.stOverride !== null && entry.stOverride !== undefined
    row[day] = manual
      ? { st: entry.stOverride ?? '0', ot: entry.otOverride ?? '0', manual: true }
      : { st: entry.hours, ot: '0', manual: false }
    cells[rowId] = row
  }
  return cells
}

/** Which row of the grid a cell belongs to, and which classification it carries. */
export function splitRowId(rowId: string): { workerId: string; classificationId: string } {
  const [workerId = '', classificationId = ''] = rowId.split(':')
  return { workerId, classificationId }
}

function entriesFrom(input: WeekInput, cells: CellMap): WeekInput['entries'] {
  const dates = weekDates(input.period.weekEnding)
  const byRow = new Map(
    input.entries.map((entry) => [`${entry.workerId}:${entry.classificationId}`, entry]),
  )
  const out: WeekInput['entries'] = []

  for (const [rowId, days] of Object.entries(cells)) {
    const { workerId, classificationId } = splitRowId(rowId)
    const sample = byRow.get(rowId)
    days.forEach((cell, index) => {
      const workDate = dates[index]
      if (!cell || !workDate) return
      const total = Number(cell.st) + Number(cell.ot)
      if (total === 0 && !cell.manual) return
      out.push({
        workerId,
        classificationId,
        workDate,
        hours: String(total),
        stOverride: cell.manual ? cell.st : null,
        otOverride: cell.manual ? cell.ot : null,
        paidStRate: sample?.paidStRate ?? null,
        paidOtRate: sample?.paidOtRate ?? null,
        isHoliday: false,
        holidayMultiplier: null,
      })
    })
  }
  return out
}

/**
 * Recomputes the whole week from the cells on screen. Thirteen rows by seven
 * columns is the worst case in the fixtures (spec/19 §6), well inside the
 * 300 ms the acceptance criterion in spec/03 §4.5 allows.
 */
export function useGridEngine(input: WeekInput, cells: CellMap): WeekResult {
  return useMemo(
    () => computeWeek({ ...input, entries: entriesFrom(input, cells) }),
    [input, cells],
  )
}
