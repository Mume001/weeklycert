import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { SecurityScreen } from '@/features/account/AccountScreens'

export const metadata: Metadata = { title: copy.account.security.title }

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <SecurityScreen search={await searchParams} />
}
