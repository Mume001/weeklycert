// /api/health is public by design: it is on the closed list in spec/11 §4, so it
// has no guard. Three conditions apply, all mandatory:
//   1. the body is only {"ok":true} with 200, or {"ok":false} with 503. Never a
//      version, database name, queue length or tenant count;
//   2. it runs one cheap SELECT 1 with a short timeout, so "ok" means something;
//   3. it is rate limited like every public route.
export const dynamic = 'force-dynamic'

export function GET(): Response {
  // TODO(step 4): run SELECT 1 with a short timeout; answer {"ok":false} with 503 on failure.
  // The mock phase has no database, so there is nothing to ask yet.
  // TODO(step 8): rate limit as for every public route (spec/11 §4 condition 3, §6).
  return Response.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
