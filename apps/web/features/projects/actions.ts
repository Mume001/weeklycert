'use server'

// Server actions of the project screens (spec/03 §2: they live in
// features/<domain>/actions.ts). Each starts with the one guard (CLAUDE.md),
// validates with the same zod schema the form used, and only then writes.
import {
  ClassificationEditInputSchema,
  ClassificationInputSchema,
  type ClassificationSaveResult,
  classificationFormErrors,
  getRepositories,
  ProjectInputSchema,
  type ProjectSaveResult,
  projectFormErrors,
  RateVersionInputSchema,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PROJECT_WRITERS, requireTenant } from '@/lib/session'

export async function createProjectAction(slug: string, raw: unknown): Promise<ProjectSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = ProjectInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: projectFormErrors(parsed.error) }
  const result = await getRepositories().projects.create(shell.tenant.id, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

export async function updateProjectAction(
  slug: string,
  projectId: string,
  raw: unknown,
): Promise<ProjectSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = ProjectInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: projectFormErrors(parsed.error) }
  const result = await getRepositories().projects.update(shell.tenant.id, projectId, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

const WeekEnding = z.iso.date()

/** "Mark no-work week" on the timeline: the week gets its period if it has none, then the mark. */
export async function markNoWorkAction(
  slug: string,
  projectId: string,
  weekEnding: string,
): Promise<void> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const repos = getRepositories()
  const periodId = await repos.weeks.open(shell.tenant.id, projectId, WeekEnding.parse(weekEnding))
  await repos.weeks.markNoWork(shell.tenant.id, periodId)
  revalidatePath('/app/[t]', 'layout')
}

export async function addClassificationAction(
  slug: string,
  projectId: string,
  raw: unknown,
): Promise<ClassificationSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = ClassificationInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: classificationFormErrors(parsed.error) }
  const result = await getRepositories().projects.addClassification(
    shell.tenant.id,
    projectId,
    parsed.data,
  )
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

export async function addRateVersionAction(
  slug: string,
  projectId: string,
  raw: unknown,
): Promise<ClassificationSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = RateVersionInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: classificationFormErrors(parsed.error) }
  const result = await getRepositories().projects.addRateVersion(
    shell.tenant.id,
    projectId,
    parsed.data,
  )
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

export async function editClassificationAction(
  slug: string,
  projectId: string,
  raw: unknown,
): Promise<ClassificationSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = ClassificationEditInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: classificationFormErrors(parsed.error) }
  const result = await getRepositories().projects.editClassification(
    shell.tenant.id,
    projectId,
    parsed.data,
  )
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}
