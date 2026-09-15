import type { IsoDate } from '@wc/data/dto'
import { formatDate, formatDateMono } from '@/lib/format'

/** "Sep 12, 2026" in the UI, "2026-09-12" in mono text (spec/15 §1 point 8). */
export function DateText({ value, mono = false }: { value: IsoDate; mono?: boolean }) {
  return (
    <time dateTime={value} className={mono ? 'font-mono tabular-nums' : undefined}>
      {mono ? formatDateMono(value) : formatDate(value)}
    </time>
  )
}
