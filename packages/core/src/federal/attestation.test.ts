// The statement is the form's text, not ours, so it is checked against the
// spec the way packages/copy is checked against spec/15.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ATTESTATION_INTRO, attestationPoints, attestationText } from './attestation.ts'

const spec05 = readFileSync(
  fileURLToPath(new URL('../../../../spec/05-IZLAZI-WH347-NYXML.md', import.meta.url)),
  'utf8',
)

/** spec/05 wraps the text over lines and escapes its quotes for markdown. */
const flat = (text: string) => text.replace(/\\/g, '').replace(/\s+/g, ' ').trim()
const spec = flat(spec05)

describe('the compliance statement is spec/05 §4.4, word for word', () => {
  const points = attestationPoints({ hasApprentices: true, hasFringe: true })

  it('has the six numbered points of the January 2025 form', () => {
    expect(points.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('quotes the introduction', () => {
    expect(spec).toContain(flat(ATTESTATION_INTRO))
  })

  it.each(points.map((p) => [p.number, p.text] as const))('quotes point %i', (_n, text) => {
    expect(spec).toContain(flat(text))
  })
})

describe('which boxes are ticked comes from the week (spec/05 §4.4)', () => {
  it('ticks 1, 2, 3 and 6 always', () => {
    const points = attestationPoints({ hasApprentices: false, hasFringe: false })
    expect(points.filter((p) => p.checked).map((p) => p.number)).toEqual([1, 2, 3, 6])
  })

  it('ticks 4 only with apprentices and 5 only with fringe benefits', () => {
    const apprentices = attestationPoints({ hasApprentices: true, hasFringe: false })
    expect(apprentices.find((p) => p.number === 4)?.checked).toBe(true)
    expect(apprentices.find((p) => p.number === 5)?.checked).toBe(false)

    const fringe = attestationPoints({ hasApprentices: false, hasFringe: true })
    expect(fringe.find((p) => p.number === 5)?.checked).toBe(true)
    expect(fringe.find((p) => p.number === 4)?.checked).toBe(false)
  })

  it('stores only the points the signer accepted', () => {
    const text = attestationText(attestationPoints({ hasApprentices: false, hasFringe: true }))
    expect(text).toContain('WH-347 rev. January 2025')
    expect(text).toContain('1. The payroll information submitted')
    expect(text).toContain('5. Fringe benefits have been paid')
    expect(text).not.toContain('4. Any workers paid as apprentices')
  })
})
