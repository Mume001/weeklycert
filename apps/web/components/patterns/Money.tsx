import type { Money as MoneyValue } from '@wc/data/dto'
import { cn } from 'cn'
import { formatMoney } from '@/lib/format'

/** "$1,234.50", tabular figures. Exists so no component ever formats money itself. */
export function Money({ value, align }: { value: MoneyValue; align?: 'right' }) {
  return (
    <span className={cn('tabular-nums', align === 'right' && 'block text-right')}>
      {formatMoney(value)}
    </span>
  )
}
