'use server'

// Server actions of the worker screens (spec/03 §4.6). Each starts with the one
// guard (CLAUDE.md), validates with the same zod schema the form used, and only
// then writes. The company comes from the session, never from the worker id.
import {
  AllocationInputSchema,
  type AllocationSaveResult,
  allocationErrors,
  getRepositories,
  type PiiPart,
  type PiiValue,
  WorkerInputSchema,
  type WorkerSaveResult,
  workerFormErrors,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  FRINGE_ALLOCATION_WRITERS,
  PII_READERS,
  PROJECT_WRITERS,
  requireTenant,
} from '@/lib/session'

export async function createWorkerAction(slug: string, raw: unknown): Promise<WorkerSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = WorkerInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: workerFormErrors(parsed.error) }
  const result = await getRepositories().workers.create(shell.tenant.id, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

export async function updateWorkerAction(
  slug: string,
  workerId: string,
  raw: unknown,
): Promise<WorkerSaveResult> {
  const shell = await requireTenant(slug, PROJECT_WRITERS)
  const parsed = WorkerInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: workerFormErrors(parsed.error) }
  const result = await getRepositories().workers.update(shell.tenant.id, workerId, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

const Part = z.enum(['ssnLast4', 'dateOfBirth', 'address'])

/**
 * Show: one PII part, for the roles that may read it (spec/02 §3). The read is
 * logged in pii_access_log by packages/data/src/pii.ts (spec/04 §6). A worker
 * of another company gives null, the same as a part that is not on file.
 */
export async function readPiiAction(
  slug: string,
  workerId: string,
  part: PiiPart,
): Promise<PiiValue | null> {
  const shell = await requireTenant(slug, PII_READERS, 'read')
  return getRepositories().workers.readPii(
    shell.tenant.id,
    workerId,
    shell.user.id,
    Part.parse(part),
  )
}

/**
 * Adds a fringe plan to a worker, or changes or ends one when `allocationId` is
 * given. The engine in the grid credits the same rows (spec/03 §4.6).
 */
export async function saveAllocationAction(
  slug: string,
  workerId: string,
  allocationId: string | null,
  raw: unknown,
): Promise<AllocationSaveResult> {
  const shell = await requireTenant(slug, FRINGE_ALLOCATION_WRITERS)
  const parsed = AllocationInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: allocationErrors(parsed.error) }
  const repos = getRepositories()
  const result =
    allocationId === null
      ? await repos.workers.addAllocation(shell.tenant.id, workerId, parsed.data)
      : await repos.workers.updateAllocation(shell.tenant.id, workerId, allocationId, parsed.data)
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}
