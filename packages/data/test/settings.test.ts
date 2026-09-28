// The settings of a company over the fixtures (spec/03 §4.9, session L).
import { beforeEach, describe, expect, it } from 'vitest'
import { InviteInputSchema, SmsInputSchema } from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'

const repos = getRepositories()
const HUDSON = '01921000-0000-7000-8000-000000000001'
const OWNER = '01922000-0000-7000-8000-000000000001'
const ADMIN = '01922000-0000-7000-8000-000000000002'
const BOOKKEEPER = '01922000-0000-7000-8000-000000000006'
const OWNER_MEMBERSHIP = '01923000-0000-7000-8000-000000000001'
const VIEWER_MEMBERSHIP = '01923000-0000-7000-8000-000000000005'
const BOOKKEEPER_MEMBERSHIP = '01923000-0000-7000-8000-000000000006'
const ALVAREZ = '01927000-0000-7000-8000-000000000001'

beforeEach(resetMockDb)

describe('team (03 §4.9)', () => {
  it('lists the members, the owner first', async () => {
    const dto = await repos.settings.team(HUDSON)
    expect(dto.members.map((m) => m.role)).toEqual([
      'owner',
      'admin',
      'signer',
      'payroll',
      'bookkeeper',
      'viewer',
    ])
    expect(dto.invitations).toEqual([])
  })

  it('invites once, refuses a member and a second invitation, and revokes', async () => {
    const input = InviteInputSchema.parse({ email: ' New@Example.test ', role: 'payroll' })
    expect(input.email).toBe('new@example.test')
    expect(await repos.settings.invite(HUDSON, ADMIN, input)).toEqual({ ok: true })
    expect(await repos.settings.invite(HUDSON, ADMIN, input)).toEqual({
      ok: false,
      error: 'alreadyInvited',
    })
    expect(
      await repos.settings.invite(HUDSON, ADMIN, {
        email: 'viewer@hudson-electric.test',
        role: 'admin',
      }),
    ).toEqual({ ok: false, error: 'alreadyMember' })
    const [invitation] = (await repos.settings.team(HUDSON)).invitations
    // Seven days from the mock's today (04 invitations).
    expect(invitation).toMatchObject({ email: 'new@example.test', expiresOn: '2026-09-22' })
    await repos.settings.revokeInvitation(HUDSON, ADMIN, invitation?.id ?? '')
    expect((await repos.settings.team(HUDSON)).invitations).toEqual([])
    expect(InviteInputSchema.safeParse({ email: 'nope', role: 'payroll' }).success).toBe(false)
    expect(InviteInputSchema.safeParse({ email: 'a@b.test', role: 'owner' }).success).toBe(false)
  })

  it('changes a role and removes a member, but never the owner', async () => {
    await repos.settings.changeRole(HUDSON, OWNER, VIEWER_MEMBERSHIP, 'payroll')
    const team = await repos.settings.team(HUDSON)
    expect(team.members.find((m) => m.membershipId === VIEWER_MEMBERSHIP)?.role).toBe('payroll')
    await expect(
      repos.settings.changeRole(HUDSON, ADMIN, OWNER_MEMBERSHIP, 'admin'),
    ).rejects.toThrow()
    await expect(repos.settings.removeMember(HUDSON, ADMIN, OWNER_MEMBERSHIP)).rejects.toThrow()
    await repos.settings.removeMember(HUDSON, OWNER, VIEWER_MEMBERSHIP)
    expect((await repos.settings.team(HUDSON)).members).toHaveLength(5)
  })
})

describe('signers (03 §4.9, 02 §3)', () => {
  it('offers only members who may sign, and the bookkeeper once the owner allows it', async () => {
    const before = await repos.settings.signers(HUDSON)
    expect(before.signers.map((s) => s.fullName)).toEqual(['Mirza Hodzic', 'Ray Hodzic'])
    expect(before.candidates.map((c) => c.name)).toEqual(['Nadia Ferreira'])
    expect(before.bookkeepers).toEqual([
      { membershipId: BOOKKEEPER_MEMBERSHIP, name: 'Ellen Pratt', canSign: false },
    ])
    await repos.settings.setBookkeeperCanSign(HUDSON, OWNER, BOOKKEEPER_MEMBERSHIP, true)
    const after = await repos.settings.signers(HUDSON)
    expect(after.candidates.map((c) => c.userId)).toContain(BOOKKEEPER)

    await repos.settings.addSigner(HUDSON, OWNER, {
      userId: BOOKKEEPER,
      fullName: 'Ellen Pratt, CPA',
      title: 'Outside accountant',
    })
    // Turning the permission off makes the signer row inactive too.
    await repos.settings.setBookkeeperCanSign(HUDSON, OWNER, BOOKKEEPER_MEMBERSHIP, false)
    const off = await repos.settings.signers(HUDSON)
    expect(off.signers.find((s) => s.userId === BOOKKEEPER)?.isActive).toBe(false)
  })
})

describe('billing (08 §2.3, mock)', () => {
  it('pauses for up to 3 months, read only, and unpauses', async () => {
    await repos.settings.pause(HUDSON, OWNER, 3)
    const paused = await repos.settings.billing(HUDSON)
    expect(paused).toMatchObject({ status: 'paused', pauseResumesOn: '2026-12-15' })
    await repos.settings.unpause(HUDSON, OWNER)
    expect((await repos.settings.billing(HUDSON)).status).toBe('active')
  })

  it('cancels at the end of the period, and can keep it', async () => {
    await repos.settings.cancel(HUDSON, OWNER, { reason: 'season', note: '' })
    const cancelling = await repos.settings.billing(HUDSON)
    expect(cancelling).toMatchObject({
      status: 'active',
      cancelAtPeriodEnd: true,
      periodEndsOn: '2026-10-01',
    })
    await repos.settings.keepSubscription(HUDSON, OWNER)
    expect((await repos.settings.billing(HUDSON)).cancelAtPeriodEnd).toBe(false)
  })
})

describe('notifications (03 §4.9, 04 memberships.notify_*)', () => {
  it('reads the defaults and saves who gets what', async () => {
    const dto = await repos.settings.notifications(HUDSON)
    expect(dto.deadlineReminderDays).toEqual([10, 5, 2, 0])
    expect(dto.members.find((m) => m.role === 'owner')).toMatchObject({
      notifyBilling: true,
      notifyNewMember: true,
    })
    await repos.settings.saveNotifications(HUDSON, {
      deadlineReminderDays: [0, 7, 7],
      reminderDay: 2,
      members: dto.members.map((m) => ({ ...m, notifyDeadline: m.role === 'owner' })),
    })
    const saved = await repos.settings.notifications(HUDSON)
    expect(saved.deadlineReminderDays).toEqual([7, 0])
    expect(saved.reminderDay).toBe(2)
    expect(saved.members.filter((m) => m.notifyDeadline).map((m) => m.role)).toEqual(['owner'])
  })

  it('turns text messages on only with the consent, and keeps its words', async () => {
    expect(SmsInputSchema.safeParse({ phone: '845 555 0101', consent: false }).success).toBe(false)
    expect(SmsInputSchema.safeParse({ phone: '555 0101', consent: true }).success).toBe(false)
    const input = SmsInputSchema.parse({ phone: '(845) 555-0101', consent: true })
    await repos.settings.setSms(HUDSON, input, 'I agree.')
    expect((await repos.settings.notifications(HUDSON)).sms).toEqual({
      phone: '8455550101',
      consentAt: '2026-09-15',
    })
    expect(db.tenants.find((t) => t.id === HUDSON)?.settings.smsConsentText).toBe('I agree.')
    await repos.settings.setSms(HUDSON, null, '')
    expect((await repos.settings.notifications(HUDSON)).sms).toBeNull()
  })
})

describe('the sms_reminders flag (04 feature_flags, spec/12 step 10)', () => {
  it('is off for everyone until the first customers', async () => {
    expect(await repos.flags.isOn(HUDSON, 'sms_reminders')).toBe(false)
  })

  it("a company's own row wins over the global one", async () => {
    db.featureFlags.push({
      id: '01932000-0000-7000-9000-000000000001',
      tenantId: HUDSON,
      key: 'sms_reminders',
      enabled: true,
    })
    expect(await repos.flags.isOn(HUDSON, 'sms_reminders')).toBe(true)
    expect(await repos.flags.isOn('01921000-0000-7000-8000-000000000002', 'sms_reminders')).toBe(
      false,
    )
  })
})

describe('audit log (03 §4.9, 11 §5)', () => {
  it('has the fixture rows newest first, the reads of worker details, and filters', async () => {
    await repos.workers.readPii(HUDSON, ALVAREZ, ADMIN, 'address')
    const all = await repos.settings.auditLog(HUDSON)
    expect(all.rows[0]).toMatchObject({
      kind: 'pii',
      userName: 'Nadia Ferreira',
      detail: 'Alvarez, Miguel',
    })
    const signatures = await repos.settings.auditLog(HUDSON, { kind: 'signature' })
    expect(signatures.rows.map((r) => r.userName)).toEqual(['Ray Hodzic', 'Mirza Hodzic'])
    const nadia = await repos.settings.auditLog(HUDSON, { userId: ADMIN })
    expect(nadia.rows.every((r) => r.userId === ADMIN)).toBe(true)
    expect(all.people.map((p) => p.name)).toContain('Ellen Pratt')
  })

  it('writes what changes roles and billing', async () => {
    await repos.settings.changeRole(HUDSON, OWNER, VIEWER_MEMBERSHIP, 'payroll')
    await repos.settings.pause(HUDSON, OWNER, 1)
    const rows = (await repos.settings.auditLog(HUDSON)).rows.slice(0, 2)
    expect(rows.map((r) => r.kind).sort()).toEqual(['billing', 'member'])
  })
})

describe('your data (03 §4.9)', () => {
  const texts = {
    readme: 'x',
    headers: ['a'],
    statuses: { signed: 's', submitted: 'f', rejected: 'r', corrected: 'c' },
  }

  it('exports everything and logs every worker whose details went out', async () => {
    const before = db.piiAccessLog.length
    const file = await repos.settings.exportAll(HUDSON, OWNER, texts)
    expect(file.name).toBe('weeklycert-export-hudson-electric.zip')
    expect(Buffer.from(file.body.subarray(0, 2)).toString()).toBe('PK')
    const workers = db.workerPii.filter((p) => p.tenantId === HUDSON).length
    expect(db.piiAccessLog.length - before).toBe(workers)
    expect(db.piiAccessLog.at(-1)?.purpose).toBe('export')
  })

  it('a deletion request leaves 30 days of read-only access', async () => {
    await repos.settings.requestDeletion(HUDSON, OWNER)
    expect(await repos.settings.billing(HUDSON)).toMatchObject({
      status: 'cancelled',
      purgeAfter: '2026-10-15',
    })
  })
})
