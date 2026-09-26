import { copy, count } from '@wc/copy'
import { getRepositories, type WorkerListFilter } from '@wc/data'
import { cn } from 'cn'
import { UserPlus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PII_READERS, PROJECT_WRITERS } from '@/lib/session'
import { WorkerNamesTable, WorkersTable } from './WorkersTable'

const t = copy.workers.list
const STATUSES = ['active', 'inactive'] as const
type StatusFilter = (typeof STATUSES)[number]

/**
 * /app/[t]/workers (spec/03 §4.6). No address and no SSN in the list. The
 * viewer gets the name and the classification only, and the server never
 * loads more for them, so nothing else reaches the browser (spec/02 §3).
 */
export async function WorkersScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string; status?: string; q?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const forced = screenState(search.state)
  const status: StatusFilter = STATUSES.find((s) => s === search.status) ?? 'active'
  const query = (search.q ?? '').trim()
  const base = `/app/${slug}/workers`
  const locked = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const canWrite = PROJECT_WRITERS.includes(shell.role) && !locked
  const namesOnly = !PII_READERS.includes(shell.role)

  const repos = getRepositories()
  const activeCount =
    forced === 'empty'
      ? 0
      : (await repos.workers.names(shell.tenant.id, { status: 'active' })).length

  const bar = (
    <PageBar
      title={copy.nav.workers}
      meta={count(t, 'meta', activeCount)}
      breadcrumb={[{ label: shell.tenant.legalName }]}
      actions={
        canWrite ? (
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/${slug}/imports/new?kind=workers`}>{t.import}</Link>
            </Button>
            <Button asChild>
              <Link href={`${base}/new`}>{t.add}</Link>
            </Button>
          </div>
        ) : undefined
      }
    />
  )

  const frame = (body: ReactNode) => (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">{body}</div>
    </>
  )

  if (forced === 'forbidden') {
    return frame(
      <ForbiddenState
        role="viewer"
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingTable columns={namesOnly ? 2 : 6} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const filter: WorkerListFilter = { status, query }
  // The viewer's rows are loaded as names only; the full rows are never fetched for them.
  const names =
    forced === 'empty' || !namesOnly ? [] : await repos.workers.names(shell.tenant.id, filter)
  const rows =
    forced === 'empty' || namesOnly ? [] : await repos.workers.list(shell.tenant.id, filter)
  const noneAtAll =
    forced === 'empty' ||
    (names.length + rows.length === 0 && (await repos.workers.names(shell.tenant.id)).length === 0)

  const empty = noneAtAll ? (
    <EmptyState
      icon={UserPlus}
      title={copy.emptyStates.workersTitle}
      body={copy.emptyStates.workers}
      action={
        canWrite && (
          <Button asChild>
            <Link href={`${base}/new`}>{copy.emptyStates.addWorker}</Link>
          </Button>
        )
      }
    />
  ) : query ? (
    <EmptyState icon={UserPlus} title={t.noMatch} />
  ) : (
    <EmptyState
      icon={UserPlus}
      title={t.emptyFilter.title}
      body={t.emptyFilter.body}
      action={
        <Button asChild variant="secondary">
          <Link href={base}>{t.emptyFilter.action}</Link>
        </Button>
      }
    />
  )

  return frame(
    <>
      {forced === 'locked' && <Notice tone="info" title={copy.billing.paused} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t.filterLabel} className="flex gap-1">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === 'active' ? base : `${base}?status=${s}`}
              aria-current={s === status ? 'page' : undefined}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-semibold focus-visible:focus-ring',
                s === status
                  ? 'border-n-900 bg-n-900 text-white'
                  : 'border-border-interactive bg-white text-n-800 hover:bg-n-50',
              )}
            >
              {t.filters[s]}
            </Link>
          ))}
        </nav>
        <search className="w-full max-w-xs">
          <form action={base}>
            {status !== 'active' && <input type="hidden" name="status" value={status} />}
            <label htmlFor="worker-search" className="sr-only">
              {t.search}
            </label>
            <Input
              id="worker-search"
              name="q"
              type="search"
              placeholder={t.search}
              defaultValue={query}
            />
          </form>
        </search>
      </div>
      {namesOnly ? (
        <WorkerNamesTable slug={slug} rows={names} empty={empty} />
      ) : (
        <WorkersTable slug={slug} rows={rows} empty={empty} />
      )}
    </>,
  )
}
