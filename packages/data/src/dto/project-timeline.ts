// /app/[t]/projects/[id], the week timeline (spec/03 §4.4). First draft.
import { z } from 'zod'
import {
  DisplayStatusSchema,
  HoursSchema,
  IsoDateSchema,
  MoneySchema,
  PeriodStatusSchema,
  UuidSchema,
} from './common.ts'

export const ProjectTimelineDTOSchema = z.object({
  project: z.object({
    id: UuidSchema,
    name: z.string(),
    prcNumber: z.string().nullable(),
    federalWd: z.string().nullable(),
    awardingBody: z.string().nullable(),
    primeContractor: z.string().nullable(),
    classificationCount: z.number().int().nonnegative(),
    nextDeadline: IsoDateSchema.nullable(),
    nextPayrollNumber: z.number().int().positive(),
  }),
  /** Every week from the start date, no gaps (spec/03 §4.4). Newest first. */
  weeks: z.array(
    z.object({
      weekEnding: IsoDateSchema,
      /** Null when the week has no period row yet ("no entries"). */
      periodId: UuidSchema.nullable(),
      status: PeriodStatusSchema.nullable(),
      displayStatus: DisplayStatusSchema.nullable(),
      payrollNumber: z.number().int().positive().nullable(),
      isNoWork: z.boolean(),
      totalHours: HoursSchema.nullable(),
      workerCount: z.number().int().nonnegative().nullable(),
      gross: MoneySchema.nullable(),
      findings: z.object({ hard: z.number().int(), soft: z.number().int() }),
      versions: z.number().int().nonnegative(),
    }),
  ),
})
export type ProjectTimelineDTO = z.infer<typeof ProjectTimelineDTOSchema>
