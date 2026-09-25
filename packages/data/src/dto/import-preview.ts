// The four steps of /imports/new (spec/03 §4.7, spec/06 §2): what each step
// reads, and what it sends back. The checking itself is core's
// (@wc/core/import); these are its results shaped for the screen.
import { z } from 'zod'
import { ImportKindSchema, type IsoDateSchema } from './common.ts'
import { SourceKindSchema } from './import-batch.ts'

export const DATE_FORMATS = ['MM/DD/YYYY', 'YYYY-MM-DD', 'M/D/YY'] as const
export const DateFormatSchema = z.enum(DATE_FORMATS)

/** Step 1: what the upload says about itself; the file travels separately. */
export const ImportStartSchema = z
  .object({
    kind: ImportKindSchema,
    source: SourceKindSchema,
    projectId: z.string(),
    weekEnding: z.string(),
  })
  .superRefine((s, ctx) => {
    // Hours and payroll land in one week of one project (04 import_batches).
    if (s.kind !== 'workers' && s.projectId === '') {
      ctx.addIssue({ code: 'custom', message: 'projectRequired', path: ['projectId'] })
    }
    if (s.kind !== 'workers' && !/^\d{4}-\d{2}-\d{2}$/.test(s.weekEnding)) {
      ctx.addIssue({ code: 'custom', message: 'weekRequired', path: ['weekEnding'] })
    }
  })
export type ImportStart = z.infer<typeof ImportStartSchema>

/** Step 2: which column feeds which field, and how to read it. */
export const ImportMappingInputSchema = z.object({
  /** Target -> column index. */
  mapping: z.record(z.string(), z.number().int().nonnegative()),
  dateFormat: DateFormatSchema,
  lastWins: z.boolean(),
  /** Empty: do not save a profile. */
  profileName: z.string().trim(),
})
export type ImportMappingInput = z.infer<typeof ImportMappingInputSchema>

/** Step 3: the picks for names and codes the file used (06 §2 step 3). */
export const ImportResolveInputSchema = z.object({
  /** A name in the file -> worker id, or "new" to create a worker with only that name. */
  workers: z.record(z.string(), z.string()),
  /** A code in the file -> project classification id. */
  codes: z.record(z.string(), z.string()),
})
export type ImportResolveInput = z.infer<typeof ImportResolveInputSchema>

export type ImportRowStatus = 'ok' | 'warn' | 'error' | 'skipped'

export interface ImportDraftDTO {
  batchId: string
  kind: z.infer<typeof ImportKindSchema>
  fileName: string
  source: z.infer<typeof SourceKindSchema>
  project: { id: string; name: string } | null
  weekEnding: z.infer<typeof IsoDateSchema> | null
  status: 'uploaded' | 'mapped' | 'validated' | 'applied' | 'rejected' | 'undone'
  /** The same file was imported before (06 §2 step 1). */
  duplicateOf: { batchId: string; date: string } | null
  /** Columns that held full SSNs; cut to the last four on upload (06 §4). */
  fullSsnColumns: string[]
  columns: { name: string; samples: string[] }[]
  /** Every field of this kind: its column, how sure the suggestion was, and whether it is required. */
  fields: {
    target: string
    column: number | null
    confidence: 'sure' | 'likely' | 'check' | null
    required: boolean
  }[]
  dateFormat: z.infer<typeof DateFormatSchema>
  lastWins: boolean
  /** A saved profile with the same columns was loaded (06 §2 step 2). */
  profileName: string | null
  /** Step 3, once mapped: the first 50 rows, and counts over all of them. */
  check: {
    counts: { total: number; ok: number; warn: number; error: number; skipped: number }
    rows: {
      rowNo: number
      status: ImportRowStatus
      messages: string[]
      cells: Record<string, string>
    }[]
    /** Names and codes nothing matched, each once, for the picks. */
    unresolvedWorkers: string[]
    unresolvedCodes: string[]
  } | null
  /** Step 4: per worker, what the file brings against what is known (06 §2 step 4). */
  reconcile: {
    workerId: string
    workerName: string
    /** Hours or gross in the file. */
    inFile: string
    /** Payroll: gross on this project as the engine computes it. Hours: null. */
    onProject: string | null
    /** Hours or gross for all work, the week before. */
    lastWeek: string | null
    /** inFile minus lastWeek, or minus onProject for payroll. */
    difference: string | null
  }[]
  /** Pick lists for step 3. */
  workers: { id: string; name: string }[]
  classifications: { id: string; name: string }[]
}

export interface ImportApplyResult {
  ok: boolean
  /** Why nothing was applied. */
  refused?: 'errors' | 'locked'
  summary?: {
    rowsImported: number
    workers: number
    rowsSkipped: number
    weekEnding: string | null
  }
}
