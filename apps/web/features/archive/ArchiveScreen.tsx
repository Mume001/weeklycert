import { copy, count } from '@wc/copy'
import { type ArchiveFilter, ArchiveFilterSchema, getRepositories } from '@wc/data'
import { Archive } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { screenState } from '@/lib/screen-state'
import { ARCHIVE_FILE_READERS, isReadOnlyCompany, loadShell } from '@/lib/session'
import { ArchiveTable } from './ArchiveTable'

const t = copy.archive
const f = t.filters

type Search = {
  state?: string
  query?: string
  projectId?: string
  year?: string
  status?: string
  versions?: string
  worker?: string
}

/** Empty strings from the form are no filter at all. */
function filterOf(search: Search): ArchiveFilter {
  const parsed = ArchiveFilterSchema.safeParse(
    Object.fromEntries(Object.entries(search).filter(([k, v]) => k !== 'state' && v)),
  )
  return parsed.success ? parsed.data : {}
}

/**
 * /app/[t]/archive (spec/03 §4.8): any filed report in ten seconds. Every role
 * reads it (02 §3); a paused company reads and exports too (08 §2.4).
 */
export async function ArchiveScreen({ slug, search }: { slug: string; search: Search }) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const base = `/app/${slug}/archive`
  const filter = filterOf(search)
  const filtered = Object.keys(filter).length > 0
  // The viewer gets only the PDF, from step 5 (02 §3); the example XML is all there is yet.
  const downloads = ARCHIVE_FILE_READERS.includes(shell.role)

  const dto =
    forced === 'loading' || forced === 'error' || forced === 'forbidden'
      ? null
      : await getRepositories().archive.list(shell.tenant.id, forced === 'empty' ? {} : filter)
  const rows = forced === 'empty' ? [] : (dto?.rows ?? [])

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={copy.nav.archive}
        meta={dto ? count(t, 'meta', rows.length) : undefined}
        breadcrumb={[{ label: shell.tenant.legalName }]}
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
  if (forced === 'loading') return frame(<LoadingTable columns={8} rowHeight={40} />)
  if (forced === 'error' || !dto) return frame(<RetryErrorState />)

  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const exportId = forced === 'empty' ? null : dto.exportProjectId

  const empty =
    filtered && forced !== 'empty' ? (
      <EmptyState
        icon={Archive}
        title={t.emptyFilter}
        action={
          <Button asChild variant="secondary">
            <Link href={base}>{f.clear}</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState icon={Archive} title={copy.nav.archive} body={copy.emptyStates.archive} />
    )

  return frame(
    <>
      {paused && <Notice tone="info" title={copy.billing.paused} />}
      <form
        action={base}
        aria-label={f.label}
        className="grid gap-3 rounded-lg border border-border-decorative bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6"
      >
        <FormField id="archive-query" label={f.query} className="sm:col-span-2 lg:col-span-1">
          <Input {...fieldIds('archive-query')} name="query" defaultValue={filter.query ?? ''} />
        </FormField>
        <FormField id="archive-project" label={f.project}>
          <select
            {...fieldIds('archive-project')}
            name="projectId"
            defaultValue={filter.projectId ?? ''}
            className={selectClass}
          >
            <option value="">{f.allProjects}</option>
            {dto.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="archive-year" label={f.year}>
          <select
            {...fieldIds('archive-year')}
            name="year"
            defaultValue={filter.year ? String(filter.year) : ''}
            className={selectClass}
          >
            <option value="">{f.allYears}</option>
            {dto.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="archive-status" label={f.status}>
          <select
            {...fieldIds('archive-status')}
            name="status"
            defaultValue={filter.status ?? ''}
            className={selectClass}
          >
            <option value="">{f.allStatuses}</option>
            {(['signed', 'submitted', 'rejected', 'corrected'] as const).map((s) => (
              <option key={s} value={s}>
                {copy.status[s]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="archive-versions" label={f.versions}>
          <select
            {...fieldIds('archive-versions')}
            name="versions"
            defaultValue={filter.versions ?? 'all'}
            className={selectClass}
          >
            <option value="all">{f.everyVersion}</option>
            <option value="latest">{f.latestOnly}</option>
          </select>
        </FormField>
        <FormField id="archive-worker" label={f.worker.label} hint={f.worker.hint}>
          <Input
            {...fieldIds('archive-worker', f.worker.hint)}
            name="worker"
            defaultValue={filter.worker ?? ''}
          />
        </FormField>
        <div className="flex items-center gap-2 sm:col-span-3 lg:col-span-6">
          <Button type="submit">{f.show}</Button>
          {filtered && (
            <Button asChild variant="secondary">
              <Link href={base}>{f.clear}</Link>
            </Button>
          )}
          {downloads && exportId && (
            <span className="ml-auto flex flex-wrap items-center justify-end gap-3">
              <span className="max-w-md text-right text-xs text-text-secondary">
                {t.exportNote}
              </span>
              <Button asChild variant="secondary">
                <a
                  href={`/api/files/${encodeURIComponent(`archive:${exportId}`)}?t=${encodeURIComponent(slug)}`}
                >
                  {t.export}
                </a>
              </Button>
            </span>
          )}
        </div>
      </form>
      <ArchiveTable slug={slug} rows={rows} downloads={downloads} empty={empty} />
    </>,
  )
}
