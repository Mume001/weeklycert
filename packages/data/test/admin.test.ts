// The platform admin over the fixtures (spec/03 §4.10, session N).
import { beforeEach, describe, expect, it } from 'vitest'
import { getRepositories } from '../src/index.ts'
import { resetMockDb } from '../src/mock/db.ts'

const repos = getRepositories()
const SUPER = '01922000-0000-7000-8000-000000000007'
const OWNER = '01922000-0000-7000-8000-000000000001'
const HUDSON = '01921000-0000-7000-8000-000000000001'

beforeEach(resetMockDb)

describe('overview and companies', () => {
  it('counts the companies, who pays, and the queue', async () => {
    expect(await repos.admin.health()).toEqual({
      tenants: 2,
      // Hudson pays; Riverside is on its trial.
      activeSubscriptions: 1,
      mrr: '79.00',
      reportsThisWeek: expect.any(Number),
      jobs: { waiting: 1, running: 1, failed: 1 },
    })
  })

  it('searches by name or slug', async () => {
    expect((await repos.admin.tenants('river')).map((t) => t.slug)).toEqual([
      'riverside-mechanical',
    ])
    expect(await repos.admin.tenants('nobody')).toEqual([])
  })
})

describe('support access (02 §1, 11 §2)', () => {
  const NOW = '2026-09-15T12:41:00.000Z'
  const plus = (minutes: number) => new Date(Date.parse(NOW) + minutes * 60_000).toISOString()

  it('needs the platform admin and a reason, and the owner sees it', async () => {
    await expect(repos.admin.startSupportAccess(HUDSON, OWNER, 'look', NOW)).rejects.toThrow()
    await expect(repos.admin.startSupportAccess(HUDSON, SUPER, '  ', NOW)).rejects.toThrow()
    const until = await repos.admin.startSupportAccess(HUDSON, SUPER, 'Ticket 12: grid totals', NOW)
    expect(until).toBe(plus(30))
    const log = await repos.settings.auditLog(HUDSON, { kind: 'support' })
    expect(log.rows[0]).toMatchObject({ action: 'support.start', detail: 'Ticket 12: grid totals' })
    await repos.admin.endSupportAccess(HUDSON, SUPER, plus(5))
    expect(await repos.admin.supportAccess(HUDSON, SUPER, plus(5))).toBeNull()
  })

  it('still runs at 29 minutes, is over at 30, and the log says when it ended', async () => {
    const until = await repos.admin.startSupportAccess(HUDSON, SUPER, 'Ticket 13', NOW)
    expect(await repos.admin.supportAccess(HUDSON, SUPER, plus(29))).toBe(until)
    expect(await repos.admin.supportAccess(HUDSON, SUPER, plus(30))).toBeNull()
    // Once closed it stays closed, and the end is logged once, at the 30th minute.
    expect(await repos.admin.supportAccess(HUDSON, SUPER, plus(31))).toBeNull()
    const ends = (await repos.settings.auditLog(HUDSON, { kind: 'support' })).rows.filter(
      (r) => r.action === 'support.end',
    )
    expect(ends.map((r) => r.at)).toEqual([until])
  })
})

describe('jobs, wage schedules, classifications', () => {
  it('retries or discards a failed job', async () => {
    const failed = (await repos.admin.jobs()).find((j) => j.state === 'failed')
    if (!failed) throw new Error('fixture')
    await expect(repos.admin.retryJob(failed.id, OWNER)).rejects.toThrow()
    await repos.admin.retryJob(failed.id, SUPER)
    expect((await repos.admin.jobs()).find((j) => j.id === failed.id)?.state).toBe('created')
  })

  it('approves a schedule waiting for review, once', async () => {
    const waiting = (await repos.admin.wageSchedules()).find((w) => w.state === 'needs_review')
    if (!waiting) throw new Error('fixture')
    await repos.admin.approveWageSchedule(waiting.id, SUPER)
    expect((await repos.admin.wageSchedules()).find((w) => w.id === waiting.id)?.state).toBe(
      'approved',
    )
    await expect(repos.admin.approveWageSchedule(waiting.id, SUPER)).rejects.toThrow()
  })

  it('shows the list and its changes against the official page', async () => {
    expect(await repos.admin.classifications()).toMatchObject({ count: 5, removed: [] })
  })
})
