import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { WorkersScreen } from '@/features/workers/WorkersScreen'

export const metadata: Metadata = { title: copy.nav.workers }

export default async function WorkersPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string; status?: string; q?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <WorkersScreen slug={t} search={search} />
}
