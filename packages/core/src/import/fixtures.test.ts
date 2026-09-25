// The 40 sample files of spec/06 §8, end to end: read, mapped from their own
// column names, checked, and the totals match what the generator put in.
// NEPROVJERENO (spec/13 A16): invented from the columns of 06 §1 until real
// exports are in izvori/. Regenerate: node packages/core/scripts/make-import-fixtures.ts
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { dec, hours, money, sum } from '../money.ts'
import { type CheckContext, checkRows, type HoursValue, type PayrollValue } from './check.ts'
import { readUpload } from './file.ts'
import { type ImportKind, missingTargets, suggestMapping } from './mapping.ts'
import { detectDateFormat } from './values.ts'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '__fixtures__')
const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as {
  crew: { number: string; first: string; last: string }[]
  week: string[]
  official: string
  files: {
    file: string
    source: string
    kind: ImportKind
    expected: { rows: number; hours?: string; gross?: string }
    codeMap: Record<string, string>
  }[]
}

describe('06 §8: forty sample files, five per source', () => {
  it('has forty, five for each of the eight sources of 06 §1', () => {
    expect(manifest.files).toHaveLength(40)
    const per = new Map<string, number>()
    for (const f of manifest.files) per.set(f.source, (per.get(f.source) ?? 0) + 1)
    expect([...per.values()]).toEqual([5, 5, 5, 5, 5, 5, 5, 5])
  })

  it.each(manifest.files.map((f) => [f.file, f] as const))(
    '%s imports without an error',
    async (_, f) => {
      const read = await readUpload(new Uint8Array(readFileSync(resolve(dir, f.file))))
      if (!read.ok) throw new Error(read.reason)
      const { headers, rows } = read.table
      const { mapping } = suggestMapping(headers, f.kind)
      expect(missingTargets(f.kind, mapping)).toEqual([])

      const dateCol = mapping.date
      const ctx: CheckContext = {
        kind: f.kind,
        mapping,
        dateFormat: detectDateFormat(
          dateCol === undefined ? [] : rows.slice(0, 20).map((r) => r[dateCol] ?? ''),
        ),
        workers: manifest.crew.map((w, i) => ({
          id: `w${i}`,
          firstName: w.first,
          lastName: w.last,
          workerNumber: w.number,
          status: 'active',
          defaultClassificationId: null,
        })),
        classifications: [
          { id: 'pc-elec', classificationId: 'cat-elec', labels: [manifest.official] },
        ],
        weekDates: ['2026-09-06', ...manifest.week, '2026-09-12'],
        codeMap: f.codeMap,
      }
      const { rows: checked, counts } = checkRows(ctx, rows)
      expect(counts).toMatchObject({ total: f.expected.rows, error: 0 })
      const values = checked.flatMap((r) => (r.value ? [r.value] : []))
      if (f.kind === 'hours') {
        expect(hours(sum(values.map((v) => dec((v as HoursValue).hours))))).toBe(f.expected.hours)
      } else {
        expect(money(sum(values.map((v) => dec((v as PayrollValue).grossAllWork))))).toBe(
          f.expected.gross,
        )
        // Every deduction column was recognised: four per worker.
        expect(values.every((v) => (v as PayrollValue).deductions.length === 4)).toBe(true)
      }
    },
  )
})
