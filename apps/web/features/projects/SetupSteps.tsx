// Onboarding steps 2 and 3 (spec/03 §4.3): the project form and the
// classification rates of session F, as they are, plus the paste from the wage
// schedule. The wizard page puts these in (spec/19 §2, the exception); nothing
// here knows about the wizard beyond where a create lands.
import { copy } from '@wc/copy'
import type { MembershipRole } from '@wc/data'
import { getRepositories } from '@wc/data'
import { notFound } from 'next/navigation'
import { PROJECT_WRITERS } from '@/lib/session'
import { ClassificationsPanel } from './ClassificationsPanel'
import { PasteSchedule } from './PasteSchedule'
import { ProjectForm } from './ProjectForm'

export async function ProjectSetupStep({
  slug,
  tenantId,
  projectId,
  readOnly,
  createdHref,
}: {
  slug: string
  tenantId: string
  /** Null: the company has no project yet, so the form creates the first one. */
  projectId: string | null
  readOnly: boolean
  createdHref: string
}) {
  const form = await getRepositories().projects.form(tenantId, projectId)
  if (!form) notFound()
  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">{copy.onboarding.project.intro}</p>
      <ProjectForm
        slug={slug}
        form={form}
        readOnly={readOnly}
        closed={false}
        cancelHref={`/app/${slug}/dashboard`}
        createdHref={createdHref}
      />
    </div>
  )
}

export async function ClassificationsSetupStep({
  slug,
  tenantId,
  projectId,
  role,
  readOnly,
}: {
  slug: string
  tenantId: string
  projectId: string | null
  role: MembershipRole
  readOnly: boolean
}) {
  const data = projectId
    ? await getRepositories().projects.classifications(tenantId, projectId)
    : null
  if (!projectId || !data) {
    return <p className="text-sm text-text-secondary">{copy.onboarding.noProject}</p>
  }
  const canWrite = PROJECT_WRITERS.includes(role) && !readOnly
  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">{copy.onboarding.classifications.intro}</p>
      {canWrite && (
        <PasteSchedule
          slug={slug}
          projectId={projectId}
          catalog={data.catalog}
          onProject={data.rows.map((r) => r.classificationId)}
        />
      )}
      <ClassificationsPanel
        slug={slug}
        projectId={projectId}
        rows={data.rows}
        catalog={data.catalog}
        canWrite={canWrite}
      />
    </div>
  )
}
