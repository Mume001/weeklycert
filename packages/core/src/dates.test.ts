import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfWeek,
  daysBetween,
  isIsoDate,
  lastEndedWeekEnding,
  weekDates,
  weekEndingOf,
  weekEndingsBetween,
} from './dates.ts'

describe('dates', () => {
  it('knows the weekday of fixture dates', () => {
    expect(dayOfWeek('2026-09-12')).toBe(6)
    expect(dayOfWeek('2026-09-15')).toBe(2)
    expect(dayOfWeek('2026-04-06')).toBe(1)
  })

  it('rejects impossible dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-9-1')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-08-29', 7)).toBe('2026-09-05')
    expect(addDays('2025-12-27', 7)).toBe('2026-01-03')
    expect(daysBetween('2026-08-26', '2026-09-25')).toBe(30)
  })

  it('orders a Saturday week Sunday to Saturday (spec/05 §4)', () => {
    expect(weekDates('2026-09-12')).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ])
  })

  it('orders a Friday week Saturday to Friday, never a fixed Monday', () => {
    const days = weekDates('2026-09-11')
    expect(dayOfWeek(days[0])).toBe(6)
    expect(dayOfWeek(days[6])).toBe(5)
  })

  it('finds the week that contains a date', () => {
    expect(weekEndingOf('2026-04-06', 6)).toBe('2026-04-11')
    expect(weekEndingOf('2026-09-12', 6)).toBe('2026-09-12')
    expect(weekEndingOf('2026-09-13', 6)).toBe('2026-09-19')
  })

  it('finds the last week that has ended', () => {
    expect(lastEndedWeekEnding('2026-09-15', 6)).toBe('2026-09-12')
    expect(lastEndedWeekEnding('2026-09-12', 6)).toBe('2026-09-05')
    expect(lastEndedWeekEnding('2026-09-13', 6)).toBe('2026-09-12')
  })

  it('lists week endings inclusively', () => {
    expect(weekEndingsBetween('2026-04-11', '2026-09-12')).toHaveLength(23)
    expect(weekEndingsBetween('2026-06-06', '2026-09-12')).toHaveLength(15)
    expect(weekEndingsBetween('2025-09-20', '2026-02-28')).toHaveLength(24)
  })
})
