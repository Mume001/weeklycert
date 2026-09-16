'use client'

// The findings panel (spec/03 §1 and §4.5): a panel on the right that stays
// open while the week is edited, never a tab you have to go to. Order is
// spec/07 §4: hard first, then unacknowledged soft, then acknowledged soft,
// then info.
//
// It reads the live findings from lib/week-state, because features never import
// each other (spec/19 §2) and the grid is the one that computes them.
import { copy } from '@wc/copy'
import type { Finding } from '@wc/data/dto'
import { acknowledgementKey, useWeekState } from '@/lib/week-state'
import { FindingItem } from './FindingItem'
import { findingsSummary } from './FindingsBadge'

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
  const { findings, acknowledged, acknowledge, focus, fix, canFix } = useWeekState()

  return (
    <aside
      aria-label={findingsSummary(findings)}
      className="flex w-full shrink-0 flex-col gap-3 border-border-decorative border-t bg-white p-4 lg:w-[22rem] lg:border-t-0 lg:border-l"
    >
      <div>
        <p className="text-sm font-semibold text-text-primary" aria-live="polite">
          {findingsSummary(findings)}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{copy.grid.panelNote}</p>
      </div>

      {findings.length === 0 ? (
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
              onFocus={() =>
                focus({
                  workerId: finding.workerId,
                  workDate: finding.workDate,
                  classificationId: finding.classificationId,
                  field: finding.field,
                })
              }
              onFix={() => fix(finding)}
              onAcknowledge={() => acknowledge(finding)}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
