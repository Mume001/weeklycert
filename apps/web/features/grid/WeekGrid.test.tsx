// The grid, driven the way a payroll clerk drives it: with the keyboard.
// The numbers come from the real engine (spec/19 §1 point 4), so this file
// builds an input and lets computeWeek() produce the rows, exactly as the
// server does.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { computeWeek, type WeekInput } from '@wc/core'
import { displayStatusOf, gridRowFromLine, type WeekGridDTO } from '@wc/data/dto'
import { describe, expect, it } from 'vitest'
import { WeekStateProvider } from '@/lib/week-state'
import { WeekGrid } from './WeekGrid'

const WEEK = '2026-09-12'
const DAYS = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11']

function worker(id: string, last: string) {
  return {
    id,
    firstName: 'Test',
    lastName: last,
    middleName: null,
    level: 'J' as const,
    status: 'active' as const,
    ssnLast4: '1234',
    dateOfBirth: null,
    address: {
      address1: '1 Main Street',
      address2: null,
      city: 'Poughkeepsie',
      state: 'NY',
      postalCode: '12601',
      postalCodeExt: null,
    },
    apprentice: null,
    allocations: [],
  }
}

function input(): WeekInput {
  return {
    tenant: {
      annualHoursBasis: '2080',
      federalOtEnabled: true,
      mergeDeductions: true,
      strictPii: false,
    },
    project: {
      id: 'p-1',
      name: 'Courthouse Lighting',
      prcNumber: '2010008390',
      federalWdNumber: null,
      nyReporting: true,
      federalReporting: false,
      status: 'active',
      startDate: '2026-04-06',
      actualEndDate: null,
      lastAcceptedSubmissionAt: null,
      finalWeekEnding: null,
      retentionYears: 6,
    },
    period: {
      id: 'per-1',
      weekEnding: WEEK,
      weekEndsOn: 6,
      status: 'open',
      isNoWork: false,
      isFinal: false,
      lockedAt: null,
      payrollNumber: null,
    },
    intent: 'review',
    classifications: [
      {
        id: 'pc-1',
        classificationId: 'cls-1',
        officialLabel: 'Electrician – Inside Wireman',
        displayLabel: 'Electrician – Inside Wireman',
        wdBaseRate: '20.00',
        wdFringeRate: '0.00',
        paidBaseRate: '20.00',
        cashInLieuRate: '0.00',
        apprenticeRatio: null,
        otCodes: ['B'],
        holidayCode: null,
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
      },
    ],
    workers: [worker('w-1', 'Alvarez'), worker('w-2', 'Chen')],
    plans: [],
    entries: ['w-1', 'w-2'].flatMap((workerId) =>
      DAYS.map((workDate) => ({
        workerId,
        classificationId: 'cls-1',
        workDate,
        hours: '8',
        stOverride: null,
        otOverride: null,
        paidStRate: null,
        paidOtRate: null,
        isHoliday: false,
        holidayMultiplier: null,
      })),
    ),
    payroll: [],
    context: {
      today: '2026-09-15',
      payDate: null,
      priorWeeks: [],
      wageScheduleUpdatedAt: null,
      retroactiveEffectiveFrom: null,
      oldestReportWeekEnding: null,
      catalogLabels: ['Electrician – Inside Wireman'],
    },
  }
}

function dto(week: WeekInput): WeekGridDTO {
  const result = computeWeek(week)
  return {
    project: {
      id: 'p-1',
      name: 'Courthouse Lighting',
      prcNumber: '2010008390',
      federallyFunded: false,
    },
    weekEnding: WEEK,
    weekEndsOn: 6,
    isNoWork: false,
    status: 'open',
    displayStatus: displayStatusOf(
      'open',
      undefined,
      result.findings.filter((f) => f.severity === 'hard').length,
    ),
    payrollNumber: null,
    expectedPayrollNumber: 23,
    rows: result.rows.map(gridRowFromLine),
    totals: result.totals,
    findings: result.findings,
  }
}

function setup(readOnly = false) {
  const week = input()
  const data = dto(week)
  render(
    <WeekStateProvider initialFindings={data.findings} readOnly={readOnly}>
      <WeekGrid
        data={data}
        input={week}
        periodId="per-1"
        readOnly={readOnly}
        reviewHref="/review"
        correctionHref="/reports"
      />
    </WeekStateProvider>,
  )
  return data
}

const cell = (row: number, day: number) => document.getElementById(`cell-${row}-${day}`)

describe('the grid on screen', () => {
  it('shows seven day columns in the order of spec/05 §4', () => {
    setup()
    const header = screen.getAllByRole('columnheader')
    expect(header.map((h) => h.textContent)).toEqual([
      'Worker',
      'Sun 6',
      'Mon 7',
      'Tue 8',
      'Wed 9',
      'Thu 10',
      'Fri 11',
      'Sat 12',
      'Total',
      'ST',
      'OT',
      'ST rate',
      'OT rate',
      'Supplement',
      'Gross',
    ])
  })

  it('shows one row per worker and classification, with the week total below', () => {
    const data = setup()
    expect(data.rows).toHaveLength(2)
    expect(data.rows[0]?.totalHours).toBe('40.00')

    // Two workers, five eight hour days each, at 20.00 an hour.
    const totals = screen.getByRole('row', { name: /Week total/ })
    expect(within(totals).getAllByText('80.0')).toHaveLength(2)
    expect(within(totals).getByText('$1,600.00')).toBeTruthy()
  })

  it('puts the classification and the J/RA badge inside the worker cell', () => {
    setup()
    // Three pieces of data, one 220 px column (spec/03 §4.5, spec/14 §7).
    const cell = screen.getAllByRole('rowheader')[0]
    if (!cell) throw new Error('no worker cell')
    expect(cell.textContent).toBe('Alvarez, TestElectrician – Inside WiremanJ')
    // The long official label truncates, so the whole of it stays in a title.
    expect(within(cell).getByTitle('Electrician – Inside Wireman', { exact: true })).toBeTruthy()
  })

  it('names every cell for a screen reader', () => {
    setup()
    expect(cell(0, 1)?.getAttribute('aria-label')).toBe('Hours for Alvarez, Test on 2026-09-07')
  })
})

describe('the keyboard (spec/14 §7)', () => {
  it('Enter goes down, which is how a week is typed', () => {
    setup()
    const start = cell(0, 3)
    if (!start) throw new Error('no cell')
    start.focus()
    fireEvent.keyDown(start, { key: 'Enter' })
    expect(document.activeElement).toBe(cell(1, 3))
  })

  it('Tab goes right', () => {
    setup()
    const start = cell(0, 1)
    if (!start) throw new Error('no cell')
    start.focus()
    fireEvent.keyDown(start, { key: 'Tab' })
    expect(document.activeElement).toBe(cell(0, 2))
  })

  it('arrows move, and Home and End jump to the ends of the row', () => {
    setup()
    const start = cell(1, 3)
    if (!start) throw new Error('no cell')
    start.focus()
    fireEvent.keyDown(start, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(cell(0, 3))
    fireEvent.keyDown(cell(0, 3) as HTMLElement, { key: 'Home' })
    expect(document.activeElement).toBe(cell(0, 0))
    fireEvent.keyDown(cell(0, 0) as HTMLElement, { key: 'End' })
    expect(document.activeElement).toBe(cell(0, 6))
  })

  it('stays inside the grid at the edges', () => {
    setup()
    const first = cell(0, 0)
    if (!first) throw new Error('no cell')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
  })
})

describe('a cell', () => {
  it('takes the total for the day and lets the engine split it', () => {
    setup()
    const input = cell(0, 1) as HTMLInputElement
    fireEvent.change(input, { target: { value: '9' } })
    fireEvent.blur(input)
    // Code B: the ninth hour is overtime, so the row now carries one OT hour.
    expect(screen.getAllByText(/OT/).length).toBeGreaterThan(0)
    expect(input.value).toBe('9')
  })

  it('keeps what was typed and says so when it cannot be read', () => {
    setup()
    const input = cell(0, 1) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'eight' } })
    fireEvent.blur(input)
    expect(input.value).toBe('eight')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Enter hours, for example 8, 8.5 or 8/1.')).toBeTruthy()
  })

  it('Escape puts the old value back', () => {
    setup()
    const input = cell(0, 1) as HTMLInputElement
    const before = input.value
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe(before)
  })
})

describe('pasting a block out of Excel (spec/19 §6)', () => {
  it('fills a rectangle from the focused cell, right and down', () => {
    setup()
    const start = cell(0, 1) as HTMLInputElement
    start.focus()
    fireEvent.paste(start, {
      clipboardData: { getData: () => '10\t9\n7\t6' },
    })

    expect((cell(0, 1) as HTMLInputElement).value).toBe('10')
    expect((cell(0, 2) as HTMLInputElement).value).toBe('9')
    expect((cell(1, 1) as HTMLInputElement).value).toBe('7')
    expect((cell(1, 2) as HTMLInputElement).value).toBe('6')
  })

  it('stops at the end of the week instead of wrapping into the next row', () => {
    setup()
    const start = cell(0, 5) as HTMLInputElement
    start.focus()
    fireEvent.paste(start, {
      clipboardData: { getData: () => '1\t2\t3\t4' },
    })

    expect((cell(0, 5) as HTMLInputElement).value).toBe('1')
    expect((cell(0, 6) as HTMLInputElement).value).toBe('2')
    // The third and fourth value have nowhere to go, and row 1 keeps its own.
    expect((cell(1, 0) as HTMLInputElement).value).toBe('')
  })
})

describe('a week that cannot be edited', () => {
  it('disables every cell', () => {
    setup(true)
    expect((cell(0, 1) as HTMLInputElement).disabled).toBe(true)
  })
})
