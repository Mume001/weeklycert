'use client'

// The counter that opens the findings panel below 1600 px (spec/19 §6). The
// grid has the same button in its week bar; the review screen needs its own,
// because features never import each other (spec/19 §2).
import { Button } from '@/components/ui/button'
import { findingsSummary, useWeekState } from '@/lib/week-state'

export function FindingsCount() {
  const { findings, setPanelOpen, panelTriggerRef } = useWeekState()
  return (
    <Button
      ref={panelTriggerRef}
      variant="secondary"
      className="min-[1600px]:hidden"
      onClick={() => setPanelOpen(true)}
    >
      {findingsSummary(findings)}
    </Button>
  )
}
