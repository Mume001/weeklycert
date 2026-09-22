import { describe, expect, it } from 'vitest'
import {
  expectedPayrollNumbers,
  isOpenPeriodStatus,
  isWeekOpen,
  nextStateFilingDeadline,
  openWeekEndings,
  timelineWeekEndings,
} from './weeks.ts'

describe('open weeks (spec/03 §3 state table)', () => {
  it.each([
    ['open', true],
    ['in_review', true],
    ['generated', true],
    ['signed', false],
    ['submitted', false],
    ['corrected', false],
  ] as const)('%s is open: %s', (status, open) => {
    expect(isOpenPeriodStatus(status)).toBe(open)
  })

  it('counts a week with no period row as open', () => {
    expect(isWeekOpen([])).toBe(true)
  })

  it('does not count a corrected week whose correction was submitted', () => {
    expect(isWeekOpen(['corrected', 'submitted'])).toBe(false)
  })

  it('counts a corrected week whose correction is still open, once', () => {
    expect(isWeekOpen(['corrected', 'open'])).toBe(true)
  })

  it('stops the timeline at the last week that has ended', () => {
    const weeks = timelineWeekEndings({
      startDate: '2026-04-06',
      weekEndsOn: 6,
      today: '2026-09-15',
    })
    expect(weeks[0]).toBe('2026-04-11')
    expect(weeks.at(-1)).toBe('2026-09-12')
    expect(weeks).toHaveLength(23)
  })

  it('stops the timeline at the end date of a completed project', () => {
    const weeks = timelineWeekEndings({
      startDate: '2025-09-15',
      endDate: '2026-02-28',
      weekEndsOn: 6,
      today: '2026-09-15',
    })
    expect(weeks).toHaveLength(24)
  })

  it('lists weeks with no row and open rows, oldest first', () => {
    expect(
      openWeekEndings({
        startDate: '2026-08-17',
        weekEndsOn: 6,
        today: '2026-09-15',
        periods: [
          { weekEnding: '2026-08-22', status: 'submitted' },
          { weekEnding: '2026-09-05', status: 'in_review' },
        ],
      }),
    ).toEqual(['2026-08-29', '2026-09-05', '2026-09-12'])
  })
})

describe('state filing deadline (spec/05 §2)', () => {
  it('is the start date plus 30 before any accepted submission', () => {
    expect(
      nextStateFilingDeadline({ startDate: '2026-04-06', lastAcceptedSubmissionAt: null }),
    ).toBe('2026-05-06')
  })

  it('is the last accepted submission plus 30 afterwards', () => {
    expect(
      nextStateFilingDeadline({ startDate: '2026-04-06', lastAcceptedSubmissionAt: '2026-08-26' }),
    ).toBe('2026-09-25')
  })

  it('honours a project with a different interval', () => {
    expect(
      nextStateFilingDeadline({
        startDate: '2026-04-06',
        lastAcceptedSubmissionAt: '2026-08-26',
        everyDays: 14,
      }),
    ).toBe('2026-09-09')
  })
})

describe('payroll number a week will get (spec/04 §7.1, 01 §2.5)', () => {
  it('numbers unsigned weeks in order, from next_payroll_number', () => {
    expect(
      expectedPayrollNumbers(
        [
          { weekEnding: '2026-08-29', payrollNumber: 21 },
          { weekEnding: '2026-09-12', payrollNumber: null },
          { weekEnding: '2026-09-05', payrollNumber: null },
        ],
        22,
      ),
    ).toEqual(
      new Map([
        ['2026-09-05', 22],
        ['2026-09-12', 23],
      ]),
    )
  })

  it('gives nothing to a week that already has its number', () => {
    expect(expectedPayrollNumbers([{ weekEnding: '2026-08-29', payrollNumber: 21 }], 22).size).toBe(
      0,
    )
  })
})
