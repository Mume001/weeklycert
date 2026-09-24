import { copy } from '@wc/copy'
import { getRepositories, type WorkerFormDTO } from '@wc/data'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { DateText } from '@/components/patterns/DateText'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatHours, formatMoney } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PII_READERS, PROJECT_WRITERS } from '@/lib/session'
import { WorkerForm } from './WorkerForm'

const f = copy.workers.form

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

function ReadSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

/** Fringe credit per plan and the weeks worked: read here, entered elsewhere. */
function FringeAndHistory({ form }: { form: WorkerFormDTO }) {
  return (
    <>
      <ReadSection title={f.sections.fringe}>
        {form.fringe.length === 0 ? (
          <p className="text-sm text-text-secondary">{f.noFringe}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.fringeColumns.plan}</TableHead>
                <TableHead className="text-right">{f.fringeColumns.credit}</TableHead>
                <TableHead>{f.fringeColumns.from}</TableHead>
                <TableHead>{f.fringeColumns.to}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.fringe.map((row) => (
                <TableRow key={`${row.planId}-${row.from}`}>
                  <TableCell>{row.planName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.creditPerHour === null
                      ? copy.fringe.notSet
                      : formatMoney(row.creditPerHour)}
                  </TableCell>
                  <TableCell>
                    <DateText value={row.from} />
                  </TableCell>
                  <TableCell>
                    {row.to === null ? f.noEndDate : <DateText value={row.to} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReadSection>
      <ReadSection title={f.sections.history}>
        {form.history.length === 0 ? (
          <p className="text-sm text-text-secondary">{f.noHistory}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.historyColumns.weekEnding}</TableHead>
                <TableHead>{f.historyColumns.project}</TableHead>
                <TableHead className="text-right">{f.historyColumns.hours}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.history.map((row) => (
                <TableRow key={`${row.projectId}-${row.weekEnding}`}>
                  <TableCell>
                    <DateText value={row.weekEnding} />
                  </TableCell>
                  <TableCell>{row.projectName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatHours(row.hours)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReadSection>
    </>
  )
}

/**
 * /workers/new and /workers/[id] (spec/03 §4.6). The viewer sees the name and
 * the classification only; the server does not load the form for them, so no
 * address, SSN or date of birth reaches their browser (spec/02 §3).
 */
export async function WorkerFormScreen({
  slug,
  workerId,
  search,
}: {
  slug: string
  /** Null on /workers/new. */
  workerId: string | null
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const forced = screenState(search.state)
  const base = `/app/${slug}/workers`
  const isNew = workerId === null
  const writer = PROJECT_WRITERS.includes(shell.role)
  const repos = getRepositories()

  const title = (name: string) => (
    <PageBar
      title={isNew ? f.newTitle : name}
      breadcrumb={[{ label: shell.tenant.legalName }, { label: copy.nav.workers, href: base }]}
    />
  )

  // The viewer: name and classification, nothing else, and never a new worker.
  if (!PII_READERS.includes(shell.role) || forced === 'forbidden') {
    const brief = workerId === null ? null : await repos.workers.name(shell.tenant.id, workerId)
    if (workerId !== null && !brief) notFound()
    const bar = title(brief?.displayName ?? f.newTitle)
    if (isNew || forced === 'forbidden') {
      return (
        <>
          {bar}
          <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">
            <ForbiddenState
              role={forced === 'forbidden' ? 'viewer' : shell.role}
              needed="payroll"
              owner={shell.tenant.owner}
              dashboardHref={`/app/${slug}/dashboard`}
            />
          </div>
        </>
      )
    }
    return (
      <>
        {bar}
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">
          <ReadSection title={f.sections.basics}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-n-800">{copy.workers.list.columns.worker}</dt>
                <dd>{brief?.displayName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-n-800">
                  {copy.workers.list.columns.classification}
                </dt>
                <dd>{brief?.defaultClassification?.name ?? copy.workers.list.notSet}</dd>
              </div>
            </dl>
          </ReadSection>
        </div>
      </>
    )
  }

  const form = await repos.workers.form(shell.tenant.id, workerId)
  if (!form) notFound()
  const bar = title(form.displayName)
  const frame = (body: ReactNode) => (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-6">{body}</div>
    </>
  )

  if (forced === 'loading') return frame(<LoadingForm />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const shown = forced === 'empty' ? { ...form, fringe: [], history: [] } : form

  return frame(
    <>
      {paused && <Notice tone="info" title={copy.billing.paused} />}
      <WorkerForm slug={slug} form={shown} readOnly={!writer || paused} cancelHref={base} />
      {!isNew && <FringeAndHistory form={shown} />}
    </>,
  )
}
