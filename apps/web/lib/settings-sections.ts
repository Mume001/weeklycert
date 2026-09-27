// Which settings pages a role sees (spec/02 §5: "Naplata, Tim, Potpisnici,
// Dnevnik i Podaci ... se skrivaju po §3"). A hidden page is not protection:
// each page and each action checks its own role list (lib/session.ts).
import type { MembershipRole } from '@wc/data/dto'
import {
  AUDIT_READERS,
  BILLING_ROLES,
  DATA_OWNERS,
  MEMBER_MANAGERS,
  NOTIFICATION_READERS,
  SIGNER_MANAGERS,
} from './session'

export const SETTINGS_SECTIONS = [
  'company',
  'team',
  'signers',
  'billing',
  'notifications',
  'audit',
  'data',
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

/** Every member reads the company profile; the viewer has no Settings at all (02 §5). */
const COMPANY_READERS: readonly MembershipRole[] = [
  'owner',
  'admin',
  'payroll',
  'signer',
  'bookkeeper',
]

export const SECTION_ROLES: Record<SettingsSection, readonly MembershipRole[]> = {
  company: COMPANY_READERS,
  team: MEMBER_MANAGERS,
  signers: SIGNER_MANAGERS,
  billing: BILLING_ROLES,
  notifications: NOTIFICATION_READERS,
  audit: AUDIT_READERS,
  data: DATA_OWNERS,
}

export function settingsSections(role: MembershipRole): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => SECTION_ROLES[s].includes(role))
}
