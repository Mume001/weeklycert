'use server'

// Server actions of the import screens (spec/03 §4.7, spec/06). Each starts
// with the one guard (CLAUDE.md). The upload is read here, on the server, by
// @wc/core/import: nothing in the file is run, an old .xls or a workbook with
// macros is refused, and a full SSN is cut to four digits before it is kept.
import { readUpload } from '@wc/core/import'
import {
  getRepositories,
  type ImportApplyResult,
  ImportMappingInputSchema,
  ImportResolveInputSchema,
  ImportStartSchema,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PROJECT_WRITERS, requireTenant } from '@/lib/session'

/** Every role but the viewer imports (spec/02 §3, "Uvoz CSV"). */
const IMPORTERS = PROJECT_WRITERS

export type UploadResult =
  | { ok: true; batchId: string }
  | {
      ok: false
      error:
        | 'projectRequired'
        | 'weekRequired'
        | 'fileRequired'
        | 'tooBig'
        | 'xls'
        | 'macros'
        | 'unzippedTooBig'
        | 'empty'
        | 'unreadable'
    }

export async function uploadAction(slug: string, form: FormData): Promise<UploadResult> {
  const shell = await requireTenant(slug, IMPORTERS)
  const start = ImportStartSchema.safeParse({
    kind: form.get('kind'),
    source: form.get('source'),
    projectId: form.get('projectId') ?? '',
    weekEnding: form.get('weekEnding') ?? '',
  })
  if (!start.success) {
    const code = start.error.issues[0]?.message
    return { ok: false, error: code === 'weekRequired' ? 'weekRequired' : 'projectRequired' }
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'fileRequired' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const read = await readUpload(bytes)
  if (!read.ok) return { ok: false, error: read.reason }
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = Buffer.from(digest).toString('hex')
  const batchId = await getRepositories().imports.start(
    shell.tenant.id,
    shell.user.id,
    start.data,
    {
      name: file.name,
      sha256,
      table: read.table,
    },
  )
  revalidatePath('/app/[t]', 'layout')
  return { ok: true, batchId }
}

const Id = z.uuid()

export async function mappingAction(
  slug: string,
  batchId: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  const shell = await requireTenant(slug, IMPORTERS)
  const input = ImportMappingInputSchema.parse(raw)
  return getRepositories().imports.setMapping(shell.tenant.id, Id.parse(batchId), input)
}

export async function resolveAction(slug: string, batchId: string, raw: unknown): Promise<void> {
  const shell = await requireTenant(slug, IMPORTERS)
  await getRepositories().imports.resolve(
    shell.tenant.id,
    Id.parse(batchId),
    ImportResolveInputSchema.parse(raw),
  )
  revalidatePath('/app/[t]', 'layout')
}

export async function confirmCheckAction(
  slug: string,
  batchId: string,
  skipErrors: boolean,
): Promise<{ ok: boolean }> {
  const shell = await requireTenant(slug, IMPORTERS)
  return getRepositories().imports.confirmCheck(shell.tenant.id, Id.parse(batchId), skipErrors)
}

export async function applyAction(slug: string, batchId: string): Promise<ImportApplyResult> {
  const shell = await requireTenant(slug, IMPORTERS)
  const result = await getRepositories().imports.apply(
    shell.tenant.id,
    Id.parse(batchId),
    shell.user.id,
  )
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}

export async function undoAction(
  slug: string,
  batchId: string,
): Promise<{ ok: true } | { ok: false; refused: 'locked' | 'expired' }> {
  const shell = await requireTenant(slug, IMPORTERS)
  const result = await getRepositories().imports.undo(shell.tenant.id, Id.parse(batchId))
  if (result.ok) revalidatePath('/app/[t]', 'layout')
  return result
}
