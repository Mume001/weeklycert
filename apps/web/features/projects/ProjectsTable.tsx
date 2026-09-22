'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, count } from '@wc/copy'
import { daysBetween } from '@wc/core'
import type { IsoDate, ProjectRowDTO, WeekRef } from '@wc/data/dto'
import { cn } from 'cn'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'

const t = copy.projects.list

export interface ProjectsTableProps {
  slug: string
  rows: ProjectRowDTO[]
  today: IsoDate
  /** ?open=1: the week column is the oldest open week, and a click opens it (spec/03 §4.4). */
  openMode: boolean
  /** The viewer reads; it gets no "Enter hours" (spec/02 §3). */
  canEnterHours: boolean
  empty: ReactNode
}

/** "12 days left", "due today", "3 days late" (spec/15 §3 dashboard statuses). */
export function DeadlineText({ date, today }: { date: IsoDate | null; today: IsoDate }) {
  if (date === null) return <span className="text-text-secondary">{t.noFilingDue}</span>
  const left = daysBetween(today, date)
  const status =
    left === 0
      ? copy.dashboard.deadlines.dueToday
      : left > 0
        ? count(copy.dashboard.deadlines, 'daysLeft', left)
        : count(copy.dashboard.deadlines, 'daysLate', -left)
  return (
    <span className="flex flex-col leading-tight">
      <DateText value={date} />
      <span
        className={cn('text-xs', left < 0 ? 'font-semibold text-error-600' : 'text-text-secondary')}
      >
        {status}
      </span>
    </span>
  )
}

/** A week: its badge and its date, or "No entries" when not one hour is in it. */
export function WeekCell({ week }: { week: WeekRef | null }) {
  if (week === null) return <span className="text-text-secondary">{t.noWeeksYet}</span>
  return (
    <span className="flex flex-col items-start gap-0.5 py-1 text-xs">
      {week.displayStatus && !week.noEntries ? (
        <StatusBadge status={week.displayStatus} />
      ) : (
        <span className="inline-flex h-[22px] items-center rounded-full border border-dashed border-n-450 px-2 text-2xs font-semibold text-n-700">
          {t.noEntries}
        </span>
      )}
      <DateText value={week.weekEnding} />
    </span>
  )
}

export function ProjectsTable({
  slug,
  rows,
  today,
  openMode,
  canEnterHours,
  empty,
}: ProjectsTableProps) {
  const router = useRouter()
  const base = `/app/${slug}/projects`
  const gridHref = (row: ProjectRowDTO) =>
    row.oldestOpenWeek ? `${base}/${row.id}/weeks/${row.oldestOpenWeek.weekEnding}` : null
  const rowHref = (row: ProjectRowDTO) => (openMode && gridHref(row)) || `${base}/${row.id}`

  const columns: ColumnDef<ProjectRowDTO, unknown>[] = [
    {
      id: 'project',
      header: t.columns.project,
      // The awarding body sits under the name, like the classification under a
      // worker in the grid: one column fewer, and the table fits at 1440 px.
      cell: ({ row }) => (
        <span className="flex flex-col leading-tight">
          <Link
            href={rowHref(row.original)}
            className="rounded-sm font-semibold text-text-primary hover:underline focus-visible:focus-ring"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
          {row.original.awardingBody && (
            <span className="text-xs text-text-secondary">{row.original.awardingBody}</span>
          )}
        </span>
      ),
    },
    {
      id: 'prc',
      header: t.columns.prc,
      cell: ({ row }) =>
        row.original.prcNumber ? (
          <span className="font-mono tabular-nums">{row.original.prcNumber}</span>
        ) : (
          <span className="text-text-secondary">{t.notSet}</span>
        ),
    },
    {
      id: 'ourRole',
      header: t.columns.ourRole,
      cell: ({ row }) => copy.projects.roles[row.original.ourRole],
    },
    {
      id: 'nextDeadline',
      header: t.columns.nextDeadline,
      cell: ({ row }) => <DeadlineText date={row.original.nextDeadline} today={today} />,
    },
    {
      id: 'week',
      header: openMode ? copy.projectsOpen.oldestOpenWeek : t.columns.weekInProgress,
      cell: ({ row }) => (
        <WeekCell week={openMode ? row.original.oldestOpenWeek : row.original.currentWeek} />
      ),
    },
    {
      id: 'openFindings',
      header: t.columns.openFindings,
      meta: { align: 'right' },
      cell: ({ row }) => row.original.openFindings,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t.columns.actions}</span>,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const href = gridHref(row.original)
        if (!canEnterHours || !href) return null
        return (
          <Button asChild size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
            <Link href={href}>{t.enterHours}</Link>
          </Button>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      empty={empty}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(rowHref(row))}
    />
  )
}
