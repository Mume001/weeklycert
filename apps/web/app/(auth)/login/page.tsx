import { copy } from '@wc/copy'
import { getRepositories, LOCK_MINUTES } from '@wc/data'
import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/AuthCard'
import { LoginForm } from '@/features/auth/LoginForm'
import { screenState } from '@/lib/screen-state'

export const metadata: Metadata = { title: copy.auth.signIn }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const search = await searchParams
  // ?state=locked plays the lock after 10 failures (11 §3), 15 minutes from now.
  const locked = screenState(search.state) === 'locked'
  const until = new Date(Date.parse(getRepositories().now()) + LOCK_MINUTES * 60_000).toISOString()
  return (
    <AuthCard title={copy.auth.signInTitle} search={search}>
      <LoginForm lockedUntil={locked ? until : undefined} />
    </AuthCard>
  )
}
