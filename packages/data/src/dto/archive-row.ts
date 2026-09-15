// One row of /app/[t]/archive (spec/03 §4.8). First draft.
import { z } from 'zod'
import {
  IsoDateSchema,
  IsoDateTimeSchema,
  ReportKindSchema,
  ReportStatusSchema,
  SubmissionOutcomeSchema,
  UuidSchema,
} from './common.ts'

export const ArchiveRowDTOSchema = z.object({
  reportId: UuidSchema,
  projectId: UuidSchema,
  projectName: z.string(),
  prcNumber: z.string().nullable(),
  weekEnding: IsoDateSchema,
  payrollNumber: z.number().int().positive().nullable(),
  version: z.number().int().positive(),
  kind: ReportKindSchema,
  status: ReportStatusSchema,
  signerName: z.string().nullable(),
  submittedAt: IsoDateTimeSchema.nullable(),
  outcome: SubmissionOutcomeSchema.nullable(),
  confirmationRef: z.string().nullable(),
})
export type ArchiveRowDTO = z.infer<typeof ArchiveRowDTOSchema>

export const ArchiveFilterSchema = z.object({
  projectId: UuidSchema.optional(),
  year: z.number().int().optional(),
  workerName: z.string().optional(),
})
export type ArchiveFilter = z.infer<typeof ArchiveFilterSchema>
