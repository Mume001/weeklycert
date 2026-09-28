import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { screenState } from '@/lib/screen-state'
import { mockSession } from '@/lib/session'
import { PasswordForm, ProfileForm, SessionsList } from './AccountForms'

const a = copy.account
const s = a.security
type Search = { state?: string }

/** Outside any company (03 §2 "Korisnik"): a narrow page with the two account tabs. */
/** `content` is null while ?state= plays loading or error (spec/19 §7). */
function frame(current: 'account' | 'security', search: Search, content: ReactNode) {
  const forced = screenState(search.state)
  const tabs = [
    { key: 'account', href: '/account', label: copy.shell.user.account },
    { key: 'security', href: '/account/security', label: copy.shell.user.security },
  ] as const
  return (
    <main className="mx-auto grid w-full max-w-[720px] gap-4 px-4 py-8 sm:px-6">
      <h1 className="text-lg font-semibold text-text-primary">
        {current === 'account' ? a.title : s.title}
      </h1>
      <nav aria-label={a.title} className="flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === current ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-sm focus-visible:focus-ring ${tab.key === current ? 'bg-n-100 font-semibold text-text-primary' : 'text-n-800 hover:bg-n-100'}`}
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href="/app"
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-teal-700 underline underline-offset-2 focus-visible:focus-ring"
        >
          {copy.forbidden.backToDashboard}
        </Link>
      </nav>
      {forced === 'loading' ? (
        <LoadingTable columns={2} rows={3} />
      ) : forced === 'error' ? (
        <RetryErrorState />
      ) : (
        content
      )}
    </main>
  )
}

async function account() {
  const { userId } = await mockSession()
  const dto = await getRepositories().auth.account(userId)
  if (!dto) notFound()
  return dto
}

/** /account (03 §4.2): name, email (a change needs its confirmation), language. */
export async function AccountScreen({ search }: { search: Search }) {
  const shown = !['loading', 'error'].includes(search.state ?? '')
  return frame('account', search, shown ? <ProfileForm account={await account()} /> : null)
}

/**
 * /account/security (03 §4.2, 11 §3): password, two-factor, the sessions and
 * "Sign out everywhere". Two-factor is required for the roles that can sign.
 */
export async function SecurityScreen({ search }: { search: Search }) {
  const forced = screenState(search.state)
  const { pickedRole } = await mockSession()
  const required = ['owner', 'admin', 'signer', 'bookkeeper'].includes(pickedRole)
  if (forced === 'loading' || forced === 'error') return frame('security', search, null)
  const dto = await account()
  return frame(
    'security',
    search,
    <>
      <PasswordForm />
      <section className="grid gap-2 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <h2 className="text-md font-semibold text-text-primary">{s.twoFactor}</h2>
        <p className="text-sm" data-testid="two-factor-state">
          {dto.twoFactor ? s.on : s.off}
          {required && <span className="ml-2 text-text-secondary">{s.required}</span>}
        </p>
        {required && !dto.twoFactor && (
          <Notice tone="warning" title={copy.auth.twoFactorRequired} />
        )}
      </section>
      <SessionsList
        sessions={forced === 'empty' ? dto.sessions.filter((x) => x.current) : dto.sessions}
      />
    </>,
  )
}
