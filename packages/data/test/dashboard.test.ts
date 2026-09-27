// The dashboard and /firms over the fixtures (spec/03 §4.2 and §4.3, session K).
// Today is the mock's, 15 September 2026 (spec/19 §4), so every number here
// is fixed.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DashboardDTOSchema } from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'
import { resetWeekEdits } from '../src/mock/week-grid.ts'

const repos = getRepositories()
const HUDSON = '01921000-0000-7000-8000-000000000001'
const RIVERSIDE = '01921000-0000-7000-8000-000000000002'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const KINGSTON = '01924000-0000-7000-8000-000000000002'

beforeEach(() => {
  resetMockDb()
  resetWeekEdits()
})
afterEach(() => {
  delete process.env.MOCK_TODAY
})

describe('the deadlines (spec/03 §4.3 point 1, 05 §2)', () => {
  it('counts 30 days from the last accepted submission, nearest first', async () => {
    const dto = await repos.dashboard.get(HUDSON)
    expect(DashboardDTOSchema.safeParse(dto).success).toBe(true)
    expect(dto.deadlines.map((d) => [d.projectName, d.dueOn, d.daysLeft, d.level])).toEqual([
      ['Dutchess County Courthouse Lighting', '2026-09-25', 10, 'ok'],
      ['Kingston WTP Electrical Upgrade', '2026-10-02', 17, 'ok'],
    ])
    // The rejected week of 15 August is still owed; the signed ones are not filed yet.
    expect(dto.deadlines[0]?.unfiledWeeks).toEqual([
      '2026-08-15',
      '2026-08-29',
      '2026-09-05',
      '2026-09-12',
    ])
  })

  it('turns red the day after, and dark red past the 14 days of grace', async () => {
    process.env.MOCK_TODAY = '2026-09-26'
    let dutchess = (await repos.dashboard.get(HUDSON)).deadlines[0]
    expect([dutchess?.daysLeft, dutchess?.level]).toEqual([-1, 'late'])
    process.env.MOCK_TODAY = '2026-10-09'
    dutchess = (await repos.dashboard.get(HUDSON)).deadlines[0]
    expect([dutchess?.daysLeft, dutchess?.level]).toEqual([-14, 'late'])
    process.env.MOCK_TODAY = '2026-10-10'
    const dto = await repos.dashboard.get(HUDSON)
    dutchess = dto.deadlines[0]
    expect([dutchess?.daysLeft, dutchess?.level]).toEqual([-15, 'penalty'])
    expect(dto.cards.projectsPastDeadline).toBe(2)
  })

  it('gives the federal project a WH-347 row per unfiled week, 7 days after payday', async () => {
    const dto = await repos.dashboard.get(HUDSON)
    expect(
      dto.federal.map((f) => [f.weekEnding, f.payDate, f.payDateSource, f.dueOn, f.daysLeft]),
    ).toEqual([
      ['2026-09-05', '2026-09-11', 'company', '2026-09-18', 3],
      ['2026-09-12', '2026-09-18', 'company', '2026-09-25', 10],
    ])
    expect(dto.federal.every((f) => f.projectId === KINGSTON)).toBe(true)
  })

  it("takes the week's own pay date, and says so", async () => {
    const review = await repos.weeks.review(HUDSON, KINGSTON, '2026-09-12')
    if (!review) throw new Error('fixture')
    await repos.weeks.setPayDate(HUDSON, review.period.id, '2026-09-16')
    const row = (await repos.dashboard.get(HUDSON)).federal.find(
      (f) => f.weekEnding === '2026-09-12',
    )
    expect(row).toMatchObject({ payDate: '2026-09-16', payDateSource: 'week', dueOn: '2026-09-23' })
  })

  it("follows the company's days to payday", async () => {
    const tenant = db.tenants.find((t) => t.id === HUDSON)
    if (!tenant) throw new Error('fixture')
    tenant.settings.payLagDays = 5
    const [first] = (await repos.dashboard.get(HUDSON)).federal
    expect([first?.payDate, first?.dueOn]).toEqual(['2026-09-10', '2026-09-17'])
  })
})

describe('a project both state and federal: two filings, tracked apart (04 submissions)', () => {
  const SEP_5 = '2026-09-05'
  const nyUnfiled = async () =>
    (await repos.dashboard.get(HUDSON)).deadlines.find((d) => d.projectId === KINGSTON)
      ?.unfiledWeeks
  const federalWeeks = async () =>
    (await repos.dashboard.get(HUDSON)).federal.map((f) => f.weekEnding)

  it('the NYSDOL filing does not close the WH-347', async () => {
    const week = await repos.weeks.review(HUDSON, KINGSTON, SEP_5)
    if (!week) throw new Error('fixture')
    await repos.reports.recordSubmission(HUDSON, week.period.id, {
      channel: 'ny_portal_manual',
      confirmationRef: 'A870555',
    })
    expect(await nyUnfiled()).toEqual(['2026-09-12'])
    expect(await federalWeeks()).toEqual([SEP_5, '2026-09-12'])
    // The portal accepts it: the 30 days move, the WH-347 is still owed.
    const filed = await repos.reports.list(HUDSON, KINGSTON, SEP_5)
    const ny = filed?.submissions.find((s) => s.channel === 'ny_portal_manual')
    await repos.reports.recordOutcome(HUDSON, ny?.id ?? '', 'accepted', '')
    const dto = await repos.dashboard.get(HUDSON)
    expect(dto.deadlines.find((d) => d.projectId === KINGSTON)?.lastAcceptedAt).toBe('2026-09-15')
    expect(dto.federal.map((f) => f.weekEnding)).toEqual([SEP_5, '2026-09-12'])
  })

  it('the WH-347 does not close the NYSDOL week, nor move its 30 days', async () => {
    const week = await repos.weeks.review(HUDSON, KINGSTON, SEP_5)
    if (!week) throw new Error('fixture')
    await repos.reports.recordSubmission(HUDSON, week.period.id, {
      channel: 'wh347',
      confirmationRef: '',
      recipient: 'Ulster County DPW',
    })
    expect(await federalWeeks()).toEqual(['2026-09-12'])
    expect(await nyUnfiled()).toEqual([SEP_5, '2026-09-12'])
    const dto = await repos.dashboard.get(HUDSON)
    expect(dto.deadlines.find((d) => d.projectId === KINGSTON)?.lastAcceptedAt).toBe('2026-09-02')
    const list = await repos.reports.list(HUDSON, KINGSTON, SEP_5)
    expect(list?.submissions[0]).toMatchObject({ channel: 'wh347', recipient: 'Ulster County DPW' })
  })
})

describe('the cards and the lists', () => {
  it('has the four numbers of the fixtures', async () => {
    expect((await repos.dashboard.get(HUDSON)).cards).toEqual({
      projectsPastDeadline: 0,
      weeksWaitingForHours: 1,
      reportsWaitingForSignature: 0,
      filingsAcceptedThisYear: 43,
    })
  })

  it('puts a generated week in the signer queue, the oldest first (02 §5)', async () => {
    const dutchess = await repos.weeks.review(HUDSON, DUTCHESS, '2026-09-12')
    if (!dutchess) throw new Error('fixture')
    await repos.reports.generate(HUDSON, dutchess.period.id)
    const dto = await repos.dashboard.get(HUDSON)
    expect(dto.cards.reportsWaitingForSignature).toBe(1)
    expect(dto.signatureQueue).toEqual([
      {
        projectId: DUTCHESS,
        projectName: 'Dutchess County Courthouse Lighting',
        weekEnding: '2026-09-12',
      },
    ])
  })

  it('counts a correction waiting for its signature as that week', async () => {
    const filed = await repos.weeks.review(HUDSON, DUTCHESS, '2026-08-22')
    if (!filed) throw new Error('fixture')
    const { periodId } = await repos.reports.createCorrection(HUDSON, filed.period.id, 'x')
    await repos.reports.generate(HUDSON, periodId)
    expect((await repos.dashboard.get(HUDSON)).signatureQueue.map((q) => q.weekEnding)).toEqual([
      '2026-08-22',
    ])
  })

  it('lists the weeks to close with their findings, and the week without entries', async () => {
    const dto = await repos.dashboard.get(HUDSON)
    expect(dto.openWeeks.map((w) => [w.projectId, w.weekEnding, w.noEntries, w.hard])).toEqual([
      [DUTCHESS, '2026-09-05', false, 3],
      [DUTCHESS, '2026-09-12', false, 0],
      [KINGSTON, '2026-09-12', true, 0],
    ])
    expect(dto.missingWeeks.map((m) => [m.projectId, m.weekEnding])).toEqual([
      [KINGSTON, '2026-09-12'],
    ])
  })

  it('shows the last five reports, newest first', async () => {
    const recent = (await repos.dashboard.get(HUDSON)).recentReports
    expect(recent).toHaveLength(5)
    expect(recent[0]).toMatchObject({ projectId: KINGSTON, weekEnding: '2026-09-05' })
  })

  it('names the data health issues there are, and only those', async () => {
    expect((await repos.dashboard.get(HUDSON)).healthIssues).toEqual([
      { kind: 'rate_expired', count: 1 },
    ])
  })

  it('is one "Start here" card for a company without projects', async () => {
    const dto = await repos.dashboard.get(RIVERSIDE)
    expect(dto.isNew).toBe(true)
    expect(dto.deadlines).toEqual([])
  })
})

describe('/firms (spec/03 §4.2)', () => {
  it('gives the nearest deadline of a company and how its week stands', async () => {
    expect(await repos.dashboard.firmNext(HUDSON)).toEqual({
      projectName: 'Dutchess County Courthouse Lighting',
      dueOn: '2026-09-25',
      daysLeft: 10,
      level: 'ok',
      weekStatus: 'draft',
    })
    expect(await repos.dashboard.firmNext(RIVERSIDE)).toBeNull()
  })
})

/** Company A's first project again, with its weeks, hours and rates, as a new project. */
function cloneProject(sourceId: string, n: number): void {
  const source = db.projects.find((p) => p.id === sourceId)
  if (!source) throw new Error('fixture')
  const id = (group: string, i: number) =>
    `${group}-0000-7000-a${String(n).padStart(3, '0')}-${String(i).padStart(12, '0')}`
  const projectId = id('01924000', 0)
  db.projects.push({
    ...source,
    id: projectId,
    name: `${source.name} ${n}`,
    prcNumber: `29${String(n).padStart(8, '0')}`,
  })
  const rates = new Map<string, string>()
  db.projectClassifications
    .filter((c) => c.projectId === sourceId)
    .forEach((c, i) => {
      rates.set(c.id, id('01926000', i))
      db.projectClassifications.push({ ...c, id: id('01926000', i), projectId })
    })
  const periods = new Map<string, string>()
  db.periods
    .filter((p) => p.projectId === sourceId)
    .forEach((p, i) => {
      periods.set(p.id, id('01928000', i))
      db.periods.push({ ...p, id: id('01928000', i), projectId, correctsPeriodId: null })
    })
  db.timeEntries
    .filter((e) => periods.has(e.periodId))
    .forEach((e) => {
      db.timeEntries.push({
        ...e,
        periodId: periods.get(e.periodId) ?? e.periodId,
        projectClassificationId: rates.get(e.projectClassificationId) ?? e.projectClassificationId,
      })
    })
}

describe('speed (spec/03 §4.3: nothing loads slower than 500 ms on 50 projects)', () => {
  it('builds the dashboard of 50 projects well inside the budget', async () => {
    // One call on the fixtures first: the first call of a process also compiles
    // the engine, which a running server did long before (about 90 ms here).
    await repos.dashboard.get(HUDSON)
    for (let n = 1; n <= 48; n++) cloneProject(n % 2 ? DUTCHESS : KINGSTON, n)
    expect(db.projects.filter((p) => p.tenantId === HUDSON && p.status === 'active')).toHaveLength(
      50,
    )
    const started = performance.now()
    const dto = await repos.dashboard.get(HUDSON)
    const elapsed = performance.now() - started
    expect(dto.deadlines).toHaveLength(50)
    // 03 §4.3 counts the work, not the demo's fake latency (mock/delay.ts). Alone
    // this is about 130 ms; with the whole suite running at once, up to 370.
    expect(elapsed).toBeLessThan(500)
  })
})
