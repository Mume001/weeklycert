'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy } from '@wc/copy'
import type { WorkerNameDTO, WorkerRowDTO } from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'

const t = copy.workers.list

function NameCell({ href, name, sub }: { href: string; name: string; sub?: string | null }) {
  return (
    <span className="flex flex-col leading-tight">
      <Link
        href={href}
        className="rounded-sm font-semibold text-text-primary hover:underline focus-visible:focus-ring"
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </Link>
      {sub && <span className="font-mono text-xs text-text-secondary tabular-nums">{sub}</span>}
    </span>
  )
}

const classification = (c: { name: string } | null) =>
  c ? c.name : <span className="text-text-secondary">{t.notSet}</span>

/**
 * /workers for the roles that may read more than a name (spec/03 §4.6). No
 * address and no SSN: the DTO does not carry them, so they cannot leak here.
 */
export function WorkersTable({
  slug,
  rows,
  empty,
}: {
  slug: string
  rows: WorkerRowDTO[]
  empty: ReactNode
}) {
  const router = useRouter()
  const href = (id: string) => `/app/${slug}/workers/${id}`
  const columns: ColumnDef<WorkerRowDTO, unknown>[] = [
    {
      id: 'worker',
      header: t.columns.worker,
      // The worker number sits under the name, like the awarding body under a project.
      cell: ({ row }) => (
        <NameCell
          href={href(row.original.id)}
          name={row.original.displayName}
          sub={row.original.workerNumber}
        />
      ),
    },
    {
      id: 'classification',
      header: t.columns.classification,
      cell: ({ row }) => classification(row.original.defaultClassification),
    },
    {
      id: 'level',
      header: t.columns.level,
      cell: ({ row }) => {
        const level = copy.workers.levels[row.original.level]
        return (
          <abbr
            title={level.label}
            className="inline-flex h-[22px] items-center rounded-full border border-border-decorative bg-n-50 px-2 text-2xs font-semibold text-n-800 no-underline"
          >
            {level.short}
          </abbr>
        )
      },
    },
    {
      id: 'projects',
      header: t.columns.projects,
      cell: ({ row }) =>
        row.original.projects.length === 0 ? (
          <span className="text-text-secondary">{t.noProjects}</span>
        ) : (
          row.original.projects.map((p) => p.name).join(', ')
        ),
    },
    {
      id: 'status',
      header: t.columns.status,
      cell: ({ row }) => copy.workers.status[row.original.status],
    },
    {
      id: 'lastWeek',
      header: t.columns.lastWeek,
      cell: ({ row }) =>
        row.original.lastWeekWithHours ? (
          <DateText value={row.original.lastWeekWithHours} />
        ) : (
          <span className="text-text-secondary">{t.noHours}</span>
        ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      empty={empty}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(href(row.id))}
    />
  )
}

/** The viewer's list: the name and the classification, nothing else (spec/02 §3). */
export function WorkerNamesTable({
  slug,
  rows,
  empty,
}: {
  slug: string
  rows: WorkerNameDTO[]
  empty: ReactNode
}) {
  const router = useRouter()
  const href = (id: string) => `/app/${slug}/workers/${id}`
  const columns: ColumnDef<WorkerNameDTO, unknown>[] = [
    {
      id: 'worker',
      header: t.columns.worker,
      cell: ({ row }) => <NameCell href={href(row.original.id)} name={row.original.displayName} />,
    },
    {
      id: 'classification',
      header: t.columns.classification,
      cell: ({ row }) => classification(row.original.defaultClassification),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowHeight={40}
      empty={empty}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(href(row.id))}
    />
  )
}
