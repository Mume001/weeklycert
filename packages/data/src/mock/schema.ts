// Row shapes of the fixture files. They mirror the tables in spec/04 (camelCase),
// trimmed to what the mock needs. Fixtures are validated against these on load.
import { z } from 'zod'
import {
  DowSchema,
  FringeFundingSchema,
  HoursSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  MembershipRoleSchema,
  MoneySchema,
  PeriodStatusSchema,
  ProjectRoleSchema,
  ProjectStatusSchema,
  RegistrarSchema,
  ReportKindSchema,
  ReportStatusSchema,
  SubmissionOutcomeSchema,
  SupplementKindSchema,
  TenantStatusSchema,
  UuidSchema,
  WorkerLevelSchema,
  WorkerStatusSchema,
} from '../dto/common.ts'

export const TenantRow = z.object({
  id: UuidSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  legalName: z.string(),
  dbaName: z.string().nullable(),
  fein: z
    .string()
    .regex(/^\d{2}-\d{7}$/)
    .nullable(),
  nysRegistrationNumber: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  stateCode: z.literal('NY'),
  zip: z.string().nullable(),
  timezone: z.string(),
  status: TenantStatusSchema,
  trialEndsAt: IsoDateSchema.nullable(),
  pastDueSince: IsoDateSchema.nullable(),
  onboardingStep: z.number().int().min(0).max(7),
  settings: z.object({
    defaultPayFrequency: z.enum(['weekly', 'biweekly']),
    weekEndingDow: DowSchema,
    federalOtEnabled: z.boolean(),
    annualHoursBasis: z.string(),
    mergeDeductions: z.boolean(),
    strictPii: z.boolean(),
  }),
})

export const UserRow = z.object({
  id: UuidSchema,
  email: z.email(),
  name: z.string(),
  isSuperAdmin: z.boolean(),
  lastActiveTenantId: UuidSchema.nullable(),
})

export const MembershipRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  userId: UuidSchema,
  role: MembershipRoleSchema,
  canSign: z.boolean(),
  status: z.enum(['active', 'suspended']),
})

export const SignerRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  userId: UuidSchema,
  fullName: z.string(),
  title: z.string(),
  isActive: z.boolean(),
})

export const AwardingBodyRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  name: z.string(),
  kind: z.enum([
    'state_agency',
    'county',
    'city',
    'school_district',
    'authority',
    'federal',
    'other',
  ]),
})

/** prime_contractors (spec/04 §3.4), trimmed. Empty in the fixtures: Hudson is the GC everywhere. */
export const PrimeContractorRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  legalName: z.string(),
})

/** work_pauses (spec/04 §3.4): weeks known in advance to have no work. */
export const WorkPauseRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  projectId: UuidSchema,
  fromDate: IsoDateSchema,
  toDate: IsoDateSchema,
  reason: z.string().nullable(),
})

/** Official NY label: "Trade – Subtrade", U+2013 with spaces (spec/01 §3). */
export const CatalogRow = z.object({
  id: UuidSchema,
  stateCode: z.literal('NY'),
  trade: z.string(),
  subtrade: z.string().nullable(),
  officialLabel: z.string(),
  catalogVersion: z.string(),
})

export const ProjectRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  name: z.string(),
  projectNumber: z.string().nullable(),
  stateCode: z.literal('NY'),
  county: z.string().nullable(),
  awardingBodyId: UuidSchema.nullable(),
  primeContractorId: UuidSchema.nullable(),
  ourRole: ProjectRoleSchema,
  prcNumber: z.string().nullable(),
  federalWdNumber: z.string().nullable(),
  federalWdMod: z.number().int().nullable(),
  funding: z.enum(['state_only', 'federal_only', 'both', 'unknown']),
  nyReporting: z.boolean(),
  federalReporting: z.boolean(),
  nycSystem: z.boolean(),
  startDate: IsoDateSchema,
  expectedEndDate: IsoDateSchema.nullable(),
  actualEndDate: IsoDateSchema.nullable(),
  status: ProjectStatusSchema,
  nextPayrollNumber: z.number().int().positive(),
  lastAcceptedSubmissionAt: IsoDateSchema.nullable(),
  siteAddress: z.string().nullable(),
  retentionYears: z.number().int().positive(),
})

export const ProjectClassificationRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  projectId: UuidSchema,
  classificationId: UuidSchema,
  displayLabel: z.string(),
  wdBaseRate: MoneySchema,
  wdFringeRate: MoneySchema,
  paidBaseRate: MoneySchema,
  cashInLieuRate: MoneySchema,
  apprenticeRatio: z.string().nullable(),
  otCodes: z.array(z.string()),
  holidayCode: z.string().nullable(),
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable(),
  /** Set when the rate was taken from the wage schedule cache (spec/04). None in the fixtures. */
  sourceRateId: UuidSchema.nullable().default(null),
})

export const WorkerRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable(),
  workerNumber: z.string().nullable(),
  defaultClassificationId: UuidSchema.nullable(),
  level: WorkerLevelSchema,
  hireDate: IsoDateSchema.nullable(),
  status: WorkerStatusSchema,
})

/**
 * worker_pii. In the database these fields are encrypted and only
 * packages/data/src/pii.ts may read them (spec/04 §6). The fixtures are fake.
 * Never a full SSN: ssnLast4 is exactly four digits (spec/11 §5).
 */
export const WorkerPiiRow = z.object({
  workerId: UuidSchema,
  tenantId: UuidSchema,
  ssnLast4: z
    .string()
    .regex(/^[0-9]{4}$/)
    .nullable(),
  dateOfBirth: IsoDateSchema.nullable(),
  address: z
    .object({
      address1: z.string().max(42),
      address2: z.string().max(42).nullable(),
      city: z.string().max(40),
      state: z.string().max(50),
      postalCode: z.string().regex(/^\d{5}$/),
      postalCodeExt: z
        .string()
        .regex(/^\d{4}$/)
        .nullable(),
    })
    .nullable(),
  phone: z.string().nullable(),
})

export const ApprenticeRecordRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  workerId: UuidSchema,
  programName: z.string(),
  programRegistrationNo: z.string().nullable(),
  registrar: RegistrarSchema.nullable(),
  sponsor: z.string().nullable(),
  trade: z.string(),
  periodNo: z.number().int().positive(),
  pctOfJourney: z.string().regex(/^\d{2}\.\d{2}$/),
  validFrom: IsoDateSchema,
  validTo: IsoDateSchema.nullable(),
})

export const FringePlanRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  name: z.string(),
  kind: SupplementKindSchema,
  funding: FringeFundingSchema,
  annualCost: MoneySchema.nullable(),
  annualHoursBasis: z.string().nullable(),
  hourlyCredit: MoneySchema.nullable(),
  annualize: z.boolean(),
  planNumber: z.string().nullable(),
  provider: z.string().nullable(),
  isLegallyRequired: z.boolean(),
})

export const FringeAllocationRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  workerId: UuidSchema,
  fringePlanId: UuidSchema,
  hourlyCreditOverride: MoneySchema.nullable(),
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable(),
})

export const PeriodRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  projectId: UuidSchema,
  weekEnding: IsoDateSchema,
  status: PeriodStatusSchema,
  isNoWork: z.boolean(),
  isFinal: z.boolean(),
  payrollNumber: z.number().int().positive().nullable(),
  correctsPeriodId: UuidSchema.nullable(),
  lockedAt: IsoDateTimeSchema.nullable(),
  /** Historical weeks carry only totals (19 §4); detailed weeks are computed by core. */
  summary: z
    .object({ totalHours: HoursSchema, workerCount: z.number().int(), gross: MoneySchema })
    .nullable(),
})

export const ReportRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  periodId: UuidSchema,
  version: z.number().int().positive(),
  kind: ReportKindSchema,
  status: ReportStatusSchema,
  generatedAt: IsoDateTimeSchema,
  generatedBy: UuidSchema,
  signedBySignerId: UuidSchema.nullable(),
  signedByUserId: UuidSchema.nullable(),
  signedAt: IsoDateTimeSchema.nullable(),
})

export const SubmissionRow = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  periodId: UuidSchema,
  /** Null for a no-work week: nothing is uploaded, the box is ticked in the portal. */
  reportId: UuidSchema.nullable(),
  channel: z.enum(['ny_portal_manual', 'email_to_prime', 'portal_other', 'download_only']),
  submittedAt: IsoDateTimeSchema,
  submittedBy: UuidSchema,
  confirmationRef: z.string().nullable(),
  outcome: SubmissionOutcomeSchema,
  outcomeAt: IsoDateTimeSchema.nullable(),
  rejectionReason: z.string().nullable(),
  notes: z.string().nullable(),
})

const DayHours = HoursSchema.nullable()

/**
 * Compact time entries: one row per worker and classification per week.
 * days[0] is weekEnding minus 6, days[6] is weekEnding. The mock expands this
 * into time_entries rows (one per day) when core needs them.
 */
export const TimeEntryRow = z.object({
  periodId: UuidSchema,
  workerId: UuidSchema,
  projectClassificationId: UuidSchema,
  days: z.tuple([DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours]),
  /** Straight-time rate as it came from the payroll import (spec/06), when it differs. */
  paidStRate: MoneySchema.optional(),
})
