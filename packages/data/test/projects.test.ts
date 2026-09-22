// Projects over the fixtures (spec/03 §4.4, session F). Every number here is
// one spec/19 §4 fixed or one spec/03 asks for, measured rather than assumed.
import { addDays } from '@wc/core'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ProjectInputSchema,
  ProjectRowDTOSchema,
  ProjectTimelineDTOSchema,
} from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { resetMockDb } from '../src/mock/db.ts'
import { resetWeekEdits, weekGrid } from '../src/mock/week-grid.ts'

const repos = getRepositories()
const TENANT = '01921000-0000-7000-8000-000000000001'
const OTHER_TENANT = '01921000-0000-7000-8000-000000000002'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const KINGSTON = '01924000-0000-7000-8000-000000000002'
const BEACON = '01924000-0000-7000-8000-000000000003'
const IRONWORKER_P1 = '01926000-0000-7000-8000-000000000003'
const WIREMAN_P1 = '01926000-0000-7000-8000-000000000001'
const LABORER_P2 = '01926000-0000-7000-8000-000000000008'

beforeEach(() => {
  resetMockDb()
  resetWeekEdits()
})

function input(over: Partial<Record<string, unknown>> = {}) {
  return ProjectInputSchema.parse({
    name: 'Newburgh Library Lighting',
    prcNumber: '2026007777',
    awardingBody: 'City of Newburgh',
    ourRole: 'sub',
    generalContractor: 'Hudson Valley Builders',
    projectNumber: '',
    county: 'Orange',
    startDate: '2026-08-31',
    federallyFunded: false,
    federalWdNumber: '',
    federalWdMod: '',
    expectedEndDate: '',
    siteAddress: '',
    workPauses: [],
    retentionYears: '6',
    status: 'draft',
    ...over,
  })
}

async function timeline(projectId: string) {
  const t = await repos.projects.timeline(TENANT, projectId)
  if (!t) throw new Error('fixture')
  return t
}

describe('the list', () => {
  it('shows the two active projects by default, in the shape of spec/19 §3', async () => {
    const rows = await repos.projects.list(TENANT)
    expect(rows.map((r) => r.name)).toEqual([
      'Dutchess County Courthouse Lighting',
      'Kingston WTP Electrical Upgrade',
    ])
    for (const row of rows) expect(ProjectRowDTOSchema.safeParse(row).success).toBe(true)
  })

  it('puts the completed project under Closed', async () => {
    const rows = await repos.projects.list(TENANT, { status: 'closed' })
    expect(rows.map((r) => [r.name, r.status, r.nextDeadline])).toEqual([
      ['Beacon HS Fire Alarm Replacement', 'completed', null],
    ])
    expect(await repos.projects.list(TENANT, { status: 'paused' })).toEqual([])
  })

  it('counts the 30-day deadline from the last accepted submission (spec/05 §2)', async () => {
    const rows = await repos.projects.list(TENANT)
    expect(rows.map((r) => r.nextDeadline)).toEqual(['2026-09-25', '2026-10-02'])
  })

  it('?open=1: projects with an open week, the oldest open week first (spec/03 §4.4)', async () => {
    const rows = await repos.projects.list(TENANT, { openOnly: true })
    expect(rows.map((r) => [r.name, r.oldestOpenWeek?.weekEnding])).toEqual([
      ['Dutchess County Courthouse Lighting', '2026-09-05'],
      ['Kingston WTP Electrical Upgrade', '2026-09-12'],
    ])
    // 09-05 carries the three errors of spec/19 §4.
    expect(rows[0]?.oldestOpenWeek?.displayStatus).toBe('needs_attention')
    expect(rows[1]?.oldestOpenWeek?.noEntries).toBe(true)
  })

  it('counts the findings of the open weeks, 3 errors and 3 warnings on 09-05 among them', async () => {
    const [dutchess] = await repos.projects.list(TENANT)
    const inReview = weekGrid(DUTCHESS, '2026-09-05').findings
    const open = weekGrid(DUTCHESS, '2026-09-12').findings
    const counted = (f: { severity: string }[]) => f.filter((x) => x.severity !== 'info').length
    expect(counted(inReview)).toBe(6)
    expect(dutchess?.openFindings).toBe(counted(inReview) + counted(open))
  })

  it('never shows another company', async () => {
    expect(await repos.projects.list(OTHER_TENANT)).toEqual([])
    expect(await repos.projects.timeline(OTHER_TENANT, DUTCHESS)).toBeNull()
    expect(await repos.projects.form(OTHER_TENANT, DUTCHESS)).toBeNull()
    expect(await repos.projects.classifications(OTHER_TENANT, DUTCHESS)).toBeNull()
  })
})

describe('the timeline has no gaps (spec/03 §4.4)', () => {
  it.each([
    [DUTCHESS, 23, '2026-04-11'],
    [KINGSTON, 15, '2026-06-06'],
    [BEACON, 24, '2025-09-20'],
  ])('%s: %i weeks from %s, seven days apart', async (id, count, first) => {
    const t = await timeline(id)
    expect(ProjectTimelineDTOSchema.safeParse(t).success).toBe(true)
    expect(t.weeks).toHaveLength(count)
    expect(t.weeks.at(-1)?.weekEnding).toBe(first)
    t.weeks.slice(1).forEach((w, i) => {
      expect(w.weekEnding).toBe(addDays(t.weeks[i]?.weekEnding ?? '', -7))
    })
  })

  it('numbers unsigned weeks in the order they will be signed: #22, then #23', async () => {
    const t = await timeline(DUTCHESS)
    const byWeek = new Map(t.weeks.map((w) => [w.weekEnding, w]))
    expect(byWeek.get('2026-08-29')).toMatchObject({ payrollNumber: 21, locked: true })
    expect(byWeek.get('2026-09-05')).toMatchObject({
      payrollNumber: null,
      expectedPayrollNumber: 22,
    })
    expect(byWeek.get('2026-09-12')).toMatchObject({
      payrollNumber: null,
      expectedPayrollNumber: 23,
    })
    // Payroll numbers 1 to 21 without a hole.
    const numbers = t.weeks.flatMap((w) => (w.payrollNumber === null ? [] : [w.payrollNumber]))
    expect(numbers.sort((a, b) => a - b)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1))
  })

  it('shows the correction of 08-08 as the second version, and the in-review week with its findings', async () => {
    const t = await timeline(DUTCHESS)
    const byWeek = new Map(t.weeks.map((w) => [w.weekEnding, w]))
    expect(byWeek.get('2026-08-08')).toMatchObject({ versions: 2, displayStatus: 'submitted' })
    expect(byWeek.get('2026-08-15')?.displayStatus).toBe('rejected')
    expect(byWeek.get('2026-09-05')?.findings).toEqual({ hard: 3, soft: 3 })
  })

  it('marks the week without a single hour, and the no-work week, apart from each other', async () => {
    const t = await timeline(KINGSTON)
    const byWeek = new Map(t.weeks.map((w) => [w.weekEnding, w]))
    expect(byWeek.get('2026-08-29')).toMatchObject({ isNoWork: true, noEntries: false })
    expect(byWeek.get('2026-09-12')).toMatchObject({ isNoWork: false, noEntries: true })
  })

  it('opens a week that has no period yet and marks it as a no-work week', async () => {
    const created = await repos.projects.create(TENANT, input())
    if (!created.ok) throw new Error('create')
    const before = await timeline(created.id)
    expect(before.weeks.map((w) => [w.weekEnding, w.periodId, w.noEntries])).toEqual([
      ['2026-09-12', null, true],
      ['2026-09-05', null, true],
    ])
    expect(before.weeks.map((w) => w.expectedPayrollNumber)).toEqual([2, 1])

    const periodId = await repos.weeks.open(TENANT, created.id, '2026-09-05')
    await repos.weeks.markNoWork(periodId)
    const after = await timeline(created.id)
    expect(after.weeks[1]).toMatchObject({ periodId, isNoWork: true, noEntries: false })
    // Opening it twice gives the same period, not a second one.
    expect(await repos.weeks.open(TENANT, created.id, '2026-09-05')).toBe(periodId)
  })

  it('reports a work pause as a week with no work', async () => {
    const created = await repos.projects.create(
      TENANT,
      input({ workPauses: [{ from: '2026-09-06', to: '2026-09-12', reason: 'Steel delivery' }] }),
    )
    if (!created.ok) throw new Error('create')
    const t = await timeline(created.id)
    expect(t.weeks[0]).toMatchObject({ weekEnding: '2026-09-12', isNoWork: true, noEntries: false })
  })
})

describe('the form', () => {
  it('opens a new project with six years of records and the company week end', async () => {
    const form = await repos.projects.form(TENANT, null)
    expect(form?.values.retentionYears).toBe('6')
    expect(form?.weekEndsOn).toBe(6)
    expect(form?.awardingBodies).toContain('Dutchess County')
  })

  it('refuses a PRC and contract number the company already uses, naming the project', async () => {
    const result = await repos.projects.create(TENANT, input({ prcNumber: '2010008390' }))
    expect(result).toEqual({
      ok: false,
      errors: {
        prcNumber: {
          code: 'prcTaken',
          values: { Project: 'Dutchess County Courthouse Lighting' },
        },
      },
    })
    // The same PRC under its own contract number is a different job.
    const other = await repos.projects.create(
      TENANT,
      input({ prcNumber: '2010008390', projectNumber: 'C-2' }),
    )
    expect(other.ok).toBe(true)
  })

  it('saves a project under its own PRC and lets it keep that PRC on the next save', async () => {
    const form = await repos.projects.form(TENANT, KINGSTON)
    if (!form) throw new Error('fixture')
    expect(form.values).toMatchObject({
      federallyFunded: true,
      federalWdNumber: 'NY20260014',
      federalWdMod: '3',
    })
    const saved = await repos.projects.update(TENANT, KINGSTON, {
      ...form.values,
      county: 'Ulster',
    })
    expect(saved).toEqual({ ok: true, id: KINGSTON })
  })

  it('checks what the form checks, with codes and no English (spec/15 §3)', () => {
    const bad = ProjectInputSchema.safeParse({
      ...input(),
      name: ' ',
      prcNumber: '12345',
      federallyFunded: true,
      federalWdNumber: '',
      expectedEndDate: '2026-01-01',
      retentionYears: '5',
      workPauses: [{ from: '2026-09-10', to: '2026-09-01', reason: '' }],
    })
    expect(bad.success).toBe(false)
    const codes = Object.fromEntries(
      (bad.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]),
    )
    expect(codes).toEqual({
      name: 'nameRequired',
      prcNumber: 'prcFormat',
      federalWdNumber: 'wdRequired',
      expectedEndDate: 'endBeforeStart',
      retentionYears: 'retentionMin',
      'workPauses.0.to': 'pauseOrder',
    })
  })
})

describe('classifications and rates', () => {
  it('warns that Ironworker has no rate for the current week (spec/03 §4.4)', async () => {
    const c = await repos.projects.classifications(TENANT, DUTCHESS)
    expect(c?.currentWeekEnding).toBe('2026-09-12')
    expect(c?.missingForCurrentWeek.map((m) => m.officialLabel)).toEqual([
      'Ironworker – Structural',
    ])
    expect(c?.rows).toHaveLength(5)
  })

  it('adds a new version from a date and never overwrites the old rate', async () => {
    const result = await repos.projects.addRateVersion(TENANT, DUTCHESS, {
      rowId: IRONWORKER_P1,
      baseRate: '59.10',
      supplement: '50.85',
      otCodes: 'B, E1, V',
      effectiveFrom: '2026-07-01',
    })
    expect(result).toEqual({ ok: true })

    const c = await repos.projects.classifications(TENANT, DUTCHESS)
    const iron = c?.rows.filter((r) => r.officialLabel === 'Ironworker – Structural')
    expect(iron?.map((r) => [r.baseRate, r.supplement, r.effectiveFrom, r.effectiveTo])).toEqual([
      ['59.10', '50.85', '2026-07-01', null],
      ['57.40', '49.60', '2025-07-01', '2026-06-30'],
    ])
    expect(c?.missingForCurrentWeek).toEqual([])
    // The week that raised RATE_EXPIRED now finds its rate.
    const codes = weekGrid(DUTCHESS, '2026-09-05').findings.map((f) => f.code)
    expect(codes).not.toContain('RATE_EXPIRED')
  })

  it('closes the running version the day before the new one, keeping its rate', async () => {
    await repos.projects.addRateVersion(TENANT, KINGSTON, {
      rowId: LABORER_P2,
      baseRate: '43.00',
      supplement: '32.10',
      otCodes: 'B2 F',
      effectiveFrom: '2026-09-13',
    })
    const c = await repos.projects.classifications(TENANT, KINGSTON)
    const laborer = c?.rows.filter((r) => r.officialLabel === 'Laborer – Group 1')
    expect(laborer?.map((r) => [r.baseRate, r.effectiveFrom, r.effectiveTo, r.isLatest])).toEqual([
      ['43.00', '2026-09-13', null, true],
      ['42.10', '2026-07-01', '2026-09-12', false],
    ])
  })

  it('refuses a version that does not start after the current one', async () => {
    const result = await repos.projects.addRateVersion(TENANT, KINGSTON, {
      rowId: LABORER_P2,
      baseRate: '43.00',
      supplement: '32.10',
      otCodes: 'B2',
      effectiveFrom: '2026-07-01',
    })
    expect(result).toEqual({
      ok: false,
      errors: { effectiveFrom: { code: 'versionAfter', values: { date: '2026-07-01' } } },
    })
  })

  it('locks the rate a signed week uses, but not its label', async () => {
    const c = await repos.projects.classifications(TENANT, DUTCHESS)
    expect(c?.rows.find((r) => r.id === WIREMAN_P1)?.usedBySignedWeek).toBe(true)
    const edit = {
      rowId: WIREMAN_P1,
      displayLabel: 'Wireman',
      apprenticeRatio: '',
      baseRate: '63.20',
      supplement: '52.40',
      otCodes: 'A, W, R',
    }
    expect(await repos.projects.editClassification(TENANT, DUTCHESS, edit)).toEqual({ ok: true })
    expect(
      await repos.projects.editClassification(TENANT, DUTCHESS, { ...edit, baseRate: '64.00' }),
    ).toEqual({ ok: false, errors: { baseRate: { code: 'rateLocked' } } })
  })

  it('adds a classification from the official list once', async () => {
    const created = await repos.projects.create(TENANT, input())
    if (!created.ok) throw new Error('create')
    const add = {
      classificationId: '01925000-0000-7000-8000-000000000001',
      displayLabel: '',
      baseRate: '63.2',
      supplement: '52.40',
      otCodes: 'a w r',
      effectiveFrom: '2026-07-01',
      apprenticeRatio: '1:1',
    }
    expect(await repos.projects.addClassification(TENANT, created.id, add)).toEqual({ ok: true })
    const c = await repos.projects.classifications(TENANT, created.id)
    expect(c?.rows[0]).toMatchObject({
      displayLabel: 'Electrician – Inside Wireman',
      baseRate: '63.20',
      otCodes: ['A', 'W', 'R'],
      apprenticeRatio: '1:1',
      source: 'manual',
    })
    expect(await repos.projects.addClassification(TENANT, created.id, add)).toEqual({
      ok: false,
      errors: { classificationId: { code: 'alreadyOnProject' } },
    })
  })
})
