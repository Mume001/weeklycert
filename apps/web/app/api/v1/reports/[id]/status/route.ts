// GET /api/v1/reports/[id]/status: how far the generate job has got (spec/19 §2).
// In step 5 a pg-boss worker writes this; here the mock plays it out over the
// polls the review screen makes, so the screen is built against a real wait.
//
// Every route handler starts with one guard (spec/11 §4). The company is in the
// query because a report id alone says nothing about who may read it.
import { getRepositories } from '@wc/data'
import { z } from 'zod'
import { GuardError, PROJECT_WRITERS, requireTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const slug = new URL(request.url).searchParams.get('t') ?? ''
  try {
    const shell = await requireTenant(slug, PROJECT_WRITERS)
    const { id } = await context.params
    const status = await getRepositories().reports.status(shell.tenant.id, z.uuid().parse(id))
    if (!status) return Response.json({ error: 'not_found' }, { status: 404 })
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof GuardError ? error.status : 400
    return Response.json({ error: 'refused' }, { status })
  }
}
