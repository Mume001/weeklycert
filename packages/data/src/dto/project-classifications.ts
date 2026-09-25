// /app/[t]/projects/[id]/classifications (spec/03 §4.4): which classifications
// work on the project and at which rate. A rate is never overwritten: a new
// rate is a new row from a date, so the weeks before it stay exactly as they
// were computed and signed.
import { isKnownOtCode } from '@wc/core'
import { z } from 'zod'
import {
  IsoDateSchema,
  MoneySchema,
  ProjectStatusSchema,
  RateSourceSchema,
  UuidSchema,
} from './common.ts'

export const ClassificationRateRowSchema = z.object({
  /** project_classifications.id: one version of one classification's rate. */
  id: UuidSchema,
  classificationId: UuidSchema,
  officialLabel: z.string(),
  displayLabel: z.string(),
  baseRate: MoneySchema,
  supplement: MoneySchema,
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable(),
  otCodes: z.array(z.string()),
  source: RateSourceSchema,
  apprenticeRatio: z.string().nullable(),
  /** A signed or submitted week falls inside this version: its rate may not change. */
  usedBySignedWeek: z.boolean(),
  /** The newest version of this classification: the one a new version follows. */
  isLatest: z.boolean(),
})
export type ClassificationRateRow = z.infer<typeof ClassificationRateRowSchema>

export const ProjectClassificationsDTOSchema = z.object({
  project: z.object({ id: UuidSchema, name: z.string(), status: ProjectStatusSchema }),
  /** The newest week on the timeline; null before the first week has ended. */
  currentWeekEnding: IsoDateSchema.nullable(),
  /** Newest version first within a classification, classifications by name. */
  rows: z.array(ClassificationRateRowSchema),
  /** Classifications on the project with no rate for the current week (spec/03 §4.4). */
  missingForCurrentWeek: z.array(
    z.object({ classificationId: UuidSchema, officialLabel: z.string() }),
  ),
  /** The official NY list (spec/04 classification_catalog), for the add form. */
  catalog: z.array(z.object({ id: UuidSchema, trade: z.string(), officialLabel: z.string() })),
})
export type ProjectClassificationsDTO = z.infer<typeof ProjectClassificationsDTOSchema>

export const CLASSIFICATION_FORM_ERRORS = [
  'classificationRequired',
  'alreadyOnProject',
  'rateFormat',
  'otCodesRequired',
  'otCodeUnknown',
  'effectiveFromRequired',
  'versionAfter',
  'rateLocked',
] as const
export type ClassificationFormErrorCode = (typeof CLASSIFICATION_FORM_ERRORS)[number]

export interface ClassificationFormError {
  code: ClassificationFormErrorCode
  values?: Record<string, string>
}
export type ClassificationFormErrors = Record<string, ClassificationFormError>
export type ClassificationSaveResult =
  | { ok: true }
  | { ok: false; errors: ClassificationFormErrors }

/** Dollars and cents, as the user types them. */
const rate = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, 'rateFormat')

/** "A, W, R" or "A W R" into ["A","W","R"]. */
export function parseOtCodes(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
}

/** Codes from the OVERTIME PAGE; every one must be in the legend (spec/01 §2.1). */
const otCodes = z.string().superRefine((raw, ctx) => {
  const codes = parseOtCodes(raw)
  if (codes.length === 0) ctx.addIssue({ code: 'custom', message: 'otCodesRequired' })
  const unknown = codes.find((c) => !isKnownOtCode(c))
  if (unknown) ctx.addIssue({ code: 'custom', message: `otCodeUnknown:${unknown}` })
})

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFromRequired')

export const ClassificationInputSchema = z.object({
  classificationId: z.string().min(1, 'classificationRequired'),
  displayLabel: z.string().trim(),
  baseRate: rate,
  supplement: rate,
  otCodes,
  effectiveFrom: date,
  apprenticeRatio: z.string().trim(),
  /** 'pasted' when the row came from "Paste a table from the wage schedule" (04 rate_source). */
  rateSource: z.enum(['manual', 'pasted']).optional(),
})
export type ClassificationInput = z.infer<typeof ClassificationInputSchema>

export const RateVersionInputSchema = z.object({
  /** The version the new one follows. */
  rowId: z.string().min(1),
  baseRate: rate,
  supplement: rate,
  otCodes,
  effectiveFrom: date,
})
export type RateVersionInput = z.infer<typeof RateVersionInputSchema>

export const ClassificationEditInputSchema = z.object({
  rowId: z.string().min(1),
  displayLabel: z.string().trim(),
  apprenticeRatio: z.string().trim(),
  baseRate: rate,
  supplement: rate,
  otCodes,
})
export type ClassificationEditInput = z.infer<typeof ClassificationEditInputSchema>

/** zod issues into field errors. "otCodeUnknown:X" carries the code for its sentence. */
export function classificationFormErrors(error: z.ZodError): ClassificationFormErrors {
  const out: ClassificationFormErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    const [name = '', value] = issue.message.split(':')
    if (!(CLASSIFICATION_FORM_ERRORS as readonly string[]).includes(name) || out[path]) continue
    out[path] = {
      code: name as ClassificationFormErrorCode,
      ...(value ? { values: { code: value } } : {}),
    }
  }
  return out
}
