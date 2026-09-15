import type { TenantDTO } from '@wc/data/dto'
import { describe, expect, it } from 'vitest'
import { canManageBilling, subscriptionBanner } from './subscription'

const tenant = (patch: Partial<TenantDTO>): TenantDTO => ({
  id: '01921000-0000-7000-8000-000000000001',
  slug: 't',
  legalName: 'T',
  status: 'active',
  trialEndsAt: null,
  pastDueSince: null,
  weekEndsOn: 6,
  timezone: 'America/New_York',
  owner: { name: 'O', email: 'o@x.test' },
  ...patch,
})

describe('subscriptionBanner (spec/03 §3: only when needed)', () => {
  it('shows nothing for an active subscription', () => {
    expect(subscriptionBanner(tenant({}), '2026-09-15')).toBeNull()
  })

  it('counts trial days left', () => {
    expect(
      subscriptionBanner(tenant({ status: 'trial', trialEndsAt: '2026-09-24' }), '2026-09-15'),
    ).toEqual({ state: 'trial', daysLeft: 9 })
  })

  it('shows paused', () => {
    expect(subscriptionBanner(tenant({ status: 'paused' }), '2026-09-15')).toEqual({
      state: 'paused',
    })
  })

  it('counts the 14 days of a failed payment down', () => {
    expect(
      subscriptionBanner(tenant({ status: 'past_due', pastDueSince: '2026-09-10' }), '2026-09-15'),
    ).toEqual({ state: 'past_due', daysLeft: 9 })
  })
})

describe('canManageBilling (spec/02 §3)', () => {
  it('is the owner alone', () => {
    expect(canManageBilling('owner')).toBe(true)
    for (const role of ['admin', 'payroll', 'signer', 'viewer', 'bookkeeper'] as const) {
      expect(canManageBilling(role)).toBe(false)
    }
  })
})
