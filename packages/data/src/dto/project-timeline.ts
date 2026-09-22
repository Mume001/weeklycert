// /app/[t]/projects/[id], the week timeline (spec/03 §4.4).
import { z } from 'zod'
import {
  DisplayStatusSchema,
  HoursSchema,
  IsoDateSchema,
  MoneySchema,
  PeriodStatusSchema,
  ProjectRoleSchema,
  ProjectStatusSchema,
  UuidSchema,
} from './common.ts'

export const TimelineWeekSchema = z.object({
  weekEnding: IsoDateSchema,
  /** Null when the week has no period row yet. */
  periodId: UuidSchema.nullable(),
  status: PeriodStatusSchema.nullable(),
  displayStatus: DisplayStatusSchema.nullable(),
  /** Assigned at signing (spec/04 payroll_periods). */
  payrollNumber: z.number().int().positive().nullable(),
  /** What it will be if the weeks are signed in order ("will be #N"). Null once signed. */
  expectedPayrollNumber: z.number().int().positive().nullable(),
  isNoWork: z.boolean(),
  /** Not a single hour and not a no-work week: the gap the timeline exists to show. */
  noEntries: z.boolean(),
  totalHours: HoursSchema.nullable(),
  workerCount: z.number().int().nonnegative().nullable(),
  gross: MoneySchema.nullable(),
  findings: z.object({ hard: z.number().int(), soft: z.number().int() }),
  /** Number of period rows for this week: 2 when it was corrected once. */
  versions: z.number().int().nonnegative(),
  /** Signed or submitted: read only, reports exist (spec/03 §3). */
  locked: z.boolean(),
})
export type TimelineWeek = z.infer<typeof TimelineWeekSchema>

export const ProjectTimelineDTOSchema = z.object({
  project: z.object({
    id: UuidSchema,
    name: z.string(),
    status: ProjectStatusSchema,
    ourRole: ProjectRoleSchema,
    prcNumber: z.string().nullable(),
    federalWdNumber: z.string().nullable(),
    federalWdMod: z.number().int().nullable(),
    awardingBody: z.string().nullable(),
    generalContractor: z.string().nullable(),
    classificationCount: z.number().int().nonnegative(),
    nextDeadline: IsoDateSchema.nullable(),
    nextPayrollNumber: z.number().int().positive(),
    /** The week the first week ends: shown while the timeline is still empty. */
    firstWeekEnding: IsoDateSchema,
  }),
  /** Every week from the start date, no gaps (spec/03 §4.4). Newest first. */
  weeks: z.array(TimelineWeekSchema),
})
export type ProjectTimelineDTO = z.infer<typeof ProjectTimelineDTOSchema>
