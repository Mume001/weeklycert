// One row of /app/[t]/projects (spec/03 §4.4).
import { z } from 'zod'
import {
  DisplayStatusSchema,
  IsoDateSchema,
  ProjectRoleSchema,
  ProjectStatusSchema,
  UuidSchema,
} from './common.ts'

/** A week as the list shows it: its date and its badge. */
export const WeekRefSchema = z.object({
  weekEnding: IsoDateSchema,
  /** Null when the week has no period row yet. */
  displayStatus: DisplayStatusSchema.nullable(),
  /** Not a single hour and not marked as a no-work week (spec/03 §4.4 "nema unosa"). */
  noEntries: z.boolean(),
})
export type WeekRef = z.infer<typeof WeekRefSchema>

export const ProjectRowDTOSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  prcNumber: z.string().nullable(),
  awardingBody: z.string().nullable(),
  ourRole: ProjectRoleSchema,
  status: ProjectStatusSchema,
  federallyFunded: z.boolean(),
  /** spec/05 §2. Null for a closed project: nothing is due any more. */
  nextDeadline: IsoDateSchema.nullable(),
  /** The newest week on the timeline. Null when the first week has not ended yet. */
  currentWeek: WeekRefSchema.nullable(),
  /** With ?open=1 the list shows this one instead, and a click opens it (spec/03 §4.4). */
  oldestOpenWeek: WeekRefSchema.nullable(),
  /** Errors and warnings on the open weeks. */
  openFindings: z.number().int().nonnegative(),
})
export type ProjectRowDTO = z.infer<typeof ProjectRowDTOSchema>

export const ProjectListFilterSchema = z.object({
  /** Active holds draft projects too; closed is completed and archived. */
  status: z.enum(['active', 'paused', 'closed']).optional(),
  /**
   * ?open=1: only active projects with an open week, oldest open week first.
   * Active only, so the list matches the "This week" counter (spec/03 §3).
   */
  openOnly: z.boolean().optional(),
})
export type ProjectListFilter = z.infer<typeof ProjectListFilterSchema>
