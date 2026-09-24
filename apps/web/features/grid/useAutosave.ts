'use client'

// Autosave for the grid (spec/19 §6): 800 ms after the last change, every cell
// that moved goes to PATCH /api/v1/periods/[id]/entries in one request. The
// indicator has exactly three states and they come from spec/15 §3. It never
// fails silently.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export const AUTOSAVE_DEBOUNCE_MS = 800

export interface PendingCell {
  rowId: string
  day: number
  raw: string
}

export interface Autosave {
  state: SaveState
  /** ISO timestamp the server saved at, for "Saved {HH:MM}". */
  savedAt: string | null
  queue: (cell: PendingCell) => void
  /** Sends whatever is waiting right now, for tests and for leaving the page. */
  flush: () => Promise<void>
}

export function useAutosave(entriesUrl: string): Autosave {
  const [state, setState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const pending = useRef(new Map<string, PendingCell>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const send = useCallback(async () => {
    if (pending.current.size === 0) return
    const cells = [...pending.current.values()]
    pending.current.clear()
    setState('saving')
    try {
      const response = await fetch(entriesUrl, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cells }),
      })
      if (!response.ok) throw new Error(`PATCH entries answered ${response.status}`)
      const body: { savedAt?: string } = await response.json()
      setSavedAt(body.savedAt ?? null)
      setState('saved')
    } catch {
      // Put them back, so the next change tries again with everything.
      for (const cell of cells) pending.current.set(`${cell.rowId}:${cell.day}`, cell)
      setState('error')
    }
  }, [entriesUrl])

  const queue = useCallback(
    (cell: PendingCell) => {
      pending.current.set(`${cell.rowId}:${cell.day}`, cell)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void send()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [send],
  )

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    await send()
  }, [send])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // One stable object: a fresh one on every render would make every callback
  // that depends on it change, and every effect that depends on those run again.
  return useMemo(() => ({ state, savedAt, queue, flush }), [state, savedAt, queue, flush])
}
