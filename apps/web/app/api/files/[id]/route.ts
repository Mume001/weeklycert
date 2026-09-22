// GET /api/files/[id]: the authorised way to a file (spec/03 §2). In step 5 it
// signs an S3 URL; in this phase the only thing behind it is the example of
// what a filing will hold (spec/19 §11), and its name says so.
import { getRepositories } from '@wc/data'
import { GuardError, PROJECT_WRITERS, requireTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const slug = new URL(request.url).searchParams.get('t') ?? ''
  try {
    await requireTenant(slug, PROJECT_WRITERS)
    const { id } = await context.params
    const file = await getRepositories().reports.file(decodeURIComponent(id))
    if (!file) return Response.json({ error: 'not_found' }, { status: 404 })
    return new Response(file.body, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.name}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const status = error instanceof GuardError ? error.status : 400
    return Response.json({ error: 'refused' }, { status })
  }
}
