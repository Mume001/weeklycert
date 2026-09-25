// The company profile (onboarding step 1, spec/03 §4.3; later /settings/company)
// and the onboarding progress. One zod schema for the browser and the server
// (spec/09 §4); messages are codes, the words are in packages/copy (15 §3
// Onboarding).
import { z } from 'zod'
import { type Dow, DowSchema, ProjectRoleSchema } from './common.ts'

export const COMPANY_FORM_ERRORS = [
  'legalNameRequired',
  'addressRequired',
  'zipFormat',
  'feinFormat',
  'weekEndLocked',
] as const
export type CompanyFormErrorCode = (typeof COMPANY_FORM_ERRORS)[number]

const ISO = /^\d{4}-\d{2}-\d{2}$/

export const CompanyInputSchema = z
  .object({
    legalName: z.string().trim().min(1, 'legalNameRequired'),
    addressLine1: z.string().trim(),
    addressLine2: z.string().trim(),
    city: z.string().trim(),
    zip: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{5}$/.test(v), 'zipFormat'),
    /** Nine digits, with or without the dash. Empty keeps the one on file. */
    fein: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{2}-?\d{7}$/.test(v), 'feinFormat'),
    nysRegistrationNumber: z.string().trim(),
    nysRegistrationExpiresOn: z.string().refine((v) => v === '' || ISO.test(v)),
    defaultOurRole: ProjectRoleSchema,
    weekEndsOn: z.coerce.number().pipe(DowSchema),
  })
  .superRefine((c, ctx) => {
    if (!c.addressLine1 || !c.city || !c.zip) {
      ctx.addIssue({ code: 'custom', message: 'addressRequired', path: ['addressLine1'] })
    }
  })
export type CompanyInput = z.infer<typeof CompanyInputSchema>

export type CompanyFormErrors = Record<string, CompanyFormErrorCode>
export type CompanySaveResult = { ok: true } | { ok: false; errors: CompanyFormErrors }

export function companyFormErrors(error: z.ZodError): CompanyFormErrors {
  const out: CompanyFormErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if ((COMPANY_FORM_ERRORS as readonly string[]).includes(issue.message) && !out[path]) {
      out[path] = issue.message as CompanyFormErrorCode
    }
  }
  return out
}

export interface CompanyFormDTO {
  /** The FEIN itself is never sent back; only its last four for "On file, ending in". */
  values: Omit<CompanyInput, 'fein'> & { fein: '' }
  feinLast4: string | null
  /** A project has a period already, so the week end cannot change (15 §3). */
  weekEndLocked: boolean
  weekEndsOn: Dow
}

export const SETUP_TIERS = ['basic', 'standard', 'full', 'waived'] as const
export type SetupTier = (typeof SETUP_TIERS)[number]

export const ONBOARDING_STEPS = 7

/** Where the wizard stands (spec/03 §4.3): each step is saved as it is done. */
export interface OnboardingDTO {
  /** The highest step done or skipped, 0 when none. */
  step: number
  skipped: number[]
  /** Step 7 can be skipped only while the trial runs (03 §4.3). */
  inTrial: boolean
  setupTier: SetupTier | null
  /** What step 1 still lacks, as field names of CompanyInput, for "Still missing" (02 §5). */
  companyMissing: (keyof CompanyInput)[]
}
