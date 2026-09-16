'use client'

// State the hours grid and the findings panel share.
//
// It lives in lib/ and not in either feature because features never import each
// other (spec/19 §2); the page composes the two and this is what they talk
// through. The panel knows nothing about cells: it asks for a target to be
// focused and the grid, which registered itself here, does it.
import type { Finding } from '@wc/data/dto'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

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
  const [acknowledged, setAcknowledged] = useState<string[]>([])

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
    }
  }, [findings, acknowledged, acknowledge, focus, fix, canFix, readOnly, registerGrid])

  return <WeekStateContext.Provider value={value}>{children}</WeekStateContext.Provider>
}

export function useWeekState(): WeekStateValue {
  const value = useContext(WeekStateContext)
  if (!value) throw new Error('useWeekState must be used inside WeekStateProvider')
  return value
}
