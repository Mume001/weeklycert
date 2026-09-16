// What the engine is given and what it gives back (spec/01 §4).
//
// Everything crossing this boundary is a string: money, rates and hours are
// decimal strings, dates are ISO days. The engine is a pure function, so the
// same input always produces the same output; there is no I/O in this package.
import { z } from 'zod'

export const IsoDateSchema = z.iso.date()
/** numeric(12,2) / numeric(10,4) as a decimal string. */
export const MoneySchema = z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'decimal string')
/** Hours as typed: a negative value is a finding (NEGATIVE_HOURS), not a parse error. */
export const SignedHoursSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'decimal string')
export const DowSchema = z.literal([0, 1, 2, 3, 4, 5, 6])

export const TenantSettingsSchema = z.object({
  /** Hours a year for annualising a fringe plan (spec/01 §2.3). */
  annualHoursBasis: MoneySchema.default('2080'),
  /** Whether the federal 40 hour rule is applied next to the NY codes (spec/04 tenant_settings). */
  federalOtEnabled: z.boolean().default(true),
  mergeDeductions: z.boolean().default(true),
  strictPii: z.boolean().default(false),
})
export type TenantSettingsInput = z.infer<typeof TenantSettingsSchema>

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  prcNumber: z.string().nullable().default(null),
  federalWdNumber: z.string().nullable().default(null),
  nyReporting: z.boolean(),
  federalReporting: z.boolean(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).default('active'),
  startDate: IsoDateSchema,
  actualEndDate: IsoDateSchema.nullable().default(null),
  lastAcceptedSubmissionAt: IsoDateSchema.nullable().default(null),
  /** Week ending of the period already marked final, if there is one. */
  finalWeekEnding: IsoDateSchema.nullable().default(null),
  retentionYears: z.number().int().positive().default(6),
})
export type ProjectInput = z.infer<typeof ProjectSchema>

export const PeriodSchema = z.object({
  id: z.string(),
  weekEnding: IsoDateSchema,
  /** 0 Sunday ... 6 Saturday. The seven columns are derived from it (spec/05 §4). */
  weekEndsOn: DowSchema,
  status: z.enum(['open', 'in_review', 'generated', 'signed', 'submitted', 'corrected']),
  isNoWork: z.boolean().default(false),
  isFinal: z.boolean().default(false),
  lockedAt: z.string().nullable().default(null),
  payrollNumber: z.number().int().positive().nullable().default(null),
})
export type PeriodInput = z.infer<typeof PeriodSchema>

/** One versioned row of project_classifications (spec/04 §3.4). */
export const ClassificationSchema = z.object({
  id: z.string(),
  /** classification_catalog id; this is what a grid row is keyed by (spec/19 §3). */
  classificationId: z.string(),
  /** The exact string that goes into the XML workCategory. */
  officialLabel: z.string(),
  displayLabel: z.string(),
  wdBaseRate: MoneySchema,
  wdFringeRate: MoneySchema,
  paidBaseRate: MoneySchema,
  cashInLieuRate: MoneySchema.default('0'),
  apprenticeRatio: z.string().nullable().default(null),
  /** NY overtime codes from the wage schedule, legend in spec/01 §2.1. */
  otCodes: z.array(z.string()).default([]),
  holidayCode: z.string().nullable().default(null),
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable().default(null),
})
export type ClassificationInput = z.infer<typeof ClassificationSchema>

export const AddressSchema = z.object({
  address1: z.string(),
  address2: z.string().nullable().default(null),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  postalCodeExt: z.string().nullable().default(null),
})

export const ApprenticeRecordSchema = z.object({
  programName: z.string(),
  periodNo: z.number().int().positive(),
  /** 40.00 to 95.00 percent of the journeyworker rate (spec/04 apprentice_records). */
  pctOfJourney: MoneySchema,
  validFrom: IsoDateSchema,
  validTo: IsoDateSchema.nullable().default(null),
})

export type ApprenticeRecordInput = z.infer<typeof ApprenticeRecordSchema>

export const AllocationSchema = z.object({
  planId: z.string(),
  hourlyCreditOverride: MoneySchema.nullable().default(null),
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable().default(null),
})
export type AllocationInput = z.infer<typeof AllocationSchema>

export const WorkerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable().default(null),
  level: z.enum(['J', 'RA', 'F', 'O']),
  status: z.enum(['active', 'inactive']).default('active'),
  /** Exactly four digits. A full SSN never exists in this product (spec/11). */
  ssnLast4: z.string().nullable().default(null),
  dateOfBirth: IsoDateSchema.nullable().default(null),
  address: AddressSchema.nullable().default(null),
  apprentice: ApprenticeRecordSchema.nullable().default(null),
  allocations: z.array(AllocationSchema).default([]),
})
export type WorkerInput = z.infer<typeof WorkerSchema>

export const FringePlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum([
    'health_welfare',
    'vacation_holiday',
    'apprenticeship_training',
    'pension',
    'other',
  ]),
  funding: z.enum(['plan_contribution', 'cash_in_lieu']),
  annualCost: MoneySchema.nullable().default(null),
  annualHoursBasis: MoneySchema.nullable().default(null),
  hourlyCredit: MoneySchema.nullable().default(null),
  annualize: z.boolean().default(true),
  /** FICA and workers comp are never a fringe benefit (spec/01 §2.3). */
  isLegallyRequired: z.boolean().default(false),
})
export type FringePlanInput = z.infer<typeof FringePlanSchema>

export const TimeEntrySchema = z.object({
  workerId: z.string(),
  classificationId: z.string(),
  workDate: IsoDateSchema,
  hours: SignedHoursSchema,
  /** Set only when the user typed the split themselves ("8/1" in a cell). */
  stOverride: SignedHoursSchema.nullable().default(null),
  otOverride: SignedHoursSchema.nullable().default(null),
  /**
   * The straight-time rate as it came from the customer's payroll, when it is
   * not the rate the engine would derive. For an apprentice this is what
   * APPRENTICE_PCT_MISMATCH compares against.
   */
  paidStRate: MoneySchema.nullable().default(null),
  /**
   * The overtime rate the payroll reported. The engine computes what is owed
   * and only compares against this one (OT_RATE_BELOW_1_5,
   * OT_RATE_INCLUDES_FRINGE); it never pays by it.
   */
  paidOtRate: MoneySchema.nullable().default(null),
  isHoliday: z.boolean().default(false),
  holidayMultiplier: MoneySchema.nullable().default(null),
})
export type TimeEntryInput = z.infer<typeof TimeEntrySchema>

export const DeductionSchema = z.object({
  kind: z.enum([
    'federal_tax',
    'state_tax',
    'local_tax',
    'fica',
    'medicare',
    'sdi',
    'pfl',
    'union_dues',
    'garnishment',
    'insurance',
    'retirement_401k',
    'other',
  ]),
  label: z.string().nullable().default(null),
  amount: MoneySchema,
})

/** What the customer enters from their payroll system, per worker per week. */
export const WorkerPayrollSchema = z.object({
  workerId: z.string(),
  grossAllWork: MoneySchema.nullable().default(null),
  netPay: MoneySchema.nullable().default(null),
  deductions: z.array(DeductionSchema).default([]),
})
export type WorkerPayrollInput = z.infer<typeof WorkerPayrollSchema>

/**
 * Everything the engine cannot see in the week itself. Each field is optional:
 * a finding that needs one of them simply does not fire when it is absent,
 * which is why the grid can run the engine with nothing but hours.
 */
export const ContextSchema = z.object({
  today: IsoDateSchema.nullable().default(null),
  /** Pay date, for the federal 7 day deadline (29 CFR 3.4(a)). */
  payDate: IsoDateSchema.nullable().default(null),
  /** Earlier weeks of this project, oldest first. */
  priorWeeks: z
    .array(
      z.object({
        weekEnding: IsoDateSchema,
        status: z
          .enum(['open', 'in_review', 'generated', 'signed', 'submitted', 'corrected'])
          .nullable(),
      }),
    )
    .default([]),
  /** The cached wage schedule carries rates newer than project_classifications. */
  wageScheduleUpdatedAt: IsoDateSchema.nullable().default(null),
  /** effective_from of a correction that reaches back into signed weeks. */
  retroactiveEffectiveFrom: IsoDateSchema.nullable().default(null),
  /** Week ending of the oldest report still stored, for the retention notice. */
  oldestReportWeekEnding: IsoDateSchema.nullable().default(null),
  /** Official catalogue labels; without it CLASSIFICATION_NOT_OFFICIAL cannot be judged. */
  catalogLabels: z.array(z.string()).nullable().default(null),
})
export type ContextInput = z.infer<typeof ContextSchema>

export const WeekInputSchema = z.object({
  tenant: TenantSettingsSchema.default(() => TenantSettingsSchema.parse({})),
  project: ProjectSchema,
  period: PeriodSchema,
  /** What the user is doing, so PERIOD_LOCKED only fires on an actual edit. */
  intent: z.enum(['review', 'edit', 'generate']).default('review'),
  classifications: z.array(ClassificationSchema),
  workers: z.array(WorkerSchema),
  plans: z.array(FringePlanSchema).default([]),
  entries: z.array(TimeEntrySchema).default([]),
  payroll: z.array(WorkerPayrollSchema).default([]),
  context: ContextSchema.default(() => ContextSchema.parse({})),
})
export type WeekInput = z.infer<typeof WeekInputSchema>

// ---------------------------------------------------------------------------
// Output (spec/01 §4). Money, rates and hours are strings here too.
// ---------------------------------------------------------------------------

export interface DaySplit {
  date: string
  st: string
  ot: string
  /** The user typed the split instead of letting the engine derive it. */
  manual: boolean
  holiday: boolean
}

/** One grid row: one worker in one classification (spec/19 §3 GridRow). */
export interface LineRow {
  /** `${workerId}:${classificationId}` */
  id: string
  workerId: string
  workerName: string
  classificationId: string
  classificationName: string
  otCodes: string[]
  isApprentice: boolean
  apprenticeLevel: string | null
  baseRate: string
  supplementRate: string
  stRate: string
  /** Weighted when the week mixes 1.5x and 2x hours; the XML carries one rate. */
  otRate: string
  /** Supplement per hour on an overtime hour: equal to `supplementRate` unless code V or W. */
  otSupplementRate: string
  /** What one overtime hour is worth in total: wage premium plus supplement. */
  otHourlyTotal: string
  days: DaySplit[]
  totalHours: string
  stHours: string
  otHours: string
  grossProject: string
  fringeCreditHourly: string
  cashInLieuHourly: string
  fringeRequiredHourly: string
  fringeShortfallHourly: string
  fringeStatus: 'plan' | 'cash' | 'mixed' | 'missing'
}

export interface WorkerSupplement {
  planId: string | null
  kind: string
  paidTo: 'plan' | 'cash'
  stHourlyAmount: string
  otHourlyAmount: string
  totalAmount: string
}

/** One payroll_lines row (spec/04 §3.6). */
export interface WorkerResult {
  workerId: string
  workerName: string
  stHours: string
  otHours: string
  totalHours: string
  regularRate: string
  regularRateMethod: 'single' | 'weighted_average' | 'rate_in_effect'
  /** Which rule paid more for this worker this week (spec/01 §2.1). */
  otMethod: 'ny' | 'federal' | 'equal'
  grossThisProject: string
  grossAllWork: string
  deductionsTotal: string
  netPay: string
  fringeShortfallHourly: string
  apprenticeApplied: boolean
  supplements: WorkerSupplement[]
}

export interface WeekTotals {
  byDay: string[]
  st: string
  ot: string
  gross: string
}

export interface Finding {
  code: string
  severity: 'hard' | 'soft' | 'info'
  message: string
  detail?: string
  suggestedFix?: string
  workerId?: string
  workDate?: string
  classificationId?: string
  field?: string
  rule?: string
}

export interface WeekResult {
  engineVersion: string
  weekEnding: string
  /** The seven columns, first is weekEnding minus 6 days (spec/05 §4). */
  days: string[]
  rows: LineRow[]
  workers: WorkerResult[]
  totals: WeekTotals
  findings: Finding[]
}
