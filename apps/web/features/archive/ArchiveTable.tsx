'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { copy, fill } from '@wc/copy'
import type { ArchiveRowDTO } from '@wc/data/dto'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DataTable } from '@/components/patterns/DataTable'
import { DateText } from '@/components/patterns/DateText'
import { StatusBadge } from '@/components/patterns/StatusBadge'

const t = copy.archive

/**
 * The archive table (spec/03 §4.8): project, week, version, status, who signed,
 * when it was submitted, and the files. The PRC under a project is one click to
 * everything filed for it. `downloads` is false for the viewer, who sees
 * addresses only in the PDF (spec/02 §2); the mock has no PDF yet.
 */
export function ArchiveTable({
  slug,
  rows,
  downloads,
  empty,
}: {
  slug: string
  rows: ArchiveRowDTO[]
  downloads: boolean
  empty: ReactNode
}) {
  const base = `/app/${slug}/archive`
  const columns: ColumnDef<ArchiveRowDTO, unknown>[] = [
    {
      id: 'project',
      header: t.columns.project,
      cell: ({ row }) => (
        <span className="flex min-w-[10rem] flex-col leading-tight whitespace-normal">
          <span className="font-semibold text-text-primary">{row.original.projectName}</span>
          {row.original.prcNumber && (
            <Link
              href={`${base}?query=${row.original.prcNumber}`}
              aria-label={fill(t.everythingFor, { prc: row.original.prcNumber })}
              className="rounded-sm font-mono text-xs text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
            >
              {row.original.prcNumber}
            </Link>
          )}
        </span>
      ),
    },
    {
      id: 'week',
      header: t.columns.weekEnding,
      cell: ({ row }) => <DateText value={row.original.weekEnding} />,
    },
    {
      id: 'payrollNo',
      header: t.columns.payrollNo,
      meta: { align: 'right' },
      cell: ({ row }) => row.original.payrollNumber,
    },
    {
      id: 'version',
      header: t.columns.version,
      cell: ({ row }) => fill(copy.projects.timeline.version, { n: row.original.version }),
    },
    {
      id: 'status',
      header: t.columns.status,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'signedBy',
      header: t.columns.signedBy,
      cell: ({ row }) => row.original.signerName,
    },
    {
      id: 'submitted',
      header: t.columns.submitted,
      cell: ({ row }) =>
        row.original.submittedAt ? (
          <span className="flex flex-col leading-tight">
            <DateText value={row.original.submittedAt.slice(0, 10)} />
            {row.original.confirmationRef && (
              <span className="text-xs text-text-secondary">
                {fill(t.confirmation, { ref: row.original.confirmationRef })}
              </span>
            )}
          </span>
        ) : (
          <span className="text-text-secondary">{t.notSubmitted}</span>
        ),
    },
    ...(downloads
      ? [
          {
            id: 'files',
            header: t.columns.files,
            cell: ({ row }) => (
              <span className="flex flex-col">
                {row.original.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/files/${encodeURIComponent(f.id)}?t=${encodeURIComponent(slug)}`}
                    // A file name is one long word; it wraps so the table fits at 1280 px.
                    className="block w-[8.5rem] rounded-sm font-mono text-xs break-all whitespace-normal text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
                  >
                    {f.name}
                  </a>
                ))}
              </span>
            ),
          } satisfies ColumnDef<ArchiveRowDTO, unknown>,
        ]
      : []),
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowHeight={40}
      empty={empty}
      getRowId={(row) => row.reportId}
    />
  )
}
