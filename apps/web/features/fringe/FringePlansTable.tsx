'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, fill } from '@wc/copy'
import type { FringePlanDTO } from '@wc/data/dto'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { Button } from '@/components/ui/button'

const t = copy.fringe

export function FringePlansTable({
  slug,
  plans,
  canEdit,
  empty,
}: {
  slug: string
  plans: FringePlanDTO[]
  canEdit: boolean
  empty: ReactNode
}) {
  const router = useRouter()
  const href = (id: string) => `/app/${slug}/fringe-plans?plan=${id}`
  const columns: ColumnDef<FringePlanDTO, unknown>[] = [
    {
      id: 'plan',
      header: t.columns.plan,
      cell: ({ row }) => (
        <Link
          href={href(row.original.id)}
          className="rounded-sm font-semibold text-text-primary hover:underline focus-visible:focus-ring"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    { id: 'kind', header: t.columns.kind, cell: ({ row }) => t.kinds[row.original.kind] },
    {
      id: 'funding',
      header: t.columns.funding,
      cell: ({ row }) => t.funding[row.original.funding],
    },
    {
      id: 'planNumber',
      header: t.columns.planNumber,
      cell: ({ row }) =>
        row.original.planNumber ?? <span className="text-text-secondary">{t.notSet}</span>,
    },
    {
      id: 'annualized',
      header: t.columns.annualized,
      cell: ({ row }) => (row.original.annualize ? t.yes : t.no),
    },
    {
      id: 'workers',
      header: t.columns.workers,
      meta: { align: 'right' },
      cell: ({ row }) => row.original.workerCount,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t.columns.actions}</span>,
      meta: { align: 'right' },
      cell: ({ row }) =>
        canEdit && (
          <Button asChild size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
            <Link
              href={href(row.original.id)}
              aria-label={fill(t.form.editTitle, { Plan: row.original.name })}
            >
              {t.edit}
            </Link>
          </Button>
        ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={plans}
      empty={empty}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(href(row.id))}
    />
  )
}
