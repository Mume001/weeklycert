// Import steps 2 and 3, mapping and check (spec/03 §4.7, spec/06). First draft.
import { z } from 'zod'
import { ImportKindSchema, UuidSchema } from './common.ts'

export const ImportPreviewDTOSchema = z.object({
  batchId: UuidSchema,
  kind: ImportKindSchema,
  columns: z.array(
    z.object({
      source: z.string(),
      sample: z.string(),
      target: z.string().nullable(),
      confidence: z.enum(['sure', 'likely', 'check']),
    }),
  ),
  counts: z.object({
    total: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    warn: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
  }),
  /** First 50 rows as they will be imported. */
  rows: z.array(
    z.object({
      rowNo: z.number().int().positive(),
      status: z.enum(['ok', 'warn', 'error', 'skipped']),
      values: z.record(z.string(), z.string()),
      messages: z.array(z.string()),
    }),
  ),
})
export type ImportPreviewDTO = z.infer<typeof ImportPreviewDTOSchema>
