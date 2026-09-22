// Shared primitives and enums (spec/19 §3). Enum values are spec/04 §4.
import { PERIOD_STATUSES } from '@wc/core'
import { z } from 'zod'

export type Uuid = string
export type IsoDate = string // "2026-09-12"
export type Money = string // decimal string, NEVER number
export type Hours = string // "8.5", decimal string

export const UuidSchema = z.uuid()
export const IsoDateSchema = z.iso.date()
export const IsoDateTimeSchema = z.iso.datetime({ offset: true })
/** Money and rates: numeric(12,2) and numeric(10,4) in the database (spec/04 §1). */
export const MoneySchema = z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'decimal string')
/** Hours: numeric(6,2), never negative. */
export const HoursSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, 'decimal string')

/** Same enum as period_status in spec/04 §4. This is the state in the database. */
export const PeriodStatusSchema = z.enum(PERIOD_STATUSES)
export type PeriodStatus = z.infer<typeof PeriodStatusSchema>

export const SubmissionOutcomeSchema = z.enum(['pending', 'accepted', 'rejected'])
export type SubmissionOutcome = z.infer<typeof SubmissionOutcomeSchema>

/**
 * What the badge shows. The engine derives it, it is not stored. The mapping
 * is at the end of spec/04 §7.1 and must not be derived in a component.
 */
export const DisplayStatusSchema = z.enum([
  'draft',
  'needs_attention',
  'validated',
  'signed',
  'submitted',
  'rejected',
  'corrected',
])
export type DisplayStatus = z.infer<typeof DisplayStatusSchema>

export const MembershipRoleSchema = z.enum([
  'owner',
  'admin',
  'payroll',
  'signer',
  'viewer',
  'bookkeeper',
])
export type MembershipRole = z.infer<typeof MembershipRoleSchema>

export const TenantStatusSchema = z.enum([
  'trial',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'deleted',
])
export type TenantStatus = z.infer<typeof TenantStatusSchema>

export const ProjectStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'archived'])
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

export const ProjectRoleSchema = z.enum(['prime', 'sub', 'sub_tier2'])
export type ProjectRole = z.infer<typeof ProjectRoleSchema>

export const WorkerLevelSchema = z.enum(['J', 'RA', 'F', 'O'])
export type WorkerLevel = z.infer<typeof WorkerLevelSchema>

export const WorkerStatusSchema = z.enum(['active', 'inactive'])
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>

/** project_classifications.rate_source (spec/04 §4). */
export const RateSourceSchema = z.enum(['manual', 'pasted', 'cache'])
export type RateSource = z.infer<typeof RateSourceSchema>

export const SupplementKindSchema = z.enum([
  'health_welfare',
  'vacation_holiday',
  'apprenticeship_training',
  'pension',
  'other',
])
export type SupplementKind = z.infer<typeof SupplementKindSchema>

export const FringeFundingSchema = z.enum(['plan_contribution', 'cash_in_lieu'])
export type FringeFunding = z.infer<typeof FringeFundingSchema>

export const ReportKindSchema = z.enum(['ny_xml', 'wh347_pdf', 'statement_pdf', 'bundle_zip'])
export type ReportKind = z.infer<typeof ReportKindSchema>

export const ReportStatusSchema = z.enum(['draft', 'final', 'superseded', 'failed'])
export type ReportStatus = z.infer<typeof ReportStatusSchema>

export const ImportKindSchema = z.enum(['hours', 'payroll', 'workers'])
export type ImportKind = z.infer<typeof ImportKindSchema>

export const RegistrarSchema = z.enum(['oa', 'saa', 'nysdol'])
export type Registrar = z.infer<typeof RegistrarSchema>

export const SeveritySchema = z.enum(['hard', 'soft', 'info'])
export type Severity = z.infer<typeof SeveritySchema>

/** 0 Sunday ... 6 Saturday (tenant_settings.week_ending_dow, spec/04). */
export const DowSchema = z.literal([0, 1, 2, 3, 4, 5, 6])
export type Dow = z.infer<typeof DowSchema>
