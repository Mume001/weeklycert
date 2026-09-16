'use client'

// "3 errors, 3 warnings, 0 notes" (spec/07 §4, spec/19 §5). Three counted
// strings, because one string cannot inflect three nouns at once (spec/15 §1
// rule 11); the comma between them is layout, not a sentence.
import { copy, count } from '@wc/copy'
import type { Finding } from '@wc/data/dto'

export function findingCounts(findings: Finding[]) {
  return {
    errors: findings.filter((f) => f.severity === 'hard').length,
    warnings: findings.filter((f) => f.severity === 'soft').length,
    notes: findings.filter((f) => f.severity === 'info').length,
  }
}

export function findingsSummary(findings: Finding[]): string {
  const { errors, warnings, notes } = findingCounts(findings)
  return [
    count(copy.grid, 'errors', errors),
    count(copy.grid, 'warnings', warnings),
    count(copy.grid, 'notes', notes),
  ].join(', ')
}

export function FindingsBadge({ findings }: { findings: Finding[] }) {
  const { errors, warnings } = findingCounts(findings)
  return (
    <span
      className="text-sm font-semibold"
      data-errors={errors}
      data-warnings={warnings}
      aria-live="polite"
    >
      {findingsSummary(findings)}
    </span>
  )
}
