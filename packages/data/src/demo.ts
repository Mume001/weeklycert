// Mock phase only (spec/19 §1 point 5, §4): the demo user behind each role in
// Hudson Electric, so RoleSwitcher can act as that person without a sign-in.
// Removed in step 4, when Better Auth provides the real session.
import type { MembershipRole, Uuid } from './dto/index.ts'
import { db } from './mock/db.ts'

export const DEMO_TENANT_SLUG = 'hudson-electric'

export function demoUserIdForRole(role: MembershipRole): Uuid {
  const tenant = db.tenants.find((t) => t.slug === DEMO_TENANT_SLUG)
  const m = db.memberships.find((x) => x.tenantId === tenant?.id && x.role === role)
  if (!m) throw new Error(`No demo user for role ${role}`)
  return m.userId
}
