// When the subscription banner shows, and who may act on it. Pure functions,
// used by the server layout and by client components alike.
import { daysBetween } from '@wc/core'
import type { IsoDate, MembershipRole, TenantDTO } from '@wc/data/dto'

/** Billing: plan, card, pause, cancel belong to the owner alone (spec/02 §3). */
export function canManageBilling(role: MembershipRole): boolean {
  return role === 'owner'
}

/** Days a failed card keeps reports working (spec/15 §3 Naplata: "in the next 14 days"). */
export const PAST_DUE_GRACE_DAYS = 14

export type SubscriptionBannerState =
  | { state: 'trial'; daysLeft: number }
  | { state: 'paused' }
  | { state: 'past_due'; daysLeft: number }

/** The banner shows only when needed (spec/03 §3). */
export function subscriptionBanner(
  tenant: TenantDTO,
  today: IsoDate,
): SubscriptionBannerState | null {
  switch (tenant.status) {
    case 'trial':
      return tenant.trialEndsAt
        ? { state: 'trial', daysLeft: Math.max(0, daysBetween(today, tenant.trialEndsAt)) }
        : null
    case 'paused':
      return { state: 'paused' }
    case 'past_due': {
      const since = tenant.pastDueSince ?? today
      return {
        state: 'past_due',
        daysLeft: Math.max(0, PAST_DUE_GRACE_DAYS - daysBetween(since, today)),
      }
    }
    default:
      return null
  }
}
