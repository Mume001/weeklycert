// One row of import history, /app/[t]/imports (spec/03 §4.7). First draft.
import { z } from 'zod'
import { ImportKindSchema, IsoDateTimeSchema, UuidSchema } from './common.ts'

export const ImportBatchDTOSchema = z.object({
  id: UuidSchema,
  createdAt: IsoDateTimeSchema,
  createdBy: z.string(),
  profileName: z.string().nullable(),
  kind: ImportKindSchema,
  status: z.enum(['uploaded', 'mapped', 'validated', 'applied', 'rejected']),
  rowsTotal: z.number().int().nonnegative(),
  rowsError: z.number().int().nonnegative(),
  /** Undo is allowed for 90 days while the week is not signed. */
  canUndo: z.boolean(),
})
export type ImportBatchDTO = z.infer<typeof ImportBatchDTOSchema>
