// The only place that turns money, hours and dates into text (spec/19 §2).
// Rules from spec/15 §1 point 8: money "$55.40", hours "8.0",
// dates "Sep 12, 2026" in the UI and "2026-09-12" in files and mono text.
import type { Hours, IsoDate, Money } from '@wc/data/dto'
import Decimal from 'decimal.js'

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function formatMoney(value: Money): string {
  const d = new Decimal(value)
  const [whole = '0', cents = '00'] = d.abs().toFixed(2, Decimal.ROUND_HALF_UP).split('.')
  const sign =
    d.isNegative() &&
    !d
      .abs()
      .toFixed(2)
      .match(/^0\.00$/)
      ? '-'
      : ''
  return `${sign}$${group(whole)}.${cents}`
}

export function formatHours(value: Hours): string {
  return new Decimal(value).toFixed(1, Decimal.ROUND_HALF_UP)
}

// ISO dates are calendar dates, not instants: format them in UTC so the
// viewer's time zone can never move a date by a day.
const inUtc = (date: IsoDate) => new Date(`${date}T00:00:00Z`)
const parts = (date: IsoDate, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options })
      .formatToParts(inUtc(date))
      .map((p) => [p.type, p.value]),
  )

/** "Sep 12, 2026" */
export function formatDate(date: IsoDate): string {
  const p = parts(date, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${p.month} ${p.day}, ${p.year}`
}

/** "2026-09-12", for files and mono text. */
export function formatDateMono(date: IsoDate): string {
  return inUtc(date).toISOString().slice(0, 10)
}

/** Pieces for templates like "{Weekday}, {Month} {D}" (spec/15 §3). */
export function dateParts(date: IsoDate): {
  weekday: string
  weekdayShort: string
  month: string
  monthShort: string
  day: string
} {
  const long = parts(date, { weekday: 'long', month: 'long', day: 'numeric' })
  const short = parts(date, { weekday: 'short', month: 'short' })
  return {
    weekday: long.weekday ?? '',
    weekdayShort: short.weekday ?? '',
    month: long.month ?? '',
    monthShort: short.month ?? '',
    day: long.day ?? '',
  }
}

/** Two-letter initials for the avatar, "Mirza Hodzic" -> "MH". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}
