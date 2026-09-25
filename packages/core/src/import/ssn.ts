// Columns that hold full Social Security numbers (spec/06 §4, 11 §5). They are
// never mapped as they are: the only thing kept is the last four digits, and
// the original file is not stored.

const DASHED = /^\d{3}-\d{2}-\d{4}$/
const NINE = /^\d{9}$/
const NAMED = /ssn|social/i

/**
 * The indexes of columns that look like full SSNs: dashed ###-##-#### anywhere,
 * or nine digits in a column named like an SSN. One such cell is enough.
 */
export function fullSsnColumns(headers: readonly string[], rows: readonly string[][]): number[] {
  return headers.flatMap((header, col) => {
    const cells = rows.map((r) => (r[col] ?? '').trim()).filter(Boolean)
    const dashed = cells.some((c) => DASHED.test(c))
    const nine = NAMED.test(header) && cells.some((c) => NINE.test(c))
    return dashed || nine ? [col] : []
  })
}

/** The last four digits of whatever is in the cell; the rest is dropped here. */
export function lastFour(cell: string): string {
  return cell.replace(/\D/g, '').slice(-4)
}
