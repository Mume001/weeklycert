// Onboarding step 4, and the per-worker half of step 5 (spec/03 §4.3): the
// worker form and the fringe plans of one worker from session G, as they are.
// The wizard page puts these in (spec/19 §2, the exception).
import { copy, count } from '@wc/copy'
import { getRepositories, type MembershipRole } from '@wc/data'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FRINGE_ALLOCATION_WRITERS } from '@/lib/session'
import { WorkerForm } from './WorkerForm'
import { WorkerFringe } from './WorkerFringe'
import { WorkerPicker } from './WorkerPicker'

const o = copy.onboarding

export async function WorkersSetupStep({
  slug,
  tenantId,
  readOnly,
  createdHref,
}: {
  slug: string
  tenantId: string
  readOnly: boolean
  /** Back to this step after a create, "{id}" standing for the new worker. */
  createdHref: string
}) {
  const repos = getRepositories()
  const [names, form] = await Promise.all([
    repos.workers.names(tenantId),
    repos.workers.form(tenantId, null),
  ])
  if (!form) return null
  return (
    <div className="grid gap-4">
      <div className="flex max-w-[880px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">{o.workers.intro}</p>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/app/${slug}/imports/new`} prefetch={false}>
            {o.workers.import}
          </Link>
        </Button>
      </div>
      <p className="text-sm font-semibold text-text-primary" role="status">
        {count(o.workers, 'count', names.length)}
      </p>
      {/* A fresh form after each worker: the key moves with the count. */}
      <WorkerForm
        key={names.length}
        slug={slug}
        form={form}
        readOnly={readOnly}
        cancelHref={`/app/${slug}/workers`}
        createdHref={createdHref}
      />
    </div>
  )
}

/** Step 5, per worker: pick one, then the plans of that worker with their credit. */
export async function WorkerFringeSetupStep({
  slug,
  tenantId,
  workerId,
  role,
  readOnly,
  hrefFor,
}: {
  slug: string
  tenantId: string
  workerId: string | undefined
  role: MembershipRole
  readOnly: boolean
  /** This step's URL with "{id}" standing for the worker. */
  hrefFor: string
}) {
  const repos = getRepositories()
  const names = await repos.workers.names(tenantId)
  const form = workerId ? await repos.workers.form(tenantId, workerId) : null
  return (
    <div className="grid gap-3">
      <WorkerPicker workers={names} selected={form?.workerId ?? null} hrefFor={hrefFor} />
      {form && (
        <WorkerFringe
          slug={slug}
          form={form}
          canEdit={FRINGE_ALLOCATION_WRITERS.includes(role) && !readOnly}
        />
      )}
    </div>
  )
}
