// The one page that puts several features together (spec/19 §2, the
// exception of 25.9.2026): the onboarding wizard reuses the forms of sessions
// F and G rather than making new ones (spec/20 H). This file only chooses what
// goes into which step.
import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { FringeSetupStep } from '@/features/fringe/SetupSteps'
import { OnboardingScreen, type StepContext } from '@/features/onboarding/OnboardingScreen'
import { ClassificationsSetupStep, ProjectSetupStep } from '@/features/projects/SetupSteps'
import { WorkerFringeSetupStep, WorkersSetupStep } from '@/features/workers/SetupSteps'

export const metadata: Metadata = { title: copy.nav.setup }

function stepBody(ctx: StepContext) {
  const { slug, tenantId, projectId, role, readOnly } = ctx
  switch (ctx.step) {
    case 2:
      return (
        <ProjectSetupStep
          slug={slug}
          tenantId={tenantId}
          projectId={projectId}
          readOnly={readOnly}
          createdHref={ctx.here({ project: '{id}' })}
        />
      )
    case 3:
      return (
        <ClassificationsSetupStep
          slug={slug}
          tenantId={tenantId}
          projectId={projectId}
          role={role}
          readOnly={readOnly}
        />
      )
    case 4:
      return (
        <WorkersSetupStep
          slug={slug}
          tenantId={tenantId}
          readOnly={readOnly}
          createdHref={ctx.here({ worker: '{id}' })}
        />
      )
    case 5:
      return (
        <>
          <FringeSetupStep
            slug={slug}
            tenantId={tenantId}
            role={role}
            readOnly={readOnly}
            createdHref={ctx.here({ plan: '{id}' })}
          />
          <WorkerFringeSetupStep
            slug={slug}
            tenantId={tenantId}
            workerId={ctx.search.worker}
            role={role}
            readOnly={readOnly}
            hrefFor={ctx.here({ worker: '{id}' })}
          />
        </>
      )
    default:
      return null
  }
}

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <OnboardingScreen slug={t} search={search} body={stepBody} />
}
