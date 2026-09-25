// Imports over the fixtures (spec/03 §4.7, spec/06). Reading and checking a
// file is core's (@wc/core/import); this file keeps the batches and the saved
// profiles, joins the company's workers, classifications and weeks in, and
// writes what the user confirmed, the way typing it into the grid would.
//
// In step 4 the batch rows live in import_batches and import_rows, and the
// original file in S3 for 90 days (06 §4). The mock keeps only the rows, and a
// full SSN never reaches them: it is cut to the last four on upload.
import {
  addDays,
  computeWeek,
  dec,
  money,
  sum,
  hours as toHours,
  type WorkerPayrollInput,
  weekDates,
} from '@wc/core'
import {
  type CheckContext,
  type CheckedRow,
  type CheckResult,
  checkRows,
  type DateFormat,
  detectDateFormat,
  fullSsnColumns,
  type HoursValue,
  headerHash,
  type ImportKind,
  lastFour,
  type Mapping,
  missingTargets,
  type PayrollValue,
  REQUIRED,
  suggestMapping,
  TARGETS,
  type Table,
  type Target,
  type WorkerValue,
} from '@wc/core/import'
import type {
  ImportApplyResult,
  ImportBatchDTO,
  ImportDraftDTO,
  ImportMappingInput,
  ImportResolveInput,
  ImportStart,
  ImportStatus,
  SourceKind,
  Uuid,
} from '../dto/index.ts'
import { writePii } from '../pii.ts'
import { mockNow } from './clock.ts'
import { db } from './db.ts'
import {
  buildWeekInput,
  ensurePeriod,
  payrollFor,
  restoreImportedRow,
  restorePayroll,
  setPayroll,
  weekGrid,
  writeImportedDay,
} from './week-grid.ts'

/** 04 import_profiles, as the mock keeps it. */
export interface ImportProfile {
  id: Uuid
  tenantId: Uuid
  name: string
  kind: ImportKind
  source: SourceKind
  headerHash: string
  /** Target -> column name, so a file with the same columns in another order still maps. */
  columnMap: Partial<Record<Target, string>>
  workerAliases: Record<string, Uuid>
  codeMap: Record<string, Uuid>
  dateFormat: DateFormat
  lastWins: boolean
}

type Undo =
  | { type: 'hours'; periodId: Uuid; rowId: string; before: (string | null)[] | undefined }
  | { type: 'payroll'; periodId: Uuid; workerId: Uuid; before: WorkerPayrollInput | undefined }
  | { type: 'worker'; workerId: Uuid }

/** 04 import_batches with its import_rows, as the mock keeps them. */
export interface ImportBatch {
  id: Uuid
  tenantId: Uuid
  createdBy: Uuid
  createdAt: string
  fileName: string
  sha256: string
  kind: ImportKind
  source: SourceKind
  projectId: Uuid | null
  weekEnding: string | null
  status: ImportStatus
  headers: string[]
  rows: string[][]
  fullSsnColumns: string[]
  mapping: Mapping
  confidence: Partial<Record<Target, 'sure' | 'likely' | 'check'>>
  dateFormat: DateFormat
  lastWins: boolean
  profileId: Uuid | null
  workerAliases: Record<string, Uuid>
  codeMap: Record<string, Uuid>
  skipErrors: boolean
  appliedAt: string | null
  rowsApplied: number
  undo: Undo[]
}

/** Undo is allowed for 90 days (03 §4.7). */
const UNDO_DAYS = 90
const LOCKED = new Set(['signed', 'submitted', 'corrected'])

const newId = (group: string, count: number): Uuid =>
  `${group}-0000-7000-9000-${String(count + 1).padStart(12, '0')}`

function batchOf(tenantId: Uuid, batchId: Uuid): ImportBatch {
  const b = db.importBatches.find((x) => x.id === batchId && x.tenantId === tenantId)
  if (!b) throw new Error(`Unknown import ${batchId}`)
  return b
}

function ownProject(tenantId: Uuid, projectId: Uuid | null) {
  return projectId
    ? db.projects.find((p) => p.id === projectId && p.tenantId === tenantId)
    : undefined
}

/** A mapping by column names, read back onto this file's columns. */
function byName(columnMap: ImportProfile['columnMap'], headers: readonly string[]): Mapping {
  const out: Mapping = {}
  for (const [target, name] of Object.entries(columnMap) as [Target, string][]) {
    const at = headers.indexOf(name)
    if (at >= 0) out[target] = at
  }
  return out
}

/**
 * Step 1 (06 §2): the table read from the upload becomes a batch. Columns that
 * hold full SSNs are cut to the last four here, before anything is kept, and
 * the columns are mapped from a saved profile with the same columns, or
 * suggested from their names.
 */
export function startImport(
  tenantId: Uuid,
  userId: Uuid,
  start: ImportStart,
  file: { name: string; sha256: string; table: Table },
): Uuid {
  if (start.kind !== 'workers' && !ownProject(tenantId, start.projectId)) {
    throw new Error(`Unknown project ${start.projectId}`)
  }
  const { headers } = file.table
  const ssn = fullSsnColumns(headers, file.table.rows)
  const rows = file.table.rows.map((r) =>
    r.map((cell, i) => (ssn.includes(i) && cell.trim() !== '' ? lastFour(cell) : cell)),
  )
  const profile = db.importProfiles.find(
    (p) => p.tenantId === tenantId && p.kind === start.kind && p.headerHash === headerHash(headers),
  )
  const suggested = suggestMapping(headers, start.kind)
  const mapping = profile ? byName(profile.columnMap, headers) : suggested.mapping
  const dateCol = mapping.date ?? mapping.dateOfBirth
  const id = newId('01931000', db.importBatches.length)
  db.importBatches.push({
    id,
    tenantId,
    createdBy: userId,
    createdAt: mockNow(),
    fileName: file.name,
    sha256: file.sha256,
    kind: start.kind,
    source: start.source,
    projectId: start.kind === 'workers' ? null : start.projectId,
    weekEnding: start.kind === 'workers' ? null : start.weekEnding,
    status: 'uploaded',
    headers,
    rows,
    fullSsnColumns: ssn.map((i) => headers[i] ?? ''),
    mapping,
    confidence: profile
      ? Object.fromEntries(Object.keys(mapping).map((t) => [t, 'sure']))
      : suggested.confidence,
    dateFormat:
      profile?.dateFormat ??
      detectDateFormat(dateCol === undefined ? [] : rows.slice(0, 20).map((r) => r[dateCol] ?? '')),
    lastWins: profile?.lastWins ?? false,
    profileId: profile?.id ?? null,
    workerAliases: { ...profile?.workerAliases },
    codeMap: { ...profile?.codeMap },
    skipErrors: false,
    appliedAt: null,
    rowsApplied: 0,
    undo: [],
  })
  return id
}

/** The project's classifications for the week: one version per classification (spec/03 §4.4). */
function classificationsFor(projectId: Uuid, weekEnding: string) {
  const start = addDays(weekEnding, -6)
  const rows = db.projectClassifications
    .filter((c) => c.projectId === projectId)
    .filter((c) => c.effectiveFrom <= weekEnding && (c.effectiveTo ?? '9999-12-31') >= start)
  return rows.map((c) => ({
    id: c.id,
    classificationId: c.classificationId,
    labels: [
      db.classificationCatalog.find((k) => k.id === c.classificationId)?.officialLabel ?? '',
      c.displayLabel,
    ].filter(Boolean),
  }))
}

function contextOf(b: ImportBatch): CheckContext {
  const workers = db.workers
    .filter((w) => w.tenantId === b.tenantId)
    .map((w) => ({
      id: w.id,
      firstName: w.firstName,
      lastName: w.lastName,
      workerNumber: w.workerNumber,
      status: w.status,
      defaultClassificationId: w.defaultClassificationId,
    }))
  const base = {
    kind: b.kind,
    mapping: b.mapping,
    dateFormat: b.dateFormat,
    workers,
    workerAliases: b.workerAliases,
    codeMap: b.codeMap,
    lastWins: b.lastWins,
  }
  if (b.kind === 'workers' || !b.projectId || !b.weekEnding) {
    return {
      ...base,
      // Workers are matched to the catalog, not to a project (06 §5).
      classifications: db.classificationCatalog.map((k) => ({
        id: k.id,
        classificationId: k.id,
        labels: [k.officialLabel],
      })),
    }
  }
  const classifications = classificationsFor(b.projectId, b.weekEnding)
  const byCatalog = new Map(classifications.map((c) => [c.classificationId, c.id]))
  const existing = new Set(
    buildWeekInput(b.projectId, b.weekEnding).entries.map(
      (e) => `${e.workerId}|${byCatalog.get(e.classificationId) ?? ''}|${e.workDate}`,
    ),
  )
  return {
    ...base,
    classifications,
    weekDates: weekDates(b.weekEnding),
    existing: b.kind === 'hours' ? existing : undefined,
  }
}

function check(b: ImportBatch): CheckResult {
  return checkRows(contextOf(b), b.rows)
}

const workerName = (id: Uuid) => {
  const w = db.workers.find((x) => x.id === id)
  return w ? `${w.lastName}, ${w.firstName}` : ''
}

/** Step 4 (06 §2): per worker, the file against the grid and the week before. */
function reconcile(b: ImportBatch, checked: CheckResult): ImportDraftDTO['reconcile'] {
  if (b.kind === 'workers' || !b.projectId || !b.weekEnding) return []
  const values = checked.rows.flatMap((r) =>
    r.value && r.status !== 'error' && r.status !== 'skipped' ? [r.value] : [],
  )
  const previous = db.periods.find(
    (p) =>
      p.projectId === b.projectId &&
      p.weekEnding === addDays(b.weekEnding ?? '', -7) &&
      p.status !== 'corrected',
  )
  const ids = [...new Set(values.map((v) => (v as HoursValue | PayrollValue).workerId))]
  if (b.kind === 'hours') {
    const lastGrid = previous ? weekGrid(previous.projectId, previous.weekEnding) : null
    return ids.map((id) => {
      const inFile = toHours(
        sum(
          values
            .filter((v) => (v as HoursValue).workerId === id)
            .map((v) => dec((v as HoursValue).hours)),
        ),
      )
      const lastRows = lastGrid?.rows.filter((r) => r.workerId === id) ?? []
      const lastWeek = lastGrid ? toHours(sum(lastRows.map((r) => dec(r.totalHours)))) : null
      return {
        workerId: id,
        workerName: workerName(id),
        inFile,
        onProject: null,
        lastWeek,
        difference: lastWeek === null ? null : toHours(dec(inFile).minus(lastWeek)),
      }
    })
  }
  const result = computeWeek(buildWeekInput(b.projectId, b.weekEnding))
  return ids.map((id) => {
    const inFile = money(
      sum(
        values
          .filter((v) => (v as PayrollValue).workerId === id)
          .map((v) => dec((v as PayrollValue).grossAllWork)),
      ),
    )
    const onProject = money(
      sum(result.rows.filter((r) => r.workerId === id).map((r) => dec(r.grossProject))),
    )
    const before = previous ? payrollFor(previous.id, id)?.grossAllWork : null
    return {
      workerId: id,
      workerName: workerName(id),
      inFile,
      onProject,
      lastWeek: before ?? null,
      difference: money(dec(inFile).minus(onProject)),
    }
  })
}

export function importDraft(tenantId: Uuid, batchId: Uuid): ImportDraftDTO {
  const b = batchOf(tenantId, batchId)
  const project = ownProject(tenantId, b.projectId)
  // The same file for the same company, uploaded before this one (06 §2 step 1).
  const earlier = db.importBatches
    .slice(0, db.importBatches.indexOf(b))
    .find((x) => x.tenantId === tenantId && x.sha256 === b.sha256)
  const mapped = b.status !== 'uploaded'
  const checked = mapped ? check(b) : null
  const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))]
  return {
    batchId: b.id,
    kind: b.kind,
    fileName: b.fileName,
    source: b.source,
    project: project ? { id: project.id, name: project.name } : null,
    weekEnding: b.weekEnding,
    status: b.status,
    duplicateOf: earlier ? { batchId: earlier.id, date: earlier.createdAt.slice(0, 10) } : null,
    fullSsnColumns: b.fullSsnColumns,
    columns: b.headers.map((name, i) => ({
      name,
      samples: b.rows.slice(0, 3).map((r) => r[i] ?? ''),
    })),
    fields: TARGETS[b.kind].map((target) => ({
      target,
      column: b.mapping[target] ?? null,
      confidence: b.confidence[target] ?? null,
      required:
        (REQUIRED[b.kind] as readonly string[]).includes(target) ||
        (b.kind === 'workers' && target === 'fullName'),
    })),
    dateFormat: b.dateFormat,
    lastWins: b.lastWins,
    profileName: db.importProfiles.find((p) => p.id === b.profileId)?.name ?? null,
    check: checked && {
      counts: checked.counts,
      rows: checked.rows.slice(0, 50).map((r: CheckedRow) => ({
        rowNo: r.rowNo,
        status: r.status,
        messages: r.messages,
        cells: r.cells as Record<string, string>,
      })),
      unresolvedWorkers: unique(checked.rows.map((r) => r.unresolved?.worker)),
      unresolvedCodes: unique(checked.rows.map((r) => r.unresolved?.code)),
    },
    reconcile:
      checked && (b.status === 'validated' || b.status === 'applied') ? reconcile(b, checked) : [],
    workers: db.workers
      .filter((w) => w.tenantId === tenantId)
      .map((w) => ({ id: w.id, name: `${w.lastName}, ${w.firstName}` }))
      .sort((x, y) => x.name.localeCompare(y.name)),
    classifications:
      b.projectId && b.weekEnding
        ? classificationsFor(b.projectId, b.weekEnding).map((c) => ({
            id: c.id,
            name: c.labels[0] ?? '',
          }))
        : [],
  }
}

/** Step 2: the mapping, and a profile under a name if one was given (06 §2 step 2). */
export function setImportMapping(
  tenantId: Uuid,
  batchId: Uuid,
  input: ImportMappingInput,
): { ok: true } | { ok: false; missing: string[] } {
  const b = batchOf(tenantId, batchId)
  if (b.status === 'applied' || b.status === 'undone') throw new Error('Import already applied')
  const valid = new Set<string>(TARGETS[b.kind])
  const mapping: Mapping = {}
  for (const [target, col] of Object.entries(input.mapping)) {
    if (valid.has(target) && col < b.headers.length) mapping[target as Target] = col
  }
  const missing = missingTargets(b.kind, mapping)
  if (missing.length > 0) return { ok: false, missing }
  Object.assign(b, {
    mapping,
    dateFormat: input.dateFormat,
    lastWins: input.lastWins,
    status: 'mapped',
  })
  if (input.profileName) {
    const columnMap = Object.fromEntries(
      Object.entries(mapping).map(([t, col]) => [t, b.headers[col] ?? '']),
    )
    const existing = db.importProfiles.find(
      (p) => p.tenantId === tenantId && p.kind === b.kind && p.headerHash === headerHash(b.headers),
    )
    const profile: ImportProfile = {
      id: existing?.id ?? newId('01930000', db.importProfiles.length),
      tenantId,
      name: input.profileName,
      kind: b.kind,
      source: b.source,
      headerHash: headerHash(b.headers),
      columnMap,
      workerAliases: { ...existing?.workerAliases, ...b.workerAliases },
      codeMap: { ...existing?.codeMap, ...b.codeMap },
      dateFormat: input.dateFormat,
      lastWins: input.lastWins,
    }
    if (existing) Object.assign(existing, profile)
    else db.importProfiles.push(profile)
    b.profileId = profile.id
  }
  return { ok: true }
}

function splitName(text: string): { firstName: string; lastName: string } {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.includes(',')) {
    const [last = '', first = ''] = t.split(',').map((s) => s.trim())
    return { firstName: first, lastName: last }
  }
  const parts = t.split(' ')
  return { firstName: parts.slice(0, -1).join(' ') || t, lastName: parts.at(-1) ?? t }
}

/**
 * Step 3 picks: a name matched to a worker, or a worker created with only that
 * name ("the rest later", 06 §2 step 3); a code matched to a classification.
 * Both are remembered in the batch and in its profile.
 */
export function resolveImport(tenantId: Uuid, batchId: Uuid, input: ImportResolveInput): void {
  const b = batchOf(tenantId, batchId)
  for (const [name, choice] of Object.entries(input.workers)) {
    if (choice === '') continue
    let workerId = choice
    if (choice === 'new') {
      workerId = newId('01927000', db.workers.length)
      db.workers.push({
        id: workerId,
        tenantId,
        ...splitName(name),
        middleName: null,
        workerNumber: null,
        defaultClassificationId: null,
        level: 'J',
        hireDate: null,
        status: 'active',
      })
    } else if (!db.workers.some((w) => w.id === choice && w.tenantId === tenantId)) {
      throw new Error(`Unknown worker ${choice}`)
    }
    b.workerAliases[name] = workerId
  }
  const allowed =
    b.projectId && b.weekEnding
      ? classificationsFor(b.projectId, b.weekEnding).map((c) => c.id)
      : []
  for (const [code, pc] of Object.entries(input.codes)) {
    if (pc === '') continue
    if (!allowed.includes(pc)) throw new Error(`Unknown classification ${pc}`)
    b.codeMap[code] = pc
  }
  const profile = db.importProfiles.find((p) => p.id === b.profileId)
  if (profile) {
    Object.assign(profile.workerAliases, b.workerAliases)
    Object.assign(profile.codeMap, b.codeMap)
  }
}

/** Step 3 done: on to step 4, with no error left or the errors skipped (06 §2 step 3). */
export function confirmImportCheck(
  tenantId: Uuid,
  batchId: Uuid,
  skipErrors: boolean,
): { ok: boolean } {
  const b = batchOf(tenantId, batchId)
  if (b.status === 'uploaded') return { ok: false }
  if (check(b).counts.error > 0 && !skipErrors) return { ok: false }
  b.skipErrors = skipErrors
  b.status = 'validated'
  return { ok: true }
}

/**
 * Step 4, "Confirm the import": what the check let through is written, the
 * hours as if typed into the grid, the payroll as if typed on the review
 * screen, and what was there before is kept for "Undo import".
 */
export function applyImport(tenantId: Uuid, batchId: Uuid, userId: Uuid): ImportApplyResult {
  const b = batchOf(tenantId, batchId)
  if (b.status !== 'validated') throw new Error('Import is not checked')
  const checked = check(b)
  if (checked.counts.error > 0 && !b.skipErrors) return { ok: false, refused: 'errors' }
  const good = checked.rows.filter((r) => r.value && (r.status === 'ok' || r.status === 'warn'))
  const undo: Undo[] = []

  if (b.kind === 'hours' || b.kind === 'payroll') {
    if (!b.projectId || !b.weekEnding) throw new Error('Import without a week')
    const period = ensurePeriod(b.projectId, b.weekEnding)
    if (LOCKED.has(period.status) || period.status === 'generated') {
      return { ok: false, refused: 'locked' }
    }
    const dates = weekDates(b.weekEnding)
    for (const r of good) {
      if (b.kind === 'hours') {
        const v = r.value as HoursValue
        const catalog = db.projectClassifications.find((c) => c.id === v.projectClassificationId)
        const rowId = `${v.workerId}:${catalog?.classificationId ?? ''}`
        const before = writeImportedDay(period.id, rowId, dates.indexOf(v.date), v.hours)
        // The first "before" of a row is the one undo returns to.
        if (!undo.some((u) => u.type === 'hours' && u.rowId === rowId)) {
          undo.push({ type: 'hours', periodId: period.id, rowId, before })
        }
      } else {
        const v = r.value as PayrollValue
        undo.push({
          type: 'payroll',
          periodId: period.id,
          workerId: v.workerId,
          before: payrollFor(period.id, v.workerId),
        })
        setPayroll(period.id, {
          workerId: v.workerId,
          grossAllWork: v.grossAllWork,
          netPay: v.netPay,
          deductions: v.deductions.map((d) => ({ kind: d.kind, label: null, amount: d.amount })),
        })
      }
    }
  } else {
    for (const r of good) {
      const v = r.value as WorkerValue
      const id = newId('01927000', db.workers.length)
      db.workers.push({
        id,
        tenantId,
        firstName: v.firstName,
        lastName: v.lastName,
        middleName: null,
        workerNumber: v.workerNumber,
        defaultClassificationId: v.classificationId,
        level: v.level,
        hireDate: null,
        status: 'active',
      })
      writePii(tenantId, id, {
        ssnLast4: v.ssnLast4 ?? '',
        dateOfBirth: v.dateOfBirth ?? '',
        address:
          v.address1 && v.city && v.zip
            ? {
                address1: v.address1,
                address2: '',
                city: v.city,
                state: v.state ?? 'NY',
                postalCode: v.zip,
                postalCodeExt: '',
                phone: '',
              }
            : undefined,
      })
      undo.push({ type: 'worker', workerId: id })
    }
  }

  Object.assign(b, {
    status: 'applied',
    appliedAt: mockNow(),
    rowsApplied: good.length,
    undo,
  })
  const workers = new Set(
    good.map((r) =>
      b.kind === 'workers' ? r.rowNo : (r.value as HoursValue | PayrollValue).workerId,
    ),
  )
  void userId
  return {
    ok: true,
    summary: {
      rowsImported: good.length,
      workers: workers.size,
      rowsSkipped: checked.rows.length - good.length,
      weekEnding: b.weekEnding,
    },
  }
}

function undoRefusal(b: ImportBatch): 'locked' | 'expired' | null {
  if (b.status !== 'applied' || !b.appliedAt) return null
  const days = (Date.parse(mockNow()) - Date.parse(b.appliedAt)) / 86_400_000
  if (days > UNDO_DAYS) return 'expired'
  const period =
    b.projectId && b.weekEnding
      ? db.periods.find(
          (p) =>
            p.projectId === b.projectId &&
            p.weekEnding === b.weekEnding &&
            p.status !== 'corrected',
        )
      : undefined
  return period && (LOCKED.has(period.status) || period.status === 'generated') ? 'locked' : null
}

/** "Undo import" (06 §2 step 4): 90 days, and only while the week is not signed. */
export function undoImport(
  tenantId: Uuid,
  batchId: Uuid,
): { ok: true } | { ok: false; refused: 'locked' | 'expired' } {
  const b = batchOf(tenantId, batchId)
  if (b.status !== 'applied') throw new Error('Import is not applied')
  const refused = undoRefusal(b)
  if (refused) return { ok: false, refused }
  for (const u of [...b.undo].reverse()) {
    if (u.type === 'hours') restoreImportedRow(u.periodId, u.rowId, u.before)
    else if (u.type === 'payroll') restorePayroll(u.periodId, u.workerId, u.before)
    else {
      db.workers.splice(
        db.workers.findIndex((w) => w.id === u.workerId),
        1,
      )
      const pii = db.workerPii.findIndex((p) => p.workerId === u.workerId)
      if (pii >= 0) db.workerPii.splice(pii, 1)
    }
  }
  b.status = 'undone'
  b.undo = []
  return { ok: true }
}

function toDTO(b: ImportBatch): ImportBatchDTO {
  const project = ownProject(b.tenantId, b.projectId)
  const refusal = undoRefusal(b)
  const checked = b.status === 'uploaded' ? null : check(b)
  const user = db.users.find((u) => u.id === b.createdBy)
  return {
    id: b.id,
    createdAt: b.createdAt,
    createdBy: user?.name ?? '',
    fileName: b.fileName,
    source: b.source,
    profileName: db.importProfiles.find((p) => p.id === b.profileId)?.name ?? null,
    kind: b.kind,
    project: project ? { id: project.id, name: project.name } : null,
    weekEnding: b.weekEnding,
    status: b.status,
    rowsTotal: b.rows.length,
    rowsApplied: b.rowsApplied,
    rowsError: checked?.counts.error ?? 0,
    appliedAt: b.appliedAt,
    canUndo: b.status === 'applied' && refusal === null,
    undoRefusal: refusal,
  }
}

export function listImports(tenantId: Uuid): ImportBatchDTO[] {
  return db.importBatches
    .filter((b) => b.tenantId === tenantId)
    .map(toDTO)
    .reverse()
}

export function getImport(tenantId: Uuid, batchId: Uuid): ImportBatchDTO | null {
  const b = db.importBatches.find((x) => x.id === batchId && x.tenantId === tenantId)
  return b ? toDTO(b) : null
}
