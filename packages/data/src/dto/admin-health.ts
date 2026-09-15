// /admin, platform health (spec/03 §4.10). First draft.
import { z } from 'zod'
import { MoneySchema } from './common.ts'

export const AdminHealthDTOSchema = z.object({
  tenants: z.number().int().nonnegative(),
  activeSubscriptions: z.number().int().nonnegative(),
  mrr: MoneySchema,
  reportsThisWeek: z.number().int().nonnegative(),
  jobs: z.object({
    waiting: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
})
export type AdminHealthDTO = z.infer<typeof AdminHealthDTOSchema>
