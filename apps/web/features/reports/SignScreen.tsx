import { copy } from '@wc/copy'
import { attestationPoints } from '@wc/core'
import { getRepositories } from '@wc/data'
import { FileSignature } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LockedBanner } from '@/components/patterns/LockedBanner'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, SIGNING_ROLES } from '@/lib/session'
import { weekMeta } from './ReviewScreen'
import { SignForm } from './SignForm'

/** /weeks/[we]/sign (spec/03 §4.5): the certification, and the one signature. */
export async function SignScreen({
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
        title={copy.sign.title}
        meta={meta}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.projects, href: `/app/${slug}/projects` },
          { label: copy.review.title, href: `${week}/review` },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[880px] gap-5 p-6">{body}</div>
    </>
  )

  // Payroll prepares everything and still does not sign (spec/02 §2).
  const maySign = SIGNING_ROLES.includes(shell.role) && shell.canSign
  if (forced === 'forbidden' || !maySign || isReadOnlyCompany(shell.tenant)) {
    return frame(
      <ForbiddenState
        role={shell.role}
        needed="signer"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') {
    return frame(
      <div aria-busy="true" className="grid gap-3">
        {Array.from({ length: 6 }, (_, i) => `s${i}`).map((key) => (
          <Skeleton key={key} className="h-16" />
        ))}
      </div>,
    )
  }
  if (forced === 'error') return frame(<RetryErrorState />)

  const repos = getRepositories()
  const data = await repos.weeks.review(shell.tenant.id, projectId, weekEnding)
  if (!data) notFound()
  const meta = weekMeta(weekEnding, data.period.payrollNumber, data.period.expectedPayrollNumber)

  if (data.period.lockedReason !== null || forced === 'locked') {
    return frame(
      <>
        <LockedBanner
          reason="signed"
          signedBy={shell.tenant.owner.name}
          signedAt={data.period.weekEnding}
        />
        <Button asChild>
          <Link href={`${week}/reports`}>{copy.reports.title}</Link>
        </Button>
      </>,
      meta,
    )
  }

  // Nothing is signed that was not generated first (spec/04 §7.1).
  if (data.period.status !== 'generated' || forced === 'empty') {
    return frame(
      <EmptyState
        icon={FileSignature}
        title={copy.reports.empty.title}
        body={copy.reports.empty.body}
        action={
          <Button asChild>
            <Link href={`${week}/review`}>{copy.reports.empty.action}</Link>
          </Button>
        }
      />,
      meta,
    )
  }

  const signer = await repos.reports.signer(shell.tenant.id, shell.user.id)
  if (!signer) notFound()
  const points = attestationPoints({
    hasApprentices: data.hasApprentices,
    hasFringe: data.hasFringe,
  })

  return frame(
    <SignForm
      slug={slug}
      periodId={data.period.id}
      signer={signer}
      points={points}
      reportsHref={`${week}/reports`}
    />,
    meta,
  )
}
