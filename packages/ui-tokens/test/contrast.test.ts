import { describe, expect, it } from 'vitest'
import { checkContrast } from '../scripts/contrast.ts'

// spec/14 §3 prints two ratios that do not match the hex values. Both pairs still
// sit on the right side of their threshold; the printed number needs correcting.
const KNOWN_SPEC_TYPOS = new Set(['violet-500 on violet-50', 'n-500 on warning-50'])

describe('contrast (spec/14 §3)', () => {
  const { pass, mustFail } = checkContrast()

  it.each(pass.map((r) => [`${r.fg} on ${r.bg}`, r] as const))(
    '%s passes its threshold',
    (_, r) => {
      expect(r.value).toBeGreaterThanOrEqual(r.min)
    },
  )

  it.each(mustFail.map((r) => [`${r.fg} on ${r.bg}`, r] as const))(
    '%s still fails, as the spec says',
    (_, r) => {
      expect(r.value).toBeLessThan(r.min)
    },
  )

  it('matches every ratio printed in the spec, within rounding', () => {
    const off = [...pass, ...mustFail]
      .filter((r) => r.documented !== undefined)
      .filter((r) => !KNOWN_SPEC_TYPOS.has(`${r.fg} on ${r.bg}`))
      .filter((r) => Math.abs(r.value - (r.documented ?? 0)) > 0.015)
      .map((r) => `${r.fg} on ${r.bg}: measured ${r.value}, spec ${r.documented}`)
    expect(off).toEqual([])
  })
})
