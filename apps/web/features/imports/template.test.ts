// Our templates (spec/06 §6) go through our own import without a single
// error: built with the column names the customer will see (packages/copy),
// read back, mapped from their names alone, checked.
import { copy } from '@wc/copy'
import {
  type CheckContext,
  checkRows,
  type HoursValue,
  missingTargets,
  type PayrollValue,
  readUpload,
  suggestMapping,
  type TemplateInput,
  templateCsv,
  templateXlsx,
} from '@wc/core/import'
import { describe, expect, it } from 'vitest'

const WEEK = [
  '2026-09-06',
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
]
const WIREMAN = 'Electrician – Inside Wireman'
const LABORER = 'Laborer – Group 1'

const input = (kind: TemplateInput['kind']): TemplateInput => ({
  kind,
  headers: copy.imports.mapping.targets,
  workers: [
    { name: 'Alvarez, Miguel', classification: WIREMAN },
    { name: 'Peña, José', classification: null },
  ],
  classifications: [WIREMAN, LABORER],
  weekDates: WEEK,
})

const ctx = (kind: 'hours' | 'payroll', mapping: CheckContext['mapping']): CheckContext => ({
  kind,
  mapping,
  dateFormat: 'MM/DD/YYYY',
  workers: [
    {
      id: 'w1',
      firstName: 'Miguel',
      lastName: 'Alvarez',
      workerNumber: '1021',
      status: 'active',
      defaultClassificationId: null,
    },
    {
      id: 'w2',
      firstName: 'José',
      lastName: 'Peña',
      workerNumber: null,
      status: 'active',
      defaultClassificationId: null,
    },
  ],
  classifications: [
    { id: 'pc-elec', classificationId: 'cat-elec', labels: [WIREMAN] },
    { id: 'pc-lab', classificationId: 'cat-lab', labels: [LABORER] },
  ],
  weekDates: WEEK,
})

describe.each(['csv', 'xlsx'] as const)('the %s template (06 §6)', (format) => {
  const build = (kind: 'hours' | 'payroll') =>
    format === 'csv' ? Promise.resolve(templateCsv(input(kind))) : templateXlsx(input(kind))

  it('hours: every worker on every day of the week, and it imports without an error', async () => {
    const read = await readUpload(await build('hours'))
    if (!read.ok) throw new Error(read.reason)
    const { headers, rows } = read.table
    expect(rows).toHaveLength(14)
    const { mapping, confidence } = suggestMapping(headers, 'hours')
    expect(missingTargets('hours', mapping)).toEqual([])
    // Every column maps from its name, surely: nothing to do in step 2.
    expect(Object.values(confidence).every((c) => c === 'sure')).toBe(true)

    // Unfilled, it is only skipped rows; filled, only good ones.
    expect(checkRows(ctx('hours', mapping), rows).counts).toMatchObject({ error: 0, skipped: 14 })
    const hoursCol = mapping.hours ?? -1
    const filled = rows.map((r) => r.map((c, i) => (i === hoursCol ? '8' : c)))
    const { counts, rows: checked } = checkRows(ctx('hours', mapping), filled)
    expect(counts).toMatchObject({ total: 14, ok: 14, error: 0 })
    // Peña had no classification of his own, so his rows start on the first one.
    const pena = checked.filter((r) => (r.value as HoursValue).workerId === 'w2')
    expect(pena.every((r) => (r.value as HoursValue).projectClassificationId === 'pc-elec')).toBe(
      true,
    )
  })

  it('payroll: one row per worker, and it imports without an error once the gross is in', async () => {
    const read = await readUpload(await build('payroll'))
    if (!read.ok) throw new Error(read.reason)
    const { headers, rows } = read.table
    expect(rows).toHaveLength(2)
    const { mapping, confidence } = suggestMapping(headers, 'payroll')
    expect(missingTargets('payroll', mapping)).toEqual([])
    expect(Object.values(confidence).every((c) => c === 'sure')).toBe(true)
    expect(Object.keys(mapping)).toHaveLength(headers.length)

    const at = (t: keyof typeof mapping) => mapping[t] ?? -1
    const filled = rows.map((r) =>
      r.map((c, i) =>
        i === at('gross')
          ? '1540.00'
          : i === at('net')
            ? '1200.00'
            : i === at('deduction:medicare')
              ? '22.33'
              : c,
      ),
    )
    const { counts, rows: checked } = checkRows(ctx('payroll', mapping), filled)
    expect(counts).toMatchObject({ total: 2, ok: 2, error: 0 })
    expect((checked[0]?.value as PayrollValue | undefined)?.deductions).toEqual([
      { kind: 'medicare', amount: '22.33' },
    ])
  })
})
