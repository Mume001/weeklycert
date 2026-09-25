// Step 3, the check (spec/06 §2 and §3): every row of the file, read through
// the mapping, as it would be imported, with what is wrong with it. Pure: the
// data it compares against (workers, classifications, the week) comes in.
import { dec, hours as toHours } from '../money.ts'
import {
  DEDUCTION_KINDS,
  type DeductionKind,
  type ImportKind,
  type Mapping,
  type Target,
} from './mapping.ts'
import { lastFour } from './ssn.ts'
import { type DateFormat, nameKey, parseDate, parseHours, parseMoney } from './values.ts'

/** Why a row cannot go in. The words are in packages/copy (15 §3 Uvoz). */
export type RowError =
  | 'workerNotFound'
  | 'dateUnreadable'
  | 'hoursUnreadable'
  | 'hoursNegative'
  | 'hoursOver24'
  | 'classificationUnknown'
  | 'grossUnreadable'
  | 'amountUnreadable'
  | 'nameMissing'
  | 'ssnFormat'
  | 'idBoth'
  | 'levelUnknown'
/** What goes in anyway, or is left out, with a word to the user. */
export type RowWarning =
  | 'outsideWeek'
  | 'noHours'
  | 'over16'
  | 'workerInactive'
  | 'duplicate'
  | 'overwrites'
  | 'workerExists'
export type RowMessage = RowError | RowWarning

const SKIPPING: readonly RowWarning[] = ['outsideWeek', 'noHours', 'workerExists']

export interface KnownWorker {
  id: string
  firstName: string
  lastName: string
  workerNumber: string | null
  status: 'active' | 'inactive'
  /** Catalog classification id, for a row without one (06 §2 step 3). */
  defaultClassificationId: string | null
}

export interface KnownClassification {
  /** project_classifications.id */
  id: string
  /** The catalog id it stands for. */
  classificationId: string
  /** The official label and the company's own, either may be in the file. */
  labels: string[]
}

export interface CheckContext {
  kind: ImportKind
  mapping: Mapping
  dateFormat: DateFormat
  workers: readonly KnownWorker[]
  /** Hours: the project's classifications. Workers: the catalog, as {id: catalog id}. */
  classifications: readonly KnownClassification[]
  /** Hours: the seven dates of the chosen week (06 §2 step 3). */
  weekDates?: readonly string[]
  /** From the profile: a name in the file -> worker id (06 §2 step 3). */
  workerAliases?: Readonly<Record<string, string>>
  /** From the profile: a code in the file -> project classification id. */
  codeMap?: Readonly<Record<string, string>>
  /** Hours already in the week, as "worker|classification|date" (06: "will be overwritten"). */
  existing?: ReadonlySet<string>
  /** Profile setting: a duplicate replaces instead of adding (06 §3). */
  lastWins?: boolean
}

export interface HoursValue {
  workerId: string
  projectClassificationId: string
  date: string
  hours: string
}
export interface PayrollValue {
  workerId: string
  grossAllWork: string
  netPay: string | null
  deductions: { kind: DeductionKind; amount: string }[]
}
export interface WorkerValue {
  firstName: string
  lastName: string
  workerNumber: string | null
  classificationId: string | null
  address1: string | null
  city: string | null
  state: string | null
  zip: string | null
  ssnLast4: string | null
  dateOfBirth: string | null
  level: 'J' | 'RA'
  pctOfJourney: string | null
}

export interface CheckedRow {
  /** 1-based, counting the header as row 1, like a spreadsheet does. */
  rowNo: number
  status: 'ok' | 'warn' | 'error' | 'skipped'
  messages: RowMessage[]
  /** The cell each field read, for the table in step 3. */
  cells: Partial<Record<Target, string>>
  /** The unresolved name or code, so step 3 can offer a pick (06 §2 step 3). */
  unresolved?: { worker?: string; code?: string }
  value: HoursValue | PayrollValue | WorkerValue | null
}

export interface CheckResult {
  rows: CheckedRow[]
  counts: { total: number; ok: number; warn: number; error: number; skipped: number }
}

const comparable = (s: string) =>
  s
    .replace(/\s+[-–—]\s+/g, ' – ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

function cellsOf(raw: readonly string[], mapping: Mapping): Partial<Record<Target, string>> {
  const out: Partial<Record<Target, string>> = {}
  for (const [target, col] of Object.entries(mapping) as [Target, number][]) {
    const cell = (raw[col] ?? '').trim()
    // A full SSN is cut to its last four the moment it is read: not even the
    // table in step 3 may show more (06 §4, 11 §5).
    out[target] = target === 'ssnLast4' && cell !== '' ? lastFour(cell) : cell
  }
  return out
}

function findWorker(ctx: CheckContext, text: string): KnownWorker | undefined {
  if (text === '') return undefined
  const alias = ctx.workerAliases?.[text]
  if (alias) return ctx.workers.find((w) => w.id === alias)
  const byNumber = ctx.workers.find((w) => w.workerNumber !== null && w.workerNumber === text)
  if (byNumber) return byNumber
  const key = nameKey(text)
  return ctx.workers.find((w) => nameKey(`${w.lastName}, ${w.firstName}`) === key)
}

function findClassification(
  ctx: CheckContext,
  code: string,
  worker: KnownWorker | undefined,
): KnownClassification | undefined {
  if (code !== '') {
    const mapped = ctx.codeMap?.[code]
    if (mapped) return ctx.classifications.find((c) => c.id === mapped)
    return ctx.classifications.find((c) => c.labels.some((l) => comparable(l) === comparable(code)))
  }
  // No code in the row: the worker's default, when it is on the project.
  return worker?.defaultClassificationId
    ? ctx.classifications.find((c) => c.classificationId === worker.defaultClassificationId)
    : undefined
}

function statusOf(messages: readonly RowMessage[]): CheckedRow['status'] {
  const errors: readonly string[] = [
    'workerNotFound',
    'dateUnreadable',
    'hoursUnreadable',
    'hoursNegative',
    'hoursOver24',
    'classificationUnknown',
    'grossUnreadable',
    'amountUnreadable',
    'nameMissing',
    'ssnFormat',
    'idBoth',
    'levelUnknown',
  ]
  if (messages.some((m) => errors.includes(m))) return 'error'
  if (messages.some((m) => (SKIPPING as readonly string[]).includes(m))) return 'skipped'
  return messages.length > 0 ? 'warn' : 'ok'
}

function checkHours(ctx: CheckContext, raw: readonly string[], rowNo: number): CheckedRow {
  const cells = cellsOf(raw, ctx.mapping)
  const messages: RowMessage[] = []
  const worker = findWorker(ctx, cells.worker ?? '')
  if (!worker) messages.push('workerNotFound')
  else if (worker.status === 'inactive') messages.push('workerInactive')
  const date = parseDate(cells.date ?? '', ctx.dateFormat)
  if (!date) messages.push('dateUnreadable')
  const parsed = parseHours(cells.hours ?? '')
  if (!parsed.ok) messages.push(parsed.code === 'negative' ? 'hoursNegative' : 'hoursUnreadable')
  const hours = parsed.ok ? parsed.value : null
  if (hours !== null && dec(hours).gt(24)) messages.push('hoursOver24')
  else if (hours !== null && dec(hours).gt(16)) messages.push('over16')
  if (hours !== null && dec(hours).isZero()) messages.push('noHours')
  const classification = findClassification(ctx, cells.classification ?? '', worker)
  if (!classification) messages.push('classificationUnknown')
  if (date && ctx.weekDates && !ctx.weekDates.includes(date)) messages.push('outsideWeek')
  const value =
    worker && date && hours !== null && classification
      ? { workerId: worker.id, projectClassificationId: classification.id, date, hours }
      : null
  if (value && ctx.existing?.has(`${value.workerId}|${value.projectClassificationId}|${date}`)) {
    messages.push('overwrites')
  }
  return {
    rowNo,
    status: statusOf(messages),
    messages,
    cells,
    ...(worker || !cells.worker
      ? classification || !cells.classification
        ? {}
        : { unresolved: { code: cells.classification } }
      : { unresolved: { worker: cells.worker } }),
    value,
  }
}

function checkPayroll(ctx: CheckContext, raw: readonly string[], rowNo: number): CheckedRow {
  const cells = cellsOf(raw, ctx.mapping)
  const messages: RowMessage[] = []
  const worker = findWorker(ctx, cells.worker ?? '')
  if (!worker) messages.push('workerNotFound')
  else if (worker.status === 'inactive') messages.push('workerInactive')
  const gross = parseMoney(cells.gross ?? '')
  if (!gross.ok) messages.push('grossUnreadable')
  const net = cells.net ? parseMoney(cells.net) : null
  if (net && !net.ok) messages.push('amountUnreadable')
  const deductions: PayrollValue['deductions'] = []
  for (const kind of DEDUCTION_KINDS) {
    const text = cells[`deduction:${kind}`]
    if (!text) continue
    const amount = parseMoney(text)
    if (!amount.ok) messages.push('amountUnreadable')
    else if (!dec(amount.value).isZero()) deductions.push({ kind, amount: amount.value })
  }
  const value =
    worker && gross.ok && (!net || net.ok)
      ? {
          workerId: worker.id,
          grossAllWork: gross.value,
          netPay: net?.ok ? net.value : null,
          deductions,
        }
      : null
  return {
    rowNo,
    status: statusOf(messages),
    messages: [...new Set(messages)],
    cells,
    ...(worker || !cells.worker ? {} : { unresolved: { worker: cells.worker } }),
    value,
  }
}

function checkWorker(ctx: CheckContext, raw: readonly string[], rowNo: number): CheckedRow {
  const cells = cellsOf(raw, ctx.mapping)
  const messages: RowMessage[] = []
  let first = cells.firstName ?? ''
  let last = cells.lastName ?? ''
  if ((!first || !last) && cells.fullName) {
    const [l = '', f = ''] = cells.fullName.includes(',')
      ? cells.fullName.split(',').map((s) => s.trim())
      : [
          cells.fullName.split(/\s+/).at(-1) ?? '',
          cells.fullName.split(/\s+/).slice(0, -1).join(' '),
        ]
    first ||= f
    last ||= l
  }
  if (!first || !last) messages.push('nameMissing')
  const ssn = cells.ssnLast4 || null
  if (ssn !== null && ssn.length !== 4) messages.push('ssnFormat')
  const dob = cells.dateOfBirth ? parseDate(cells.dateOfBirth, ctx.dateFormat) : null
  if (cells.dateOfBirth && !dob) messages.push('dateUnreadable')
  if (ssn && dob) messages.push('idBoth')
  const levelText = (cells.level ?? '').toUpperCase()
  const level =
    levelText === '' || levelText.startsWith('J')
      ? 'J'
      : levelText.startsWith('RA') || levelText.startsWith('APP')
        ? 'RA'
        : null
  if (!level) messages.push('levelUnknown')
  const pct = cells.pctOfJourney ? parseMoney(cells.pctOfJourney.replace('%', '')) : null
  if (pct && !pct.ok) messages.push('amountUnreadable')
  const code = cells.classification ?? ''
  const classification = code ? findClassification(ctx, code, undefined) : undefined
  if (code && !classification) messages.push('classificationUnknown')
  const exists = findWorker(ctx, cells.workerNumber || `${last}, ${first}`)
  if (exists && first && last) messages.push('workerExists')
  const value: WorkerValue | null =
    first && last && level
      ? {
          firstName: first,
          lastName: last,
          workerNumber: cells.workerNumber || null,
          classificationId: classification?.classificationId ?? null,
          address1: cells.address1 || null,
          city: cells.city || null,
          state: cells.state || null,
          zip: cells.zip || null,
          ssnLast4: ssn,
          dateOfBirth: dob,
          level,
          pctOfJourney: pct?.ok ? pct.value : null,
        }
      : null
  return { rowNo, status: statusOf(messages), messages, cells, value }
}

/**
 * Hours in the file for the same worker, classification and day are one entry:
 * summed with a warning, or the last one wins when the profile says so (06 §3).
 */
function mergeDuplicates(rows: CheckedRow[], lastWins: boolean): void {
  const seen = new Map<string, CheckedRow>()
  for (const row of rows) {
    const v = row.value as HoursValue | null
    if (!v || row.status === 'error' || row.status === 'skipped') continue
    const key = `${v.workerId}|${v.projectClassificationId}|${v.date}`
    const first = seen.get(key)
    if (!first) {
      seen.set(key, row)
      continue
    }
    const firstValue = first.value as HoursValue
    if (!lastWins) firstValue.hours = toHours(dec(firstValue.hours).plus(v.hours))
    else firstValue.hours = v.hours
    for (const r of [first, row]) {
      if (!r.messages.includes('duplicate')) r.messages.push('duplicate')
    }
    first.status = statusOf(first.messages)
    // The second row went into the first one.
    row.value = null
    row.status = 'skipped'
  }
}

export function checkRows(ctx: CheckContext, rows: readonly (readonly string[])[]): CheckResult {
  const check =
    ctx.kind === 'hours' ? checkHours : ctx.kind === 'payroll' ? checkPayroll : checkWorker
  const checked = rows.map((raw, i) => check(ctx, raw, i + 2))
  if (ctx.kind === 'hours') mergeDuplicates(checked, ctx.lastWins ?? false)
  const count = (s: CheckedRow['status']) => checked.filter((r) => r.status === s).length
  return {
    rows: checked,
    counts: {
      total: checked.length,
      ok: count('ok'),
      warn: count('warn'),
      error: count('error'),
      skipped: count('skipped'),
    },
  }
}
