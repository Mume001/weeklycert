// Reading an upload (spec/06 §2 step 1 and §4, 03 §4.7).
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, MAX_UNZIPPED_BYTES, readUpload, zipEntries } from './file.ts'

const utf8 = (text: string) => new TextEncoder().encode(text)

/** A ZIP with no content, only a central directory claiming the sizes given. */
function zipClaiming(entries: { name: string; size: number }[]): Uint8Array {
  const parts: number[] = [0x50, 0x4b, 0x03, 0x04, ...new Array(26).fill(0)]
  const central: number[] = []
  for (const e of entries) {
    const name = [...new TextEncoder().encode(e.name)]
    const header = new Uint8Array(46)
    const v = new DataView(header.buffer)
    v.setUint32(0, 0x02014b50, true)
    v.setUint32(24, e.size, true)
    v.setUint16(28, name.length, true)
    central.push(...header, ...name)
  }
  const start = parts.length
  const eocd = new Uint8Array(22)
  const v = new DataView(eocd.buffer)
  v.setUint32(0, 0x06054b50, true)
  v.setUint16(8, entries.length, true)
  v.setUint16(10, entries.length, true)
  v.setUint32(12, central.length, true)
  v.setUint32(16, start, true)
  return new Uint8Array([...parts, ...central, ...eocd])
}

async function xlsx(rows: (string | number | Date | ExcelJS.CellFormulaValue)[][]) {
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('Hours')
  for (const row of rows) sheet.addRow(row)
  return new Uint8Array(await book.xlsx.writeBuffer())
}

describe('CSV and TSV', () => {
  it('reads a comma file with a BOM', async () => {
    const result = await readUpload(utf8('﻿Employee,Date,Hours\nDoe; John,09/08/2026,8\n'))
    expect(result).toMatchObject({
      ok: true,
      table: { headers: ['Employee', 'Date', 'Hours'], encoding: 'utf-8-bom', delimiter: ',' },
    })
  })

  it('guesses ; and tab', async () => {
    const semi = await readUpload(utf8('Employee;Date;Hours\n"Doe, John";09/08/2026;7,5\n'))
    expect(semi).toMatchObject({
      ok: true,
      table: { delimiter: ';', rows: [['Doe, John', '09/08/2026', '7,5']] },
    })
    const tab = await readUpload(utf8('Employee\tHours\nDoe, John\t8\n'))
    expect(tab).toMatchObject({ ok: true, table: { delimiter: '\t' } })
  })

  it('falls back to Windows-1252 when the bytes are not UTF-8', async () => {
    // "Peña" in Windows-1252: ñ is 0xF1.
    const bytes = new Uint8Array([...utf8('Employee,Hours\nPe'), 0xf1, ...utf8('a,8\n')])
    const result = await readUpload(bytes)
    expect(result).toMatchObject({
      ok: true,
      table: { encoding: 'windows-1252', rows: [['Peña', '8']] },
    })
  })

  it('keeps a formula-looking cell as its text', async () => {
    const result = await readUpload(utf8('Employee,Hours\n=HYPERLINK("x"),=8\n'))
    expect(result).toMatchObject({ ok: true, table: { rows: [['=HYPERLINK("x")', '=8']] } })
  })
})

describe('XLSX', () => {
  it('reads the first sheet, a formula as its result and a date as ISO', async () => {
    const bytes = await xlsx([
      ['Employee', 'Date', 'Hours'],
      ['Doe, John', new Date(Date.UTC(2026, 8, 8)), { formula: '4+4', result: 8 }],
    ])
    const result = await readUpload(bytes)
    expect(result).toMatchObject({
      ok: true,
      table: { format: 'xlsx', sheet: 'Hours', rows: [['Doe, John', '2026-09-08', '8']] },
    })
  })

  it('refuses one that unzips to more than 50 MB, before opening it', async () => {
    const bomb = zipClaiming([
      { name: 'xl/worksheets/sheet1.xml', size: MAX_UNZIPPED_BYTES },
      { name: 'xl/sharedStrings.xml', size: 1 },
    ])
    expect(zipEntries(bomb)?.length).toBe(2)
    expect(await readUpload(bomb)).toEqual({ ok: false, reason: 'unzippedTooBig' })
  })

  it('refuses macros', async () => {
    const macro = zipClaiming([{ name: 'xl/vbaProject.bin', size: 10 }])
    expect(await readUpload(macro)).toEqual({ ok: false, reason: 'macros' })
  })
})

describe('refused before reading', () => {
  it('an old .xls, by its bytes and not its name', async () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    expect(await readUpload(xls)).toEqual({ ok: false, reason: 'xls' })
  })

  it('anything over 10 MB, and an empty file', async () => {
    expect(await readUpload(new Uint8Array(MAX_FILE_BYTES + 1))).toEqual({
      ok: false,
      reason: 'tooBig',
    })
    expect(await readUpload(utf8('Employee,Hours\n'))).toEqual({ ok: false, reason: 'empty' })
  })
})
