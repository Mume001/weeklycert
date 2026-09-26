import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { FileUp } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { ImportsTable } from './ImportsTable'

/** /app/[t]/imports: the import history (spec/03 §4.7). The viewer has no import (02 §5). */
export async function ImportsScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const locked = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const importer = PROJECT_WRITERS.includes(shell.role)
  const start = importer && !locked && (
    <Button asChild>
      <Link href={`/app/${slug}/imports/new`}>{copy.emptyStates.importsAction}</Link>
    </Button>
  )

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={copy.nav.import}
        breadcrumb={[{ label: shell.tenant.legalName }]}
        actions={start || undefined}
      />
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">{body}</div>
    </>
  )

  if (forced === 'forbidden' || !importer) {
    return frame(
      <ForbiddenState
        role={forced === 'forbidden' ? 'viewer' : shell.role}
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingTable columns={7} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const rows = forced === 'empty' ? [] : await getRepositories().imports.list(shell.tenant.id)
  return frame(
    <>
      {locked && <Notice tone="info" title={copy.billing.paused} />}
      <ImportsTable
        slug={slug}
        rows={rows}
        empty={
          <EmptyState
            icon={FileUp}
            title={copy.nav.import}
            body={copy.emptyStates.imports}
            action={start}
          />
        }
      />
    </>,
  )
}
