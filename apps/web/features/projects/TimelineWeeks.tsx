'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, count, fill } from '@wc/copy'
import type { TimelineWeek } from '@wc/data/dto'
import { cn } from 'cn'
import { CircleDashed, CircleMinus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'
import { Hours } from '@/components/patterns/Hours'
import { Money } from '@/components/patterns/Money'
import { STATUS_STYLE, StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDayMonth } from '@/lib/format'
import { markNoWorkAction } from './actions'

const t = copy.projects.timeline

export interface TimelineWeeksProps {
  slug: string
  projectId: string
  /** Newest first, every week since the start (spec/03 §4.4). */
  weeks: TimelineWeek[]
  canWrite: boolean
}

/** What a week is, in words: the badge, or the two states that have no badge. */
function weekWord(w: TimelineWeek): string {
  if (w.isNoWork) return t.noWork
  if (w.noEntries || !w.displayStatus) return t.noEntries
  return copy.status[w.displayStatus]
}

function tileStyle(w: TimelineWeek): { icon: LucideIcon | null; className: string } {
  // A week without a single hour is the gap the timeline exists to show: dashed, never hidden.
  if (w.noEntries)
    return { icon: CircleDashed, className: 'border-dashed border-n-450 bg-white text-n-700' }
  if (w.isNoWork) return { icon: CircleMinus, className: 'border-n-300 bg-n-100 text-n-700' }
  if (!w.displayStatus) return { icon: null, className: 'border-n-300 bg-white text-n-700' }
  return STATUS_STYLE[w.displayStatus]
}

function findingsText(w: TimelineWeek): string {
  return [
    w.findings.hard > 0 ? count(copy.grid, 'errors', w.findings.hard) : '',
    w.findings.soft > 0 ? count(copy.grid, 'warnings', w.findings.soft) : '',
  ]
    .filter(Boolean)
    .join(', ')
}

function MarkNoWork({
  slug,
  projectId,
  weekEnding,
}: {
  slug: string
  projectId: string
  weekEnding: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation()
        start(async () => {
          await markNoWorkAction(slug, projectId, weekEnding)
          router.refresh()
        })
      }}
    >
      {t.markNoWork}
    </Button>
  )
}

/**
 * The strip of every week, oldest left, and the table under it (spec/03 §4.4).
 * Nothing is left out: a week without a single entry is its own dashed tile and
 * its own row, so a skipped week cannot go unseen.
 */
export function TimelineWeeks({ slug, projectId, weeks, canWrite }: TimelineWeeksProps) {
  const router = useRouter()
  const weekHref = (w: TimelineWeek) => `/app/${slug}/projects/${projectId}/weeks/${w.weekEnding}`
  const newest = weeks[0]?.weekEnding

  const columns: ColumnDef<TimelineWeek, unknown>[] = [
    {
      id: 'payrollNo',
      header: t.columns.payrollNo,
      cell: ({ row }) =>
        row.original.payrollNumber !== null ? (
          <span className="font-semibold tabular-nums">{row.original.payrollNumber}</span>
        ) : row.original.expectedPayrollNumber !== null ? (
          <span className="text-text-secondary">
            {fill(t.willBe, { n: row.original.expectedPayrollNumber })}
          </span>
        ) : null,
    },
    {
      id: 'weekEnding',
      header: t.columns.weekEnding,
      // The date is the link that opens the week: one action fewer per row, so
      // the table fits at 1280 px. Its name says what it does (spec/15 §3).
      cell: ({ row }) => (
        <Link
          href={weekHref(row.original)}
          aria-label={fill(t.openWeekLabel, { date: formatDate(row.original.weekEnding) })}
          className="rounded-sm font-medium text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
          onClick={(e) => e.stopPropagation()}
        >
          <DateText value={row.original.weekEnding} />
        </Link>
      ),
    },
    {
      id: 'status',
      header: t.columns.status,
      cell: ({ row }) => {
        const w = row.original
        if (w.displayStatus && !w.noEntries && !w.isNoWork)
          return <StatusBadge status={w.displayStatus} />
        return (
          <span
            className={cn(
              'inline-flex h-[22px] items-center rounded-full border px-2 text-2xs font-semibold',
              w.isNoWork
                ? 'border-n-300 bg-n-100 text-n-700'
                : 'border-dashed border-n-450 text-n-700',
            )}
          >
            {weekWord(w)}
          </span>
        )
      },
    },
    {
      id: 'workers',
      header: t.columns.workers,
      meta: { align: 'right' },
      cell: ({ row }) => (row.original.noEntries ? null : row.original.workerCount),
    },
    {
      id: 'hours',
      header: t.columns.hours,
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.totalHours === null || row.original.noEntries ? null : (
          <Hours value={row.original.totalHours} />
        ),
    },
    {
      id: 'gross',
      header: t.columns.gross,
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.gross === null || row.original.noEntries ? null : (
          <Money value={row.original.gross} />
        ),
    },
    {
      id: 'findings',
      header: t.columns.findings,
      cell: ({ row }) => {
        const text = findingsText(row.original)
        return text ? (
          <span
            className={cn(
              'text-sm',
              row.original.findings.hard > 0 && 'font-semibold text-error-600',
            )}
          >
            {text}
          </span>
        ) : null
      },
    },
    {
      id: 'version',
      header: t.columns.version,
      cell: ({ row }) =>
        row.original.locked ? fill(t.version, { n: row.original.versions }) : null,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t.columns.actions}</span>,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const w = row.original
        return (
          <span className="inline-flex justify-end gap-1.5">
            {canWrite && !w.locked && w.noEntries && (
              <MarkNoWork slug={slug} projectId={projectId} weekEnding={w.weekEnding} />
            )}
            {w.locked && (
              <Button asChild size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                {/* Reports are a screen of their own session; no prefetch until it exists. */}
                <Link href={`${weekHref(w)}/reports`} prefetch={false}>
                  {copy.buttons.download}
                </Link>
              </Button>
            )}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1.5">
        {[...weeks].reverse().map((w) => {
          const { icon: Icon, className } = tileStyle(w)
          return (
            <li key={w.weekEnding}>
              <Link
                href={weekHref(w)}
                aria-label={fill(t.tileLabel, {
                  date: formatDate(w.weekEnding),
                  status: weekWord(w),
                })}
                title={weekWord(w)}
                className={cn(
                  'flex h-12 flex-col items-center justify-center gap-px rounded-md border text-xs font-semibold tabular-nums shadow-sm focus-visible:focus-ring',
                  className,
                  w.weekEnding === newest && 'outline-2 outline-offset-1 outline-brand',
                )}
              >
                <span className="flex items-center gap-1">
                  {Icon && <Icon className="size-3" strokeWidth={2.25} aria-hidden="true" />}
                  {w.payrollNumber}
                </span>
                <span className="text-2xs font-normal">{formatDayMonth(w.weekEnding)}</span>
              </Link>
            </li>
          )
        })}
      </ol>
      <DataTable
        columns={columns}
        data={weeks}
        empty={null}
        getRowId={(w) => w.weekEnding}
        onRowClick={(w) => router.push(weekHref(w))}
      />
    </>
  )
}
