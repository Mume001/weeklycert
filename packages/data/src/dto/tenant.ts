// The active company, as the app shell needs it (spec/03 §3, spec/04 tenants).
import { z } from 'zod'
import { DowSchema, IsoDateSchema, TenantStatusSchema, UuidSchema } from './common.ts'

export const TenantDTOSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  legalName: z.string(),
  status: TenantStatusSchema,
  /** Set while status is trial. */
  trialEndsAt: IsoDateSchema.nullable(),
  /** First failed charge, while status is past_due (spec/08). */
  pastDueSince: IsoDateSchema.nullable(),
  weekEndsOn: DowSchema,
  timezone: z.string(),
  /** Named in ForbiddenState ("Ask {Owner name} for access", spec/15 §3). */
  owner: z.object({ name: z.string(), email: z.email() }),
})
export type TenantDTO = z.infer<typeof TenantDTOSchema>
