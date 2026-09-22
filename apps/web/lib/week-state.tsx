'use client'

// State the hours grid and the findings panel share.
//
// It lives in lib/ and not in either feature because features never import each
// other (spec/19 §2); the page composes the two and this is what they talk
// through. The panel knows nothing about cells: it asks for a target to be
// focused and the grid, which registered itself here, does it.
import { copy, count } from '@wc/copy'
import type { Finding } from '@wc/data/dto'
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

/** The width at which the panel stops being an overlay (spec/19 §6). */
export const PANEL_COLUMN_MEDIA = '(min-width: 1600px)'

export function findingCounts(findings: Finding[]) {
  return {
    errors: findings.filter((f) => f.severity === 'hard').length,
    warnings: findings.filter((f) => f.severity === 'soft').length,
    notes: findings.filter((f) => f.severity === 'info').length,
  }
}

/**
 * "3 errors, 3 warnings, 0 notes" (spec/07 §4, spec/15 §3). Three counted
 * strings, because one string cannot inflect three nouns at once (15 §1 rule
 * 11); the comma between them is layout, not a sentence.
 *
 * It lives here and not in either feature because both need it: the panel is
 * its title, the week bar is the button that opens the panel, and features
 * never import each other (spec/19 §2).
 */
export function findingsSummary(findings: Finding[]): string {
  const { errors, warnings, notes } = findingCounts(findings)
  return [
    count(copy.grid, 'errors', errors),
    count(copy.grid, 'warnings', warnings),
    count(copy.grid, 'notes', notes),
  ].join(', ')
}

export interface FindingTarget {
  workerId?: string
  workDate?: string
  classificationId?: string
  field?: string
}

/** A soft finding is acknowledged per worker and code (spec/07 §5). */
export const acknowledgementKey = (finding: Finding) => `${finding.code}|${finding.workerId ?? ''}`

export interface WeekStateValue {
  findings: Finding[]
  setFindings: (findings: Finding[]) => void
  /** Codes the user has clicked "I understand" on (spec/07 §1). */
  acknowledged: string[]
  acknowledge: (finding: Finding) => void
  /** Hard findings block generating; soft ones block until acknowledged. */
  blocking: Finding[]
  unacknowledgedSoft: Finding[]
  focus: (target: FindingTarget) => void
  fix: (finding: Finding) => void
  canFix: (finding: Finding) => boolean
  readOnly: boolean
  registerGrid: (handlers: GridHandlers) => void
  /** Under 1600 px the panel is an overlay; this is whether it is open. */
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** The button that opened it, so closing can put focus back (spec/14 §6). */
  panelTriggerRef: RefObject<HTMLButtonElement | null>
}

export interface GridHandlers {
  focus: (target: FindingTarget) => void
  fix: (finding: Finding) => void
  canFix: (finding: Finding) => boolean
}

const noop: GridHandlers = { focus: () => {}, fix: () => {}, canFix: () => false }

const WeekStateContext = createContext<WeekStateValue | null>(null)

export function WeekStateProvider({
  children,
  initialFindings,
  readOnly,
}: {
  children: ReactNode
  initialFindings: Finding[]
  readOnly: boolean
}) {
  const [findings, setFindings] = useState(initialFindings)

  // The server is the one that counts (spec/03 §4.5): when it sends a new set,
  // the panel takes it. Without this the panel keeps the findings of the first
  // render, and a screen that saved something would still show the old count.
  useEffect(() => {
    setFindings(initialFindings)
  }, [initialFindings])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const panelTriggerRef = useRef<HTMLButtonElement>(null)

  // Widening the window past 1600 px turns the panel into a permanent column,
  // so an overlay left open there would trap focus behind nothing.
  useEffect(() => {
    const query = window.matchMedia?.(PANEL_COLUMN_MEDIA)
    if (!query) return
    const sync = () => {
      if (query.matches) setPanelOpen(false)
    }
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // The grid registers itself in a ref, not in state: registering must not
  // cause a render, or the grid re-registers on every render for ever.
  const handlers = useRef<GridHandlers>(noop)

  const acknowledge = useCallback((finding: Finding) => {
    const key = acknowledgementKey(finding)
    setAcknowledged((current) => (current.includes(key) ? current : [...current, key]))
  }, [])

  const registerGrid = useCallback((next: GridHandlers) => {
    handlers.current = next
  }, [])
  const focus = useCallback((target: FindingTarget) => handlers.current.focus(target), [])
  const fix = useCallback((finding: Finding) => handlers.current.fix(finding), [])
  const canFix = useCallback((finding: Finding) => handlers.current.canFix(finding), [])

  const value = useMemo<WeekStateValue>(() => {
    const blocking = findings.filter((f) => f.severity === 'hard')
    const unacknowledgedSoft = findings.filter(
      (f) => f.severity === 'soft' && !acknowledged.includes(acknowledgementKey(f)),
    )
    return {
      findings,
      setFindings,
      acknowledged,
      acknowledge,
      blocking,
      unacknowledgedSoft,
      focus,
      fix,
      canFix,
      readOnly,
      registerGrid,
      panelOpen,
      setPanelOpen,
      panelTriggerRef,
    }
  }, [findings, acknowledged, acknowledge, focus, fix, canFix, readOnly, registerGrid, panelOpen])

  return <WeekStateContext.Provider value={value}>{children}</WeekStateContext.Provider>
}

export function useWeekState(): WeekStateValue {
  const value = useContext(WeekStateContext)
  if (!value) throw new Error('useWeekState must be used inside WeekStateProvider')
  return value
}
