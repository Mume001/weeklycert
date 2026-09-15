// Calendar arithmetic on ISO dates ("2026-09-12"). Pure, no time zones:
// a work week is made of dates, not instants (spec/04 §1 point 5).

export type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 Sunday, 6 Saturday (tenant_settings.week_ending_dow)

const DAY_MS = 86_400_000
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function toUtcMs(date: string): number {
  const m = ISO.exec(date)
  if (!m) throw new Error(`Not an ISO date: "${date}"`)
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (toIso(ms) !== date) throw new Error(`Not a real calendar date: "${date}"`)
  return ms
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  try {
    toUtcMs(value)
    return true
  } catch {
    return false
  }
}

export function addDays(date: string, days: number): string {
  return toIso(toUtcMs(date) + days * DAY_MS)
}

export function dayOfWeek(date: string): Dow {
  return new Date(toUtcMs(date)).getUTCDay() as Dow
}

/** Whole days from a to b (b minus a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS)
}

/**
 * The seven dates of a payroll week, first column first. Per spec/05 §4 the
 * first column is weekEnding minus 6 days and the last is weekEnding; the
 * order is always derived, never a fixed Monday.
 */
export function weekDates(
  weekEnding: string,
): [string, string, string, string, string, string, string] {
  return [
    addDays(weekEnding, -6),
    addDays(weekEnding, -5),
    addDays(weekEnding, -4),
    addDays(weekEnding, -3),
    addDays(weekEnding, -2),
    addDays(weekEnding, -1),
    weekEnding,
  ]
}

/** The week ending on or after `date`: the week that contains `date`. */
export function weekEndingOf(date: string, weekEndsOn: Dow): string {
  return addDays(date, (weekEndsOn - dayOfWeek(date) + 7) % 7)
}

/**
 * The most recent week that has already ended before `today`. On the week's
 * last day itself the week is still running, so the previous one is returned.
 */
export function lastEndedWeekEnding(today: string, weekEndsOn: Dow): string {
  return addDays(weekEndingOf(today, weekEndsOn), -7)
}

/** Every week ending from `first` to `last`, both included, oldest first. */
export function weekEndingsBetween(first: string, last: string): string[] {
  const out: string[] = []
  for (let d = first; daysBetween(d, last) >= 0; d = addDays(d, 7)) out.push(d)
  return out
}
