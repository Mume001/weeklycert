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
  // Picking a role acts as that role's demo user, not as whoever signed in.
  // biome-ignore lint/suspicious/noDocumentCookie: demo role picker only, gone in step 4
  document.cookie = `${USER_COOKIE}=; path=/; max-age=0; samesite=lax`
  // biome-ignore lint/suspicious/noDocumentCookie: demo role picker only, gone in step 4
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; samesite=lax`
}

/**
 * Feature flags to play on, comma separated, for tests only: sms_reminders is
 * off in the fixtures, and the screen behind it must still be seen end to end.
 * No control in the UI sets it. Gone in step 4 with the rest of the mock.
 */
export const FLAGS_COOKIE = 'wc-mock-flags'

/**
 * Mock sign-in (spec/19 §4, session M): the user who passed the password but
 * not yet the two-factor code, as "role". Gone in step 4.
 */
export const PENDING_2FA_COOKIE = 'wc-mock-2fa'

/**
 * Who signed in (session M, 19 §4): the user's own id, so a sign-in as someone
 * outside Hudson Electric is that person and never its owner. RoleSwitcher
 * clears it and acts as the picked role's demo user again. Gone in step 4.
 */
export const USER_COOKIE = 'wc-mock-user'

/**
 * Minutes to move the support-access clock, for tests only: the 30 minutes of
 * support access (11 §2) must be seen running out, and MOCK_TODAY stands
 * still. Read in one place, lib/clock.ts. Gone in step 4.
 */
export const CLOCK_COOKIE = 'wc-mock-clock-minutes'
