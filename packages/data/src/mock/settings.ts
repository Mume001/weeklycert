// The settings of a company over the fixtures (spec/03 §4.9, session L). Every
// function takes the tenant and looks rows up inside it, so another company's
// id gets the same as one that does not exist (spec/19 §3). What changes who
// may do what, and what the owner pays, writes the audit log (04 audit_log).
import { addDays, addMonths } from '@wc/core'
import type {
  AuditDTO,
  AuditFilter,
  AuditKind,
  BillingDTO,
  CancelInput,
  InvitableRole,
  InviteInput,
  InviteResult,
  MembershipRole,
  NotificationsDTO,
  NotificationsInput,
  SignerInput,
  SignersDTO,
  SmsInput,
  TeamDTO,
  Timezone,
  Uuid,
} from '../dto/index.ts'
import { SIGNING_ROLES } from '../dto/index.ts'
import { exportPii } from '../pii.ts'
import { exportArchive } from './archive.ts'
import { mockNow, mockToday } from './clock.ts'
import { db } from './db.ts'
import { storedZip } from './zip.ts'

/** A new row's id: deterministic, never Math.random (spec/19 §1). */
const newId = (group: string, n: number): Uuid =>
  `${group}-0000-7000-9000-${String(n + 1).padStart(12, '0')}`

/** Invitations last 7 days (04 invitations.expires_at). */
const INVITATION_DAYS = 7
/** Read-only and export after a cancellation or a deletion request (08 §2.3). */
const GRACE_DAYS = 30

function tenantOf(tenantId: Uuid) {
  const tenant = db.tenants.find((t) => t.id === tenantId)
  if (!tenant) throw new Error(`Unknown tenant ${tenantId}`)
  return tenant
}

const userName = (userId: Uuid | null) =>
  userId === null ? null : (db.users.find((u) => u.id === userId)?.name ?? null)

const membershipOf = (tenantId: Uuid, membershipId: Uuid) =>
  db.memberships.find((m) => m.id === membershipId && m.tenantId === tenantId)

/**
 * The one acting must be an active member of this company. The guard checks
 * the role; this keeps a user of company A from writing into company B
 * through a tenant id, as RLS will in step 4.
 */
function actor(tenantId: Uuid, userId: Uuid): Uuid {
  const member = db.memberships.some(
    (m) => m.tenantId === tenantId && m.userId === userId && m.status === 'active',
  )
  if (!member) throw new Error(`User ${userId} is not a member of ${tenantId}`)
  return userId
}

/** 04 audit_log: append only. `detail` is data, never a sentence. */
export function audit(
  tenantId: Uuid,
  actorUserId: Uuid | null,
  kind: AuditKind,
  action: string,
  detail: string,
  /** When it happened; the mock's now unless the event has its own time. */
  at: string = mockNow(),
): void {
  db.auditLog.push({
    id: db.auditLog.length + 1,
    tenantId,
    actorUserId,
    kind,
    action,
    detail,
    at,
  })
}

// ---------------------------------------------------------------------------
// Team

export function team(tenantId: Uuid): TeamDTO {
  const today = mockToday()
  const order: MembershipRole[] = ['owner', 'admin', 'signer', 'payroll', 'bookkeeper', 'viewer']
  return {
    members: db.memberships
      .filter((m) => m.tenantId === tenantId && m.status === 'active')
      .flatMap((m) => {
        const user = db.users.find((u) => u.id === m.userId)
        return user
          ? [
              {
                membershipId: m.id,
                userId: user.id,
                name: user.name,
                email: user.email,
                role: m.role,
              },
            ]
          : []
      })
      .sort(
        (a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name),
      ),
    invitations: db.invitations
      .filter((i) => i.tenantId === tenantId && i.acceptedAt === null && i.expiresAt >= today)
      .map((i) => ({ id: i.id, email: i.email, role: i.role, expiresOn: i.expiresAt })),
  }
}

export function invite(tenantId: Uuid, actorUserId: Uuid, input: InviteInput): InviteResult {
  actor(tenantId, actorUserId)
  const members = team(tenantId)
  if (members.members.some((m) => m.email.toLowerCase() === input.email)) {
    return { ok: false, error: 'alreadyMember' }
  }
  if (members.invitations.some((i) => i.email === input.email)) {
    return { ok: false, error: 'alreadyInvited' }
  }
  db.invitations.push({
    id: newId('01931000', db.invitations.length),
    tenantId,
    email: input.email,
    role: input.role,
    expiresAt: addDays(mockToday(), INVITATION_DAYS),
    acceptedAt: null,
    invitedBy: actorUserId,
  })
  audit(tenantId, actorUserId, 'member', 'member.invite', input.email)
  return { ok: true }
}

export function revokeInvitation(tenantId: Uuid, actorUserId: Uuid, invitationId: Uuid): void {
  actor(tenantId, actorUserId)
  const at = db.invitations.findIndex((i) => i.id === invitationId && i.tenantId === tenantId)
  if (at < 0) throw new Error(`Unknown invitation ${invitationId}`)
  const [gone] = db.invitations.splice(at, 1)
  audit(tenantId, actorUserId, 'member', 'member.revoke', gone?.email ?? '')
}

/**
 * The owner stays the owner (spec/02 §3: nobody else is made one here), and an
 * administrator never touches the owner's row.
 */
export function changeRole(
  tenantId: Uuid,
  actorUserId: Uuid,
  membershipId: Uuid,
  role: InvitableRole,
): void {
  actor(tenantId, actorUserId)
  const m = membershipOf(tenantId, membershipId)
  if (!m || m.role === 'owner') throw new Error(`Cannot change membership ${membershipId}`)
  m.role = role
  // A bookkeeper's permission to sign does not carry over to another role (04 can_sign).
  if (role !== 'bookkeeper') m.canSign = false
  audit(tenantId, actorUserId, 'member', 'member.role', userEmail(m.userId))
}

export function removeMember(tenantId: Uuid, actorUserId: Uuid, membershipId: Uuid): void {
  actor(tenantId, actorUserId)
  const m = membershipOf(tenantId, membershipId)
  if (!m || m.role === 'owner') throw new Error(`Cannot remove membership ${membershipId}`)
  db.memberships.splice(db.memberships.indexOf(m), 1)
  // Their signer row stays for what they signed, but inactive (04 signers).
  for (const s of db.signers) {
    if (s.tenantId === tenantId && s.userId === m.userId) s.isActive = false
  }
  audit(tenantId, actorUserId, 'member', 'member.remove', userEmail(m.userId))
}

const userEmail = (userId: Uuid) => db.users.find((u) => u.id === userId)?.email ?? ''

// ---------------------------------------------------------------------------
// Signers

export function signers(tenantId: Uuid): SignersDTO {
  const members = db.memberships.filter((m) => m.tenantId === tenantId && m.status === 'active')
  const rows = db.signers.filter((s) => s.tenantId === tenantId)
  return {
    signers: rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      fullName: s.fullName,
      title: s.title,
      email: userEmail(s.userId),
      isActive: s.isActive,
    })),
    candidates: members
      .filter(
        (m) =>
          SIGNING_ROLES.includes(m.role) &&
          (m.role !== 'bookkeeper' || m.canSign) &&
          !rows.some((s) => s.userId === m.userId),
      )
      .map((m) => ({ userId: m.userId, name: userName(m.userId) ?? '' })),
    bookkeepers: members
      .filter((m) => m.role === 'bookkeeper')
      .map((m) => ({ membershipId: m.id, name: userName(m.userId) ?? '', canSign: m.canSign })),
  }
}

export function addSigner(tenantId: Uuid, actorUserId: Uuid, input: SignerInput): void {
  actor(tenantId, actorUserId)
  const candidate = signers(tenantId).candidates.find((c) => c.userId === input.userId)
  if (!candidate) throw new Error(`User ${input.userId} may not sign here`)
  db.signers.push({
    id: newId('0192f000', db.signers.length),
    tenantId,
    userId: input.userId,
    fullName: input.fullName,
    title: input.title,
    isActive: true,
  })
  audit(tenantId, actorUserId, 'member', 'signer.add', input.fullName)
}

export function setSignerActive(
  tenantId: Uuid,
  actorUserId: Uuid,
  signerId: Uuid,
  active: boolean,
): void {
  actor(tenantId, actorUserId)
  const s = db.signers.find((x) => x.id === signerId && x.tenantId === tenantId)
  if (!s) throw new Error(`Unknown signer ${signerId}`)
  s.isActive = active
  audit(
    tenantId,
    actorUserId,
    'member',
    active ? 'signer.activate' : 'signer.deactivate',
    s.fullName,
  )
}

/** Only the owner calls this (spec/02 §3, the guard in the action). */
export function setBookkeeperCanSign(
  tenantId: Uuid,
  actorUserId: Uuid,
  membershipId: Uuid,
  canSign: boolean,
): void {
  actor(tenantId, actorUserId)
  const m = membershipOf(tenantId, membershipId)
  if (m?.role !== 'bookkeeper') throw new Error(`Not a bookkeeper ${membershipId}`)
  m.canSign = canSign
  // Without the permission the bookkeeper's signer row cannot sign either.
  if (!canSign) {
    for (const s of db.signers) {
      if (s.tenantId === tenantId && s.userId === m.userId) s.isActive = false
    }
  }
  audit(tenantId, actorUserId, 'member', 'member.can_sign', userEmail(m.userId))
}

// ---------------------------------------------------------------------------
// Billing (spec/08; Stripe comes in step 7)

function subscriptionOf(tenantId: Uuid) {
  const sub = db.subscriptions.find((s) => s.tenantId === tenantId)
  if (!sub) throw new Error(`Tenant ${tenantId} has no subscription`)
  return sub
}

export function billing(tenantId: Uuid): BillingDTO {
  const t = tenantOf(tenantId)
  const sub = subscriptionOf(tenantId)
  return {
    status: t.status,
    trialEndsOn: t.trialEndsAt,
    periodEndsOn: sub.currentPeriodEnd,
    setupTier: t.setupTier,
    setupPaidOn: sub.setupPaidAt,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    pauseResumesOn: t.status === 'paused' ? sub.pauseResumesAt : null,
    purgeAfter: t.purgeAfter,
  }
}

/** spec/08 §2.3: our pause, up to 3 months; reading and export go on. */
export function pause(tenantId: Uuid, actorUserId: Uuid, months: number): void {
  actor(tenantId, actorUserId)
  const t = tenantOf(tenantId)
  if (t.status !== 'active' && t.status !== 'trial') throw new Error('Only a running plan pauses')
  t.status = 'paused'
  subscriptionOf(tenantId).pauseResumesAt = addMonths(mockToday(), months)
  audit(tenantId, actorUserId, 'billing', 'billing.pause', String(months))
}

export function unpause(tenantId: Uuid, actorUserId: Uuid): void {
  actor(tenantId, actorUserId)
  const t = tenantOf(tenantId)
  if (t.status !== 'paused') throw new Error('Not paused')
  t.status = 'active'
  subscriptionOf(tenantId).pauseResumesAt = null
  audit(tenantId, actorUserId, 'billing', 'billing.unpause', '')
}

/** At the end of the period (08 §2.3); until then nothing changes. */
export function cancel(tenantId: Uuid, actorUserId: Uuid, input: CancelInput): void {
  actor(tenantId, actorUserId)
  const sub = subscriptionOf(tenantId)
  sub.cancelAtPeriodEnd = true
  sub.cancelReason = input.note ? `${input.reason}: ${input.note}` : input.reason
  audit(tenantId, actorUserId, 'billing', 'billing.cancel', input.reason)
}

export function keepSubscription(tenantId: Uuid, actorUserId: Uuid): void {
  actor(tenantId, actorUserId)
  const sub = subscriptionOf(tenantId)
  sub.cancelAtPeriodEnd = false
  sub.cancelReason = null
  audit(tenantId, actorUserId, 'billing', 'billing.keep', '')
}

// ---------------------------------------------------------------------------
// Notifications

export function notifications(tenantId: Uuid): NotificationsDTO {
  const t = tenantOf(tenantId)
  const { settings } = t
  return {
    deadlineReminderDays: [...settings.deadlineReminderDays].sort((a, b) => b - a),
    reminderDay: settings.reminderDay,
    members: team(tenantId).members.map((member) => {
      const m = membershipOf(tenantId, member.membershipId)
      return {
        membershipId: member.membershipId,
        userId: member.userId,
        name: member.name,
        role: member.role,
        notifyDeadline: m?.notifyDeadline ?? false,
        notifyMissingWeek: m?.notifyMissingWeek ?? false,
        notifyBilling: m?.notifyBilling ?? false,
        notifyNewMember: m?.notifyNewMember ?? false,
      }
    }),
    sms:
      settings.smsPhone && settings.smsConsentAt
        ? { phone: settings.smsPhone, consentAt: settings.smsConsentAt.slice(0, 10) }
        : null,
  }
}

export function saveNotifications(tenantId: Uuid, input: NotificationsInput): void {
  const t = tenantOf(tenantId)
  t.settings.deadlineReminderDays = [...new Set(input.deadlineReminderDays)].sort((a, b) => b - a)
  t.settings.reminderDay = input.reminderDay
  for (const row of input.members) {
    const m = membershipOf(tenantId, row.membershipId)
    if (!m) continue
    m.notifyDeadline = row.notifyDeadline
    m.notifyMissingWeek = row.notifyMissingWeek
    m.notifyBilling = row.notifyBilling
    m.notifyNewMember = row.notifyNewMember
  }
}

/**
 * Text messages only with written consent (spec/11, TCPA): the exact words
 * the user agreed to are kept with the moment. Null turns them off.
 */
export function setSms(tenantId: Uuid, input: SmsInput | null, consentText: string): void {
  const { settings } = tenantOf(tenantId)
  if (input === null) {
    settings.smsPhone = null
    settings.smsConsentAt = null
    settings.smsConsentText = null
    return
  }
  settings.smsPhone = input.phone
  settings.smsConsentAt = mockNow()
  settings.smsConsentText = consentText
}

// ---------------------------------------------------------------------------
// Audit log

/**
 * The log newest first, with each read of a worker's details from
 * pii_access_log as a row of its own kind (spec/11 §5: the owner sees who
 * looked at addresses).
 */
export function auditLog(tenantId: Uuid, filter: AuditFilter = {}): AuditDTO {
  const workerName = (id: Uuid) => {
    const w = db.workers.find((x) => x.id === id && x.tenantId === tenantId)
    return w ? `${w.lastName}, ${w.firstName}` : ''
  }
  const all = [
    ...db.auditLog
      .filter((r) => r.tenantId === tenantId)
      .map((r) => ({
        id: `a${r.id}`,
        at: r.at,
        userId: r.actorUserId,
        kind: r.kind,
        action: r.action,
        detail: r.detail,
      })),
    ...db.piiAccessLog
      .filter((r) => r.tenantId === tenantId)
      .map((r, i) => ({
        id: `p${i + 1}`,
        at: r.at,
        userId: r.userId,
        kind: 'pii' as const,
        action: 'pii.read',
        detail: workerName(r.workerId),
      })),
  ].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
  const people = [...new Set(all.flatMap((r) => (r.userId ? [r.userId] : [])))]
    .map((userId) => ({ userId, name: userName(userId) ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    rows: all
      .filter(
        (r) =>
          (!filter.userId || r.userId === filter.userId) &&
          (!filter.kind || r.kind === filter.kind),
      )
      .map((r) => ({ ...r, userName: userName(r.userId) })),
    people,
  }
}

// ---------------------------------------------------------------------------
// Company extras and the company's data

export function setCompanyExtras(
  tenantId: Uuid,
  actorUserId: Uuid,
  input: { timezone: Timezone; logo?: { contentType: string; base64: string } | null },
): void {
  actor(tenantId, actorUserId)
  const t = tenantOf(tenantId)
  t.timezone = input.timezone
  if (input.logo !== undefined) t.logo = input.logo
  audit(tenantId, actorUserId, 'company', 'company.update', t.legalName)
}

export function companyExtras(tenantId: Uuid): {
  timezone: string
  logo: { contentType: string; base64: string } | null
} {
  const t = tenantOf(tenantId)
  return { timezone: t.timezone, logo: t.logo }
}

/**
 * "Export everything" (03 §4.9): the company's data as JSON with the workers'
 * details, which pii.ts reads and logs as an export, and the archive of every
 * project. In the mock the report files in it are examples.
 */
export function exportAll(
  tenantId: Uuid,
  actorUserId: Uuid,
  archiveTexts: Parameters<typeof exportArchive>[2],
): { name: string; contentType: string; body: Uint8Array<ArrayBuffer> } {
  actor(tenantId, actorUserId)
  const t = tenantOf(tenantId)
  const own = <T extends { tenantId: Uuid }>(rows: T[]) =>
    rows.filter((r) => r.tenantId === tenantId)
  const pii = exportPii(tenantId, actorUserId)
  const data = {
    company: {
      legalName: t.legalName,
      address: [t.addressLine1, t.addressLine2, t.city, t.stateCode, t.zip].filter(Boolean),
      nysRegistrationNumber: t.nysRegistrationNumber,
      timezone: t.timezone,
    },
    projects: own(db.projects),
    classifications: own(db.projectClassifications),
    workers: own(db.workers).map((w) => ({ ...w, ...pii.get(w.id) })),
    fringePlans: own(db.fringePlans),
    weeks: own(db.periods),
    hours: db.timeEntries.filter((e) => own(db.periods).some((p) => p.id === e.periodId)),
    reports: own(db.reports),
    filings: own(db.submissions),
  }
  const encoder = new TextEncoder()
  const archives = own(db.projects).flatMap((p) => {
    const zip = exportArchive(tenantId, p.id, archiveTexts)
    return zip ? [{ name: zip.name, body: zip.body }] : []
  })
  audit(tenantId, actorUserId, 'download', 'export.all', t.legalName)
  return {
    name: `weeklycert-export-${t.slug}.zip`,
    contentType: 'application/zip',
    body: storedZip([
      { name: 'data.json', body: encoder.encode(`${JSON.stringify(data, null, 2)}\n`) },
      ...archives,
    ]),
  }
}

/** 30 days of grace, read-only with full export, then the purge (03 §4.9, 08 §2.3). */
export function requestDeletion(tenantId: Uuid, actorUserId: Uuid): void {
  actor(tenantId, actorUserId)
  const t = tenantOf(tenantId)
  const today = mockToday()
  t.status = 'cancelled'
  t.cancelledAt = today
  t.purgeAfter = addDays(today, GRACE_DAYS)
  audit(tenantId, actorUserId, 'company', 'company.delete', t.legalName)
}
