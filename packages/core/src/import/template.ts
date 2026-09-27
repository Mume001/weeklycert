// Our own templates (spec/06 §6): for a company without an export, a file for
// one week of one project with its workers, classifications and dates already
// in. The customer fills in the numbers and uploads it; its columns map at
// once, so there is no mapping to do. CSV, or XLSX with drop-down lists.
//
// The column names are text the customer reads, so they come in from the
// caller (packages/copy, spec/15); core only lays the file out.
import ExcelJS from 'exceljs'
import type { DeductionKind } from './mapping.ts'

export type TemplateKind = 'hours' | 'payroll'

/** The deductions a payroll template offers a column for; the rest can be added by hand. */
export const TEMPLATE_DEDUCTIONS: readonly DeductionKind[] = [
  'federal_tax',
  'state_tax',
  'fica',
  'medicare',
  'sdi',
  'pfl',
  'union_dues',
  'other',
]

export interface TemplateInput {
  kind: TemplateKind
  /** Column names by field: worker, date, classification, hours, note, gross, net, payDate, deduction:<kind>. */
  headers: Readonly<Record<string, string>>
  /** "Last, First", with the classification the row starts with. */
  workers: readonly { name: string; classification: string | null }[]
  /** The project's classifications for the week, official names. */
  classifications: readonly string[]
  /** The seven dates of the week, ISO. */
  weekDates: readonly string[]
}

const US = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`

/** The fields in the order the file has them. */
export function templateFields(kind: TemplateKind): string[] {
  return kind === 'hours'
    ? ['worker', 'date', 'classification', 'hours', 'note']
    : // The pay date too: it sets the WH-347 deadline of the week (spec/01 §2.9).
      ['worker', 'gross', 'net', 'payDate', ...TEMPLATE_DEDUCTIONS.map((k) => `deduction:${k}`)]
}

function table(input: TemplateInput): { headers: string[]; rows: string[][] } {
  const fields = templateFields(input.kind)
  const headers = fields.map((f) => input.headers[f] ?? f)
  const rows =
    input.kind === 'hours'
      ? input.workers.flatMap((w) =>
          input.weekDates.map((d) => [
            w.name,
            US(d),
            w.classification ?? input.classifications[0] ?? '',
            '',
            '',
          ]),
        )
      : input.workers.map((w) => [w.name, ...fields.slice(1).map(() => '')])
  return { headers, rows }
}

const cell = (c: string) => (/[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)

export function templateCsv(input: TemplateInput): Uint8Array {
  const { headers, rows } = table(input)
  const text = [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  return new TextEncoder().encode(`${text}\r\n`)
}

/**
 * The XLSX: the week on the first sheet, and the lists behind its drop-downs
 * (workers, classifications) on a hidden second one, so the first sheet is the
 * one our import reads (06 §2).
 */
export async function templateXlsx(input: TemplateInput): Promise<Uint8Array> {
  const { headers, rows } = table(input)
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet(input.kind === 'hours' ? 'Hours' : 'Payroll')
  const lists = book.addWorksheet('Lists', { state: 'hidden' })
  input.workers.forEach((w, i) => {
    lists.getCell(i + 1, 1).value = w.name
  })
  input.classifications.forEach((c, i) => {
    lists.getCell(i + 1, 2).value = c
  })
  sheet.addRow(headers)
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) sheet.addRow(row)
  headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = Math.max(12, h.length + 2)
  })
  const last = rows.length + 1
  const list = (col: 'A' | 'B', n: number) => `Lists!$${col}$1:$${col}$${Math.max(1, n)}`
  for (let r = 2; r <= last; r++) {
    sheet.getCell(r, 1).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [list('A', input.workers.length)],
    }
    if (input.kind === 'hours') {
      sheet.getCell(r, 3).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [list('B', input.classifications.length)],
      }
    }
  }
  return new Uint8Array(await book.xlsx.writeBuffer())
}
