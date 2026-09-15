// /weeks/[we]/review (spec/03 §4.5). First draft for the review session.
import { z } from 'zod'
import {
  DisplayStatusSchema,
  HoursSchema,
  IsoDateSchema,
  MoneySchema,
  PeriodStatusSchema,
  UuidSchema,
} from './common.ts'
import { FindingSchema } from './finding.ts'

export const ReviewDTOSchema = z.object({
  period: z.object({
    id: UuidSchema,
    weekEnding: IsoDateSchema,
    status: PeriodStatusSchema,
    displayStatus: DisplayStatusSchema,
    payrollNumber: z.number().int().positive().nullable(),
    isNoWork: z.boolean(),
  }),
  project: z.object({
    id: UuidSchema,
    name: z.string(),
    prcNumber: z.string().nullable(),
    federallyFunded: z.boolean(),
  }),
  /** Summary per worker. Deductions and net are hidden from viewer (spec/02 §3). */
  workers: z.array(
    z.object({
      workerId: UuidSchema,
      workerName: z.string(),
      classifications: z.array(z.string()),
      stHours: HoursSchema,
      otHours: HoursSchema,
      stRate: MoneySchema,
      otRate: MoneySchema,
      fringeCredit: MoneySchema,
      grossProject: MoneySchema,
      grossAllWork: MoneySchema.nullable(),
      deductions: z
        .array(z.object({ kind: z.string(), label: z.string().nullable(), amount: MoneySchema }))
        .nullable(),
      netPay: MoneySchema.nullable(),
    }),
  ),
  findings: z.array(FindingSchema),
  /** Static, clearly labelled examples until step 5 (spec/19 §11). */
  samples: z.object({ nyXmlFileId: z.string(), wh347FileId: z.string().nullable() }),
})
export type ReviewDTO = z.infer<typeof ReviewDTOSchema>
