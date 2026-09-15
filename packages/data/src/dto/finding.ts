// Shape taken from spec/07 §2. Do not change it here.
import { z } from 'zod'
import { IsoDateSchema, SeveritySchema } from './common.ts'

export const FindingSchema = z.object({
  /** From the catalogue in spec/07 §3, UPPER_SNAKE, never changes. */
  code: z.string().regex(/^[A-Z0-9_]+$/),
  severity: SeveritySchema,
  /** One sentence, in the customer's words. Written by core/validate, never by the UI. */
  message: z.string().min(1),
  detail: z.string().optional(),
  suggestedFix: z.string().optional(),
  workerId: z.string().optional(),
  workDate: IsoDateSchema.optional(),
  classificationId: z.string().optional(),
  /** Which grid field to focus. */
  field: z.string().optional(),
  /** "29 CFR 5.32", "Labor Law 220". */
  rule: z.string().optional(),
})
export type Finding = z.infer<typeof FindingSchema>
