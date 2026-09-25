// The wizard's rules (spec/03 §4.3, spec/02 §5).
import { describe, expect, it } from 'vitest'
import { currentStep, DONE_STEP, lockedFor, stepAllowed, stepHref } from './steps'

describe('Skip for now', () => {
  it('exists on steps 4, 5 and 7 only', () => {
    const skippable = [1, 2, 3, 4, 5, 6, 7].filter((s) => stepAllowed(s, 'skip', true))
    expect(skippable).toEqual([4, 5, 7])
  })

  it('on step 7 only while the trial runs', () => {
    expect(stepAllowed(7, 'skip', false)).toBe(false)
  })
})

describe('locked steps (02 §5)', () => {
  it('step 1 for payroll, signer and bookkeeper; step 7 for everyone but the owner', () => {
    const roles = ['owner', 'admin', 'payroll', 'signer', 'bookkeeper'] as const
    expect(roles.map((r) => lockedFor(1, r))).toEqual([null, null, 'company', 'company', 'company'])
    expect(roles.map((r) => lockedFor(7, r))).toEqual([
      null,
      'billing',
      'billing',
      'billing',
      'billing',
    ])
    expect(roles.every((r) => [2, 3, 4, 5, 6].every((s) => lockedFor(s, r) === null))).toBe(true)
  })
})

describe('where the wizard opens', () => {
  it('resumes after the last step done, and ?step= wins', () => {
    expect(currentStep(undefined, 0)).toBe(1)
    expect(currentStep(undefined, 3)).toBe(4)
    expect(currentStep(undefined, 7)).toBe(DONE_STEP)
    expect(currentStep('2', 5)).toBe(2)
    expect(currentStep('9', 1)).toBe(2)
    expect(currentStep('done', 1)).toBe(DONE_STEP)
  })

  it('carries the project from step to step', () => {
    expect(stepHref('x', 3, 'p1')).toBe('/app/x/onboarding?step=3&project=p1')
    expect(stepHref('x', 8, null)).toBe('/app/x/onboarding?step=done')
  })
})
