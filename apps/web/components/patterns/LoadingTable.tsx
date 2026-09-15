import { cn } from 'cn'
import { Skeleton } from '@/components/ui/skeleton'

export interface LoadingTableProps {
  columns: number
  rows?: number
  rowHeight?: 40 | 44
}

/** Skeleton in the shape of the table (spec/19 §7), no spinner. */
export function LoadingTable({ columns, rows = 6, rowHeight = 44 }: LoadingTableProps) {
  const cells = Array.from({ length: Math.max(columns, 1) }, (_, c) => `c${c}`)
  return (
    <div
      aria-busy="true"
      className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm"
    >
      <div className="h-10 border-b border-border-decorative bg-surface-header" />
      {Array.from({ length: rows }, (_, r) => `r${r}`).map((row) => (
        <div
          key={row}
          className={cn(
            'flex items-center gap-4 border-b border-border-decorative px-3 last:border-b-0',
            rowHeight === 40 ? 'h-10' : 'h-11',
          )}
        >
          {cells.map((cell) => (
            <Skeleton key={cell} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
