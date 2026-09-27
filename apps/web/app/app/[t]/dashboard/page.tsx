import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'

export const metadata: Metadata = { title: copy.nav.dashboard }

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <DashboardScreen slug={t} search={search} />
}
