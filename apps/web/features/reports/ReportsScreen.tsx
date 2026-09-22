import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { DateText } from '@/components/patterns/DateText'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatClock, formatDate } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { CreateCorrection, PortalResponse, RecordFiling, SendToPrime } from './FilingForms'
import { weekMeta } from './ReviewScreen'

const t = copy.reports

/**
 * /weeks/[we]/reports (spec/03 §4.5): the versions of this week, what was
 * filed, what the portal said, and the way to a correction. The portal has no
 * API, so everything here is recorded by hand and that is on purpose
 * (spec/05 §3.4).
 */
export async function ReportsScreen({
  slug,
  projectId,
  weekEnding,
  search,
}: {
  slug: string
  projectId: string
  weekEnding: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const week = `/app/${slug}/projects/${projectId}/weeks/${weekEnding}`

  const frame = (body: ReactNode, meta?: string) => (
    <>
      <PageBar
        title={t.title}
        meta={meta}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.projects, href: `/app/${slug}/projects` },
          { label: copy.grid.title, href: week },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1100px] gap-5 p-6">{body}</div>
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
  if (forced === 'loading') return frame(<LoadingTable columns={5} rows={3} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const data = await getRepositories().reports.list(shell.tenant.id, projectId, weekEnding)
  if (!data) notFound()

  const meta = weekMeta(weekEnding, data.period.payrollNumber, data.period.expectedPayrollNumber)
  const writer = PROJECT_WRITERS.includes(shell.role) && !isReadOnlyCompany(shell.tenant)
  const canWrite = writer && forced !== 'locked'
  const versions = forced === 'empty' ? [] : data.versions
  const filings = data.submissions.filter((s) => s.channel === 'ny_portal_manual')
  const latestFiling = filings[0]

  if (data.period.isNoWork) {
    return frame(
      <Notice tone="info" title={copy.submit.noWorkTitle}>
        {copy.submit.noWorkBody}
      </Notice>,
      meta,
    )
  }

  return frame(
    <>
      {versions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.empty.title}
          body={t.empty.body}
          action={
            <Button asChild>
              <Link href={`${week}/review`}>{t.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t.columns.version}</TableHead>
                <TableHead>{t.columns.generated}</TableHead>
                <TableHead>{t.columns.signedBy}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.files}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-semibold">
                    {fill(copy.projects.timeline.version, { n: version.version })}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col leading-tight">
                      <DateText value={version.generatedAt.slice(0, 10)} />
                      <span className="text-xs text-text-secondary tabular-nums">
                        {formatClock(version.generatedAt)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {version.signedBy ? (
                      <span className="flex flex-col leading-tight">
                        {version.signedBy.name}
                        <span className="text-xs text-text-secondary">
                          {version.signedBy.title}
                        </span>
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={version.status === 'final' ? 'signed' : 'validated'} />
                  </TableCell>
                  <TableCell>
                    {version.files.map((file) => (
                      <Button key={file.id} asChild size="sm" variant="secondary">
                        <a
                          href={`/api/files/${encodeURIComponent(file.id)}?t=${encodeURIComponent(slug)}`}
                        >
                          {copy.buttons.download}
                        </a>
                      </Button>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {versions.length > 0 && <Notice tone="info" title={copy.review.sampleNote} />}

      {filings.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-md font-semibold text-text-primary">{t.portal.title}</h2>
          <ul className="grid gap-2">
            {filings.map((filing) => (
              <li
                key={filing.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border-decorative bg-white px-4 py-3 text-sm shadow-sm"
              >
                <DateText value={filing.submittedAt.slice(0, 10)} />
                {filing.confirmationRef && (
                  <span className="font-mono text-xs">{filing.confirmationRef}</span>
                )}
                <StatusBadge
                  status={
                    filing.outcome === 'rejected'
                      ? 'rejected'
                      : filing.outcome === 'accepted'
                        ? 'submitted'
                        : 'validated'
                  }
                />
                {filing.rejectionReason && (
                  <span className="min-w-0 flex-1 text-text-secondary">
                    {filing.rejectionReason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canWrite && versions.length > 0 && data.period.payrollNumber !== null && (
        <RecordFiling
          slug={slug}
          periodId={data.period.id}
          prc={data.project.prcNumber ?? ''}
          weekEnding={formatDate(data.period.weekEnding)}
        />
      )}
      {canWrite && latestFiling && latestFiling.outcome === 'pending' && (
        <PortalResponse slug={slug} submission={latestFiling} />
      )}
      {canWrite && versions.length > 0 && <SendToPrime slug={slug} periodId={data.period.id} />}
      {canWrite && data.period.lockedReason !== null && (
        <CreateCorrection slug={slug} periodId={data.period.id} weekHref={week} />
      )}
    </>,
    meta,
  )
}
