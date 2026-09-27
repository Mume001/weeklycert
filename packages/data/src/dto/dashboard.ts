// Dashboard (spec/03 §4.3: DashboardDTO { deadlines[], missingWeeks[], recentReports[],
// healthIssues[] }), and the card per company on /firms (03 §4.2). Everything
// is counted from the mock's today (spec/19 §4), never from the clock.
import { z } from 'zod'
import { DisplayStatusSchema, IsoDateSchema, UuidSchema } from './common.ts'

/** spec/05 §2: on time, late, and past the 14 days of grace, when the penalty is possible. */
export const DeadlineLevelSchema = z.enum(['ok', 'late', 'penalty'])
export type DeadlineLevel = z.infer<typeof DeadlineLevelSchema>

const WeekLinkSchema = z.object({ projectId: UuidSchema, weekEnding: IsoDateSchema })

export const HEALTH_ISSUES = [
  'worker_no_classification',
  'project_no_prc',
  'rate_expired',
  'apprentice_unregistered',
] as const

export const DashboardDTOSchema = z.object({
  /** No project at all: the page is one "Start here" card (03 §4.3). */
  isNew: z.boolean(),
  /** The four cards (spec/15 §3). */
  cards: z.object({
    projectsPastDeadline: z.number().int().nonnegative(),
    weeksWaitingForHours: z.number().int().nonnegative(),
    /** The signer's queue (spec/02 §5): generated weeks, the oldest first. */
    reportsWaitingForSignature: z.number().int().nonnegative(),
    filingsAcceptedThisYear: z.number().int().nonnegative(),
  }),
  /** Weeks waiting for a signature, oldest first; the card leads to the first one's sign screen. */
  signatureQueue: z.array(WeekLinkSchema.extend({ projectName: z.string() })),
  /** One row per active project: the 30-day NY counter (05 §2). Nearest first. */
  deadlines: z.array(
    z.object({
      projectId: UuidSchema,
      projectName: z.string(),
      prcNumber: z.string().nullable(),
      lastAcceptedAt: IsoDateSchema.nullable(),
      dueOn: IsoDateSchema,
      /** Negative when late. */
      daysLeft: z.number().int(),
      level: DeadlineLevelSchema,
      /** Weeks with work that are not submitted yet, oldest first. */
      unfiledWeeks: z.array(IsoDateSchema),
    }),
  ),
  /**
   * Federal projects: the WH-347 of each week not yet filed, due 7 days after
   * the pay date (29 CFR 3.4, spec/01 §2.9). The source of the pay date is shown.
   */
  federal: z.array(
    z.object({
      projectId: UuidSchema,
      projectName: z.string(),
      weekEnding: IsoDateSchema,
      payDate: IsoDateSchema,
      payDateSource: z.enum(['week', 'company']),
      dueOn: IsoDateSchema,
      daysLeft: z.number().int(),
    }),
  ),
  /** Weeks that are not closed, per project, with their status (03 §4.3 point 1). */
  openWeeks: z.array(
    WeekLinkSchema.extend({
      projectName: z.string(),
      displayStatus: DisplayStatusSchema.nullable(),
      noEntries: z.boolean(),
      hard: z.number().int().nonnegative(),
      soft: z.number().int().nonnegative(),
    }),
  ),
  /** The current week with neither hours nor a no-work mark (03 §4.3 point 2). */
  missingWeeks: z.array(WeekLinkSchema.extend({ projectName: z.string() })),
  /** The last five reports, with version and status (03 §4.3 point 3). */
  recentReports: z.array(
    WeekLinkSchema.extend({
      reportId: UuidSchema,
      projectName: z.string(),
      version: z.number().int().positive(),
      status: DisplayStatusSchema,
    }),
  ),
  /** Only the issues there are; empty means nothing to fix (03 §4.3 point 4). */
  healthIssues: z.array(
    z.object({ kind: z.enum(HEALTH_ISSUES), count: z.number().int().positive() }),
  ),
})
export type DashboardDTO = z.infer<typeof DashboardDTOSchema>

/** The nearest deadline of one company, for its card on /firms (03 §4.2). */
export const FirmNextDTOSchema = z
  .object({
    projectName: z.string(),
    dueOn: IsoDateSchema,
    daysLeft: z.number().int(),
    level: DeadlineLevelSchema,
    /** The project's current week; null when it has no period yet. */
    weekStatus: DisplayStatusSchema.nullable(),
  })
  .nullable()
export type FirmNextDTO = z.infer<typeof FirmNextDTOSchema>
