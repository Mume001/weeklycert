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
  type UserDTO,
} from '@wc/data'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { ROLE_COOKIE } from './mock-role'

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
  const openWeeks = await repos.projects.openWeeks(tenant.id)
  return {
    user,
    tenant,
    tenants,
    role: membership.role,
    pickedRole,
    openWeeks,
    today: repos.today(),
  }
})
