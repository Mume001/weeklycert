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
import { supportNow } from './clock'
import { ROLE_COOKIE, STATUS_COOKIE, USER_COOKIE } from './mock-role'

export async function mockRole(): Promise<MembershipRole> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value
  const parsed = MembershipRoleSchema.safeParse(value)
  return parsed.success ? parsed.data : 'owner'
}

/**
 * The signed-in user: the one who signed in (USER_COOKIE), or else the demo
 * user of the picked role. Whoever it is, a company opens only through its
 * membership (loadShell), so nobody becomes another company's owner.
 */
export async function mockSession(): Promise<{ userId: string; pickedRole: MembershipRole }> {
  const pickedRole = await mockRole()
  const signedIn = (await cookies()).get(USER_COOKIE)?.value
  if (signedIn && (await getRepositories().users.get(signedIn))) {
    return { userId: signedIn, pickedRole }
  }
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
  if (!user || !tenant) return null
  // The platform admin is no member (02 §1): in only through an open support
  // access, read only, seen as the owner would see it (03 §4.10, 11 §2).
  const supportUntil =
    !membership && user.isSuperAdmin
      ? await repos.admin.supportAccess(tenant.id, user.id, await supportNow())
      : null
  if (!membership && !supportUntil) return null
  if (supportUntil) tenant.supportUntil = supportUntil
  const role: MembershipRole = membership?.role ?? 'owner'
  // Mock only: a test may play a paused or cancelled company (STATUS_COOKIE).
  const played = TenantStatusSchema.safeParse((await cookies()).get(STATUS_COOKIE)?.value)
  if (played.success) tenant.status = played.data
  const openWeeks = await repos.projects.openWeeks(tenant.id)
  return {
    user,
    tenant,
    tenants,
    role,
    // Support access never signs (11 §2: read only).
    canSign:
      membership !== undefined &&
      SIGNING_ROLES.includes(role) &&
      (role !== 'bookkeeper' || membership.canSign),
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
 * Who downloads the archive's NY XML, CSV summary and "Export everything"
 * (spec/02 §3, Mume 27.9.2026): they carry the last 4 of the SSN and
 * addresses, so never the viewer. The viewer gets only the generated PDF, from
 * step 5; until then no file at all.
 */
export const ARCHIVE_FILE_READERS: readonly MembershipRole[] = PII_READERS

/**
 * Who adds, changes and ends a worker's fringe plans: the same roles as the
 * fringe plans themselves, spec/02 §3 row "Beneficije po radniku" (Mume,
 * 26.9.2026). permissions.test.ts reads that row.
 */
export const FRINGE_ALLOCATION_WRITERS: readonly MembershipRole[] = PROJECT_WRITERS

/** spec/08 §2.4: a paused or cancelled company reads and exports, nothing else. */
export function isReadOnlyCompany(tenant: TenantDTO): boolean {
  // Support access is read only too (11 §2).
  return tenant.status === 'paused' || tenant.status === 'cancelled' || !!tenant.supportUntil
}

/**
 * The guard of /admin (spec/11 §4): the super-admin flag, with two-factor on.
 * The IP allowlist is step 4's (Cloudflare Access or middleware).
 */
export async function requireSuperAdmin(): Promise<{ user: UserDTO }> {
  const { user } = await requireSession()
  const account = await getRepositories().auth.account(user.id)
  if (!user.isSuperAdmin || !account?.twoFactor) throw new GuardError(403)
  return { user }
}

// Settings (spec/03 §4.9). Each list is one row of the matrix in spec/02 §3;
// permissions.test.ts reads that row. The viewer has no Settings at all (02 §5).

/** "Firma: profil, FEIN, registracija": the owner and the administrator write. */
export const COMPANY_WRITERS: readonly MembershipRole[] = ['owner', 'admin']
/** "Članovi": the owner, and the administrator for everyone but the owner. */
export const MEMBER_MANAGERS: readonly MembershipRole[] = ['owner', 'admin']
/** "Članovi": only the owner removes (the administrator has CRU, no D). */
export const MEMBER_REMOVERS: readonly MembershipRole[] = ['owner']
/** "Potpisnici": the same as the members; the bookkeeper switch is the owner's. */
export const SIGNER_MANAGERS: readonly MembershipRole[] = ['owner', 'admin']
/** "Naplata": the owner alone. */
export const BILLING_ROLES: readonly MembershipRole[] = ['owner']
/** "Firma: brisanje, izvoz svega": the owner alone. */
export const DATA_OWNERS: readonly MembershipRole[] = ['owner']
/** "Audit log firme": the owner and the administrator read it. */
export const AUDIT_READERS: readonly MembershipRole[] = ['owner', 'admin']
/** "Podsjetnici i obavještenja": the owner and the administrator change them. */
export const NOTIFICATION_WRITERS: readonly MembershipRole[] = ['owner', 'admin']
/** "Podsjetnici i obavještenja": payroll, signer and bookkeeper read their own. */
export const NOTIFICATION_READERS: readonly MembershipRole[] = [
  'owner',
  'admin',
  'payroll',
  'signer',
  'bookkeeper',
]

/**
 * The guard of /account and /account/security (spec/11 §4): a signed-in user,
 * no company. In the mock the session is the demo user of the picked role.
 */
export async function requireSession(): Promise<{ user: UserDTO }> {
  const { userId } = await mockSession()
  const user = await getRepositories().users.get(userId)
  if (!user) throw new GuardError(404)
  return { user }
}
