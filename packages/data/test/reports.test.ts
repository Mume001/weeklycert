// Review, signature and filing over the fixtures (spec/03 §4.5, session E).
// The state machine here is spec/04 §7.1, and every step of it is checked.
import { beforeEach, describe, expect, it } from 'vitest'
import { ReportsDTOSchema, ReviewDTOSchema } from '../src/dto/index.ts'
import { demoUserIdForRole, getRepositories } from '../src/index.ts'
import { resetMockDb } from '../src/mock/db.ts'
import { resetWeekEdits, weekGrid } from '../src/mock/week-grid.ts'

const repos = getRepositories()
const TENANT = '01921000-0000-7000-8000-000000000001'
const OTHER_TENANT = '01921000-0000-7000-8000-000000000002'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const KINGSTON = '01924000-0000-7000-8000-000000000002'
const OPEN_WEEK = '2026-09-12'
const IN_REVIEW = '2026-09-05'
const SIGNED_WEEK = '2026-08-29'
const REJECTED_WEEK = '2026-08-15'

beforeEach(() => {
  resetMockDb()
  resetWeekEdits()
})

async function review(projectId: string, weekEnding: string) {
  const dto = await repos.weeks.review(TENANT, projectId, weekEnding)
  if (!dto) throw new Error('fixture')
  return dto
}

async function reportsOf(projectId: string, weekEnding: string) {
  const dto = await repos.reports.list(TENANT, projectId, weekEnding)
  if (!dto) throw new Error('fixture')
  expect(ReportsDTOSchema.safeParse(dto).success).toBe(true)
  return dto
}

describe('the review screen', () => {
  it('has the shape of spec/19 §3 and one line per classification worked', async () => {
    const dto = await review(DUTCHESS, IN_REVIEW)
    expect(ReviewDTOSchema.safeParse(dto).success).toBe(true)
    // Kowalski works two classifications that week (spec/19 §4), so two lines.
    const twoLines = dto.workers.filter((w) => w.lines.length === 2)
    expect(twoLines.map((w) => w.workerName)).toEqual(['Kowalski, Pete'])
    expect(dto.workers.every((w) => w.lines.length >= 1)).toBe(true)
  })

  it('carries the findings of the week, three errors and three warnings', async () => {
    const dto = await review(DUTCHESS, IN_REVIEW)
    const by = (severity: string) => dto.findings.filter((f) => f.severity === severity).length
    expect([by('hard'), by('soft')]).toEqual([3, 3])
  })

  it('says whether the statement needs the apprentice and the fringe box (spec/05 §4.4)', async () => {
    const dto = await review(DUTCHESS, IN_REVIEW)
    expect(dto.hasApprentices).toBe(true)
    expect(dto.hasFringe).toBe(true)
  })

  it('moves an open week into review, and an edit puts it back (spec/04 §7.1)', async () => {
    const dto = await review(DUTCHESS, OPEN_WEEK)
    expect(dto.period.status).toBe('in_review')
    const row = weekGrid(DUTCHESS, OPEN_WEEK).rows[0]
    if (!row) throw new Error('fixture')
    await repos.weeks.patchCell(TENANT, dto.period.id, row.id, 1, '7')
    expect((await reportsOf(DUTCHESS, OPEN_WEEK)).period.status).toBe('open')
  })

  it('leaves a signed week as it is', async () => {
    expect((await review(DUTCHESS, SIGNED_WEEK)).period.status).toBe('signed')
    expect((await review(DUTCHESS, SIGNED_WEEK)).period.lockedReason).toBe('signed')
  })

  it('never shows another company', async () => {
    expect(await repos.weeks.review(OTHER_TENANT, DUTCHESS, OPEN_WEEK)).toBeNull()
    expect(await repos.reports.list(OTHER_TENANT, DUTCHESS, OPEN_WEEK)).toBeNull()
  })
})

describe('the payroll side the hours cannot know (spec/03 §4.5)', () => {
  it('takes gross for all work, deductions and net, and the engine uses them', async () => {
    const dto = await review(DUTCHESS, IN_REVIEW)
    const worker = dto.workers[0]
    if (!worker) throw new Error('fixture')
    expect(worker.hasPayroll).toBe(false)

    await repos.weeks.savePayroll(TENANT, dto.period.id, {
      workerId: worker.workerId,
      grossAllWork: '2600',
      netPay: '1800.25',
      deductions: [{ kind: 'federal_tax', label: '', amount: '499.75' }],
    })

    const after = await review(DUTCHESS, IN_REVIEW)
    const same = after.workers.find((w) => w.workerId === worker.workerId)
    expect(same).toMatchObject({
      hasPayroll: true,
      grossAllWork: '2600.00',
      netPay: '1800.25',
      deductionsTotal: '499.75',
    })
    expect(same?.deductions).toEqual([{ kind: 'federal_tax', label: null, amount: '499.75' }])
  })
})

describe('generating, signing and filing', () => {
  it('refuses to generate while a blocking finding is open (spec/05 §1)', async () => {
    const dto = await review(DUTCHESS, IN_REVIEW)
    await expect(repos.reports.generate(TENANT, dto.period.id)).rejects.toThrow(/blocking finding/)
  })

  it('generates a draft, reports progress, and signs the week (spec/04 §7.1)', async () => {
    const dto = await review(KINGSTON, OPEN_WEEK)
    expect(dto.findings.filter((f) => f.severity === 'hard')).toEqual([])

    const { reportId, version } = await repos.reports.generate(TENANT, dto.period.id)
    expect(version).toBe(1)
    expect((await reportsOf(KINGSTON, OPEN_WEEK)).period.status).toBe('generated')

    // The fake job runs out over the polls the screen makes (spec/19 §2).
    const first = await repos.reports.status(TENANT, reportId)
    expect(first).toMatchObject({ state: 'queued', progress: 50 })
    expect(await repos.reports.status(TENANT, reportId)).toMatchObject({
      state: 'done',
      progress: 100,
    })

    const signed = await repos.reports.sign(TENANT, dto.period.id, demoUserIdForRole('signer'), {
      fullName: 'Ray Hodzic',
      title: 'Vice President',
      phone: '845 555 0100',
      email: 'signer@hudson-electric.test',
      understood: true,
      reauth: 'demo',
    })
    // Kingston's next number is 15, and the project counter moves on with it.
    expect(signed.payrollNumber).toBe(15)

    const after = await reportsOf(KINGSTON, OPEN_WEEK)
    expect(after.period).toMatchObject({ status: 'signed', payrollNumber: 15 })
    expect(after.versions[0]).toMatchObject({ version: 1, status: 'final' })
    expect(after.versions[0]?.signedBy).toEqual({ name: 'Ray Hodzic', title: 'Vice President' })
    // The example file says in its name that it is an example (spec/19 §11).
    expect(after.versions[0]?.files[0]?.name).toMatch(/^EXAMPLE_2026001122_2026-09-12_v1\.xml$/)
  })

  it('refuses to sign a week that was never generated', async () => {
    const dto = await review(KINGSTON, OPEN_WEEK)
    await expect(
      repos.reports.sign(TENANT, dto.period.id, demoUserIdForRole('signer'), {
        fullName: 'Ray Hodzic',
        title: 'Vice President',
        phone: '',
        email: '',
        understood: true,
        reauth: 'demo',
      }),
    ).rejects.toThrow(/cannot be signed/)
  })

  it('records the filing, then what the portal answered (spec/05 §2)', async () => {
    const dto = await review(DUTCHESS, SIGNED_WEEK)
    await repos.reports.recordSubmission(TENANT, dto.period.id, {
      channel: 'ny_portal_manual',
      confirmationRef: 'A870123',
    })
    const filed = await reportsOf(DUTCHESS, SIGNED_WEEK)
    expect(filed.period.status).toBe('submitted')
    expect(filed.submissions[0]).toMatchObject({
      confirmationRef: 'A870123',
      outcome: 'pending',
      channel: 'ny_portal_manual',
    })

    const id = filed.submissions[0]?.id ?? ''
    await repos.reports.recordOutcome(TENANT, id, 'accepted', '')
    const accepted = await reportsOf(DUTCHESS, SIGNED_WEEK)
    expect(accepted.submissions[0]?.outcome).toBe('accepted')
    // An accepted filing is what the 30 day deadline counts from (spec/05 §2).
    const rows = await repos.projects.list(TENANT)
    expect(rows.find((r) => r.id === DUTCHESS)?.nextDeadline).toBe('2026-10-15')
  })

  it("keeps the portal's own words on a rejection", async () => {
    const dto = await reportsOf(DUTCHESS, REJECTED_WEEK)
    expect(dto.submissions[0]).toMatchObject({
      outcome: 'rejected',
      rejectionReason: expect.stringContaining('line 212'),
    })
  })

  it('a correction is a new week that carries the hours and the number', async () => {
    const dto = await review(DUTCHESS, SIGNED_WEEK)
    const { periodId } = await repos.reports.createCorrection(
      TENANT,
      dto.period.id,
      'Chen worked Saturday, not Friday.',
    )
    expect(periodId).not.toBe(dto.period.id)

    // The grid of that week now opens the correction, which is open again.
    const after = await review(DUTCHESS, SIGNED_WEEK)
    expect(after.period.id).toBe(periodId)
    expect(after.period.status).toBe('in_review')
    expect(after.period.payrollNumber).toBe(21)
    // Asking twice gives the same correction, never two.
    expect((await repos.reports.createCorrection(TENANT, dto.period.id, 'again')).periodId).toBe(
      periodId,
    )
  })

  it('serves the example file behind a download, and nothing else', async () => {
    const dto = await reportsOf(DUTCHESS, SIGNED_WEEK)
    const file = dto.versions[0]?.files[0]
    if (!file) throw new Error('fixture')
    const served = await repos.reports.file(TENANT, file.id)
    expect(served?.name).toBe(file.name)
    expect(served?.body).toContain('<!-- EXAMPLE. Made-up data, not a filing. -->')
    expect(await repos.reports.file(TENANT, 'nope:ny_xml')).toBeNull()
    // Another company cannot ask for this file by its id (spec/02 §4 rule 2).
    expect(await repos.reports.file(OTHER_TENANT, file.id)).toBeNull()
  })
})
