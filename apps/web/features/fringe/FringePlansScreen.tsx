import { copy, count } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { HeartHandshake } from 'lucide-react'
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
import { FringePlanForm } from './FringePlanForm'
import { FringePlansTable } from './FringePlansTable'

const t = copy.fringe

/**
 * /app/[t]/fringe-plans (spec/03 §4.6): the table, and under it the plan that
 * ?plan= names, with the converter from a monthly premium to a credit per hour.
 * ?plan=new is a new plan. Every role reads (spec/02 §3); the viewer and a
 * paused company read only.
 */
export async function FringePlansScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string; plan?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const forced = screenState(search.state)
  const base = `/app/${slug}/fringe-plans`
  const locked = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const canWrite = PROJECT_WRITERS.includes(shell.role) && !locked
  const dto = await getRepositories().fringe.list(shell.tenant.id)
  const plans = forced === 'empty' ? [] : dto.plans

  const bar = (
    <PageBar
      title={copy.nav.fringePlans}
      meta={count(t, 'meta', plans.length)}
      breadcrumb={[{ label: shell.tenant.legalName }]}
      actions={
        canWrite ? (
          <Button asChild>
            <Link href={`${base}?plan=new`}>{t.add}</Link>
          </Button>
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
  if (forced === 'loading') return frame(<LoadingTable columns={7} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const isNew = search.plan === 'new' && canWrite
  const selected = plans.find((p) => p.id === search.plan) ?? null
  // A plan id that is not this company's is not found, like any other (spec/19 §3).
  if (search.plan && search.plan !== 'new' && !selected && forced !== 'empty') notFound()

  const empty = (
    <EmptyState
      icon={HeartHandshake}
      title={t.empty.title}
      body={t.empty.body}
      action={
        canWrite && (
          <Button asChild>
            <Link href={`${base}?plan=new`}>{t.empty.action}</Link>
          </Button>
        )
      }
    />
  )

  return frame(
    <>
      {locked && <Notice tone="info" title={copy.billing.paused} />}
      <FringePlansTable slug={slug} plans={plans} canEdit={canWrite} empty={empty} />
      {(isNew || selected) && (
        <div className="max-w-[880px]">
          <FringePlanForm
            key={selected?.id ?? 'new'}
            slug={slug}
            plan={selected}
            basis={dto.annualHoursBasis}
            readOnly={!canWrite}
            cancelHref={base}
          />
        </div>
      )}
    </>,
  )
}
