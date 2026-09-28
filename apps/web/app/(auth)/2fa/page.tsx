import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { TwoFactorScreen } from '@/features/auth/Screens'

export const metadata: Metadata = { title: copy.auth.twoFactor.title }

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <TwoFactorScreen search={await searchParams} />
}
