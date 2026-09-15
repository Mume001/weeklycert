import { describe, expect, it } from 'vitest'
import { isOpenPeriodStatus, isWeekOpen, openWeekEndings, timelineWeekEndings } from './weeks.ts'

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
