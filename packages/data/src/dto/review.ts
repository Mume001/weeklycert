// /weeks/[we]/review, /sign and /reports (spec/03 §4.5). The week as the
// review screen reads it: the engine's numbers per worker, the payroll figures
// the hours cannot know (gross for all work, deductions, net), and the
// findings that decide whether a report may be generated at all (spec/07 §1).
import { z } from 'zod'
import {
  DisplayStatusSchema,
  HoursSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  MoneySchema,
  PeriodStatusSchema,
  ReportKindSchema,
  ReportStatusSchema,
  SubmissionOutcomeSchema,
  UuidSchema,
  WorkerLevelSchema,
} from './common.ts'
import { FindingSchema } from './finding.ts'

/** payroll_deductions (spec/04 §3.6). */
export const DeductionKindSchema = z.enum([
  'federal_tax',
  'state_tax',
  'local_tax',
  'fica',
  'medicare',
  'sdi',
  'pfl',
  'union_dues',
  'garnishment',
  'insurance',
  'retirement_401k',
  'other',
])
export type DeductionKind = z.infer<typeof DeductionKindSchema>

export const DeductionSchema = z.object({
  kind: DeductionKindSchema,
  label: z.string().nullable(),
  amount: MoneySchema,
})
export type Deduction = z.infer<typeof DeductionSchema>

/**
 * One classification of one worker: the shape WH-347 prints, one line per
 * classification worked (spec/05 §4.3), and the only place rates make sense.
 */
export const ReviewLineSchema = z.object({
  classificationName: z.string(),
  stHours: HoursSchema,
  otHours: HoursSchema,
  stRate: MoneySchema,
  otRate: MoneySchema,
  fringeCredit: MoneySchema,
  cashInLieu: MoneySchema,
  grossProject: MoneySchema,
})
export type ReviewLine = z.infer<typeof ReviewLineSchema>

export const ReviewWorkerSchema = z.object({
  workerId: UuidSchema,
  workerName: z.string(),
  level: WorkerLevelSchema,
  lines: z.array(ReviewLineSchema),
  stHours: HoursSchema,
  otHours: HoursSchema,
  grossProject: MoneySchema,
  /** What payroll paid for every job that week. Typed here or imported (spec/03 §4.5). */
  grossAllWork: MoneySchema,
  deductions: z.array(DeductionSchema),
  deductionsTotal: MoneySchema,
  netPay: MoneySchema,
  /** False while nobody has entered the payroll side for this worker. */
  hasPayroll: z.boolean(),
  ssnLast4: z.string().nullable(),
})
export type ReviewWorker = z.infer<typeof ReviewWorkerSchema>

export const ReviewDTOSchema = z.object({
  period: z.object({
    id: UuidSchema,
    weekEnding: IsoDateSchema,
    status: PeriodStatusSchema,
    displayStatus: DisplayStatusSchema,
    payrollNumber: z.number().int().positive().nullable(),
    expectedPayrollNumber: z.number().int().positive().nullable(),
    isNoWork: z.boolean(),
    lockedReason: z.enum(['signed', 'submitted']).nullable(),
    /** When the certification was signed, and the name on it. */
    signedAt: IsoDateTimeSchema.nullable(),
    signedBy: z.string().nullable(),
  }),
  project: z.object({
    id: UuidSchema,
    name: z.string(),
    prcNumber: z.string().nullable(),
    projectNumber: z.string().nullable(),
    siteAddress: z.string().nullable(),
    federallyFunded: z.boolean(),
  }),
  /** What the portal asks for by hand and the file does not carry (spec/05 §3.4). */
  company: z.object({
    legalName: z.string(),
    feinLast4: z.string().nullable(),
    nysRegistrationNumber: z.string().nullable(),
  }),
  workers: z.array(ReviewWorkerSchema),
  totals: z.object({ stHours: HoursSchema, otHours: HoursSchema, grossProject: MoneySchema }),
  findings: z.array(FindingSchema),
  /** Which statement boxes are ticked, from the data (spec/05 §4.4). */
  hasApprentices: z.boolean(),
  hasFringe: z.boolean(),
  /** The newest version, when one has been generated. */
  latestVersion: z.number().int().positive().nullable(),
  /** A static example until the generator exists (spec/19 §11). */
  sampleXml: z.string(),
})
export type ReviewDTO = z.infer<typeof ReviewDTOSchema>

/** What one worker's payroll side looks like when it is typed in. */
export const PayrollInputSchema = z.object({
  workerId: UuidSchema,
  grossAllWork: z.string().trim(),
  netPay: z.string().trim(),
  deductions: z.array(
    z.object({ kind: DeductionKindSchema, label: z.string().trim(), amount: z.string().trim() }),
  ),
})
export type PayrollInput = z.infer<typeof PayrollInputSchema>

export const SignInputSchema = z.object({
  fullName: z.string().trim().min(1, 'nameRequired'),
  title: z.string().trim().min(1, 'titleRequired'),
  phone: z.string().trim(),
  email: z.string().trim(),
  understood: z.literal(true, 'understandRequired'),
  /** spec/02 §4 rule 6: the session is not enough, the signer re-authenticates. */
  reauth: z.string().trim().min(1, 'reauthRequired'),
})
export type SignInput = z.infer<typeof SignInputSchema>

export const SIGN_ERRORS = [
  'nameRequired',
  'titleRequired',
  'understandRequired',
  'reauthRequired',
] as const
export type SignErrorCode = (typeof SIGN_ERRORS)[number]
export type SignErrors = Record<string, SignErrorCode>

/** Who the certification is signed as, prefilled from `signers` (spec/04 §3.2). */
export const SignerDTOSchema = z.object({
  signerId: UuidSchema.nullable(),
  fullName: z.string(),
  title: z.string(),
  phone: z.string(),
  email: z.string(),
})
export type SignerDTO = z.infer<typeof SignerDTOSchema>

export const ReportFileSchema = z.object({
  /** Not a uuid: it names the report and which of its files (`{reportId}:{kind}`). */
  id: z.string().min(1),
  kind: ReportKindSchema,
  /** The name it downloads under. An example file says so in its name (spec/19 §11). */
  name: z.string(),
})

export const ReportVersionSchema = z.object({
  id: UuidSchema,
  version: z.number().int().positive(),
  status: ReportStatusSchema,
  generatedAt: IsoDateTimeSchema,
  signedAt: IsoDateTimeSchema.nullable(),
  signedBy: z.object({ name: z.string(), title: z.string() }).nullable(),
  files: z.array(ReportFileSchema),
})
export type ReportVersion = z.infer<typeof ReportVersionSchema>

export const SubmissionDTOSchema = z.object({
  id: UuidSchema,
  version: z.number().int().positive().nullable(),
  channel: z.enum(['ny_portal_manual', 'email_to_prime', 'portal_other', 'download_only']),
  submittedAt: IsoDateTimeSchema,
  confirmationRef: z.string().nullable(),
  outcome: SubmissionOutcomeSchema,
  outcomeAt: IsoDateTimeSchema.nullable(),
  rejectionReason: z.string().nullable(),
  recipient: z.string().nullable(),
})
export type SubmissionDTO = z.infer<typeof SubmissionDTOSchema>

export const ReportsDTOSchema = z.object({
  period: ReviewDTOSchema.shape.period,
  project: ReviewDTOSchema.shape.project,
  company: ReviewDTOSchema.shape.company,
  versions: z.array(ReportVersionSchema),
  submissions: z.array(SubmissionDTOSchema),
  /** Email of the general contractor, when the project has one. */
  primeContractorEmail: z.string().nullable(),
})
export type ReportsDTO = z.infer<typeof ReportsDTOSchema>

/** The fake progress of the generate job (spec/19 §2, api/v1/reports/[id]/status). */
export const ReportStatusDTOSchema = z.object({
  reportId: UuidSchema,
  state: z.enum(['queued', 'running', 'done', 'failed']),
  /** 0 to 100. */
  progress: z.number().int().min(0).max(100),
  version: z.number().int().positive(),
})
export type ReportStatusDTO = z.infer<typeof ReportStatusDTOSchema>
