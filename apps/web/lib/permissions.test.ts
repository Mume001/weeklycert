// The role lists in lib/session.ts against the permission matrix in spec/02 §3.
// A change in either without the other fails here.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MembershipRole } from '@wc/data/dto'
import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_FILE_READERS,
  AUDIT_READERS,
  BILLING_ROLES,
  COMPANY_WRITERS,
  DATA_OWNERS,
  FRINGE_ALLOCATION_WRITERS,
  MEMBER_MANAGERS,
  MEMBER_REMOVERS,
  NOTIFICATION_READERS,
  NOTIFICATION_WRITERS,
  PII_READERS,
  PROJECT_WRITERS,
  SIGNER_MANAGERS,
} from './session'
import { settingsSections } from './settings-sections'

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

  it('the viewer does not even read them: the credit per hour is pay (Mume, 27.9.2026)', () => {
    const cells = row('Beneficije po radniku')
    const readers = ROLES.filter((r) => cells[r].includes('R'))
    expect(readers).not.toContain('viewer')
    // Whoever may read a worker's plans may also change them; nobody only reads.
    expect(readers.sort()).toEqual([...FRINGE_ALLOCATION_WRITERS].sort())
    // The plans themselves the viewer still reads, on /fringe-plans.
    expect(row('Planovi beneficija').viewer).toBe('R')
  })

  it('projects are written by PROJECT_WRITERS', () => {
    expect([...PROJECT_WRITERS].sort()).toEqual(writers('Projekti').sort())
  })

  it('addresses, SSN4 and date of birth are read by PII_READERS, not the viewer', () => {
    const cells = row('Radnici: adresa, zadnje 4 SSN, datum rođenja')
    const readers = ROLES.filter((r) => cells[r].includes('R'))
    expect([...PII_READERS].sort()).toEqual(readers.sort())
  })

  it('the viewer reads the archive but downloads only the PDF, from step 5 (Mume, 27.9.2026)', () => {
    const cells = row('Arhiva: pregled i skidanje')
    expect(ROLES.every((r) => cells[r].startsWith('R'))).toBe(true)
    expect(cells.viewer).toContain('samo PDF')
    expect(cells.viewer).toContain('od koraka 5')
    // XML, CSV and the export: every role but the viewer, and until step 5 there is no PDF.
    expect([...ARCHIVE_FILE_READERS].sort()).toEqual(ROLES.filter((r) => r !== 'viewer').sort())
  })

  // Settings, session L (spec/03 §4.9): one list per row.
  const sorted = (xs: readonly MembershipRole[]) => [...xs].sort()
  const having = (resource: string, letter: string) =>
    ROLES.filter((r) => row(resource)[r].includes(letter)).sort()

  it('the company profile is written by COMPANY_WRITERS and read by every role', () => {
    expect(sorted(COMPANY_WRITERS)).toEqual(writers('Firma: profil, FEIN, registracija').sort())
    expect(having('Firma: profil, FEIN, registracija', 'R')).toEqual(sorted(ROLES))
  })

  it('members are managed by MEMBER_MANAGERS, removed only by MEMBER_REMOVERS', () => {
    expect(sorted(MEMBER_MANAGERS)).toEqual(
      writers('Članovi: pozvati, ukloniti, promijeniti ulogu').sort(),
    )
    expect(sorted(MEMBER_REMOVERS)).toEqual(
      having('Članovi: pozvati, ukloniti, promijeniti ulogu', 'D'),
    )
  })

  it('signers are kept by SIGNER_MANAGERS, the bookkeeper switch by the owner', () => {
    const resource = 'Potpisnici: ko potpisuje, ime i naziv na izjavi'
    expect(sorted(SIGNER_MANAGERS)).toEqual(writers(resource).sort())
    expect(row(resource).admin).toContain('bez prekidača za knjigovođu')
  })

  it('billing, and deleting or exporting the company, are the owner alone', () => {
    expect(sorted(BILLING_ROLES)).toEqual(
      having('Naplata: plan, kartica, računi, pauza, otkaz', 'R'),
    )
    expect(sorted(DATA_OWNERS)).toEqual(having('Firma: brisanje, izvoz svega', 'D'))
  })

  it('the audit log is read by AUDIT_READERS', () => {
    expect(sorted(AUDIT_READERS)).toEqual(having('Audit log firme', 'R'))
  })

  it('notifications: NOTIFICATION_WRITERS change them, the rest read their own', () => {
    const resource = 'Podsjetnici i obavještenja'
    expect(sorted(NOTIFICATION_WRITERS)).toEqual(writers(resource).sort())
    expect(sorted(NOTIFICATION_READERS)).toEqual(having(resource, 'R'))
  })

  it('hides every settings page a role may not open, and the viewer has none (02 §5)', () => {
    expect(settingsSections('viewer')).toEqual([])
    expect(settingsSections('payroll')).toEqual(['company', 'notifications'])
    expect(settingsSections('owner')).toEqual([
      'company',
      'team',
      'signers',
      'billing',
      'notifications',
      'audit',
      'data',
    ])
    expect(settingsSections('admin')).toEqual([
      'company',
      'team',
      'signers',
      'notifications',
      'audit',
    ])
  })
})
