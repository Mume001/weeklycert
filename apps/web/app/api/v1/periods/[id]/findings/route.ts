// GET /api/v1/periods/[id]/findings: the findings the server computed.
//
// The browser runs the same engine while the user types (spec/19 §6), but the
// server's result is the one that counts (spec/03 §4.5). Guarded like every
// route handler (spec/11 §4). The company is in the query and in the lookup:
// another company's period answers 404, the same as one that does not exist.
import { getRepositories } from '@wc/data'
import { GuardError, loadShell } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const slug = new URL(request.url).searchParams.get('t') ?? ''
  try {
    // Every member reads findings, the viewer too (spec/02 §3).
    const shell = await loadShell(slug)
    if (!shell) throw new GuardError(404)
    const { id } = await context.params
    const findings = await getRepositories().weeks.findings(shell.tenant.id, id)
    if (!findings) return Response.json({ error: 'not_found' }, { status: 404 })
    return Response.json({ findings }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof GuardError ? error.status : 400
    return Response.json({ error: 'refused' }, { status })
  }
}
