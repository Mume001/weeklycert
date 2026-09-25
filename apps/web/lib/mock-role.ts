// Mock phase only (spec/19 §1 point 5): the cookie RoleSwitcher writes and
// lib/session.ts reads. Shared by server and client, so it imports nothing
// server-only. Removed in step 4 with the rest of the fake sign-in.
import type { MembershipRole } from '@wc/data/dto'

export const ROLE_COOKIE = 'wc-mock-role'

/**
 * The subscription state to play, for tests only: the fixtures hold no paused
 * company, and a paused one must still be seen end to end (spec/08 §2.4). No
 * control in the UI sets it. Gone in step 4, when the status comes from Stripe.
 */
export const STATUS_COOKIE = 'wc-mock-status'

export function setMockRole(role: MembershipRole): void {
  // biome-ignore lint/suspicious/noDocumentCookie: demo role picker only, gone in step 4
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; samesite=lax`
}
