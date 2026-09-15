// Mock phase only (spec/19 §1 point 5): the cookie RoleSwitcher writes and
// lib/session.ts reads. Shared by server and client, so it imports nothing
// server-only. Removed in step 4 with the rest of the fake sign-in.
import type { MembershipRole } from '@wc/data/dto'

export const ROLE_COOKIE = 'wc-mock-role'

export function setMockRole(role: MembershipRole): void {
  // biome-ignore lint/suspicious/noDocumentCookie: demo role picker only, gone in step 4
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; samesite=lax`
}
