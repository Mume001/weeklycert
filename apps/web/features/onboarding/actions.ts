'use server'

// Server actions of the onboarding wizard (spec/03 §4.3). Each starts with the
// one guard (CLAUDE.md). A step is saved the moment it is done; the counter in
// tenants.onboarding_step only moves forward, and a skipped step is kept as a
// gap for the dashboard.
import {
  CompanyInputSchema,
  type CompanySaveResult,
  companyFormErrors,
  getRepositories,
  SETUP_TIERS,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PROJECT_WRITERS, requireTenant } from '@/lib/session'
import { canManageBilling } from '@/lib/subscription'
import { stepAllowed, stepHref } from './steps'

/** Step 1 is the company profile: the owner and the administrator (spec/02 §3 and §5). */
const COMPANY_WRITERS = ['owner', 'admin'] as const

export async function saveCompanyAction(slug: string, raw: unknown): Promise<CompanySaveResult> {
  const shell = await requireTenant(slug, COMPANY_WRITERS)
  const parsed = CompanyInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: companyFormErrors(parsed.error) }
  const repos = getRepositories()
  const result = await repos.tenants.updateCompany(shell.tenant.id, parsed.data)
  if (result.ok) {
    await repos.tenants.completeOnboardingStep(shell.tenant.id, 1, false)
    revalidatePath('/app/[t]', 'layout')
  }
  return result
}

const Step = z.number().int().min(1).max(7)

/**
 * Continue or Skip for now. Skip exists only on steps 4, 5 and 7, and on 7 only
 * while the trial runs (03 §4.3); the server checks it again, not only the button.
 */
export async function completeStepAction(
  slug: string,
  rawStep: number,
  skipped: boolean,
  projectId: string | null,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const step = Step.parse(rawStep)
  const repos = getRepositories()
  const progress = await repos.tenants.onboarding(shell.tenant.id)
  if (skipped && !stepAllowed(step, 'skip', progress.inTrial)) throw new Error('No skip here')
  await repos.tenants.completeOnboardingStep(shell.tenant.id, step, skipped)
  revalidatePath('/app/[t]', 'layout')
  redirect(stepHref(slug, step + 1, projectId))
}

/** Step 6: the week is opened (its period made if it has none), then the grid. */
export async function openFirstWeekAction(
  slug: string,
  projectId: string,
  form: FormData,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const weekEnding = z.iso.date().parse(form.get('weekEnding'))
  const repos = getRepositories()
  await repos.weeks.open(shell.tenant.id, projectId, weekEnding)
  await repos.tenants.completeOnboardingStep(shell.tenant.id, 6, false)
  revalidatePath('/app/[t]', 'layout')
  redirect(`/app/${slug}/projects/${projectId}/weeks/${weekEnding}`)
}

/**
 * Step 7 in the mock phase: the tier is saved and the wizard ends. There is no
 * Stripe until step 7 of the plan (spec/20 H, spec/08 §2.1). Owner only.
 */
export async function chooseSetupTierAction(slug: string, form: FormData): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  if (!canManageBilling(shell.role)) throw new Error('Owner only')
  const tier = z.enum(SETUP_TIERS).parse(form.get('tier'))
  const repos = getRepositories()
  await repos.tenants.chooseSetupTier(shell.tenant.id, tier)
  await repos.tenants.completeOnboardingStep(shell.tenant.id, 7, false)
  revalidatePath('/app/[t]', 'layout')
  redirect(stepHref(slug, 8, null))
}
