import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { CompanySettingsScreen } from '@/features/settings/CompanySettingsScreen'

export const metadata: Metadata = { title: copy.settings.nav.company }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string; saved?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <CompanySettingsScreen slug={t} search={search} />
}
