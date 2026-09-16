// What a cell accepts (spec/19 §6). This table and nothing else:
//
//   ""        -> 0 hours, the engine sees an empty day
//   9         -> 9 hours, the engine splits ST and OT by the overtime codes
//   9.5 / 9,5 -> the same, a comma is accepted
//   8/1       -> 8 straight time and 1 overtime, typed by hand
//   9:30      -> 9.5 hours
//   anything else -> null: the cell keeps what was typed, marks itself invalid
//                    and shows the message from spec/15 §3
import type { Hours } from '@wc/data/dto'

export interface ParsedCell {
  /** Straight time, or the whole day when the engine still has to split it. */
  st: Hours
  ot: Hours
  /** The user typed the split themselves, so the engine keeps it (spec/07 §5). */
  manual: boolean
}

/** A day has 24 hours; more than that is a typing error, not an entry (spec/19 §6). */
export const MAX_HOURS_PER_CELL = 24

const NUMBER = /^\d{1,2}([.,]\d{1,2})?$/
const CLOCK = /^(\d{1,2}):([0-5]\d)$/
const SPLIT = /^(.+)\/(.+)$/

function hours(text: string): Hours | null {
  const value = text.trim()
  if (NUMBER.test(value)) return normalise(value.replace(',', '.'))
  const clock = CLOCK.exec(value)
  if (clock?.[1] && clock[2]) {
    const minutes = Number(clock[2]) / 60
    return normalise(String(Number(clock[1]) + minutes))
  }
  return null
}

/** Two decimals at most, no trailing zeros: numeric(6,2) in the database. */
function normalise(value: string): Hours | null {
  const [whole = '0', fraction = ''] = value.split('.')
  const cents = fraction.slice(0, 2).replace(/0+$/, '')
  const text = cents === '' ? whole : `${whole}.${cents}`
  return Number(text) > MAX_HOURS_PER_CELL ? null : text
}

export function parseCell(raw: string): ParsedCell | null {
  const text = raw.trim()
  if (text === '') return { st: '0', ot: '0', manual: false }

  const split = SPLIT.exec(text)
  if (split?.[1] !== undefined && split[2] !== undefined) {
    const st = hours(split[1])
    const ot = hours(split[2])
    if (st === null || ot === null) return null
    if (Number(st) + Number(ot) > MAX_HOURS_PER_CELL) return null
    return { st, ot, manual: true }
  }

  const total = hours(text)
  return total === null ? null : { st: total, ot: '0', manual: false }
}

/** What the cell shows when it is not being edited: the total the user typed. */
export function cellText(day: { st: Hours; ot: Hours; manual: boolean }): string {
  if (day.manual) return `${trim(day.st)}/${trim(day.ot)}`
  const total = Number(day.st) + Number(day.ot)
  return total === 0 ? '' : trim(String(total))
}

function trim(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value
}
