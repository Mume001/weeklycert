import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { copy, fill } from '../src/index.ts'

const spec15 = readFileSync(
  fileURLToPath(new URL('../../../spec/15-TEKSTOVI-I-EMAILOVI.md', import.meta.url)),
  'utf8',
)

function leaves(node: unknown, path = 'copy'): [string, string][] {
  if (typeof node === 'string') return [[path, node]]
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`))
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`))
  }
  return []
}

const all = leaves(copy)

describe('packages/copy is spec/15, nothing invented', () => {
  it('has strings', () => {
    expect(all.length).toBeGreaterThan(150)
  })

  it('every string appears word for word in spec/15', () => {
    const missing = all.filter(([, s]) => !spec15.includes(s)).map(([p, s]) => `${p}: ${s}`)
    expect(missing).toEqual([])
  })

  it('has no em or en dash (15 §1 rule 7)', () => {
    expect(all.filter(([, s]) => /[–—]/.test(s))).toEqual([])
  })

  it('has no exclamation marks and no forbidden openers (15 §1 rules 2 and 6)', () => {
    expect(all.filter(([, s]) => s.includes('!'))).toEqual([])
    expect(all.filter(([, s]) => /Oops|Uh oh|Something went wrong/i.test(s))).toEqual([])
  })

  it('names every role from spec/02 §2', () => {
    expect(Object.keys(copy.roles).sort()).toEqual(
      ['admin', 'bookkeeper', 'owner', 'payroll', 'signer', 'viewer'].sort(),
    )
  })

  it('names every DisplayStatus from spec/19 §3', () => {
    expect(Object.keys(copy.status)).toEqual([
      'draft',
      'needs_attention',
      'validated',
      'signed',
      'submitted',
      'rejected',
      'corrected',
    ])
  })
})

describe('fill', () => {
  it('fills named placeholders', () => {
    expect(fill(copy.shell.tenantSwitcher.subtitle, { Role: 'Owner', n: 2 })).toBe(
      'Owner · 2 active projects',
    )
  })

  it('fills repeated placeholders in order', () => {
    expect(fill(copy.grid.panelCounts, { n: [3, 3, 0] })).toBe('3 errors, 3 warnings, 0 notes')
  })

  it('handles names with spaces', () => {
    expect(fill(copy.forbidden.askOwner, { 'Owner name': 'Mirza Hodzic' })).toBe(
      'Ask Mirza Hodzic for access',
    )
  })

  it('refuses a missing value instead of printing a raw placeholder', () => {
    expect(() => fill(copy.locked.signed, { date: 'Aug 29, 2026' })).toThrow(/Name/)
  })
})
