import { copy, count, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { DateText } from '@/components/patterns/DateText'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { UndoImport } from './UndoImport'

const t = copy.imports

/** /app/[t]/imports/[id]: one import, and its undo (spec/03 §4.7). */
export async function ImportScreen({
  slug,
  batchId,
  search,
}: {
  slug: string
  batchId: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const importer = PROJECT_WRITERS.includes(shell.role)
  const batch = importer ? await getRepositories().imports.get(shell.tenant.id, batchId) : null
  if (importer && !batch) notFound()

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={batch?.fileName ?? copy.nav.import}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.import, href: `/app/${slug}/imports` },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">{body}</div>
    </>
  )

  if (forced === 'forbidden' || !importer || !batch) {
    return frame(
      <ForbiddenState
        role={forced === 'forbidden' ? 'viewer' : shell.role}
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingTable columns={2} rows={6} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const skipped = batch.status === 'applied' ? batch.rowsTotal - batch.rowsApplied : 0
  const facts: [string, ReactNode][] = [
    [t.history.columns.when, <DateText key="when" value={batch.createdAt.slice(0, 10)} />],
    [t.history.columns.what, `${t.kinds[batch.kind].label} · ${t.sources[batch.source]}`],
    [
      t.history.columns.weekEnding,
      batch.weekEnding ? (
        <span key="week">
          <DateText value={batch.weekEnding} /> · {batch.project?.name}
        </span>
      ) : (
        t.history.noWeek
      ),
    ],
    [
      t.history.columns.rows,
      forced === 'empty' ? count(t, 'rowsInFile', 0) : count(t, 'rowsInFile', batch.rowsTotal),
    ],
    [t.history.columns.status, t.status[batch.status]],
  ]

  return frame(
    <>
      {paused && <Notice tone="info" title={copy.billing.paused} />}
      <section className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold text-n-800">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-text-secondary">
          {fill(t.history.by, { Name: batch.createdBy })}
        </p>
        {batch.status === 'applied' && (
          <ul className="grid gap-0.5 text-sm">
            <li>{count(t, 'rowsImported', batch.rowsApplied)}</li>
            <li>{count(t, 'rowsSkipped', skipped)}</li>
          </ul>
        )}
        {batch.status === 'undone' && <p className="text-sm font-semibold">{t.detail.undone}</p>}
        {batch.status === 'applied' &&
          !paused &&
          (batch.canUndo ? (
            <UndoImport slug={slug} batchId={batch.id} />
          ) : (
            batch.undoRefusal && <Notice tone="info" title={t.detail[batch.undoRefusal]} />
          ))}
        {batch.status !== 'applied' && batch.status !== 'undone' && (
          <div>
            <Button asChild>
              <Link href={`/app/${slug}/imports/new?batch=${batch.id}`}>{t.history.open}</Link>
            </Button>
          </div>
        )}
      </section>
    </>,
  )
}
