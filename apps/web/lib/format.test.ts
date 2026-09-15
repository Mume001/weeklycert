import { describe, expect, it } from 'vitest'
import { dateParts, formatDate, formatDateMono, formatHours, formatMoney, initials } from './format'

describe('format (spec/15 §1 point 8)', () => {
  it.each([
    ['55.4', '$55.40'],
    ['55.40', '$55.40'],
    ['2216', '$2,216.00'],
    ['15155.1', '$15,155.10'],
    ['1234567.891', '$1,234,567.89'],
    ['0.005', '$0.01'],
    ['-12.5', '-$12.50'],
    ['-0.001', '$0.00'],
  ])('money %s -> %s', (value, text) => {
    expect(formatMoney(value)).toBe(text)
  })

  it('never uses binary floating point for money', () => {
    expect(formatMoney('0.1')).toBe('$0.10')
    expect(formatMoney('1.005')).toBe('$1.01')
  })

  it.each([
    ['8', '8.0'],
    ['8.5', '8.5'],
    ['0', '0.0'],
    ['7.25', '7.3'],
  ])('hours %s -> %s', (value, text) => {
    expect(formatHours(value)).toBe(text)
  })

  it('writes UI dates as "Sep 12, 2026" and file dates as ISO', () => {
    expect(formatDate('2026-09-12')).toBe('Sep 12, 2026')
    expect(formatDateMono('2026-09-12')).toBe('2026-09-12')
  })

  it('does not shift dates with the time zone', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  })

  it('splits a date for templates', () => {
    expect(dateParts('2026-09-15')).toEqual({
      weekday: 'Tuesday',
      weekdayShort: 'Tue',
      month: 'September',
      monthShort: 'Sep',
      day: '15',
    })
  })

  it('makes avatar initials', () => {
    expect(initials('Mirza Hodzic')).toBe('MH')
    expect(initials('Mume')).toBe('M')
  })
})
