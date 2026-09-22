'use server'

// Server actions of the review, signature and filing screens (spec/03 §2).
// Each starts with the one guard (CLAUDE.md, spec/11 §4). Signing has its own
// guard, because payroll may prepare everything and still not sign (spec/02 §2).
import {
  getRepositories,
  PayrollInputSchema,
  type SignErrorCode,
  type SignErrors,
  SignInputSchema,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PROJECT_WRITERS, requireTenant, SIGNING_ROLES } from '@/lib/session'

const refresh = () => revalidatePath('/app/[t]', 'layout')

/** Every worker in one call, so the screen re-renders once and not per row. */
export async function savePayrollAction(
  slug: string,
  periodId: string,
  raw: unknown,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const rows = z.array(PayrollInputSchema).parse(raw)
  const repos = getRepositories()
  for (const row of rows) {
    await repos.weeks.savePayroll(shell.tenant.id, periodId, row)
  }
  refresh()
}

export type GenerateResult = { ok: true; reportId: string; version: number } | { ok: false }

/** Queues the draft. It refuses while a blocking finding is open (spec/07 §1). */
export async function generateAction(slug: string, periodId: string): Promise<GenerateResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  try {
    const result = await getRepositories().reports.generate(shell.tenant.id, periodId)
    // No revalidate: it would re-render this page under the screen that is
    // still waiting for the job, and take the line that says it is ready with
    // it. The new state is there on the next navigation.
    return { ok: true, ...result }
  } catch {
    return { ok: false }
  }
}

export type SignResult = { ok: true; payrollNumber: number } | { ok: false; errors: SignErrors }

export async function signAction(
  slug: string,
  periodId: string,
  raw: unknown,
): Promise<SignResult> {
  const shell = await requireTenant(slug, SIGNING_ROLES)
  if (!shell.canSign) return { ok: false, errors: {} }
  const parsed = SignInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: SignErrors = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) errors[path] = issue.message as SignErrorCode
    }
    return { ok: false, errors }
  }
  const signed = await getRepositories().reports.sign(
    shell.tenant.id,
    periodId,
    shell.user.id,
    parsed.data,
  )
  refresh()
  return { ok: true, ...signed }
}

const Filing = z.object({ confirmationRef: z.string().trim() })

export async function recordSubmissionAction(
  slug: string,
  periodId: string,
  raw: unknown,
): Promise<{ ok: boolean }> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = Filing.safeParse(raw)
  if (!parsed.success || parsed.data.confirmationRef === '') return { ok: false }
  await getRepositories().reports.recordSubmission(shell.tenant.id, periodId, {
    channel: 'ny_portal_manual',
    confirmationRef: parsed.data.confirmationRef,
  })
  refresh()
  return { ok: true }
}

/** The mock records it; sending the package by email is step 5 (spec/19 §11). */
export async function recordSentToPrimeAction(
  slug: string,
  periodId: string,
  email: string,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  await getRepositories().reports.recordSubmission(shell.tenant.id, periodId, {
    channel: 'email_to_prime',
    confirmationRef: '',
    recipient: z.string().trim().parse(email),
  })
  refresh()
}

export async function recordOutcomeAction(
  slug: string,
  submissionId: string,
  outcome: 'accepted' | 'rejected',
  reason: string,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  await getRepositories().reports.recordOutcome(shell.tenant.id, submissionId, outcome, reason)
  refresh()
}

export type CorrectionResult = { ok: true; periodId: string } | { ok: false }

/** A correction is a new version of the week; the note says what is corrected (spec/03 §4.5). */
export async function createCorrectionAction(
  slug: string,
  periodId: string,
  note: string,
): Promise<CorrectionResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const text = z.string().trim().parse(note)
  if (text === '') return { ok: false }
  const created = await getRepositories().reports.createCorrection(shell.tenant.id, periodId, text)
  refresh()
  return { ok: true, ...created }
}
