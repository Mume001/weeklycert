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
import { isReadOnlyCompany, loadShell } from '@/lib/session'
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

  const repos = getRepositories()
  // The company is part of the lookup: another company's project is not
  // found, the same 404 as one that does not exist (spec/19 §3, Repository).
  const data = await repos.weeks.grid(shell.tenant.id, id, we)
  if (!data) notFound()

  const week = dateParts(we)
  // The payroll number comes from the data, never from the component: before
  // signing it is the one this week will get, after it the one it has
  // (spec/04 §7.1, same rule as the project timeline).
  const payrollNo = data.payrollNumber ?? data.expectedPayrollNumber
  const bar = (
    <PageBar
      title={copy.grid.title}
      meta={
        payrollNo === null
          ? undefined
          : fill(data.payrollNumber === null ? copy.grid.meta : copy.grid.metaSigned, {
              WeekEndDay: week.weekdayShort,
              date: `${week.monthShort} ${week.day}`,
              n: payrollNo,
            })
      }
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
          <LoadingTable columns={15} rows={13} />
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

  // spec/08 §2.4: a paused company reads, and the grid says so from the first
  // paint: the shell banner, locked cells, no generate. The 403 on the server
  // stays as the second wall, but the screen never leads the user into it.
  const editable =
    MAY_EDIT.includes(shell.role) &&
    data.lockedReason === undefined &&
    !isReadOnlyCompany(shell.tenant)
  const readOnly = !editable || forced === 'locked'
  const input = editable ? await repos.weeks.engineInput(shell.tenant.id, id, we) : undefined

  return (
    <>
      {bar}
      <WeekStateProvider initialFindings={data.findings} readOnly={readOnly}>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-w-0 flex-1">
            <WeekGrid
              data={forced === 'empty' ? { ...data, rows: [], isNoWork: true } : data}
              {...(input && !readOnly
                ? {
                    input,
                    entriesUrl: `/api/v1/periods/${input.period.id}/entries?t=${encodeURIComponent(t)}`,
                  }
                : {})}
              readOnly={readOnly}
              {...(data.lockedReason || forced === 'locked'
                ? { lockedBy: { name: shell.tenant.owner.name, at: we } }
                : {})}
              reviewHref={`/app/${t}/projects/${id}/weeks/${we}/review`}
              importHref={`/app/${t}/imports/new?kind=hours&project=${id}&week=${we}`}
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
