import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { TeamScreen } from '@/features/settings/TeamScreen'

export const metadata: Metadata = { title: copy.settings.nav.team }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <TeamScreen slug={t} search={search} />
}
