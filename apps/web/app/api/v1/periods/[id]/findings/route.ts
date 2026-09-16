// GET /api/v1/periods/[id]/findings: the findings the server computed.
//
// The browser runs the same engine while the user types (spec/19 §6), but the
// server's result is the one that counts (spec/03 §4.5). Guarded like every
// route handler (spec/11 §4); step 4 swaps the mock session for requireTenant().
import { getRepositories } from '@wc/data'
import { mockRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  // TODO(step 4): const ctx = await requireTenant('viewer')
  const role = await mockRole()
  if (!role) return Response.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await context.params
  try {
    const findings = await getRepositories().weeks.findings(id)
    return Response.json({ findings }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }
}
