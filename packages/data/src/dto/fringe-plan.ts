// /app/[t]/fringe-plans (spec/03 §4.6). First draft.
import { z } from 'zod'
import { FringeFundingSchema, MoneySchema, SupplementKindSchema, UuidSchema } from './common.ts'

export const FringePlanDTOSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  kind: SupplementKindSchema,
  funding: FringeFundingSchema,
  planNumber: z.string().nullable(),
  annualize: z.boolean(),
  annualCost: MoneySchema.nullable(),
  annualHoursBasis: z.string().nullable(),
  hourlyCredit: MoneySchema.nullable(),
  workerCount: z.number().int().nonnegative(),
})
export type FringePlanDTO = z.infer<typeof FringePlanDTOSchema>
