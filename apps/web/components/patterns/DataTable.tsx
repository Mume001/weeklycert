'use client'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowData,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingTable } from './LoadingTable'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Numbers are right-aligned (spec/14 §7). */
    align?: 'right'
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  /** 44 for ordinary tables, 40 for read-only lists (spec/14 §7 and §9). */
  rowHeight?: 40 | 44
  /** Shown instead of the table when there are no rows: an EmptyState. */
  empty: ReactNode
  loading?: boolean
  /** Mouse convenience. Keyboard users use the link inside the row. */
  onRowClick?: (row: T) => void
  getRowId?: (row: T) => string
}

/** A thin wrapper over TanStack Table for ordinary tables (spec/19 §2). No zebra stripes. */
export function DataTable<T>({
  columns,
  data,
  rowHeight = 44,
  empty,
  loading = false,
  onRowClick,
  getRowId,
}: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getRowId })

  if (loading) return <LoadingTable columns={columns.length} rowHeight={rowHeight} />
  if (data.length === 0) return <>{empty}</>

  return (
    <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(header.column.columnDef.meta?.align === 'right' && 'text-right')}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    rowHeight === 40 ? 'h-10' : 'h-11',
                    cell.column.columnDef.meta?.align === 'right' && 'text-right tabular-nums',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
