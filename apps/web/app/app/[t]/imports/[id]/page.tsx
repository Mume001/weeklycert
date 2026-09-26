import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ImportScreen } from '@/features/imports/ImportScreen'

export const metadata: Metadata = { title: copy.nav.import }

export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id }, search] = await Promise.all([params, searchParams])
  return <ImportScreen slug={t} batchId={id} search={search} />
}
