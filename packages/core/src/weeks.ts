// Which payroll weeks are still open (spec/03 §3, state table).
import { type Dow, lastEndedWeekEnding, weekEndingOf, weekEndingsBetween } from './dates.ts'

/** period_status, spec/04 §4. */
export const PERIOD_STATUSES = [
  'open',
  'in_review',
  'generated',
  'signed',
  'submitted',
  'corrected',
] as const
export type PeriodStatus = (typeof PERIOD_STATUSES)[number]

/**
 * Open means hours may still be entered (spec/03 §3, from 04 §7.1).
 * `corrected` is closed: the work moved to the correcting period, which is
 * counted on its own. `submitted` is closed whatever the portal outcome.
 */
const OPEN: ReadonlySet<PeriodStatus> = new Set(['open', 'in_review', 'generated'])

export function isOpenPeriodStatus(status: PeriodStatus): boolean {
  return OPEN.has(status)
}

/** A week with no period row at all is open; so is one with any open row. */
export function isWeekOpen(statuses: readonly PeriodStatus[]): boolean {
  return statuses.length === 0 || statuses.some(isOpenPeriodStatus)
}

export interface ProjectWeeksInput {
  startDate: string
  /** Last day of work, for completed projects. */
  endDate?: string | null
  weekEndsOn: Dow
  today: string
  periods: readonly { weekEnding: string; status: PeriodStatus }[]
}

/**
 * Week endings on the project timeline: from the week of the start date to
 * the last week that has ended before today (or the week of endDate).
 */
export function timelineWeekEndings(p: Omit<ProjectWeeksInput, 'periods'>): string[] {
  const first = weekEndingOf(p.startDate, p.weekEndsOn)
  const lastEnded = lastEndedWeekEnding(p.today, p.weekEndsOn)
  const end = p.endDate ? weekEndingOf(p.endDate, p.weekEndsOn) : lastEnded
  const last = end < lastEnded ? end : lastEnded
  return weekEndingsBetween(first, last)
}

/** Open week endings for one project, oldest first. */
export function openWeekEndings(p: ProjectWeeksInput): string[] {
  const byWeek = new Map<string, PeriodStatus[]>()
  for (const row of p.periods) {
    byWeek.set(row.weekEnding, [...(byWeek.get(row.weekEnding) ?? []), row.status])
  }
  return timelineWeekEndings(p).filter((we) => isWeekOpen(byWeek.get(we) ?? []))
}
