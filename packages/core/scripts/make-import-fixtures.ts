// Writes the 40 sample files of spec/06 §8 into src/import/__fixtures__/:
// five per source of 06 §1, in the ways real exports differ (encoding, BOM,
// delimiter, decimal comma, "Last, First", h:mm, XLSX).
//
// NEPROVJERENO (spec/13 A16): no real export is in izvori/ yet, so these are
// built from the columns 06 §1 names. When real ones arrive, they replace
// these. Deterministic: the same files on every run, no Math.random.
//
// Run: node packages/core/scripts/make-import-fixtures.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'
import { dec, hours, sum, money as toMoney } from '../src/money.ts'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/import/__fixtures__')
mkdirSync(out, { recursive: true })

/** An invented crew. Peña carries the accent the Windows-1252 files need. */
const CREW = [
  { number: '1021', first: 'Miguel', last: 'Alvarez' },
  { number: '1027', first: 'David', last: 'Chen' },
  { number: '1018', first: 'Anna', last: 'Rossi' },
  { number: '1050', first: 'José', last: 'Peña' },
]
const WEEK = ['09/07/2026', '09/08/2026', '09/09/2026', '09/10/2026', '09/11/2026']
const ISO = WEEK.map((d) => `${d.slice(6)}-${d.slice(0, 2)}-${d.slice(3, 5)}`)
const CODE = 'ELEC-IW'
const OFFICIAL = 'Electrician – Inside Wireman'

type Source =
  | 'quickbooks_time'
  | 'quickbooks_payroll'
  | 'adp'
  | 'gusto'
  | 'paychex'
  | 'excel'
  | 'busybusy'
  | 'clockshark'

interface Variant {
  n: number
  encoding: 'utf-8' | 'utf-8-bom' | 'windows-1252'
  delimiter: ',' | ';' | '\t'
  format: 'csv' | 'xlsx'
  names: 'lastFirst' | 'firstLast'
  /** Hours as 7.5, 7,5 or 7:30. */
  hours: 'decimal' | 'comma' | 'clock'
}

const VARIANTS: Variant[] = [
  { n: 1, encoding: 'utf-8', delimiter: ',', format: 'csv', names: 'firstLast', hours: 'decimal' },
  {
    n: 2,
    encoding: 'utf-8-bom',
    delimiter: ',',
    format: 'csv',
    names: 'lastFirst',
    hours: 'decimal',
  },
  {
    n: 3,
    encoding: 'windows-1252',
    delimiter: ',',
    format: 'csv',
    names: 'lastFirst',
    hours: 'decimal',
  },
  { n: 4, encoding: 'utf-8', delimiter: ';', format: 'csv', names: 'firstLast', hours: 'comma' },
  { n: 5, encoding: 'utf-8', delimiter: ',', format: 'xlsx', names: 'firstLast', hours: 'clock' },
]

const name = (w: (typeof CREW)[number], v: Variant) =>
  v.names === 'lastFirst' ? `${w.last}, ${w.first}` : `${w.first} ${w.last}`

/** Hours for worker i on day d: 8 most days, 7.5 on Friday, 9.25 for Chen on Wednesday. */
function hoursOf(i: number, d: number): number {
  if (i === 1 && d === 2) return 9.25
  return d === 4 ? 7.5 : 8
}

function hoursText(h: number, v: Variant): string {
  if (v.hours === 'clock') {
    const whole = Math.floor(h)
    return `${whole}:${String(Math.round((h - whole) * 60)).padStart(2, '0')}`
  }
  const text = hours(dec(String(h))).replace(/0$/, '')
  return v.hours === 'comma' ? text.replace('.', ',') : text
}

interface Sheet {
  kind: 'hours' | 'payroll'
  headers: string[]
  rows: (string | Date)[][]
  expected: { rows: number; hours?: string; gross?: string }
  codeMap?: Record<string, string>
}

/** One column set per source, from 06 §1. */
function sheetFor(source: Source, v: Variant): Sheet {
  const hoursRows = (row: (w: (typeof CREW)[number], i: number, d: number) => (string | Date)[]) =>
    CREW.flatMap((w, i) => WEEK.map((_, d) => row(w, i, d)))
  const date = (d: number): string | Date =>
    v.format === 'xlsx'
      ? new Date(`${ISO[d]}T00:00:00Z`)
      : v.delimiter === ';'
        ? (ISO[d] ?? '')
        : (WEEK[d] ?? '')
  const totalHours = sum(CREW.flatMap((_, i) => WEEK.map((__, d) => dec(String(hoursOf(i, d))))))
  const hoursExpected = { rows: CREW.length * WEEK.length, hours: hours(totalHours) }
  const gross = ['1540.00', '1612.40', '1498.75', '1320.10']
  const grossExpected = {
    rows: CREW.length,
    gross: toMoney(sum(gross.map((g) => dec(g)))),
  }
  const money = (s: string) =>
    v.delimiter === ';' ? s : `$${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  switch (source) {
    case 'quickbooks_time':
      return {
        kind: 'hours',
        headers: ['Employee', 'Date', 'Job/Customer', 'Service item', 'Hours', 'Notes'],
        rows: hoursRows((w, i, d) => [
          name(w, v),
          date(d),
          'Dutchess County Courthouse',
          OFFICIAL,
          hoursText(hoursOf(i, d), v),
          '',
        ]),
        expected: hoursExpected,
      }
    case 'paychex':
      return {
        kind: 'hours',
        headers: ['Employee ID', 'Employee Name', 'Date', 'Hours', 'Job Code'],
        rows: hoursRows((w, i, d) => [
          w.number,
          name(w, v),
          date(d),
          hoursText(hoursOf(i, d), v),
          CODE,
        ]),
        expected: hoursExpected,
        codeMap: { [CODE]: 'pc-elec' },
      }
    case 'excel':
      return {
        kind: 'hours',
        headers: ['Name', 'Date', 'Hours', 'Classification'],
        rows: hoursRows((w, i, d) => [name(w, v), date(d), hoursText(hoursOf(i, d), v), OFFICIAL]),
        expected: hoursExpected,
      }
    case 'busybusy':
      return {
        kind: 'hours',
        headers: ['Employee', 'Date', 'Cost Code', 'Hours'],
        rows: hoursRows((w, i, d) => [name(w, v), date(d), CODE, hoursText(hoursOf(i, d), v)]),
        expected: hoursExpected,
        codeMap: { [CODE]: 'pc-elec' },
      }
    case 'clockshark':
      return {
        kind: 'hours',
        headers: ['Employee', 'Date', 'Job', 'Task', 'Hours'],
        rows: hoursRows((w, i, d) => [
          name(w, v),
          date(d),
          CODE,
          'Rough-in',
          hoursText(hoursOf(i, d), v),
        ]),
        expected: hoursExpected,
        codeMap: { [CODE]: 'pc-elec' },
      }
    case 'quickbooks_payroll':
      return {
        kind: 'payroll',
        headers: [
          'Employee',
          'Gross Pay',
          'Federal Income Tax',
          'Social Security',
          'Medicare',
          'NY State Tax',
          'Net Pay',
        ],
        rows: CREW.map((w, i) => [
          name(w, v),
          money(gross[i] ?? '0'),
          money('150.00'),
          money('95.48'),
          money('22.33'),
          money('61.20'),
          money('900.00'),
        ]),
        expected: grossExpected,
      }
    case 'adp':
      return {
        kind: 'payroll',
        headers: [
          'Associate ID',
          'Name',
          'Gross Pay',
          'Federal',
          'FICA',
          'Medicare',
          'NY SDI',
          'Net Pay',
        ],
        rows: CREW.map((w, i) => [
          w.number,
          name(w, v),
          money(gross[i] ?? '0'),
          money('150.00'),
          money('95.48'),
          money('22.33'),
          money('0.60'),
          money('900.00'),
        ]),
        expected: grossExpected,
      }
    case 'gusto':
      return {
        kind: 'payroll',
        headers: [
          'Employee Name',
          'Gross Earnings',
          'Federal Income Tax',
          'Social Security',
          'Medicare',
          'NY PFL',
          'Net Pay',
        ],
        rows: CREW.map((w, i) => [
          name(w, v),
          money(gross[i] ?? '0'),
          money('150.00'),
          money('95.48'),
          money('22.33'),
          money('5.90'),
          money('900.00'),
        ]),
        expected: grossExpected,
      }
  }
}

function encode(text: string, encoding: Variant['encoding']): Uint8Array {
  if (encoding === 'windows-1252') {
    // Only the characters the crew needs; everything else is ASCII.
    const map: Record<string, number> = { é: 0xe9, ñ: 0xf1, '–': 0x96 }
    return new Uint8Array([...text].map((c) => map[c] ?? c.charCodeAt(0)))
  }
  const body = new TextEncoder().encode(text)
  return encoding === 'utf-8-bom' ? new Uint8Array([0xef, 0xbb, 0xbf, ...body]) : body
}

function csvCell(cell: string, delimiter: string): string {
  return /["\n]/.test(cell) || cell.includes(delimiter) ? `"${cell.replace(/"/g, '""')}"` : cell
}

const SOURCES: Source[] = [
  'quickbooks_time',
  'quickbooks_payroll',
  'adp',
  'gusto',
  'paychex',
  'excel',
  'busybusy',
  'clockshark',
]
const manifest: unknown[] = []

for (const source of SOURCES) {
  for (const v of VARIANTS) {
    const sheet = sheetFor(source, v)
    const file = `${source}-${v.n}.${v.format}`
    if (v.format === 'xlsx') {
      const book = new ExcelJS.Workbook()
      book.created = new Date('2026-09-14T00:00:00Z')
      book.modified = book.created
      const ws = book.addWorksheet('Export')
      ws.addRow(sheet.headers)
      for (const row of sheet.rows) ws.addRow(row)
      writeFileSync(resolve(out, file), new Uint8Array(await book.xlsx.writeBuffer()))
    } else {
      const lines = [sheet.headers, ...sheet.rows].map((r) =>
        r.map((c) => csvCell(String(c), v.delimiter)).join(v.delimiter),
      )
      writeFileSync(resolve(out, file), encode(`${lines.join('\r\n')}\r\n`, v.encoding))
    }
    manifest.push({
      file,
      source,
      kind: sheet.kind,
      variant: v,
      expected: sheet.expected,
      codeMap: sheet.codeMap ?? {},
    })
  }
}

writeFileSync(
  resolve(out, 'manifest.json'),
  `${JSON.stringify({ crew: CREW, week: ISO, official: OFFICIAL, files: manifest }, null, 2)}\n`,
)
console.log(`${manifest.length} files in ${out}`)
