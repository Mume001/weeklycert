// From the bytes of an uploaded file to a table of text cells (spec/06 §2
// step 1 and §4). The type comes from the magic bytes, never the extension.
// Pure: bytes in, table out; storing the file is not core's business.
import ExcelJS from 'exceljs'
import Papa from 'papaparse'

/** 06 §2: up to 10 MB uploaded. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024
/** 03 §4.7: an XLSX that unzips to more than 50 MB is refused. */
export const MAX_UNZIPPED_BYTES = 50 * 1024 * 1024

export type FileRefusal = 'tooBig' | 'unzippedTooBig' | 'xls' | 'macros' | 'empty' | 'unreadable'

export interface Table {
  headers: string[]
  rows: string[][]
  format: 'csv' | 'xlsx'
  encoding?: 'utf-8' | 'utf-8-bom' | 'windows-1252'
  delimiter?: ',' | ';' | '\t'
  sheet?: string
}

export type ReadResult = { ok: true; table: Table } | { ok: false; reason: FileRefusal }

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE = [0xd0, 0xcf, 0x11, 0xe0]
const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b)

/**
 * The entries of a ZIP file from its central directory: name and the size it
 * claims unpacked. Read before anything is unpacked, so a zip bomb is refused
 * without being opened.
 */
export function zipEntries(bytes: Uint8Array): { name: string; size: number }[] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // End of central directory: signature 0x06054b50, within the last 64 KiB + 22.
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null
  const count = view.getUint16(eocd + 10, true)
  let at = view.getUint32(eocd + 16, true)
  const out: { name: string; size: number }[] = []
  for (let n = 0; n < count; n++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) return null
    const size = view.getUint32(at + 24, true)
    const nameLength = view.getUint16(at + 28, true)
    const extra = view.getUint16(at + 30, true)
    const comment = view.getUint16(at + 32, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength))
    out.push({ name, size })
    at += 46 + nameLength + extra + comment
  }
  return out
}

/** UTF-8 with or without BOM, else Windows-1252 (06 §2). */
export function decodeText(bytes: Uint8Array): { text: string; encoding: Table['encoding'] } {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8-bom' }
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' }
  }
}

function tableOf(rows: string[][]): { headers: string[]; rows: string[][] } | null {
  const filled = rows.filter((r) => r.some((c) => c.trim() !== ''))
  const [headers, ...rest] = filled
  if (!headers || rest.length === 0) return null
  return { headers: headers.map((h) => h.trim()), rows: rest }
}

/** A CSV or TSV: the delimiter guessed from , ; and tab (06 §2). */
export function readDelimited(bytes: Uint8Array): ReadResult {
  const { text, encoding } = decodeText(bytes)
  const parsed = Papa.parse<string[]>(text, {
    delimitersToGuess: [',', ';', '\t'],
    skipEmptyLines: 'greedy',
  })
  const delimiter = parsed.meta.delimiter as Table['delimiter']
  const table = tableOf(parsed.data)
  if (!table) return { ok: false, reason: 'empty' }
  return { ok: true, table: { ...table, format: 'csv', encoding, delimiter } }
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    // A formula is read as its result, never run (06 §2); rich text as its text.
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('richText' in value) return value.richText.map((r) => r.text).join('')
    if ('text' in value) return String(value.text)
    if ('error' in value) return ''
    return ''
  }
  return String(value)
}

/** The first sheet of an XLSX (06 §2), after the size and macro checks. */
export async function readXlsx(bytes: Uint8Array): Promise<ReadResult> {
  const entries = zipEntries(bytes)
  if (!entries) return { ok: false, reason: 'unreadable' }
  if (entries.some((e) => e.name.toLowerCase().endsWith('vbaproject.bin'))) {
    return { ok: false, reason: 'macros' }
  }
  if (entries.reduce((n, e) => n + e.size, 0) > MAX_UNZIPPED_BYTES) {
    return { ok: false, reason: 'unzippedTooBig' }
  }
  const book = new ExcelJS.Workbook()
  try {
    await book.xlsx.load(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    )
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  const sheet = book.worksheets[0]
  if (!sheet) return { ok: false, reason: 'empty' }
  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : []
    rows.push(values.map((v) => cellText(v as ExcelJS.CellValue)))
  })
  const width = Math.max(0, ...rows.map((r) => r.length))
  const table = tableOf(rows.map((r) => [...r, ...Array(width - r.length).fill('')]))
  if (!table) return { ok: false, reason: 'empty' }
  return { ok: true, table: { ...table, format: 'xlsx', sheet: sheet.name } }
}

/** Any upload: refused by size, by type, or read into a table. */
export async function readUpload(bytes: Uint8Array): Promise<ReadResult> {
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, reason: 'tooBig' }
  if (bytes.length === 0) return { ok: false, reason: 'empty' }
  if (startsWith(bytes, OLE)) return { ok: false, reason: 'xls' }
  if (startsWith(bytes, ZIP)) return readXlsx(bytes)
  return readDelimited(bytes)
}
