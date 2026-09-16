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
      {/* Name, classification under it, J or RA to the right, all inside the one
          220 px sticky column (spec/14 §7). A second classification for the same
          worker indents under the name instead of repeating it. */}
      <th scope="row" className="grid__worker text-left">
        <div className="grid__wcell">
          <div className="min-w-0 flex-1">
            {continued ? (
              <span className="sr-only">{row.workerName}</span>
            ) : (
              <span className="grid__wname" title={row.workerName}>
                {row.workerName}
              </span>
            )}
            <span
              className={cn('grid__wclass', continued && 'pl-3')}
              title={row.classificationName}
            >
              {row.classificationName}
            </span>
            {idle && <span className="grid__wclass">{copy.grid.noHours}</span>}
          </div>
          <span className="grid__wbadge" title={copy.grid.columns.level}>
            {row.isApprentice ? 'RA' : 'J'}
          </span>
        </div>
      </th>

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
      <td className="grid__num grid__derived">
        <Money value={row.stRate} />
      </td>
      <td className="grid__num grid__derived">
        <Money value={row.otRate} />
      </td>
      <td className="grid__derived whitespace-nowrap">{copy.grid.fringe[row.fringeStatus]}</td>
      <td className="grid__num grid__derived">
        <Money value={row.grossProject} />
      </td>
    </tr>
  )
}
