// Review, signature and filing over the fixtures (spec/03 §4.5).
//
// The numbers are the engine's, as everywhere else; this file only shapes them
// and moves the period through the states of spec/04 §7.1. What it does not do
// is generate anything: there is no XML, no PDF and no S3 in this phase
// (spec/19 §11), so a "report" here is the row of spec/04 §3.7 plus the static
// example of what the file will hold.
import {
  attestationPoints,
  attestationText,
  computeWeek,
  dec,
  hours,
  money,
  type WeekResult,
  type WorkerPayrollInput,
} from '@wc/core'
import type {
  Deduction,
  IsoDate,
  PayrollInput,
  ReportStatusDTO,
  ReportsDTO,
  ReportVersion,
  ReviewDTO,
  ReviewWorker,
  SignerDTO,
  SignInput,
  SubmissionDTO,
  Uuid,
} from '../dto/index.ts'
import { displayStatusOf, lockedReasonOf } from '../dto/week-grid.ts'
import { mockNow } from './clock.ts'
import { db } from './db.ts'
import { SAMPLE_NY_XML } from './fixtures/sample-ny-payroll.ts'
import { buildWeekInput, ensurePeriod, setPayroll, weekGrid } from './week-grid.ts'

type PeriodRow = (typeof db.periods)[number]
type ReportRow = (typeof db.reports)[number]

/**
 * Progress of the fake generate job, per report (spec/19 §2). Each poll of
 * api/v1/reports/[id]/status moves it on, so the screen really shows a job
 * running without a worker existing yet.
 */
const store = globalThis as typeof globalThis & { __wcReportProgress?: Map<Uuid, number> }
if (!store.__wcReportProgress) store.__wcReportProgress = new Map<Uuid, number>()
const progress = store.__wcReportProgress

const newId = (group: string, count: number): Uuid =>
  `${group}-0000-7000-9000-${String(count + 1).padStart(12, '0')}`

function projectOf(tenantId: Uuid, projectId: Uuid) {
  return db.projects.find((p) => p.id === projectId && p.tenantId === tenantId)
}

function periodOf(tenantId: Uuid, periodId: Uuid): PeriodRow | undefined {
  return db.periods.find((p) => p.id === periodId && p.tenantId === tenantId)
}

function companyOf(tenantId: Uuid) {
  const tenant = db.tenants.find((t) => t.id === tenantId)
  return {
    legalName: tenant?.legalName ?? '',
    feinLast4: tenant?.fein ? tenant.fein.slice(-4) : null,
    nysRegistrationNumber: tenant?.nysRegistrationNumber ?? null,
  }
}

function periodBrief(
  row: PeriodRow,
  result: { findings: { severity: string }[] },
  expected: number | null,
) {
  const outcome = db.submissions.find((s) => s.periodId === row.id)?.outcome
  const hard = result.findings.filter((f) => f.severity === 'hard').length
  const signature = db.reports
    .filter((r) => r.periodId === row.id && r.signedAt !== null)
    .sort((a, b) => b.version - a.version)[0]
  const signer = db.signers.find((s) => s.id === signature?.signedBySignerId)
  return {
    id: row.id,
    weekEnding: row.weekEnding,
    status: row.status,
    displayStatus: displayStatusOf(row.status, outcome, hard),
    payrollNumber: row.payrollNumber,
    expectedPayrollNumber: row.payrollNumber === null ? expected : null,
    isNoWork: row.isNoWork,
    lockedReason: lockedReasonOf(row.status),
    signedAt: signature?.signedAt ?? null,
    signedBy: signature?.signedName ?? signer?.fullName ?? null,
  }
}

function projectBrief(projectId: Uuid) {
  const p = db.projects.find((x) => x.id === projectId)
  return {
    id: projectId,
    name: p?.name ?? '',
    prcNumber: p?.prcNumber ?? null,
    projectNumber: p?.projectNumber ?? null,
    siteAddress: p?.siteAddress ?? null,
    federallyFunded: p?.federalReporting ?? false,
  }
}

/** The engine's week, per worker and classification, as the summary reads it. */
function reviewWorkers(result: WeekResult, typed: readonly WorkerPayrollInput[]): ReviewWorker[] {
  return result.workers.map((worker): ReviewWorker => {
    const rows = result.rows.filter((r) => r.workerId === worker.workerId)
    const pii = db.workerPii.find((p) => p.workerId === worker.workerId)
    const level = db.workers.find((w) => w.id === worker.workerId)?.level ?? 'J'
    const payroll = payrollRow(worker.workerId, typed)
    return {
      workerId: worker.workerId,
      workerName: worker.workerName,
      level,
      lines: rows.map((r) => ({
        classificationName: r.classificationName,
        stHours: r.stHours,
        otHours: r.otHours,
        stRate: r.stRate,
        otRate: r.otRate,
        fringeCredit: r.fringeCreditHourly,
        cashInLieu: r.cashInLieuHourly,
        grossProject: r.grossProject,
      })),
      stHours: worker.stHours,
      otHours: worker.otHours,
      grossProject: worker.grossThisProject,
      grossAllWork: worker.grossAllWork,
      deductions: deductionsOf(worker.workerId, typed),
      deductionsTotal: worker.deductionsTotal,
      netPay: worker.netPay,
      hasPayroll:
        payroll !== undefined && (payroll.grossAllWork !== null || payroll.netPay !== null),
      ssnLast4: pii?.ssnLast4 ?? null,
    }
  })
}

/** What the customer typed on the review screen, read back for the screen. */
function payrollRow(workerId: Uuid, typed: readonly WorkerPayrollInput[]) {
  return typed.find((p) => p.workerId === workerId)
}

function deductionsOf(workerId: Uuid, typed: readonly WorkerPayrollInput[]): Deduction[] {
  return (payrollRow(workerId, typed)?.deductions ?? []).map((d) => ({
    kind: d.kind,
    label: d.label,
    amount: d.amount,
  }))
}

export function review(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): ReviewDTO | null {
  if (!projectOf(tenantId, projectId)) return null
  const row = ensurePeriod(projectId, weekEnding)
  // spec/04 §7.1: opening the review is the "Review" transition. A week that is
  // already generated, signed or submitted keeps the state it has.
  if (row.status === 'open') row.status = 'in_review'

  const input = buildWeekInput(projectId, weekEnding)
  const result = computeWeek(input)
  const grid = weekGrid(projectId, weekEnding)
  const workers = reviewWorkers(result, input.payroll)

  return {
    period: periodBrief(row, result, grid.expectedPayrollNumber),
    project: projectBrief(projectId),
    company: companyOf(tenantId),
    workers,
    totals: {
      stHours: hours(result.totals.st),
      otHours: hours(result.totals.ot),
      grossProject: money(result.totals.gross),
    },
    findings: result.findings,
    hasApprentices: result.rows.some((r) => r.isApprentice),
    hasFringe: result.rows.some(
      (r) => !dec(r.fringeCreditHourly).plus(r.cashInLieuHourly).isZero(),
    ),
    latestVersion: versionsOf(row.id).at(0)?.version ?? null,
    sampleXml: SAMPLE_NY_XML,
  }
}

/** One worker's payroll figures, as typed on the review screen. */
export function savePayroll(tenantId: Uuid, periodId: Uuid, input: PayrollInput): void {
  const row = periodOf(tenantId, periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const amount = (value: string) => (value.trim() === '' ? null : money(value))
  setPayroll(periodId, {
    workerId: input.workerId,
    grossAllWork: amount(input.grossAllWork),
    netPay: amount(input.netPay),
    deductions: input.deductions
      .filter((d) => d.amount.trim() !== '')
      .map((d) => ({ kind: d.kind, label: d.label || null, amount: money(d.amount) })),
  })
  if (row.status === 'in_review' || row.status === 'generated') row.status = 'open'
}

// ---------------------------------------------------------------------------
// Reports

function versionsOf(periodId: Uuid): ReportVersion[] {
  return db.reports
    .filter((r) => r.periodId === periodId && r.kind === 'ny_xml')
    .sort((a, b) => b.version - a.version)
    .map((r): ReportVersion => {
      const signer = db.signers.find((s) => s.id === r.signedBySignerId)
      const period = db.periods.find((p) => p.id === r.periodId)
      const project = period && db.projects.find((p) => p.id === period.projectId)
      return {
        id: r.id,
        version: r.version,
        status: r.status,
        generatedAt: r.generatedAt,
        signedAt: r.signedAt,
        signedBy: signer ? { name: signer.fullName, title: signer.title } : null,
        // One example file per version (spec/19 §11). Its name says what it is.
        files: [
          {
            id: `${r.id}:ny_xml`,
            kind: 'ny_xml' as const,
            name: `EXAMPLE_${project?.prcNumber ?? 'NY'}_${period?.weekEnding ?? ''}_v${r.version}.xml`,
          },
        ],
      }
    })
}

function submissionsOf(periodId: Uuid): SubmissionDTO[] {
  return db.submissions
    .filter((s) => s.periodId === periodId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((s) => ({
      id: s.id,
      version: db.reports.find((r) => r.id === s.reportId)?.version ?? null,
      channel: s.channel,
      submittedAt: s.submittedAt,
      confirmationRef: s.confirmationRef,
      outcome: s.outcome,
      outcomeAt: s.outcomeAt,
      rejectionReason: s.rejectionReason,
      recipient: null,
    }))
}

export function reports(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): ReportsDTO | null {
  const project = projectOf(tenantId, projectId)
  if (!project) return null
  const row = ensurePeriod(projectId, weekEnding)
  const grid = weekGrid(projectId, weekEnding)
  return {
    period: periodBrief(row, { findings: grid.findings }, grid.expectedPayrollNumber),
    project: projectBrief(projectId),
    company: companyOf(tenantId),
    versions: versionsOf(row.id),
    submissions: submissionsOf(row.id),
    primeContractorEmail: null,
  }
}

/**
 * "Generate the draft". In step 5 this queues a pg-boss job; here it writes the
 * report row of spec/04 §3.7 and lets the status route play out the progress.
 * A hard finding refuses, the same way the real job does (spec/05 §1 point 2).
 */
export function generate(tenantId: Uuid, periodId: Uuid): { reportId: Uuid; version: number } {
  const row = periodOf(tenantId, periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const grid = weekGrid(row.projectId, row.weekEnding)
  if (grid.findings.some((f) => f.severity === 'hard')) {
    throw new Error('A blocking finding is open; the report cannot be generated.')
  }
  const version = (versionsOf(periodId).at(0)?.version ?? 0) + 1
  const report: ReportRow = {
    id: newId('0192c000', db.reports.length),
    tenantId,
    periodId,
    version,
    kind: 'ny_xml',
    status: 'draft',
    generatedAt: mockNow(),
    generatedBy: db.memberships.find((m) => m.tenantId === tenantId)?.userId ?? '',
    signedBySignerId: null,
    signedByUserId: null,
    signedAt: null,
    attestationText: null,
    signedName: null,
    signedTitle: null,
  }
  db.reports.push(report)
  progress.set(report.id, 0)
  if (row.status === 'open' || row.status === 'in_review') row.status = 'generated'
  return { reportId: report.id, version }
}

/** Fake progress: every poll moves it on, and the third one is done. */
export function reportStatus(tenantId: Uuid, reportId: Uuid): ReportStatusDTO | null {
  const report = db.reports.find((r) => r.id === reportId && r.tenantId === tenantId)
  if (!report) return null
  const step = (progress.get(reportId) ?? 0) + 1
  progress.set(reportId, step)
  const percent = Math.min(100, step * 50)
  return {
    reportId,
    state: percent >= 100 ? 'done' : step === 1 ? 'queued' : 'running',
    progress: percent,
    version: report.version,
  }
}

/** Who signs, prefilled from `signers` and the user (spec/03 §4.5). */
export function signerFor(tenantId: Uuid, userId: Uuid): SignerDTO {
  const signer = db.signers.find(
    (s) => s.tenantId === tenantId && s.userId === userId && s.isActive,
  )
  const user = db.users.find((u) => u.id === userId)
  return {
    signerId: signer?.id ?? null,
    fullName: signer?.fullName ?? user?.name ?? '',
    title: signer?.title ?? '',
    // The company phone is not in the fixtures; the signer types it (spec/03 §4.5).
    phone: '',
    email: user?.email ?? '',
  }
}

/**
 * "Sign and lock this week" (spec/04 §7.1): the report becomes final, the week
 * is locked, and the payroll number is handed out and the project's counter
 * moved on, in the same step.
 */
export function sign(
  tenantId: Uuid,
  periodId: Uuid,
  userId: Uuid,
  input: SignInput,
): { payrollNumber: number } {
  const row = periodOf(tenantId, periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  if (row.status !== 'generated') throw new Error(`A week in ${row.status} cannot be signed.`)
  const project = db.projects.find((p) => p.id === row.projectId)
  if (!project) throw new Error(`Unknown project ${row.projectId}`)

  const result = computeWeek(buildWeekInput(row.projectId, row.weekEnding))
  const points = attestationPoints({
    hasApprentices: result.rows.some((r) => r.isApprentice),
    hasFringe: result.rows.some(
      (r) => !dec(r.fringeCreditHourly).plus(r.cashInLieuHourly).isZero(),
    ),
  })

  const signer = signerFor(tenantId, userId)
  const report = db.reports
    .filter((r) => r.periodId === periodId && r.kind === 'ny_xml')
    .sort((a, b) => b.version - a.version)[0]
  if (!report) throw new Error('Nothing has been generated for this week yet.')

  report.status = 'final'
  report.signedAt = mockNow()
  report.signedByUserId = userId
  report.signedBySignerId = signer.signerId
  report.attestationText = attestationText(points)
  report.signedName = input.fullName
  report.signedTitle = input.title

  const payrollNumber = row.payrollNumber ?? project.nextPayrollNumber
  if (row.payrollNumber === null) {
    row.payrollNumber = payrollNumber
    project.nextPayrollNumber = payrollNumber + 1
  }
  row.status = 'signed'
  row.lockedAt = mockNow()
  // A week that corrects another one supersedes it once it is signed (spec/04 §7).
  if (row.correctsPeriodId) {
    const original = db.periods.find((p) => p.id === row.correctsPeriodId)
    if (original) original.status = 'corrected'
    for (const old of db.reports.filter((r) => r.periodId === row.correctsPeriodId)) {
      old.status = 'superseded'
    }
  }
  return { payrollNumber }
}

export function recordSubmission(
  tenantId: Uuid,
  periodId: Uuid,
  input: { channel: SubmissionDTO['channel']; confirmationRef: string; recipient?: string },
): void {
  const row = periodOf(tenantId, periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const report = versionsOf(periodId).at(0)
  db.submissions.push({
    id: newId('0192d000', db.submissions.length),
    tenantId,
    periodId,
    reportId: report?.id ?? null,
    channel: input.channel,
    submittedAt: mockNow(),
    submittedBy: db.memberships.find((m) => m.tenantId === tenantId)?.userId ?? '',
    confirmationRef: input.confirmationRef || null,
    outcome: 'pending',
    outcomeAt: null,
    rejectionReason: null,
    notes: input.recipient ?? null,
  })
  // Only a filing to the portal closes the week; an email to the general
  // contractor is not a filing (spec/04 §7.1, spec/05 §5).
  if (input.channel === 'ny_portal_manual' && row.status === 'signed') row.status = 'submitted'
}

/** What the portal answered. Accepted moves the 30 day clock (spec/05 §2). */
export function recordOutcome(
  tenantId: Uuid,
  submissionId: Uuid,
  outcome: 'accepted' | 'rejected',
  reason: string,
): void {
  const submission = db.submissions.find((s) => s.id === submissionId && s.tenantId === tenantId)
  if (!submission) throw new Error(`Unknown submission ${submissionId}`)
  submission.outcome = outcome
  submission.outcomeAt = mockNow()
  submission.rejectionReason = outcome === 'rejected' ? reason || null : null
  const period = db.periods.find((p) => p.id === submission.periodId)
  const project = period && db.projects.find((p) => p.id === period.projectId)
  if (outcome === 'accepted' && period && project) {
    project.lastAcceptedSubmissionAt = submission.submittedAt.slice(0, 10)
  }
}

/**
 * "Create a correction" (spec/04 §7): a new period for the same week, carrying
 * the same hours, open again. The old one keeps its number and its reports
 * until the correction is signed.
 */
export function createCorrection(tenantId: Uuid, periodId: Uuid, note: string): { periodId: Uuid } {
  const row = periodOf(tenantId, periodId)
  if (!row) throw new Error(`Unknown period ${periodId}`)
  const existing = db.periods.find((p) => p.correctsPeriodId === periodId)
  if (existing) return { periodId: existing.id }

  const correction: PeriodRow = {
    id: newId('01928000', db.periods.length),
    tenantId,
    projectId: row.projectId,
    weekEnding: row.weekEnding,
    status: 'open',
    isNoWork: row.isNoWork,
    isFinal: row.isFinal,
    // The correction inherits the number of the week it corrects (spec/04).
    payrollNumber: row.payrollNumber,
    correctsPeriodId: row.id,
    lockedAt: null,
    summary: row.summary,
  }
  db.periods.push(correction)
  for (const entry of db.timeEntries.filter((e) => e.periodId === row.id)) {
    db.timeEntries.push({ ...entry, periodId: correction.id })
  }
  db.submissions.push({
    id: newId('0192d000', db.submissions.length),
    tenantId,
    periodId: correction.id,
    reportId: null,
    channel: 'download_only',
    submittedAt: mockNow(),
    submittedBy: db.memberships.find((m) => m.tenantId === tenantId)?.userId ?? '',
    confirmationRef: null,
    outcome: 'pending',
    outcomeAt: null,
    rejectionReason: null,
    notes: note,
  })
  return { periodId: correction.id }
}

/** The example file behind a download (spec/19 §11). */
export function sampleFile(
  fileId: string,
): { name: string; contentType: string; body: string } | null {
  const [reportId = '', kind] = fileId.split(':')
  const report = db.reports.find((r) => r.id === reportId)
  if (!report || kind !== 'ny_xml') return null
  const version = versionsOf(report.periodId).find((v) => v.id === report.id)
  return {
    name: version?.files[0]?.name ?? 'EXAMPLE.xml',
    contentType: 'application/xml; charset=utf-8',
    body: SAMPLE_NY_XML,
  }
}
