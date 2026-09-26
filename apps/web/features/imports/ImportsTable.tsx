'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, fill } from '@wc/copy'
import type { ImportBatchDTO } from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'
import { Button } from '@/components/ui/button'

const t = copy.imports

/** The import history (spec/03 §4.7): when, who, the file, what, and whether it can be undone. */
export function ImportsTable({
  slug,
  rows,
  empty,
}: {
  slug: string
  rows: ImportBatchDTO[]
  empty: ReactNode
}) {
  const router = useRouter()
  const href = (id: string) => `/app/${slug}/imports/${id}`
  const columns: ColumnDef<ImportBatchDTO, unknown>[] = [
    {
      id: 'when',
      header: t.history.columns.when,
      cell: ({ row }) => <DateText value={row.original.createdAt.slice(0, 10)} />,
    },
    {
      id: 'file',
      header: t.history.columns.file,
      cell: ({ row }) => (
        <span className="flex flex-col leading-tight">
          <Link
            href={href(row.original.id)}
            className="rounded-sm font-semibold text-text-primary hover:underline focus-visible:focus-ring"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.fileName}
          </Link>
          <span className="text-xs text-text-secondary">
            {fill(t.history.by, { Name: row.original.createdBy })}
          </span>
        </span>
      ),
    },
    {
      id: 'what',
      header: t.history.columns.what,
      cell: ({ row }) => (
        <span className="flex flex-col leading-tight">
          {t.kinds[row.original.kind].label}
          <span className="text-xs text-text-secondary">{t.sources[row.original.source]}</span>
        </span>
      ),
    },
    {
      id: 'week',
      header: t.history.columns.weekEnding,
      cell: ({ row }) =>
        row.original.weekEnding ? (
          <span className="flex flex-col leading-tight">
            <DateText value={row.original.weekEnding} />
            <span className="text-xs text-text-secondary">{row.original.project?.name}</span>
          </span>
        ) : (
          <span className="text-text-secondary">{t.history.noWeek}</span>
        ),
    },
    {
      id: 'rows',
      header: t.history.columns.rows,
      meta: { align: 'right' },
      cell: ({ row }) => row.original.rowsTotal,
    },
    {
      id: 'status',
      header: t.history.columns.status,
      cell: ({ row }) => t.status[row.original.status],
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t.history.columns.actions}</span>,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Button asChild size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
          <Link href={href(row.original.id)}>{t.history.open}</Link>
        </Button>
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
