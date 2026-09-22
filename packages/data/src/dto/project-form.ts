// The project form: /projects/new and /projects/[id]/settings (spec/03 §4.4),
// the same form as onboarding step 2. One zod schema for the browser and for
// the server (spec/09 §4). Its messages are codes, never English: the words
// are in packages/copy (spec/15 §3 Projekti), keyed by these codes.
import { z } from 'zod'
import { type Dow, ProjectRoleSchema, ProjectStatusSchema } from './common.ts'

export const PROJECT_FORM_ERRORS = [
  'nameRequired',
  'prcRequired',
  'prcTaken',
  'startRequired',
  'wdRequired',
  'modFormat',
  'endBeforeStart',
  'pauseOrder',
  'retentionMin',
] as const
export type ProjectFormErrorCode = (typeof PROJECT_FORM_ERRORS)[number]

/** NY keeps records at least six years from the project's close (spec/01 §2.7). */
export const MIN_RETENTION_YEARS = 6

const ISO = /^\d{4}-\d{2}-\d{2}$/
const optionalDate = z.string().refine((v) => v === '' || ISO.test(v))

/**
 * NEPROVJERENO (spec/13 A6): the exact PRC format is confirmed only in the
 * live portal. Every PRC we have seen has ten digits, so a number that does
 * not is worth a warning, but it must never be refused: a customer with a
 * real PRC in another shape has to be able to save the project (13 A6, 15 §3).
 */
export const PRC_FORMAT = /^\d{10}$/

/** True when the PRC deserves the warning of 15 §3. Empty is a missing PRC, not a shape. */
export function prcLooksUnusual(prcNumber: string): boolean {
  return prcNumber !== '' && !PRC_FORMAT.test(prcNumber)
}

export const WorkPauseInputSchema = z
  .object({ from: z.string().regex(ISO), to: z.string().regex(ISO), reason: z.string().trim() })
  .refine((p) => p.to >= p.from, { message: 'pauseOrder', path: ['to'] })

/**
 * A pause row left blank is dropped; a row with one date is a one-day pause.
 * Neither is a mistake worth a message.
 */
function tidyPauses(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value
    .filter((p) => p && typeof p === 'object' && (p.from || p.to))
    .map((p) => ({ ...p, from: p.from || p.to, to: p.to || p.from, reason: p.reason ?? '' }))
}

/** Every value as the form holds it: strings, a boolean, a list of pauses. */
export const ProjectInputSchema = z
  .object({
    name: z.string().trim().min(1, 'nameRequired'),
    prcNumber: z.string().trim().min(1, 'prcRequired'),
    awardingBody: z.string().trim(),
    ourRole: ProjectRoleSchema,
    generalContractor: z.string().trim(),
    projectNumber: z.string().trim(),
    county: z.string().trim(),
    startDate: z.string().regex(ISO, 'startRequired'),
    federallyFunded: z.boolean(),
    federalWdNumber: z.string().trim(),
    federalWdMod: z.string().trim().regex(/^\d*$/, 'modFormat'),
    expectedEndDate: optionalDate,
    siteAddress: z.string().trim(),
    workPauses: z.preprocess(tidyPauses, z.array(WorkPauseInputSchema)),
    retentionYears: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= MIN_RETENTION_YEARS, 'retentionMin'),
    status: ProjectStatusSchema,
  })
  .superRefine((p, ctx) => {
    if (p.federallyFunded && p.federalWdNumber === '') {
      ctx.addIssue({ code: 'custom', message: 'wdRequired', path: ['federalWdNumber'] })
    }
    if (p.expectedEndDate !== '' && p.expectedEndDate < p.startDate) {
      ctx.addIssue({ code: 'custom', message: 'endBeforeStart', path: ['expectedEndDate'] })
    }
  })
export type ProjectInput = z.infer<typeof ProjectInputSchema>

/** A field error: the code, plus the values its sentence needs ({Project}). */
export interface ProjectFormError {
  code: ProjectFormErrorCode
  values?: Record<string, string>
}

/** Keyed by field path: "name", "prcNumber", "workPauses.0.to"... */
export type ProjectFormErrors = Record<string, ProjectFormError>

export type ProjectSaveResult = { ok: true; id: string } | { ok: false; errors: ProjectFormErrors }

/** Turns zod issues into field errors. Shared by the form and the server. */
export function projectFormErrors(error: z.ZodError): ProjectFormErrors {
  const out: ProjectFormErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    const code = (PROJECT_FORM_ERRORS as readonly string[]).includes(issue.message)
      ? (issue.message as ProjectFormErrorCode)
      : null
    // An issue without one of our codes can only come from a malformed request
    // (the form cannot produce it), so there is no sentence for it.
    if (code && !out[path]) out[path] = { code }
  }
  return out
}

/** What the form opens with. */
export interface ProjectFormDTO {
  /** Null on /projects/new. */
  projectId: string | null
  values: ProjectInput
  /** The company's week end (tenant_settings.week_ending_dow), shown read only. */
  weekEndsOn: Dow
  /** Names already used, offered as suggestions. */
  awardingBodies: string[]
  generalContractors: string[]
}
