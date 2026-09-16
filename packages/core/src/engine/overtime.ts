// Splitting a week into straight time and overtime.
//
// Two rules run over the same hours (spec/01 §2.1): the NY overtime codes of
// the classification, and the federal threshold of 40 hours a week. Both are
// applied and the one that pays the worker more is the one that counts.
import type { Dow } from '../dates.ts'
import { type Dec, dec, maxDec, ONE, sum, ZERO } from '../money.ts'
import { type DaySituation, OT_CODES, type Premium } from './ot-codes.ts'

/** One cell of the grid: one worker, one classification, one day. */
export interface Cell {
  rowKey: string
  date: string
  dow: Dow
  hours: Dec
  isHoliday: boolean
  holidayMultiplier: Dec | null
  /** Set when the user typed the split ("8/1"); the engine then honours it. */
  manualSt: Dec | null
  manualOt: Dec | null
  otCodes: readonly string[]
  /** Straight-time rate paid to this worker in this classification. */
  rate: Dec
}

export interface Segment {
  from: Dec
  to: Dec
  multiplier: Dec
}

export interface CellSplit {
  st: Dec
  ot: Dec
  /** Σ hours × multiplier over the overtime part, so 2 hours at 1.5x is 3. */
  otMultiplierHours: Dec
  manual: boolean
  /** What the NY codes say, whatever the user typed. Drives OT_NY_CODE. */
  codeSt: Dec
  codeOt: Dec
  /** The highest multiplier any code gives that day, 1 when none does. */
  topMultiplier: Dec
}

const FEDERAL_THRESHOLD = '40'
/** 29 CFR 5.5: an hour the employer calls overtime is worth at least 1.5x. */
const FEDERAL_MINIMUM_PREMIUM = '1.5'

/**
 * The effective multiplier of every part of one day: all premiums laid over
 * each other, highest wins, neighbours with the same multiplier joined.
 */
export function mergePremiums(premiums: readonly Premium[], dayHours: Dec): Segment[] {
  if (dayHours.lte(ZERO)) return []
  const edges = [ZERO, dayHours]
  for (const premium of premiums) {
    for (const edge of [premium.from, premium.to]) {
      if (edge.gt(ZERO) && edge.lt(dayHours)) edges.push(edge)
    }
  }
  edges.sort((a, b) => a.comparedTo(b))

  const segments: Segment[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i]
    const to = edges[i + 1]
    if (!from || !to || to.lte(from)) continue
    const middle = from.plus(to).div(2)
    let multiplier = ONE
    for (const premium of premiums) {
      if (premium.from.lte(middle) && premium.to.gt(middle)) {
        multiplier = maxDec(multiplier, premium.multiplier)
      }
    }
    const previous = segments[segments.length - 1]
    if (previous?.multiplier.eq(multiplier)) previous.to = to
    else segments.push({ from, to, multiplier })
  }
  return segments
}

function situation(cell: Cell, hoursBefore: Dec, straightBefore: Dec): DaySituation {
  return {
    dow: cell.dow,
    hours: cell.hours,
    isHoliday: cell.isHoliday,
    holidayMultiplier: cell.holidayMultiplier,
    weekHoursBefore: hoursBefore,
    weekStraightBefore: straightBefore,
  }
}

function premiumsFor(cell: Cell, day: DaySituation, weekly: boolean): Premium[] {
  const out: Premium[] = []
  for (const code of cell.otCodes) {
    const entry = OT_CODES[code]
    if (!entry) continue
    if (Boolean(entry.weekly) !== weekly) continue
    // Code B3 counts the hours that are still straight time, so it runs in a
    // second pass over the result of the first one.
    if (weekly && code === 'B3') continue
    out.push(...entry.rule(day))
  }
  return out
}

function straightAndPremium(segments: readonly Segment[]): {
  st: Dec
  ot: Dec
  otMultiplierHours: Dec
  top: Dec
} {
  let st = ZERO
  let ot = ZERO
  let otMultiplierHours = ZERO
  let top = ONE
  for (const segment of segments) {
    const length = segment.to.minus(segment.from)
    if (segment.multiplier.lte(ONE)) {
      st = st.plus(length)
    } else {
      ot = ot.plus(length)
      otMultiplierHours = otMultiplierHours.plus(length.times(segment.multiplier))
      top = maxDec(top, segment.multiplier)
    }
  }
  return { st, ot, otMultiplierHours, top }
}

/**
 * The NY split, cell by cell in calendar order. Weekly codes need the hours
 * already worked that week, so the order matters and is the caller's.
 */
export function splitByCodes(cells: readonly Cell[]): CellSplit[] {
  let hoursBefore = ZERO
  let straightBefore = ZERO
  const perCell: { cell: Cell; segments: Segment[] }[] = []

  for (const cell of cells) {
    const day = situation(cell, hoursBefore, straightBefore)
    const segments = mergePremiums(
      [...premiumsFor(cell, day, false), ...premiumsFor(cell, day, true)],
      cell.hours,
    )
    const { st } = straightAndPremium(segments)
    perCell.push({ cell, segments })
    hoursBefore = hoursBefore.plus(cell.hours)
    straightBefore = straightBefore.plus(st)
  }

  // Second pass for code B3: 1.5x after 40 hours that are still straight time.
  let straightSoFar = ZERO
  const splits: CellSplit[] = []
  for (const { cell, segments } of perCell) {
    let merged = segments
    if (cell.otCodes.includes('B3')) {
      const day = situation(cell, ZERO, straightSoFar)
      const b3 = OT_CODES.B3?.rule(day) ?? []
      merged = mergePremiums([...premiumsToSpans(segments), ...b3], cell.hours)
    }
    const { st, ot, otMultiplierHours, top } = straightAndPremium(merged)
    straightSoFar = straightSoFar.plus(st)
    splits.push(manualOrCode(cell, { st, ot, otMultiplierHours, top }))
  }
  return splits
}

function premiumsToSpans(segments: readonly Segment[]): Premium[] {
  return segments
    .filter((segment) => segment.multiplier.gt(ONE))
    .map((segment) => ({ from: segment.from, to: segment.to, multiplier: segment.multiplier }))
}

/**
 * The user's own split wins when there is one: they may know about an approved
 * 4x10 or a special agreement the engine cannot see (spec/07 §5). The overtime
 * hours they typed are paid at the highest premium the codes give that day, and
 * never below the federal 1.5x.
 */
function manualOrCode(
  cell: Cell,
  code: { st: Dec; ot: Dec; otMultiplierHours: Dec; top: Dec },
): CellSplit {
  if (cell.manualSt === null && cell.manualOt === null) {
    return {
      st: code.st,
      ot: code.ot,
      otMultiplierHours: code.otMultiplierHours,
      manual: false,
      codeSt: code.st,
      codeOt: code.ot,
      topMultiplier: code.top,
    }
  }
  const st = cell.manualSt ?? ZERO
  const ot = cell.manualOt ?? ZERO
  const multiplier = maxDec(code.top, dec(FEDERAL_MINIMUM_PREMIUM))
  return {
    st,
    ot,
    otMultiplierHours: ot.times(multiplier),
    manual: true,
    codeSt: code.st,
    codeOt: code.ot,
    topMultiplier: code.top,
  }
}

/**
 * Federal overtime: every hour over 40 in the week, in calendar order
 * (29 CFR 5.5, CWHSSA). Returns the overtime hours of each cell.
 */
export function federalOvertime(cells: readonly Cell[]): Dec[] {
  const threshold = dec(FEDERAL_THRESHOLD)
  let worked = ZERO
  return cells.map((cell) => {
    const before = worked
    worked = worked.plus(cell.hours)
    const straightRoom = maxDec(threshold.minus(before), ZERO)
    return maxDec(cell.hours.minus(straightRoom), ZERO)
  })
}

/**
 * Regular rate for federal overtime: total straight-time earnings divided by
 * total hours (29 CFR 778.115). With one classification that is simply its
 * rate; with two it is the weighted average.
 */
export function regularRate(cells: readonly Cell[]): {
  value: Dec
  method: 'single' | 'weighted_average'
} {
  const totalHours = sum(cells.map((cell) => cell.hours))
  const earnings = sum(cells.map((cell) => cell.hours.times(cell.rate)))
  const rates = new Set(cells.map((cell) => cell.rate.toString()))
  const method = rates.size > 1 ? 'weighted_average' : 'single'
  if (totalHours.lte(ZERO)) {
    const first = cells[0]
    return { value: first ? first.rate : ZERO, method }
  }
  return { value: earnings.div(totalHours), method }
}

/** Straight-time earnings: every hour at its own classification rate. */
export function straightTimeEarnings(cells: readonly Cell[]): Dec {
  return sum(cells.map((cell) => cell.hours.times(cell.rate)))
}

/** What the NY codes cost: straight-time earnings plus every premium on top. */
export function nyWage(cells: readonly Cell[], splits: readonly CellSplit[]): Dec {
  return sum(
    cells.map((cell, index) => {
      const split = splits[index]
      if (!split) return ZERO
      return split.st.plus(split.otMultiplierHours).times(cell.rate)
    }),
  )
}

/**
 * What the federal rule costs: all hours at their own rate, plus half the
 * regular rate for every hour over 40 (the half-time method of 29 CFR 778.115,
 * which for one classification is the same as 1.5x the base rate).
 */
export function federalWage(cells: readonly Cell[], otHours: readonly Dec[]): Dec {
  const { value } = regularRate(cells)
  const overtime = sum(otHours.map((hours) => hours))
  return straightTimeEarnings(cells).plus(value.div(2).times(overtime))
}

export { FEDERAL_MINIMUM_PREMIUM, FEDERAL_THRESHOLD }
