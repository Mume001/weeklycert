// Dashboard (spec/03 §4.3: DashboardDTO { deadlines[], missingWeeks[], recentReports[],
// healthIssues[] }). First draft; the dashboard session refines it against the screen.
import { z } from 'zod'
import {
  DisplayStatusSchema,
  IsoDateSchema,
  ReportKindSchema,
  ReportStatusSchema,
  UuidSchema,
} from './common.ts'

export const DashboardDTOSchema = z.object({
  /** The four cards (spec/15 §3). */
  cards: z.object({
    projectsPastDeadline: z.number().int().nonnegative(),
    weeksWaitingForHours: z.number().int().nonnegative(),
    reportsWaitingForSignature: z.number().int().nonnegative(),
    filingsAcceptedThisYear: z.number().int().nonnegative(),
  }),
  /** One row per project: the 30-day NY counter, plus WH-347 for federal projects. */
  deadlines: z.array(
    z.object({
      projectId: UuidSchema,
      projectName: z.string(),
      prcNumber: z.string().nullable(),
      lastAcceptedAt: IsoDateSchema.nullable(),
      dueOn: IsoDateSchema,
      /** Negative when late. */
      daysLeft: z.number().int(),
      /** Past the 14-day grace: the $100 per day penalty is legally possible. */
      penaltyPossible: z.boolean(),
      unfiledWeeks: z.array(IsoDateSchema),
      federal: z
        .object({ weekEnding: IsoDateSchema, dueOn: IsoDateSchema, daysLeft: z.number().int() })
        .nullable(),
    }),
  ),
  /** Weeks that are not closed, per project, with their status. */
  openWeeks: z.array(
    z.object({
      projectId: UuidSchema,
      projectName: z.string(),
      weekEnding: IsoDateSchema,
      displayStatus: DisplayStatusSchema.nullable(),
      hard: z.number().int().nonnegative(),
      soft: z.number().int().nonnegative(),
    }),
  ),
  /** Current week with neither hours nor a no-work mark. */
  missingWeeks: z.array(
    z.object({ projectId: UuidSchema, projectName: z.string(), weekEnding: IsoDateSchema }),
  ),
  /** Last five reports. */
  recentReports: z.array(
    z.object({
      reportId: UuidSchema,
      projectId: UuidSchema,
      projectName: z.string(),
      weekEnding: IsoDateSchema,
      version: z.number().int().positive(),
      kind: ReportKindSchema,
      status: ReportStatusSchema,
    }),
  ),
  healthIssues: z.array(
    z.object({
      kind: z.enum([
        'worker_no_classification',
        'project_no_prc',
        'rate_expired',
        'apprentice_unregistered',
      ]),
      count: z.number().int().positive(),
    }),
  ),
})
export type DashboardDTO = z.infer<typeof DashboardDTOSchema>
