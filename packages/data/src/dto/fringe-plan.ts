// /app/[t]/fringe-plans (spec/03 §4.6): the table, and the form with the
// converter from a monthly premium to a credit per hour. One zod schema for the
// browser and the server (spec/09 §4); messages are codes, the words are in
// packages/copy (spec/15 §3 Planovi beneficija).
import { z } from 'zod'
import { FringeFundingSchema, MoneySchema, SupplementKindSchema, UuidSchema } from './common.ts'

export const FringePlanDTOSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  kind: SupplementKindSchema,
  funding: FringeFundingSchema,
  planNumber: z.string().nullable(),
  provider: z.string().nullable(),
  annualize: z.boolean(),
  annualCost: MoneySchema.nullable(),
  annualHoursBasis: z.string().nullable(),
  hourlyCredit: z.string().nullable(),
  isLegallyRequired: z.boolean(),
  workerCount: z.number().int().nonnegative(),
})
export type FringePlanDTO = z.infer<typeof FringePlanDTOSchema>

export interface FringePlansDTO {
  plans: FringePlanDTO[]
  /** The company's hours in a year, 2080 unless it set another (spec/04 tenant_settings). */
  annualHoursBasis: string
}

export const FRINGE_FORM_ERRORS = [
  'nameRequired',
  'amountFormat',
  'hoursFormat',
  'creditOrCost',
] as const
export type FringeFormErrorCode = (typeof FRINGE_FORM_ERRORS)[number]

const amount = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+(\.\d{1,4})?$/.test(v), 'amountFormat')
const yearHours = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'hoursFormat')

export const FringePlanInputSchema = z
  .object({
    name: z.string().trim().min(1, 'nameRequired'),
    kind: SupplementKindSchema,
    funding: FringeFundingSchema,
    planNumber: z.string().trim(),
    provider: z.string().trim(),
    hourlyCredit: amount,
    annualCost: amount,
    annualHoursBasis: yearHours,
    annualize: z.boolean(),
    isLegallyRequired: z.boolean(),
  })
  .superRefine((p, ctx) => {
    // Without either there is nothing to credit (core planCredit gives zero).
    if (p.hourlyCredit === '' && p.annualCost === '' && !p.isLegallyRequired) {
      ctx.addIssue({ code: 'custom', message: 'creditOrCost', path: ['hourlyCredit'] })
    }
  })
export type FringePlanInput = z.infer<typeof FringePlanInputSchema>

export type FringeFormErrors = Record<string, FringeFormErrorCode>
export type FringeSaveResult = { ok: true; id: string } | { ok: false; errors: FringeFormErrors }

export function fringeFormErrors(error: z.ZodError): FringeFormErrors {
  const out: FringeFormErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if ((FRINGE_FORM_ERRORS as readonly string[]).includes(issue.message) && !out[path]) {
      out[path] = issue.message as FringeFormErrorCode
    }
  }
  return out
}
