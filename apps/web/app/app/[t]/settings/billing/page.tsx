import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { BillingScreen } from '@/features/settings/BillingScreen'

export const metadata: Metadata = { title: copy.settings.nav.billing }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <BillingScreen slug={t} search={search} />
}
