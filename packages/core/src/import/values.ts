// How a cell of an imported file becomes a value (spec/06 §3). Every cell
// stays text until one of these reads it; nothing is ever evaluated, so a cell
// that looks like a formula is a string like any other (03 §4.7).
import { dec, hours as toHours, money as toMoney } from '../money.ts'

export type Parsed = { ok: true; value: string } | { ok: false; code: 'unreadable' | 'negative' }

/** A cell that a spreadsheet would run: = + - @, tab or CR first (06 §3). */
export function looksLikeFormula(cell: string): boolean {
  return /^[=+\-@\t\r]/.test(cell)
}

/** 7.5, 7,5, 7:30, 7h30, "7.50 hrs". Empty is zero. Two decimals (numeric(5,2)). */
export function parseHours(raw: string): Parsed {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/\s*(hrs?|hours?)$/, '')
  if (text === '') return { ok: true, value: '0.00' }
  if (text.startsWith('-')) return /^-\d/.test(text) ? { ok: false, code: 'negative' } : bad()
  const clock = /^(\d{1,2})[:h](\d{2})$/.exec(text)
  if (clock) {
    const minutes = Number(clock[2])
    if (minutes >= 60) return bad()
    return { ok: true, value: toHours(dec(clock[1] ?? '0').plus(dec(String(minutes)).div(60))) }
  }
  const decimal = text.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(decimal)) return bad()
  return { ok: true, value: toHours(dec(decimal)) }
}

/** $1,234.50, "1 234.5"; parentheses or a minus are negative. Two decimals. */
export function parseMoney(raw: string): Parsed {
  let text = raw.trim().replace(/[$\s]/g, '')
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  } else if (/^-\d/.test(text)) {
    negative = true
    text = text.slice(1)
  }
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text)) return bad()
  const value = dec(text.replace(/,/g, ''))
  return { ok: true, value: toMoney(negative ? value.neg() : value) }
}

function bad(): Parsed {
  return { ok: false, code: 'unreadable' }
}

export const DATE_FORMATS = ['MM/DD/YYYY', 'YYYY-MM-DD', 'M/D/YY'] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

const PATTERNS: Record<DateFormat, RegExp> = {
  'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
  'M/D/YY': /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
}

/** The format most of the sampled cells follow (06 §2 samples 20 rows). */
export function detectDateFormat(samples: readonly string[]): DateFormat {
  let best: DateFormat = 'MM/DD/YYYY'
  let hits = 0
  for (const format of DATE_FORMATS) {
    const n = samples.filter((s) => parseWith(s.trim(), format) !== null).length
    if (n > hits) {
      best = format
      hits = n
    }
  }
  return best
}

function parseWith(text: string, format: DateFormat): string | null {
  const m = PATTERNS[format].exec(text)
  if (!m) return null
  const [a = '', b = '', c = ''] = m.slice(1)
  const [y, mo, d] =
    format === 'YYYY-MM-DD' ? [a, b, c] : [format === 'M/D/YY' ? `20${c}` : c, a, b]
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso
}

/** The profile's format, then ISO, then nothing (06 §3). */
export function parseDate(raw: string, format: DateFormat): string | null {
  const text = raw.trim()
  return parseWith(text, format) ?? parseWith(text, 'YYYY-MM-DD')
}

function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s,'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The key two spellings of one person share: "Doe, John" and "John Doe",
 * any case, spaces or accents, a middle initial ignored (06 §3).
 */
export function nameKey(raw: string): string {
  const text = plain(raw)
  const [last, first] = text.includes(',')
    ? [text.split(',')[0] ?? '', text.split(',').slice(1).join(' ')]
    : [text.split(' ').at(-1) ?? '', text.split(' ').slice(0, -1).join(' ')]
  const firstName =
    first
      .trim()
      .split(' ')
      .filter((w) => w.length > 1)[0] ?? first.trim()
  return `${last.trim()}|${firstName}`
}
