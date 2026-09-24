// PATCH /api/v1/periods/[id]/entries: what the grid autosaves (spec/19 §6).
//
// Every route handler starts with one guard (spec/11 §4). In the mock phase the
// guard is the fake session plus the role check from spec/02 §3; step 4 replaces
// it with the real requireTenant(), which also opens the transaction and sets
// the tenant. The company is in the query because a period id alone says
// nothing about who may write it, and it is part of every lookup below: another
// company's period answers 404, the same as one that does not exist.
import { getRepositories } from '@wc/data'
import { z } from 'zod'
import { GuardError, PROJECT_WRITERS, requireTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

const Body = z.union([
  z.object({
    cells: z.array(
      z.object({
        rowId: z.string().min(1),
        day: z.number().int().min(0).max(6),
        raw: z.string(),
      }),
    ),
  }),
  z.object({ action: z.enum(['copyPreviousWeek', 'markNoWork']) }),
])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const slug = new URL(request.url).searchParams.get('t') ?? ''
  let tenantId: string
  try {
    tenantId = (await requireTenant(slug, PROJECT_WRITERS)).tenant.id
  } catch (error) {
    const status = error instanceof GuardError ? error.status : 400
    return Response.json({ error: 'refused' }, { status })
  }

  const { id } = await context.params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const repos = getRepositories()
  try {
    if ('action' in parsed.data) {
      if (parsed.data.action === 'copyPreviousWeek')
        await repos.weeks.copyPreviousWeek(tenantId, id)
      else await repos.weeks.markNoWork(tenantId, id)
    } else {
      for (const cell of parsed.data.cells) {
        await repos.weeks.patchCell(tenantId, id, cell.rowId, cell.day, cell.raw)
      }
    }
  } catch {
    // An unknown period, another company's period, or a row that is not in this week.
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  return Response.json(
    { savedAt: repos.now(), findings: await repos.weeks.findings(tenantId, id) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
