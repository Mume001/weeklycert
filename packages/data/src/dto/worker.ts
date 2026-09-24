// /app/[t]/workers, /workers/new and /workers/[id] (spec/03 §4.6).
//
// No address, date of birth, phone or SSN in any DTO here: those are PII and
// are read only through packages/data/src/pii.ts, one part at a time, when the
// user clicks Show, and every read is logged (spec/02 §4 rule 4, spec/04 §6).
// The viewer gets WorkerNameDTO and nothing else (spec/02 §3).
//
// One zod schema for the browser and for the server (spec/09 §4). Its messages
// are codes; the words are in packages/copy (spec/15 §3 Radnici).
import { z } from 'zod'
import {
  IsoDateSchema,
  RegistrarSchema,
  UuidSchema,
  WorkerLevelSchema,
  WorkerStatusSchema,
} from './common.ts'

const ClassificationRef = z.object({ id: UuidSchema, name: z.string() })

/** One row of /workers for the roles that may read more than a name (spec/03 §4.6). */
export const WorkerRowDTOSchema = z.object({
  id: UuidSchema,
  /** "Last, First" */
  displayName: z.string(),
  workerNumber: z.string().nullable(),
  level: WorkerLevelSchema,
  status: WorkerStatusSchema,
  defaultClassification: ClassificationRef.nullable(),
  projects: z.array(z.object({ id: UuidSchema, name: z.string() })),
  lastWeekWithHours: IsoDateSchema.nullable(),
})
export type WorkerRowDTO = z.infer<typeof WorkerRowDTOSchema>

/** All the viewer may see of a worker: the name and the classification (spec/02 §3). */
export const WorkerNameDTOSchema = z.object({
  id: UuidSchema,
  displayName: z.string(),
  status: WorkerStatusSchema,
  defaultClassification: ClassificationRef.nullable(),
})
export type WorkerNameDTO = z.infer<typeof WorkerNameDTOSchema>

export interface WorkerListFilter {
  status?: 'active' | 'inactive'
  /** Part of a name or of the worker number. */
  query?: string
}

export const WORKER_FORM_ERRORS = [
  'firstRequired',
  'lastRequired',
  'middleLength',
  'ssnFormat',
  'idRequired',
  'idBoth',
  'numberTaken',
  'addressIncomplete',
  'address1Length',
  'address2Length',
  'cityLength',
  'zipFormat',
  'zipExtFormat',
  'programRequired',
  'tradeRequired',
  'periodFormat',
  'pctRange',
  'validFromRequired',
] as const
export type WorkerFormErrorCode = (typeof WORKER_FORM_ERRORS)[number]

const ISO = /^\d{4}-\d{2}-\d{2}$/
const optionalDate = z.string().refine((v) => v === '' || ISO.test(v))

/** Exactly four digits, or empty. Nine digits never pass (spec/11 §5). */
export const SSN_LAST4 = /^\d{4}$/

/**
 * The home address as the NY portal takes it (spec/04 worker_pii, XML limits).
 * Every field empty is no address; a part of one is a mistake.
 */
export const AddressInputSchema = z
  .object({
    address1: z.string().trim().max(42, 'address1Length'),
    address2: z.string().trim().max(42, 'address2Length'),
    city: z.string().trim().max(40, 'cityLength'),
    state: z.string().trim().max(50),
    postalCode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{5}$/.test(v), 'zipFormat'),
    postalCodeExt: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{4}$/.test(v), 'zipExtFormat'),
    phone: z.string().trim(),
  })
  .superRefine((a, ctx) => {
    const any = a.address1 || a.address2 || a.city || a.state || a.postalCode || a.postalCodeExt
    const whole = a.address1 && a.city && a.state && a.postalCode
    if (any && !whole) {
      ctx.addIssue({ code: 'custom', message: 'addressIncomplete', path: ['address1'] })
    }
  })
export type AddressInput = z.infer<typeof AddressInputSchema>

export const ApprenticeInputSchema = z.object({
  programName: z.string().trim().min(1, 'programRequired'),
  registrar: z.union([RegistrarSchema, z.literal('')]),
  programRegistrationNo: z.string().trim(),
  trade: z.string().trim().min(1, 'tradeRequired'),
  periodNo: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'periodFormat'),
  /** 40.00 to 95.00 (spec/04 apprentice_records). */
  pctOfJourney: z
    .string()
    .trim()
    .refine((v) => /^\d{2}(\.\d{1,2})?$/.test(v) && Number(v) >= 40 && Number(v) <= 95, 'pctRange'),
  validFrom: z.string().regex(ISO, 'validFromRequired'),
  validTo: optionalDate,
})
export type ApprenticeInput = z.infer<typeof ApprenticeInputSchema>

/**
 * Every value as the form holds it. A PII part that was not shown and not
 * typed is `undefined`, which means "unchanged": the form never has to read a
 * value only to send it back.
 */
export const WorkerInputSchema = z
  .object({
    firstName: z.string().trim().min(1, 'firstRequired'),
    middleName: z.string().trim().max(45, 'middleLength'),
    lastName: z.string().trim().min(1, 'lastRequired'),
    workerNumber: z.string().trim(),
    defaultClassificationId: z.string(),
    level: WorkerLevelSchema,
    hireDate: optionalDate,
    status: WorkerStatusSchema,
    ssnLast4: z
      .string()
      .trim()
      .refine((v) => v === '' || SSN_LAST4.test(v), 'ssnFormat')
      .optional(),
    dateOfBirth: optionalDate.optional(),
    address: AddressInputSchema.optional(),
    /** Only for a registered apprentice; null otherwise. */
    apprentice: ApprenticeInputSchema.nullable(),
  })
  .superRefine((w, ctx) => {
    // Checked here only when both are in the form; with one of them still
    // hidden, the server checks against the stored value (identifierIssue).
    if (w.ssnLast4 !== undefined && w.dateOfBirth !== undefined) {
      const issue = identifierIssue(w.ssnLast4, w.dateOfBirth)
      if (issue) ctx.addIssue({ code: 'custom', message: issue, path: ['ssnLast4'] })
    }
  })
export type WorkerInput = z.infer<typeof WorkerInputSchema>

/**
 * spec/04 worker_pii: the portal takes the last four of the SSN or a date of
 * birth, one of the two (NY rule XOR). Null when the pair is right.
 */
export function identifierIssue(ssnLast4: string, dateOfBirth: string): WorkerFormErrorCode | null {
  if (ssnLast4 === '' && dateOfBirth === '') return 'idRequired'
  if (ssnLast4 !== '' && dateOfBirth !== '') return 'idBoth'
  return null
}

export interface WorkerFormError {
  code: WorkerFormErrorCode
  values?: Record<string, string>
}
export type WorkerFormErrors = Record<string, WorkerFormError>
export type WorkerSaveResult = { ok: true; id: string } | { ok: false; errors: WorkerFormErrors }

/** Turns zod issues into field errors. Shared by the form and the server. */
export function workerFormErrors(error: z.ZodError): WorkerFormErrors {
  const out: WorkerFormErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    const code = (WORKER_FORM_ERRORS as readonly string[]).includes(issue.message)
      ? (issue.message as WorkerFormErrorCode)
      : null
    if (code && !out[path]) out[path] = { code }
  }
  return out
}

/** Which PII parts are on file, without their values (spec/04 §6). */
export interface WorkerPiiState {
  hasSsnLast4: boolean
  hasDateOfBirth: boolean
  /** City, state and ZIP are stored unencrypted for exactly this (spec/04 worker_pii). */
  place: { city: string; state: string; postalCode: string } | null
}

/** A PII part as pii.ts hands it out after Show, and logs. */
export type PiiPart = 'ssnLast4' | 'dateOfBirth' | 'address'
export type PiiValue =
  | { part: 'ssnLast4'; value: string }
  | { part: 'dateOfBirth'; value: string }
  | { part: 'address'; value: AddressInput }

/** What /workers/new and /workers/[id] open with. */
export interface WorkerFormDTO {
  /** Null on /workers/new. */
  workerId: string | null
  displayName: string
  /** Everything but the PII, which is undefined here and read only on Show. */
  values: WorkerInput
  pii: WorkerPiiState
  classifications: { id: string; name: string }[]
  fringe: {
    planId: string
    planName: string
    creditPerHour: string | null
    from: string
    to: string | null
  }[]
  history: { weekEnding: string; projectId: string; projectName: string; hours: string }[]
}
