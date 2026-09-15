// One row of /app/[t]/projects (spec/03 §4.4). First draft for the projects session.
import { z } from 'zod'
import {
  DisplayStatusSchema,
  IsoDateSchema,
  ProjectRoleSchema,
  ProjectStatusSchema,
  UuidSchema,
} from './common.ts'

export const ProjectRowDTOSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  prcNumber: z.string().nullable(),
  awardingBody: z.string().nullable(),
  ourRole: ProjectRoleSchema,
  status: ProjectStatusSchema,
  federallyFunded: z.boolean(),
  nextDeadline: IsoDateSchema.nullable(),
  /** The week in progress; with ?open=1 this is the OLDEST open week (spec/03 §4.4). */
  currentWeek: z
    .object({ weekEnding: IsoDateSchema, displayStatus: DisplayStatusSchema.nullable() })
    .nullable(),
  oldestOpenWeek: IsoDateSchema.nullable(),
  openFindings: z.number().int().nonnegative(),
})
export type ProjectRowDTO = z.infer<typeof ProjectRowDTOSchema>

export const ProjectListFilterSchema = z.object({
  status: z.enum(['active', 'paused', 'closed']).optional(),
  /** ?open=1: only projects with an open week, oldest open week first. */
  openOnly: z.boolean().optional(),
})
export type ProjectListFilter = z.infer<typeof ProjectListFilterSchema>
