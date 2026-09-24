import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { WorkerFormScreen } from '@/features/workers/WorkerFormScreen'

export const metadata: Metadata = { title: copy.workers.form.newTitle }

export default async function NewWorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <WorkerFormScreen slug={t} workerId={null} search={search} />
}
