'use client'

// One day of one row. The state machine is spec/19 §6:
//
//   idle -> editing -> committing -> idle | error
//
// Commit happens on blur, Enter and Tab; Escape puts the old value back and
// returns to idle. The cell takes the TOTAL for the day and the engine splits
// it; `8/1` splits it by hand (spec/14 §7).
import { copy, fill } from '@wc/copy'
import type { Finding, GridDay } from '@wc/data/dto'
import { cn } from 'cn'
import { Circle, TriangleAlert } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { formatHours } from '@/lib/format'
import { cellText, parseCell } from './parseCell'
import { cellId } from './useGridKeyboard'

export type CellState = 'idle' | 'editing' | 'committing' | 'error'

export interface DayCellProps {
  value: GridDay
  rowId: string
  rowIndex: number
  day: number
  /** Name of the worker and the date, for the screen reader (spec/15 §3). */
  workerName: string
  date: string
  finding?: Finding
  readOnly: boolean
  onCommit: (raw: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, row: number, day: number) => void
}

export function DayCell({
  value,
  rowId,
  rowIndex,
  day,
  workerName,
  date,
  finding,
  readOnly,
  onCommit,
  onKeyDown,
}: DayCellProps) {
  const committed = cellText(value)
  const [text, setText] = useState(committed)
  const [state, setState] = useState<CellState>('idle')
  const editing = useRef(false)

  // A cell being typed in is never overwritten from outside; the moment it is
  // committed or cancelled it catches up (spec/19 §6, the conflict rule).
  useEffect(() => {
    if (!editing.current) setText(committed)
  }, [committed])

  const commit = () => {
    editing.current = false
    if (text === committed) {
      setState('idle')
      return
    }
    const parsed = parseCell(text)
    if (!parsed) {
      setState('error')
      return
    }
    setState('committing')
    onCommit(text)
    setState('idle')
  }

  const cancel = () => {
    editing.current = false
    setText(committed)
    setState('idle')
  }

  const invalid = state === 'error'
  const severity = invalid ? 'hard' : finding?.severity
  const messageId = `${cellId(rowIndex, day)}-msg`
  const otId = `${cellId(rowIndex, day)}-ot`
  const overtime = Number(value.ot) > 0

  return (
    <td
      className={cn(
        'cell',
        severity === 'hard' && 'cell--error',
        severity === 'soft' && 'cell--warning',
      )}
      data-day={day}
    >
      {severity === 'hard' && (
        <TriangleAlert className="cell__flag" strokeWidth={2.25} aria-hidden="true" />
      )}
      {severity === 'soft' && (
        <Circle className="cell__flag" strokeWidth={2.25} aria-hidden="true" />
      )}
      <input
        id={cellId(rowIndex, day)}
        className="cell__input"
        inputMode="decimal"
        autoComplete="off"
        data-row={rowId}
        data-state={state}
        disabled={readOnly}
        aria-label={fill(copy.grid.cellLabel, { Name: workerName, date })}
        aria-invalid={invalid || severity === 'hard' ? true : undefined}
        aria-describedby={cn(overtime && otId, (invalid || finding) && messageId) || undefined}
        value={text}
        onChange={(event) => {
          editing.current = true
          setState('editing')
          setText(event.target.value)
        }}
        onFocus={() => {
          if (state !== 'error') setState('editing')
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancel()
            onKeyDown(event, rowIndex, day)
            return
          }
          onKeyDown(event, rowIndex, day)
        }}
      />
      <span id={otId} className={cn('cell__sub', !overtime && 'cell__sub--empty')}>
        <abbr title={copy.grid.otFull}>{copy.grid.otAbbr}</abbr> {formatHours(value.ot)}
      </span>
      {invalid && (
        <span id={messageId} className="cell__message" role="alert">
          {copy.grid.invalidCell}
        </span>
      )}
      {!invalid && finding && (
        <span id={messageId} className="sr-only">
          {finding.message}
        </span>
      )}
    </td>
  )
}
