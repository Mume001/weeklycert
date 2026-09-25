// The rules of the wizard's seven steps (spec/03 §4.3, spec/02 §5), apart
// from the screen so a unit test can hold them.

import type { MembershipRole } from '@wc/data/dto'
import { ONBOARDING_STEPS } from '@wc/data/dto'

/** One past the last step is the end: "Setup is complete." */
export const DONE_STEP = ONBOARDING_STEPS + 1

export function stepHref(slug: string, step: number, projectId: string | null): string {
  const query = new URLSearchParams({ step: step > ONBOARDING_STEPS ? 'done' : String(step) })
  if (projectId) query.set('project', projectId)
  return `/app/${slug}/onboarding?${query}`
}

/** "Skip for now" only on steps 4, 5 and 7, and 7 only while the trial runs (03 §4.3). */
export function stepAllowed(step: number, what: 'skip', inTrial: boolean): boolean {
  if (what !== 'skip') return false
  if (step === 7) return inTrial
  return step === 4 || step === 5
}

/**
 * A step the role cannot enter, and why (02 §5): step 1 is the company
 * profile, which only the owner and the administrator change; step 7 is
 * billing, which is the owner's alone (02 §3, Mume 25.9.2026).
 */
export function lockedFor(step: number, role: MembershipRole): 'company' | 'billing' | null {
  if (step === 1 && role !== 'owner' && role !== 'admin') return 'company'
  if (step === 7 && role !== 'owner') return 'billing'
  return null
}

/** ?step= wins; without it the wizard resumes after the last step done. */
export function currentStep(param: string | undefined, done: number): number {
  if (param === 'done') return DONE_STEP
  const n = Number(param)
  if (Number.isInteger(n) && n >= 1 && n <= ONBOARDING_STEPS) return n
  return Math.min(done + 1, DONE_STEP)
}
