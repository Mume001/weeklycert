import { copy, count } from '@wc/copy'
import { getRepositories, type ProjectListFilter } from '@wc/data'
import { cn } from 'cn'
import { FolderPlus } from 'lucide-react'
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
import { ProjectsTable } from './ProjectsTable'

const t = copy.projects.list
const STATUSES = ['active', 'paused', 'closed'] as const
type StatusFilter = (typeof STATUSES)[number]

/**
 * /app/[t]/projects (spec/03 §4.4). With ?open=1 it is where "This week" leads
 * when the company has two or more active projects (spec/03 §3): only projects
 * with an open week, the oldest open week first, and a click opens that week.
 */
export async function ProjectsScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string; open?: string; status?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const forced = screenState(search.state)
  const openMode = search.open === '1'
  const status: StatusFilter = STATUSES.find((s) => s === search.status) ?? 'active'
  const base = `/app/${slug}/projects`
  // spec/08 §2.4: a paused company reads, it does not create. The locked state shows exactly that.
  const locked = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const canWrite = PROJECT_WRITERS.includes(shell.role) && !locked
  const activeCount = shell.tenants.find((x) => x.slug === slug)?.activeProjects ?? 0

  const add = canWrite && (
    <Button asChild>
      <Link href={`${base}/new`}>{t.add}</Link>
    </Button>
  )

  const bar = openMode ? (
    <PageBar
      title={copy.projectsOpen.title}
      breadcrumb={[{ label: shell.tenant.legalName }, { label: copy.nav.projects, href: base }]}
    />
  ) : (
    <PageBar
      title={copy.nav.projects}
      meta={count(t, 'meta', activeCount)}
      breadcrumb={[{ label: shell.tenant.legalName }]}
      actions={add || undefined}
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
  if (forced === 'loading') return frame(<LoadingTable columns={8} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const repos = getRepositories()
  const filter: ProjectListFilter = openMode ? { openOnly: true } : { status }
  const rows = forced === 'empty' ? [] : await repos.projects.list(shell.tenant.id, filter)

  // No project at all is a different message from an empty tab (spec/15 §3).
  const noneAtAll =
    forced === 'empty' ||
    (rows.length === 0 &&
      !openMode &&
      (
        await Promise.all(
          STATUSES.filter((s) => s !== status).map((s) =>
            repos.projects.list(shell.tenant.id, { status: s }),
          ),
        )
      ).every((list) => list.length === 0))

  const empty = openMode ? (
    <EmptyState icon={FolderPlus} title={copy.projectsOpen.empty} />
  ) : noneAtAll ? (
    <EmptyState
      icon={FolderPlus}
      title={t.empty.title}
      body={t.empty.body}
      action={
        canWrite && (
          <Button asChild>
            <Link href={`${base}/new`}>{copy.dashboard.emptyAction}</Link>
          </Button>
        )
      }
    />
  ) : (
    <EmptyState
      icon={FolderPlus}
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
      {openMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{copy.projectsOpen.subtitle}</p>
          <Link
            href={base}
            className="rounded-sm text-sm font-semibold text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
          >
            {t.showAll}
          </Link>
        </div>
      ) : (
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
      )}
      <ProjectsTable
        slug={slug}
        rows={rows}
        today={shell.today}
        openMode={openMode}
        canEnterHours={canWrite}
        empty={empty}
      />
    </>,
  )
}
