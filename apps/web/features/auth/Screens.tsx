import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PENDING_2FA_COOKIE } from '@/lib/mock-role'
import { screenState } from '@/lib/screen-state'
import { mockSession } from '@/lib/session'
import { AuthCard } from './AuthCard'
import { TwoFactorForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { LinkInvalid, MagicForm, ResetForm, VerifyForm } from './TokenForms'

const t = copy.auth
type Search = { state?: string }

/** ?state=empty on a link page plays a link that has expired (spec/19 §7). */
const expired = (search: Search) => screenState(search.state) === 'empty'

/** Opening the page only reads the token; the button uses it (03 §4.1). */
export async function MagicScreen({ token, search }: { token: string; search: Search }) {
  const live = !expired(search) && (await getRepositories().auth.peekToken('magic', token))
  return (
    <AuthCard title={t.signInTitle} search={search}>
      {live ? <MagicForm token={token} /> : <LinkInvalid again="/login" />}
    </AuthCard>
  )
}

export async function VerifyScreen({ token, search }: { token: string; search: Search }) {
  const live = !expired(search) && (await getRepositories().auth.peekToken('verify', token))
  return (
    <AuthCard title={t.verify.title} search={search}>
      {live ? <VerifyForm token={token} /> : <LinkInvalid again="/login" />}
    </AuthCard>
  )
}

export async function ResetScreen({ token, search }: { token: string; search: Search }) {
  const live = !expired(search) && (await getRepositories().auth.peekToken('reset', token))
  return (
    <AuthCard title={t.reset.title} search={search}>
      {live ? <ResetForm token={token} /> : <LinkInvalid again="/forgot" />}
    </AuthCard>
  )
}

/**
 * /invite/[token] (03 §4.1): who invites, to which company, as what. It is
 * accepted only by the account with the invited email; anyone else is sent
 * to sign in with that address, or to register without a company.
 */
export async function InviteScreen({ token, search }: { token: string; search: Search }) {
  const repos = getRepositories()
  const invitation = expired(search) ? null : await repos.auth.invitation(token)
  const { userId } = await mockSession()
  const me = await repos.users.get(userId)
  const mine = invitation !== null && me?.email === invitation.email
  return (
    <AuthCard title={t.signInTitle} search={search}>
      {!invitation ? (
        <LinkInvalid again="/login" />
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-text-primary">
            {fill(t.invite, {
              Inviter: invitation.inviterName,
              Company: invitation.companyName,
              Role: copy.roles[invitation.role].label,
            })}
          </p>
          {mine ? (
            <Button asChild>
              <Link href="/app">{t.inviteActions.accept}</Link>
            </Button>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                {fill(t.inviteActions.otherEmail, { email: invitation.email })}
              </p>
              <Button asChild>
                <Link href={`/register?invite=${encodeURIComponent(token)}`}>
                  {t.inviteActions.register}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login">{t.inviteActions.signIn}</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </AuthCard>
  )
}

/** /register, and /register?invite= without the company name (03 §4.1). */
export async function RegisterScreen({ search }: { search: Search & { invite?: string } }) {
  const token = search.invite ?? ''
  const invitation = token ? await getRepositories().auth.invitation(token) : null
  return (
    <AuthCard title={t.register.title} search={search}>
      {token && !invitation ? (
        <LinkInvalid again="/login" />
      ) : (
        <RegisterForm
          invitation={invitation ? token : ''}
          invitedEmail={invitation?.email ?? ''}
          invitedCompany={invitation?.companyName ?? null}
        />
      )}
    </AuthCard>
  )
}

/** Only after the right password: without the half session this page has nothing to do. */
export async function TwoFactorScreen({ search }: { search: Search }) {
  const forced = screenState(search.state)
  if (!forced && !(await cookies()).get(PENDING_2FA_COOKIE)) redirect('/login')
  return (
    <AuthCard title={t.twoFactor.title} search={search}>
      <TwoFactorForm />
    </AuthCard>
  )
}
