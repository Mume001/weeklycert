'use server'

// Server actions of the auth routes (spec/03 §4.1). These are the closed list
// of spec/11 §4 that has no guard: nobody is signed in yet. In the mock they
// only navigate (spec/20 M): a sign-in sets the demo role, as RoleSwitcher
// does. Better Auth replaces this file in step 4, with rate limits per IP and
// per email and constant-time token checks.
import {
  getRepositories,
  type MembershipRole,
  MembershipRoleSchema,
  type RegisterErrorCode,
  RegisterInputSchema,
} from '@wc/data'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PENDING_2FA_COOKIE, ROLE_COOKIE, USER_COOKIE } from '@/lib/mock-role'

const Email = z.string().trim().toLowerCase()

/** The session is that user (USER_COOKIE); /app then sends each one where they belong. */
async function signedInAs(userId: string, role: MembershipRole | null): Promise<never> {
  const jar = await cookies()
  jar.set(USER_COOKIE, userId, { path: '/', sameSite: 'lax' })
  if (role) jar.set(ROLE_COOKIE, role, { path: '/', sameSite: 'lax' })
  jar.delete(PENDING_2FA_COOKIE)
  redirect('/app')
}

export type SignInState =
  | { error: null }
  | { error: 'mismatch' }
  | { error: 'locked'; until: string }
  | { error: 'unverified'; email: string }

export async function signInAction(form: FormData): Promise<SignInState> {
  const email = Email.parse(form.get('email') ?? '')
  const password = z.string().parse(form.get('password') ?? '')
  const result = await getRepositories().auth.signIn(email, password)
  if (!result.ok) return result
  if (result.needsTwoFactor) {
    // Half a session: the password was right, the code is next (11 §3).
    ;(await cookies()).set(PENDING_2FA_COOKIE, `${result.userId}:${result.role ?? ''}`, {
      path: '/',
      sameSite: 'lax',
    })
    redirect('/2fa')
  }
  return signedInAs(result.userId, result.role)
}

export type TwoFactorState = { failed: boolean }

/** The code is checked in the data layer (19 §4). Without the half session there is nothing to finish. */
export async function twoFactorAction(form: FormData): Promise<TwoFactorState> {
  const pending = (await cookies()).get(PENDING_2FA_COOKIE)?.value
  if (!pending) redirect('/login')
  const code = z.string().parse(form.get('code') ?? '')
  if (!(await getRepositories().auth.verifyTwoFactor(code))) return { failed: true }
  const [userId = '', rawRole] = pending.split(':')
  const role = MembershipRoleSchema.safeParse(rawRole)
  return signedInAs(userId, role.success ? role.data : null)
}

/** Magic link, reset and a new confirmation: the same answer whether the account exists (11 §4). */
export async function sendLinkAction(
  kind: 'magic' | 'reset' | 'verify',
  rawEmail: string,
): Promise<{ email: string; token: string }> {
  const email = Email.parse(rawEmail)
  const token = await getRepositories().auth.issueToken(kind, email)
  return { email, token }
}

/** The click on "Sign me in": the token is used here, never when the page opens (03 §4.1). */
export async function consumeMagicLinkAction(token: string): Promise<{ ok: false }> {
  const used = await getRepositories().auth.consumeToken('magic', z.string().parse(token))
  if (!used?.userId) return { ok: false }
  return signedInAs(used.userId, used.role)
}

export async function confirmEmailAction(token: string): Promise<{ ok: boolean }> {
  const used = await getRepositories().auth.consumeToken('verify', z.string().parse(token))
  return { ok: used !== null }
}

export type ResetState = { ok: true } | { ok: false; error: 'passwordShort' | 'invalid' }

export async function resetPasswordAction(token: string, password: string): Promise<ResetState> {
  if (password.length < 12) return { ok: false, error: 'passwordShort' }
  const used = await getRepositories().auth.consumeToken('reset', z.string().parse(token))
  return used ? { ok: true } : { ok: false, error: 'invalid' }
}

export type RegisterState =
  | { ok: true; email: string; token: string }
  | { ok: false; errors: Record<string, RegisterErrorCode> }

export async function registerAction(raw: unknown, invitation: string): Promise<RegisterState> {
  const parsed = RegisterInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, RegisterErrorCode> = {}
    for (const issue of parsed.error.issues) {
      errors[issue.path.join('.')] ??= issue.message as RegisterErrorCode
    }
    return { ok: false, errors }
  }
  const repos = getRepositories()
  const invited = invitation ? await repos.auth.invitation(invitation) : null
  const result = await repos.auth.register(parsed.data, invited !== null)
  if (!result.ok) {
    return {
      ok: false,
      errors: { [result.error === 'emailTaken' ? 'email' : 'company']: result.error },
    }
  }
  return { ok: true, email: parsed.data.email, token: result.token }
}
