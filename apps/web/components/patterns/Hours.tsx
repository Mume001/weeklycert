import type { Hours as HoursValue } from '@wc/data/dto'
import { formatHours } from '@/lib/format'

/** "8.0", tabular figures, one decimal (spec/15 §1 point 8). */
export function Hours({ value }: { value: HoursValue }) {
  return <span className="tabular-nums">{formatHours(value)}</span>
}
