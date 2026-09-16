// Money, rates and hours. numeric in the database, decimal.js in code, decimal
// STRINGS at every boundary (spec/04 §1 point 4, spec/19 §3). Never a JS number
// for money: one 0.1 + 0.2 in a payroll is a lawsuit.
import Decimal from 'decimal.js'

/**
 * Our own Decimal constructor, so configuration cannot leak in from, or out to,
 * another package. Rounding is half-up and never bankers (spec/05 §3.6); the
 * exponent limits keep toString() out of exponential notation for every amount
 * this product can produce.
 */
const D = Decimal.clone({
  precision: 34,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -12,
  toExpPos: 24,
})

export type Dec = Decimal

const DECIMAL = /^-?\d+(\.\d+)?$/

/** Parse a decimal string. Anything else throws: the caller validated too late. */
export function dec(value: string | Dec): Dec {
  if (typeof value === 'string' && !DECIMAL.test(value)) {
    throw new Error(`Not a decimal string: "${value}"`)
  }
  return new D(value)
}

export const ZERO = dec('0')
export const ONE = dec('1')

export function sum(values: readonly Dec[]): Dec {
  return values.reduce((total, value) => total.plus(value), ZERO)
}

export function maxDec(a: Dec, b: Dec): Dec {
  return a.gte(b) ? a : b
}

export function minDec(a: Dec, b: Dec): Dec {
  return a.lte(b) ? a : b
}

/** Never below zero: a shortfall of -4.00 is not a surplus, it is no shortfall. */
export function clampAtZero(value: Dec): Dec {
  return maxDec(value, ZERO)
}

/**
 * Fixed decimal places, padded, half-up. Written by hand because `toFixed` is a
 * CI gate outside `apps/web/lib/format.ts` (spec/19 §2).
 */
function fixed(value: Dec | string, places: number): string {
  const rounded = dec(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP)
  const text = rounded.isZero() ? '0' : rounded.toString()
  const [whole = '0', fraction = ''] = text.split('.')
  return places === 0 ? whole : `${whole}.${fraction.padEnd(places, '0')}`
}

/** Money: numeric(12,2) in the database. */
export function money(value: Dec | string): string {
  return fixed(value, 2)
}

/** Rates: numeric(10,4). Four places, because an hourly credit is divided. */
export function rate(value: Dec | string): string {
  return fixed(value, 4)
}

/** Hours: numeric(6,2). */
export function hours(value: Dec | string): string {
  return fixed(value, 2)
}

/** Equal within a cent: the tolerance spec/07 §3.4 uses for net and gross. */
export function equalWithinCent(a: Dec, b: Dec): boolean {
  return a.minus(b).abs().lte(dec('0.01'))
}
