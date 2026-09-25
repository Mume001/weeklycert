import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { CalendarOff } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { LockedBanner } from '@/components/patterns/LockedBanner'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { dateParts, formatDate } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { WeekStateProvider } from '@/lib/week-state'
import { FindingsCount } from './FindingsCount'
import { GenerateButton } from './GenerateButton'
import { OutputSamples } from './OutputSamples'
import { PayrollSection } from './PayrollSection'
import { ReviewSummary } from './ReviewSummary'

/** The week's number, as the header of the grid shows it (spec/15 §3). */
export function weekMeta(week: string, payrollNumber: number | null, expected: number | null) {
  const parts = dateParts(week)
  const n = payrollNumber ?? expected
  if (n === null) return undefined
  return fill(payrollNumber === null ? copy.grid.meta : copy.grid.metaSigned, {
    WeekEndDay: parts.weekdayShort,
    date: `${parts.monthShort} ${parts.day}`,
    n,
  })
}

/**
 * /weeks/[we]/review (spec/03 §4.5): the last look before the signature. The
 * findings panel is the grid's, because it is the same list of findings, and
 * the one primary action is generating the draft, which a blocking finding
 * refuses (spec/07 §1).
 */
export async function ReviewScreen({
  slug,
  projectId,
  weekEnding,
  search,
  findingsPanel,
}: {
  slug: string
  projectId: string
  weekEnding: string
  search: { state?: string }
  /** <FindingsPanel />, handed in by the page: features never import each other. */
  findingsPanel: ReactNode
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const week = `/app/${slug}/projects/${projectId}/weeks/${weekEnding}`

  const bar = (meta?: string) => (
    <PageBar
      title={copy.review.title}
      meta={meta}
      breadcrumb={[
        { label: shell.tenant.legalName },
        { label: copy.nav.projects, href: `/app/${slug}/projects` },
        { label: copy.grid.title, href: week },
      ]}
    />
  )
  const frame = (body: ReactNode, meta?: string) => (
    <>
      {bar(meta)}
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
  if (forced === 'loading') return frame(<LoadingTable columns={11} rows={8} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const data = await getRepositories().weeks.review(shell.tenant.id, projectId, weekEnding)
  if (!data) notFound()

  const meta = weekMeta(weekEnding, data.period.payrollNumber, data.period.expectedPayrollNumber)
  const locked = data.period.lockedReason !== null || forced === 'locked'
  const writer = PROJECT_WRITERS.includes(shell.role) && !isReadOnlyCompany(shell.tenant)
  const canEdit = writer && !locked
  const paused = isReadOnlyCompany(shell.tenant)
  const empty = forced === 'empty' || data.period.isNoWork || data.workers.length === 0

  // A week with no work is not filed as a file at all (spec/05 §3.4); a week
  // that simply has no hours yet is a different thing and says so.
  if (empty) {
    return frame(
      <>
        {data.period.isNoWork && (
          <Notice tone="info" title={copy.submit.noWorkTitle}>
            {copy.submit.noWorkBody}
          </Notice>
        )}
        <EmptyState
          icon={CalendarOff}
          title={copy.grid.emptyWeek}
          action={
            <Button asChild variant="secondary">
              <Link href={week}>{copy.review.backToHours}</Link>
            </Button>
          }
        />
      </>,
      meta,
    )
  }

  const signHref = `${week}/sign`
  const reportsHref = `${week}/reports`
  const signer = shell.canSign

  // Payroll prepares the week and asks the signer for the signature by email
  // (spec/02 §5); the signer signs it.
  const afterDraft = signer ? (
    <Button asChild>
      <Link href={signHref}>{copy.review.sign}</Link>
    </Button>
  ) : (
    <Button asChild>
      <a href={`mailto:${shell.tenant.owner.email}`}>{copy.review.requestSignature}</a>
    </Button>
  )

  const actions =
    data.period.lockedReason !== null ? (
      <Button asChild>
        <Link href={reportsHref}>{copy.reports.title}</Link>
      </Button>
    ) : data.period.status === 'generated' ? (
      afterDraft
    ) : canEdit ? (
      <GenerateButton slug={slug} periodId={data.period.id} next={afterDraft} />
    ) : paused && PROJECT_WRITERS.includes(shell.role) && !locked ? (
      // A paused company sees the button it will have again, switched off (spec/08 §2.4).
      <Button disabled>{copy.review.generate}</Button>
    ) : null

  return (
    <>
      {bar(meta)}
      <WeekStateProvider initialFindings={data.findings} readOnly={!canEdit}>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="mx-auto grid w-full max-w-[1440px] min-w-0 flex-1 gap-5 p-6">
            {data.period.lockedReason === 'signed' || forced === 'locked' ? (
              <LockedBanner
                reason="signed"
                signedBy={shell.tenant.owner.name}
                signedAt={data.period.weekEnding}
              />
            ) : data.period.lockedReason === 'submitted' ? (
              <LockedBanner reason="submitted" signedAt={data.period.weekEnding} />
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {fill(copy.submit.steps[1] ?? '', {
                  prc: data.project.prcNumber ?? '',
                  date: formatDate(data.period.weekEnding),
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <FindingsCount />
                <Button asChild variant="secondary">
                  <Link href={week}>{copy.review.backToHours}</Link>
                </Button>
                {actions}
              </div>
            </div>

            <ReviewSummary workers={data.workers} showPayroll={shell.role !== 'viewer'} />
            {shell.role !== 'viewer' && (
              <PayrollSection
                slug={slug}
                periodId={data.period.id}
                workers={data.workers}
                readOnly={!canEdit}
              />
            )}
            <OutputSamples data={data} />
          </div>
          {findingsPanel}
        </div>
      </WeekStateProvider>
    </>
  )
}
