import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { formatDate } from '@/lib/format'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { ClassificationsPanel } from './ClassificationsPanel'
import { Notice } from './Notice'
import { ClosedNotice } from './ProjectFormScreen'
import { RetryErrorState } from './RetryErrorState'
import { screenState } from './screen-state'

const c = copy.projects.classifications

/** /app/[t]/projects/[id]/classifications (spec/03 §4.4). */
export async function ClassificationsScreen({
  slug,
  projectId,
  search,
}: {
  slug: string
  projectId: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const data = await getRepositories().projects.classifications(shell.tenant.id, projectId)
  if (!data) notFound()

  const { project } = data
  const base = `/app/${slug}/projects/${project.id}`
  const closed =
    forced === 'locked' || project.status === 'completed' || project.status === 'archived'
  const canWrite =
    PROJECT_WRITERS.includes(shell.role) && !closed && !isReadOnlyCompany(shell.tenant)

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={c.title}
        meta={c.subtitle}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.projects, href: `/app/${slug}/projects` },
          { label: project.name, href: base },
        ]}
      />
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
  if (forced === 'loading') return frame(<LoadingTable columns={9} rows={5} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const rows = forced === 'empty' ? [] : data.rows
  const missing = forced === 'empty' ? [] : data.missingForCurrentWeek

  return frame(
    <>
      {closed && <ClosedNotice href={`${base}/settings#project-status`} />}
      {missing.length > 0 && data.currentWeekEnding && (
        <Notice tone="warning" title={c.missingTitle}>
          <ul>
            {missing.map((m) => (
              <li key={m.classificationId}>
                {fill(c.missingRate, {
                  Classification: m.officialLabel,
                  date: formatDate(data.currentWeekEnding ?? ''),
                })}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <ClassificationsPanel
        slug={slug}
        projectId={project.id}
        rows={rows}
        catalog={data.catalog}
        canWrite={canWrite}
      />
    </>,
  )
}
