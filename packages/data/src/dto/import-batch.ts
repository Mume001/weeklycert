// /app/[t]/imports and /imports/[id] (spec/03 §4.7, spec/04 import_batches).
import { z } from 'zod'
import { ImportKindSchema, IsoDateSchema, IsoDateTimeSchema, UuidSchema } from './common.ts'

/** Where the file came from (04 import_profiles.source_kind, the sources of 06 §1). */
export const SOURCE_KINDS = [
  'quickbooks_time',
  'quickbooks_payroll',
  'adp',
  'gusto',
  'paychex',
  'busybusy',
  'clockshark',
  'generic_xlsx',
  'other',
] as const
export const SourceKindSchema = z.enum(SOURCE_KINDS)
export type SourceKind = z.infer<typeof SourceKindSchema>

/** 04 import_batches.status, plus undone, which the history shows as its own state. */
export const ImportStatusSchema = z.enum([
  'uploaded',
  'mapped',
  'validated',
  'applied',
  'rejected',
  'undone',
])
export type ImportStatus = z.infer<typeof ImportStatusSchema>

export const ImportBatchDTOSchema = z.object({
  id: UuidSchema,
  createdAt: IsoDateTimeSchema,
  createdBy: z.string(),
  fileName: z.string(),
  source: SourceKindSchema,
  profileName: z.string().nullable(),
  kind: ImportKindSchema,
  project: z.object({ id: UuidSchema, name: z.string() }).nullable(),
  weekEnding: IsoDateSchema.nullable(),
  status: ImportStatusSchema,
  rowsTotal: z.number().int().nonnegative(),
  rowsApplied: z.number().int().nonnegative(),
  rowsError: z.number().int().nonnegative(),
  appliedAt: IsoDateTimeSchema.nullable(),
  /** Undo is allowed for 90 days while the week is not signed (03 §4.7). */
  canUndo: z.boolean(),
  /** Why not, when it is applied and cannot be undone. */
  undoRefusal: z.enum(['locked', 'expired']).nullable(),
})
export type ImportBatchDTO = z.infer<typeof ImportBatchDTOSchema>
