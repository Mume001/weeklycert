// The grid over the fixtures. The numbers are the engine's (spec/19 §1 point 4);
// what is tested here is that the fixtures reach it whole and come back in the
// shape spec/19 §3 describes.
import { beforeEach, describe, expect, it } from 'vitest'
import { WeekGridDTOSchema } from '../src/dto/index.ts'
import {
  buildWeekInput,
  copyPreviousWeek,
  markNoWork,
  patchCell,
  resetWeekEdits,
  weekGrid,
} from '../src/mock/week-grid.ts'

const PROJECT = '01924000-0000-7000-8000-000000000001'
const IN_REVIEW = '2026-09-05'
const OPEN = '2026-09-12'
const OPEN_PERIOD = '01928000-0000-7000-8000-000000000018'

beforeEach(resetWeekEdits)

describe('the payroll number the week will get (spec/04 §7.1)', () => {
  it('is the next number for the oldest unsigned week and the one after for the next', () => {
    expect(weekGrid(PROJECT, IN_REVIEW)).toMatchObject({
      payrollNumber: null,
      expectedPayrollNumber: 22,
    })
    expect(weekGrid(PROJECT, OPEN)).toMatchObject({
      payrollNumber: null,
      expectedPayrollNumber: 23,
    })
  })

  it('is the number it already has once the week is signed', () => {
    expect(weekGrid(PROJECT, '2026-08-29')).toMatchObject({
      payrollNumber: 21,
      expectedPayrollNumber: null,
    })
  })
})

describe('the week the demo opens', () => {
  it('matches the DTO of spec/19 §3', () => {
    expect(WeekGridDTOSchema.safeParse(weekGrid(PROJECT, OPEN)).success).toBe(true)
  })

  it('orders the seven days from weekEnding minus six (spec/05 §4)', () => {
    const grid = weekGrid(PROJECT, OPEN)
    expect(grid.weekEndsOn).toBe(6)
    expect(grid.totals.byDay).toHaveLength(7)
    expect(grid.rows[0]?.days).toHaveLength(7)
  })

  it('is a draft with no payroll number until it is signed', () => {
    const grid = weekGrid(PROJECT, OPEN)
    expect(grid.status).toBe('open')
    expect(grid.payrollNumber).toBeNull()
    expect(grid.lockedReason).toBeUndefined()
  })
})

describe('the week spec/19 §4 wrote the findings into', () => {
  const grid = () => weekGrid(PROJECT, IN_REVIEW)

  it('has exactly three blocking and three warning findings', () => {
    const of = (severity: string) =>
      grid()
        .findings.filter((f) => f.severity === severity)
        .map((f) => f.code)
        .sort()
    expect(of('hard')).toEqual(['DAY_OVER_24', 'RATE_EXPIRED', 'WORKER_ADDRESS_MISSING'])
    expect(of('soft')).toEqual(['APPRENTICE_PCT_MISMATCH', 'DAY_OVER_16', 'FRINGE_NOT_ANNUALIZED'])
  })

  it('needs attention, because a blocking finding is open (spec/04 §7.1)', () => {
    expect(grid().displayStatus).toBe('needs_attention')
  })

  it('carries the thirteen rows of twelve workers (spec/19 §4)', () => {
    const rows = grid().rows
    expect(rows).toHaveLength(13)
    expect(new Set(rows.map((r) => r.workerId)).size).toBe(12)
    // One worker holds two classifications, which is the second indented row.
    const twice = rows.filter((r) => r.workerId === '01927000-0000-7000-8000-00000000000a')
    expect(twice).toHaveLength(2)
  })

  it('names the classification with the official label of the catalogue', () => {
    expect(buildWeekInput(PROJECT, IN_REVIEW).classifications[0]?.officialLabel).toBe(
      'Electrician – Inside Wireman',
    )
  })
})

describe('a signed week is locked (spec/19 §7)', () => {
  it('says why it cannot be edited', () => {
    const grid = weekGrid(PROJECT, '2026-08-29')
    expect(grid.status).toBe('signed')
    expect(grid.lockedReason).toBe('signed')
    expect(grid.displayStatus).toBe('signed')
    expect(grid.payrollNumber).toBe(21)
  })
})

describe('editing a cell', () => {
  it('gives back the row the engine recomputed', () => {
    const before = weekGrid(PROJECT, OPEN).rows[0]
    if (!before) throw new Error('no rows')
    const after = patchCell(OPEN_PERIOD, before.id, 1, '10')
    expect(after.id).toBe(before.id)
    expect(after.days[1]?.st).not.toBe(before.days[1]?.st)
    expect(Number(after.totalHours)).toBeGreaterThan(Number(before.totalHours))
  })

  it('clears the day when the cell is emptied', () => {
    const row = weekGrid(PROJECT, OPEN).rows[0]
    if (!row) throw new Error('no rows')
    const after = patchCell(OPEN_PERIOD, row.id, 2, '')
    expect(after.days[2]).toEqual({ st: '0.00', ot: '0.00', manual: false, holiday: false })
  })

  it('keeps a split the user typed', () => {
    const row = weekGrid(PROJECT, OPEN).rows[0]
    if (!row) throw new Error('no rows')
    const after = patchCell(OPEN_PERIOD, row.id, 3, '9')
    expect(Number(after.days[3]?.st) + Number(after.days[3]?.ot)).toBe(9)
  })
})

describe('copy last week (WCAG 3.3.7, spec/14 §8)', () => {
  it('brings the same crew and the same hours over', () => {
    const previous = weekGrid(PROJECT, IN_REVIEW)
    const copied = copyPreviousWeek(OPEN_PERIOD)
    expect(copied.rows).toHaveLength(previous.rows.length)
    expect(copied.totals.byDay).toEqual(previous.totals.byDay)
  })
})

describe('a week with no work', () => {
  it('empties the hours and says so', () => {
    markNoWork(OPEN_PERIOD)
    const grid = weekGrid(PROJECT, OPEN)
    expect(grid.isNoWork).toBe(true)
    expect(grid.totals.st).toBe('0.00')
    expect(grid.findings.some((f) => f.code === 'NO_WORK_WEEK_PORTAL')).toBe(true)
  })
})
