import { copy, fill } from '@wc/copy'
import { getRepositories, type ImportKind } from '@wc/data'
import { cn } from 'cn'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { formatDate } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { CheckStep } from './CheckStep'
import { MappingStep } from './MappingStep'
import { ReconcileStep } from './ReconcileStep'
import { UploadForm } from './UploadForm'

const t = copy.imports

function Steps({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-2 text-sm font-semibold">
      {t.steps.map((label, i) => (
        <li
          key={label}
          aria-current={i + 1 === step ? 'step' : undefined}
          className={cn(
            'rounded-md border px-2.5 py-1.5',
            i + 1 === step
              ? 'border-n-900 bg-n-900 text-white'
              : 'border-border-decorative bg-white text-n-700',
          )}
        >
          <span className="tabular-nums">{i + 1}</span> {label}
        </li>
      ))}
    </ol>
  )
}

const KINDS: readonly ImportKind[] = ['hours', 'payroll', 'workers']

/**
 * /app/[t]/imports/new, four steps (spec/03 §4.7, 06 §2). The step comes from
 * the batch: uploaded is mapping, mapped is the check, checked is reconcile;
 * ?step=2 goes back to the mapping. ?kind, ?project and ?week preset step 1,
 * which is how the grid's "Import CSV" arrives.
 */
export async function NewImportScreen({
  slug,
  search,
}: {
  slug: string
  search: {
    state?: string
    batch?: string
    step?: string
    kind?: string
    project?: string
    week?: string
  }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const repos = getRepositories()
  const importer = PROJECT_WRITERS.includes(shell.role)
  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)

  const draft =
    search.batch && importer && !forced
      ? await repos.imports.draft(shell.tenant.id, search.batch).catch(() => null)
      : null
  if (search.batch && importer && !forced && !draft) notFound()
  const step = !draft
    ? 1
    : search.step === '2' || draft.status === 'uploaded'
      ? 2
      : draft.status === 'mapped'
        ? 3
        : 4

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={t.upload.title}
        meta={draft?.fileName}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.import, href: `/app/${slug}/imports` },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 p-6">{body}</div>
    </>
  )

  if (forced === 'forbidden' || !importer) {
    return frame(
      <ForbiddenState
        role={forced === 'forbidden' ? 'viewer' : shell.role}
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingTable columns={4} rows={6} />)
  if (forced === 'error') return frame(<RetryErrorState />)
  // A paused company reads and exports; it does not import (spec/08 §2.4).
  if (paused) return frame(<Notice tone="info" title={copy.billing.paused} />)

  if (!draft) {
    const active = forced === 'empty' ? [] : await repos.projects.list(shell.tenant.id)
    const projects = await Promise.all(
      active.map(async (p) => {
        const timeline = await repos.projects.timeline(shell.tenant.id, p.id)
        return {
          id: p.id,
          name: p.name,
          weeks: (timeline?.weeks ?? []).filter((w) => !w.locked).map((w) => w.weekEnding),
        }
      }),
    )
    const kind = KINDS.find((k) => k === search.kind) ?? 'hours'
    return frame(
      <>
        <Steps step={1} />
        <UploadForm
          slug={slug}
          projects={projects}
          initial={{ kind, projectId: search.project ?? '', weekEnding: search.week ?? '' }}
        />
      </>,
    )
  }

  return frame(
    <>
      <Steps step={step} />
      {draft.duplicateOf && (
        <Notice
          tone="warning"
          title={fill(t.upload.duplicate, { date: formatDate(draft.duplicateOf.date) })}
        />
      )}
      {draft.status === 'applied' || draft.status === 'undone' ? (
        <Link
          href={`/app/${slug}/imports/${draft.batchId}`}
          className="rounded-sm text-sm font-semibold text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
        >
          {t.history.open}
        </Link>
      ) : step === 2 ? (
        <MappingStep slug={slug} draft={draft} />
      ) : step === 3 ? (
        <CheckStep slug={slug} draft={draft} />
      ) : (
        <ReconcileStep slug={slug} draft={draft} />
      )}
    </>,
  )
}
