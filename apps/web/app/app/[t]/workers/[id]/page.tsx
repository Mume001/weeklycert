import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { WorkerFormScreen } from '@/features/workers/WorkerFormScreen'

export const metadata: Metadata = { title: copy.nav.workers }

export default async function WorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id }, search] = await Promise.all([params, searchParams])
  return <WorkerFormScreen slug={t} workerId={id} search={search} />
}
