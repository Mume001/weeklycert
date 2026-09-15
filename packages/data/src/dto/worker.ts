// /app/[t]/workers and /workers/[id] (spec/03 §4.6). First draft.
// No address, date of birth or phone here: those are PII and are read only
// through packages/data/src/pii.ts, which logs every read (spec/04 §6).
import { z } from 'zod'
import {
  IsoDateSchema,
  RegistrarSchema,
  UuidSchema,
  WorkerLevelSchema,
  WorkerStatusSchema,
} from './common.ts'

export const WorkerDTOSchema = z.object({
  id: UuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable(),
  /** "Last, First" */
  displayName: z.string(),
  workerNumber: z.string().nullable(),
  level: WorkerLevelSchema,
  status: WorkerStatusSchema,
  hireDate: IsoDateSchema.nullable(),
  defaultClassification: z.object({ id: UuidSchema, name: z.string() }).nullable(),
  /** Which identifier the portal gets. Never the value itself in a list. */
  identifier: z.enum(['ssn_last4', 'date_of_birth', 'missing']),
  hasAddress: z.boolean(),
  projects: z.array(z.object({ id: UuidSchema, name: z.string() })),
  lastWeekWithHours: IsoDateSchema.nullable(),
  apprentice: z
    .object({
      programName: z.string(),
      registrar: RegistrarSchema.nullable(),
      periodNo: z.number().int().positive(),
      pctOfJourney: z.string(),
      validFrom: IsoDateSchema,
      validTo: IsoDateSchema.nullable(),
    })
    .nullable(),
})
export type WorkerDTO = z.infer<typeof WorkerDTOSchema>
