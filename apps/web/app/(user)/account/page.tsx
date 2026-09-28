import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AccountScreen } from '@/features/account/AccountScreens'

export const metadata: Metadata = { title: copy.account.title }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <AccountScreen search={await searchParams} />
}
