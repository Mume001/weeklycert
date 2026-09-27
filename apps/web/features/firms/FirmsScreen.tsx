import { copy, count, fill } from '@wc/copy'
import { type FirmNextDTO, getRepositories, type TenantBrief } from '@wc/data'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { EmptyState } from '@/components/patterns/EmptyState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { mockSession } from '@/lib/session'

const t = copy.firms

type Firm = TenantBrief & { next: FirmNextDTO }

/** No deadline at all goes last; otherwise the nearest deadline first (03 §4.2). */
export function byNearestDeadline(a: Firm, b: Firm): number {
  if (!a.next || !b.next) return a.next ? -1 : b.next ? 1 : a.name.localeCompare(b.name)
  return a.next.dueOn.localeCompare(b.next.dueOn) || a.name.localeCompare(b.name)
}

/**
 * /firms (spec/03 §4.2): the start screen of a bookkeeper and of anyone with
 * more than one company. One card per company, the nearest deadline first.
 * Opening a card opens that company's dashboard, which makes it the active one.
 */
export async function FirmsScreen({ search }: { search: { state?: string } }) {
  const forced = screenState(search.state)
  const frame = (body: ReactNode) => (
    <main className="mx-auto grid w-full max-w-[960px] gap-4 px-4 py-8 sm:px-6">
      <h1 className="text-lg font-semibold text-text-primary">{copy.shell.tenantSwitcher.title}</h1>
      {body}
    </main>
  )
  if (forced === 'loading') return frame(<LoadingTable columns={3} rows={3} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const { userId } = await mockSession()
  const repos = getRepositories()
  const tenants = forced === 'empty' ? [] : await repos.tenants.listForUser(userId)
  const firms: Firm[] = (
    await Promise.all(
      tenants.map(async (tenant) => ({
        ...tenant,
        next: await repos.dashboard.firmNext(tenant.id),
      })),
    )
  ).sort(byNearestDeadline)

  if (firms.length === 0) return frame(<EmptyState icon={Building2} title={t.empty} />)

  return frame(
    <ul className="grid gap-3">
      {firms.map((firm) => (
        <li
          key={firm.id}
          data-testid="firm-card"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border-decorative bg-white px-5 py-4 shadow-sm"
        >
          <div className="min-w-[12rem] flex-1">
            <h2 className="text-md font-semibold text-text-primary">{firm.name}</h2>
            <p className="text-sm text-text-secondary">
              {count(copy.shell.tenantSwitcher, 'subtitle', firm.activeProjects, {
                Role: copy.roles[firm.role].label,
              })}
            </p>
          </div>
          <dl className="grid min-w-[14rem] flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-text-secondary">{t.nextDeadline}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {firm.next ? (
                <>
                  <span>
                    {fill(t.deadlineOf, {
                      Project: firm.next.projectName,
                      date: formatDate(firm.next.dueOn),
                    })}
                  </span>
                  <DeadlineBadge daysLeft={firm.next.daysLeft} level={firm.next.level} />
                </>
              ) : (
                <span className="text-text-secondary">{copy.projects.list.noFilingDue}</span>
              )}
            </dd>
            {firm.next?.weekStatus && (
              <>
                <dt className="text-text-secondary">{t.currentWeek}</dt>
                <dd>
                  <StatusBadge status={firm.next.weekStatus} />
                </dd>
              </>
            )}
          </dl>
          <Button asChild>
            <Link href={`/app/${firm.slug}/dashboard`} prefetch={false}>
              {t.open}
            </Link>
          </Button>
        </li>
      ))}
    </ul>,
  )
}
