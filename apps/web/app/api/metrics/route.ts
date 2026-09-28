// GET /api/metrics: Prometheus, the internal network only (spec/03 §2, 10 §5).
// Guard: internalOnly (spec/11 §4). 404 in the mock phase (spec/19 §2).
// TODO(step 8): the metrics themselves, once there is a worker and a database.
import { internalOnly } from '@/lib/guards'
import { GuardError } from '@/lib/session'

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  try {
    internalOnly(request)
    return new Response(null, { status: 204 })
  } catch (error) {
    const status = error instanceof GuardError ? error.status : 400
    return Response.json({ error: 'not_found' }, { status })
  }
}
