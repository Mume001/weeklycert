// The weekly grid over the fixtures (spec/19 §3 and §4).
//
// The engine is real (spec/19 §1 point 4): this file only shapes the fixtures
// into the input `computeWeek()` expects, and shapes its output into the DTO
// the screen reads. Nothing here decides a rate, an hour or a finding.
import {
  addDays,
  computeWeek,
  expectedPayrollNumbers,
  timelineWeekEndings,
  type WeekInput,
  type WeekResult,
  type WorkerPayrollInput,
  weekDates,
} from '@wc/core'
import type { GridRow, IsoDate, Uuid, WeekGridDTO } from '../dto/index.ts'
import { displayStatusOf, gridRowFromLine, lockedReasonOf } from '../dto/week-grid.ts'
import { mockToday } from './clock.ts'
import { db } from './db.ts'

/**
 * Cells edited during this run of the demo. The fixtures on disk stay as they
 * are; step 4 replaces this with `time_entries` in Postgres.
 *
 * It hangs off `globalThis` and not off the module, because Next bundles the
 * page and the route handler separately: a plain module-level Map exists twice
 * in one server process, PATCH writes into one copy and the page reads the
 * other, and an hour typed into the grid disappears on refresh. That is the
 * acceptance criterion in 03 §4.5, and it is the whole reason this is not a
 * bare `new Map()`.
 */
const store = globalThis as typeof globalThis & {
  __wcWeekEdits?: Map<string, (string | null)[]>
  __wcNoWork?: Map<Uuid, boolean>
  __wcPayroll?: Map<string, WorkerPayrollInput>
}
if (!store.__wcWeekEdits) store.__wcWeekEdits = new Map<string, (string | null)[]>()
if (!store.__wcNoWork) store.__wcNoWork = new Map<Uuid, boolean>()
if (!store.__wcPayroll) store.__wcPayroll = new Map<string, WorkerPayrollInput>()
const edits = store.__wcWeekEdits
const noWork = store.__wcNoWork
/**
 * The payroll side of the week: gross for all work, deductions and net, typed
 * on the review screen (spec/03 §4.5) or imported. The hours cannot know them,
 * and without them the engine cannot check net pay against the deductions.
 */
const payroll = store.__wcPayroll

const editKey = (periodId: Uuid, rowId: string) => `${periodId}|${rowId}`

function period(projectId: Uuid, weekEnding: IsoDate) {
  // A corrected week is superseded by the row that corrects it, so the newest
  // row for that week ending is the one the grid opens (spec/04 §7.1).
  const rows = db.periods.filter((p) => p.projectId === projectId && p.weekEnding === weekEnding)
  return rows.find((p) => p.correctsPeriodId !== null) ?? rows[0]
}

/**
 * The period of a week, created `open` when the week has none yet. In step 4 a
 * job does this every Sunday for every active project (spec/04 §7 step 1, the
 * first row of §7.1); the mock does it when the week is first opened. Only a
 * week between the project's first week and the week in progress has one.
 */
export function ensurePeriod(projectId: Uuid, weekEnding: IsoDate) {
  const existing = period(projectId, weekEnding)
  if (existing) return existing
  const project = db.projects.find((p) => p.id === projectId)
  const tenant = project && db.tenants.find((t) => t.id === project.tenantId)
  if (!project || !tenant) throw new Error(`Unknown project ${projectId}`)
  // The week in progress has its period too: the job makes it on the Sunday it
  // starts. Moving "today" one week on makes the timeline end on that week.
  const onTimeline = timelineWeekEndings({
    startDate: project.startDate,
    endDate: project.actualEndDate,
    weekEndsOn: tenant.settings.weekEndingDow,
    today: addDays(mockToday(), 7),
  }).includes(weekEnding)
  if (!onTimeline) throw new Error(`No period for ${projectId} week ending ${weekEnding}`)
  const row = {
    id: `01928000-0000-7000-9000-${String(db.periods.length + 1).padStart(12, '0')}`,
    tenantId: project.tenantId,
    projectId,
    weekEnding,
    status: 'open' as const,
    isNoWork: false,
    isFinal: false,
    payrollNumber: null,
    correctsPeriodId: null,
    lockedAt: null,
    summary: null,
  }
  db.periods.push(row)
  return row
}

function classificationOf(projectClassificationId: Uuid) {
  return db.projectClassifications.find((c) => c.id === projectClassificationId)
}

interface WeekRow {
  rowId: string
  workerId: Uuid
  classificationId: Uuid
  paidStRate: string | null
  days: (string | null)[]
}

/**
 * The rows of the week: the ones the fixtures carry, with this run's edits laid
 * over them, plus rows that exist only because they were edited. That last part
 * is what "Copy last week" produces: a crew that is not in this week yet.
 */
function rowsOf(periodId: Uuid): WeekRow[] {
  const fromFixtures = db.timeEntries
    .filter((e) => e.periodId === periodId)
    .map((e): WeekRow => {
      const classification = classificationOf(e.projectClassificationId)
      const rowId = `${e.workerId}:${classification?.classificationId ?? ''}`
      return {
        rowId,
        workerId: e.workerId,
        classificationId: classification?.classificationId ?? '',
        paidStRate: e.paidStRate ?? null,
        days: edits.get(editKey(periodId, rowId)) ?? e.days,
      }
    })

  const known = new Set(fromFixtures.map((row) => row.rowId))
  const added = [...edits.entries()].flatMap(([key, days]): WeekRow[] => {
    const [id, rowId = ''] = key.split('|')
    if (id !== periodId || known.has(rowId)) return []
    const [workerId = '', classificationId = ''] = rowId.split(':')
    return [{ rowId, workerId, classificationId, paidStRate: null, days }]
  })

  return [...fromFixtures, ...added]
}

/** Everything the engine needs for this week (spec/01 §4). */
export function buildWeekInput(projectId: Uuid, weekEnding: IsoDate): WeekInput {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) throw new Error(`Unknown project ${projectId}`)
  const tenant = db.tenants.find((t) => t.id === project.tenantId)
  if (!tenant) throw new Error(`Unknown tenant ${project.tenantId}`)
  const row = ensurePeriod(projectId, weekEnding)

  const dates = weekDates(weekEnding)
  const entries = rowsOf(row.id).flatMap((line) =>
    line.days.flatMap((hours, index) => {
      const workDate = dates[index]
      if (hours === null || !workDate) return []
      return [
        {
          workerId: line.workerId,
          classificationId: line.classificationId,
          workDate,
          hours,
          stOverride: null,
          otOverride: null,
          paidStRate: line.paidStRate,
          paidOtRate: null,
          isHoliday: false,
          holidayMultiplier: null,
        },
      ]
    }),
  )

  const workerIds = new Set(entries.map((e) => e.workerId))
  const workers = db.workers
    .filter((w) => workerIds.has(w.id))
    .map((w) => {
      const pii = db.workerPii.find((p) => p.workerId === w.id)
      const record = db.apprenticeRecords.find((a) => a.workerId === w.id)
      return {
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        middleName: w.middleName,
        level: w.level,
        status: w.status,
        ssnLast4: pii?.ssnLast4 ?? null,
        dateOfBirth: pii?.dateOfBirth ?? null,
        address: pii?.address ?? null,
        apprentice: record
          ? {
              programName: record.programName,
              periodNo: record.periodNo,
              pctOfJourney: record.pctOfJourney,
              validFrom: record.validFrom,
              validTo: record.validTo,
            }
          : null,
        allocations: db.fringeAllocations
          .filter((a) => a.workerId === w.id)
          .map((a) => ({
            planId: a.fringePlanId,
            hourlyCreditOverride: a.hourlyCreditOverride,
            effectiveFrom: a.effectiveFrom,
            effectiveTo: a.effectiveTo,
          })),
      }
    })

  const classifications = db.projectClassifications
    .filter((c) => c.projectId === projectId)
    .map((c) => ({
      id: c.id,
      classificationId: c.classificationId,
      officialLabel:
        db.classificationCatalog.find((k) => k.id === c.classificationId)?.officialLabel ??
        c.displayLabel,
      displayLabel: c.displayLabel,
      wdBaseRate: c.wdBaseRate,
      wdFringeRate: c.wdFringeRate,
      paidBaseRate: c.paidBaseRate,
      cashInLieuRate: c.cashInLieuRate,
      apprenticeRatio: c.apprenticeRatio,
      otCodes: c.otCodes,
      holidayCode: c.holidayCode,
      effectiveFrom: c.effectiveFrom,
      effectiveTo: c.effectiveTo,
    }))

  return {
    tenant: {
      annualHoursBasis: tenant.settings.annualHoursBasis,
      federalOtEnabled: tenant.settings.federalOtEnabled,
      mergeDeductions: tenant.settings.mergeDeductions,
      strictPii: tenant.settings.strictPii,
    },
    project: {
      id: project.id,
      name: project.name,
      prcNumber: project.prcNumber,
      federalWdNumber: project.federalWdNumber,
      nyReporting: project.nyReporting,
      federalReporting: project.federalReporting,
      status: project.status,
      startDate: project.startDate,
      actualEndDate: project.actualEndDate,
      lastAcceptedSubmissionAt: project.lastAcceptedSubmissionAt,
      finalWeekEnding: null,
      retentionYears: project.retentionYears,
    },
    period: {
      id: row.id,
      weekEnding: row.weekEnding,
      weekEndsOn: tenant.settings.weekEndingDow,
      status: row.status,
      isNoWork: noWork.get(row.id) ?? row.isNoWork,
      isFinal: row.isFinal,
      lockedAt: row.lockedAt,
      payrollNumber: row.payrollNumber,
    },
    intent: 'review',
    classifications,
    workers,
    plans: db.fringePlans
      .filter((p) => p.tenantId === project.tenantId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        funding: p.funding,
        annualCost: p.annualCost,
        annualHoursBasis: p.annualHoursBasis,
        hourlyCredit: p.hourlyCredit,
        annualize: p.annualize,
        isLegallyRequired: p.isLegallyRequired,
      })),
    entries,
    payroll: payrollOf(row.id),
    context: {
      today: mockToday(),
      payDate: null,
      priorWeeks: db.periods
        .filter((p) => p.projectId === projectId && p.weekEnding < weekEnding)
        .map((p) => ({ weekEnding: p.weekEnding, status: p.status })),
      wageScheduleUpdatedAt: null,
      retroactiveEffectiveFrom: null,
      oldestReportWeekEnding: null,
      catalogLabels: db.classificationCatalog.map((c) => c.officialLabel),
    },
  }
}

/**
 * The payroll number each unsigned week of this project will get. The rule is
 * core's (spec/04 §7.1): numbers are handed out at signing, in order, without
 * gaps, so the number a week shows before it is signed is never a guess made
 * in the component.
 */
function expectedNumbers(projectId: Uuid): Map<IsoDate, number> {
  const project = db.projects.find((p) => p.id === projectId)
  const tenant = project && db.tenants.find((t) => t.id === project.tenantId)
  if (!project || !tenant) return new Map()
  const weeks = timelineWeekEndings({
    startDate: project.startDate,
    endDate: project.actualEndDate,
    weekEndsOn: tenant.settings.weekEndingDow,
    today: addDays(mockToday(), 7),
  }).map((weekEnding) => ({
    weekEnding,
    payrollNumber: period(projectId, weekEnding)?.payrollNumber ?? null,
  }))
  return expectedPayrollNumbers(weeks, project.nextPayrollNumber)
}

/** The engine result, shaped into what the screen reads (spec/19 §3). */
export function toWeekGridDTO(input: WeekInput, result: WeekResult): WeekGridDTO {
  const projectRow = db.projects.find((p) => p.id === input.project.id)
  const submission = db.submissions.find((s) => s.periodId === input.period.id)
  const hard = result.findings.filter((f) => f.severity === 'hard').length
  const outcome = submission?.outcome
  const lockedReason = lockedReasonOf(input.period.status)

  return {
    project: {
      id: input.project.id,
      name: input.project.name,
      prcNumber: input.project.prcNumber ?? '',
      federallyFunded: projectRow?.federalReporting ?? false,
    },
    weekEnding: input.period.weekEnding,
    weekEndsOn: input.period.weekEndsOn,
    isNoWork: input.period.isNoWork,
    status: input.period.status,
    displayStatus: displayStatusOf(input.period.status, outcome, hard),
    ...(outcome === undefined ? {} : { submissionOutcome: outcome }),
    payrollNumber: input.period.payrollNumber,
    expectedPayrollNumber:
      input.period.payrollNumber === null
        ? (expectedNumbers(input.project.id).get(input.period.weekEnding) ?? null)
        : null,
    rows: result.rows.map(gridRowFromLine),
    totals: result.totals,
    findings: result.findings,
    ...(lockedReason === null ? {} : { lockedReason }),
  }
}

export function weekGrid(projectId: Uuid, weekEnding: IsoDate): WeekGridDTO {
  const input = buildWeekInput(projectId, weekEnding)
  return toWeekGridDTO(input, computeWeek(input))
}

/** Where a period sits, so a route that has only its id can find the week. */
export function periodLocation(periodId: Uuid): { projectId: Uuid; weekEnding: IsoDate } {
  const row = db.periods.find((p) => p.id === periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  return { projectId: row.projectId, weekEnding: row.weekEnding }
}

/**
 * One cell, as the grid autosaves it. `raw` is already parsed into hours by
 * parseCell in the browser; here it is the total for that day, or "" to clear.
 */
export function patchCell(periodId: Uuid, rowId: string, day: number, raw: string): GridRow {
  const row = db.periods.find((p) => p.id === periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const current = edits.get(editKey(periodId, rowId)) ??
    db.timeEntries
      .filter((e) => e.periodId === periodId)
      .map((e) => ({
        rowId: `${e.workerId}:${classificationOf(e.projectClassificationId)?.classificationId}`,
        days: e.days,
      }))
      .find((e) => e.rowId === rowId)?.days ?? [null, null, null, null, null, null, null]

  const next = [...current]
  next[day] = raw === '' ? null : raw
  edits.set(editKey(periodId, rowId), next)
  // spec/04 §7.1: an edit in `in_review` puts the week back to `open`.
  if (row.status === 'in_review') row.status = 'open'

  const dto = weekGrid(row.projectId, row.weekEnding)
  const updated = dto.rows.find((r) => r.id === rowId)
  if (!updated) throw new Error(`Row ${rowId} is not in week ${row.weekEnding}`)
  return updated
}

/** "Copy last week": the same crew and the same hours, one week earlier (spec/14 §8, WCAG 3.3.7). */
export function copyPreviousWeek(periodId: Uuid): WeekGridDTO {
  const row = db.periods.find((p) => p.id === periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const previous = db.periods
    .filter((p) => p.projectId === row.projectId && p.weekEnding < row.weekEnding)
    .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding))
    .pop()
  if (previous) {
    for (const line of rowsOf(previous.id)) {
      edits.set(editKey(row.id, line.rowId), [...line.days])
    }
  }
  return weekGrid(row.projectId, row.weekEnding)
}

export function markNoWork(periodId: Uuid): void {
  const row = db.periods.find((p) => p.id === periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  noWork.set(periodId, true)
  for (const line of rowsOf(periodId)) {
    edits.set(editKey(periodId, line.rowId), [null, null, null, null, null, null, null])
  }
}

/** What the customer typed on the review screen, as the engine takes it. */
export function payrollOf(periodId: Uuid): WorkerPayrollInput[] {
  return [...payroll.entries()]
    .filter(([key]) => key.startsWith(`${periodId}|`))
    .map(([, value]) => value)
}

export function setPayroll(periodId: Uuid, row: WorkerPayrollInput): void {
  payroll.set(`${periodId}|${row.workerId}`, row)
}

/** Only for tests: forget this run's edits. */
export function resetWeekEdits(): void {
  edits.clear()
  noWork.clear()
  payroll.clear()
}
