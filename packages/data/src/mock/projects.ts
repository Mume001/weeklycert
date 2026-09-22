// Projects over the fixtures (spec/03 §4.4): the list, the week timeline, the
// project form and the classification rates. Rules come from core (open weeks,
// the 30-day deadline, the payroll number a week will get); this file only
// joins the tables of spec/04 the way the screens read them.
import {
  addDays,
  type Dow,
  dec,
  expectedPayrollNumbers,
  hours,
  money,
  nextStateFilingDeadline,
  openWeekEndings,
  timelineWeekEndings,
  weekEndingOf,
} from '@wc/core'
import type {
  ClassificationEditInput,
  ClassificationInput,
  ClassificationRateRow,
  ClassificationSaveResult,
  IsoDate,
  ProjectClassificationsDTO,
  ProjectFormDTO,
  ProjectInput,
  ProjectListFilter,
  ProjectRowDTO,
  ProjectSaveResult,
  ProjectTimelineDTO,
  RateVersionInput,
  TimelineWeek,
  Uuid,
  WeekRef,
} from '../dto/index.ts'
import { parseOtCodes } from '../dto/project-classifications.ts'
import { displayStatusOf, lockedReasonOf } from '../dto/week-grid.ts'
import { mockToday } from './clock.ts'
import { db } from './db.ts'
import { ensurePeriod, weekGrid } from './week-grid.ts'

type ProjectRow = (typeof db.projects)[number]
type PeriodRow = (typeof db.periods)[number]

/** A new row's id: deterministic, never Math.random (spec/19 §1), and apart from the fixtures' variant. */
function newId(group: string, count: number): Uuid {
  return `${group}-0000-7000-9000-${String(count + 1).padStart(12, '0')}`
}

function weekEndsOn(tenantId: Uuid): Dow {
  const tenant = db.tenants.find((t) => t.id === tenantId)
  if (!tenant) throw new Error(`Unknown tenant ${tenantId}`)
  return tenant.settings.weekEndingDow
}

function projectOf(tenantId: Uuid, projectId: Uuid): ProjectRow | undefined {
  // The tenant check is what RLS does in step 4: another company's project is not found.
  return db.projects.find((p) => p.id === projectId && p.tenantId === tenantId)
}

const isClosed = (p: ProjectRow) => p.status === 'completed' || p.status === 'archived'

function timeline(p: ProjectRow): IsoDate[] {
  return timelineWeekEndings({
    startDate: p.startDate,
    endDate: p.actualEndDate,
    weekEndsOn: weekEndsOn(p.tenantId),
    today: mockToday(),
  })
}

function nextDeadline(p: ProjectRow): IsoDate | null {
  if (isClosed(p)) return null
  return nextStateFilingDeadline({
    startDate: p.startDate,
    lastAcceptedSubmissionAt: p.lastAcceptedSubmissionAt,
  })
}

/** The version that counts for a week: the correction once there is one (spec/04 §7.1). */
function currentPeriod(rows: PeriodRow[]): PeriodRow | undefined {
  return rows.find((r) => r.status !== 'corrected') ?? rows.at(-1)
}

const isLocked = (status: PeriodRow['status']) => lockedReasonOf(status) !== null
const isOpen = (status: PeriodRow['status']) => !isLocked(status)

/**
 * One week as the timeline and the list show it. Historical weeks carry only
 * totals (spec/19 §4); every other week is computed by the engine, the same
 * way the grid computes it, so the two screens never disagree.
 */
function weekOf(p: ProjectRow, weekEnding: IsoDate, expected: Map<IsoDate, number>): TimelineWeek {
  const rows = db.periods.filter((r) => r.projectId === p.id && r.weekEnding === weekEnding)
  const row = currentPeriod(rows)
  const base = {
    weekEnding,
    versions: rows.length,
    expectedPayrollNumber: expected.get(weekEnding) ?? null,
  }
  const inPause = db.workPauses.some(
    (w) => w.projectId === p.id && w.fromDate <= weekEnding && w.toDate >= addDays(weekEnding, -6),
  )

  if (!row) {
    return {
      ...base,
      periodId: null,
      status: null,
      displayStatus: null,
      payrollNumber: null,
      isNoWork: inPause,
      noEntries: !inPause,
      totalHours: null,
      workerCount: null,
      gross: null,
      findings: { hard: 0, soft: 0 },
      locked: false,
    }
  }

  const outcome = db.submissions.find((s) => s.periodId === row.id)?.outcome
  if (row.summary) {
    const total = row.summary.totalHours
    return {
      ...base,
      periodId: row.id,
      status: row.status,
      displayStatus: displayStatusOf(row.status, outcome, 0),
      payrollNumber: row.payrollNumber,
      isNoWork: row.isNoWork,
      noEntries: !row.isNoWork && dec(total).isZero(),
      totalHours: total,
      workerCount: row.summary.workerCount,
      gross: row.summary.gross,
      findings: { hard: 0, soft: 0 },
      locked: isLocked(row.status),
    }
  }

  const grid = weekGrid(p.id, weekEnding)
  const total = dec(grid.totals.st).plus(grid.totals.ot)
  const open = isOpen(row.status)
  // Findings matter while the week can still change; a signed week was
  // checked when it was signed.
  const hard = open ? grid.findings.filter((f) => f.severity === 'hard').length : 0
  const soft = open ? grid.findings.filter((f) => f.severity === 'soft').length : 0
  return {
    ...base,
    periodId: row.id,
    status: row.status,
    displayStatus: grid.displayStatus,
    payrollNumber: row.payrollNumber,
    isNoWork: grid.isNoWork || inPause,
    noEntries: !grid.isNoWork && !inPause && total.isZero(),
    totalHours: hours(total),
    workerCount: grid.rows.filter((r) => !dec(r.totalHours).isZero()).length,
    gross: grid.totals.gross,
    findings: { hard, soft },
    locked: !open,
  }
}

function weeksOf(p: ProjectRow): TimelineWeek[] {
  const endings = timeline(p)
  const expected = expectedPayrollNumbers(
    endings.map((we) => ({
      weekEnding: we,
      payrollNumber:
        currentPeriod(db.periods.filter((r) => r.projectId === p.id && r.weekEnding === we))
          ?.payrollNumber ?? null,
    })),
    p.nextPayrollNumber,
  )
  return endings.map((we) => weekOf(p, we, expected))
}

const refOf = (w: TimelineWeek): WeekRef => ({
  weekEnding: w.weekEnding,
  displayStatus: w.displayStatus,
  noEntries: w.noEntries,
})

function nameOf(list: { id: Uuid; name?: string; legalName?: string }[], id: Uuid | null) {
  const row = id ? list.find((x) => x.id === id) : undefined
  return row ? (row.name ?? row.legalName ?? null) : null
}

export function listProjects(tenantId: Uuid, filter: ProjectListFilter = {}): ProjectRowDTO[] {
  const status = filter.status ?? 'active'
  const inFilter = (p: ProjectRow) =>
    filter.openOnly
      ? p.status === 'active'
      : status === 'active'
        ? p.status === 'active' || p.status === 'draft'
        : status === 'paused'
          ? p.status === 'paused'
          : isClosed(p)

  const rows = db.projects
    .filter((p) => p.tenantId === tenantId && inFilter(p))
    .map((p): ProjectRowDTO => {
      const weeks = weeksOf(p)
      const openEndings = new Set(
        openWeekEndings({
          startDate: p.startDate,
          endDate: p.actualEndDate,
          weekEndsOn: weekEndsOn(p.tenantId),
          today: mockToday(),
          periods: db.periods.filter((r) => r.projectId === p.id),
        }),
      )
      const open = weeks.filter((w) => openEndings.has(w.weekEnding))
      const newest = weeks.at(-1)
      const oldestOpen = open[0]
      return {
        id: p.id,
        name: p.name,
        prcNumber: p.prcNumber,
        awardingBody: nameOf(db.awardingBodies, p.awardingBodyId),
        ourRole: p.ourRole,
        status: p.status,
        federallyFunded: p.federalReporting,
        nextDeadline: nextDeadline(p),
        currentWeek: newest ? refOf(newest) : null,
        oldestOpenWeek: oldestOpen ? refOf(oldestOpen) : null,
        openFindings: open.reduce((n, w) => n + w.findings.hard + w.findings.soft, 0),
      }
    })

  if (!filter.openOnly) return rows.sort((a, b) => a.name.localeCompare(b.name))
  // spec/03 §4.4: only projects with an open week, the oldest open week on top.
  return rows
    .filter((r) => r.oldestOpenWeek !== null)
    .sort(
      (a, b) =>
        (a.oldestOpenWeek?.weekEnding ?? '').localeCompare(b.oldestOpenWeek?.weekEnding ?? '') ||
        a.name.localeCompare(b.name),
    )
}

export function projectTimeline(tenantId: Uuid, projectId: Uuid): ProjectTimelineDTO | null {
  const p = projectOf(tenantId, projectId)
  if (!p) return null
  const classificationIds = new Set(
    db.projectClassifications.filter((c) => c.projectId === p.id).map((c) => c.classificationId),
  )
  return {
    project: {
      id: p.id,
      name: p.name,
      status: p.status,
      ourRole: p.ourRole,
      prcNumber: p.prcNumber,
      federalWdNumber: p.federalWdNumber,
      federalWdMod: p.federalWdMod,
      awardingBody: nameOf(db.awardingBodies, p.awardingBodyId),
      generalContractor: nameOf(db.primeContractors, p.primeContractorId),
      classificationCount: classificationIds.size,
      nextDeadline: nextDeadline(p),
      nextPayrollNumber: p.nextPayrollNumber,
      firstWeekEnding: weekEndingOf(p.startDate, weekEndsOn(p.tenantId)),
    },
    weeks: weeksOf(p).reverse(),
  }
}

/** Creates the period of a week if it has none, so the week can be opened or marked. */
export function openWeek(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Uuid {
  if (!projectOf(tenantId, projectId)) throw new Error(`Unknown project ${projectId}`)
  return ensurePeriod(projectId, weekEnding).id
}

// ---------------------------------------------------------------------------
// The form

const EMPTY: ProjectInput = {
  name: '',
  prcNumber: '',
  awardingBody: '',
  // "uglavnom podizvođač" (spec/03 §4.3 step 1)
  ourRole: 'sub',
  generalContractor: '',
  projectNumber: '',
  county: '',
  startDate: '',
  federallyFunded: false,
  federalWdNumber: '',
  federalWdMod: '',
  expectedEndDate: '',
  siteAddress: '',
  workPauses: [],
  retentionYears: '6',
  status: 'active',
}

export function projectForm(tenantId: Uuid, projectId: Uuid | null): ProjectFormDTO | null {
  const p = projectId === null ? undefined : projectOf(tenantId, projectId)
  if (projectId !== null && !p) return null
  const values: ProjectInput = p
    ? {
        name: p.name,
        prcNumber: p.prcNumber ?? '',
        awardingBody: nameOf(db.awardingBodies, p.awardingBodyId) ?? '',
        ourRole: p.ourRole,
        generalContractor: nameOf(db.primeContractors, p.primeContractorId) ?? '',
        projectNumber: p.projectNumber ?? '',
        county: p.county ?? '',
        startDate: p.startDate,
        federallyFunded: p.federalReporting,
        federalWdNumber: p.federalWdNumber ?? '',
        federalWdMod: p.federalWdMod === null ? '' : String(p.federalWdMod),
        expectedEndDate: p.expectedEndDate ?? '',
        siteAddress: p.siteAddress ?? '',
        workPauses: db.workPauses
          .filter((w) => w.projectId === p.id)
          .map((w) => ({ from: w.fromDate, to: w.toDate, reason: w.reason ?? '' })),
        retentionYears: String(p.retentionYears),
        status: p.status,
      }
    : EMPTY
  return {
    projectId: p?.id ?? null,
    values,
    weekEndsOn: weekEndsOn(tenantId),
    awardingBodies: db.awardingBodies.filter((a) => a.tenantId === tenantId).map((a) => a.name),
    generalContractors: db.primeContractors
      .filter((c) => c.tenantId === tenantId)
      .map((c) => c.legalName),
  }
}

/** Finds a row by name in this company, or adds it. Empty name is null. */
function awardingBodyId(tenantId: Uuid, name: string): Uuid | null {
  if (name === '') return null
  const found = db.awardingBodies.find(
    (a) => a.tenantId === tenantId && a.name.toLowerCase() === name.toLowerCase(),
  )
  if (found) return found.id
  const id = newId('0192e000', db.awardingBodies.length)
  db.awardingBodies.push({ id, tenantId, name, kind: 'other' })
  return id
}

function primeContractorId(tenantId: Uuid, name: string): Uuid | null {
  if (name === '') return null
  const found = db.primeContractors.find(
    (c) => c.tenantId === tenantId && c.legalName.toLowerCase() === name.toLowerCase(),
  )
  if (found) return found.id
  const id = newId('0192f000', db.primeContractors.length)
  db.primeContractors.push({ id, tenantId, legalName: name })
  return id
}

/**
 * spec/04: U (tenant_id, prc_number, project_number). A missing contract number
 * counts as a value here: two projects with the same PRC and no contract
 * number are the same job twice, which is what the rule is there to stop.
 */
function duplicateOf(tenantId: Uuid, input: ProjectInput, selfId: Uuid | null) {
  return db.projects.find(
    (p) =>
      p.tenantId === tenantId &&
      p.id !== selfId &&
      p.prcNumber === input.prcNumber &&
      (p.projectNumber ?? '') === input.projectNumber,
  )
}

function fieldsOf(tenantId: Uuid, input: ProjectInput) {
  return {
    name: input.name,
    projectNumber: input.projectNumber || null,
    county: input.county || null,
    awardingBodyId: awardingBodyId(tenantId, input.awardingBody),
    primeContractorId: primeContractorId(tenantId, input.generalContractor),
    ourRole: input.ourRole,
    prcNumber: input.prcNumber,
    federalWdNumber: input.federallyFunded ? input.federalWdNumber : null,
    federalWdMod:
      input.federallyFunded && input.federalWdMod !== '' ? Number(input.federalWdMod) : null,
    // A federally funded NY job is reported to both (spec/01 §2, 05 §2).
    funding: input.federallyFunded ? ('both' as const) : ('state_only' as const),
    federalReporting: input.federallyFunded,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate || null,
    siteAddress: input.siteAddress || null,
    retentionYears: Number(input.retentionYears),
    status: input.status,
  }
}

function savePauses(tenantId: Uuid, projectId: Uuid, input: ProjectInput) {
  for (let i = db.workPauses.length - 1; i >= 0; i--) {
    if (db.workPauses[i]?.projectId === projectId) db.workPauses.splice(i, 1)
  }
  for (const w of input.workPauses) {
    db.workPauses.push({
      id: newId('01927000', db.workPauses.length),
      tenantId,
      projectId,
      fromDate: w.from,
      toDate: w.to,
      reason: w.reason || null,
    })
  }
}

/** `input` is already valid against ProjectInputSchema; this adds what needs the data. */
export function createProject(tenantId: Uuid, input: ProjectInput): ProjectSaveResult {
  const taken = duplicateOf(tenantId, input, null)
  if (taken)
    return {
      ok: false,
      errors: { prcNumber: { code: 'prcTaken', values: { Project: taken.name } } },
    }
  const id = newId('01924000', db.projects.length)
  db.projects.push({
    id,
    tenantId,
    stateCode: 'NY',
    nyReporting: true,
    nycSystem: false,
    actualEndDate: null,
    nextPayrollNumber: 1,
    lastAcceptedSubmissionAt: null,
    ...fieldsOf(tenantId, input),
  })
  savePauses(tenantId, id, input)
  return { ok: true, id }
}

export function updateProject(
  tenantId: Uuid,
  projectId: Uuid,
  input: ProjectInput,
): ProjectSaveResult {
  const p = projectOf(tenantId, projectId)
  if (!p) throw new Error(`Unknown project ${projectId}`)
  // A closed project only changes its status: that is how it is reopened (spec/19 §7, locked).
  if (isClosed(p)) {
    p.status = input.status
    return { ok: true, id: projectId }
  }
  const taken = duplicateOf(tenantId, input, projectId)
  if (taken)
    return {
      ok: false,
      errors: { prcNumber: { code: 'prcTaken', values: { Project: taken.name } } },
    }
  Object.assign(p, fieldsOf(tenantId, input))
  savePauses(tenantId, projectId, input)
  return { ok: true, id: projectId }
}

// ---------------------------------------------------------------------------
// Classifications and rates

type RateRow = (typeof db.projectClassifications)[number]

const LOCKED_STATUSES = new Set(['signed', 'submitted', 'corrected'])

/** A signed or submitted week has a day inside this version's dates. */
function usedBySignedWeek(r: RateRow): boolean {
  return db.periods.some(
    (w) =>
      w.projectId === r.projectId &&
      LOCKED_STATUSES.has(w.status) &&
      addDays(w.weekEnding, -6) <= (r.effectiveTo ?? '9999-12-31') &&
      w.weekEnding >= r.effectiveFrom,
  )
}

const officialLabel = (classificationId: Uuid) =>
  db.classificationCatalog.find((k) => k.id === classificationId)?.officialLabel ?? ''

export function projectClassifications(
  tenantId: Uuid,
  projectId: Uuid,
): ProjectClassificationsDTO | null {
  const p = projectOf(tenantId, projectId)
  if (!p) return null
  const rates = db.projectClassifications.filter((c) => c.projectId === p.id)
  const latest = new Map<Uuid, IsoDate>()
  for (const r of rates) {
    const seen = latest.get(r.classificationId)
    if (!seen || r.effectiveFrom > seen) latest.set(r.classificationId, r.effectiveFrom)
  }

  const rows = rates
    .map(
      (r): ClassificationRateRow => ({
        id: r.id,
        classificationId: r.classificationId,
        officialLabel: officialLabel(r.classificationId),
        displayLabel: r.displayLabel,
        baseRate: r.wdBaseRate,
        supplement: r.wdFringeRate,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        otCodes: r.otCodes,
        source: r.sourceRateId ? 'cache' : 'manual',
        apprenticeRatio: r.apprenticeRatio,
        usedBySignedWeek: usedBySignedWeek(r),
        isLatest: latest.get(r.classificationId) === r.effectiveFrom,
      }),
    )
    .sort(
      (a, b) =>
        a.officialLabel.localeCompare(b.officialLabel) ||
        b.effectiveFrom.localeCompare(a.effectiveFrom),
    )

  const current = isClosed(p) ? undefined : timeline(p).at(-1)
  const missing = current
    ? [...latest.keys()]
        .filter(
          (id) =>
            !rates.some(
              (r) =>
                r.classificationId === id &&
                r.effectiveFrom <= current &&
                (r.effectiveTo ?? '9999-12-31') >= current,
            ),
        )
        .map((id) => ({ classificationId: id, officialLabel: officialLabel(id) }))
        .sort((a, b) => a.officialLabel.localeCompare(b.officialLabel))
    : []

  return {
    project: { id: p.id, name: p.name, status: p.status },
    currentWeekEnding: current ?? null,
    rows,
    missingForCurrentWeek: missing,
    catalog: db.classificationCatalog
      .map((k) => ({ id: k.id, trade: k.trade, officialLabel: k.officialLabel }))
      .sort((a, b) => a.officialLabel.localeCompare(b.officialLabel)),
  }
}

export function addClassification(
  tenantId: Uuid,
  projectId: Uuid,
  input: ClassificationInput,
): ClassificationSaveResult {
  const p = projectOf(tenantId, projectId)
  if (!p) throw new Error(`Unknown project ${projectId}`)
  const label = officialLabel(input.classificationId)
  if (!label) return { ok: false, errors: { classificationId: { code: 'classificationRequired' } } }
  if (
    db.projectClassifications.some(
      (c) => c.projectId === p.id && c.classificationId === input.classificationId,
    )
  ) {
    return { ok: false, errors: { classificationId: { code: 'alreadyOnProject' } } }
  }
  db.projectClassifications.push({
    id: newId('01926000', db.projectClassifications.length),
    tenantId,
    projectId: p.id,
    classificationId: input.classificationId,
    displayLabel: input.displayLabel || label,
    wdBaseRate: money(input.baseRate),
    wdFringeRate: money(input.supplement),
    paidBaseRate: money(input.baseRate),
    cashInLieuRate: '0.00',
    apprenticeRatio: input.apprenticeRatio || null,
    otCodes: parseOtCodes(input.otCodes),
    holidayCode: null,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: null,
    sourceRateId: null,
  })
  return { ok: true }
}

/**
 * "New rate version from a date" (spec/03 §4.4). The old row keeps its rates;
 * it only gets an end date the day before the new one starts, so every week
 * before that date is computed exactly as before.
 */
export function addRateVersion(
  tenantId: Uuid,
  projectId: Uuid,
  input: RateVersionInput,
): ClassificationSaveResult {
  const p = projectOf(tenantId, projectId)
  const from = db.projectClassifications.find(
    (c) => c.id === input.rowId && c.projectId === projectId,
  )
  if (!p || !from) throw new Error(`Unknown rate ${input.rowId}`)
  const latest = db.projectClassifications
    .filter((c) => c.projectId === projectId && c.classificationId === from.classificationId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
  if (!latest) throw new Error(`Unknown rate ${input.rowId}`)
  if (input.effectiveFrom <= latest.effectiveFrom) {
    return {
      ok: false,
      errors: { effectiveFrom: { code: 'versionAfter', values: { date: latest.effectiveFrom } } },
    }
  }
  const dayBefore = addDays(input.effectiveFrom, -1)
  if (latest.effectiveTo === null || latest.effectiveTo > dayBefore) latest.effectiveTo = dayBefore
  db.projectClassifications.push({
    ...latest,
    id: newId('01926000', db.projectClassifications.length),
    wdBaseRate: money(input.baseRate),
    wdFringeRate: money(input.supplement),
    paidBaseRate: money(input.baseRate),
    otCodes: parseOtCodes(input.otCodes),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: null,
    sourceRateId: null,
  })
  return { ok: true }
}

/** Label and ratio always; rates and OT codes only while no signed week uses them. */
export function editClassification(
  tenantId: Uuid,
  projectId: Uuid,
  input: ClassificationEditInput,
): ClassificationSaveResult {
  const row = db.projectClassifications.find(
    (c) => c.id === input.rowId && c.projectId === projectId && c.tenantId === tenantId,
  )
  if (!row) throw new Error(`Unknown rate ${input.rowId}`)
  const codes = parseOtCodes(input.otCodes)
  const ratesChange =
    money(input.baseRate) !== money(row.wdBaseRate) ||
    money(input.supplement) !== money(row.wdFringeRate) ||
    codes.join(',') !== row.otCodes.join(',')
  if (ratesChange && usedBySignedWeek(row)) {
    return { ok: false, errors: { baseRate: { code: 'rateLocked' } } }
  }
  row.displayLabel = input.displayLabel || officialLabel(row.classificationId)
  row.apprenticeRatio = input.apprenticeRatio || null
  if (ratesChange) {
    row.wdBaseRate = money(input.baseRate)
    row.wdFringeRate = money(input.supplement)
    row.paidBaseRate = money(input.baseRate)
    row.otCodes = codes
  }
  return { ok: true }
}
