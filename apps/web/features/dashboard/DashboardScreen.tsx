import { copy, count, fill, plural } from '@wc/copy'
import { lastEndedWeekEnding, STATE_GRACE_DAYS } from '@wc/core'
import { type DashboardDTO, getRepositories } from '@wc/data'
import { cn } from 'cn'
import { Rocket } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { DateText } from '@/components/patterns/DateText'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { EmptyState } from '@/components/patterns/EmptyState'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { dateParts, formatDayMonth } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { readOnlyTitle } from '@/lib/subscription'

const t = copy.dashboard

/** A section of the page: a white card with a heading row (dizajn/aplikacija.html, .card). */
function Card({
  title,
  meta,
  children,
  className,
}: {
  title: string
  meta?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'min-w-0 overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-decorative px-4 py-3">
        <h2 className="text-md font-semibold text-text-primary">{title}</h2>
        {meta && <span className="text-xs text-text-secondary">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-text-secondary">{children}</p>
}

/** One of the four numbers at the top; the signature one leads to the sign screen (02 §5). */
function Stat({
  n,
  label,
  tone,
  href,
}: {
  n: number
  label: string
  tone: 'error' | 'warning' | 'neutral' | 'success'
  href?: string
}) {
  const body = (
    <>
      <span
        className={cn(
          'block text-2xl font-semibold tabular-nums',
          n > 0 && tone === 'error' && 'text-error-600',
          n > 0 && tone === 'warning' && 'text-warning-700',
          tone === 'success' && 'text-success-600',
          (n === 0 || tone === 'neutral') && tone !== 'success' && 'text-text-primary',
        )}
      >
        {n}
      </span>
      <span className="block text-sm text-text-secondary">{label}</span>
    </>
  )
  const box = 'rounded-lg border border-border-decorative bg-white px-4 py-3 shadow-sm'
  return href ? (
    <Link
      href={href}
      className={cn(box, 'hover:bg-n-50 focus-visible:focus-ring', 'underline-offset-2')}
    >
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  )
}

/**
 * /app/[t]/dashboard (spec/03 §4.3): "what is on fire this week", in three
 * seconds. The deadlines on top, then the weeks to close, the WH-347 of the
 * federal projects, the weeks with no entry, the recent reports and the data
 * health. Every day is counted from the mock's today (spec/19 §4).
 */
export async function DashboardScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string }
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)

  const today = dateParts(shell.today)
  const current = lastEndedWeekEnding(shell.today, shell.tenant.weekEndsOn)
  const week = dateParts(current)
  const app = `/app/${slug}`
  const weekHref = (projectId: string, weekEnding: string) =>
    `${app}/projects/${projectId}/weeks/${weekEnding}`

  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={fill(t.title, { Weekday: today.weekday, Month: today.month, D: today.day })}
        meta={fill(t.subtitle, {
          WeekEndDay: week.weekdayShort,
          Month: week.monthShort,
          D: week.day,
        })}
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
        dashboardHref={`${app}/dashboard`}
      />,
    )
  }
  if (forced === 'loading') return frame(<LoadingTable columns={6} rows={6} />)
  if (forced === 'error') return frame(<RetryErrorState />)

  const data: DashboardDTO = await getRepositories().dashboard.get(shell.tenant.id)

  if (forced === 'empty' || data.isNew) {
    return frame(
      <EmptyState
        icon={Rocket}
        title={t.startHere.title}
        body={t.startHere.body}
        action={
          <Button asChild>
            <Link href={`${app}/onboarding`}>{t.startHere.action}</Link>
          </Button>
        }
      />,
    )
  }

  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const writer = PROJECT_WRITERS.includes(shell.role) && !paused
  const late = data.deadlines.filter((d) => d.level !== 'ok')
  const firstToSign = data.signatureQueue[0]

  return frame(
    <>
      {paused && <Notice tone="info" title={readOnlyTitle(shell.tenant)} />}
      {late.map((d) => (
        <Notice
          key={d.projectId}
          tone="error"
          title={count(t.late, 'title', -d.daysLeft, { Project: d.projectName })}
        >
          {d.level === 'penalty'
            ? t.late.penalty
            : count(t.late, 'grace', STATE_GRACE_DAYS + d.daysLeft)}
        </Notice>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          n={data.cards.projectsPastDeadline}
          label={plural(t.cards, 'pastDeadline', data.cards.projectsPastDeadline)}
          tone="error"
        />
        <Stat
          n={data.cards.weeksWaitingForHours}
          label={plural(t.cards, 'waitingForHours', data.cards.weeksWaitingForHours)}
          tone="warning"
        />
        <Stat
          n={data.cards.reportsWaitingForSignature}
          label={plural(t.cards, 'waitingForSignature', data.cards.reportsWaitingForSignature)}
          tone="neutral"
          href={
            firstToSign && shell.canSign && !paused
              ? `${weekHref(firstToSign.projectId, firstToSign.weekEnding)}/sign`
              : undefined
          }
        />
        <Stat
          n={data.cards.filingsAcceptedThisYear}
          label={plural(t.cards, 'acceptedThisYear', data.cards.filingsAcceptedThisYear)}
          tone="success"
        />
      </div>

      <Card title={t.deadlines.title} meta={t.deadlines.subtitle}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.deadlineTable.columns.project}</TableHead>
              <TableHead>{t.deadlineTable.columns.prc}</TableHead>
              <TableHead>{t.deadlineTable.columns.lastAccepted}</TableHead>
              <TableHead>{t.deadlineTable.columns.deadline}</TableHead>
              <TableHead>{t.deadlineTable.columns.status}</TableHead>
              <TableHead>{t.deadlineTable.columns.unfiled}</TableHead>
              <TableHead>
                <span className="sr-only">{t.deadlineTable.open}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.deadlines.map((d) => (
              <TableRow key={d.projectId} data-testid="deadline-row">
                <TableCell className="font-semibold text-text-primary">{d.projectName}</TableCell>
                <TableCell className="font-mono text-xs">{d.prcNumber}</TableCell>
                <TableCell>
                  {d.lastAcceptedAt ? (
                    <DateText value={d.lastAcceptedAt} />
                  ) : (
                    <span className="text-text-secondary">{t.deadlineTable.noneYet}</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  <DateText value={d.dueOn} />
                </TableCell>
                <TableCell>
                  <span className="flex flex-col items-start gap-0.5">
                    <DeadlineBadge daysLeft={d.daysLeft} level={d.level} />
                    {d.level === 'penalty' && (
                      <span className="text-xs font-semibold text-error-700">
                        {t.deadlineTable.penaltyPossible}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="tabular-nums">{d.unfiledWeeks.length}</span>
                  {d.unfiledWeeks.length > 0 && (
                    <span className="block text-xs text-text-secondary">
                      {d.unfiledWeeks.map(formatDayMonth).join(', ')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant={d.level === 'ok' ? 'secondary' : 'default'}>
                    <Link href={`${app}/projects/${d.projectId}`}>{t.deadlineTable.open}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title={t.openWeeks.title} meta={count(t.openWeeks, 'meta', data.openWeeks.length)}>
          {data.openWeeks.length === 0 ? (
            <Quiet>{t.openWeeks.empty}</Quiet>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.openWeeks.columns.weekEnding}</TableHead>
                  <TableHead>{t.openWeeks.columns.project}</TableHead>
                  <TableHead>{t.openWeeks.columns.status}</TableHead>
                  <TableHead>{t.openWeeks.columns.findings}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t.openWeeks.open}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.openWeeks.map((w) => (
                  <TableRow key={`${w.projectId}-${w.weekEnding}`} data-testid="open-week-row">
                    <TableCell className="tabular-nums">{formatDayMonth(w.weekEnding)}</TableCell>
                    <TableCell className="whitespace-normal">{w.projectName}</TableCell>
                    <TableCell>
                      {w.noEntries || !w.displayStatus ? (
                        <span className="inline-flex h-[22px] items-center rounded-full border border-dashed border-n-450 px-2 text-2xs font-semibold text-n-700">
                          {t.openWeeks.noHours}
                        </span>
                      ) : (
                        <StatusBadge status={w.displayStatus} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal">
                      {w.hard > 0 && (
                        <span className="mr-2 font-semibold text-error-600">
                          {count(copy.grid, 'errors', w.hard)}
                        </span>
                      )}
                      {w.soft > 0 && (
                        <span className="font-semibold text-warning-700">
                          {count(copy.grid, 'warnings', w.soft)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={weekHref(w.projectId, w.weekEnding)}>{t.openWeeks.open}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="grid content-start gap-4">
          {data.federal.length > 0 && (
            <Card title={t.federal.title} meta={t.federal.subtitle}>
              <ul className="divide-y divide-border-decorative">
                {data.federal.map((f) => (
                  <li
                    key={`${f.projectId}-${f.weekEnding}`}
                    data-testid="federal-row"
                    className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-text-primary">{f.projectName}</span>
                      <span className="block text-xs text-text-secondary">
                        {fill(t.federal.row, {
                          week: formatDayMonth(f.weekEnding),
                          payDate: formatDayMonth(f.payDate),
                        })}
                      </span>
                      <span className="block text-xs text-text-secondary">
                        {f.payDateSource === 'week' ? t.federal.fromWeek : t.federal.fromCompany}
                      </span>
                    </span>
                    <DeadlineBadge daysLeft={f.daysLeft} level={f.daysLeft < 0 ? 'late' : 'ok'} />
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`${weekHref(f.projectId, f.weekEnding)}/review`}>
                        {t.federal.review}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title={t.missing.title}
            meta={fill(t.missing.subtitle, { date: formatDayMonth(current) })}
          >
            {data.missingWeeks.length === 0 ? (
              <Quiet>{t.missing.empty}</Quiet>
            ) : (
              <ul className="divide-y divide-border-decorative">
                {data.missingWeeks.map((m) => (
                  <li
                    key={m.projectId}
                    data-testid="missing-row"
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0 flex-1 text-text-primary">{m.projectName}</span>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={weekHref(m.projectId, m.weekEnding)}>
                        {writer ? t.missing.enterHours : t.openWeeks.open}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t.health.title}>
            {data.healthIssues.length === 0 ? (
              <Quiet>{t.health.empty}</Quiet>
            ) : (
              <ul className="divide-y divide-border-decorative">
                {data.healthIssues.map((h) => (
                  <li key={h.kind} data-testid="health-row" className="px-4 py-2.5 text-sm">
                    <Link
                      href={
                        h.kind === 'worker_no_classification' ||
                        h.kind === 'apprentice_unregistered'
                          ? `${app}/workers`
                          : `${app}/projects`
                      }
                      className="rounded-sm text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
                    >
                      {fill(plural(t.health, h.kind, h.count), { n: h.count })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title={t.recent.title}>
        {data.recentReports.length === 0 ? (
          <Quiet>{t.recent.empty}</Quiet>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.recent.columns.project}</TableHead>
                <TableHead>{t.recent.columns.weekEnding}</TableHead>
                <TableHead>{t.recent.columns.version}</TableHead>
                <TableHead>{t.recent.columns.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentReports.map((r) => (
                <TableRow key={r.reportId} data-testid="recent-row">
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`${weekHref(r.projectId, r.weekEnding)}/reports`}
                      className="rounded-sm text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
                    >
                      {r.projectName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <DateText value={r.weekEnding} />
                  </TableCell>
                  <TableCell>{fill(copy.projects.timeline.version, { n: r.version })}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>,
  )
}
