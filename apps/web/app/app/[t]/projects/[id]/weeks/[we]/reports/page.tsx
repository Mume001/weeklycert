import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ReportsScreen } from '@/features/reports/ReportsScreen'

export const metadata: Metadata = { title: copy.reports.title }

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string; we: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id, we }, search] = await Promise.all([params, searchParams])
  return <ReportsScreen slug={t} projectId={id} weekEnding={we} search={search} />
}
