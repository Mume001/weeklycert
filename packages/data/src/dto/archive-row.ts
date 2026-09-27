// /app/[t]/archive (spec/03 §4.8): every filed version of every week, found in
// ten seconds during an audit. One row is one version of one week.
import { z } from 'zod'
import { IsoDateSchema, IsoDateTimeSchema, UuidSchema } from './common.ts'

/** What an archived version is now; the badge words are the week's (spec/15 §3). */
export const ArchiveStatusSchema = z.enum(['signed', 'submitted', 'rejected', 'corrected'])
export type ArchiveStatus = z.infer<typeof ArchiveStatusSchema>

export const ArchiveRowDTOSchema = z.object({
  reportId: UuidSchema,
  projectId: UuidSchema,
  projectName: z.string(),
  prcNumber: z.string().nullable(),
  weekEnding: IsoDateSchema,
  payrollNumber: z.number().int().positive().nullable(),
  version: z.number().int().positive(),
  status: ArchiveStatusSchema,
  signerName: z.string().nullable(),
  submittedAt: IsoDateTimeSchema.nullable(),
  confirmationRef: z.string().nullable(),
  /** The files of this version; in the mock phase one example XML (spec/19 §11). */
  files: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type ArchiveRowDTO = z.infer<typeof ArchiveRowDTOSchema>

export const ArchiveFilterSchema = z.object({
  projectId: z.string().optional(),
  year: z.coerce.number().int().optional(),
  status: ArchiveStatusSchema.optional(),
  /** Latest version of each week only, or every version (spec/03 §4.8). */
  versions: z.enum(['latest', 'all']).optional(),
  /** A worker's name: the weeks the worker appears in. */
  worker: z.string().optional(),
  /** A PRC number or part of a project name: every report for it at once. */
  query: z.string().optional(),
})
export type ArchiveFilter = z.infer<typeof ArchiveFilterSchema>

export interface ArchiveDTO {
  rows: ArchiveRowDTO[]
  /** For the filters: every project that has a filed week, and every year with one. */
  projects: { id: string; name: string; prcNumber: string | null }[]
  years: number[]
  /** The one project the filters narrow to, for "Export everything for this project". */
  exportProjectId: string | null
}
