import { afterEach, describe, expect, it } from 'vitest'
import { demoUserIdForRole, getRepositories, NotYetBuiltError } from '../src/index.ts'
import { DEFAULT_MOCK_TODAY } from '../src/mock/clock.ts'
import { delayFor } from '../src/mock/delay.ts'

const repos = getRepositories()

afterEach(() => {
  delete process.env.DATA_SOURCE
  delete process.env.MOCK_TODAY
})

describe('getRepositories', () => {
  it('returns the mock when DATA_SOURCE is mock or unset', () => {
    process.env.DATA_SOURCE = 'mock'
    expect(getRepositories()).toBe(repos)
  })

  it('refuses any other data source in the mock phase', () => {
    process.env.DATA_SOURCE = 'drizzle'
    expect(() => getRepositories()).toThrow(/mock is the only data source/)
  })
})

describe('clock and delay', () => {
  it('uses MOCK_TODAY, 2026-09-15 by default', () => {
    expect(DEFAULT_MOCK_TODAY).toBe('2026-09-15')
    expect(repos.today()).toBe('2026-09-15')
    process.env.MOCK_TODAY = '2026-10-01'
    expect(repos.today()).toBe('2026-10-01')
  })

  it('rejects a malformed MOCK_TODAY', () => {
    process.env.MOCK_TODAY = 'tomorrow'
    expect(() => repos.today()).toThrow(/MOCK_TODAY/)
  })

  it('delays 120 to 250 ms, the same for the same call', () => {
    const saved = process.env.MOCK_DELAY_MS
    delete process.env.MOCK_DELAY_MS
    for (const label of ['tenants.getBySlug', 'projects.openWeeks', 'users.get', 'x']) {
      const ms = delayFor(label)
      expect(ms).toBeGreaterThanOrEqual(120)
      expect(ms).toBeLessThanOrEqual(250)
      expect(delayFor(label)).toBe(ms)
    }
    process.env.MOCK_DELAY_MS = saved
  })
})

describe('tenants and users', () => {
  it('gives the owner one company with two active projects', async () => {
    const list = await repos.tenants.listForUser(demoUserIdForRole('owner'))
    expect(list).toEqual([
      expect.objectContaining({ slug: 'hudson-electric', role: 'owner', activeProjects: 2 }),
    ])
  })

  it('gives the bookkeeper two companies', async () => {
    const list = await repos.tenants.listForUser(demoUserIdForRole('bookkeeper'))
    expect(list.map((t) => [t.slug, t.role])).toEqual([
      ['hudson-electric', 'bookkeeper'],
      ['riverside-mechanical', 'bookkeeper'],
    ])
  })

  it('finds a tenant by slug with its owner', async () => {
    const t = await repos.tenants.getBySlug('hudson-electric')
    expect(t).toMatchObject({
      legalName: 'Hudson Electric LLC',
      status: 'active',
      weekEndsOn: 6,
      owner: { name: 'Mirza Hodzic' },
    })
    expect(await repos.tenants.getBySlug('nope')).toBeNull()
  })

  it('shows Riverside on a trial ending Sep 24', async () => {
    const t = await repos.tenants.getBySlug('riverside-mechanical')
    expect([t?.status, t?.trialEndsAt]).toEqual(['trial', '2026-09-24'])
  })

  it('knows the demo users', async () => {
    const u = await repos.users.get(demoUserIdForRole('signer'))
    expect(u?.name).toBe('Ray Hodzic')
  })
})

describe('open weeks (spec/19 §4: exactly three)', () => {
  it('lists 09-05 and 09-12 on project 1 and 09-12 on project 2', async () => {
    const t = await repos.tenants.getBySlug('hudson-electric')
    if (!t) throw new Error('fixture')
    const open = await repos.projects.openWeeks(t.id)
    expect(open.today).toBe('2026-09-15')
    expect(open.currentWeekEnding).toBe('2026-09-19')
    expect(open.activeProjects.map((p) => [p.name, p.openWeeks])).toEqual([
      ['Dutchess County Courthouse Lighting', ['2026-09-05', '2026-09-12']],
      ['Kingston WTP Electrical Upgrade', ['2026-09-12']],
    ])
  })
})

describe('later sessions', () => {
  it('throws NotYetBuiltError instead of pretending', async () => {
    // The grid is built (session C); the dashboard is not (03 §5 item 9).
    await expect(repos.dashboard.get('x')).rejects.toBeInstanceOf(NotYetBuiltError)
    await expect(repos.weeks.review('x', '2026-09-12')).rejects.toBeInstanceOf(NotYetBuiltError)
  })
})
