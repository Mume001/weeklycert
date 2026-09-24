'use server'

// Server actions of /fringe-plans (spec/03 §4.6). Each starts with the one
// guard (CLAUDE.md) and validates with the schema the form used.
import {
  FringePlanInputSchema,
  type FringeSaveResult,
  fringeFormErrors,
  getRepositories,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { PROJECT_WRITERS, requireTenant } from '@/lib/session'

export async function saveFringePlanAction(
  slug: string,
  planId: string | null,
  raw: unknown,
): Promise<FringeSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = FringePlanInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fringeFormErrors(parsed.error) }
  const repos = getRepositories()
  const result =
    planId === null
      ? await repos.fringe.create(shell.tenant.id, parsed.data)
      : await repos.fringe.update(shell.tenant.id, planId, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}
