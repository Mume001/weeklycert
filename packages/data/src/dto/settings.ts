// The settings of a company (spec/03 §4.9, session L): team, signers, billing,
// notifications, the audit log and the company's data. One zod schema per
// input for the browser and the server (spec/09 §4); errors are codes, the
// words are in packages/copy (15 §3 Postavke).
import { z } from 'zod'
import {
  DowSchema,
  type IsoDate,
  type MembershipRole,
  MembershipRoleSchema,
  type TenantStatus,
  type Uuid,
} from './common.ts'
import type { SetupTier } from './company.ts'

/**
 * Roles that may sign the certification (spec/02 §3): the bookkeeper only
 * where the owner turned it on (memberships.can_sign).
 */
export const SIGNING_ROLES: readonly MembershipRole[] = ['owner', 'admin', 'signer', 'bookkeeper']

/** The time zones offered (04 tenants.timezone); the words are in packages/copy. */
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
] as const
export type Timezone = (typeof TIMEZONES)[number]

/**
 * Feature flags (04 feature_flags, 09 §4). sms_reminders: text messages stay
 * hidden until the first customers (spec/12 step 10, Mume 28.9.2026).
 */
export const FLAG_KEYS = ['sms_reminders'] as const
export type FlagKey = (typeof FLAG_KEYS)[number]

// ---------------------------------------------------------------------------
// Team

export const InvitableRoleSchema = MembershipRoleSchema.exclude(['owner'])
export type InvitableRole = z.infer<typeof InvitableRoleSchema>

export interface TeamDTO {
  members: {
    membershipId: Uuid
    userId: Uuid
    name: string
    email: string
    role: MembershipRole
  }[]
  invitations: { id: Uuid; email: string; role: InvitableRole; expiresOn: IsoDate }[]
}

export const InviteInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('emailFormat')),
  role: InvitableRoleSchema,
})
export type InviteInput = z.infer<typeof InviteInputSchema>
export type InviteErrorCode = 'emailFormat' | 'alreadyMember' | 'alreadyInvited'
export type InviteResult = { ok: true } | { ok: false; error: InviteErrorCode }

// ---------------------------------------------------------------------------
// Signers

export interface SignersDTO {
  signers: {
    id: Uuid
    userId: Uuid
    fullName: string
    title: string
    email: string
    isActive: boolean
  }[]
  /** Members who may sign and are not signers yet (02 §3). */
  candidates: { userId: Uuid; name: string }[]
  /** Outside bookkeepers and whether each may sign here (04 memberships.can_sign). */
  bookkeepers: { membershipId: Uuid; name: string; canSign: boolean }[]
}

export const SignerInputSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().trim().min(1, 'fullNameRequired'),
  title: z.string().trim().min(1, 'titleRequired'),
})
export type SignerInput = z.infer<typeof SignerInputSchema>
export type SignerErrorCode = 'fullNameRequired' | 'titleRequired'

// ---------------------------------------------------------------------------
// Billing

export interface BillingDTO {
  status: TenantStatus
  trialEndsOn: IsoDate | null
  /** The next charge, or the end of the period when cancelling. */
  periodEndsOn: IsoDate | null
  setupTier: SetupTier | null
  setupPaidOn: IsoDate | null
  cancelAtPeriodEnd: boolean
  pauseResumesOn: IsoDate | null
  /** Set once the company is cancelled or its deletion is asked for. */
  purgeAfter: IsoDate | null
}

/** Pause up to 3 months (spec/08 §2.3). */
export const PAUSE_MONTHS = [1, 2, 3] as const

export const CANCEL_REASONS = ['season', 'price', 'switching', 'missing', 'other'] as const
export const CancelInputSchema = z.object({
  reason: z.enum(CANCEL_REASONS),
  note: z.string().trim().max(1000),
})
export type CancelInput = z.infer<typeof CancelInputSchema>

// ---------------------------------------------------------------------------
// Notifications

export interface NotificationsDTO {
  deadlineReminderDays: number[]
  reminderDay: z.infer<typeof DowSchema>
  members: {
    membershipId: Uuid
    userId: Uuid
    name: string
    role: MembershipRole
    notifyDeadline: boolean
    notifyMissingWeek: boolean
    notifyBilling: boolean
    notifyNewMember: boolean
  }[]
  sms: { phone: string; consentAt: IsoDate } | null
}

/** The days offered for deadline reminders (03 §4.9, the design's "10, 5, 2 and 0"). */
export const REMINDER_DAY_CHOICES = [14, 10, 7, 5, 2, 1, 0] as const

export const NotificationsInputSchema = z.object({
  deadlineReminderDays: z.array(z.number().int().min(0).max(30)),
  reminderDay: DowSchema,
  members: z.array(
    z.object({
      membershipId: z.string(),
      notifyDeadline: z.boolean(),
      notifyMissingWeek: z.boolean(),
      notifyBilling: z.boolean(),
      notifyNewMember: z.boolean(),
    }),
  ),
})
export type NotificationsInput = z.infer<typeof NotificationsInputSchema>

/** Ten digits, as a US mobile number is written without the country code. */
export const SmsInputSchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 10, 'phoneFormat'),
  consent: z.literal(true, 'consentRequired'),
})
export type SmsInput = z.infer<typeof SmsInputSchema>

// ---------------------------------------------------------------------------
// Audit log

export const AUDIT_KINDS = [
  'sign_in',
  'member',
  'pii',
  'report',
  'download',
  'signature',
  'correction',
  'billing',
  'company',
  'support',
] as const
export type AuditKind = (typeof AUDIT_KINDS)[number]

export const AuditFilterSchema = z.object({
  userId: z.string().optional(),
  kind: z.enum(AUDIT_KINDS).optional(),
})
export type AuditFilter = z.infer<typeof AuditFilterSchema>

export interface AuditDTO {
  rows: {
    id: string
    at: string
    userId: Uuid | null
    userName: string | null
    kind: AuditKind
    /** What exactly, e.g. support.start or support.end (04 audit_log.action). */
    action: string
    detail: string
  }[]
  people: { userId: Uuid; name: string }[]
}
