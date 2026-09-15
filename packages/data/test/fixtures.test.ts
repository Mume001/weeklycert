// The fixtures are the scenery for every screen and test (spec/19 §4).
// These tests pin the facts §4 states, so a later edit cannot quietly break them.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { weekEndingsBetween } from '@wc/core'
import { describe, expect, it } from 'vitest'
import { db } from '../src/mock/db.ts'

const fixturesDir = fileURLToPath(new URL('../src/mock/fixtures/', import.meta.url))
const hudson = db.tenants.find((t) => t.slug === 'hudson-electric')
const project = (name: string) => {
  const p = db.projects.find((x) => x.name === name)
  if (!p) throw new Error(name)
  return p
}
const P1 = project('Dutchess County Courthouse Lighting')
const P2 = project('Kingston WTP Electrical Upgrade')
const P3 = project('Beacon HS Fire Alarm Replacement')
const worker = (last: string) => {
  const w = db.workers.find((x) => x.lastName === last)
  if (!w) throw new Error(last)
  return w
}
const periodsOf = (projectId: string) => db.periods.filter((p) => p.projectId === projectId)
const period = (projectId: string, weekEnding: string) => {
  const p = periodsOf(projectId).find(
    (x) => x.weekEnding === weekEnding && x.status !== 'corrected',
  )
  if (!p) throw new Error(weekEnding)
  return p
}

describe('company and people', () => {
  it('is Hudson Electric LLC, Saturday week, FEIN 47-0000000', () => {
    expect(hudson?.legalName).toBe('Hudson Electric LLC')
    expect(hudson?.settings.weekEndingDow).toBe(6)
    expect(hudson?.fein).toBe('47-0000000')
    expect(hudson?.city).toBe('Poughkeepsie')
  })

  it('has one demo user per role, and the bookkeeper is in two companies', () => {
    const roles = db.memberships.filter((m) => m.tenantId === hudson?.id).map((m) => m.role)
    expect(roles.sort()).toEqual(['admin', 'bookkeeper', 'owner', 'payroll', 'signer', 'viewer'])
    const bookkeeper = db.users.find((u) => u.email.startsWith('bookkeeper@'))
    expect(db.memberships.filter((m) => m.userId === bookkeeper?.id)).toHaveLength(2)
    expect(db.tenants.map((t) => t.slug)).toContain('riverside-mechanical')
  })

  it('has a super-admin as a global flag, not a membership', () => {
    const superUser = db.users.find((u) => u.isSuperAdmin)
    expect(superUser?.email.startsWith('super@')).toBe(true)
    expect(db.memberships.some((m) => m.userId === superUser?.id)).toBe(false)
  })
})

describe('projects and rates', () => {
  it('matches the project table', () => {
    expect([P1.prcNumber, P1.startDate, P1.status, P1.federalReporting]).toEqual([
      '2010008390',
      '2026-04-06',
      'active',
      false,
    ])
    expect([P2.prcNumber, P2.federalWdNumber, P2.federalWdMod, P2.federalReporting]).toEqual([
      '2026001122',
      'NY20260014',
      3,
      true,
    ])
    expect([P3.prcNumber, P3.startDate, P3.status]).toEqual([
      '2025009911',
      '2025-09-15',
      'completed',
    ])
  })

  it('uses the official label with an en dash and spaces', () => {
    for (const c of db.classificationCatalog) expect(c.officialLabel).toMatch(/^.+ – .+$/)
  })

  it.each([
    ['Electrician – Inside Wireman', ['A', 'W', 'R'], '63.20', '52.40'],
    ['Electrician – Teledata Technician', ['B', 'E', 'I'], '44.85', '28.70'],
    ['Ironworker – Structural', ['B', 'E1', 'V'], '57.40', '49.60'],
    ['Laborer – Group 1', ['B2', 'F'], '42.10', '31.80'],
    ['Operating Engineer – Class A', ['AA', 'E', 'K'], '58.90', '44.05'],
  ])('%s has the §4 codes and rates on project 1', (label, codes, base, sup) => {
    const row = db.projectClassifications.find(
      (r) => r.projectId === P1.id && r.displayLabel === label,
    )
    expect(row?.otCodes).toEqual(codes)
    expect([row?.wdBaseRate, row?.wdFringeRate]).toEqual([base, sup])
  })

  it('has no valid Ironworker rate on project 1 after July 1', () => {
    const iron = db.projectClassifications.filter(
      (r) => r.projectId === P1.id && r.displayLabel.startsWith('Ironworker'),
    )
    expect(iron.every((r) => r.effectiveTo !== null && r.effectiveTo < '2026-07-01')).toBe(true)
  })
})

describe('workers', () => {
  const pii = (id: string) => db.workerPii.find((p) => p.workerId === id)

  it('has 12 workers: 9 journeyworkers and 3 apprentices at levels 2, 3, 5', () => {
    const hudsonWorkers = db.workers.filter((w) => w.tenantId === hudson?.id)
    expect(hudsonWorkers).toHaveLength(12)
    expect(hudsonWorkers.filter((w) => w.level === 'J')).toHaveLength(9)
    const ra = hudsonWorkers.filter((w) => w.level === 'RA').map((w) => w.id)
    const records = db.apprenticeRecords.filter((r) => ra.includes(r.workerId))
    expect(records.map((r) => [r.periodNo, r.pctOfJourney]).sort()).toEqual([
      [2, '55.00'],
      [3, '65.00'],
      [5, '85.00'],
    ])
  })

  it('has exactly one worker with a date of birth instead of SSN4', () => {
    const dobOnly = db.workerPii.filter((p) => p.ssnLast4 === null && p.dateOfBirth !== null)
    expect(dobOnly).toHaveLength(1)
    expect(db.workerPii.filter((p) => p.ssnLast4 !== null && p.dateOfBirth !== null)).toHaveLength(
      0,
    )
  })

  it('has exactly one worker without an address', () => {
    expect(db.workerPii.filter((p) => p.address === null).map((p) => p.workerId)).toEqual([
      worker('Haddad').id,
    ])
    expect(pii(worker('Haddad').id)?.ssnLast4).not.toBeNull()
  })

  it('never contains a full SSN, anywhere in the fixture files', () => {
    for (const file of readdirSync(fixturesDir).filter((f) => f.endsWith('.json'))) {
      const text = readFileSync(`${fixturesDir}${file}`, 'utf8')
      expect(text, file).not.toMatch(/\b\d{3}-?\d{2}-?\d{4}\b/)
      expect(text, file).not.toMatch(/"ssn"\s*:/i)
    }
  })
})

describe('weeks (spec/19 §4 tables)', () => {
  it('project 1: 23 weeks, 24 rows, statuses and payroll numbers as specified', () => {
    const rows = periodsOf(P1.id)
    expect(new Set(rows.map((r) => r.weekEnding)).size).toBe(23)
    expect(rows).toHaveLength(24)
    const history = weekEndingsBetween('2026-04-11', '2026-08-01')
    expect(
      history.map((we) => [period(P1.id, we).status, period(P1.id, we).payrollNumber]),
    ).toEqual(history.map((_, i) => ['submitted', i + 1]))
    const aug8 = rows.filter((r) => r.weekEnding === '2026-08-08')
    const v1 = aug8.find((r) => r.status === 'corrected')
    const v2 = aug8.find((r) => r.status === 'submitted')
    expect(v2?.correctsPeriodId).toBe(v1?.id)
    expect([v1?.payrollNumber, v2?.payrollNumber]).toEqual([18, 18])
    expect(
      ['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05', '2026-09-12'].map((we) => [
        period(P1.id, we).status,
        period(P1.id, we).payrollNumber,
      ]),
    ).toEqual([
      ['submitted', 19],
      ['submitted', 20],
      ['signed', 21],
      ['in_review', null],
      ['open', null],
    ])
    expect(P1.nextPayrollNumber).toBe(22)
  })

  it('project 1: 08-15 was rejected and 08-22 accepted', () => {
    const outcome = (we: string) =>
      db.submissions.find((s) => s.periodId === period(P1.id, we).id)?.outcome
    expect(outcome('2026-08-15')).toBe('rejected')
    expect(outcome('2026-08-22')).toBe('accepted')
  })

  it('project 2: 15 weeks, a no-work week, a signed week, an open week', () => {
    const rows = periodsOf(P2.id)
    expect(rows).toHaveLength(15)
    expect(period(P2.id, '2026-08-29')).toMatchObject({
      status: 'submitted',
      isNoWork: true,
      payrollNumber: 13,
    })
    expect(period(P2.id, '2026-09-05')).toMatchObject({ status: 'signed', payrollNumber: 14 })
    expect(period(P2.id, '2026-09-12')).toMatchObject({ status: 'open', payrollNumber: null })
  })

  it('project 3: 24 submitted weeks, the last one final', () => {
    const rows = periodsOf(P3.id)
    expect(rows).toHaveLength(24)
    expect(rows.every((r) => r.status === 'submitted')).toBe(true)
    expect(rows.filter((r) => r.isFinal).map((r) => r.weekEnding)).toEqual(['2026-02-28'])
  })

  it('has per-worker entries only in the six detailed weeks of project 1', () => {
    const withEntries = new Set(db.timeEntries.map((e) => e.periodId))
    const weeks = db.periods.filter((p) => withEntries.has(p.id)).map((p) => p.weekEnding)
    expect([...new Set(weeks)].sort()).toEqual([
      '2026-08-08',
      '2026-08-15',
      '2026-08-22',
      '2026-08-29',
      '2026-09-05',
      '2026-09-12',
    ])
    expect(
      db.periods.filter((p) => withEntries.has(p.id)).every((p) => p.projectId === P1.id),
    ).toBe(true)
  })
})

describe('week 2026-09-05, the intended findings', () => {
  const w = period(P1.id, '2026-09-05')
  const rows = db.timeEntries.filter((e) => e.periodId === w.id)
  const label = (pcId: string) => db.projectClassifications.find((r) => r.id === pcId)?.displayLabel

  it('has 12 workers in 13 rows, one worker in two classifications', () => {
    expect(rows).toHaveLength(13)
    expect(new Set(rows.map((r) => r.workerId)).size).toBe(12)
    const twice = rows.filter((r) => r.workerId === worker('Kowalski').id)
    expect(twice.map((r) => label(r.projectClassificationId)).sort()).toEqual([
      'Laborer – Group 1',
      'Operating Engineer – Class A',
    ])
  })

  it('DAY_OVER_24 and DAY_OVER_16: 26 hours for one worker on Wed Sep 2', () => {
    const kowalski = rows.filter((r) => r.workerId === worker('Kowalski').id)
    const wednesday = kowalski.reduce((sum, r) => sum + Number(r.days[3] ?? 0), 0)
    expect(wednesday).toBe(26)
  })

  it('WORKER_ADDRESS_MISSING and RATE_EXPIRED: Haddad and Walsh work only this week', () => {
    for (const last of ['Haddad', 'Walsh']) {
      const weeks = db.timeEntries
        .filter((e) => e.workerId === worker(last).id)
        .map((e) => db.periods.find((p) => p.id === e.periodId)?.weekEnding)
      expect(weeks, last).toEqual(['2026-09-05'])
    }
  })

  it('APPRENTICE_PCT_MISMATCH: Petrov is paid 80 % instead of 85 %', () => {
    const petrov = rows.find((r) => r.workerId === worker('Petrov').id)
    expect(petrov?.paidStRate).toBe('35.88')
  })

  it('FRINGE_NOT_ANNUALIZED: Walsh is on a plan with annual cost and no hours basis', () => {
    const plans = db.fringeAllocations
      .filter((a) => a.workerId === worker('Walsh').id)
      .map((a) => db.fringePlans.find((p) => p.id === a.fringePlanId))
    expect(plans.some((p) => p?.annualCost !== null && p?.annualHoursBasis === null)).toBe(true)
    const others = db.fringeAllocations.filter((a) => a.workerId !== worker('Walsh').id)
    expect(
      others.every((a) => db.fringePlans.find((p) => p.id === a.fringePlanId)?.annualCost === null),
    ).toBe(true)
  })

  it('gives every worker a fringe allocation (no FRINGE_NO_ALLOCATION)', () => {
    for (const r of rows) {
      expect(db.fringeAllocations.some((a) => a.workerId === r.workerId)).toBe(true)
    }
  })
})
