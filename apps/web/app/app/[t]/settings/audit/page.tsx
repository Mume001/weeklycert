import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AuditScreen } from '@/features/settings/AuditScreen'

export const metadata: Metadata = { title: copy.settings.nav.audit }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string; userId?: string; kind?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <AuditScreen slug={t} search={search} />
}
