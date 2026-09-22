import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { ProjectForm } from './ProjectForm'

/** Skeleton in the shape of the form (spec/19 §7), no spinner. */
function LoadingForm() {
  return (
    <div
      aria-busy="true"
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 sm:grid-cols-2"
    >
      {Array.from({ length: 8 }, (_, i) => `f${i}`).map((key) => (
        <div key={key} className="grid gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9" />
        </div>
      ))}
    </div>
  )
}

/** A closed project reads; its status is the one field left, and it reopens the project. */
export function ClosedNotice({ href }: { href: string }) {
  return (
    <Notice
      tone="info"
      title={copy.projects.closed.text}
      action={
        <Link
          href={href}
          className="rounded-sm text-sm font-semibold text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
        >
          {copy.projects.closed.action}
        </Link>
      }
    />
  )
}

/** /projects/new and /projects/[id]/settings: one form (spec/03 §4.4). */
export async function ProjectFormScreen({
  slug,
  projectId,
  search,
}: {
  slug: string
  /** Null on /projects/new. */
  projectId: string | null
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const forced = screenState(search.state)
  const base = `/app/${slug}/projects`
  const isNew = projectId === null
  const writer = PROJECT_WRITERS.includes(shell.role)
  const form = await getRepositories().projects.form(shell.tenant.id, projectId)
  if (!form) notFound()

  const bar = (
    <PageBar
      title={isNew ? copy.projects.form.newTitle : copy.projects.form.settingsTitle}
      breadcrumb={[
        { label: shell.tenant.legalName },
        { label: copy.nav.projects, href: base },
        ...(isNew ? [] : [{ label: form.values.name, href: `${base}/${projectId}` }]),
      ]}
    />
  )
  const frame = (body: ReactNode) => (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">{body}</div>
    </>
  )

  // A viewer reads projects but never creates one (spec/02 §3).
  if (forced === 'forbidden' || (isNew && !writer)) {
    return frame(
      <ForbiddenState
        role={forced === 'forbidden' ? 'viewer' : shell.role}
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingForm />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const paused = isReadOnlyCompany(shell.tenant) || (isNew && forced === 'locked')
  const closed =
    !isNew &&
    (forced === 'locked' || form.values.status === 'completed' || form.values.status === 'archived')

  return frame(
    <>
      {isNew && forced === 'locked' && <Notice tone="info" title={copy.billing.paused} />}
      {closed && <ClosedNotice href="#project-status" />}
      <ProjectForm
        slug={slug}
        form={form}
        readOnly={!writer || paused}
        closed={closed}
        cancelHref={isNew ? base : `${base}/${projectId}`}
      />
    </>,
  )
}
