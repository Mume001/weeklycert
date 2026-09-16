import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { notFound } from 'next/navigation'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { FindingsPanel } from '@/features/findings/FindingsPanel'
import { GridErrorState } from '@/features/grid/GridErrorState'
import { WeekGrid } from '@/features/grid/WeekGrid'
import { dateParts } from '@/lib/format'
import { loadShell } from '@/lib/session'
import { WeekStateProvider } from '@/lib/week-state'

export const metadata = { title: copy.grid.title }

/** Who may type hours (spec/02 §3: the viewer reads, everybody else writes). */
const MAY_EDIT = ['owner', 'admin', 'payroll', 'signer', 'bookkeeper']

/** The five states every screen must be able to show (spec/19 §7), plus the
 *  sixth one that only the grid has: a conflict (spec/19 §6). */
type ScreenState = 'loading' | 'empty' | 'error' | 'forbidden' | 'locked' | 'conflict'

export default async function WeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string; we: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const { t, id, we } = await params
  const { state } = await searchParams
  const forced = state as ScreenState | undefined

  const shell = await loadShell(t)
  if (!shell) notFound()

  const week = dateParts(we)
  const bar = (
    <PageBar
      title={copy.grid.title}
      meta={fill(copy.grid.meta, {
        WeekEndDay: week.weekdayShort,
        date: `${week.monthShort} ${week.day}`,
        n: 22,
      })}
      breadcrumb={[
        { label: shell.tenant.legalName },
        { label: copy.nav.projects, href: `/app/${t}/projects` },
      ]}
    />
  )

  if (forced === 'forbidden') {
    return (
      <>
        {bar}
        <div className="p-6">
          <ForbiddenState
            role="viewer"
            needed="payroll"
            owner={shell.tenant.owner}
            dashboardHref={`/app/${t}/dashboard`}
          />
        </div>
      </>
    )
  }

  if (forced === 'loading') {
    return (
      <>
        {bar}
        <div className="p-6">
          <LoadingTable columns={14} rows={13} />
        </div>
      </>
    )
  }

  if (forced === 'error') {
    return (
      <>
        {bar}
        <div className="p-6">
          <GridErrorState requestId="req_2f9a1c" />
        </div>
      </>
    )
  }

  const repos = getRepositories()
  const data = await repos.weeks.grid(id, we)
  const editable = MAY_EDIT.includes(shell.role) && data.lockedReason === undefined
  const readOnly = !editable || forced === 'locked'
  const input = editable ? await repos.weeks.engineInput(id, we) : undefined

  return (
    <>
      {bar}
      <WeekStateProvider initialFindings={data.findings} readOnly={readOnly}>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-w-0 flex-1">
            <WeekGrid
              data={forced === 'empty' ? { ...data, rows: [], isNoWork: true } : data}
              {...(input && !readOnly ? { input, periodId: input.period.id } : {})}
              readOnly={readOnly}
              {...(data.lockedReason || forced === 'locked'
                ? { lockedBy: { name: shell.tenant.owner.name, at: we } }
                : {})}
              reviewHref={`/app/${t}/projects/${id}/weeks/${we}/review`}
              correctionHref={`/app/${t}/projects/${id}/weeks/${we}/reports`}
              {...(forced === 'conflict'
                ? { conflict: { by: shell.tenant.owner.name, minutesAgo: 2 } }
                : {})}
            />
          </div>
          <FindingsPanel />
        </div>
      </WeekStateProvider>
    </>
  )
}
