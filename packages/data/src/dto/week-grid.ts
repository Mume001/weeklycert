// The weekly grid (spec/19 §3, screen spec/03 §4.5).
import { z } from 'zod'
import {
  DisplayStatusSchema,
  DowSchema,
  HoursSchema,
  IsoDateSchema,
  MoneySchema,
  PeriodStatusSchema,
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
