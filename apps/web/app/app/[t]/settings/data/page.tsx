import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { DataScreen } from '@/features/settings/DataScreen'

export const metadata: Metadata = { title: copy.settings.nav.data }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <DataScreen slug={t} search={search} />
}
