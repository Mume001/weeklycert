import { copy, count, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { ClosedNotice } from './ProjectFormScreen'
import { DeadlineText } from './ProjectsTable'
import { RetryErrorState } from './RetryErrorState'
import { screenState } from './screen-state'
import { TimelineWeeks } from './TimelineWeeks'

const t = copy.projects.timeline

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border-decorative bg-white px-4 py-3 shadow-sm">
      <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-text-primary">{children}</dd>
    </div>
  )
}

/** /app/[t]/projects/[id]: every week from the start date to today, no gaps (spec/03 §4.4). */
export async function TimelineScreen({
  slug,
  projectId,
  search,
}: {
  slug: string
  projectId: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const data = await getRepositories().projects.timeline(shell.tenant.id, projectId)
  if (!data) notFound()

  const { project } = data
  const base = `/app/${slug}/projects/${project.id}`
  const closed =
    forced === 'locked' || project.status === 'completed' || project.status === 'archived'
  const writer = PROJECT_WRITERS.includes(shell.role)
  const canWrite = writer && !closed && !isReadOnlyCompany(shell.tenant)
  const weeks = forced === 'empty' ? [] : data.weeks
  const current = weeks[0]

  const bar = (
    <PageBar
      title={project.name}
      meta={project.prcNumber ? fill(t.meta, { prc: project.prcNumber }) : undefined}
      breadcrumb={[
        { label: shell.tenant.legalName },
        { label: copy.nav.projects, href: `/app/${slug}/projects` },
      ]}
      actions={
        <>
          {writer && (
            <>
              <Button asChild variant="secondary">
                <Link href={`${base}/classifications`}>{t.editClassifications}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`${base}/settings`}>{t.editProject}</Link>
              </Button>
            </>
          )}
          {current && (
            <Button asChild>
              <Link href={`${base}/weeks/${current.weekEnding}`}>{t.openCurrentWeek}</Link>
            </Button>
          )}
        </>
      }
    />
  )
  const frame = (body: ReactNode) => (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 p-6">{body}</div>
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
  if (forced === 'loading') {
    return frame(
      <>
        <div aria-busy="true" className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => `c${i}`).map((key) => (
            <Skeleton key={key} className="h-16" />
          ))}
        </div>
        <LoadingTable columns={9} rows={8} />
      </>,
    )
  }
  if (forced === 'error') return frame(<RetryErrorState />)

  const wd =
    project.federalWdNumber === null
      ? t.noWd
      : project.federalWdMod === null
        ? project.federalWdNumber
        : fill(t.wdValue, { number: project.federalWdNumber, mod: project.federalWdMod })
  const gc =
    project.generalContractor ??
    (project.ourRole === 'prime' ? t.weAreGc : copy.projects.list.notSet)

  return frame(
    <>
      {closed && <ClosedNotice href={`${base}/settings#project-status`} />}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Card label={t.cards.prc}>
          <span className="font-mono tabular-nums">
            {project.prcNumber ?? copy.projects.list.notSet}
          </span>
        </Card>
        <Card label={t.cards.wd}>{wd}</Card>
        <Card label={t.cards.awardingBody}>
          {project.awardingBody ?? copy.projects.list.notSet}
        </Card>
        <Card label={t.cards.generalContractor}>{gc}</Card>
        <Card label={t.cards.classifications}>
          <Link
            href={`${base}/classifications`}
            className="rounded-sm text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
          >
            {count(t, 'classifications', project.classificationCount)}
          </Link>
        </Card>
        <Card label={t.cards.nextDeadline}>
          <DeadlineText date={project.nextDeadline} today={shell.today} />
        </Card>
      </dl>

      <section className="grid gap-3" aria-labelledby="timeline-heading">
        <div>
          <h2 id="timeline-heading" className="text-lg font-semibold text-text-primary">
            {t.section}
          </h2>
          <p className="text-sm text-text-secondary">{t.sectionNote}</p>
        </div>
        {weeks.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t.empty.title}
            body={fill(t.empty.body, { date: formatDate(project.firstWeekEnding) })}
            action={
              writer && (
                <Button asChild variant="secondary">
                  <Link href={`${base}/settings`}>{t.editProject}</Link>
                </Button>
              )
            }
          />
        ) : (
          <TimelineWeeks slug={slug} projectId={project.id} weeks={weeks} canWrite={canWrite} />
        )}
      </section>
    </>,
  )
}
