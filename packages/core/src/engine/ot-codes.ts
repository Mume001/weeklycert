// The official NY overtime code legend (spec/01 §2.1). It is printed on the
// OVERTIME PAGE of every wage schedule and is not published separately.
//
// A classification usually carries several codes at once ("See (B, E2, O) on
// OVERTIME PAGE"). The engine applies them all and keeps the highest premium
// for each hour; it never assumes a rule that is not in the table.
import type { Dow } from '../dates.ts'
import { type Dec, dec, ZERO } from '../money.ts'

const SUNDAY: Dow = 0
const SATURDAY: Dow = 6

export interface DaySituation {
  dow: Dow
  /** Hours worked that day in this row (one worker, one classification). */
  hours: Dec
  /** The user marked the day as a holiday in the grid. */
  isHoliday: boolean
  /**
   * The multiplier the user confirmed for that holiday. The HOLIDAY PAGE legend
   * is not loaded (spec/13 A10), so a confirmed multiplier always wins over the
   * legend value of the code.
   */
  holidayMultiplier: Dec | null
  /** The worker's hours earlier in the week, across every classification. */
  weekHoursBefore: Dec
  /** The worker's straight-time hours earlier in the week (code B3 only). */
  weekStraightBefore: Dec
}

/** Hours [from, to) of that day are worth `multiplier` times the base rate. */
export interface Premium {
  from: Dec
  to: Dec
  multiplier: Dec
}

type Rule = (day: DaySituation) => Premium[]

const NONE: Premium[] = []

function span(from: Dec, to: Dec, multiplier: Dec | string): Premium[] {
  return to.gt(from) ? [{ from, to, multiplier: dec(multiplier) }] : NONE
}

/** Everything after `limit` hours of that day. */
function after(day: DaySituation, limit: string, multiplier: string): Premium[] {
  return span(dec(limit), day.hours, multiplier)
}

/** The first `limit` hours of that day. */
function first(day: DaySituation, limit: string, multiplier: Dec | string): Premium[] {
  const to = day.hours.lt(limit) ? day.hours : dec(limit)
  return span(ZERO, to, multiplier)
}

function wholeDay(day: DaySituation, multiplier: Dec | string): Premium[] {
  return span(ZERO, day.hours, multiplier)
}

function onDays(day: DaySituation, dows: readonly Dow[], multiplier: string): Premium[] {
  return dows.includes(day.dow) ? wholeDay(day, multiplier) : NONE
}

/**
 * The holiday part of a code. The day counts as a holiday only because the user
 * marked it; the multiplier is the one they confirmed, or else the legend value
 * of the code itself (spec/01 §2.1). Nothing is invented: an unmarked day never
 * carries a holiday premium, and `HOLIDAY_RULE_UNKNOWN` (spec/07 §3.1) tells
 * the user the legend is still missing.
 */
function onHoliday(day: DaySituation, legend: string): Premium[] {
  if (!day.isHoliday) return NONE
  return wholeDay(day, day.holidayMultiplier ?? dec(legend))
}

/** Hours past a weekly threshold, expressed as a position inside this day. */
function afterWeekly(day: DaySituation, limit: string, worked: Dec, multiplier: string): Premium[] {
  const remaining = dec(limit).minus(worked)
  const from = remaining.gt(ZERO) ? remaining : ZERO
  return span(from, day.hours, multiplier)
}

const isWeekday = (day: DaySituation) => day.dow !== SATURDAY && day.dow !== SUNDAY

/**
 * Every code the engine must support. `weekly` codes are resolved after the
 * daily ones, because code B3 counts only the hours that are still straight
 * time once every other code has been applied.
 */
export const OT_CODES: Record<string, { meaning: string; weekly?: true; rule: Rule }> = {
  AA: { meaning: '1.5x after 7.5 hours a day', rule: (d) => after(d, '7.5', '1.5') },
  A: { meaning: '1.5x after 7 hours a day', rule: (d) => after(d, '7', '1.5') },
  B: { meaning: '1.5x after 8 hours a day', rule: (d) => after(d, '8', '1.5') },
  B1: {
    meaning:
      '1.5x for the 9th and 10th hour on a weekday and the first 8 hours on Saturday, 2x above',
    rule: (d) => {
      if (isWeekday(d))
        return [...span(dec('8'), min(d.hours, '10'), '1.5'), ...after(d, '10', '2')]
      if (d.dow === SATURDAY) return [...first(d, '8', '1.5'), ...after(d, '8', '2')]
      return NONE
    },
  },
  B2: {
    meaning: '1.5x after 40 hours a week',
    weekly: true,
    rule: (d) => afterWeekly(d, '40', d.weekHoursBefore, '1.5'),
  },
  B3: {
    meaning: '1.5x after 40 straight-time hours a week',
    weekly: true,
    rule: (d) => afterWeekly(d, '40', d.weekStraightBefore, '1.5'),
  },
  C: { meaning: '2x after 7 hours a day', rule: (d) => after(d, '7', '2') },
  C1: { meaning: '2x after 7.5 hours a day', rule: (d) => after(d, '7.5', '2') },
  D: { meaning: '2x after 8 hours a day', rule: (d) => after(d, '8', '2') },
  D1: { meaning: '2x after 9 hours a day', rule: (d) => after(d, '9', '2') },
  E: { meaning: '1.5x on Saturday', rule: (d) => onDays(d, [SATURDAY], '1.5') },
  E1: {
    meaning: '1.5x for the first 4 hours on Saturday, 2x for the rest of Saturday',
    rule: (d) => (d.dow === SATURDAY ? [...first(d, '4', '1.5'), ...after(d, '4', '2')] : NONE),
  },
  E2: {
    meaning: 'Saturday may be a make-up day at the regular rate when a day was lost to weather',
    rule: () => NONE,
  },
  E3: {
    meaning:
      'as E2, but only from 1 November to 3 March and only when the worker had 16 to 32 hours that week',
    rule: () => NONE,
  },
  E4: {
    meaning: 'Sunday may be a make-up day at the regular rate when a day was lost to weather',
    rule: () => NONE,
  },
  E5: {
    meaning: '2x after 8 hours on Saturday',
    rule: (d) => (d.dow === SATURDAY ? after(d, '8', '2') : NONE),
  },
  F: { meaning: '1.5x on Saturday and Sunday', rule: (d) => onDays(d, [SATURDAY, SUNDAY], '1.5') },
  G: {
    meaning: '1.5x on Saturday and on a holiday',
    rule: (d) => [...onDays(d, [SATURDAY], '1.5'), ...onHoliday(d, '1.5')],
  },
  H: {
    meaning: '1.5x on Saturday, Sunday and a holiday',
    rule: (d) => [...onDays(d, [SATURDAY, SUNDAY], '1.5'), ...onHoliday(d, '1.5')],
  },
  I: { meaning: '1.5x on Sunday', rule: (d) => onDays(d, [SUNDAY], '1.5') },
  J: {
    meaning: '1.5x on Sunday and on a holiday',
    rule: (d) => [...onDays(d, [SUNDAY], '1.5'), ...onHoliday(d, '1.5')],
  },
  K: { meaning: '1.5x on a holiday', rule: (d) => onHoliday(d, '1.5') },
  L: { meaning: '2x on Saturday', rule: (d) => onDays(d, [SATURDAY], '2') },
  M: { meaning: '2x on Saturday and Sunday', rule: (d) => onDays(d, [SATURDAY, SUNDAY], '2') },
  N: {
    meaning: '2x on Saturday and on a holiday',
    rule: (d) => [...onDays(d, [SATURDAY], '2'), ...onHoliday(d, '2')],
  },
  O: {
    meaning: '2x on Saturday, Sunday and a holiday',
    rule: (d) => [...onDays(d, [SATURDAY, SUNDAY], '2'), ...onHoliday(d, '2')],
  },
  P: { meaning: '2x on Sunday', rule: (d) => onDays(d, [SUNDAY], '2') },
  Q: {
    meaning: '2x on Sunday and on a holiday',
    rule: (d) => [...onDays(d, [SUNDAY], '2'), ...onHoliday(d, '2')],
  },
  R: { meaning: '2x on a holiday', rule: (d) => onHoliday(d, '2') },
  S: { meaning: '2.5x on a holiday', rule: (d) => onHoliday(d, '2.5') },
  S1: {
    meaning: '2.5x for the first 8 hours on a Sunday or a holiday, 1.5x for the rest',
    rule: (d) => {
      if (d.dow !== SUNDAY && !d.isHoliday) return NONE
      const high = d.isHoliday ? (d.holidayMultiplier ?? dec('2.5')) : dec('2.5')
      return [...first(d, '8', high), ...after(d, '8', '1.5')]
    },
  },
  T: { meaning: '3x on a holiday', rule: (d) => onHoliday(d, '3') },
  U: { meaning: '4x on a holiday', rule: (d) => onHoliday(d, '4') },
  V: { meaning: 'supplements carry the same premium as the overtime hour', rule: () => NONE },
  W: { meaning: '1.5x on supplements for every overtime hour', rule: () => NONE },
  X: {
    // NEPROVJERENO (spec/13 A13): the wording of code X has to be copied from a
    // current wage schedule. Until then it carries no wage premium of its own.
    meaning: 'supplements are paid for paid holidays at the regular rate; extra premium if worked',
    rule: () => NONE,
  },
}

function min(value: Dec, limit: string): Dec {
  return value.lt(limit) ? value : dec(limit)
}

export function isKnownOtCode(code: string): boolean {
  return Object.hasOwn(OT_CODES, code)
}

export type SupplementPremium = 'none' | 'same_as_overtime' | 'one_and_a_half'

/** Codes V and W are the only two that put a supplement into the premium. */
export function supplementPremium(codes: readonly string[]): SupplementPremium {
  if (codes.includes('W')) return 'one_and_a_half'
  if (codes.includes('V')) return 'same_as_overtime'
  return 'none'
}

const WEEKEND_CODES = ['E', 'E1', 'E5', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'Q', 'S1']

/** Codes that turn a whole weekend day into premium time (spec/07 OT_NY_WEEKEND). */
export function weekendCodes(codes: readonly string[]): string[] {
  return codes.filter((code) => WEEKEND_CODES.includes(code))
}

/** Codes that allow a weekend make-up day at the regular rate (spec/07 OT_NY_MAKEUP_DAY). */
export function makeupCodes(codes: readonly string[]): string[] {
  return codes.filter((code) => code === 'E2' || code === 'E3' || code === 'E4')
}
