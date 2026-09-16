'use client'

// The findings panel (spec/03 §1 and §4.5, spec/19 §6). Order is spec/07 §4:
// hard first, then unacknowledged soft, then acknowledged soft, then info.
//
// Two shapes, one list. At 1600 px and wider it is a permanent 352 px column
// beside the grid, which is what 03 §4.5 means by "always open". Narrower than
// that the grid itself needs the room, so the panel becomes an overlay opened
// by the findings counter in the week bar and closed with Escape, behaving like
// the navigation panel (14 §6). It never shrinks below 352 px: a finding has to
// fit three lines with numbers and a button.
//
// It reads the live findings from lib/week-state, because features never import
// each other (spec/19 §2) and the grid is the one that computes them.
import { copy } from '@wc/copy'
import type { Finding } from '@wc/data/dto'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { acknowledgementKey, findingsSummary, useWeekState } from '@/lib/week-state'
import { FindingItem } from './FindingItem'

const RANK = { hard: 0, soft: 1, info: 2 } as const

function ordered(findings: Finding[], acknowledged: string[]): Finding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = RANK[a.severity] - RANK[b.severity]
    if (bySeverity !== 0) return bySeverity
    const ackA = acknowledged.includes(acknowledgementKey(a)) ? 1 : 0
    const ackB = acknowledged.includes(acknowledgementKey(b)) ? 1 : 0
    return ackA - ackB
  })
}

export function FindingsPanel() {
  const {
    findings,
    acknowledged,
    acknowledge,
    focus,
    fix,
    canFix,
    panelOpen,
    setPanelOpen,
    panelTriggerRef,
  } = useWeekState()

  const summary = findingsSummary(findings)

  const list =
    findings.length === 0 ? (
      <p className="text-sm text-text-secondary">{copy.grid.allClear}</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {ordered(findings, acknowledged).map((finding) => (
          <FindingItem
            // A finding is identified by what it is about, never by its place
            // in the list: the list is reordered as soon as one is fixed.
            key={[
              finding.code,
              finding.workerId,
              finding.workDate,
              finding.classificationId,
              finding.field,
            ].join('|')}
            finding={finding}
            acknowledged={acknowledged.includes(acknowledgementKey(finding))}
            canFix={canFix(finding)}
            onFocus={() => {
              focus({
                workerId: finding.workerId,
                workDate: finding.workDate,
                classificationId: finding.classificationId,
                field: finding.field,
              })
              // On the overlay the cell is behind the panel, so get out of the
              // way once the grid has taken the focus.
              setPanelOpen(false)
            }}
            onFix={() => fix(finding)}
            onAcknowledge={() => acknowledge(finding)}
          />
        ))}
      </ul>
    )

  const note = <p className="mt-0.5 text-xs text-text-secondary">{copy.grid.panelNote}</p>

  return (
    <>
      {/* 1600 px and wider: a column, not a layer. */}
      <aside
        aria-label={summary}
        className="hidden w-[22rem] shrink-0 flex-col gap-3 border-border-decorative border-l bg-white p-4 min-[1600px]:flex"
      >
        <div>
          <p className="font-semibold text-sm text-text-primary" aria-live="polite">
            {summary}
          </p>
          {note}
        </div>
        {list}
      </aside>

      {/* Narrower: the same list as a modal over the grid. */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          // The counter that opens it sits in the week bar, outside the dialog,
          // so Radix cannot find it: put focus back by hand (spec/14 §6).
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            panelTriggerRef.current?.focus()
          }}
          className="w-[22rem] max-w-[90vw] gap-3 overflow-y-auto p-4 min-[1600px]:hidden"
        >
          <div>
            <SheetTitle>{summary}</SheetTitle>
            {note}
          </div>
          {list}
        </SheetContent>
      </Sheet>
    </>
  )
}
