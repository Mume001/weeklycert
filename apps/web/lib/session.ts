// Fake authentication for the mock phase (spec/19 §1 point 5).
// mockSession() returns the demo user behind the role picked in RoleSwitcher.
// Step 4 replaces this file with Better Auth and requireTenant (spec/11 §4).
import {
  demoUserIdForRole,
  getRepositories,
  type MembershipRole,
  MembershipRoleSchema,
  type OpenWeeksDTO,
  type TenantBrief,
  type TenantDTO,
  TenantStatusSchema,
  type UserDTO,
} from '@wc/data'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { ROLE_COOKIE, STATUS_COOKIE } from './mock-role'

export async function mockRole(): Promise<MembershipRole> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value
  const parsed = MembershipRoleSchema.safeParse(value)
  return parsed.success ? parsed.data : 'owner'
}

export async function mockSession(): Promise<{ userId: string; pickedRole: MembershipRole }> {
  const pickedRole = await mockRole()
  return { userId: demoUserIdForRole(pickedRole), pickedRole }
}

export interface ShellContext {
  user: UserDTO
  tenant: TenantDTO
  tenants: TenantBrief[]
  /** The user's role in this company. */
  role: MembershipRole
  /** Whether this membership may sign the certification (spec/02 §2 and §3). */
  canSign: boolean
  /** The role picked in RoleSwitcher (mock only). */
  pickedRole: MembershipRole
  openWeeks: OpenWeeksDTO
  today: string
}

/**
 * Everything the app shell needs for /app/[t]. Returns null when the company
 * does not exist or the user is not a member: the caller answers 404, never
 * 403, so a foreign slug reveals nothing (spec/11 §6). Cached per request, so
 * the layout and the page share one load.
 */
export const loadShell = cache(async (slug: string): Promise<ShellContext | null> => {
  const { userId, pickedRole } = await mockSession()
  const repos = getRepositories()
  const [user, tenant, tenants] = await Promise.all([
    repos.users.get(userId),
    repos.tenants.getBySlug(slug),
    repos.tenants.listForUser(userId),
  ])
  const membership = tenants.find((t) => t.slug === slug)
  if (!user || !tenant || !membership) return null
  // Mock only: a test may play a paused or cancelled company (STATUS_COOKIE).
  const played = TenantStatusSchema.safeParse((await cookies()).get(STATUS_COOKIE)?.value)
  if (played.success) tenant.status = played.data
  const openWeeks = await repos.projects.openWeeks(tenant.id)
  return {
    user,
    tenant,
    tenants,
    role: membership.role,
    canSign:
      SIGNING_ROLES.includes(membership.role) &&
      (membership.role !== 'bookkeeper' || membership.canSign),
    pickedRole,
    openWeeks,
    today: repos.today(),
  }
})

/**
 * Who may sign the certification (spec/02 §3): the signer, the owner and the
 * administrator always, an outside bookkeeper only where the owner turned it
 * on. Payroll never signs; that separation is the reason the role exists.
 */
export const SIGNING_ROLES: readonly MembershipRole[] = ['owner', 'admin', 'signer', 'bookkeeper']

/** Roles that create and change projects, classifications and weeks (spec/02 §3). */
export const PROJECT_WRITERS: readonly MembershipRole[] = [
  'owner',
  'admin',
  'payroll',
  'signer',
  'bookkeeper',
]

export class GuardError extends Error {
  constructor(readonly status: 403 | 404) {
    super(status === 404 ? 'not_found' : 'forbidden')
  }
}

/**
 * The one guard every server action starts with (CLAUDE.md, spec/11 §4). In
 * the mock phase it is the fake session plus the role check of spec/02 §3 and
 * the subscription rule of spec/08 §2.4 (paused and cancelled read only).
 * Step 4 replaces the body with the real requireTenant, which also opens the
 * transaction and sets the tenant for RLS.
 */
export async function requireTenant(
  slug: string,
  roles: readonly MembershipRole[],
  /** A read (Show on a worker's PII) is allowed in a paused company; a write is not. */
  mode: 'write' | 'read' = 'write',
): Promise<ShellContext> {
  const shell = await loadShell(slug)
  if (!shell) throw new GuardError(404)
  if (!roles.includes(shell.role)) throw new GuardError(403)
  if (mode === 'write' && isReadOnlyCompany(shell.tenant)) throw new GuardError(403)
  return shell
}

/**
 * Who may read a worker's address, last 4 of the SSN and date of birth
 * (spec/02 §3): everybody but the viewer, who sees the name and the
 * classification only.
 */
export const PII_READERS: readonly MembershipRole[] = PROJECT_WRITERS

/**
 * Who adds, changes and ends a worker's fringe plans (Mume, 25.9.2026, answer
 * to session G): owner, admin and payroll. Everybody else reads the table.
 */
export const FRINGE_ALLOCATION_WRITERS: readonly MembershipRole[] = ['owner', 'admin', 'payroll']

/** spec/08 §2.4: a paused or cancelled company reads and exports, nothing else. */
export function isReadOnlyCompany(tenant: TenantDTO): boolean {
  return tenant.status === 'paused' || tenant.status === 'cancelled'
}
