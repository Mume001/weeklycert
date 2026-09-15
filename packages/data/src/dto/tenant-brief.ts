// One entry in the company switcher (spec/19 §5, text in spec/15 §3).
import { z } from 'zod'
import { MembershipRoleSchema, UuidSchema } from './common.ts'

export const TenantBriefSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  /** The user's role in this company. */
  role: MembershipRoleSchema,
  activeProjects: z.number().int().nonnegative(),
})
export type TenantBrief = z.infer<typeof TenantBriefSchema>
