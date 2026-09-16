'use client'

// One worker in one classification. A worker with a second classification gets
// a second, indented row (spec/03 §4.5); a worker with no hours all week stays
// in the grid, greyed out, and never reaches the report.
import { copy } from '@wc/copy'
import type { Finding, IsoDate, GridRow as Row } from '@wc/data/dto'
import { cn } from 'cn'
import type { KeyboardEvent } from 'react'
import { Hours } from '@/components/patterns/Hours'
import { Money } from '@/components/patterns/Money'
import { DayCell } from './DayCell'

export interface GridRowProps {
  row: Row
  rowIndex: number
  days: IsoDate[]
  /** Worst finding per day for this worker, keyed by date. */
  findingsByDay: Record<string, Finding | undefined>
  /** The row a finding in the panel points at. */
  focused: boolean
  /** Same worker as the row above: the classification is indented under it. */
  continued: boolean
  readOnly: boolean
  onCommit: (rowId: string, day: number, raw: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, row: number, day: number) => void
}

export function GridRow({
  row,
  rowIndex,
  days,
  findingsByDay,
  focused,
  continued,
  readOnly,
  onCommit,
  onKeyDown,
}: GridRowProps) {
  const idle = Number(row.totalHours) === 0

  return (
    <tr
      data-row={row.id}
      className={cn('grid__row', idle && 'grid__row--idle', focused && 'grid__row--focused')}
    >
      <th scope="row" className="grid__worker text-left font-medium">
        {continued ? (
          <span className="sr-only">{row.workerName}</span>
        ) : (
          <span className="block truncate">{row.workerName}</span>
        )}
        {idle && <span className="block text-xs text-text-secondary">{copy.grid.noHours}</span>}
      </th>
      <td className={cn('grid__classification whitespace-nowrap', continued && 'pl-4')}>
        <span className="block truncate">{row.classificationName}</span>
        {row.otCodes.length > 0 && (
          <span className="block font-mono text-2xs text-text-secondary">
            {row.otCodes.join(' ')}
          </span>
        )}
      </td>
      <td>{row.isApprentice ? 'RA' : 'J'}</td>

      {days.map((date, day) => (
        <DayCell
          key={date}
          value={row.days[day] ?? { st: '0', ot: '0', manual: false, holiday: false }}
          rowId={row.id}
          rowIndex={rowIndex}
          day={day}
          workerName={row.workerName}
          date={date}
          finding={findingsByDay[date]}
          readOnly={readOnly}
          onCommit={(raw) => onCommit(row.id, day, raw)}
          onKeyDown={onKeyDown}
        />
      ))}

      <td className="grid__num">
        <Hours value={row.totalHours} />
      </td>
      <td className="grid__num">
        <Hours value={row.stHours} />
      </td>
      <td className="grid__num">
        <Hours value={row.otHours} />
      </td>
      <td className="grid__num">
        <Money value={row.stRate} />
      </td>
      <td className="grid__num">
        <Money value={row.otRate} />
      </td>
      <td className="whitespace-nowrap">{copy.grid.fringe[row.fringeStatus]}</td>
      <td className="grid__num">
        <Money value={row.grossProject} />
      </td>
    </tr>
  )
}
