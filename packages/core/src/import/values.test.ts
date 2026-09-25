// The value rules of spec/06 §3: hours, money, dates, names, and cells that
// look like formulas.
import { describe, expect, it } from 'vitest'
import {
  detectDateFormat,
  looksLikeFormula,
  nameKey,
  parseDate,
  parseHours,
  parseMoney,
} from './values.ts'

describe('hours (06 §3)', () => {
  it.each([
    ['7.5', '7.50'],
    ['7,5', '7.50'],
    ['7:30', '7.50'],
    ['7h30', '7.50'],
    ['7.50 hrs', '7.50'],
    ['8', '8.00'],
    ['0:45', '0.75'],
  ])('reads %s as %s', (raw, hours) => {
    expect(parseHours(raw)).toEqual({ ok: true, value: hours })
  })

  it('empty is zero, and the row is skipped for having no hours', () => {
    expect(parseHours('  ')).toEqual({ ok: true, value: '0.00' })
  })

  it('refuses a negative, and never evaluates a formula', () => {
    expect(parseHours('-2')).toEqual({ ok: false, code: 'negative' })
    expect(parseHours('=8')).toEqual({ ok: false, code: 'unreadable' })
    expect(parseHours('eight')).toEqual({ ok: false, code: 'unreadable' })
  })
})

describe('money (06 §3)', () => {
  it.each([
    ['$1,234.50', '1234.50'],
    ['1 234.5', '1234.50'],
    ['(12.00)', '-12.00'],
    ['-12', '-12.00'],
    ['0', '0.00'],
  ])('reads %s as %s', (raw, money) => {
    expect(parseMoney(raw)).toEqual({ ok: true, value: money })
  })

  it('refuses text and formulas', () => {
    expect(parseMoney('=SUM(A1:A3)')).toEqual({ ok: false, code: 'unreadable' })
    expect(parseMoney('n/a')).toEqual({ ok: false, code: 'unreadable' })
  })
})

describe('dates (06 §2 and §3)', () => {
  it('detects the format from the first rows', () => {
    expect(detectDateFormat(['09/08/2026', '09/09/2026'])).toBe('MM/DD/YYYY')
    expect(detectDateFormat(['2026-09-08'])).toBe('YYYY-MM-DD')
    expect(detectDateFormat(['9/8/26', '9/9/26'])).toBe('M/D/YY')
  })

  it('reads with the format, falls back to ISO, and puts a two-digit year in 20xx', () => {
    expect(parseDate('09/08/2026', 'MM/DD/YYYY')).toBe('2026-09-08')
    expect(parseDate('9/8/26', 'M/D/YY')).toBe('2026-09-08')
    expect(parseDate('2026-09-08', 'MM/DD/YYYY')).toBe('2026-09-08')
    expect(parseDate('13/45/2026', 'MM/DD/YYYY')).toBeNull()
    expect(parseDate('next Tuesday', 'MM/DD/YYYY')).toBeNull()
  })
})

describe('names (06 §3)', () => {
  it('"Doe, John" and "John Doe" are the same worker; case, spaces and accents do not count', () => {
    expect(nameKey('Doe, John')).toBe(nameKey('John  Doe'))
    expect(nameKey('JOSÉ  PEÑA')).toBe(nameKey('Pena, Jose'))
  })

  it('ignores a middle initial when comparing', () => {
    expect(nameKey('Doe, John Q.')).toBe(nameKey('John Doe'))
    expect(nameKey('John Q Doe')).toBe(nameKey('Doe, John'))
  })
})

describe('formula injection (06 §3, 03 §4.7)', () => {
  it.each(['=cmd|calc', '+1+1', '-2+3', '@SUM(A1)', '\tx', '\rx'])(
    '%s is only ever text',
    (cell) => {
      expect(looksLikeFormula(cell)).toBe(true)
    },
  )

  it('a plain name is not', () => {
    expect(looksLikeFormula('Doe, John')).toBe(false)
  })
})
