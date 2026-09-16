'use client'

// One finding: the message, why, the rule, and what to do about it. Not a word
// of it is written here; every string comes from core/validate (spec/07 §1).
import { copy } from '@wc/copy'
import type { Finding } from '@wc/data/dto'
import { cn } from 'cn'
import { Circle, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TONE = {
  hard: { icon: TriangleAlert, className: 'border-error-100 bg-error-50 text-error-600' },
  soft: { icon: Circle, className: 'border-warning-100 bg-warning-50 text-warning-600' },
  info: { icon: Info, className: 'border-n-200 bg-n-50 text-n-600' },
} as const

export interface FindingItemProps {
  finding: Finding
  acknowledged: boolean
  canFix: boolean
  onFocus: () => void
  onFix: () => void
  onAcknowledge: () => void
}

export function FindingItem({
  finding,
  acknowledged,
  canFix,
  onFocus,
  onFix,
  onAcknowledge,
}: FindingItemProps) {
  const tone = TONE[finding.severity]
  const Icon = tone.icon

  return (
    <li className={cn('rounded-md border p-3', tone.className, acknowledged && 'opacity-70')}>
      <div className="flex gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {/* The message is a button: clicking it focuses the cell (spec/07 §4). */}
          <button
            type="button"
            onClick={onFocus}
            className="rounded-sm text-left text-sm font-semibold text-text-primary hover:underline focus-visible:focus-ring"
          >
            {finding.message}
          </button>
          {finding.detail && <p className="mt-1 text-xs text-text-secondary">{finding.detail}</p>}
          {finding.suggestedFix && (
            <p className="mt-1 text-xs text-text-secondary">{finding.suggestedFix}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {finding.rule && (
              <span className="font-mono text-2xs text-text-secondary">{finding.rule}</span>
            )}
            <span className="font-mono text-2xs text-text-secondary">{finding.code}</span>
            {canFix && (
              <Button size="sm" variant="secondary" onClick={onFix}>
                {copy.grid.applyFix}
              </Button>
            )}
            {finding.severity === 'soft' && !acknowledged && (
              <Button size="sm" variant="ghost" onClick={onAcknowledge}>
                {copy.grid.acknowledge}
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
