// "Paste a table from the wage schedule" (spec/03 §4.3 step 3): text copied
// from a schedule, turned into suggested classification rows the user then
// confirms. Nothing here saves; it only reads.
//
// NEPROVJERENO (spec/13 A15): the layout of text copied from a real NY wage
// schedule is not known until one is in izvori/. The assumption: one
// classification per line, columns split by a tab or by two or more spaces,
// in the order name, base rate, supplement, then the OT codes if listed.
import { isKnownOtCode } from './engine/ot-codes.ts'

export type PastedRowIssue = 'notOfficial' | 'noRate' | 'noOtCodes'

export interface PastedRow {
  /** 1-based line of the paste, so the screen can point at it. */
  line: number
  /** The name as it was pasted. */
  text: string
  /** The official label it matched, spelled exactly as the NY list (spec/13 A5); null if none. */
  label: string | null
  baseRate: string | null
  supplement: string | null
  otCodes: string[]
  /** The first reason the row cannot be added, or null when it is ready. */
  issue: PastedRowIssue | null
}

const MONEY = /^\$?\s*(\d{1,3}(,\d{3})+|\d+)(\.\d{1,4})?$/

function money(cell: string): string | null {
  const trimmed = cell.trim()
  return MONEY.test(trimmed) ? trimmed.replace(/[$,\s]/g, '') : null
}

/**
 * A name compared the way a paste changes it: case, runs of spaces, and the
 * official separator " – " (U+2013) turned into a hyphen or an em dash.
 */
function comparable(name: string): string {
  return name
    .replace(/\s+[-–—]\s+/g, ' – ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function parseScheduleText(text: string, officialLabels: readonly string[]): PastedRow[] {
  const official = new Map(officialLabels.map((l) => [comparable(l), l]))
  return text.split(/\r?\n/).flatMap((raw, index): PastedRow[] => {
    if (raw.trim() === '') return []
    const cells = raw
      .split(/\t| {2,}/)
      .map((c) => c.trim())
      .filter(Boolean)
    const [name = '', base = '', supplement = '', ...rest] = cells
    const baseRate = money(base)
    const supplementRate = money(supplement)
    const otCodes = rest
      .join(' ')
      .split(/[\s,]+/)
      .map((c) => c.toUpperCase())
      .filter((c) => c !== '' && isKnownOtCode(c))
    const label = official.get(comparable(name)) ?? null
    const issue: PastedRowIssue | null =
      label === null
        ? 'notOfficial'
        : baseRate === null || supplementRate === null
          ? 'noRate'
          : otCodes.length === 0
            ? 'noOtCodes'
            : null
    return [
      {
        line: index + 1,
        text: name,
        label,
        baseRate,
        supplement: supplementRate,
        otCodes,
        issue,
      },
    ]
  })
}
