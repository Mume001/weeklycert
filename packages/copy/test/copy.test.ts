import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { copy, count, fill, plural } from '../src/index.ts'

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

describe('15 §1 rule 11: a number has a singular and a plural form', () => {
  const ones = all.filter(([p]) => p.endsWith('_one')).map(([p]) => p)
  const others = all.filter(([p]) => p.endsWith('_other')).map(([p]) => p)

  it('pairs every _one with an _other', () => {
    expect(ones.map((p) => p.replace(/_one$/, ''))).toEqual(
      others.map((p) => p.replace(/_other$/, '')),
    )
    expect(ones.length).toBeGreaterThan(10)
  })

  it('makes the two forms differ, so neither is a copy of the other', () => {
    const same = ones.filter((one) => {
      const a = all.find(([p]) => p === one)?.[1]
      const b = all.find(([p]) => p === one.replace(/_one$/, '_other'))?.[1]
      return a === b
    })
    expect(same).toEqual([])
  })

  /**
   * Strings with a number that keep one form, each for a stated reason. A new
   * entry here is a decision, not an oversight.
   */
  const SINGLE_FORM = new Map([
    // #{n} is the payroll number, an identifier and not a count: "payroll no.
    // will be #1" reads the same as "#21".
    ['copy.grid.meta', 'identifier, not a count'],
    // No noun that inflects: "1 ready" and "5 ready" are the same words.
    ['copy.imports.ready', '{n} ready'],
    // A fixed trigger from 15 §4.2 (T-3 and T-2), not a computed number.
    ['copy.email.billing.trialEnds', 'fixed T-3 trigger'],
    ['copy.email.weekly.wh347Due', 'fixed T-2 trigger'],
  ])

  it('lists every other string that carries {n} with both forms', () => {
    const singles = all
      .filter(([p, s]) => s.includes('{n}') && !p.endsWith('_one') && !p.endsWith('_other'))
      .map(([p]) => p)
    expect(singles.filter((p) => !SINGLE_FORM.has(p))).toEqual([])
  })
})

describe('15 §1 rule 12: no concrete value is written into a string', () => {
  it('writes no week day: the firm picks it', () => {
    const days = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/
    expect(all.filter(([, s]) => days.test(s))).toEqual([])
  })

  it('writes no clock time', () => {
    expect(all.filter(([, s]) => /\b\d{1,2}:\d{2}\b/.test(s))).toEqual([])
  })

  it('writes no date', () => {
    const date =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/
    expect(all.filter(([, s]) => date.test(s))).toEqual([])
  })
})

describe('fill', () => {
  it('fills named placeholders', () => {
    expect(fill(plural(copy.shell.tenantSwitcher, 'subtitle', 2), { Role: 'Owner', n: 2 })).toBe(
      'Owner · 2 active projects',
    )
  })

  it('fills repeated placeholders in order', () => {
    // No string in 15 needs this any more (the import summary was split into
    // three counted lines), but fill() keeps it: the next one will.
    expect(fill('{n} of {n}', { n: [3, 12] })).toBe('3 of 12')
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

describe('plural and count', () => {
  it('uses the singular for exactly one', () => {
    expect(plural(copy.grid, 'errors', 1)).toBe('{n} error')
    expect(count(copy.grid, 'errors', 1)).toBe('1 error')
  })

  it('uses the plural for everything else, zero included', () => {
    expect(count(copy.grid, 'errors', 0)).toBe('0 errors')
    expect(count(copy.grid, 'errors', 3)).toBe('3 errors')
  })

  it('fills the other placeholders too', () => {
    expect(count(copy.shell.tenantSwitcher, 'subtitle', 1, { Role: 'Owner' })).toBe(
      'Owner · 1 active project',
    )
  })
})
