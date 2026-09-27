import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { SignersScreen } from '@/features/settings/SignersScreen'

export const metadata: Metadata = { title: copy.settings.nav.signers }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <SignersScreen slug={t} search={search} />
}
