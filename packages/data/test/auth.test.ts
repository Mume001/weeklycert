// Sign-in in the mock (spec/03 §4.1, spec/11 §3, spec/19 §4, session M).
import { beforeEach, describe, expect, it } from 'vitest'
import { RegisterInputSchema } from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'
import { mockRepositories } from '../src/mock/index.ts'

const repos = getRepositories()
const OWNER = '01922000-0000-7000-8000-000000000001'

beforeEach(resetMockDb)

describe('sign-in (03 §4.1)', () => {
  it('lets a fixture user in with the demo password, and asks two-factor where it is on', async () => {
    expect(await repos.auth.signIn(' Owner@Hudson-Electric.test ', 'demo')).toEqual({
      ok: true,
      userId: OWNER,
      role: 'owner',
      needsTwoFactor: true,
    })
    const payroll = await repos.auth.signIn('payroll@hudson-electric.test', 'demo')
    expect(payroll).toMatchObject({ ok: true, role: 'payroll', needsTwoFactor: false })
  })

  it('answers a wrong password and an unknown email the same way', async () => {
    const wrongPassword = await repos.auth.signIn('owner@hudson-electric.test', 'nope')
    const unknown = await repos.auth.signIn('nobody@example.test', 'demo')
    expect(wrongPassword).toEqual({ ok: false, error: 'mismatch' })
    expect(unknown).toEqual(wrongPassword)
  })

  it('locks the email for 15 minutes after 10 failures (11 §3)', async () => {
    for (let i = 0; i < 9; i++) await repos.auth.signIn('owner@hudson-electric.test', 'x')
    const tenth = await repos.auth.signIn('owner@hudson-electric.test', 'x')
    expect(tenth).toEqual({ ok: false, error: 'locked', until: '2026-09-15T12:56:00.000Z' })
    // Locked means locked, even with the right password.
    expect((await repos.auth.signIn('owner@hudson-electric.test', 'demo')).ok).toBe(false)
  })
})

describe('links that would be emailed', () => {
  it('opening the magic link does not use it; the click does, once (03 §4.1)', async () => {
    const token = await repos.auth.issueToken('magic', 'signer@hudson-electric.test')
    expect(await repos.auth.peekToken('magic', token)).toEqual({
      email: 'signer@hudson-electric.test',
    })
    expect(await repos.auth.peekToken('magic', token)).not.toBeNull()
    expect(await repos.auth.consumeToken('magic', token)).toMatchObject({ role: 'signer' })
    expect(await repos.auth.consumeToken('magic', token)).toBeNull()
    expect(await repos.auth.peekToken('magic', token)).toBeNull()
    // A token of one kind is not good for another.
    const reset = await repos.auth.issueToken('reset', 'signer@hudson-electric.test')
    expect(await repos.auth.peekToken('magic', reset)).toBeNull()
  })

  it('registers without a company when invited, and the account waits for its email', async () => {
    const input = RegisterInputSchema.parse({
      name: 'Ana Lee',
      email: 'ana@example.test',
      password: 'long enough password',
      company: '',
      terms: true,
    })
    expect(await repos.auth.register(input, false)).toEqual({ ok: false, error: 'companyRequired' })
    const done = await repos.auth.register(input, true)
    if (!done.ok) throw new Error('refused')
    expect(await repos.auth.signIn('ana@example.test', 'demo')).toEqual({
      ok: false,
      error: 'unverified',
      email: 'ana@example.test',
    })
    expect(await repos.auth.register(input, true)).toEqual({ ok: false, error: 'emailTaken' })
    await repos.auth.consumeToken('verify', done.token)
    expect(db.pendingAccounts).toEqual([])
    // Confirmed: the account exists, still in no company.
    const signedIn = await repos.auth.signIn('ana@example.test', 'demo')
    expect(signedIn).toMatchObject({ ok: true, role: null, needsTwoFactor: false })
    if (signedIn.ok) expect(await repos.tenants.listForUser(signedIn.userId)).toEqual([])
    expect(RegisterInputSchema.safeParse({ ...input, password: 'short' }).success).toBe(false)
  })

  it('reads an invitation by its token, and nothing for another', async () => {
    await repos.settings.invite('01921000-0000-7000-8000-000000000001', OWNER, {
      email: 'new@example.test',
      role: 'payroll',
    })
    const id = db.invitations[0]?.id ?? ''
    expect(await repos.auth.invitation(id)).toEqual({
      email: 'new@example.test',
      inviterName: 'Mirza Hodzic',
      companyName: 'Hudson Electric LLC',
      role: 'payroll',
    })
    expect(await repos.auth.invitation('nope')).toBeNull()
  })
})

describe('the account (03 §4.2)', () => {
  it('lists the sessions and signs out everywhere but this device', async () => {
    const before = await repos.auth.account(OWNER)
    expect(before?.sessions.map((s) => s.current)).toEqual([true, false])
    await repos.auth.signOutEverywhere(OWNER)
    expect((await repos.auth.account(OWNER))?.sessions).toHaveLength(1)
  })
})

describe('the demo sign-in works only with DATA_SOURCE=mock (19 §4)', () => {
  // The mock called straight, as a real data source that reached it would.
  const direct = mockRepositories.auth
  const withSource = async <T>(source: string | undefined, run: () => Promise<T>) => {
    const was = process.env.DATA_SOURCE
    if (source === undefined) delete process.env.DATA_SOURCE
    else process.env.DATA_SOURCE = source
    try {
      return await run()
    } finally {
      process.env.DATA_SOURCE = was
    }
  }

  it('lets "demo" and six digits through in the mock', async () => {
    expect((await direct.signIn('payroll@hudson-electric.test', 'demo')).ok).toBe(true)
    expect(await direct.verifyTwoFactor('123 456')).toBe(true)
    expect(await direct.checkPassword(OWNER, 'demo')).toBe(true)
  })

  for (const source of ['postgres', 'drizzle', undefined]) {
    it(`refuses both with DATA_SOURCE=${source ?? '(unset)'}`, async () => {
      await withSource(source, async () => {
        expect(await direct.signIn('payroll@hudson-electric.test', 'demo')).toEqual({
          ok: false,
          error: 'mismatch',
        })
        expect(await direct.verifyTwoFactor('123456')).toBe(false)
        expect(await direct.checkPassword(OWNER, 'demo')).toBe(false)
      })
    })
  }
})
