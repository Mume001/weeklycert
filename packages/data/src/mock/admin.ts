// The platform admin over the fixtures (spec/03 §4.10). Every function that
// changes something checks that the one acting is the super-admin; the guard
// in the web says so too (requireSuperAdmin). Support access opens a company
// read only for 30 minutes and writes the company's own audit log, so the
// owner sees it with its reason (02 §1, 11 §2).
import { dec, money } from '@wc/core'
import type {
  AdminHealthDTO,
  AdminTenantDTO,
  AdminTenantRowDTO,
  CatalogAdminDTO,
  JobDTO,
  Uuid,
  WageScheduleDTO,
} from '../dto/index.ts'
import { SUPPORT_ACCESS_MINUTES } from '../dto/index.ts'
import { mockToday } from './clock.ts'
import { db } from './db.ts'
import { audit } from './settings.ts'

/** 08 §1: the one price. */
const MONTHLY = '79.00'

function superAdmin(userId: Uuid): Uuid {
  if (!db.users.some((u) => u.id === userId && u.isSuperAdmin)) {
    throw new Error(`User ${userId} is not the platform admin`)
  }
  return userId
}

function row(t: (typeof db.tenants)[number]): AdminTenantRowDTO {
  const last = db.auditLog
    .filter((r) => r.tenantId === t.id)
    .map((r) => r.at)
    .sort()
    .at(-1)
  return {
    id: t.id,
    slug: t.slug,
    legalName: t.legalName,
    status: t.status,
    plan: db.subscriptions.find((s) => s.tenantId === t.id)?.plan ?? null,
    activeProjects: db.projects.filter((p) => p.tenantId === t.id && p.status === 'active').length,
    lastActivity: last ?? null,
  }
}

export function health(): AdminHealthDTO {
  const today = mockToday()
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10)
  const paying = db.tenants.filter((t) => t.status === 'active' || t.status === 'past_due')
  const jobs = (state: JobDTO['state']) => db.jobs.filter((j) => j.state === state).length
  return {
    tenants: db.tenants.length,
    activeSubscriptions: paying.length,
    mrr: money(dec(MONTHLY).times(paying.length)),
    reportsThisWeek: db.reports.filter(
      (r) => r.kind === 'ny_xml' && r.generatedAt.slice(0, 10) >= weekAgo,
    ).length,
    jobs: { waiting: jobs('created'), running: jobs('active'), failed: jobs('failed') },
  }
}

export function tenants(query = ''): AdminTenantRowDTO[] {
  const q = query.trim().toLowerCase()
  return db.tenants
    .filter((t) => !q || t.legalName.toLowerCase().includes(q) || t.slug.includes(q))
    .map(row)
    .sort((a, b) => a.legalName.localeCompare(b.legalName))
}

export function tenant(tenantId: Uuid, superUserId: Uuid, now: string): AdminTenantDTO | null {
  const t = db.tenants.find((x) => x.id === tenantId)
  if (!t) return null
  const members = db.memberships.filter((m) => m.tenantId === tenantId && m.status === 'active')
  const ownerUser = db.users.find((u) => u.id === members.find((m) => m.role === 'owner')?.userId)
  return {
    ...row(t),
    owner: ownerUser ? { name: ownerUser.name, email: ownerUser.email } : null,
    members: members.length,
    createdOn:
      db.auditLog
        .filter((r) => r.tenantId === tenantId)
        .map((r) => r.at.slice(0, 10))
        .sort()[0] ?? null,
    supportUntil: supportAccess(tenantId, superUserId, now),
  }
}

/**
 * The end of an open support access, or null. `now` is the support clock the
 * web passes in (apps/web lib/clock.ts), so a test can move it. An access past
 * its 30 minutes is closed here, at the moment it ran out, and the company's
 * audit log gets its end (11 §2); in step 4 a job does this on time.
 */
export function supportAccess(tenantId: Uuid, superUserId: Uuid, now: string): string | null {
  for (const s of db.supportAccess) {
    if (s.tenantId === tenantId && s.superUserId === superUserId && !s.endedAt && s.until <= now) {
      s.endedAt = s.until
      audit(tenantId, superUserId, 'support', 'support.end', '', s.until)
    }
  }
  const open = db.supportAccess.find(
    (s) => s.tenantId === tenantId && s.superUserId === superUserId && !s.endedAt,
  )
  return open?.until ?? null
}

export function startSupportAccess(
  tenantId: Uuid,
  superUserId: Uuid,
  reason: string,
  now: string,
): string {
  superAdmin(superUserId)
  if (!db.tenants.some((t) => t.id === tenantId)) throw new Error(`Unknown tenant ${tenantId}`)
  const text = reason.trim()
  if (!text) throw new Error('A reason is required')
  const until = new Date(Date.parse(now) + SUPPORT_ACCESS_MINUTES * 60_000).toISOString()
  db.supportAccess.push({ tenantId, superUserId, reason: text, until, endedAt: null })
  audit(tenantId, superUserId, 'support', 'support.start', text, now)
  return until
}

export function endSupportAccess(tenantId: Uuid, superUserId: Uuid, now: string): void {
  superAdmin(superUserId)
  for (const s of db.supportAccess) {
    if (s.tenantId === tenantId && s.superUserId === superUserId && !s.endedAt) {
      s.endedAt = now
    }
  }
  audit(tenantId, superUserId, 'support', 'support.end', '', now)
}

export function jobs(): JobDTO[] {
  return [...db.jobs].sort((a, b) => b.createdOn.localeCompare(a.createdOn))
}

/** A failed job goes back into its queue; "Discard" drops it. */
export function retryJob(jobId: Uuid, superUserId: Uuid): void {
  superAdmin(superUserId)
  const job = db.jobs.find((j) => j.id === jobId && j.state === 'failed')
  if (!job) throw new Error(`No failed job ${jobId}`)
  job.state = 'created'
  job.error = null
}

export function discardJob(jobId: Uuid, superUserId: Uuid): void {
  superAdmin(superUserId)
  const at = db.jobs.findIndex((j) => j.id === jobId && j.state === 'failed')
  if (at < 0) throw new Error(`No failed job ${jobId}`)
  db.jobs.splice(at, 1)
}

export function wageSchedules(): WageScheduleDTO[] {
  return [...db.wageSchedules]
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
    .map((w) => ({
      id: w.id,
      kind: w.kind,
      reference: w.reference,
      fetchedAt: w.fetchedAt,
      state: w.parseStatus,
      rateCount: w.rateCount,
    }))
}

/** The rates reach the companies only after this (04 wage_schedule_cache.approved_by). */
export function approveWageSchedule(scheduleId: Uuid, superUserId: Uuid): void {
  superAdmin(superUserId)
  const w = db.wageSchedules.find((x) => x.id === scheduleId && x.parseStatus === 'needs_review')
  if (!w) throw new Error(`Nothing to approve in ${scheduleId}`)
  w.parseStatus = 'approved'
  w.approvedBy = superUserId
}

export function classifications(): CatalogAdminDTO {
  const diff = db.catalogDiff[0]
  return {
    version: diff?.version ?? '',
    count: db.classificationCatalog.length,
    added: diff?.added ?? [],
    removed: diff?.removed ?? [],
  }
}
