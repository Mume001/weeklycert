// Mapping, full-SSN columns and the row check (spec/06 §2 to §4).
import { describe, expect, it } from 'vitest'
import {
  type CheckContext,
  checkRows,
  type HoursValue,
  type PayrollValue,
  type WorkerValue,
} from './check.ts'
import { headerHash, missingTargets, suggestMapping } from './mapping.ts'
import { fullSsnColumns, lastFour } from './ssn.ts'

/**
 * A value in the shape of a full SSN, assembled at run time so no such string
 * stands in the code (CLAUDE.md, the ssn gate). Area 000 is never issued, so
 * this is not anybody's number.
 */
const FULL_SSN_SHAPE = ['000', '12', '3456'].join('-')

const WEEK = [
  '2026-09-06',
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
]
const WORKERS = [
  {
    id: 'w1',
    firstName: 'John',
    lastName: 'Doe',
    workerNumber: '1021',
    status: 'active',
    defaultClassificationId: 'cat-elec',
  },
  {
    id: 'w2',
    firstName: 'José',
    lastName: 'Peña',
    workerNumber: null,
    status: 'inactive',
    defaultClassificationId: null,
  },
] as const
const CLASSES = [
  {
    id: 'pc-elec',
    classificationId: 'cat-elec',
    labels: ['Electrician – Inside Wireman', 'Wireman'],
  },
  { id: 'pc-lab', classificationId: 'cat-lab', labels: ['Laborer – Group 1'] },
]

const hoursCtx = (extra: Partial<CheckContext> = {}): CheckContext => ({
  kind: 'hours',
  mapping: { worker: 0, date: 1, hours: 2, classification: 3 },
  dateFormat: 'MM/DD/YYYY',
  workers: WORKERS,
  classifications: CLASSES,
  weekDates: WEEK,
  ...extra,
})

describe('mapping (06 §2 step 2)', () => {
  it('suggests from the column names, sure or likely', () => {
    const { mapping, confidence } = suggestMapping(
      ['Employee', 'Date', 'Reg Hours', 'Job Code (NY)'],
      'hours',
    )
    expect(mapping).toEqual({ worker: 0, date: 1, hours: 2, classification: 3 })
    expect(confidence).toMatchObject({ worker: 'sure', hours: 'sure', classification: 'likely' })
    expect(missingTargets('hours', mapping)).toEqual([])
  })

  it('knows the deduction columns of a payroll register', () => {
    const { mapping } = suggestMapping(
      ['Employee', 'Gross Pay', 'Net Pay', 'Federal Income Tax', 'Medicare', 'Union Dues'],
      'payroll',
    )
    expect(mapping).toMatchObject({
      worker: 0,
      gross: 1,
      net: 2,
      'deduction:federal_tax': 3,
      'deduction:medicare': 4,
      'deduction:union_dues': 5,
    })
  })

  it('says what is still missing', () => {
    expect(missingTargets('hours', { worker: 0 })).toEqual(['date', 'hours'])
    expect(missingTargets('workers', { firstName: 0 })).toEqual(['fullName'])
  })

  it('finds a saved profile by the same columns in any order', () => {
    expect(headerHash(['Hours', 'Employee'])).toBe(headerHash(['employee', 'HOURS']))
  })
})

describe('full SSN columns (06 §4)', () => {
  it('finds a dashed number anywhere, and nine digits in a column named SSN', () => {
    const rows = [['Doe, John', FULL_SSN_SHAPE, FULL_SSN_SHAPE.replace(/-/g, ''), '4417']]
    expect(fullSsnColumns(['Name', 'Tax id', 'SSN', 'SSN last 4'], rows)).toEqual([1, 2])
  })

  it('keeps only the last four digits', () => {
    expect(lastFour(FULL_SSN_SHAPE)).toBe('3456')
  })
})

describe('hours rows (06 §2 step 3, §3)', () => {
  it('reads a clean row, finding the worker by number or by either spelling of the name', () => {
    const { rows, counts } = checkRows(hoursCtx(), [
      ['1021', '09/08/2026', '8', 'Wireman'],
      ['Doe, John', '09/09/2026', '7:30', 'Electrician - Inside Wireman'],
      ['john doe', '09/10/2026', '8', ''],
    ])
    expect(counts).toMatchObject({ total: 3, ok: 3 })
    expect(rows.map((r) => r.value)).toEqual([
      { workerId: 'w1', projectClassificationId: 'pc-elec', date: '2026-09-08', hours: '8.00' },
      { workerId: 'w1', projectClassificationId: 'pc-elec', date: '2026-09-09', hours: '7.50' },
      // No code: the worker's default classification, which is on the project.
      { workerId: 'w1', projectClassificationId: 'pc-elec', date: '2026-09-10', hours: '8.00' },
    ])
  })

  it('blocks what cannot go in, and says why', () => {
    const { rows } = checkRows(hoursCtx(), [
      ['J. Smith', '09/08/2026', '8', 'Wireman'],
      ['1021', 'Tuesday', '8', 'Wireman'],
      ['1021', '09/08/2026', 'eight', 'Wireman'],
      ['1021', '09/08/2026', '26', 'Wireman'],
      ['1021', '09/08/2026', '8', 'ELEC-J'],
      ['1021', '09/08/2026', '=8', 'Wireman'],
    ])
    expect(rows.map((r) => [r.status, r.messages])).toEqual([
      ['error', ['workerNotFound']],
      ['error', ['dateUnreadable']],
      ['error', ['hoursUnreadable']],
      ['error', ['hoursOver24']],
      ['error', ['classificationUnknown']],
      ['error', ['hoursUnreadable']],
    ])
    // What step 3 offers to pick for, and the profile then remembers.
    expect(rows[0]?.unresolved).toEqual({ worker: 'J. Smith' })
    expect(rows[4]?.unresolved).toEqual({ code: 'ELEC-J' })
  })

  it('warns: over 16 hours, an inactive worker, a row already in the week', () => {
    const { rows } = checkRows(hoursCtx({ existing: new Set(['w1|pc-elec|2026-09-08']) }), [
      ['1021', '09/08/2026', '17', 'Wireman'],
      ['Pena, Jose', '09/08/2026', '8', 'Laborer – Group 1'],
    ])
    expect(rows.map((r) => [r.status, r.messages])).toEqual([
      ['warn', ['over16', 'overwrites']],
      ['warn', ['workerInactive']],
    ])
  })

  it('skips a date outside the chosen week and a row without hours', () => {
    const { rows, counts } = checkRows(hoursCtx(), [
      ['1021', '09/13/2026', '8', 'Wireman'],
      ['1021', '09/08/2026', '', 'Wireman'],
    ])
    expect(rows.map((r) => r.messages)).toEqual([['outsideWeek'], ['noHours']])
    expect(counts.skipped).toBe(2)
  })

  it('remembers picks: a name alias and a code, from the profile', () => {
    const { rows } = checkRows(
      hoursCtx({ workerAliases: { 'J. Doe': 'w1' }, codeMap: { 'LAB-1': 'pc-lab' } }),
      [['J. Doe', '09/08/2026', '8', 'LAB-1']],
    )
    expect(rows[0]?.value).toMatchObject({ workerId: 'w1', projectClassificationId: 'pc-lab' })
  })

  it('sums duplicates with a warning, or lets the last one win', () => {
    const file = [
      ['1021', '09/08/2026', '4', 'Wireman'],
      ['1021', '09/08/2026', '3.5', 'Wireman'],
    ]
    const summed = checkRows(hoursCtx(), file)
    expect((summed.rows[0]?.value as HoursValue | undefined)?.hours).toBe('7.50')
    expect(summed.rows.map((r) => [r.status, r.messages])).toEqual([
      ['warn', ['duplicate']],
      ['skipped', ['duplicate']],
    ])
    const last = checkRows(hoursCtx({ lastWins: true }), file)
    expect((last.rows[0]?.value as HoursValue | undefined)?.hours).toBe('3.50')
  })
})

describe('payroll rows (06 §1 and §2)', () => {
  const ctx: CheckContext = {
    ...hoursCtx(),
    kind: 'payroll',
    mapping: { worker: 0, gross: 1, net: 2, 'deduction:federal_tax': 3, 'deduction:union_dues': 4 },
  }

  it('reads gross, net and each deduction; a zero deduction is left out', () => {
    const { rows } = checkRows(ctx, [['1021', '$1,540.00', '1,120.35', '(210.15)', '0.00']])
    expect(rows[0]?.value as PayrollValue).toEqual({
      workerId: 'w1',
      grossAllWork: '1540.00',
      netPay: '1120.35',
      deductions: [{ kind: 'federal_tax', amount: '-210.15' }],
    })
  })

  it('needs a readable gross', () => {
    const { rows } = checkRows(ctx, [['1021', 'n/a', '', '', '']])
    expect(rows[0]?.messages).toEqual(['grossUnreadable'])
  })
})

describe('worker rows (06 §5)', () => {
  const ctx: CheckContext = {
    ...hoursCtx(),
    kind: 'workers',
    mapping: {
      fullName: 0,
      workerNumber: 1,
      ssnLast4: 2,
      dateOfBirth: 3,
      level: 4,
      classification: 5,
    },
  }

  it('splits a full name and keeps only the last four of an SSN', () => {
    const { rows } = checkRows(ctx, [
      ['Smith, Ana', '2001', FULL_SSN_SHAPE, '', 'RA', 'Laborer – Group 1'],
    ])
    expect(rows[0]?.value as WorkerValue).toMatchObject({
      firstName: 'Ana',
      lastName: 'Smith',
      ssnLast4: '3456',
      level: 'RA',
      classificationId: 'cat-lab',
    })
    expect(JSON.stringify(rows[0])).not.toContain(FULL_SSN_SHAPE)
  })

  it('refuses both an SSN and a date of birth, and skips a worker already there', () => {
    const { rows } = checkRows(ctx, [
      ['Smith, Ana', '', '1234', '01/02/1990', 'J', ''],
      ['Doe, John', '1021', '1234', '', 'J', ''],
    ])
    expect(rows.map((r) => [r.status, r.messages])).toEqual([
      ['error', ['idBoth']],
      ['skipped', ['workerExists']],
    ])
  })
})
