import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { NotificationsScreen } from '@/features/settings/NotificationsScreen'

export const metadata: Metadata = { title: copy.settings.nav.notifications }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <NotificationsScreen slug={t} search={search} />
}
