'use client'

// The keyboard of the grid, exactly the table in spec/14 §7.
//
// Enter goes DOWN and Tab goes RIGHT. That is not a preference: payroll is
// entered worker by worker down a column of days, and swapping the two makes
// the week twice as slow to type (spec/19 §6).
import { type KeyboardEvent, useCallback } from 'react'

export const DAYS_IN_WEEK = 7

/** Every cell carries its coordinates, so focus can move without refs. */
export const cellId = (row: number, day: number) => `cell-${row}-${day}`

export function focusCell(row: number, day: number): boolean {
  const element = document.getElementById(cellId(row, day))
  if (!(element instanceof HTMLInputElement)) return false
  element.focus()
  element.select()
  return true
}

export interface GridKeyboardOptions {
  rowCount: number
  /** Commit what is in the cell before moving away. */
  commit: (row: number, day: number) => void
  /** Escape: put the stored value back and stay put. */
  cancel: (row: number, day: number) => void
  /** Ctrl+D: take the value of the cell above. */
  fillDown: (row: number, day: number) => void
  /** Ctrl+Shift+D: copy last week into the whole grid. */
  copyLastWeek: () => void
  readOnly: boolean
}

/**
 * Returns the handler every cell uses. Movement is clamped at the edges instead
 * of wrapping: wrapping from the last column to the next row loses people.
 */
export function useGridKeyboard(options: GridKeyboardOptions) {
  const { rowCount, commit, cancel, fillDown, copyLastWeek, readOnly } = options

  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>, row: number, day: number) => {
      const move = (nextRow: number, nextDay: number) => {
        const clampedRow = Math.min(Math.max(nextRow, 0), rowCount - 1)
        const clampedDay = Math.min(Math.max(nextDay, 0), DAYS_IN_WEEK - 1)
        if (clampedRow === row && clampedDay === day) return false
        return focusCell(clampedRow, clampedDay)
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        cancel(row, day)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        commit(row, day)
        move(row + 1, day)
        return
      }
      if (event.key === 'Tab') {
        commit(row, day)
        // Let the browser move on the last cell, so focus leaves the grid.
        if (
          event.shiftKey ? day === 0 && row === 0 : day === DAYS_IN_WEEK - 1 && row === rowCount - 1
        ) {
          return
        }
        event.preventDefault()
        if (event.shiftKey) {
          if (day === 0) move(row - 1, DAYS_IN_WEEK - 1)
          else move(row, day - 1)
        } else if (day === DAYS_IN_WEEK - 1) move(row + 1, 0)
        else move(row, day + 1)
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        commit(row, day)
        move(event.key === 'ArrowDown' ? row + 1 : row - 1, day)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const input = event.currentTarget
        const caret = input.selectionStart ?? 0
        const atStart = caret === 0 && input.selectionEnd === 0
        const atEnd = caret === input.value.length && input.selectionEnd === input.value.length
        // Inside the text the arrows still move the caret, as in a spreadsheet.
        if (event.key === 'ArrowLeft' && !atStart && input.value !== '') return
        if (event.key === 'ArrowRight' && !atEnd && input.value !== '') return
        event.preventDefault()
        commit(row, day)
        move(row, event.key === 'ArrowRight' ? day + 1 : day - 1)
        return
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        commit(row, day)
        move(row, event.key === 'Home' ? 0 : DAYS_IN_WEEK - 1)
        return
      }
      if (readOnly) return
      if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        if (event.shiftKey) copyLastWeek()
        else if (row > 0) fillDown(row, day)
      }
    },
    [rowCount, commit, cancel, fillDown, copyLastWeek, readOnly],
  )
}

/**
 * A block copied out of Excel: tab between columns, newline between rows
 * (spec/19 §6). Empty trailing lines are dropped, everything else is kept as
 * typed so parseCell decides what is a number.
 */
export function parsePaste(text: string): string[][] {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => line.split('\t'))
}
