// Onboarding step 5, the company's plans (spec/03 §4.3): the table and the
// plan form with the premium converter from session G, as they are. The
// wizard page puts this in (spec/19 §2, the exception).
import { copy } from '@wc/copy'
import { getRepositories, type MembershipRole } from '@wc/data'
import { HeartHandshake } from 'lucide-react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PROJECT_WRITERS } from '@/lib/session'
import { FringePlanForm } from './FringePlanForm'
import { FringePlansTable } from './FringePlansTable'

export async function FringeSetupStep({
  slug,
  tenantId,
  role,
  readOnly,
  createdHref,
}: {
  slug: string
  tenantId: string
  role: MembershipRole
  readOnly: boolean
  /** Back to this step after a save, "{id}" standing for the plan. */
  createdHref: string
}) {
  const dto = await getRepositories().fringe.list(tenantId)
  const canWrite = PROJECT_WRITERS.includes(role) && !readOnly
  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">{copy.onboarding.fringe.intro}</p>
      <FringePlansTable
        slug={slug}
        plans={dto.plans}
        canEdit={false}
        empty={
          <EmptyState
            icon={HeartHandshake}
            title={copy.fringe.empty.title}
            body={copy.fringe.empty.body}
          />
        }
      />
      {canWrite && (
        <div className="max-w-[880px]">
          {/* A fresh form after each plan: the key moves with the count. */}
          <FringePlanForm
            key={dto.plans.length}
            slug={slug}
            plan={null}
            basis={dto.annualHoursBasis}
            readOnly={false}
            cancelHref={`/app/${slug}/fringe-plans`}
            createdHref={createdHref}
          />
        </div>
      )}
    </div>
  )
}
