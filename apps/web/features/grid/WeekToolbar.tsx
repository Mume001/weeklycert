'use client'

// The week bar above the grid (spec/03 §4.5): which week this is, its status,
// the four actions, and the autosave indicator. "Review and generate" is the
// one primary action on the screen (spec/14 §11) and it is disabled while a
// blocking finding is open, with a tooltip that names the codes (spec/07 §4).
import { copy, count, fill } from '@wc/copy'
import type { DisplayStatus, Finding } from '@wc/data/dto'
import { CalendarOff, CloudOff, CopyIcon, FileUp, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { RefObject } from 'react'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatClock } from '@/lib/format'
import { findingsSummary } from '@/lib/week-state'
import type { SaveState } from './useAutosave'

export interface WeekToolbarProps {
  status: DisplayStatus
  blocking: Finding[]
  save: { state: SaveState; savedAt: string | null }
  readOnly: boolean
  onCopyLastWeek: () => void
  onMarkNoWork: () => void
  reviewHref: string
  /** Step 1 of an import, preset to this project and week (spec/03 §4.7). */
  importHref: string
  /** Everything the panel shows, for the counter that opens it (spec/19 §6). */
  findings: Finding[]
  onOpenFindings: () => void
  findingsTriggerRef: RefObject<HTMLButtonElement | null>
  /**
   * The four derived columns. Absent when there is no grid to fold (03 §4.5);
   * the switch itself disappears once the grid is wide enough for them.
   */
  showRates?: boolean
  onToggleRates?: () => void
}

function SaveIndicator({ state, savedAt }: WeekToolbarProps['save']) {
  if (state === 'saving') {
    // No spinner: nothing in this product animates for longer than a transition
    // (spec/14 §11). The word carries the state.
    return (
      <span className="flex items-center gap-1.5 text-text-secondary text-xs">
        <RefreshCw className="size-3.5" aria-hidden="true" />
        {copy.grid.saving}
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-error-600">
        <CloudOff className="size-3.5" aria-hidden="true" />
        {copy.grid.notSaved}
      </span>
    )
  }
  if (state === 'saved' && savedAt) {
    return (
      <span className="text-text-secondary text-xs">
        {fill(copy.grid.saved, { 'HH:MM': formatClock(savedAt) })}
      </span>
    )
  }
  return null
}

export function WeekToolbar({
  status,
  blocking,
  save,
  readOnly,
  onCopyLastWeek,
  onMarkNoWork,
  reviewHref,
  importHref,
  findings,
  onOpenFindings,
  findingsTriggerRef,
  showRates,
  onToggleRates,
}: WeekToolbarProps) {
  const blocked = blocking.length > 0
  const codes = [...new Set(blocking.map((f) => f.code))].join(', ')

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-decorative bg-white px-6 py-2.5">
      <StatusBadge status={status} />
      <SaveIndicator {...save} />
      {/* The counter is the button: it says what is waiting and opens the
          panel that says it in full (spec/15 §3, spec/19 §6). Above 1600 px
          the panel is already a column, so the button has nothing to do. */}
      <Button
        ref={findingsTriggerRef}
        variant="secondary"
        size="sm"
        onClick={onOpenFindings}
        className="min-[1600px]:hidden"
      >
        {findingsSummary(findings)}
      </Button>
      {onToggleRates && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleRates}
          aria-pressed={showRates}
          className="grid-rates-toggle"
        >
          {copy.grid.showRates}
        </Button>
      )}
      {/* What the week bar does, in the order spec/03 §4.5 lists it, with the
          one primary action last (spec/14 §11). These two are view controls and
          belong with the status, not among the actions. */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onCopyLastWeek} disabled={readOnly}>
          <CopyIcon aria-hidden="true" />
          {copy.grid.copyLastWeek}
        </Button>
        {readOnly ? (
          <Button variant="secondary" size="sm" disabled>
            <FileUp aria-hidden="true" />
            {copy.grid.importCsv}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" asChild>
            <Link href={importHref}>
              <FileUp aria-hidden="true" />
              {copy.grid.importCsv}
            </Link>
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onMarkNoWork} disabled={readOnly}>
          <CalendarOff aria-hidden="true" />
          {copy.grid.markNoWork}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button gives no tooltip, so the wrapper carries it. */}
              <span>
                <Button size="sm" disabled={blocked || readOnly} asChild={!blocked && !readOnly}>
                  {blocked || readOnly ? (
                    <span>{copy.grid.reviewAndGenerate}</span>
                  ) : (
                    <a href={reviewHref}>{copy.grid.reviewAndGenerate}</a>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {blocked && (
              <TooltipContent>
                {`${count(copy.grid, 'generateDisabled', blocking.length)} ${codes}`}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
