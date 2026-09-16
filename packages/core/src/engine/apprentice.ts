// Apprentices (spec/01 §2.4).
//
// An apprentice is paid a percentage of the journeyworker rate, but only while
// registered in a bona fide programme and only within the ratio the programme
// allows. Everything else is the full journeyworker rate, and that is a finding.
import { type Dec, dec, ZERO } from '../money.ts'
import type { ApprenticeRecordInput } from './types.ts'

/** The rate an apprentice is due: percentage of the journeyworker rate. */
export function apprenticeRate(journeyRate: Dec, pctOfJourney: string): Dec {
  return journeyRate.times(dec(pctOfJourney)).div(100)
}

/** A registration covers a work date only inside its own validity. */
export function recordCovers(record: ApprenticeRecordInput, date: string): boolean {
  return record.validFrom <= date && (record.validTo === null || record.validTo >= date)
}

export interface Ratio {
  apprentices: number
  journeyworkers: number
}

/** "1:1", "1:3": apprentices per journeyworker, as written in the programme. */
export function parseRatio(text: string): Ratio | null {
  const match = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(text)
  if (!match?.[1] || !match[2]) return null
  const apprentices = Number(match[1])
  const journeyworkers = Number(match[2])
  if (journeyworkers === 0) return null
  return { apprentices, journeyworkers }
}

/**
 * How many apprentices the ratio allows next to this many journeyworkers.
 * A ratio of 1:3 with 3 journeyworkers allows one apprentice; the fourth
 * apprentice on a crew of three owes the full journeyworker rate.
 */
export function allowedApprentices(ratio: Ratio, journeyworkers: number): Dec {
  if (journeyworkers === 0) return ZERO
  return dec(String(journeyworkers)).times(ratio.apprentices).div(ratio.journeyworkers)
}

export function ratioExceeded(ratio: Ratio, apprentices: number, journeyworkers: number): boolean {
  return dec(String(apprentices)).gt(allowedApprentices(ratio, journeyworkers))
}
