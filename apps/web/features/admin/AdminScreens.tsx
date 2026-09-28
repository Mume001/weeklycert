import { copy, count, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Money } from '@/components/patterns/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supportNow } from '@/lib/clock'
import { formatClock, formatDate } from '@/lib/format'
import { ApproveButton, JobButtons, SupportAccessForm } from './AdminForms'
import { adminPage } from './AdminFrame'

const a = copy.admin
type Search = { state?: string }

const when = (at: string) => `${formatDate(at.slice(0, 10))} ${formatClock(at)}`
const status = (s: string) =>
  s in copy.settings.billing.status
    ? copy.settings.billing.status[s as keyof typeof copy.settings.billing.status]
    : copy.settings.billing.status.cancelled

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border-decorative bg-white px-4 py-3 shadow-sm">
      <span className="block text-2xl font-semibold tabular-nums text-text-primary">
        {children}
      </span>
      <span className="block text-sm text-text-secondary">{label}</span>
    </div>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      {children}
    </div>
  )
}

/** /admin (03 §4.10): companies, subscriptions, MRR, reports this week, the job queue. */
export async function AdminOverview({ search }: { search: Search }) {
  const page = await adminPage('overview', search)
  if ('done' in page) return page.done
  const h = await getRepositories().admin.health()
  const o = a.overview
  return page.frame(
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="admin-stats">
        <Stat label={o.tenants}>{h.tenants}</Stat>
        <Stat label={o.activeSubscriptions}>{h.activeSubscriptions}</Stat>
        <Stat label={o.mrr}>
          <Money value={h.mrr} />
        </Stat>
        <Stat label={o.reportsThisWeek}>{h.reportsThisWeek}</Stat>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={o.waiting}>{h.jobs.waiting}</Stat>
        <Stat label={o.running}>{h.jobs.running}</Stat>
        <Stat label={o.failed}>{h.jobs.failed}</Stat>
      </div>
      <section className="grid gap-1 rounded-lg border border-border-decorative bg-white p-4 shadow-sm">
        <h2 className="text-md font-semibold text-text-primary">{o.errors}</h2>
        <p className="text-sm text-text-secondary">{o.errorsDemo}</p>
      </section>
    </>,
  )
}

/** /admin/tenants: the list, searched by name or slug. */
export async function AdminTenants({ search }: { search: Search & { q?: string } }) {
  const page = await adminPage('tenants', search)
  if ('done' in page) return page.done
  const t = a.tenants
  const rows = page.forced === 'empty' ? [] : await getRepositories().admin.tenants(search.q)
  return page.frame(
    <>
      <form action="/admin/tenants" className="flex flex-wrap items-end gap-3">
        <FormField id="admin-q" label={t.search}>
          <Input {...fieldIds('admin-q')} name="q" defaultValue={search.q ?? ''} />
        </FormField>
        <Button type="submit" variant="secondary">
          {t.submit}
        </Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={Building2} title={t.empty} />
      ) : (
        <Frame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.company}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.plan}</TableHead>
                <TableHead className="text-right">{t.columns.projects}</TableHead>
                <TableHead>{t.columns.lastActivity}</TableHead>
                <TableHead>
                  <span className="sr-only">{t.open}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid="admin-tenant-row">
                  <TableCell id={`t-${r.id}`} className="font-semibold text-text-primary">
                    {r.legalName}
                    <span className="block font-mono text-xs font-normal text-text-secondary">
                      {r.slug}
                    </span>
                  </TableCell>
                  <TableCell>{status(r.status)}</TableCell>
                  <TableCell>{r.plan ? copy.settings.billing.price : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.activeProjects}</TableCell>
                  <TableCell>{r.lastActivity ? when(r.lastActivity) : ''}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/admin/tenants/${r.id}`} aria-describedby={`t-${r.id}`}>
                        {t.open}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Frame>
      )}
    </>,
  )
}

/** /admin/tenants/[id]: the company, and support access with a reason (11 §2). */
export async function AdminTenant({ id, search }: { id: string; search: Search }) {
  const page = await adminPage('tenants', search)
  if ('done' in page) return page.done
  const tenant = await getRepositories().admin.tenant(id, page.userId, await supportNow())
  if (!tenant) notFound()
  const t = a.tenant
  return page.frame(
    <>
      <section className="grid gap-2 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <h2 className="text-md font-semibold text-text-primary">{tenant.legalName}</h2>
        <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-secondary">{a.tenants.columns.status}</dt>
          <dd>{status(tenant.status)}</dd>
          <dt className="text-text-secondary">{t.owner}</dt>
          <dd>{tenant.owner ? `${tenant.owner.name} · ${tenant.owner.email}` : ''}</dd>
          <dt className="text-text-secondary">{t.members}</dt>
          <dd className="tabular-nums">{tenant.members}</dd>
          <dt className="text-text-secondary">{a.tenants.columns.projects}</dt>
          <dd className="tabular-nums">{tenant.activeProjects}</dd>
          <dt className="text-text-secondary">{t.created}</dt>
          <dd>{tenant.createdOn ? formatDate(tenant.createdOn) : ''}</dd>
        </dl>
      </section>
      {tenant.supportUntil ? (
        <p className="text-sm font-semibold text-warning-700">
          {fill(a.supportBanner, {
            Company: tenant.legalName,
            time: formatClock(tenant.supportUntil),
          })}
        </p>
      ) : (
        <SupportAccessForm tenantId={tenant.id} />
      )}
    </>,
  )
}

/** /admin/jobs: the queue, and "Retry" or "Discard" on a failed job. */
export async function AdminJobs({ search }: { search: Search }) {
  const page = await adminPage('jobs', search)
  if ('done' in page) return page.done
  const j = a.jobs
  const rows = page.forced === 'empty' ? [] : await getRepositories().admin.jobs()
  return page.frame(
    rows.length === 0 ? (
      <p className="text-sm text-text-secondary">{j.empty}</p>
    ) : (
      <Frame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{j.columns.queue}</TableHead>
              <TableHead>{j.columns.state}</TableHead>
              <TableHead>{j.columns.created}</TableHead>
              <TableHead>{j.columns.error}</TableHead>
              <TableHead>
                <span className="sr-only">{j.retry}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid="job-row">
                <TableCell id={`job-${r.id}`} className="font-mono text-xs">
                  {r.queue}
                </TableCell>
                <TableCell>{j.states[r.state]}</TableCell>
                <TableCell className="tabular-nums">{when(r.createdOn)}</TableCell>
                <TableCell className="whitespace-normal text-xs">{r.error}</TableCell>
                <TableCell className="text-right">
                  {r.state === 'failed' && <JobButtons jobId={r.id} describedBy={`job-${r.id}`} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Frame>
    ),
  )
}

/** /admin/wage-schedules: nothing reaches the companies before this approval. */
export async function AdminWageSchedules({ search }: { search: Search }) {
  const page = await adminPage('wageSchedules', search)
  if ('done' in page) return page.done
  const w = a.wageSchedules
  const rows = page.forced === 'empty' ? [] : await getRepositories().admin.wageSchedules()
  return page.frame(
    <>
      <p className="text-sm text-text-secondary">{w.note}</p>
      <Frame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{w.columns.prc}</TableHead>
              <TableHead>{w.columns.wd}</TableHead>
              <TableHead>{w.columns.fetched}</TableHead>
              <TableHead>{w.columns.status}</TableHead>
              <TableHead className="text-right">{w.columns.rates}</TableHead>
              <TableHead>
                <span className="sr-only">{w.approve}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid="schedule-row">
                <TableCell id={`ws-${r.id}`} className="font-mono text-xs">
                  {r.kind === 'ny_prc' ? r.reference : ''}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.kind === 'federal_wd' ? r.reference : ''}
                </TableCell>
                <TableCell className="tabular-nums">{when(r.fetchedAt)}</TableCell>
                <TableCell>{w.states[r.state]}</TableCell>
                <TableCell className="text-right tabular-nums">{r.rateCount}</TableCell>
                <TableCell className="text-right">
                  {r.state === 'needs_review' && (
                    <ApproveButton scheduleId={r.id} describedBy={`ws-${r.id}`} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Frame>
    </>,
  )
}

/** /admin/classifications: the seed list, its version, the changes on the official page. */
export async function AdminClassifications({ search }: { search: Search }) {
  const page = await adminPage('classifications', search)
  if ('done' in page) return page.done
  const c = a.classifications
  const dto = await getRepositories().admin.classifications()
  const same = page.forced === 'empty' || (dto.added.length === 0 && dto.removed.length === 0)
  return page.frame(
    <>
      <section className="grid gap-1 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <h2 className="text-md font-semibold text-text-primary">{c.title}</h2>
        <p className="text-sm text-text-secondary">
          {fill(c.version, { version: dto.version })} · {count(c, 'count', dto.count)}
        </p>
      </section>
      <section className="grid gap-2 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <h2 className="text-md font-semibold text-text-primary">{c.changes}</h2>
        {same ? (
          <p className="text-sm text-text-secondary">{c.same}</p>
        ) : (
          <dl
            className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm"
            data-testid="catalog-diff"
          >
            {dto.added.map((name) => (
              <div key={`a-${name}`} className="contents">
                <dt className="font-semibold text-success-600">{c.added}</dt>
                <dd>{name}</dd>
              </div>
            ))}
            {dto.removed.map((name) => (
              <div key={`r-${name}`} className="contents">
                <dt className="font-semibold text-error-600">{c.removed}</dt>
                <dd>{name}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>,
  )
}
