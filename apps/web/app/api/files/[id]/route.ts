// GET /api/files/[id]: the authorised way to a file (spec/03 §2). In step 5 it
// signs an S3 URL; in this phase behind it are the example of what a filing
// will hold (spec/19 §11), and our import template for one week (spec/06 §6),
// asked for as template:<kind>:<project>:<week ending>:<csv|xlsx>.
import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { z } from 'zod'
import { GuardError, PROJECT_WRITERS, requireTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const slug = new URL(request.url).searchParams.get('t') ?? ''
  try {
    const shell = await requireTenant(slug, PROJECT_WRITERS)
    const id = decodeURIComponent((await context.params).id)
    // The company comes from the session, never from the id in the URL: the
    // guard says who is asking, the lookup says what they may ask for.
    const file = id.startsWith('template:')
      ? await template(shell.tenant.id, id)
      : await getRepositories().reports.file(shell.tenant.id, id)
    if (!file) return Response.json({ error: 'not_found' }, { status: 404 })
    // A template is bytes; copied into a plain ArrayBuffer, as Response takes it.
    const body = typeof file.body === 'string' ? file.body : new Uint8Array(file.body)
    return new Response(body, {
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

const TemplateId = z.tuple([
  z.literal('template'),
  z.enum(['hours', 'payroll']),
  z.uuid(),
  z.iso.date(),
  z.enum(['csv', 'xlsx']),
])

/** Our template for one week; the column names are the ones the customer reads (spec/15). */
async function template(tenantId: string, id: string) {
  const [, kind, projectId, weekEnding, format] = TemplateId.parse(id.split(':'))
  return getRepositories().imports.template(tenantId, projectId, weekEnding, {
    kind,
    format,
    headers: copy.imports.mapping.targets,
  })
}
