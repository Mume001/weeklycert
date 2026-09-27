'use server'

// Server actions of the settings (spec/03 §4.9). Each starts with the one
// guard (CLAUDE.md, spec/11 §4), with the role list of its row in spec/02 §3.
// Billing and the company's data run in a paused or cancelled company too
// (mode 'read'): the owner has to be able to unpause, export and delete there.
import { copy } from '@wc/copy'
import {
  CancelInputSchema,
  CompanyInputSchema,
  type CompanySaveResult,
  companyFormErrors,
  getRepositories,
  InvitableRoleSchema,
  InviteInputSchema,
  type InviteResult,
  NotificationsInputSchema,
  PAUSE_MONTHS,
  type SignerErrorCode,
  SignerInputSchema,
  SmsInputSchema,
  TIMEZONES,
} from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  BILLING_ROLES,
  COMPANY_WRITERS,
  DATA_OWNERS,
  MEMBER_MANAGERS,
  MEMBER_REMOVERS,
  NOTIFICATION_WRITERS,
  requireTenant,
  SIGNER_MANAGERS,
} from '@/lib/session'

const refresh = () => revalidatePath('/app/[t]', 'layout')
const Id = z.string().min(1)

/** The company profile, onboarding step 1 and /settings/company alike (03 §4.3, §4.9). */
export async function saveCompanyAction(slug: string, raw: unknown): Promise<CompanySaveResult> {
  const shell = await requireTenant(slug, COMPANY_WRITERS)
  const parsed = CompanyInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: companyFormErrors(parsed.error) }
  const repos = getRepositories()
  const result = await repos.tenants.updateCompany(shell.tenant.id, parsed.data)
  if (result.ok) {
    await repos.tenants.completeOnboardingStep(shell.tenant.id, 1, false)
    refresh()
  }
  return result
}

const LOGO_TYPES = ['image/png', 'image/jpeg']
const LOGO_MAX_BYTES = 1024 * 1024

export type ExtrasResult = { ok: true } | { ok: false; error: 'tooBig' | 'wrongType' }

/** Time zone and logo (03 §4.9). The logo is shown in the app only, never on a report. */
export async function saveCompanyExtrasAction(slug: string, form: FormData): Promise<ExtrasResult> {
  const shell = await requireTenant(slug, COMPANY_WRITERS)
  const timezone = z.enum(TIMEZONES).parse(form.get('timezone'))
  const file = form.get('logo')
  let logo: { contentType: string; base64: string } | null | undefined
  if (form.get('removeLogo') === '1') logo = null
  else if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return { ok: false, error: 'wrongType' }
    if (file.size > LOGO_MAX_BYTES) return { ok: false, error: 'tooBig' }
    logo = {
      contentType: file.type,
      base64: Buffer.from(await file.arrayBuffer()).toString('base64'),
    }
  }
  await getRepositories().settings.setCompanyExtras(shell.tenant.id, shell.user.id, {
    timezone,
    ...(logo === undefined ? {} : { logo }),
  })
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Team

export async function inviteAction(slug: string, raw: unknown): Promise<InviteResult> {
  const shell = await requireTenant(slug, MEMBER_MANAGERS)
  const parsed = InviteInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'emailFormat' }
  const result = await getRepositories().settings.invite(
    shell.tenant.id,
    shell.user.id,
    parsed.data,
  )
  refresh()
  return result
}

export async function revokeInvitationAction(slug: string, invitationId: string): Promise<void> {
  const shell = await requireTenant(slug, MEMBER_MANAGERS)
  await getRepositories().settings.revokeInvitation(
    shell.tenant.id,
    shell.user.id,
    Id.parse(invitationId),
  )
  refresh()
}

export async function changeRoleAction(
  slug: string,
  membershipId: string,
  role: string,
): Promise<void> {
  const shell = await requireTenant(slug, MEMBER_MANAGERS)
  await getRepositories().settings.changeRole(
    shell.tenant.id,
    shell.user.id,
    Id.parse(membershipId),
    InvitableRoleSchema.parse(role),
  )
  refresh()
}

export async function removeMemberAction(slug: string, membershipId: string): Promise<void> {
  const shell = await requireTenant(slug, MEMBER_REMOVERS)
  await getRepositories().settings.removeMember(
    shell.tenant.id,
    shell.user.id,
    Id.parse(membershipId),
  )
  refresh()
}

// ---------------------------------------------------------------------------
// Signers

export type SignerResult = { ok: true } | { ok: false; errors: Record<string, SignerErrorCode> }

export async function addSignerAction(slug: string, raw: unknown): Promise<SignerResult> {
  const shell = await requireTenant(slug, SIGNER_MANAGERS)
  const parsed = SignerInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, SignerErrorCode> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      if (issue.message === 'fullNameRequired' || issue.message === 'titleRequired') {
        errors[path] ??= issue.message
      }
    }
    return { ok: false, errors }
  }
  await getRepositories().settings.addSigner(shell.tenant.id, shell.user.id, parsed.data)
  refresh()
  return { ok: true }
}

export async function setSignerActiveAction(
  slug: string,
  signerId: string,
  active: boolean,
): Promise<void> {
  const shell = await requireTenant(slug, SIGNER_MANAGERS)
  await getRepositories().settings.setSignerActive(
    shell.tenant.id,
    shell.user.id,
    Id.parse(signerId),
    z.boolean().parse(active),
  )
  refresh()
}

/** "Smije potpisivati u ovoj firmi": the owner alone (04 memberships.can_sign). */
export async function setBookkeeperCanSignAction(
  slug: string,
  membershipId: string,
  canSign: boolean,
): Promise<void> {
  const shell = await requireTenant(slug, ['owner'])
  await getRepositories().settings.setBookkeeperCanSign(
    shell.tenant.id,
    shell.user.id,
    Id.parse(membershipId),
    z.boolean().parse(canSign),
  )
  refresh()
}

// ---------------------------------------------------------------------------
// Billing

export async function pauseAction(slug: string, months: number): Promise<void> {
  const shell = await requireTenant(slug, BILLING_ROLES, 'read')
  const n = z
    .number()
    .refine((m) => (PAUSE_MONTHS as readonly number[]).includes(m))
    .parse(months)
  await getRepositories().settings.pause(shell.tenant.id, shell.user.id, n)
  refresh()
}

export async function unpauseAction(slug: string): Promise<void> {
  const shell = await requireTenant(slug, BILLING_ROLES, 'read')
  await getRepositories().settings.unpause(shell.tenant.id, shell.user.id)
  refresh()
}

export type CancelResult = { ok: true } | { ok: false; error: 'reasonRequired' | 'nameMismatch' }

/** The last step of the cancellation: the company's name typed in (15 §3 Potvrde). */
export async function cancelAction(
  slug: string,
  raw: unknown,
  typedName: string,
): Promise<CancelResult> {
  const shell = await requireTenant(slug, BILLING_ROLES, 'read')
  const parsed = CancelInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'reasonRequired' }
  if (typedName.trim() !== shell.tenant.legalName) return { ok: false, error: 'nameMismatch' }
  await getRepositories().settings.cancel(shell.tenant.id, shell.user.id, parsed.data)
  refresh()
  return { ok: true }
}

export async function keepSubscriptionAction(slug: string): Promise<void> {
  const shell = await requireTenant(slug, BILLING_ROLES, 'read')
  await getRepositories().settings.keepSubscription(shell.tenant.id, shell.user.id)
  refresh()
}

// ---------------------------------------------------------------------------
// Notifications

export async function saveNotificationsAction(slug: string, raw: unknown): Promise<void> {
  const shell = await requireTenant(slug, NOTIFICATION_WRITERS)
  await getRepositories().settings.saveNotifications(
    shell.tenant.id,
    NotificationsInputSchema.parse(raw),
  )
  refresh()
}

export type SmsResult = { ok: true } | { ok: false; errors: Record<string, string> }

/** On only with the consent, and the exact words of it are kept (spec/11, TCPA). */
export async function setSmsAction(slug: string, raw: unknown): Promise<SmsResult> {
  const shell = await requireTenant(slug, NOTIFICATION_WRITERS)
  if (raw === null) {
    await getRepositories().settings.setSms(shell.tenant.id, null, '')
    refresh()
    return { ok: true }
  }
  const parsed = SmsInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) errors[issue.path.join('.')] ??= issue.message
    return { ok: false, errors }
  }
  await getRepositories().settings.setSms(
    shell.tenant.id,
    parsed.data,
    copy.settings.notifications.channels.consent,
  )
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// The company's data

export type DeleteResult = { ok: true } | { ok: false; error: 'nameMismatch' }

export async function requestDeletionAction(
  slug: string,
  typedName: string,
): Promise<DeleteResult> {
  const shell = await requireTenant(slug, DATA_OWNERS, 'read')
  if (typedName.trim() !== shell.tenant.legalName) return { ok: false, error: 'nameMismatch' }
  await getRepositories().settings.requestDeletion(shell.tenant.id, shell.user.id)
  refresh()
  return { ok: true }
}
