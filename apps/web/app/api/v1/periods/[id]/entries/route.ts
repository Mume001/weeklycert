// PATCH /api/v1/periods/[id]/entries: what the grid autosaves (spec/19 §6).
//
// Every route handler starts with one guard (spec/11 §4). In the mock phase the
// guard is the fake session plus the role check from spec/02 §3; step 4 replaces
// it with requireTenant(), which also opens the transaction and sets the tenant.
import { getRepositories } from '@wc/data'
import { z } from 'zod'
import { mockRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

const MAY_EDIT = ['owner', 'admin', 'payroll', 'signer', 'bookkeeper']

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
  // TODO(step 4): const ctx = await requireTenant('payroll')
  const role = await mockRole()
  if (!MAY_EDIT.includes(role)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const repos = getRepositories()
  try {
    if ('action' in parsed.data) {
      if (parsed.data.action === 'copyPreviousWeek') await repos.weeks.copyPreviousWeek(id)
      else await repos.weeks.markNoWork(id)
    } else {
      for (const cell of parsed.data.cells) {
        await repos.weeks.patchCell(id, cell.rowId, cell.day, cell.raw)
      }
    }
  } catch {
    // An unknown period, or a row that is not in this week.
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  return Response.json(
    { savedAt: repos.now(), findings: await repos.weeks.findings(id) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
