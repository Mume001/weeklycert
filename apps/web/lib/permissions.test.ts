// The role lists in lib/session.ts against the permission matrix in spec/02 §3.
// A change in either without the other fails here.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MembershipRole } from '@wc/data/dto'
import { describe, expect, it } from 'vitest'
import { FRINGE_ALLOCATION_WRITERS, PII_READERS, PROJECT_WRITERS } from './session'

// A plain path, not new URL(): under jsdom the global URL is jsdom's.
const here = dirname(fileURLToPath(import.meta.url))
const spec02 = readFileSync(resolve(here, '../../../spec/02-ULOGE-I-DOZVOLE.md'), 'utf8')

const ROLES: readonly MembershipRole[] = [
  'owner',
  'admin',
  'payroll',
  'signer',
  'viewer',
  'bookkeeper',
]

/** One row of the table in spec/02 §3: resource -> the cell of each firm role. */
function row(resource: string): Record<MembershipRole, string> {
  const section = spec02.split('## 3.')[1]?.split('\n## ')[0] ?? ''
  const line = section.split('\n').find((l) => l.startsWith(`| ${resource} |`))
  if (!line) throw new Error(`spec/02 §3 has no row "${resource}"`)
  const cells = line
    .split('|')
    .slice(2, 8)
    .map((c) => c.trim())
  return Object.fromEntries(ROLES.map((r, i) => [r, cells[i] ?? ''])) as Record<
    MembershipRole,
    string
  >
}

/** Roles whose cell holds C or U: they write. */
const writers = (resource: string) =>
  ROLES.filter((r) => /[CU]/.test(row(resource)[r].split(' ')[0] ?? ''))

describe('spec/02 §3 and the role lists agree', () => {
  it('a worker’s fringe plans are written by the same roles as the plans', () => {
    expect(writers('Beneficije po radniku')).toEqual(writers('Planovi beneficija'))
    expect([...FRINGE_ALLOCATION_WRITERS].sort()).toEqual(writers('Beneficije po radniku').sort())
  })

  it('everybody else reads them', () => {
    const cells = row('Beneficije po radniku')
    const readers = ROLES.filter((r) => cells[r].includes('R'))
    expect(readers).toEqual([...ROLES])
  })

  it('projects are written by PROJECT_WRITERS', () => {
    expect([...PROJECT_WRITERS].sort()).toEqual(writers('Projekti').sort())
  })

  it('addresses, SSN4 and date of birth are read by PII_READERS, not the viewer', () => {
    const cells = row('Radnici: adresa, zadnje 4 SSN, datum rođenja')
    const readers = ROLES.filter((r) => cells[r].includes('R'))
    expect([...PII_READERS].sort()).toEqual(readers.sort())
  })
})
