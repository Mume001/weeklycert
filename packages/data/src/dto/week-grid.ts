// The weekly grid (spec/19 §3, screen spec/03 §4.5).
import type { LineRow } from '@wc/core'
import { z } from 'zod'
import {
  type DisplayStatus,
  DisplayStatusSchema,
  DowSchema,
  HoursSchema,
  IsoDateSchema,
  MoneySchema,
  type PeriodStatus,
  PeriodStatusSchema,
  type SubmissionOutcome,
  SubmissionOutcomeSchema,
  UuidSchema,
} from './common.ts'
import { FindingSchema } from './finding.ts'

export const GridDaySchema = z.object({
  st: HoursSchema,
  ot: HoursSchema,
  manual: z.boolean(),
  holiday: z.boolean(),
})
export type GridDay = z.infer<typeof GridDaySchema>

export const GridRowSchema = z.object({
  /** `${workerId}:${classificationId}` */
  id: z.string(),
  workerId: UuidSchema,
  /** "Last, First" */
  workerName: z.string(),
  classificationId: UuidSchema,
  /** "Electrician – Inside Wireman" (official label, U+2013 separator) */
  classificationName: z.string(),
  /** ["A","W","R"], legend in spec/01 §2.1 */
  otCodes: z.array(z.string()),
  isApprentice: z.boolean(),
  apprenticeLevel: z.string().optional(),
  /** From the wage schedule. */
  baseRate: MoneySchema,
  /** Supplement per hour from the wage schedule. */
  supplementRate: MoneySchema,
  /** Straight-time rate actually paid. */
  stRate: MoneySchema,
  /** Computed overtime rate. */
  otRate: MoneySchema,
  /** First entry is weekEnding minus 6 days, last is weekEnding (spec/05 §4). */
  days: z.tuple([
    GridDaySchema,
    GridDaySchema,
    GridDaySchema,
    GridDaySchema,
    GridDaySchema,
    GridDaySchema,
    GridDaySchema,
  ]),
  totalHours: HoursSchema,
  stHours: HoursSchema,
  otHours: HoursSchema,
  grossProject: MoneySchema,
  fringeStatus: z.enum(['plan', 'cash', 'mixed', 'missing']),
})
export type GridRow = z.infer<typeof GridRowSchema>

const EMPTY_DAY: GridDay = { st: '0.00', ot: '0.00', manual: false, holiday: false }

/**
 * One row of the engine's result, shaped into the row the grid reads. Both the
 * server and the browser run the same engine (spec/19 §6), so both need this
 * and it lives here, next to the DTO it produces, instead of twice.
 */
export function gridRowFromLine(row: LineRow): GridRow {
  const days = row.days.map(
    (day): GridDay => ({ st: day.st, ot: day.ot, manual: day.manual, holiday: day.holiday }),
  )
  const at = (index: number): GridDay => days[index] ?? EMPTY_DAY
  return {
    id: row.id,
    workerId: row.workerId,
    workerName: row.workerName,
    classificationId: row.classificationId,
    classificationName: row.classificationName,
    otCodes: [...row.otCodes],
    isApprentice: row.isApprentice,
    ...(row.apprenticeLevel === null ? {} : { apprenticeLevel: row.apprenticeLevel }),
    baseRate: row.baseRate,
    supplementRate: row.supplementRate,
    stRate: row.stRate,
    otRate: row.otRate,
    days: [at(0), at(1), at(2), at(3), at(4), at(5), at(6)],
    totalHours: row.totalHours,
    stHours: row.stHours,
    otHours: row.otHours,
    grossProject: row.grossProject,
    fringeStatus: row.fringeStatus,
  }
}

/**
 * The badge the screen shows, derived from the period status, the outcome of
 * the submission and the number of hard findings. The mapping is the one at the
 * end of spec/04 §7.1 and must never be derived in a component (spec/19 §3).
 */
export function displayStatusOf(
  status: PeriodStatus,
  outcome: SubmissionOutcome | undefined,
  hardFindings: number,
): DisplayStatus {
  if (status === 'corrected') return 'corrected'
  if (status === 'submitted') return outcome === 'rejected' ? 'rejected' : 'submitted'
  if (status === 'signed') return 'signed'
  if (status === 'generated') return 'validated'
  return hardFindings > 0 ? 'needs_attention' : 'draft'
}

/** Why the week is read-only, or null while it can still be edited (spec/03 §3). */
export function lockedReasonOf(status: PeriodStatus): 'signed' | 'submitted' | null {
  if (status === 'signed') return 'signed'
  if (status === 'submitted' || status === 'corrected') return 'submitted'
  return null
}

export const WeekGridDTOSchema = z.object({
  project: z.object({
    id: UuidSchema,
    name: z.string(),
    prcNumber: z.string(),
    federallyFunded: z.boolean(),
  }),
  weekEnding: IsoDateSchema,
  weekEndsOn: DowSchema,
  isNoWork: z.boolean(),
  status: PeriodStatusSchema,
  displayStatus: DisplayStatusSchema,
  submissionOutcome: SubmissionOutcomeSchema.optional(),
  /** NULL until signed (spec/04 payroll_periods). */
  payrollNumber: z.number().int().positive().nullable(),
  /** What it will be on signature, if the weeks are signed in order. NULL once signed. */
  expectedPayrollNumber: z.number().int().positive().nullable(),
  rows: z.array(GridRowSchema),
  totals: z.object({
    byDay: z.array(HoursSchema).length(7),
    st: HoursSchema,
    ot: HoursSchema,
    gross: MoneySchema,
  }),
  findings: z.array(FindingSchema),
  lockedReason: z.enum(['signed', 'submitted']).optional(),
})
export type WeekGridDTO = z.infer<typeof WeekGridDTOSchema>
