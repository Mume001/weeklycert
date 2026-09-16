// The mock's "today". Fixed, so the demo never ages and screenshots match
// between runs (spec/19 §1 point 3 and §4). Override with MOCK_TODAY.
import { isIsoDate } from '@wc/core'

export const DEFAULT_MOCK_TODAY = '2026-09-15'

export function mockToday(): string {
  const value = process.env.MOCK_TODAY || DEFAULT_MOCK_TODAY
  if (!isIsoDate(value))
    throw new Error(`MOCK_TODAY must be a date like 2026-09-15, got "${value}"`)
  return value
}

/**
 * The moment the mock "saves" something. Fixed like the date, so the autosave
 * indicator reads the same in every screenshot and every test run (spec/19 §4).
 * In step 4 this becomes the server clock.
 */
export function mockNow(): string {
  return `${mockToday()}T12:41:00.000Z`
}
